jest.mock('../../../src/firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, ...segments) => ({
    __type: 'doc',
    path: segments.join('/'),
    id: segments[segments.length - 1]
  })),
  collection: jest.fn((_db, ...segments) => ({
    __type: 'collection',
    path: segments.join('/')
  })),
  collectionGroup: jest.fn((_db, segment) => ({
    __type: 'collectionGroup',
    path: segment
  })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  query: jest.fn((collectionRef, ...constraints) => ({
    __type: 'query',
    path: collectionRef.path,
    constraints
  })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ __serverTimestamp: true })),
  increment: jest.fn((value) => ({ __increment: value })),
  runTransaction: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  deleteField: jest.fn(),
  writeBatch: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  startAt: jest.fn(),
  endAt: jest.fn(),
  endBefore: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() }))
  }
}));

import { getCourseMetrics, getStudentCourses } from '../../../src/firebase/firestore';
import * as firestoreFns from 'firebase/firestore';

function makeDocSnap(id, data) {
  return {
    id,
    ref: { id },
    exists: () => true,
    data: () => data
  };
}

describe('getCourseMetrics - claves compuestas courseId_textoId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normaliza lecturaDetails por textoId canónico y conserva artifacts desde activitiesProgress[doc.id]', async () => {
    const courseId = 'course-1';
    const studentUid = 'student-1';
    const textoId = 'texto-1';
    const compositeDocId = `${courseId}_${textoId}`;

    firestoreFns.getDoc
      .mockImplementationOnce(async () => makeDocSnap(courseId, {
        lecturasAsignadas: [{ textoId }]
      }))
      .mockImplementation(async (ref) => {

        if (ref?.path === `users/${studentUid}`) {
          return {
            exists: () => false,
            data: () => ({})
          };
        }

        return {
          exists: () => false,
          data: () => ({})
        };
      });

    let getDocsCall = 0;
    firestoreFns.getDocs.mockImplementation(async () => {
      getDocsCall += 1;

      if (getDocsCall === 1) {
        return {
          docs: [makeDocSnap(studentUid, { estado: 'active', estudianteUid: studentUid })]
        };
      }

      if (getDocsCall === 2) {
        return {
          docs: [
            makeDocSnap(compositeDocId, {
              textoId,
              sourceCourseId: courseId,
              porcentaje: 100,
              activitiesProgress: {
                [compositeDocId]: {
                  artifacts: {
                    resumenAcademico: {
                      submitted: true,
                      score: 8
                    }
                  }
                }
              },
              rubricProgress: {
                rubrica1: { average: 8 }
              }
            })
          ]
        };
      }

      return { docs: [] };
    });

    const result = await getCourseMetrics(courseId);

    expect(result?.estudiantes).toHaveLength(1);
    const student = result.estudiantes[0];

    expect(student.lecturaDetails[textoId]).toBeDefined();
    expect(student.lecturaDetails[compositeDocId]).toBeUndefined();
    expect(student.lecturaDetails[textoId].artifacts.resumenAcademico.submitted).toBe(true);
    expect(student.lecturaDetails[textoId].artifacts.resumenAcademico.rubricScore).toBe(8);
  });

  test('getStudentCourses no retorna cursos con matrícula rota y limpia enrolledCourses stale', async () => {
    const studentUid = 'student-1';
    const staleCourseId = 'course-stale';

    firestoreFns.getDocs.mockResolvedValue({ docs: [] });
    firestoreFns.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ enrolledCourses: [staleCourseId] })
    });

    firestoreFns.getDoc.mockImplementation(async (ref) => {
      if (ref?.path === `courses/${staleCourseId}`) {
        return {
          exists: () => true,
          id: staleCourseId,
          data: () => ({ nombre: 'Curso Stale' })
        };
      }

      if (ref?.path === `courses/${staleCourseId}/students/${studentUid}`) {
        return {
          exists: () => false,
          data: () => ({})
        };
      }

      return {
        exists: () => false,
        data: () => ({})
      };
    });

    firestoreFns.updateDoc.mockResolvedValue(undefined);

    const courses = await getStudentCourses(studentUid);

    expect(courses).toEqual([]);
    expect(firestoreFns.updateDoc).toHaveBeenCalledTimes(1);
    expect(firestoreFns.arrayRemove).toHaveBeenCalledWith(staleCourseId);
  });

  test('getStudentCourses fallback legacy excluye estados removed/inactive/deleted', async () => {
    const studentUid = 'student-1';

    firestoreFns.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ enrolledCourses: [] })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'course-active',
        data: () => ({ nombre: 'Curso Activo' })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'course-removed',
        data: () => ({ nombre: 'Curso Removed' })
      });

    const makeEnrollmentDoc = (courseId, estado) => ({
      data: () => ({ estado }),
      ref: {
        parent: {
          parent: { path: `courses/${courseId}`, id: courseId }
        }
      }
    });

    firestoreFns.getDocs.mockResolvedValue({
      docs: [
        makeEnrollmentDoc('course-active', 'active'),
        makeEnrollmentDoc('course-removed', 'removed')
      ]
    });

    const courses = await getStudentCourses(studentUid);

    expect(courses).toHaveLength(1);
    expect(courses[0].id).toBe('course-active');
  });

  test('getCourseMetrics evita fallback legacy ambiguo y usa docId compuesto seguro', async () => {
    const courseId = 'course-1';
    const studentUid = 'student-1';
    const textoId = 'texto-1';
    const compositeDocId = `${courseId}_${textoId}`;

    firestoreFns.getDoc.mockReset();
    firestoreFns.getDocs.mockReset();
    firestoreFns.getDoc.mockResolvedValueOnce(makeDocSnap(courseId, { lecturasAsignadas: [{ textoId }] }));

    firestoreFns.getDoc.mockImplementation(async (ref) => {
      if (ref?.path === `users/${studentUid}`) {
        return {
          exists: () => false,
          data: () => ({})
        };
      }

      if (ref?.path === `students/${studentUid}/progress/${compositeDocId}`) {
        return makeDocSnap(compositeDocId, {
          textoId,
          porcentaje: 100,
          sourceCourseId: '',
          rubricProgress: { rubrica1: { average: 9 } }
        });
      }

      if (ref?.path === `students/${studentUid}/progress/${textoId}`) {
        throw new Error('legacy_textoId_fallback_not_allowed');
      }

      return {
        exists: () => false,
        data: () => ({})
      };
    });

    let getDocsCall = 0;
    firestoreFns.getDocs.mockImplementation(async () => {
      getDocsCall += 1;
      if (getDocsCall === 1) {
        return {
          docs: [makeDocSnap(studentUid, { estado: 'active', estudianteUid: studentUid })]
        };
      }
      if (getDocsCall === 2) {
        return { docs: [] };
      }
      return { docs: [] };
    });

    const result = await getCourseMetrics(courseId);
    expect(result?.estudiantes).toHaveLength(1);
    expect(result.estudiantes[0]).toBeDefined();
  });
});
