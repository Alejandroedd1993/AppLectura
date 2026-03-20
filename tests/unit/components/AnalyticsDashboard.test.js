import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AnalyticsDashboard, {
  formatSessionAxisLabel,
  formatSessionDateLabel,
  isSessionInTimeRange
} from '../../../src/components/analytics/AnalyticsDashboard';
import { buildProgressSnapshot } from '../../../src/services/progressSnapshot';
import { lightTheme } from '../../../src/styles/theme';

jest.mock('recharts', () => {
  const React = require('react');

  const passthrough = ({ children }) => <div>{children}</div>;
  const chartShell = () => <div data-testid="mock-chart" />;

  return {
    ResponsiveContainer: passthrough,
    AreaChart: chartShell,
    Area: chartShell,
    BarChart: chartShell,
    Bar: chartShell,
    Cell: passthrough,
    XAxis: chartShell,
    YAxis: chartShell,
    CartesianGrid: chartShell,
    Tooltip: chartShell
  };
});

function createSession({ title, createdAt, rubricProgress }) {
  return {
    title,
    createdAt,
    rubricProgress,
    progressSnapshot: buildProgressSnapshot({
      lectureId: 'lectura-dashboard-test',
      rubricProgress,
      activitiesProgress: {}
    })
  };
}

describe('AnalyticsDashboard', () => {
  test('etiqueta sesiones sin timestamp como Sin fecha y no las fuerza dentro de rangos temporales', () => {
    const session = {
      rubricProgress: {
        rubrica1: {
          scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
          average: 8,
          artefactos: ['ResumenAcademico']
        }
      }
    };

    expect(formatSessionDateLabel(session)).toBe('Sin fecha');
    expect(formatSessionAxisLabel(session, 2)).toBe('Sesion 2');
    expect(isSessionInTimeRange(session, 'month', Date.parse('2026-03-20T00:00:00.000Z'))).toBe(false);
    expect(isSessionInTimeRange(session, 'all', Date.parse('2026-03-20T00:00:00.000Z'))).toBe(true);
  });

  test('avisa cuando existen sesiones comparables sin fecha dentro del historico', () => {
    const sessions = [
      createSession({
        title: 'Sesion legacy',
        rubricProgress: {
          rubrica1: {
            scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
            average: 8,
            artefactos: ['ResumenAcademico']
          }
        }
      })
    ];

    render(<AnalyticsDashboard sessions={sessions} theme={lightTheme} />);

    expect(screen.getByText(/Hay 1 sesion sin fecha/i)).toBeInTheDocument();
    expect(screen.getByText(/solo se incluyen en "Todo"/i)).toBeInTheDocument();
  });

  test('muestra tendencia estable cuando la rubrica filtrada solo tiene una sesion comparable', () => {
    const sessions = [
      createSession({
        title: 'Sesion 1',
        createdAt: '2026-03-10T08:00:00.000Z',
        rubricProgress: {
          rubrica1: {
            scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
            average: 8,
            artefactos: ['ResumenAcademico']
          },
          rubrica2: {
            scores: [{ score: 6, artefacto: 'TablaACD', timestamp: 2 }],
            average: 6,
            artefactos: ['TablaACD']
          }
        }
      }),
      createSession({
        title: 'Sesion 2',
        createdAt: '2026-03-12T08:00:00.000Z',
        rubricProgress: {
          rubrica1: {
            scores: [{ score: 9, artefacto: 'ResumenAcademico', timestamp: 3 }],
            average: 9,
            artefactos: ['ResumenAcademico']
          }
        }
      })
    ];

    render(<AnalyticsDashboard sessions={sessions} theme={lightTheme} />);

    fireEvent.click(screen.getByRole('button', { name: /Analisis/i }));

    expect(screen.getByText('➡️')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByText('-0%')).not.toBeInTheDocument();
  });

  test('solo muestra competencias con evidencia comparable en el panel de progreso', () => {
    const sessions = [
      createSession({
        title: 'Sesion 1',
        createdAt: '2026-03-10T08:00:00.000Z',
        rubricProgress: {
          rubrica1: {
            scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
            average: 8,
            artefactos: ['ResumenAcademico']
          },
          rubrica2: {
            scores: [{ score: 6, artefacto: 'TablaACD', timestamp: 2 }],
            average: 6,
            artefactos: ['TablaACD']
          }
        }
      }),
      createSession({
        title: 'Sesion 2',
        createdAt: '2026-03-12T08:00:00.000Z',
        rubricProgress: {
          rubrica1: {
            scores: [{ score: 9, artefacto: 'ResumenAcademico', timestamp: 3 }],
            average: 9,
            artefactos: ['ResumenAcademico']
          }
        }
      })
    ];

    render(<AnalyticsDashboard sessions={sessions} theme={lightTheme} />);

    const progressSection = screen.getByText('📋 Progreso por Competencia').closest('section') || screen.getByText('📋 Progreso por Competencia').parentElement;
    const scopedQueries = within(progressSection);

    expect(scopedQueries.getByText('Comprension Analitica')).toBeInTheDocument();
    expect(scopedQueries.getByText('Analisis Ideologico-Discursivo')).toBeInTheDocument();
    expect(scopedQueries.queryByText('Contextualizacion Socio-Historica')).not.toBeInTheDocument();
    expect(scopedQueries.queryByText('Argumentacion y Contraargumento')).not.toBeInTheDocument();
    expect(scopedQueries.queryByText('Metacognicion Etica del Uso de IA')).not.toBeInTheDocument();
  });
});
