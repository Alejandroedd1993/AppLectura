import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../../../src/components/common/ConfirmModal';
import { lightTheme } from '../../../src/styles/theme';

test('renderiza título y botones y cierra con Escape y clic fuera', () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const { rerender } = render(
    <ConfirmModal
      open={true}
      title="Confirmar acción"
      message="¿Seguro?"
      onCancel={onCancel}
      onConfirm={onConfirm}
      theme={lightTheme}
    />
  );

  expect(screen.getByRole('dialog', { name: /confirmar acción/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();

  // Escape
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onCancel).toHaveBeenCalled();

  // Re-render para test de clic fuera
  onCancel.mockReset();
  rerender(
    <ConfirmModal
      open={true}
      title="Confirmar acción"
      message="¿Seguro?"
      onCancel={onCancel}
      onConfirm={onConfirm}
      theme={lightTheme}
    />
  );

  // Click en overlay (fuera del dialog) cierra
  const dialog = screen.getByRole('dialog', { name: /confirmar acción/i });
  fireEvent.click(dialog);
  expect(onCancel).toHaveBeenCalled();
});

test('no renderiza nada cuando open es false', () => {
  render(
    <ConfirmModal
      open={false}
      title="Oculto"
      message="No debería verse"
      onCancel={() => { }}
      onConfirm={() => { }}
      theme={lightTheme}
    />
  );

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
