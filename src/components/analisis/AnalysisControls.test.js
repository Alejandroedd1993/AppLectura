import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalysisControls from './AnalysisControls';
import { lightTheme } from '../../styles/theme';

// Mock de las funciones que se pasan como props
const mockOnApiChange = jest.fn();
const mockOnBackendToggle = jest.fn();
const mockOnAnalizar = jest.fn();

const defaultProps = {
  apiSeleccionada: 'openai',
  onApiChange: mockOnApiChange,
  usarBackend: true,
  onBackendToggle: mockOnBackendToggle,
  onAnalizar: mockOnAnalizar,
  puedeAnalizar: true,
  cargando: false,
  progressPercent: 0,
  theme: lightTheme,
  onConfiguracion: jest.fn(),
  tieneConfiguracion: {
    openai: true,
    gemini: false
  }
};

describe('AnalysisControls', () => {
  // Limpiar los mocks después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza todos los controles correctamente', () => {
    render(<AnalysisControls {...defaultProps} />);
    
    // Verifica que el indicador de análisis dual esté presente
    expect(screen.getByText(/Análisis Inteligente Dual/i)).toBeInTheDocument();
    
    // Verifica que el botón de analizar esté presente y habilitado
    const analyzeButton = screen.getByRole('button', { name: /🚀 Analizar Texto/i });
    expect(analyzeButton).toBeInTheDocument();
    expect(analyzeButton).not.toBeDisabled();
  });

  test('deshabilita los controles cuando está cargando', () => {
    render(<AnalysisControls {...defaultProps} cargando={true} puedeAnalizar={false} />);
    
    // El botón de analizar debe estar deshabilitado y mostrar el texto de carga
    const analyzeButton = screen.getByRole('button', { name: /🔄 Analizando.../i });
    expect(analyzeButton).toBeDisabled();
  });

  test('llama a la función onAnalizar cuando se hace clic en el botón', () => {
    render(<AnalysisControls {...defaultProps} />);
    
    const analyzeButton = screen.getByRole('button', { name: /🚀 Analizar Texto/i });
    fireEvent.click(analyzeButton);
    
    expect(mockOnAnalizar).toHaveBeenCalledTimes(1);
  });
});