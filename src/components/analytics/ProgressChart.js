/**
 * ProgressChart - Grafico de evolucion temporal de progreso por rubrica
 * Muestra como ha evolucionado el puntaje en cada dimension a lo largo del tiempo
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { buildProgressChartModel } from '../../services/progressAnalyticsView';

const ChartContainer = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const ChartTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChartDescription = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.4;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
`;

const InfoBox = styled.div`
  background: ${props => props.theme.infoBg || props.theme.background};
  border: 1px solid ${props => props.theme.primary}40;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: ${props => props.theme.text};
`;

const InfoIcon = styled.span`
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
  line-height: 1.5;

  strong {
    color: ${props => props.theme.primary};
  }
`;

const StatsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  font-size: 0.8rem;

  span:first-child {
    font-weight: 600;
    color: ${props => props.$color || props.theme.primary};
  }

  span:last-child {
    color: ${props => props.theme.textMuted};
  }
`;

const CustomTooltip = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
`;

const TooltipItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
  font-size: 0.8rem;
`;

const TooltipColor = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${props => props.$color};
`;

const RUBRIC_COLORS = {
  rubrica1: '#3B82F6',
  rubrica2: '#8B5CF6',
  rubrica3: '#10B981',
  rubrica4: '#F59E0B',
  rubrica5: '#EF4444'
};

const RUBRIC_NAMES = {
  rubrica1: 'Comprension',
  rubrica2: 'ACD',
  rubrica3: 'Contextualizacion',
  rubrica4: 'Argumentacion',
  rubrica5: 'Metacognicion'
};

const CustomTooltipContent = ({ active, payload, label, theme }) => {
  if (!active || !payload) return null;

  return (
    <CustomTooltip theme={theme}>
      <TooltipLabel theme={theme}>Intento #{label}</TooltipLabel>
      {payload.map((entry, index) => (
        <TooltipItem key={index}>
          <TooltipColor $color={entry.color} />
          <span style={{ color: theme.text }}>
            {entry.name}: <strong>{Number(entry.value || 0).toFixed(1)}</strong>/10
          </span>
        </TooltipItem>
      ))}
    </CustomTooltip>
  );
};

const ProgressChart = ({ rubricProgress = {}, progressSnapshot = null, theme }) => {
  const { chartData, stats, activeRubrics } = useMemo(
    () => buildProgressChartModel({ rubricProgress, progressSnapshot }),
    [rubricProgress, progressSnapshot]
  );

  if (chartData.length === 0) {
    return (
      <ChartContainer theme={theme}>
        <ChartTitle theme={theme}>📈 Evolucion Temporal</ChartTitle>
        <EmptyState theme={theme}>
          <p>Aun no hay suficientes datos para generar el grafico.</p>
          <p>Completa al menos 1 evaluacion en cualquier dimension para comenzar.</p>
        </EmptyState>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer theme={theme}>
      <ChartTitle theme={theme}>📈 Evolucion Temporal de Progreso</ChartTitle>
      <ChartDescription theme={theme}>
        Observa como ha evolucionado tu desempeno en cada dimension a lo largo de tus intentos.
        Las lineas ascendentes indican mejora continua.
      </ChartDescription>

      {stats?.needsMoreData && (
        <InfoBox theme={theme}>
          <InfoIcon>💡</InfoIcon>
          <InfoContent theme={theme}>
            <strong>Buen comienzo.</strong> Has completado <strong>{stats.totalAttempts} evaluaciones</strong> en <strong>{stats.totalRubrics} dimensiones</strong>.
            <br />
            Para ver la evolucion temporal, necesitas al menos <strong>2 intentos en una misma dimension</strong>.
            Vuelve a evaluar una dimension para ver tu progreso.
            <StatsRow theme={theme}>
              <StatBadge theme={theme} $color="#3B82F6">
                <span>{stats.totalAttempts}</span>
                <span>intentos totales</span>
              </StatBadge>
              <StatBadge theme={theme} $color="#10B981">
                <span>{stats.totalRubrics}</span>
                <span>dimensiones evaluadas</span>
              </StatBadge>
              <StatBadge theme={theme} $color="#F59E0B">
                <span>{stats.avgAttemptsPerRubric}</span>
                <span>promedio por dimension</span>
              </StatBadge>
            </StatsRow>
          </InfoContent>
        </InfoBox>
      )}

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.border || '#E4EAF1'}
            opacity={0.5}
          />
          <XAxis
            dataKey="attempt"
            stroke={theme.textMuted || '#607D8B'}
            style={{ fontSize: '0.85rem' }}
            label={{
              value: 'Numero de Intento',
              position: 'insideBottom',
              offset: -5,
              style: { fill: theme.textMuted, fontSize: '0.8rem' }
            }}
          />
          <YAxis
            domain={[0, 10]}
            stroke={theme.textMuted || '#607D8B'}
            style={{ fontSize: '0.85rem' }}
            label={{
              value: 'Puntuacion (0-10)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: theme.textMuted, fontSize: '0.8rem' }
            }}
          />
          <Tooltip
            content={<CustomTooltipContent theme={theme} />}
            cursor={{ stroke: theme.primary, strokeDasharray: '5 5' }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '0.85rem',
              paddingTop: '1rem'
            }}
            formatter={(value) => RUBRIC_NAMES[value] || value}
          />

          {activeRubrics.map((rubricId) => (
            <Line
              key={rubricId}
              type="monotone"
              dataKey={rubricId}
              stroke={RUBRIC_COLORS[rubricId]}
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: RUBRIC_COLORS[rubricId],
                strokeWidth: 2,
                stroke: '#fff'
              }}
              activeDot={{
                r: 6,
                stroke: '#fff',
                strokeWidth: 2
              }}
              name={RUBRIC_NAMES[rubricId]}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default ProgressChart;
