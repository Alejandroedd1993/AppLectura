import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import Actividades from '../../../src/components/Actividades';
import { AppContext } from '../../../src/context/AppContext';
import { lightTheme } from '../../../src/styles/theme';

jest.mock('framer-motion', () => {
  const React = require('react');
  const stripMotionProps = ({
    whileHover,
    whileTap,
    animate,
    initial,
    exit,
    transition,
    ...props
  }) => props;

  return {
    motion: {
      div: React.forwardRef(({ children, ...props }, ref) => <div ref={ref} {...stripMotionProps(props)}>{children}</div>),
      button: React.forwardRef(({ children, ...props }, ref) => <button ref={ref} {...stripMotionProps(props)}>{children}</button>)
    },
    AnimatePresence: ({ children }) => <>{children}</>
  };
});

jest.mock('../../../src/components/actividades/PreguntasPersonalizadas', () => () => (
  <div data-testid="preguntas-personalizadas">checkpoint</div>
));

jest.mock('../../../src/components/evaluacion/DashboardRubricas', () => ({
  __esModule: true,
  default: ({ progressSnapshot }) => (
    <div data-testid="dashboard-rubricas">
      dashboard:{progressSnapshot?.summary?.coverageCount}:{progressSnapshot?.focusRubricId}
    </div>
  )
}));

jest.mock('../../../src/components/actividades/ProgressStats', () => ({
  __esModule: true,
  default: ({ progressSnapshot }) => (
    <div data-testid="progress-stats">
      details:{progressSnapshot?.summary?.coverageCount}:{progressSnapshot?.focusRubricId}
    </div>
  )
}));

jest.mock('../../../src/components/actividades/ExportProgressButton', () => ({
  __esModule: true,
  default: ({ progressSnapshot, lectureId, sourceCourseId }) => (
    <div data-testid="export-progress">
      export:{progressSnapshot?.summary?.coverageCount}:{lectureId}:{sourceCourseId}
    </div>
  )
}));

jest.mock('../../../src/components/actividades/ModoPracticaGuiada', () => () => (
  <div data-testid="modo-practica">practica</div>
));

jest.mock('../../../src/components/evaluacion/AnalyticsPanel', () => ({
  __esModule: true,
  default: ({ progressSnapshot }) => (
    <div data-testid="analytics-panel">
      analytics:{progressSnapshot?.summary?.coverageCount}:{progressSnapshot?.summary?.totalAttempts}
    </div>
  )
}));

jest.mock('../../../src/components/actividades/DimensionCard', () => {
  const React = require('react');
  const DIMENSIONS = [
    { id: 'comprension_analitica', rubricId: 'rubrica1', icon: 'A' },
    { id: 'acd', rubricId: 'rubrica2', icon: 'B' },
    { id: 'contextualizacion', rubricId: 'rubrica3', icon: 'C' },
    { id: 'argumentacion', rubricId: 'rubrica4', icon: 'D' },
    { id: 'metacognicion_etica_ia', rubricId: 'rubrica5', icon: 'E' }
  ];

  return {
    __esModule: true,
    DIMENSIONS,
    default: ({ dimension }) => (
      <div data-testid={`dimension-${dimension.rubricId}`}>{dimension.id}</div>
    )
  };
});

jest.mock('../../../src/components/common/NextStepCard', () => ({
  __esModule: true,
  default: ({ title }) => <div data-testid="next-step-card">{title}</div>
}));

jest.mock('../../../src/components/common/DraftWarning', () => ({
  __esModule: true,
  default: () => <div data-testid="draft-warning">draft-warning</div>
}));

jest.mock('../../../src/components/common/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>
}));

jest.mock('../../../src/services/practiceService', () => ({
  generatePracticePlan: () => ({ dimensions: [] })
}));

describe('Actividades - integracion de Mi Progreso', () => {
  const renderWithContext = (overrides = {}) => {
    const value = {
      texto: { titulo: 'Texto de prueba' },
      completeAnalysis: {
        critical: { summary: 'ok' },
        metadata: { document_id: 'lectura-1' }
      },
      modoOscuro: false,
      rubricProgress: {
        rubrica1: {
          average: 9,
          scores: [{ score: 9, timestamp: '2026-03-20T10:00:00.000Z' }]
        }
      },
      clearRubricProgress: jest.fn(),
      resetAllProgress: jest.fn().mockResolvedValue(true),
      activitiesProgress: {
        'lectura-1': {
          preparation: { completed: true }
        }
      },
      markPreparationProgress: jest.fn(),
      currentTextoId: 'lectura-1',
      sourceCourseId: 'curso-1',
      getCitations: jest.fn(() => []),
      globalTutorInteractions: [],
      ...overrides
    };

    return render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={value}>
          <Actividades />
        </AppContext.Provider>
      </ThemeProvider>
    );
  };

  test('propaga el snapshot canonico a dashboard, analiticas, detalle y exportacion dentro de Mi Progreso', async () => {
    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId('dimension-rubrica1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /mi progreso/i }));

    expect(screen.getByText(/Mi progreso: Primeros pasos/i)).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-rubricas')).toHaveTextContent('dashboard:1:rubrica2');
    expect(screen.getByTestId('analytics-panel')).toHaveTextContent('analytics:1:1');
    expect(screen.getByTestId('progress-stats')).toHaveTextContent('details:1:rubrica2');
    expect(screen.getByTestId('export-progress')).toHaveTextContent('export:1:lectura-1:curso-1');
  });
});
