import React, { useContext } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AppContext, AppContextProvider } from '../../../src/context/AppContext';
import { AuthProvider } from '../../../src/context/AuthContext';

function Probe() {
  const ctx = useContext(AppContext);
  const count = Array.isArray(ctx?.globalTutorInteractions) ? ctx.globalTutorInteractions.length : -1;
  const currentCourse = ctx?.sourceCourseId || 'none';
  const currentTexto = ctx?.currentTextoId || 'none';

  const switchTo = (courseId, textoId) => {
    ctx?.setCurrentTextoId?.(textoId);
    ctx?.setSourceCourseId?.(courseId);
  };

  const emitInteraction = () => {
    const lectureId = ctx?.currentTextoId || 'global';
    const courseId = ctx?.sourceCourseId || 'free';
    window.dispatchEvent(new CustomEvent('tutor-interaction-logged', {
      detail: {
        lectureId,
        question: `Q-${courseId}`,
        timestamp: new Date().toISOString(),
        tutorMode: 'general'
      }
    }));
  };

  return (
    <div>
      <span data-testid="count">{String(count)}</span>
      <span data-testid="course">{currentCourse}</span>
      <span data-testid="texto">{currentTexto}</span>
      <button type="button" onClick={() => switchTo('course-A', 'texto-1')}>A</button>
      <button type="button" onClick={() => switchTo('course-B', 'texto-1')}>B</button>
      <button type="button" onClick={emitInteraction}>emit</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <AuthProvider>
      <AppContextProvider>
        <Probe />
      </AppContextProvider>
    </AuthProvider>
  );
}

describe('AppContext tutor log cross-course isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('a/b con mismo textoId no contamina interacciones de tutor', async () => {
    renderWithProviders();

    const keyA = 'tutorInteractionsLog:course-A::texto-1';
    const keyB = 'tutorInteractionsLog:course-B::texto-1';

    await act(async () => {
      screen.getByRole('button', { name: 'A' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('course')).toHaveTextContent('course-A');
      expect(screen.getByTestId('texto')).toHaveTextContent('texto-1');
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'emit' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    const dataA1 = JSON.parse(localStorage.getItem(keyA) || '[]');
    expect(dataA1).toHaveLength(1);
    expect(dataA1[0]?.question).toBe('Q-course-A');

    await act(async () => {
      screen.getByRole('button', { name: 'B' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('course')).toHaveTextContent('course-B');
      expect(screen.getByTestId('texto')).toHaveTextContent('texto-1');
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    expect(localStorage.getItem(keyB)).toBeNull();
    const dataA2 = JSON.parse(localStorage.getItem(keyA) || '[]');
    expect(dataA2).toHaveLength(1);
    expect(dataA2[0]?.question).toBe('Q-course-A');

    // Simula evento tardio del curso A cuando la UI ya esta en curso B.
    await act(async () => {
      window.dispatchEvent(new CustomEvent('tutor-interaction-logged', {
        detail: {
          lectureId: 'texto-1',
          sourceCourseId: 'course-A',
          question: 'Q-course-A-late',
          timestamp: new Date().toISOString(),
          tutorMode: 'general'
        }
      }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    const dataAAfterLate = JSON.parse(localStorage.getItem(keyA) || '[]');
    expect(dataAAfterLate).toHaveLength(2);
    expect(dataAAfterLate[1]?.question).toBe('Q-course-A-late');

    await act(async () => {
      screen.getByRole('button', { name: 'emit' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    const dataB1 = JSON.parse(localStorage.getItem(keyB) || '[]');
    expect(dataB1).toHaveLength(1);
    expect(dataB1[0]?.question).toBe('Q-course-B');

    const dataA3 = JSON.parse(localStorage.getItem(keyA) || '[]');
    expect(dataA3).toHaveLength(2);
    expect(dataA3[0]?.question).toBe('Q-course-A');

    await act(async () => {
      screen.getByRole('button', { name: 'A' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('course')).toHaveTextContent('course-A');
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });
  });
});
