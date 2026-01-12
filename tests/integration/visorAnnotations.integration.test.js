import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VisorTextoResponsive from '../../src/VisorTexto_responsive';
import { AppContext } from '../../src/context/AppContext';

const SAMPLE_TEXT = `Párrafo 1 de prueba.

Párrafo 2 de prueba.`;

describe('VisorTexto_responsive - selección sin resaltados', () => {
  test('muestra toolbar al seleccionar y ofrece acciones (sin resaltar)', () => {
    const ctxValue = {
      textStructure: null,
      archivoActual: null,
      saveCitation: () => {},
      completeAnalysis: null,
      currentTextoId: 'test-texto-id'
    };
    const { container } = render(
      <AppContext.Provider value={ctxValue}>
        <VisorTextoResponsive texto={SAMPLE_TEXT} />
      </AppContext.Provider>
    );
    const paragraphs = container.querySelectorAll('[data-parrafo]');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);

    // Simular selección real (la toolbar se activa por mouseup + selección no colapsada dentro del visor)
    const para = paragraphs[0];
    const textNode = para.firstChild;
    const originalGetSelection = window.getSelection;
    window.getSelection = () => ({
      isCollapsed: false,
      anchorNode: textNode,
      focusNode: textNode,
      toString: () => 'Párrafo 1',
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 10, top: 10, width: 20, height: 10 })
      }),
      removeAllRanges: () => {}
    });

    fireEvent.mouseUp(para);

    // restaurar
    window.getSelection = originalGetSelection;

    // La toolbar debe estar visible con las acciones básicas, excepto "Resaltar" que ha sido eliminada
    expect(screen.getByRole('toolbar', { name: 'seleccion-herramientas' })).toBeInTheDocument();
    expect(screen.getByLabelText('explicar-seleccion')).toBeInTheDocument();
    expect(screen.getByLabelText('guardar-cita-seleccion')).toBeInTheDocument();
    expect(screen.getByLabelText('abrir-notas-seleccion')).toBeInTheDocument();
    expect(screen.getByLabelText('copiar-seleccion')).toBeInTheDocument();
    expect(screen.getByLabelText('cerrar-toolbar')).toBeInTheDocument();

    // Cerrar toolbar mantiene el foco (no asertamos foco DOM, solo ausencia/presencia de toolbar)
    fireEvent.click(screen.getByLabelText('cerrar-toolbar'));
    expect(screen.queryByRole('toolbar', { name: 'seleccion-herramientas' })).toBeNull();
  });
});
