import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import ReadingWorkspace from '../../src/components/ReadingWorkspace';
import { AppContext } from '../../src/context/AppContext';
import * as readerPrompts from '../../src/utils/readerActionPrompts';
import { AuthProvider } from '../../src/context/AuthContext';

// Mock web search hook para aislar prueba
jest.mock('../../src/hooks/useWebSearchTutor', () => () => ({
  search: async () => ([]),
  loading: false,
  error: null
}));

// Espía sobre buildPromptFromAction para confirmar uso
let spyBuild;

function Wrapper({ children }) {
  const value = {
    texto: 'Este es un texto educativo para probar acciones.\nSegundo párrafo con más contenido contextual.',
    setTexto: () => {}
  };
  return (
    <AuthProvider>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </AuthProvider>
  );
}

/**
 * Objetivo: Verificar que al emitir un evento 'reader-action' el ReadingWorkspace
 * (a través de useReaderActions) transforma la acción en un prompt y lo envía
 * al Tutor mediante el CustomEvent 'tutor-external-prompt'.
 * Estrategia: Escuchar temporalmente 'tutor-external-prompt' y comprobar payload.
 */

describe('ReadingWorkspace acciones contextualizadas', () => {
  test('emite tutor-external-prompt al disparar reader-action', async () => {
    spyBuild = jest.spyOn(readerPrompts, 'buildPromptFromAction');
    const received = [];
    const handler = (e) => received.push(e.detail?.prompt);
    window.addEventListener('tutor-external-prompt', handler);

    render(<ReadingWorkspace />, { wrapper: Wrapper });

    // Simular selección contextual: acción explain con fragmento
    const fragment = 'texto educativo';
    const actionEvent = new CustomEvent('reader-action', { detail: { action: 'explain', text: fragment } });
    window.dispatchEvent(actionEvent);

    await waitFor(() => {
      expect(received.length).toBeGreaterThan(0);
    });

    // Validar que el builder fue llamado
    expect(spyBuild).toHaveBeenCalledWith('explain', fragment);
    // Validar que el prompt generado contiene el fragmento
    expect(received[0]).toMatch(/texto educativo/);

    window.removeEventListener('tutor-external-prompt', handler);
    spyBuild.mockRestore();
  });
});
