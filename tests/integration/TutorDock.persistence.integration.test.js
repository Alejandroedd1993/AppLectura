import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TutorDock from '../../src/components/tutor/TutorDock';
import { AppContext } from '../../src/context/AppContext';

// Utilidad para limpiar localStorage por prefijo
function clearByPrefix(prefix) {
  if (!window.localStorage) return;
  const keys = Object.keys(localStorage);
  for (const k of keys) if (k.startsWith(prefix)) localStorage.removeItem(k);
}

function Wrapper({ children, texto }) {
  const value = { texto, setTexto: () => {} };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
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

    // Escribir y enviar
    const input = screen.getByPlaceholderText(/haz una pregunta/i);
    fireEvent.change(input, { target: { value: '¿Cuál es la idea principal?' } });
    fireEvent.submit(input.closest('form'));

    // Esperar a que aparezca el mensaje del usuario en la UI
    await screen.findByText('¿Cuál es la idea principal?');

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

    await screen.findByText('¿Cuál es la idea principal?');

    // Además, al volver a renderizar con TEXTO_A debería intentar leer la misma clave
    const getCalls = localStorage.getItem.mock.calls.map(args => args[0]);
    expect(getCalls.filter(k => k === keyA).length).toBeGreaterThan(0);
  });
});
