import React, { useContext } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AppContext, AppContextProvider } from '../../../src/context/AppContext';
import { AuthProvider } from '../../../src/context/AuthContext';

function Probe() {
  const ctx = useContext(AppContext);
  const count = Array.isArray(ctx?.globalTutorInteractions) ? ctx.globalTutorInteractions.length : -1;
  return (
    <div>
      <span data-testid="count">{String(count)}</span>
      <button
        type="button"
        onClick={() => ctx?.clearGlobalTutorLog?.()}
      >
        clear
      </button>
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

describe('AppContext - tutor interactions log', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('recorta el historial legacy a 150 al cargar y reescribe localStorage', async () => {
    const key = 'tutorInteractionsLog:global';
    const legacyEntries = Array.from({ length: 220 }, (_, idx) => ({
      timestamp: `2026-01-01T00:00:${String(idx % 60).padStart(2, '0')}.000Z`,
      question: `Pregunta ${idx + 1}`
    }));
    localStorage.setItem(key, JSON.stringify(legacyEntries));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('150');
    });

    const persisted = JSON.parse(localStorage.getItem(key) || '[]');
    expect(Array.isArray(persisted)).toBe(true);
    expect(persisted).toHaveLength(150);
    expect(persisted[0]?.question).toBe('Pregunta 71');
  });

  test('expone clearGlobalTutorLog y elimina el log de la lectura actual', async () => {
    const key = 'tutorInteractionsLog:global';
    localStorage.setItem(key, JSON.stringify([{ question: 'Q1' }, { question: 'Q2' }]));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'clear' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
    expect(localStorage.getItem(key)).toBeNull();
  });

  test('ignora interacciones invalidas y normaliza entradas legacy tipo string', async () => {
    const key = 'tutorInteractionsLog:global';
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('tutor-interaction-logged', { detail: null }));
      window.dispatchEvent(new CustomEvent('tutor-interaction-logged', { detail: { foo: 'bar' } }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('tutor-interaction-logged', { detail: 'Pregunta legacy' }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    const persisted = JSON.parse(localStorage.getItem(key) || '[]');
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.question).toBe('Pregunta legacy');
    expect(persisted[0]?.tutorMode).toBe('general');
  });
});
