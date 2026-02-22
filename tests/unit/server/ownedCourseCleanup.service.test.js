const mockGetAdminDb = jest.fn();

jest.mock('../../../server/config/firebaseAdmin.js', () => ({
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => '__ts__')
      }
    }
  },
  getAdminDb: (...args) => mockGetAdminDb(...args)
}));

import {
  enqueueOwnedCourseCleanupJob,
  deleteByQueryInBatches,
  processOwnedCourseCleanupJob
} from '../../../server/services/ownedCourseCleanup.service.js';

function makeDoc(id) {
  return { id, ref: { id } };
}

describe('ownedCourseCleanup.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('re-encola jobs completed en estado pending', async () => {
    const txSet = jest.fn();
    const txGet = jest.fn(async () => ({
      exists: true,
      data: () => ({
        status: 'completed',
        attempts: 3,
        createdAt: 'created_at_old',
        processedAt: 'processed_at_old',
        result: { sessionsDeleted: 5 }
      })
    }));

    const runTransaction = jest.fn(async (cb) => cb({ get: txGet, set: txSet }));

    mockGetAdminDb.mockReturnValue({
      collection: () => ({ doc: () => ({}) }),
      runTransaction
    });

    await enqueueOwnedCourseCleanupJob({
      courseId: 'course-1',
      studentUid: 'student-1',
      requestedByUid: 'teacher-1',
      reason: 'teacher_remove_student'
    });

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(txSet).toHaveBeenCalledTimes(1);
    const [_, payload] = txSet.mock.calls[0];

    expect(payload.status).toBe('pending');
    expect(payload.result).toBeNull();
    expect(payload.processedAt).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(payload, 'requeuedAt')).toBe(true);
    expect(payload.attempts).toBe(3);
  });

  test('deleteByQueryInBatches divide borrado en lotes <= 450', async () => {
    const commitMock = jest.fn(async () => {});
    const deleteMock = jest.fn();
    const batchMock = jest.fn(() => ({
      delete: deleteMock,
      commit: commitMock
    }));

    mockGetAdminDb.mockReturnValue({
      batch: batchMock
    });

    const firstDocs = Array.from({ length: 450 }, (_, idx) => makeDoc(`s-${idx}`));
    const secondDocs = Array.from({ length: 120 }, (_, idx) => makeDoc(`t-${idx}`));

    const getMock = jest.fn()
      .mockResolvedValueOnce({ empty: false, docs: firstDocs })
      .mockResolvedValueOnce({ empty: false, docs: secondDocs });

    const limitMock = jest.fn(() => ({ get: getMock }));
    const queryRef = { limit: limitMock };

    const deleted = await deleteByQueryInBatches(queryRef, { limit: 450 });

    expect(limitMock).toHaveBeenCalledWith(450);
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(batchMock).toHaveBeenCalledTimes(2);
    expect(commitMock).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenCalledTimes(570);
    expect(deleted).toBe(570);
  });

  test('processOwnedCourseCleanupJob suma borrados legacy detectados por barrido', async () => {
    const batchDelete = jest.fn();
    const batchCommit = jest.fn(async () => {});
    const batch = jest.fn(() => ({
      delete: batchDelete,
      commit: batchCommit
    }));

    const sessionsQueryGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        { id: 'session-query-1', ref: { id: 'session-query-1' } }
      ]
    });
    const draftQueryGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });

    const sessionsCollectionGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'session-legacy-1',
          ref: { id: 'session-legacy-1' },
          data: () => ({ text: { sourceCourseId: 'course-1' } })
        },
        {
          id: 'session-other-course',
          ref: { id: 'session-other-course' },
          data: () => ({ sourceCourseId: 'course-2' })
        }
      ]
    });

    const draftCollectionGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'draft_backup_course-1_texto-9',
          ref: { id: 'draft_backup_course-1_texto-9' },
          data: () => ({ textoId: 'texto-9' })
        },
        {
          id: 'draft-other',
          ref: { id: 'draft-other' },
          data: () => ({ sourceCourseId: 'course-2' })
        }
      ]
    });

    const sessionsCollection = {
      where: () => ({ limit: () => ({ get: sessionsQueryGet }) }),
      get: sessionsCollectionGet
    };

    const draftBackupsCollection = {
      where: () => ({ limit: () => ({ get: draftQueryGet }) }),
      get: draftCollectionGet
    };

    const jobSet = jest.fn(async () => {});
    const jobGet = jest.fn(async () => ({
      exists: true,
      data: () => ({
        type: 'owned_course_cleanup',
        status: 'pending',
        courseId: 'course-1',
        studentUid: 'student-1',
        attempts: 0
      })
    }));

    const jobsDocRef = {
      get: jobGet,
      set: jobSet
    };

    const usersDocRef = {
      collection: (name) => {
        if (name === 'sessions') return sessionsCollection;
        if (name === 'draftBackups') return draftBackupsCollection;
        throw new Error(`Unexpected user subcollection: ${name}`);
      }
    };

    const db = {
      batch,
      collection: (name) => {
        if (name === 'maintenanceCleanupJobs') {
          return { doc: () => jobsDocRef };
        }
        if (name === 'users') {
          return { doc: () => usersDocRef };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }
    };

    mockGetAdminDb.mockImplementation(() => db);

    const result = await processOwnedCourseCleanupJob('job-1');

    expect(result.ok).toBe(true);
    expect(result.result).toEqual({
      sessionsDeleted: 2,
      draftBackupsDeleted: 1
    });
    expect(batch).toHaveBeenCalled();
    expect(batchDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'session-query-1' }));
    expect(batchDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'session-legacy-1' }));
    expect(batchDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft_backup_course-1_texto-9' }));
  });
});
