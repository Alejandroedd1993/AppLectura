import {
  cleanupCourseScopedBrowserData,
  cleanupMultipleCoursesBrowserData,
  inferCourseIdsFromBrowserData
} from '../../../src/utils/courseDataCleanup';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('courseDataCleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  test('inferCourseIdsFromBrowserData detects course-scoped ids from browser storage', () => {
    localStorage.setItem('activity_results_courseA_doc1', '{}');
    localStorage.setItem('tutorInteractionsLog:courseB::texto1', '[]');
    localStorage.setItem('ethicalReflections:courseC::texto1', '{}');
    localStorage.setItem('studyitems:courseD_texto1:v1', '{}');
    localStorage.setItem('notas_disponibles_courseE_texto1', 'true');
    localStorage.setItem('rubricProgress_user1_courseF_texto1', '{}');
    localStorage.setItem('activitiesProgress_user1_courseG_texto1', '{}');
    localStorage.setItem('savedCitations_user1_courseH_texto1', '{}');
    localStorage.setItem('tutorHistorial:user1:courseI:texto1', '[]');
    localStorage.setItem('activity_results_index', JSON.stringify({
      'courseJ::docX': { last_modified: Date.now() },
      'courseK::docY': { courseId: 'courseK' },
      'legacyDocOnly': { docId: 'legacyDocOnly' }
    }));
    localStorage.setItem('appLectura_sessions_user1', JSON.stringify([
      { id: 's1', sourceCourseId: 'courseL' },
      { id: 's2', sourceCourseId: 'free::texto-z' }
    ]));
    localStorage.setItem('notas_estudio_progreso:user1', JSON.stringify({
      data: {
        courseM_texto1: { foo: 1 },
        'free::textoX_doc': { foo: 1 }
      }
    }));

    const ids = inferCourseIdsFromBrowserData('user1');

    expect(ids).toEqual(expect.arrayContaining([
      'courseB',
      'courseC',
      'courseE',
      'courseF',
      'courseG',
      'courseH',
      'courseI',
      'courseJ',
      'courseK',
      'courseL',
      'courseM'
    ]));
    // Claves ambiguas no deben inferirse como courseId válidos.
    expect(ids).not.toContain('courseA');
    expect(ids).not.toContain('courseD');
    expect(ids).not.toContain('free::texto-z');
  });

  test('inferCourseIdsFromBrowserData no infiere ids desde claves libres ambiguas', () => {
    localStorage.setItem('activity_results_resumen_academico_15bha3d', '{}');
    localStorage.setItem('studyitems:resumen_academico_15bha3d:v1', '{}');
    localStorage.setItem('tutorHistorial:user1:free:15bha3d', '[]');
    sessionStorage.setItem('resumenAcademico_draft', 'texto libre');
    sessionStorage.setItem('tablaACD_marcoIdeologico', 'texto libre');

    const ids = inferCourseIdsFromBrowserData('user1');
    expect(ids).toEqual([]);
  });

  test('inferCourseIdsFromBrowserData detecta ids de curso opacos en activity_results y studyitems', () => {
    const courseId = 'AbC123def456GHI789jk';
    localStorage.setItem(`activity_results_${courseId}_doc1`, '{}');
    localStorage.setItem(`studyitems:${courseId}_texto1:v1`, '{}');

    const ids = inferCourseIdsFromBrowserData('user1');
    expect(ids).toEqual(expect.arrayContaining([courseId]));
  });

  test('inferCourseIdsFromBrowserData detecta ids con guion bajo cuando hay evidencia corroborada', () => {
    const courseId = 'curso_alpha_2026';
    localStorage.setItem(`activity_results_${courseId}_docZ`, '{}');
    localStorage.setItem(`studyitems:${courseId}_texto9:v1`, '{}');

    const ids = inferCourseIdsFromBrowserData('user1');
    expect(ids).toEqual(expect.arrayContaining([courseId]));
  });

  test('inferCourseIdsFromBrowserData preserva courseId con underscore en claves scoped', () => {
    const courseId = 'curso_alpha_2026';
    localStorage.setItem(`notas_disponibles_${courseId}_texto_9`, 'true');
    localStorage.setItem(`rubricProgress_user1_${courseId}_texto_9`, '{}');

    const ids = inferCourseIdsFromBrowserData('user1');
    expect(ids).toEqual(expect.arrayContaining([courseId]));
  });

  test('inferCourseIdsFromBrowserData preserva courseId con underscore aun sin userId', () => {
    const courseId = 'curso_alpha_2026';
    localStorage.setItem(`rubricProgress_user1_${courseId}_texto_9`, '{}');
    localStorage.setItem(`activitiesProgress_user1_${courseId}_texto_9`, '{}');
    localStorage.setItem(`savedCitations_user1_${courseId}_texto_9`, '{}');

    const ids = inferCourseIdsFromBrowserData(null);
    expect(ids).toEqual(expect.arrayContaining([courseId]));
  });

  test('inferCourseIdsFromBrowserData preserva courseId con underscore cuando no hay marcador conocido', () => {
    const courseId = 'curso_alpha_2026';
    localStorage.setItem(`rubricProgress_user1_${courseId}_segmentoFinal`, '{}');

    const ids = inferCourseIdsFromBrowserData('user1');
    expect(ids).toEqual(expect.arrayContaining([courseId]));
  });

  test('inferCourseIdsFromBrowserData infiere id conservador cuando hay evidencia local corroborada', () => {
    const orphanCourseId = 'c7a91bd2';
    localStorage.setItem(`activity_results_${orphanCourseId}_doc1`, '{}');
    localStorage.setItem(`studyitems:${orphanCourseId}_texto1:v1`, '{}');

    const ids = inferCourseIdsFromBrowserData('user1');
    expect(ids).toEqual(expect.arrayContaining([orphanCourseId]));
  });

  test('cleanupCourseScopedBrowserData removes local/session keys, notes entries, sessions and index entries', () => {
    const courseId = 'courseA';
    const userId = 'user1';

    localStorage.setItem(`activity_results_${courseId}_doc1`, '{}');
    localStorage.setItem(`tutorInteractionsLog:${courseId}::texto1`, '[]');
    localStorage.setItem(`ethicalReflections:${courseId}::texto1`, '{}');
    localStorage.setItem(`studyitems:${courseId}_texto1:v1`, '{}');
    localStorage.setItem(`notas_disponibles_${courseId}_texto1`, 'true');
    localStorage.setItem(`rubricProgress_${userId}_${courseId}_texto1`, '{}');
    localStorage.setItem(`activitiesProgress_${userId}_${courseId}_texto1`, '{}');
    localStorage.setItem(`savedCitations_${userId}_${courseId}_texto1`, '{}');
    localStorage.setItem(`firestore_backup_${userId}_${courseId}_texto1`, '{}');
    localStorage.setItem(`tutorHistorial:${userId}:${courseId}:texto1`, '[]');
    localStorage.setItem(`courseProgress_${courseId}`, '{}');
    localStorage.setItem('activity_results_index', JSON.stringify({
      [`${courseId}::doc1`]: { last_modified: Date.now(), courseId },
      'courseB::doc2': { last_modified: Date.now(), courseId: 'courseB' }
    }));
    localStorage.setItem(`notas_estudio_progreso:${userId}`, JSON.stringify({
      data: {
        [`${courseId}_texto1`]: { foo: 1 },
        courseB_texto2: { foo: 2 }
      }
    }));
    localStorage.setItem('notas_estudio_progreso', JSON.stringify({
      data: {
        [`${courseId}_texto1`]: { foo: 1 },
        courseB_texto2: { foo: 2 }
      }
    }));
    localStorage.setItem(`appLectura_sessions_${userId}`, JSON.stringify([
      { id: 's1', sourceCourseId: courseId },
      { id: 's2', sourceCourseId: 'courseB' }
    ]));
    localStorage.setItem(`appLectura_current_session_id_${userId}`, 's1');
    localStorage.setItem(`appLectura_pending_syncs_${userId}`, JSON.stringify(['s1', 's2']));
    localStorage.setItem(`appLectura_deleted_sessions_${userId}`, JSON.stringify({ s1: Date.now(), s9: Date.now() }));
    localStorage.setItem('currentCourseId', courseId);
    localStorage.setItem('sourceCourseId', courseId);

    sessionStorage.setItem(`${courseId}_resumenAcademico_draft`, 'x');
    sessionStorage.setItem('foo_courseId', courseId);
    sessionStorage.setItem('other_courseId', 'courseB');

    const stats = cleanupCourseScopedBrowserData({ courseId, userId });

    expect(stats.removedLocalStorageKeys).toBeGreaterThan(0);
    expect(stats.removedSessionStorageKeys).toBeGreaterThan(0);
    expect(stats.removedActivityIndexEntries).toBe(1);
    expect(stats.removedNotesEntries).toBe(2);
    expect(stats.removedSessions).toBe(1);

    expect(localStorage.getItem(`activity_results_${courseId}_doc1`)).toBeNull();
    expect(localStorage.getItem(`tutorInteractionsLog:${courseId}::texto1`)).toBeNull();
    expect(localStorage.getItem(`ethicalReflections:${courseId}::texto1`)).toBeNull();
    expect(localStorage.getItem(`studyitems:${courseId}_texto1:v1`)).toBeNull();
    expect(localStorage.getItem(`notas_disponibles_${courseId}_texto1`)).toBeNull();
    expect(localStorage.getItem(`rubricProgress_${userId}_${courseId}_texto1`)).toBeNull();
    expect(localStorage.getItem(`activitiesProgress_${userId}_${courseId}_texto1`)).toBeNull();
    expect(localStorage.getItem(`savedCitations_${userId}_${courseId}_texto1`)).toBeNull();
    expect(localStorage.getItem(`firestore_backup_${userId}_${courseId}_texto1`)).toBeNull();
    expect(localStorage.getItem(`tutorHistorial:${userId}:${courseId}:texto1`)).toBeNull();
    expect(localStorage.getItem(`courseProgress_${courseId}`)).toBeNull();
    expect(localStorage.getItem('currentCourseId')).toBeNull();
    expect(localStorage.getItem('sourceCourseId')).toBeNull();

    const activityIndex = JSON.parse(localStorage.getItem('activity_results_index'));
    expect(activityIndex).toEqual({
      'courseB::doc2': expect.any(Object)
    });

    const scopedNotas = JSON.parse(localStorage.getItem(`notas_estudio_progreso:${userId}`));
    expect(scopedNotas.data).toEqual({ courseB_texto2: { foo: 2 } });
    const legacyNotas = JSON.parse(localStorage.getItem('notas_estudio_progreso'));
    expect(legacyNotas.data).toEqual({ courseB_texto2: { foo: 2 } });

    expect(JSON.parse(localStorage.getItem(`appLectura_sessions_${userId}`))).toEqual([
      { id: 's2', sourceCourseId: 'courseB' }
    ]);
    expect(localStorage.getItem(`appLectura_current_session_id_${userId}`)).toBeNull();
    expect(JSON.parse(localStorage.getItem(`appLectura_pending_syncs_${userId}`))).toEqual(['s2']);
    expect(JSON.parse(localStorage.getItem(`appLectura_deleted_sessions_${userId}`))).toEqual({ s9: expect.any(Number) });

    expect(sessionStorage.getItem(`${courseId}_resumenAcademico_draft`)).toBeNull();
    expect(sessionStorage.getItem('foo_courseId')).toBeNull();
    expect(sessionStorage.getItem('other_courseId')).toBe('courseB');
  });

  test('cleanupMultipleCoursesBrowserData aggregates cleanup stats', () => {
    localStorage.setItem('activity_results_courseA_doc1', '{}');
    localStorage.setItem('activity_results_courseB_doc1', '{}');
    localStorage.setItem('activity_results_index', JSON.stringify({
      'courseA::doc1': { courseId: 'courseA' },
      'courseB::doc1': { courseId: 'courseB' }
    }));

    const stats = cleanupMultipleCoursesBrowserData({
      courseIds: ['courseA', 'courseB', 'courseA'],
      userId: 'user1'
    });

    expect(stats.courses).toBe(2);
    expect(stats.removedLocalStorageKeys).toBeGreaterThanOrEqual(2);
    expect(stats.removedActivityIndexEntries).toBe(2);
    expect(localStorage.getItem('activity_results_courseA_doc1')).toBeNull();
    expect(localStorage.getItem('activity_results_courseB_doc1')).toBeNull();
  });
});
