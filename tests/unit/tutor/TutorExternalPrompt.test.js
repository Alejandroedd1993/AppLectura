import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import TutorDock from '../../../src/components/tutor/TutorDock';
import { AppContext } from '../../../src/context/AppContext';
import { AuthProvider } from '../../../src/context/AuthContext';
import fetchMock from 'jest-fetch-mock';

/**
 * Test: verificación de que el evento custom 'tutor-external-prompt' provoca
 * el envío de un nuevo mensaje de usuario al TutorCore.
 * Estrategia: Renderizamos TutorDock, disparamos evento y verificamos que
 * aparece el contenido como mensaje (role user simulado -> visible tal cual).
 */

describe('TutorDock - evento tutor-external-prompt', () => {
  test('debe inyectar prompt externo como mensaje del usuario', async () => {
    fetchMock.mockResponse((req) => {
      const url = String(req?.url || req || '');
      if (url.includes('/api/chat/completion')) {
        return Promise.resolve(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }));
      }
      return Promise.resolve(JSON.stringify({}));
    });

    const wrapperValue = { texto: 'Texto base para tutor', setTexto: () => {} };
    render(
      <AuthProvider>
        <AppContext.Provider value={wrapperValue}>
          <TutorDock followUps={false} />
        </AppContext.Provider>
      </AuthProvider>
    );
    const prompt = 'Explica brevemente el impacto de la IA en educación';

    const ev = new CustomEvent('tutor-external-prompt', { detail: { prompt } });
    window.dispatchEvent(ev);

    // Verificamos que el mensaje aparece (puede tardar un ciclo de render)
    const userMsg = await screen.findByText(prompt, {}, { timeout: 1500 });
    expect(userMsg).toBeInTheDocument();
  });
});
