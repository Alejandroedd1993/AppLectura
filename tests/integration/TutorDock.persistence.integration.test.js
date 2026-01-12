import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TutorDock from '../../src/components/tutor/TutorDock';
import { AppContext } from '../../src/context/AppContext';
import { AuthProvider } from '../../src/context/AuthContext';
import fetchMock from 'jest-fetch-mock';

// Utilidad para limpiar localStorage por prefijo
function clearByPrefix(prefix) {
  if (!window.localStorage) return;
  const keys = Object.keys(localStorage);
  for (const k of keys) if (k.startsWith(prefix)) localStorage.removeItem(k);
}

function Wrapper({ children, texto }) {
  const value = { texto, setTexto: () => {} };
  return (
    <AuthProvider>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </AuthProvider>
  );
}

/**
 * Objetivo: Validar que TutorDock
 * - usa la clave por texto tutorHistorial:<hash>
 * - rehidrata mensajes si volvemos al mismo texto
 * - limpia historial al cambiar a un texto distinto
 */

describe('TutorDock persistencia por texto', () => {
  beforeEach(() => {
    clearByPrefix('tutorHistorial:');
    // Asegurar visible por defecto (open=true)
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'setItem');

    fetchMock.mockResponse((req) => {
      const url = String(req?.url || req || '');
      if (url.includes('/api/chat/completion')) {
        return Promise.resolve(JSON.stringify({
          choices: [{ message: { content: 'OK' } }]
        }));
      }
      return Promise.resolve(JSON.stringify({}));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rehidrata y limpia correctamente al cambiar texto', async () => {
    const TEXTO_A = 'Texto A de prueba con contenido suficiente para hash.';
    const TEXTO_B = 'Texto B distinto para validar limpieza.';

    // 1) Render con TEXTO_A y enviar un prompt para crear historial
    const { rerender } = render(
      <Wrapper texto={TEXTO_A}>
        <TutorDock followUps={false} />
      </Wrapper>
    );

    // Esperar a que el efecto de rehidratación/clear por textHash haya corrido
    await screen.findByText(/Selecciona texto y usa la toolbar/i);

    // Escribir y enviar
    const input = screen.getByPlaceholderText(/haz una pregunta/i);
    fireEvent.change(input, { target: { value: '¿Cuál es la idea principal?' } });
    fireEvent.submit(input.closest('form'));

    // Verificar persistencia (más estable que depender del render inmediato)
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalled();
    });
    const setPairs = localStorage.setItem.mock.calls
      .filter(args => typeof args?.[0] === 'string' && /^tutorHistorial:/.test(args[0]));
    expect(setPairs.length).toBeGreaterThan(0);
    const lastPayload = setPairs[setPairs.length - 1][1];
    const parsed = JSON.parse(lastPayload);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some(m => (m?.r === 'user' || m?.role === 'user') && String(m?.c || m?.content || '').includes('¿Cuál es la idea principal?'))).toBe(true);

    // Forzar persistencia vía onMessagesChange (useTutorPersistence compacta en {r,c})
    // setItem llamado con clave tutorHistorial:<hash>
    const setCalls = localStorage.setItem.mock.calls.map(args => args[0]);
    const keyA = setCalls.find(k => /^tutorHistorial:/.test(k));
    expect(keyA).toBeTruthy();

    // 2) Cambiar a TEXTO_B => debe limpiar historial (no debe mostrarse el mensaje previo)
    rerender(
      <Wrapper texto={TEXTO_B}>
        <TutorDock followUps={false} />
      </Wrapper>
    );

    // El mensaje del usuario previo no debería estar en la UI
    await waitFor(() => {
      expect(screen.queryByText('¿Cuál es la idea principal?')).toBeNull();
    });

    // 3) Volver a TEXTO_A => debe rehidratar historial y reaparecer el mensaje previo
    rerender(
      <Wrapper texto={TEXTO_A}>
        <TutorDock followUps={false} />
      </Wrapper>
    );

    // Debe intentar leer y rehidratar desde la misma clave
    await waitFor(() => {
      expect(localStorage.getItem.mock.calls.map(args => args[0]).includes(keyA)).toBe(true);
    });

    // Y el payload persistido debe seguir conteniendo el mensaje del usuario
    const rawA = localStorage.getItem(keyA);
    const parsedA = JSON.parse(rawA);
    expect(Array.isArray(parsedA)).toBe(true);
    expect(parsedA.some(m => (m?.r === 'user' || m?.role === 'user') && String(m?.c || m?.content || '').includes('¿Cuál es la idea principal?'))).toBe(true);

    // Además, al volver a renderizar con TEXTO_A debería intentar leer la misma clave
    const getCalls = localStorage.getItem.mock.calls.map(args => args[0]);
    expect(getCalls.filter(k => k === keyA).length).toBeGreaterThan(0);
  });
});
