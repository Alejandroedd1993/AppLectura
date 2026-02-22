import { renderHook, act } from '@testing-library/react';
import useTeacherArtifactReset from '../../../src/hooks/useTeacherArtifactReset';

jest.mock('../../../src/services/sessionManager', () => ({
  getDraftKey: jest.fn((base, lectureId, sourceCourseId) => `${base}:${sourceCourseId || 'none'}:${lectureId}`)
}));

describe('useTeacherArtifactReset', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  test('aplica reset docente una sola vez por resetAt y limpia almacenamiento', async () => {
    const onApplyReset = jest.fn();
    const clearResults = jest.fn();

    localStorage.setItem('activity_results_course-1_lecture-1_x', 'x');
    sessionStorage.setItem('resumenAcademico_draft:course-1:lecture-1', 'draft');

    const { result } = renderHook(() => useTeacherArtifactReset({
      artifactLabel: 'ResumenAcademico',
      lectureId: 'lecture-1',
      sourceCourseId: 'course-1',
      persistence: { clearResults },
      draftKeyBase: 'resumenAcademico_draft',
      onApplyReset
    }));

    let applied;
    await act(async () => {
      applied = result.current({
        resetBy: 'docente',
        resetAt: '2026-02-22T12:00:00.000Z',
        submitted: false
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(applied).toBe(true);
    expect(onApplyReset).toHaveBeenCalledTimes(1);
    expect(clearResults).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('activity_results_course-1_lecture-1_x')).toBeNull();
    expect(sessionStorage.getItem('resumenAcademico_draft:course-1:lecture-1')).toBeNull();

    await act(async () => {
      applied = result.current({
        resetBy: 'docente',
        resetAt: '2026-02-22T12:00:00.000Z',
        submitted: false
      });
      await Promise.resolve();
    });

    expect(applied).toBe(true);
    expect(onApplyReset).toHaveBeenCalledTimes(1);
  });

  test('no aplica reset cuando submitted es true o resetBy no es docente', () => {
    const onApplyReset = jest.fn();

    const { result } = renderHook(() => useTeacherArtifactReset({
      artifactLabel: 'ResumenAcademico',
      lectureId: 'lecture-1',
      sourceCourseId: 'course-1',
      persistence: null,
      draftKeyBase: 'resumenAcademico_draft',
      onApplyReset
    }));

    let applied = false;
    act(() => {
      applied = result.current({ resetBy: 'docente', resetAt: '2026-02-22T12:00:00.000Z', submitted: true });
    });
    expect(applied).toBe(false);

    act(() => {
      applied = result.current({ resetBy: 'sistema', resetAt: '2026-02-22T12:00:00.000Z', submitted: false });
    });
    expect(applied).toBe(false);
    expect(onApplyReset).not.toHaveBeenCalled();
  });
});
