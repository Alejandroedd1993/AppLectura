import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import ReadingWorkspace from '../../src/components/ReadingWorkspace';
import { AppContext } from '../../src/context/AppContext';
import { AuthProvider } from '../../src/context/AuthContext';

// Mock mínimo del servicio de búsqueda web reutilizado por el botón
jest.mock('../../src/hooks/useWebSearchTutor', () => {
  return () => ({
    search: async () => ([
      { title: 'Resultado 1', url: 'https://r1', snippet: 'S1' }
    ]),
    loading: false,
    error: null
  });
});

jest.mock('../../src/hooks/useWebSearchAvailability', () => {
  return () => true;
});

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
  test('flujo básico: crear nota, enviar prompt y enriquecer', async () => {
    render(<ReadingWorkspace />, { wrapper: Wrapper });

    // Abrir panel de notas y crear una
    fireEvent.click(screen.getByLabelText(/abrir-notas/i));
    const textarea = await screen.findByPlaceholderText(/Escribe una nota/i);
    fireEvent.change(textarea, { target: { value: 'Primera nota pedagógica' } });
    const saveButtons = screen.getAllByText(/Guardar/i);
    // El botón de guardar nota suele ser el último o estar dentro del formulario de notas
    // Buscamos el que está dentro del formulario de notas
    const noteSaveButton = saveButtons.find(btn => btn.closest('form'));
    fireEvent.click(noteSaveButton);
    expect(await screen.findByText(/Primera nota pedagógica/)).toBeInTheDocument();

    // Escribir prompt base y enviarlo
    const input = screen.getByPlaceholderText(/Pregunta algo sobre el texto/i);
    fireEvent.change(input, { target: { value: 'Resume el texto' } });
    const enviarButtons = screen.getAllByText(/^Enviar$/);
    // Primer botón pertenece al TutorDock interno; segundo al PromptBar del Workspace
    fireEvent.click(enviarButtons[1]);
    // Enriquecer (usar boton web) con prompt no vacio
    fireEvent.change(input, { target: { value: 'Impacto IA' } });
    const btnWeb = screen.getByTestId('btn-con-web');
    expect(btnWeb).toBeEnabled();
    fireEvent.click(btnWeb);

    await waitFor(() => {
      // El boton permanece disponible mientras haya prompt y disponibilidad web.
      expect(btnWeb).toBeEnabled();
    });
  });
});

