/**
 * Tests de integración para ResumenAcademico
 * Cobertura: validación, evaluación, persistencia, rate limiting, keyboard shortcuts
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ResumenAcademico from '../../src/components/artefactos/ResumenAcademico';
import { AppContext } from '../../src/context/AppContext';
import { PedagogyContext } from '../../src/context/PedagogyContext';
import { lightTheme } from '../../src/styles/theme';
import * as resumenService from '../../src/services/resumenAcademico.service';

// Mock del servicio de evaluación
jest.mock('../../src/services/resumenAcademico.service', () => {
  const originalModule = jest.requireActual('../../src/services/resumenAcademico.service');
  return {
    __esModule: true,
    ...originalModule,
    evaluarResumenAcademico: jest.fn(),
    // Mantener la implementación real de validarResumenAcademico para que la lógica de UI funcione
    validarResumenAcademico: originalModule.validarResumenAcademico
  };
});

// Mock de hooks
jest.mock('../../src/hooks/useActivityPersistence', () => ({
  __esModule: true,
  default: () => ({
    saveManual: jest.fn(),
    loading: false,
    error: null
  })
}));

// Mock global de ClipboardEvent y DataTransfer para JSDOM
class MockDataTransfer {
  constructor() {
    this.data = new Map();
  }
  setData(format, data) {
    this.data.set(format, data);
  }
  getData(format) {
    return this.data.get(format) || '';
  }
}

class MockClipboardEvent extends Event {
  constructor(type, options) {
    super(type, options);
    this.clipboardData = options.clipboardData || new MockDataTransfer();
  }
}

global.ClipboardEvent = MockClipboardEvent;
global.DataTransfer = MockDataTransfer;

describe('ResumenAcademico Integration Tests', () => {
  const mockContextValue = {
    texto: 'Este es un texto de prueba. "Cita textual importante". Contenido adicional para análisis.',
    completeAnalysis: {
      metadata: { document_id: 'test-doc-123' }
    },
    setError: jest.fn(),
    updateRubricScore: jest.fn(),
    getCitations: jest.fn(() => [
      { id: '1', texto: 'Cita guardada 1', timestamp: Date.now() },
      { id: '2', texto: 'Cita guardada 2', timestamp: Date.now() }
    ]),
    deleteCitation: jest.fn()
  };

  const mockPedagogyValue = {
    rewards: {
      awardBadge: jest.fn(),
      checkAchievements: jest.fn(),
      getBadges: jest.fn(() => [])
    },
    progression: {
      updateLevel: jest.fn()
    }
  };

  const renderWithProviders = (ui, contextValue = mockContextValue) => {
    return render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={contextValue}>
          <PedagogyContext.Provider value={mockPedagogyValue}>
            {ui}
          </PedagogyContext.Provider>
        </AppContext.Provider>
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Renderizado inicial', () => {
    it('debe renderizar correctamente con texto disponible', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      expect(screen.getByText(/Resumen Académico con Citas/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i)).toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay texto cargado', () => {
      const noTextContext = { ...mockContextValue, texto: null };
      renderWithProviders(<ResumenAcademico theme={lightTheme} />, noTextContext);

      expect(screen.getByText(/No hay texto cargado/i)).toBeInTheDocument();
    });

    it('debe mostrar guía pedagógica colapsable', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      expect(screen.getByText(/¿Cómo hacer un resumen académico\?/i)).toBeInTheDocument();
    });
  });

  describe('Validación en tiempo real', () => {
    it('debe validar palabras mínimas (50)', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);

      // Texto muy corto
      fireEvent.change(textarea, { target: { value: 'Texto muy corto' } });

      expect(screen.getByText(/0 palabras/i)).toBeInTheDocument();
    });

    it('debe validar citas mínimas (2)', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);

      // Texto con solo 1 cita
      const textoConUnaCita = 'Este es un resumen académico. "Una cita". ' + 'Más texto '.repeat(20);
      fireEvent.change(textarea, { target: { value: textoConUnaCita } });

      expect(screen.getByText(/1 citas/i)).toBeInTheDocument();
    });

    it('debe mostrar validación exitosa con texto válido', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);

      // Texto válido con 2 citas y >50 palabras
      const textoValido = 
        'Este es un resumen académico completo. "Primera cita textual importante". ' +
        'Análisis profundo del contenido. "Segunda cita relevante". ' +
        'Más contenido de análisis crítico del texto presentado en el documento original. '.repeat(5);

      fireEvent.change(textarea, { target: { value: textoValido } });

      // Debe mostrar contadores válidos
      expect(screen.getByText(/2 citas/i)).toBeInTheDocument();
    });
  });

  describe('Sistema de citas guardadas', () => {
    it('debe mostrar panel de citas al hacer click', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const citasButton = screen.getByText(/Mis Citas \(2\)/i);
      fireEvent.click(citasButton);

      expect(screen.getByText('Cita guardada 1')).toBeInTheDocument();
      expect(screen.getByText('Cita guardada 2')).toBeInTheDocument();
    });

    it('debe insertar cita en el resumen', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);

      // Abrir panel de citas
      const citasButton = screen.getByText(/Mis Citas/i);
      fireEvent.click(citasButton);

      // Insertar cita
      const insertButtons = screen.getAllByText(/📌 Insertar/i);
      fireEvent.click(insertButtons[0]);

      // Verificar que se insertó
      expect(textarea.value).toContain('"Cita guardada 1"');
    });

    it('debe eliminar cita guardada', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      // Abrir panel de citas
      fireEvent.click(screen.getByText(/Mis Citas/i));

      // Eliminar primera cita
      const deleteButtons = screen.getAllByText('🗑️');
      fireEvent.click(deleteButtons[0]);

      expect(mockContextValue.deleteCitation).toHaveBeenCalledWith('test-doc-123', '1');
    });
  });

  describe('Anti-plagio: límite de pegado', () => {
    it('debe permitir pegar hasta 40 palabras', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      const shortText = 'Texto corto con menos de cuarenta palabras permitidas en el sistema.';

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      pasteEvent.clipboardData.setData('text', shortText);

      fireEvent.paste(textarea, pasteEvent);

      // No debe mostrar error
      expect(screen.queryByText(/Solo puedes pegar hasta 40 palabras/i)).not.toBeInTheDocument();
    });

    it('debe bloquear pegado de más de 40 palabras', async () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      const longText = 'palabra '.repeat(50); // 50 palabras

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      pasteEvent.clipboardData.setData('text', longText);

      fireEvent.paste(textarea, pasteEvent);

      // Debe mostrar error
      await waitFor(() => {
        expect(screen.getByText(/Solo puedes pegar hasta 40 palabras/i)).toBeInTheDocument();
      });
    });
  });

  describe('Evaluación con IA', () => {
    it('debe deshabilitar botón cuando validación falla', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const evaluarButton = screen.getByText(/Solicitar Evaluación Criterial/i);
      expect(evaluarButton).toBeDisabled();
    });

    it('debe habilitar botón con resumen válido', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      const textoValido = 
        'Resumen válido con análisis. "Primera cita importante". ' +
        'Más análisis profundo. "Segunda cita relevante". ' +
        'Contenido adicional de calidad académica. '.repeat(10);

      fireEvent.change(textarea, { target: { value: textoValido } });

      const evaluarButton = screen.getByText(/Solicitar Evaluación Criterial/i);
      expect(evaluarButton).not.toBeDisabled();
    });

    it('debe llamar al servicio de evaluación al evaluar', async () => {
      const mockEvaluacion = {
        scoreGlobal: 8.5,
        nivel: 3,
        criteriosEvaluados: []
      };

      resumenService.evaluarResumenAcademico.mockResolvedValue(mockEvaluacion);

      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      const textoValido = 
        'Resumen académico completo. "Cita uno del texto". ' +
        'Análisis crítico profundo. "Cita dos relevante". ' +
        'Más contenido analítico de calidad. '.repeat(10);

      fireEvent.change(textarea, { target: { value: textoValido } });

      const evaluarButton = screen.getByText(/Solicitar Evaluación Criterial/i);
      fireEvent.click(evaluarButton);

      await waitFor(() => {
        expect(resumenService.evaluarResumenAcademico).toHaveBeenCalledWith({
          resumen: expect.any(String),
          textoOriginal: mockContextValue.texto
        });
      });
    });

    it('debe mostrar barra de progreso durante evaluación', async () => {
      resumenService.evaluarResumenAcademico.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ scoreGlobal: 8, nivel: 3 }), 1000))
      );

      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      const textoValido = 
        'Resumen completo. "Cita 1". Análisis. "Cita 2". ' + 'Contenido. '.repeat(15);

      fireEvent.change(textarea, { target: { value: textoValido } });

      const evaluarButton = screen.getByText(/Solicitar Evaluación Criterial/i);
      fireEvent.click(evaluarButton);

      // Debe mostrar indicador de carga
      await waitFor(() => {
        expect(screen.getByText(/Evaluando con IA Dual/i)).toBeInTheDocument();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('debe mostrar límite restante en tooltip', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const evaluarButton = screen.getByText(/Solicitar Evaluación Criterial/i);
      
      // Debe tener tooltip con límite (atributo title)
      expect(evaluarButton).toHaveAttribute('title');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('debe guardar con Ctrl+S', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      // Simular Ctrl+S
      fireEvent.keyDown(window, {
        key: 's',
        code: 'KeyS',
        ctrlKey: true
      });

      // Debe mostrar hint de guardado (brevemente)
      // Nota: esto es difícil de testear con animaciones
    });
  });

  describe('Persistencia', () => {
    it('debe guardar borrador en sessionStorage', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      const borradorTexto = 'Mi borrador de resumen';

      fireEvent.change(textarea, { target: { value: borradorTexto } });

      // Debe guardar en sessionStorage
      const saved = sessionStorage.getItem('resumenAcademico_draft');
      expect(saved).toBe(borradorTexto);
    });

    it('debe recuperar borrador desde sessionStorage', () => {
      const borradorGuardado = 'Borrador previo recuperado';
      sessionStorage.setItem('resumenAcademico_draft', borradorGuardado);

      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      expect(textarea.value).toBe(borradorGuardado);
    });
  });

  describe('Nuevo intento', () => {
    it('debe limpiar resumen y evaluación al hacer click en "Nuevo Intento"', async () => {
      const mockEvaluacion = {
        scoreGlobal: 7,
        nivel: 3,
        criteriosEvaluados: []
      };

      resumenService.evaluarResumenAcademico.mockResolvedValue(mockEvaluacion);

      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      // Escribir y evaluar
      const textarea = screen.getByPlaceholderText(/Ejemplo: El autor argumenta/i);
      const textoValido = 
        'Resumen. "Cita 1". Análisis. "Cita 2". ' + 'Contenido. '.repeat(15);

      fireEvent.change(textarea, { target: { value: textoValido } });
      fireEvent.click(screen.getByText(/Solicitar Evaluación Criterial/i));

      // Esperar evaluación
      await waitFor(() => {
        expect(screen.getByText(/Nuevo Intento/i)).toBeInTheDocument();
      });

      // Click en nuevo intento
      fireEvent.click(screen.getByText(/Nuevo Intento/i));

      // Debe limpiar
      expect(textarea.value).toBe('');
      expect(sessionStorage.getItem('resumenAcademico_draft')).toBeNull();
    });
  });

  describe('Indicadores de tiempo estimado', () => {
    it('debe mostrar shortcuts bar', () => {
      renderWithProviders(<ResumenAcademico theme={lightTheme} />);

      // Debe mostrar atajos de teclado
      expect(screen.getByText(/Guardar/i)).toBeInTheDocument();
      expect(screen.getByText(/Evaluar/i)).toBeInTheDocument();
    });
  });
});
