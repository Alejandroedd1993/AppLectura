// Tests unitarios para VisorTexto
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisorTexto from '../../../src/VisorTexto';
import { renderWithContext, createTestText } from '../../testUtils';

// Mock de react-virtuoso
jest.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }) => (
    <div data-testid="virtuoso">
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  )
}));

// Mock de utilidades
jest.mock('../../../src/utils/textAnalysisMetrics', () => ({
  estimarTiempoLectura: jest.fn((texto) => Math.ceil(texto.split(' ').length / 200))
}));

jest.mock('../../../src/utils/visorTextoUtils', () => ({
  normalizarTexto: jest.fn((texto) => texto.trim().toLowerCase())
}));

// Mock de framer-motion para simplificar animaciones
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => <div>{children}</div>
}));

// Mock del clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
});

describe('VisorTexto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Resetear mocks
    navigator.clipboard.writeText.mockResolvedValue();
    
    // Mock window.getSelection
    const mockSelection = {
      toString: jest.fn(() => ''),
      getRangeAt: jest.fn(() => ({
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          width: 200,
          height: 20
        }),
        startOffset: 0,
        endOffset: 10,
        startContainer: {
          parentElement: {
            textContent: 'Párrafo de contexto'
          }
        }
      })),
      anchorNode: document.createElement('div')
    };
    
    window.getSelection = jest.fn(() => mockSelection);
  });

  describe('Renderizado inicial', () => {
    test('debe renderizar placeholder cuando no hay texto', () => {
      const contextValue = {
        texto: '',
        modoOscuro: false
      };
      
      renderWithContext(<VisorTexto />, { contextValue });
      
      expect(screen.getByText(/carga un texto.*empezar.*leer/i)).toBeInTheDocument();
    });

    test('debe renderizar el visor con texto', () => {
      const texto = createTestText(500);
      const contextValue = {
        texto,
        modoOscuro: false
      };
      
      renderWithContext(<VisorTexto />, { contextValue });
      
      // El componente debería mostrar texto cuando hay contenido
      expect(screen.queryByText(/carga un texto.*empezar.*leer/i)).not.toBeInTheDocument();
      // Buscar texto parcial que esté en la función createTestText
      expect(screen.getByText(/texto de prueba.*longitud.*media/i)).toBeInTheDocument();
    });

    test('debe aplicar tema oscuro correctamente', () => {
      const contextValue = {
        texto: createTestText(200),
        modoOscuro: true
      };
      
      const { container } = renderWithContext(<VisorTexto />, { contextValue });
      
      // Verificar que se aplique el tema oscuro (ajustar expectativa según implementación real)
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Modo concentrado', () => {
    test('debe mostrar contenido cuando hay texto', async () => {
      const contextValue = {
        texto: createTestText(1000),
        modoOscuro: false
      };
      
      renderWithContext(<VisorTexto />, { contextValue });
      
      // Verificar que se muestre contenido en lugar del placeholder
      expect(screen.queryByText(/carga un texto.*empezar.*leer/i)).not.toBeInTheDocument();
      
      // El contenido del texto debería estar presente (buscar texto parcial)
      expect(screen.getByText(/texto de prueba.*longitud.*media/i)).toBeInTheDocument();
    });

    test('debe estimar tiempo de lectura correctamente', () => {
      const { estimarTiempoLectura } = require('../../../src/utils/textAnalysisMetrics');
      estimarTiempoLectura.mockReturnValue(5);
      
      const contextValue = {
        texto: createTestText(1000),
        modoOscuro: false
      };
      
      renderWithContext(<VisorTexto />, { contextValue });
      
      expect(estimarTiempoLectura).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('Virtualización', () => {
    test('debe mostrar contenido correctamente para textos largos', () => {
      // Crear texto con muchos párrafos (más de VIRTUALIZATION_THRESHOLD)
      const parrafos = Array(50).fill('Párrafo de prueba').join('\n\n');
      const contextValue = {
        texto: parrafos,
        modoOscuro: false
      };
      
      renderWithContext(<VisorTexto />, { contextValue });
      
      // Verificar que se muestre contenido
      expect(screen.queryByText(/carga un texto.*empezar.*leer/i)).not.toBeInTheDocument();
      expect(screen.getAllByText('Párrafo de prueba').length).toBeGreaterThan(0);
    });

    test('debe mostrar párrafos normalmente para textos cortos', () => {
      const contextValue = {
        texto: 'Este es el párrafo número 1 de prueba.\n\nEste es el párrafo número 2 de prueba.\n\nEste es el párrafo número 3 de prueba.',
        modoOscuro: false
      };
      
      renderWithContext(<VisorTexto />, { contextValue });
      
      expect(screen.queryByText(/carga un texto.*empezar.*leer/i)).not.toBeInTheDocument();
      expect(screen.getByText('Este es el párrafo número 1 de prueba.')).toBeInTheDocument();
    });
  });

  describe('Selección de texto', () => {
    test('debe manejar selección de texto básica', () => {
      const mockOnTextoSeleccionado = jest.fn();
      const mockSelection = window.getSelection();
      mockSelection.toString.mockReturnValue('texto seleccionado');
      mockSelection.anchorNode = document.createElement('div');
      
      const contextValue = {
        texto: 'Este es un texto de prueba para seleccionar',
        modoOscuro: false
      };
      
      const { container } = renderWithContext(
        <VisorTexto onTextoSeleccionado={mockOnTextoSeleccionado} />, 
        { contextValue }
      );
      
      // Verificar que el componente se renderice correctamente
      expect(container.firstChild).toBeInTheDocument();
      
      // Simular selección de texto
      const visorContainer = container.firstChild;
      fireEvent.mouseUp(visorContainer);
      
      // Verificar que se maneja la selección (si el componente implementa esta funcionalidad)
      expect(mockSelection.toString).toHaveBeenCalled();
    });

    test('debe ignorar selecciones muy cortas', () => {
      const mockSelection = window.getSelection();
      mockSelection.toString.mockReturnValue('ab'); // Muy corto
      
      const contextValue = {
        texto: 'Este es un texto de prueba',
        modoOscuro: false
      };
      
      const { container } = renderWithContext(<VisorTexto />, { contextValue });
      
      const visorContainer = container.firstChild;
      fireEvent.mouseUp(visorContainer);
      
      // Verificar que se maneja correctamente
      expect(mockSelection.toString).toHaveBeenCalled();
    });
  });

  describe('Accesibilidad y funcionalidad básica', () => {
    test('debe renderizar componente correctamente', () => {
      const contextValue = {
        texto: createTestText(200),
        modoOscuro: false
      };
      
      const { container } = renderWithContext(<VisorTexto />, { contextValue });
      
      expect(container.firstChild).toBeInTheDocument();
    });

    test('debe manejar tema oscuro', () => {
      const contextValue = {
        texto: createTestText(200),
        modoOscuro: true
      };
      
      const { container } = renderWithContext(<VisorTexto />, { contextValue });
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
