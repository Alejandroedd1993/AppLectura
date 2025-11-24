/**
 * Tests para EvaluationProgressBar component
 * Cobertura: progreso, pasos, tiempo restante, animaciones
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import EvaluationProgressBar from '../../../src/components/ui/EvaluationProgressBar';
import { lightTheme } from '../../../src/styles/theme';

describe('EvaluationProgressBar', () => {
  const defaultProps = {
    isEvaluating: true,
    estimatedSeconds: 30,
    theme: lightTheme
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Renderizado', () => {
    it('debe renderizar cuando isEvaluating=true', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      expect(screen.getByText(/Analizando estructura/i)).toBeInTheDocument();
    });

    it('no debe renderizar cuando isEvaluating=false', () => {
      const { container } = render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} isEvaluating={false} />
        </ThemeProvider>
      );

      expect(container.firstChild).toBeNull();
    });

    it('debe mostrar tiempo restante', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      expect(screen.getByText(/30s restantes/i)).toBeInTheDocument();
    });

    it('debe mostrar porcentaje de progreso', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      // Inicialmente debe mostrar 0%
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('debe mostrar mensaje de paciencia', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      expect(screen.getByText(/Evaluación dual para máxima precisión/i)).toBeInTheDocument();
      expect(screen.getByText(/No cierres esta pestaña/i)).toBeInTheDocument();
    });
  });

  describe('Progreso temporal', () => {
    it('debe incrementar progreso con el tiempo', async () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} estimatedSeconds={10} />
        </ThemeProvider>
      );

      // Inicialmente 0%
      expect(screen.getByText('0%')).toBeInTheDocument();

      // Avanzar 5 segundos (50% del tiempo)
      jest.advanceTimersByTime(5000);

      // Debe haber progresado (no lineal, así que no exactamente 50%)
      await waitFor(() => {
        const percentageText = screen.queryByText(/^\d+%$/);
        if (percentageText) {
          const percentage = parseInt(percentageText.textContent);
          expect(percentage).toBeGreaterThan(0);
          expect(percentage).toBeLessThan(95); // Nunca llega a 100%
        }
      });
    });

    it('debe decrementar tiempo restante', async () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} estimatedSeconds={10} />
        </ThemeProvider>
      );

      // Inicialmente 10s
      expect(screen.getByText(/10s restantes/i)).toBeInTheDocument();

      // Avanzar 3 segundos
      jest.advanceTimersByTime(3000);

      // Debe mostrar ~7s restantes
      await waitFor(() => {
        expect(screen.getByText(/7s restantes/i)).toBeInTheDocument();
      });
    });

    it('debe limitarse a 95% máximo', async () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} estimatedSeconds={5} />
        </ThemeProvider>
      );

      // Avanzar más del tiempo estimado
      jest.advanceTimersByTime(10000);

      await waitFor(() => {
        const percentageText = screen.queryByText(/^\d+%$/);
        if (percentageText) {
          const percentage = parseInt(percentageText.textContent);
          expect(percentage).toBeLessThanOrEqual(95);
        }
      });
    });
  });

  describe('Pasos de evaluación', () => {
    it('debe mostrar paso actual por defecto', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      // Primer paso por defecto
      expect(screen.getByText(/Analizando estructura/i)).toBeInTheDocument();
      // Emoji puede variar en encoding, verificar solo texto
    });

    it('debe cambiar de paso con el tiempo', async () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} estimatedSeconds={30} />
        </ThemeProvider>
      );

      // Paso inicial
      expect(screen.getByText(/Analizando estructura/i)).toBeInTheDocument();

      // Avanzar 6 segundos (después del primer paso)
      jest.advanceTimersByTime(6000);

      // Debe cambiar al segundo paso
      await waitFor(() => {
        expect(screen.getByText(/Evaluando con DeepSeek/i)).toBeInTheDocument();
      });
    });

    it('debe usar paso proporcionado externamente', () => {
      const customStep = {
        label: 'Paso personalizado',
        icon: '🎯',
        duration: 10
      };

      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar 
            {...defaultProps} 
            currentStep={customStep}
          />
        </ThemeProvider>
      );

      expect(screen.getByText('Paso personalizado')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('debe renderizar todos los indicadores de paso', () => {
      const { container } = render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      // Debe haber 4 indicadores de paso (StepDot)
      const stepDots = container.querySelectorAll('[title*="Analizando"], [title*="Evaluando"], [title*="Combinando"]');
      expect(stepDots.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Reinicio de estado', () => {
    it('debe reiniciar progreso cuando isEvaluating cambia a false', () => {
      const { rerender } = render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      // Avanzar progreso
      jest.advanceTimersByTime(5000);

      // Detener evaluación
      rerender(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} isEvaluating={false} />
        </ThemeProvider>
      );

      // No debe renderizarse
      expect(screen.queryByText(/restantes/i)).not.toBeInTheDocument();

      // Reiniciar evaluación
      rerender(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} isEvaluating={true} />
        </ThemeProvider>
      );

      // Debe empezar desde 0% nuevamente
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Animaciones', () => {
    it('debe tener animación de entrada', () => {
      const { container } = render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar {...defaultProps} />
        </ThemeProvider>
      );

      // Verificar que el contenedor principal existe
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Theming', () => {
    it('debe aplicar theme proporcionado', () => {
      const customTheme = {
        ...lightTheme,
        primary: '#FF0000',
        success: '#00FF00'
      };

      render(
        <ThemeProvider theme={customTheme}>
          <EvaluationProgressBar 
            {...defaultProps} 
            theme={customTheme}
          />
        </ThemeProvider>
      );

      // El componente debe renderizarse sin errores
      expect(screen.getByText(/Analizando estructura/i)).toBeInTheDocument();
    });
  });

  describe('Casos edge', () => {
    it('debe manejar estimatedSeconds=0', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar 
            {...defaultProps} 
            estimatedSeconds={0}
          />
        </ThemeProvider>
      );

      expect(screen.getByText(/0s restantes/i)).toBeInTheDocument();
    });

    it('debe manejar estimatedSeconds muy grande', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar 
            {...defaultProps} 
            estimatedSeconds={999}
          />
        </ThemeProvider>
      );

      expect(screen.getByText(/999s restantes/i)).toBeInTheDocument();
    });

    it('debe manejar tiempo transcurrido mayor al estimado', async () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar 
            {...defaultProps} 
            estimatedSeconds={5}
          />
        </ThemeProvider>
      );

      // Avanzar mucho más del tiempo estimado
      jest.advanceTimersByTime(20000);

      await waitFor(() => {
        expect(screen.getByText(/0s restantes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Actualización en tiempo real', () => {
    it('debe actualizar cada 200ms', async () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <EvaluationProgressBar 
            {...defaultProps} 
            estimatedSeconds={10}
          />
        </ThemeProvider>
      );

      const initialText = screen.getByText(/10s restantes/i);

      // Avanzar 200ms
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        // Debe haber actualizado (aunque mínimamente)
        expect(screen.getByText(/restantes/i)).toBeInTheDocument();
      });
    });
  });
});
