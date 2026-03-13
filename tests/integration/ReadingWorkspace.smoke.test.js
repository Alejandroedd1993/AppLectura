import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import ReadingWorkspace from '../../src/components/ReadingWorkspace';
import { AppContext } from '../../src/context/AppContext';
import { AuthProvider } from '../../src/context/AuthContext';

function Wrapper({ children }) {
  const value = {
    texto: 'Texto de prueba para workspace.\nSegundo párrafo educativo.',
    setTexto: () => {}
  };
  return (
    <AuthProvider>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </AuthProvider>
  );
}

describe('ReadingWorkspace smoke', () => {
  // Nota de mantenimiento:
  // ReadingWorkspace ya no expone botones legacy como "abrir-notas"
  // ni una prompt-bar propia en la top bar. El flujo vigente es:
  // - Notas vía evento reader-action { action: 'notes' }
  // - Prompt libre vía TutorDock (input "Haz una pregunta...")
  // Si cambia la UX de acciones del lector, actualizar este smoke test.
  test('flujo básico: crear nota y enviar prompt en tutor', async () => {
    render(<ReadingWorkspace />, { wrapper: Wrapper });

    // Crear nota vía evento del lector (flujo real actual)
    window.dispatchEvent(new CustomEvent('reader-action', {
      detail: {
        action: 'notes',
        text: 'Primera nota pedagógica'
      }
    }));

    // Se abre panel y la nota aparece listada
    expect(await screen.findByText(/📝 Notas/i)).toBeInTheDocument();
    expect(await screen.findByText(/Primera nota pedagógica/)).toBeInTheDocument();

    // Escribir prompt base y enviarlo en el tutor dock
    const input = screen.getByPlaceholderText(/Haz una pregunta/i);
    fireEvent.change(input, { target: { value: 'Resume el texto' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Resume el texto/i)).toBeInTheDocument();
    });
  });
});

