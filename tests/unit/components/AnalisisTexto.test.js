import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalisisTexto from '../../../src/components/AnalisisTexto';
import { TextAnalysisProvider } from '../../../src/context/TextAnalysisContext';

// Mock del hook useTextAnalysis
const mockUseTextAnalysis = jest.fn();

const defaultMockHook = {
  analisis: null,
  cargando: false,
  error: null,
  analizarTexto: jest.fn(),
  cancelarAnalisis: jest.fn(),
  progreso: 0
};

// Mock del contexto y hook antes de importar el componente
jest.mock('../../../src/hooks/useTextAnalysis', () => ({
  useTextAnalysis: () => mockUseTextAnalysis()
}));

// Mock de la librería de PDF (solo si existe)
jest.mock('../../../src/utils/pdfUtils', () => ({
  generatePDF: jest.fn().mockResolvedValue('mock-pdf-data'),
  downloadPDF: jest.fn().mockResolvedValue()
}), { virtual: true });

// Mock de análisis de texto API (solo si existe)
jest.mock('../../../src/services/analisisTexto', () => ({
  analizarTextoConOpenAI: jest.fn(),
  analizarTextoConAnthropic: jest.fn(),
  analizarTextoConGemini: jest.fn()
}), { virtual: true });

// Helper para renderizar con contexto
const renderWithContext = (component, contextValue = {}) => {
  const mergedContextValue = {
    ...defaultMockHook,
    ...contextValue
  };
  
  mockUseTextAnalysis.mockReturnValue(mergedContextValue);
  
  return render(
    <TextAnalysisProvider>
      {component}
    </TextAnalysisProvider>
  );
};

