/** @jest-environment node */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'applectura-rules-test';

if (typeof global.fetch !== 'function') {
  global.fetch = fetch;
}

describe('firestore.rules - progress security', () => {
  let testEnv;

  beforeAll(async () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules }
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  async function seedCourseEnrollment({ courseId, studentUid, estado = 'active' }) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc(`courses/${courseId}`).set({
        docenteUid: 'teacher-1',
        nombre: 'Curso de prueba'
      });
      await db.doc(`courses/${courseId}/students/${studentUid}`).set({
        estudianteUid: studentUid,
        estado
      });
    });
  }

  async function seedUsers() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc('users/teacher-1').set({ uid: 'teacher-1', role: 'docente' });
      await db.doc('users/teacher-2').set({ uid: 'teacher-2', role: 'docente' });
      await db.doc('users/student-1').set({ uid: 'student-1', role: 'estudiante' });
      await db.doc('users/student-2').set({ uid: 'student-2', role: 'estudiante' });
    });
  }

  async function seedProgressDoc({ studentUid, progressDocId, sourceCourseId, textoId }) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        sourceCourseId,
        textoId,
        updatedAt: Date.now()
      });
    });
  }

  test('permite escribir progreso en modo libre (free::) con docId compuesto', async () => {
    const studentUid = 'student-1';
    const textId = 'abc';
    const sourceCourseId = `free::${textId}`;
    const progressDocId = `${sourceCourseId}_${textId}`;

    const context = testEnv.authenticatedContext(studentUid);
    const db = context.firestore();

    await assertSucceeds(
      db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        sourceCourseId,
        textoId: textId,
        updatedAt: Date.now()
      })
    );
  });

  test('permite escribir progreso de curso con matrícula activa', async () => {
    const studentUid = 'student-1';
    const courseId = 'course-active-1';
    const textoId = 'texto-1';
    const progressDocId = `${courseId}_${textoId}`;

    await seedCourseEnrollment({ courseId, studentUid, estado: 'active' });

    const context = testEnv.authenticatedContext(studentUid);
    const db = context.firestore();

    await assertSucceeds(
      db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        sourceCourseId: courseId,
        textoId,
        updatedAt: Date.now()
      })
    );
  });

  test('permite escribir progreso de curso con matrícula legacy sin estado', async () => {
    const studentUid = 'student-1';
    const courseId = 'course-legacy-1';
    const textoId = 'texto-legacy';
    const progressDocId = `${courseId}_${textoId}`;

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc(`courses/${courseId}`).set({
        docenteUid: 'teacher-1',
        nombre: 'Curso legacy'
      });
      await db.doc(`courses/${courseId}/students/${studentUid}`).set({
        estudianteUid: studentUid
      });
    });

    const context = testEnv.authenticatedContext(studentUid);
    const db = context.firestore();

    await assertSucceeds(
      db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        sourceCourseId: courseId,
        textoId,
        updatedAt: Date.now()
      })
    );
  });

  test('bloquea escritura de progreso de curso si matrícula está removed', async () => {
    const studentUid = 'student-1';
    const courseId = 'course-removed-1';
    const textoId = 'texto-2';
    const progressDocId = `${courseId}_${textoId}`;

    await seedCourseEnrollment({ courseId, studentUid, estado: 'removed' });

    const context = testEnv.authenticatedContext(studentUid);
    const db = context.firestore();

    await assertFails(
      db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        sourceCourseId: courseId,
        textoId,
        updatedAt: Date.now()
      })
    );
  });

  test('bloquea create sin sourceCourseId para progreso scopeado', async () => {
    const studentUid = 'student-1';
    const courseId = 'course-missing-source';
    const textoId = 'texto-3';
    const progressDocId = `${courseId}_${textoId}`;

    await seedCourseEnrollment({ courseId, studentUid, estado: 'active' });

    const context = testEnv.authenticatedContext(studentUid);
    const db = context.firestore();

    await assertFails(
      db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        textoId,
        updatedAt: Date.now()
      })
    );
  });

  test('bloquea create con mismatch entre docId y textoId', async () => {
    const studentUid = 'student-1';
    const courseId = 'course-mismatch-1';
    const textoIdDoc = 'texto-canonico';
    const textoIdPayload = 'texto-distinto';
    const progressDocId = `${courseId}_${textoIdDoc}`;

    await seedCourseEnrollment({ courseId, studentUid, estado: 'active' });

    const context = testEnv.authenticatedContext(studentUid);
    const db = context.firestore();

    await assertFails(
      db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        sourceCourseId: courseId,
        textoId: textoIdPayload,
        updatedAt: Date.now()
      })
    );
  });

  test('bloquea update cambiando sourceCourseId en doc existente', async () => {
    const studentUid = 'student-1';
    const initialCourseId = 'course-original-1';
    const newCourseId = 'course-new-1';
    const textoId = 'texto-4';
    const progressDocId = `${initialCourseId}_${textoId}`;

    await seedCourseEnrollment({ courseId: initialCourseId, studentUid, estado: 'active' });
    await seedCourseEnrollment({ courseId: newCourseId, studentUid, estado: 'active' });
    await seedProgressDoc({
      studentUid,
      progressDocId,
      sourceCourseId: initialCourseId,
      textoId
    });

    const context = testEnv.authenticatedContext(studentUid);
    const db = context.firestore();

    await assertFails(
      db.doc(`students/${studentUid}/progress/${progressDocId}`).set({
        sourceCourseId: newCourseId,
        textoId,
        updatedAt: Date.now()
      }, { merge: true })
    );
  });

  test('aplica permisos read/delete por rol y curso en progress scopeado', async () => {
    const studentUid = 'student-1';
    const courseId = 'course-permissions-1';
    const textoId = 'texto-5';
    const progressDocId = `${courseId}_${textoId}`;

    await seedUsers();
    await seedCourseEnrollment({ courseId, studentUid, estado: 'active' });
    await seedProgressDoc({
      studentUid,
      progressDocId,
      sourceCourseId: courseId,
      textoId
    });

    const teacherOwner = testEnv.authenticatedContext('teacher-1').firestore();
    const teacherOther = testEnv.authenticatedContext('teacher-2').firestore();
    const outsiderStudent = testEnv.authenticatedContext('student-2').firestore();
    const studentOwner = testEnv.authenticatedContext(studentUid).firestore();

    await assertSucceeds(teacherOwner.doc(`students/${studentUid}/progress/${progressDocId}`).get());
    await assertFails(teacherOther.doc(`students/${studentUid}/progress/${progressDocId}`).get());
    await assertFails(outsiderStudent.doc(`students/${studentUid}/progress/${progressDocId}`).get());

    await assertFails(teacherOther.doc(`students/${studentUid}/progress/${progressDocId}`).delete());
    await assertFails(outsiderStudent.doc(`students/${studentUid}/progress/${progressDocId}`).delete());
    await assertSucceeds(studentOwner.doc(`students/${studentUid}/progress/${progressDocId}`).delete());
  });

  test('permite create de global_progress con sourceCourseId nulo', async () => {
    const studentUid = 'student-1';
    const db = testEnv.authenticatedContext(studentUid).firestore();

    await assertSucceeds(
      db.doc(`students/${studentUid}/progress/global_progress`).set({
        textoId: 'global_progress',
        sourceCourseId: null,
        rewardsState: { points: 3 },
        updatedAt: Date.now()
      })
    );
  });

  test('bloquea create de global_progress cuando sourceCourseId tiene valor', async () => {
    const studentUid = 'student-1';
    const db = testEnv.authenticatedContext(studentUid).firestore();

    await assertFails(
      db.doc(`students/${studentUid}/progress/global_progress`).set({
        textoId: 'global_progress',
        sourceCourseId: 'course-should-not-be-here',
        rewardsState: { points: 3 },
        updatedAt: Date.now()
      })
    );
  });

  test('permite update de global_progress manteniendo sourceCourseId nulo', async () => {
    const studentUid = 'student-1';

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc(`students/${studentUid}/progress/global_progress`).set({
        textoId: 'global_progress',
        sourceCourseId: null,
        rewardsState: { points: 1 },
        updatedAt: Date.now()
      });
    });

    const db = testEnv.authenticatedContext(studentUid).firestore();
    await assertSucceeds(
      db.doc(`students/${studentUid}/progress/global_progress`).set({
        textoId: 'global_progress',
        sourceCourseId: null,
        rewardsState: { points: 5 },
        updatedAt: Date.now()
      }, { merge: true })
    );
  });

  test('bloquea update de global_progress cuando sourceCourseId tiene valor', async () => {
    const studentUid = 'student-1';

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc(`students/${studentUid}/progress/global_progress`).set({
        textoId: 'global_progress',
        sourceCourseId: null,
        rewardsState: { points: 2 },
        updatedAt: Date.now()
      });
    });

    const db = testEnv.authenticatedContext(studentUid).firestore();
    await assertFails(
      db.doc(`students/${studentUid}/progress/global_progress`).set({
        textoId: 'global_progress',
        sourceCourseId: 'course-should-not-be-here',
        rewardsState: { points: 9 },
        updatedAt: Date.now()
      }, { merge: true })
    );
  });
});
