import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import ReadingWorkspace from '../../src/components/ReadingWorkspace';
import { AppContext } from '../../src/context/AppContext';
import { AuthProvider } from '../../src/context/AuthContext';
import fetchMock from 'jest-fetch-mock';

// Mock búsqueda web para aislar
jest.mock('../../src/hooks/useWebSearchTutor', () => () => ({
  search: async () => ([]),
  loading: false,
  error: null
}));

beforeEach(() => {
  fetchMock.mockResponse((req) => {
    const url = String(req?.url || req || '');
    if (url.includes('/api/chat/completion')) {
      return Promise.resolve(JSON.stringify({
        choices: [{ message: { content: 'Respuesta asistente simulada.' } }]
      }));
    }
    // Respuesta genérica para otras llamadas del workspace
    return Promise.resolve(JSON.stringify({ configuracion: {} }));
  });
});

function Wrapper({ children }) {
  const value = {
    texto: 'Fragmento inicial para análisis de acción.',
    setTexto: () => {}
  };
  return (
    <AuthProvider>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </AuthProvider>
  );
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
