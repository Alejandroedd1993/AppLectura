import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ConfirmModal from '../../../src/components/ConfirmModal';
import { lightTheme } from '../../../src/styles/theme';

const renderWithTheme = (ui) => render(
  <ThemeProvider theme={lightTheme}>
    {ui}
  </ThemeProvider>
);

test('renderiza título y botones y cierra con Escape y clic fuera', () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const { rerender } = renderWithTheme(
    <ConfirmModal
      open={true}
      title="Confirmar acción"
      description={<>¿Seguro?</>}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );

  expect(screen.getByRole('dialog', { name: /confirmar acción/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();

  // Escape
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onCancel).toHaveBeenCalled();

  // Re-renderear (mismo árbol) para mantener una sola instancia
  onCancel.mockReset();
  rerender(
    <ThemeProvider theme={lightTheme}>
      <ConfirmModal
        open={true}
        title="Confirmar acción"
        description={<>¿Seguro?</>}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </ThemeProvider>
  );

  // click fuera (overlay) - usar parent del dialog para evitar ambigüedad
  const dialog = screen.getByRole('dialog', { name: /confirmar acción/i });
  const overlay = dialog.parentElement;
  fireEvent.mouseDown(overlay);
  expect(onCancel).toHaveBeenCalled();
});

