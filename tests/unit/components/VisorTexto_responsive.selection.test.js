/**
 * Tests de interacción para VisorTexto_responsive: mini-cinta y búsqueda
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock de servicios pesados
jest.mock('../../../src/services/segmentTextService', () => ({
  getSegmentedCached: (texto) => {
    const norm = (texto || '').replace(/\r\n?/g, '\n');
    const parts = norm.split(/\n\n+/).map(t => ({ content: t.trim() })).filter(Boolean);
    return parts.length ? parts : [{ content: texto }];
  }
}));

jest.mock('../../../src/utils/textAnalysisMetrics', () => ({
  estimarTiempoLectura: () => 1
}));

import Visor from '../../../src/VisorTexto_responsive';

function selectText(node, start = 0, end = 5) {
  const range = document.createRange();
  const tn = node.firstChild || node; // texto dentro del párrafo
  range.setStart(tn, start);
  range.setEnd(tn, Math.min(end, (tn.textContent || '').length));
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  return range;
}

describe('VisorTexto_responsive - mini-cinta y búsqueda', () => {
  beforeAll(() => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
    });
  });

  test('muestra mini-cinta en mouseup tras selección y emite reader-action', () => {
    const texto = 'Párrafo 1: Hola mundo.\n\nPárrafo 2: Adiós mundo.';
    const events = [];
    function onReaderAction(e) { events.push(e.detail); }
    window.addEventListener('reader-action', onReaderAction);

    render(<Visor texto={texto} />);

    const p1 = screen.getByText(/Párrafo 1:/);
    // Seleccionar parte del párrafo y disparar mouseup
    selectText(p1);
    fireEvent.mouseUp(document);

    // Aparece la mini-cinta
    const toolbar = screen.getByRole('toolbar', { name: 'seleccion-herramientas' });
    expect(toolbar).toBeInTheDocument();

    // Click en Explicar -> debe emitir reader-action
    const btnExplicar = screen.getByRole('button', { name: 'explicar-seleccion' });
    fireEvent.click(btnExplicar);
    expect(events.some(e => e.action === 'explain')).toBe(true);

    window.removeEventListener('reader-action', onReaderAction);
  });

  test('abre mini-cinta con clic derecho (contextmenu)', () => {
    const texto = 'Párrafo 1: Contexto.\n\nPárrafo 2: Segundo.';
    render(<Visor texto={texto} />);

    const p1 = screen.getByText(/Párrafo 1:/);
    selectText(p1);
    fireEvent.contextMenu(p1, { clientX: 10, clientY: 10 });

    const toolbar = screen.getByRole('toolbar', { name: 'seleccion-herramientas' });
    expect(toolbar).toBeInTheDocument();
  });

  test('copiar muestra toast y Notas emite evento', async () => {
    const texto = 'Párrafo 1: Copiar.\n\nPárrafo 2: Notas.';
    const events = [];
    function onReaderAction(e) { events.push(e.detail); }
    window.addEventListener('reader-action', onReaderAction);

    render(<Visor texto={texto} />);

    const p2 = screen.getByText(/Párrafo 2:/);
    selectText(p2);
    fireEvent.mouseUp(document);

    const btnCopiar = screen.getByRole('button', { name: 'copiar-seleccion' });
    fireEvent.click(btnCopiar);

    // Toast de copiado
    expect(await screen.findByText('✅ Copiado')).toBeInTheDocument();

    // Volver a seleccionar para mostrar la cinta y pulsar Notas
    selectText(p2);
    fireEvent.mouseUp(document);
    const btnNotas = screen.getByRole('button', { name: 'abrir-notas-seleccion' });
    fireEvent.click(btnNotas);

    expect(events.some(e => e.action === 'notes')).toBe(true);

    window.removeEventListener('reader-action', onReaderAction);
  });

  test('búsqueda resalta y navega coincidencias', () => {
    const texto = 'Uno dos tres.\n\nDos tres cuatro.\n\nTres cuatro cinco.';
    render(<Visor texto={texto} />);

    const input = screen.getByRole('searchbox', { name: 'buscar-texto' });
    fireEvent.change(input, { target: { value: 'tres' } });

    // Debe haber marks
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);

    // Navegación
    const next = screen.getByRole('button', { name: 'siguiente-coincidencia' });
    const prev = screen.getByRole('button', { name: 'anterior-coincidencia' });
    expect(next).not.toBeDisabled();
    expect(prev).not.toBeDisabled();

    fireEvent.click(next);
    fireEvent.click(prev);
  });
});
