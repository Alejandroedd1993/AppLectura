const mockGetAdminDb = jest.fn();
const mockIsFirebaseAdminConfigured = jest.fn();

const mockEnqueueOwnedCourseCleanupJob = jest.fn();
const mockProcessOwnedCourseCleanupJob = jest.fn();
const mockProcessPendingOwnedCleanupJobs = jest.fn();

jest.mock('../../../server/config/firebaseAdmin.js', () => ({
  getAdminDb: (...args) => mockGetAdminDb(...args),
  isFirebaseAdminConfigured: (...args) => mockIsFirebaseAdminConfigured(...args)
}));

jest.mock('../../../server/services/ownedCourseCleanup.service.js', () => ({
  enqueueOwnedCourseCleanupJob: (...args) => mockEnqueueOwnedCourseCleanupJob(...args),
  processOwnedCourseCleanupJob: (...args) => mockProcessOwnedCourseCleanupJob(...args),
  processPendingOwnedCleanupJobs: (...args) => mockProcessPendingOwnedCleanupJobs(...args)
}));

import adminCleanupController from '../../../server/controllers/adminCleanup.controller.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('adminCleanup.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('enqueueOwnedCleanup responde 503 si Firebase Admin no está configurado', async () => {
    mockIsFirebaseAdminConfigured.mockReturnValue(false);
    const req = {
      auth: { uid: 'teacher-1' },
      body: { courseId: 'course-1', studentUid: 'student-1' }
    };
    const res = makeRes();

    await adminCleanupController.enqueueOwnedCleanup(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      codigo: 'FIREBASE_ADMIN_NOT_CONFIGURED',
      mensaje: expect.any(String)
    }));
  });

  test('enqueueOwnedCleanup encola y procesa cuando docente es owner del curso', async () => {
    mockIsFirebaseAdminConfigured.mockReturnValue(true);
    mockGetAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ docenteUid: 'teacher-1' })
          })
        })
      })
    });

    mockEnqueueOwnedCourseCleanupJob.mockResolvedValue({ jobId: 'owned_course-1_student-1' });
    mockProcessOwnedCourseCleanupJob.mockResolvedValue({ ok: true, result: { sessionsDeleted: 2, draftBackupsDeleted: 1 } });

    const req = {
      auth: { uid: 'teacher-1' },
      body: {
        courseId: 'course-1',
        studentUid: 'student-1',
        reason: 'teacher_remove_student',
        processNow: true
      }
    };
    const res = makeRes();

    await adminCleanupController.enqueueOwnedCleanup(req, res);

    expect(mockEnqueueOwnedCourseCleanupJob).toHaveBeenCalledWith(expect.objectContaining({
      courseId: 'course-1',
      studentUid: 'student-1',
      requestedByUid: 'teacher-1'
    }));
    expect(mockProcessOwnedCourseCleanupJob).toHaveBeenCalledWith('owned_course-1_student-1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      queued: true,
      jobId: 'owned_course-1_student-1'
    }));
  });

  test('enqueueOwnedCleanup responde error si processNow falla en backend', async () => {
    mockIsFirebaseAdminConfigured.mockReturnValue(true);
    mockGetAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ docenteUid: 'teacher-1' })
          })
        })
      })
    });

    mockEnqueueOwnedCourseCleanupJob.mockResolvedValue({ jobId: 'owned_course-1_student-1' });
    mockProcessOwnedCourseCleanupJob.mockResolvedValue({ ok: false, error: 'permission-denied' });

    const req = {
      auth: { uid: 'teacher-1' },
      body: {
        courseId: 'course-1',
        studentUid: 'student-1',
        processNow: true
      }
    };
    const res = makeRes();

    await adminCleanupController.enqueueOwnedCleanup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      queued: true,
      jobId: 'owned_course-1_student-1',
      processResult: expect.objectContaining({ ok: false }),
      codigo: 'ADMIN_CLEANUP_PROCESS_FAILED',
      mensaje: expect.any(String)
    }));
  });

  test('enqueueOwnedCleanup responde 403 semantico si el docente no es owner', async () => {
    mockIsFirebaseAdminConfigured.mockReturnValue(true);
    mockGetAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ docenteUid: 'other-teacher' })
          })
        })
      })
    });

    const req = {
      auth: { uid: 'teacher-1' },
      body: {
        courseId: 'course-1',
        studentUid: 'student-1'
      }
    };
    const res = makeRes();

    await adminCleanupController.enqueueOwnedCleanup(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      codigo: 'ADMIN_CLEANUP_FORBIDDEN',
      mensaje: expect.any(String)
    }));
  });
});
