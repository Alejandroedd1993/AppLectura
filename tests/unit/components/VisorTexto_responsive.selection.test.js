/**
 * Tests de interacción para VisorTexto_responsive: mini-cinta y búsqueda
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock básico de IntersectionObserver para jsdom
class MockIntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

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
import { AppContext } from '../../../src/context/AppContext';

// Mock de AppContext para el Visor
const mockContextValue = {
  textStructure: [],
  archivoActual: { nombre: 'test.txt' },
  saveCitation: jest.fn(),
  completeAnalysis: null
};

const renderWithAppContext = (component) => {
  return render(
    <AppContext.Provider value={mockContextValue}>
      {component}
    </AppContext.Provider>
  );
};

describe('VisorTexto_responsive - mini-cinta y búsqueda', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
    });
  });

  test('renderiza el componente sin errores', () => {
    const texto = 'Párrafo 1: Test.\n\nPárrafo 2: Prueba.';
    renderWithAppContext(<Visor texto={texto} />);
    expect(screen.getByText(/Párrafo 1:/)).toBeInTheDocument();
  });

  test('muestra búsqueda y navegación', () => {
    const texto = 'Uno dos tres.\n\nDos tres cuatro.';
    renderWithAppContext(<Visor texto={texto} />);

    const input = screen.getByRole('searchbox', { name: 'buscar-texto' });
    expect(input).toBeInTheDocument();
  });
});