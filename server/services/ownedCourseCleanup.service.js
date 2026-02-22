import { admin, getAdminDb } from '../config/firebaseAdmin.js';

const JOBS_COLLECTION = 'maintenanceCleanupJobs';
const DELETE_BATCH_LIMIT = 450;

function isRealCourseId(courseId) {
  return Boolean(courseId) &&
    typeof courseId === 'string' &&
    courseId !== 'global_progress' &&
    !courseId.startsWith('free::');
}

function resolveOwnedCloudCourseIdFromDoc(docSnap) {
  const data = docSnap?.data?.() || {};
  const candidateIds = [
    data.sourceCourseId,
    data.courseId,
    data.currentCourseId,
    data.text?.sourceCourseId,
    data.textMetadata?.sourceCourseId,
    data.backupMeta?.sourceCourseId,
    data.metadata?.sourceCourseId
  ];

  for (const candidate of candidateIds) {
    if (isRealCourseId(candidate)) return candidate;
  }

  const docId = String(docSnap?.id || '');
  const textoId = typeof data.textoId === 'string' ? data.textoId : null;
  if (docId.startsWith('draft_backup_') && textoId && docId.endsWith(`_${textoId}`)) {
    const prefix = 'draft_backup_';
    const suffix = `_${textoId}`;
    const maybeCourseId = docId.slice(prefix.length, docId.length - suffix.length);
    if (isRealCourseId(maybeCourseId)) return maybeCourseId;
  }

  return null;
}

async function deleteLegacyOwnedDocsBySweep(collectionRef, courseId, options = {}) {
  const limit = Math.max(1, Math.min(450, Number(options?.limit) || DELETE_BATCH_LIMIT));
  let deleted = 0;

  const snapshot = await collectionRef.get();
  if (snapshot.empty) return deleted;

  let chunk = [];
  for (const docSnap of snapshot.docs) {
    if (resolveOwnedCloudCourseIdFromDoc(docSnap) !== courseId) continue;

    chunk.push(docSnap);
    if (chunk.length < limit) continue;

    const batch = getAdminDb().batch();
    chunk.forEach((target) => {
      batch.delete(target.ref);
      deleted += 1;
    });
    await batch.commit();
    chunk = [];
  }

  if (chunk.length > 0) {
    const batch = getAdminDb().batch();
    chunk.forEach((target) => {
      batch.delete(target.ref);
      deleted += 1;
    });
    await batch.commit();
  }

  return deleted;
}

function toSafeSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
}

export function buildOwnedCleanupJobId(courseId, studentUid) {
  return `owned_${toSafeSegment(courseId)}_${toSafeSegment(studentUid)}`;
}

export async function deleteByQueryInBatches(queryRef, options = {}) {
  const limit = Math.max(1, Math.min(450, Number(options?.limit) || DELETE_BATCH_LIMIT));
  let deleted = 0;

  while (true) {
    const snapshot = await queryRef.limit(limit).get();
    if (snapshot.empty) break;

    const batch = getAdminDb().batch();
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      deleted += 1;
    });

    await batch.commit();

    if (snapshot.docs.length < limit) break;
  }

  return deleted;
}

async function cleanupOwnedCloudData({ courseId, studentUid }) {
  const db = getAdminDb();

  const sessionsQuery = db
    .collection('users')
    .doc(studentUid)
    .collection('sessions')
    .where('sourceCourseId', '==', courseId);

  const draftBackupsQuery = db
    .collection('users')
    .doc(studentUid)
    .collection('draftBackups')
    .where('sourceCourseId', '==', courseId);

  const sessionsCollectionRef = db
    .collection('users')
    .doc(studentUid)
    .collection('sessions');

  const draftBackupsCollectionRef = db
    .collection('users')
    .doc(studentUid)
    .collection('draftBackups');

  const [sessionsDeletedByQuery, draftBackupsDeletedByQuery] = await Promise.all([
    deleteByQueryInBatches(sessionsQuery),
    deleteByQueryInBatches(draftBackupsQuery)
  ]);

  const [legacySessionsDeleted, legacyDraftBackupsDeleted] = await Promise.all([
    deleteLegacyOwnedDocsBySweep(sessionsCollectionRef, courseId),
    deleteLegacyOwnedDocsBySweep(draftBackupsCollectionRef, courseId)
  ]);

  return {
    sessionsDeleted: sessionsDeletedByQuery + legacySessionsDeleted,
    draftBackupsDeleted: draftBackupsDeletedByQuery + legacyDraftBackupsDeleted
  };
}

export async function enqueueOwnedCourseCleanupJob({
  courseId,
  studentUid,
  requestedByUid,
  reason = 'teacher_action'
}) {
  if (!courseId || !studentUid || !requestedByUid) {
    throw new Error('courseId, studentUid y requestedByUid son requeridos');
  }

  const db = getAdminDb();
  const jobId = buildOwnedCleanupJobId(courseId, studentUid);
  const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    const prev = snap.exists ? snap.data() : null;

    tx.set(jobRef, {
      type: 'owned_course_cleanup',
      courseId,
      studentUid,
      requestedByUid,
      reason,
      status: 'pending',
      attempts: Number(prev?.attempts || 0),
      lastError: null,
      result: null,
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      processedAt: null,
      requeuedAt: now
    }, { merge: true });
  });

  return { jobId };
}

export async function processOwnedCourseCleanupJob(jobId) {
  const db = getAdminDb();
  const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);

  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) {
    return { ok: false, skipped: true, reason: 'job_not_found', jobId };
  }

  const job = jobSnap.data() || {};
  if (job.type !== 'owned_course_cleanup') {
    return { ok: false, skipped: true, reason: 'invalid_job_type', jobId };
  }

  if (job.status === 'completed') {
    return { ok: true, skipped: true, reason: 'already_completed', jobId, result: job.result || null };
  }

  await jobRef.set({
    status: 'processing',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  try {
    const result = await cleanupOwnedCloudData({
      courseId: job.courseId,
      studentUid: job.studentUid
    });

    await jobRef.set({
      status: 'completed',
      result,
      lastError: null,
      attempts: Number(job.attempts || 0) + 1,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      ok: true,
      jobId,
      result
    };
  } catch (error) {
    await jobRef.set({
      status: 'failed',
      lastError: String(error?.message || error),
      attempts: Number(job.attempts || 0) + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      ok: false,
      jobId,
      error: String(error?.message || error)
    };
  }
}

export async function processPendingOwnedCleanupJobs({ maxJobs = 20 } = {}) {
  const db = getAdminDb();
  const clamped = Math.max(1, Math.min(50, Number(maxJobs) || 20));

  const pendingSnap = await db
    .collection(JOBS_COLLECTION)
    .where('type', '==', 'owned_course_cleanup')
    .where('status', 'in', ['pending', 'failed'])
    .limit(clamped)
    .get();

  const results = [];
  for (const docSnap of pendingSnap.docs) {
    // eslint-disable-next-line no-await-in-loop
    const result = await processOwnedCourseCleanupJob(docSnap.id);
    results.push(result);
  }

  return {
    processed: results.length,
    results
  };
}
