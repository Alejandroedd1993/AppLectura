import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import ReadingWorkspace from '../../src/components/ReadingWorkspace';
import { AppContext } from '../../src/context/AppContext';

// Mock búsqueda web para aislar
jest.mock('../../src/hooks/useWebSearchTutor', () => () => ({
  search: async () => ([]),
  loading: false,
  error: null
}));

// Mock fetch backend para respuesta asistente rápida
beforeAll(() => {
  global.originalFetch = global.fetch;
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'Respuesta asistente simulada.' } }] })
  }));
});

afterAll(() => {
  global.fetch = global.originalFetch;
});

function Wrapper({ children }) {
  const value = {
    texto: 'Fragmento inicial para análisis de acción.',
    setTexto: () => {}
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

describe('ReadingWorkspace integración acción→render tutor', () => {
  test('dispara reader-action y aparece mensaje de usuario con fragmento', async () => {
    render(<ReadingWorkspace />, { wrapper: Wrapper });
    const fragment = 'inicial para análisis';
    const ev = new CustomEvent('reader-action', { detail: { action: 'explain', text: fragment } });
    window.dispatchEvent(ev);

    await waitFor(() => {
      // Debe aparecer el fragmento dentro del prompt completo del usuario (que incluye instrucciones + Fragmento: "...")
      expect(screen.getByText(/inicial para análisis/)).toBeInTheDocument();
    });
  });
});
