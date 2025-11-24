import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VisorTextoResponsive from '../../src/VisorTexto_responsive';

const SAMPLE_TEXT = `Párrafo 1 de prueba.

Párrafo 2 de prueba.`;

describe('VisorTexto_responsive - selección sin resaltados', () => {
  test('muestra toolbar al seleccionar y ofrece acciones (sin resaltar)', () => {
    const { container } = render(<VisorTextoResponsive texto={SAMPLE_TEXT} />);
    const paragraphs = container.querySelectorAll('[data-parrafo]');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);

    // Clic en el primer párrafo para abrir la mini-toolbar de acciones
    fireEvent.click(paragraphs[0]);
    // La toolbar debe estar visible con las acciones básicas, excepto "Resaltar" que ha sido eliminada
    expect(screen.getByRole('toolbar', { name: 'seleccion-herramientas' })).toBeInTheDocument();
    expect(screen.getByLabelText('explicar-seleccion')).toBeInTheDocument();
    expect(screen.getByLabelText('resumir-seleccion')).toBeInTheDocument();
    expect(screen.getByLabelText('preguntar-seleccion')).toBeInTheDocument();
    expect(screen.getByLabelText('abrir-notas-seleccion')).toBeInTheDocument();
    // No existe botón de resaltar
    expect(screen.queryByLabelText('resaltar-seleccion')).toBeNull();

    // Cerrar toolbar mantiene el foco (no asertamos foco DOM, solo ausencia/presencia de toolbar)
    fireEvent.click(screen.getByLabelText('cerrar-toolbar'));
    expect(screen.queryByRole('toolbar', { name: 'seleccion-herramientas' })).toBeNull();
  });
});
