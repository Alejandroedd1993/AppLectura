import { getAdminDb, isFirebaseAdminConfigured } from '../config/firebaseAdmin.js';
import {
  enqueueOwnedCourseCleanupJob,
  processOwnedCourseCleanupJob,
  processPendingOwnedCleanupJobs
} from '../services/ownedCourseCleanup.service.js';
import { sendValidationError } from '../utils/validationError.js';

function parseBool(value, fallback = false) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}

async function assertTeacherOwnsCourse(courseId, requesterUid) {
  const db = getAdminDb();
  const courseSnap = await db.collection('courses').doc(courseId).get();
  if (!courseSnap.exists) {
    const err = new Error('Curso no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const docenteUid = courseSnap.data()?.docenteUid || null;
  if (!docenteUid || docenteUid !== requesterUid) {
    const err = new Error('No autorizado para encolar limpieza de este curso');
    err.statusCode = 403;
    throw err;
  }
}

const enqueueOwnedCleanup = async (req, res) => {
  try {
    if (!isFirebaseAdminConfigured()) {
      return res.status(503).json({
        ok: false,
        error: 'Firebase Admin no configurado en backend'
      });
    }

    const requesterUid = req.auth?.uid;
    const { courseId, studentUid, reason = 'teacher_action' } = req.body || {};
    const processNow = parseBool(req.body?.processNow, true);

    if (!requesterUid || !courseId || !studentUid) {
      return sendValidationError(res, {
        error: 'courseId, studentUid y auth son requeridos',
        mensaje: 'Debes indicar el curso, el estudiante y autenticar la solicitud.',
        codigo: 'INVALID_ADMIN_CLEANUP_REQUEST',
        ok: false
      });
    }

    await assertTeacherOwnsCourse(courseId, requesterUid);

    const { jobId } = await enqueueOwnedCourseCleanupJob({
      courseId,
      studentUid,
      requestedByUid: requesterUid,
      reason
    });

    let processResult = null;
    if (processNow) {
      processResult = await processOwnedCourseCleanupJob(jobId);
      if (!processResult?.ok) {
        return res.status(500).json({
          ok: false,
          queued: true,
          jobId,
          processNow,
          processResult,
          error: processResult?.error || 'El procesamiento owner-only falló en backend'
        });
      }
    }

    return res.json({
      ok: true,
      queued: true,
      jobId,
      processNow,
      processResult
    });
  } catch (error) {
    const code = Number(error?.statusCode || 500);
    return res.status(code).json({
      ok: false,
      error: error?.message || 'Error encolando limpieza owner-only'
    });
  }
};

const runPendingOwnedCleanup = async (req, res) => {
  try {
    if (!isFirebaseAdminConfigured()) {
      return res.status(503).json({
        ok: false,
        error: 'Firebase Admin no configurado en backend'
      });
    }

    const workerSecret = String(process.env.CLEANUP_WORKER_SECRET || '').trim();
    const providedSecret = String(req.get('x-cleanup-secret') || '').trim();
    if (!workerSecret || providedSecret !== workerSecret) {
      return res.status(403).json({
        ok: false,
        error: 'No autorizado para ejecutar worker de limpieza'
      });
    }

    const maxJobs = Number(req.body?.maxJobs || req.query?.maxJobs || 20);
    const result = await processPendingOwnedCleanupJobs({ maxJobs });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Error ejecutando worker de limpieza'
    });
  }
};

export default {
  enqueueOwnedCleanup,
  runPendingOwnedCleanup
};