describe('AnalisisTexto', () => {
  const mockProps = {
    texto: 'Este es un texto de ejemplo para analizar.',
    onClose: jest.fn(),
    apiConfig: {
      openai: { apiKey: 'test-key' },
      anthropic: { apiKey: null },
      gemini: { apiKey: null }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTextAnalysis.mockReturnValue(defaultMockHook);
  });

  describe('Renderizado inicial', () => {
    test('debe renderizar el componente correctamente', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      expect(screen.getByText(/análisis de texto/i)).toBeInTheDocument();
      expect(screen.getByText(/selecciona el proveedor de ia/i)).toBeInTheDocument();
    });

    test('debe mostrar el texto a analizar', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      expect(screen.getByDisplayValue(mockProps.texto)).toBeInTheDocument();
    });

    test('debe mostrar las opciones de API disponibles', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      expect(screen.getByRole('radio', { name: /openai/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /anthropic/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /google gemini/i })).toBeInTheDocument();
    });
  });

  describe('Selección de API', () => {
    test('debe permitir seleccionar diferentes APIs', async () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      const anthropicRadio = screen.getByRole('radio', { name: /anthropic/i });
      await userEvent.click(anthropicRadio);
      
      expect(anthropicRadio).toBeChecked();
    });

    test('debe deshabilitar APIs sin API key', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      const anthropicRadio = screen.getByRole('radio', { name: /anthropic/i });
      const geminiRadio = screen.getByRole('radio', { name: /google gemini/i });
      
      expect(anthropicRadio).toBeDisabled();
      expect(geminiRadio).toBeDisabled();
    });
  });

  describe('Proceso de análisis', () => {
    test('debe iniciar análisis al hacer click en analizar', async () => {
      const mockAnalizarTexto = jest.fn();
      
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        analizarTexto: mockAnalizarTexto
      });
      
      const analizarButton = screen.getByRole('button', { name: /analizar texto/i });
      await userEvent.click(analizarButton);
      
      expect(mockAnalizarTexto).toHaveBeenCalledWith(mockProps.texto, expect.any(Object));
    });

    test('debe mostrar estado de carga durante análisis', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        cargando: true,
        progreso: 50
      });
      
      expect(screen.getByText(/analizando/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('debe mostrar progreso del análisis', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        cargando: true,
        progreso: 75
      });
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    test('debe permitir cancelar análisis en curso', async () => {
      const mockCancelarAnalisis = jest.fn();
      
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        cargando: true,
        cancelarAnalisis: mockCancelarAnalisis
      });
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await userEvent.click(cancelButton);
      
      expect(mockCancelarAnalisis).toHaveBeenCalled();
    });
  });

  describe('Resultados del análisis', () => {
    const mockAnalisis = {
      resumen: 'Este es el resumen del análisis',
      temas: ['tema1', 'tema2', 'tema3'],
      sentimiento: 'positivo',
      complejidad: 'intermedio'
    };

    test('debe mostrar resultados después del análisis', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        analisis: mockAnalisis
      });
      
      expect(screen.getByText(/resultados del análisis/i)).toBeInTheDocument();
      expect(screen.getByText(mockAnalisis.resumen)).toBeInTheDocument();
    });

    test('debe mostrar temas identificados', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        analisis: mockAnalisis
      });
      
      mockAnalisis.temas.forEach(tema => {
        expect(screen.getByText(tema)).toBeInTheDocument();
      });
    });

    test('debe mostrar análisis de sentimiento', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        analisis: mockAnalisis
      });
      
      expect(screen.getByText(/sentimiento.*positivo/i)).toBeInTheDocument();
    });
  });

  describe('Exportación de resultados', () => {
    const mockAnalisis = {
      resumen: 'Resumen del análisis',
      temas: ['tema1', 'tema2'],
      sentimiento: 'neutral'
    };

    test('debe permitir exportar a PDF', async () => {
      const { generatePDF } = require('../../../src/utils/pdfUtils');
      
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        analisis: mockAnalisis
      });
      
      const exportButton = screen.getByRole('button', { name: /exportar pdf/i });
      await userEvent.click(exportButton);
      
      await waitFor(() => {
        expect(generatePDF).toHaveBeenCalledWith(expect.objectContaining({
          texto: mockProps.texto,
          analisis: mockAnalisis
        }));
      });
    });

    test('debe mostrar mensaje de éxito al exportar', async () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        analisis: mockAnalisis
      });
      
      const exportButton = screen.getByRole('button', { name: /exportar pdf/i });
      await userEvent.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByText(/pdf generado exitosamente/i)).toBeInTheDocument();
      });
    });
  });

  describe('Manejo de errores', () => {
    test('debe mostrar mensaje de error cuando falla el análisis', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        error: 'Error de conexión con la API'
      });
      
      expect(screen.getByText(/error de conexión con la api/i)).toBeInTheDocument();
    });

    test('debe permitir reintentar después de un error', async () => {
      const mockAnalizarTexto = jest.fn();
      
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        error: 'Error de análisis',
        analizarTexto: mockAnalizarTexto
      });
      
      const reintentarButton = screen.getByRole('button', { name: /reintentar/i });
      await userEvent.click(reintentarButton);
      
      expect(mockAnalizarTexto).toHaveBeenCalled();
    });
  });

  describe('Configuración avanzada', () => {
    test('debe permitir ajustar parámetros de análisis', async () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      const configButton = screen.getByRole('button', { name: /configuración avanzada/i });
      await userEvent.click(configButton);
      
      expect(screen.getByText(/parámetros de análisis/i)).toBeInTheDocument();
    });

    test('debe guardar configuración personalizada', async () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      const configButton = screen.getByRole('button', { name: /configuración avanzada/i });
      await userEvent.click(configButton);
      
      const temperaturaSlider = screen.getByLabelText(/temperatura/i);
      fireEvent.change(temperaturaSlider, { target: { value: '0.8' } });
      
      const guardarButton = screen.getByRole('button', { name: /guardar configuración/i });
      await userEvent.click(guardarButton);
      
      expect(screen.getByText(/configuración guardada/i)).toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    test('debe tener etiquetas ARIA apropiadas', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      const textArea = screen.getByRole('textbox', { name: /texto a analizar/i });
      const radioGroup = screen.getByRole('radiogroup', { name: /proveedor de ia/i });
      
      expect(textArea).toHaveAttribute('aria-label');
      expect(radioGroup).toHaveAttribute('aria-label');
    });

    test('debe anunciar cambios de estado para lectores de pantalla', () => {
      renderWithContext(<AnalisisTexto {...mockProps} />, {
        cargando: true
      });
      
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveTextContent(/analizando/i);
    });
  });

  describe('Integración básica', () => {
    test('debe llamar onClose cuando se cierra el diálogo', async () => {
      renderWithContext(<AnalisisTexto {...mockProps} />);
      
      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      await userEvent.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('debe limpiar estado al desmontar componente', () => {
      const mockCancelarAnalisis = jest.fn();
      
      const { unmount } = renderWithContext(<AnalisisTexto {...mockProps} />, {
        cargando: true,
        cancelarAnalisis: mockCancelarAnalisis
      });
      
      unmount();
      
      expect(mockCancelarAnalisis).toHaveBeenCalled();
    });
  });
});
