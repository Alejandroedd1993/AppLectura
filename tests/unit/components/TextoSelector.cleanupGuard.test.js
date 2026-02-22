import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import TextoSelector from '../../../src/components/estudiante/TextoSelector';
import { AppContext } from '../../../src/context/AppContext';
import { lightTheme } from '../../../src/styles/theme';

const mockGetStudentCourses = jest.fn();
const mockGetStudentProgress = jest.fn();
const mockCleanupOrphanedStudentOwnedCourseData = jest.fn();
const mockCleanupMultipleCoursesBrowserData = jest.fn();
const mockInferCourseIdsFromBrowserData = jest.fn();

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'student-1' },
    userData: { nombre: 'Estudiante Test' },
    signOut: jest.fn()
  })
}));

jest.mock('../../../src/firebase/firestore', () => ({
  joinCourseWithCode: jest.fn(),
  getAllStudentProgress: jest.fn(async () => []),
  getStudentProgress: (...args) => mockGetStudentProgress(...args),
  getStudentCourses: (...args) => mockGetStudentCourses(...args),
  withdrawFromCourse: jest.fn(),
  cleanupOrphanedStudentOwnedCourseData: (...args) => mockCleanupOrphanedStudentOwnedCourseData(...args)
}));

jest.mock('../../../src/services/sessionManager', () => ({
  getAllSessionsMerged: jest.fn(async () => []),
  deleteSession: jest.fn()
}));

jest.mock('../../../src/utils/courseDataCleanup', () => ({
  cleanupCourseScopedBrowserData: jest.fn(),
  cleanupMultipleCoursesBrowserData: (...args) => mockCleanupMultipleCoursesBrowserData(...args),
  inferCourseIdsFromBrowserData: (...args) => mockInferCourseIdsFromBrowserData(...args)
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn()
}));

describe('TextoSelector - guard de limpieza huérfana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStudentProgress.mockResolvedValue(null);
    mockGetStudentCourses.mockRejectedValue(new Error('network down'));
  });

  test('no ejecuta limpieza huérfana cuando falla getStudentCourses', async () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={{ restoreSession: jest.fn() }}>
          <TextoSelector onSelectText={jest.fn()} onFreeAnalysis={jest.fn()} />
        </AppContext.Provider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Mis Cursos')).toBeInTheDocument();
    });

    expect(mockGetStudentCourses).toHaveBeenCalledTimes(1);
    expect(mockCleanupOrphanedStudentOwnedCourseData).not.toHaveBeenCalled();
    expect(mockInferCourseIdsFromBrowserData).not.toHaveBeenCalled();
    expect(mockCleanupMultipleCoursesBrowserData).not.toHaveBeenCalled();
  });
});
