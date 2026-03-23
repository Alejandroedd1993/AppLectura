import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import AnalyticsPanel from '../../../src/components/evaluacion/AnalyticsPanel';
import { AppContext } from '../../../src/context/AppContext';
import { buildProgressSnapshot } from '../../../src/services/progressSnapshot';
import { lightTheme } from '../../../src/styles/theme';
import { getAllSessionsMerged } from '../../../src/services/sessionManager';

jest.mock('../../../src/services/sessionManager', () => ({
  getAllSessionsMerged: jest.fn().mockResolvedValue([])
}));

describe('AnalyticsPanel session refresh', () => {
  beforeEach(() => {
    getAllSessionsMerged.mockClear();
  });

  test('recarga sesiones historicas cuando la app emite session-updated', async () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={{ currentTextoId: 'lectura-1', sourceCourseId: 'curso-1' }}>
          <AnalyticsPanel
            rubricProgress={{}}
            progressSnapshot={{ hasData: false }}
            theme={lightTheme}
          />
        </AppContext.Provider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getAllSessionsMerged).toHaveBeenCalledTimes(1);
    });

    window.dispatchEvent(new CustomEvent('session-updated'));

    await waitFor(() => {
      expect(getAllSessionsMerged).toHaveBeenCalledTimes(2);
    });
  });

  test('aclara cuando hay nota legacy sin historial real de intentos', async () => {
    const rubricProgress = {
      rubrica3: {
        average: 6.5,
        artefactos: ['MapaActores']
      }
    };
    const progressSnapshot = buildProgressSnapshot({
      lectureId: 'lectura-legacy',
      rubricProgress,
      activitiesProgress: {}
    });

    render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={{ currentTextoId: 'lectura-legacy', sourceCourseId: 'curso-1' }}>
          <AnalyticsPanel
            rubricProgress={rubricProgress}
            progressSnapshot={progressSnapshot}
            theme={lightTheme}
          />
        </AppContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getAllByText(/nota legacy sin historial detallado/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(getAllSessionsMerged).toHaveBeenCalled();
    });
  });

  test('mantiene el copy mixto de intentos reales y registros legacy desde la misma fuente comun', async () => {
    const rubricProgress = {
      rubrica1: {
        scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
        average: 8,
        artefactos: ['ResumenAcademico']
      },
      rubrica3: {
        average: 6.5,
        artefactos: ['MapaActores']
      }
    };

    const progressSnapshot = {
      hasData: true,
      hasMeaningfulTimeSeries: false,
      canRenderRadar: false,
      canRenderDistribution: false,
      nextAction: null,
      rubrics: [
        {
          rubricId: 'rubrica1',
          effectiveScore: 8,
          formativeScores: [{ score: 8, timestamp: 1 }]
        },
        {
          rubricId: 'rubrica3',
          effectiveScore: 6.5,
          formativeScores: []
        }
      ],
      rubricsById: {
        rubrica1: {
          rubricId: 'rubrica1',
          effectiveScore: 8,
          formativeScores: [{ score: 8, timestamp: 1 }]
        },
        rubrica3: {
          rubricId: 'rubrica3',
          effectiveScore: 6.5,
          formativeScores: []
        }
      },
      summary: {
        totalRubrics: 5,
        coverageCount: 2,
        coveragePercent: 40,
        evaluatedCount: 2,
        totalAttempts: 1,
        legacyEvidenceCount: 1,
        averageEvaluatedScore: 7.25
      }
    };

    render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={{ currentTextoId: 'lectura-mixta', sourceCourseId: 'curso-1' }}>
          <AnalyticsPanel
            rubricProgress={rubricProgress}
            progressSnapshot={progressSnapshot}
            theme={lightTheme}
          />
        </AppContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getByText(/1 intento\(s\) reales y 1 registro\(s\) legacy/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(getAllSessionsMerged).toHaveBeenCalled();
    });
  });
});
