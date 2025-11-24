// Tests unitarios para SistemaEvaluacion
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SistemaEvaluacion from '../../../src/components/SistemaEvaluacion';
import { renderWithContext, createTestText } from '../../testUtils';
import { PedagogyProvider } from '../../../src/context/PedagogyContext';

// Mock de OpenAI con función mock estática
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

// Mock del módulo sistemaEvaluacionInteligente
jest.mock('../../../src/utils/sistemaEvaluacionInteligente', () => ({
  NIVELES_ESTUDIANTE: {
    BASICO: {
      label: 'Básico',
      descripcion: 'Nivel básico de comprensión',
      dificultad: 1
    },
    INTERMEDIO: {
      label: 'Intermedio',
      descripcion: 'Nivel intermedio de análisis',
      dificultad: 2
    },
    AVANZADO: {
      label: 'Avanzado',
      descripcion: 'Análisis profundo y crítico',
      dificultad: 3
    }
  },
  GeneradorPreguntasInteligente: {
    generarPreguntasContextuales: jest.fn(),
    validarYCorregirPreguntas: jest.fn(),
    ajustarDificultad: jest.fn(),
    limpiarHistorial: jest.fn()
  },
  EvaluadorRespuestasInteligente: {
    evaluarRespuestaCompleta: jest.fn(),
    generarFeedbackPersonalizado: jest.fn(),
    calcularPuntuacion: jest.fn()
  }
}));

// Mock de OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI)
}));

describe('SistemaEvaluacion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset OpenAI mock
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            preguntas: [
              {
                pregunta: '¿Cuál es el tema principal?',
                opciones: ['A', 'B', 'C', 'D'],
                respuestaCorrecta: 'A'
              }
            ]
          })
        }
      }]
    });
    
    // Mock de evaluador
    const mockEvaluadorRespuestasInteligente = require('../../../src/utils/sistemaEvaluacionInteligente').EvaluadorRespuestasInteligente;
    mockEvaluadorRespuestasInteligente.evaluarRespuestaCompleta.mockResolvedValue({
      puntuacion: 10,
      feedback: 'Respuesta correcta. Buen análisis.',
      areas_mejora: []
    });
  });

  const mockProps = {
    onClose: jest.fn()
  };

  const contextValue = {
    texto: createTestText(500),
    openAIApiKey: 'test-key',
    modoOscuro: false,
    setTexto: jest.fn(),
    openai: mockOpenAI
  };

  const renderWithPedagogy = (ui, opts) => renderWithContext(<PedagogyProvider>{ui}</PedagogyProvider>, opts);

  describe('Renderizado inicial', () => {
    test('debe renderizar el componente correctamente', () => {
      renderWithPedagogy(<SistemaEvaluacion {...mockProps} />, { contextValue });
      
      // Actualizado para coincidir con el nuevo título
      expect(screen.getByText(/Evaluación Criterial Integral/i)).toBeInTheDocument();
      expect(screen.getByText(/Evalúa tu literacidad crítica en las 5 dimensiones/i)).toBeInTheDocument();
    });

    test('debe mostrar las dimensiones de evaluación disponibles', () => {
      renderWithPedagogy(<SistemaEvaluacion {...mockProps} />, { contextValue });
      
      // Verificamos que los botones de selección de dimensión estén presentes
      expect(screen.getByRole('button', { name: /Seleccionar dimensión: Comprensión Analítica/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Seleccionar dimensión: Análisis Ideológico-Discursivo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Seleccionar dimensión: Contextualización Socio-Histórica/i })).toBeInTheDocument();
    });

    test('debe mostrar el dashboard de progreso vacío inicialmente', () => {
      renderWithPedagogy(<SistemaEvaluacion {...mockProps} />, { contextValue });
      
      expect(screen.getByText(/Aún no has realizado evaluaciones/i)).toBeInTheDocument();
    });
  });

  describe('Selección de dimensión', () => {
    test('debe permitir seleccionar una dimensión', () => {
      renderWithPedagogy(<SistemaEvaluacion {...mockProps} />, { contextValue });
      
      const dimensionButton = screen.getByRole('button', { name: /Seleccionar dimensión: Comprensión Analítica/i });
      expect(dimensionButton).toBeInTheDocument();
    });
  });

  describe('Sin texto cargado', () => {
    test('debe mostrar mensaje cuando no hay texto', () => {
      const contextSinTexto = { ...contextValue, texto: '' };
      renderWithPedagogy(<SistemaEvaluacion {...mockProps} />, { contextValue: contextSinTexto });
      
      expect(screen.getByText(/Carga un texto para comenzar la evaluación/i)).toBeInTheDocument();
    });
  });

  describe('Limpieza y cancelación', () => {
    test('debe cancelar operaciones en curso al desmontar', () => {
      const { unmount } = renderWithPedagogy(<SistemaEvaluacion {...mockProps} />, { contextValue });
      
      expect(() => unmount()).not.toThrow();
    });
  });
});
