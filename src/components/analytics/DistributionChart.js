/**
 * DistributionChart - Grafico de barras que muestra la distribucion de intentos y scores
 * Util para ver cuantas veces se ha evaluado cada rubrica y el rango de puntuaciones
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { buildDistributionChartData, buildDistributionInsights } from '../../services/progressAnalyticsView';

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

const TooltipRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.25rem 0;
  font-size: 0.8rem;
`;

const TooltipKey = styled.span`
  color: ${props => props.theme.textMuted};
`;

const TooltipValue = styled.span`
  color: ${props => props.theme.text};
  font-weight: 600;
`;

const InsightBox = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
`;

const InsightTitle = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InsightList = styled.ul`
  margin: 0;
  padding-left: 1.5rem;
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.6;
`;

const CustomTooltipContent = ({ active, payload, theme }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const formatScoreValue = (value) => {
    if (Number.isFinite(value)) return `${Number(value).toFixed(1)}/10`;
    return Number(data.attempts || 0) > 0 ? 'En revisión' : 'Sin nota';
  };
  const attemptsLabel = Number(data.attempts || 0) > 0
    ? String(data.attempts)
    : (data.hasLegacyScoreOnlyEvidence ? 'Sin registro legacy' : 'Sin registro');

  return (
    <CustomTooltip theme={theme}>
      <TooltipLabel theme={theme}>{data.fullName}</TooltipLabel>
      <TooltipRow>
        <TooltipKey theme={theme}>Intentos:</TooltipKey>
        <TooltipValue theme={theme}>{attemptsLabel}</TooltipValue>
      </TooltipRow>
      <TooltipRow>
        <TooltipKey theme={theme}>Promedio:</TooltipKey>
        <TooltipValue theme={theme}>{formatScoreValue(data.average)}</TooltipValue>
      </TooltipRow>
      <TooltipRow>
        <TooltipKey theme={theme}>Mejor:</TooltipKey>
        <TooltipValue theme={theme} style={{ color: '#10B981' }}>{formatScoreValue(data.best)}</TooltipValue>
      </TooltipRow>
      <TooltipRow>
        <TooltipKey theme={theme}>Ultimo:</TooltipKey>
        <TooltipValue theme={theme}>{formatScoreValue(data.last)}</TooltipValue>
      </TooltipRow>
    </CustomTooltip>
  );
};

const DistributionChart = ({ rubricProgress = {}, progressSnapshot = null, theme }) => {
  const chartData = useMemo(
    () => buildDistributionChartData({ rubricProgress, progressSnapshot }),
    [rubricProgress, progressSnapshot]
  );

  const insights = useMemo(() => buildDistributionInsights(chartData), [chartData]);

  if (chartData.length === 0) {
    return (
      <ChartContainer theme={theme}>
        <ChartTitle theme={theme}>📊 Distribucion de Intentos</ChartTitle>
        <EmptyState theme={theme}>
          <p>Aun no hay datos.</p>
          <p>Completa evaluaciones para ver la distribucion de tus intentos.</p>
        </EmptyState>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer theme={theme}>
      <ChartTitle theme={theme}>📊 Distribucion de Intentos por Dimension</ChartTitle>
      <ChartDescription theme={theme}>
        Visualiza cuantas veces has evaluado cada dimension y tu promedio en cada una.
        Las barras mas altas indican mayor practica.
      </ChartDescription>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.border || '#E4EAF1'}
            opacity={0.5}
          />
          <XAxis
            dataKey="name"
            stroke={theme.textMuted || '#607D8B'}
            style={{ fontSize: '0.8rem' }}
            angle={-15}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke={theme.textMuted || '#607D8B'}
            style={{ fontSize: '0.85rem' }}
            label={{
              value: 'Numero de Intentos',
              angle: -90,
              position: 'insideLeft',
              style: { fill: theme.textMuted, fontSize: '0.8rem' }
            }}
          />
          <Tooltip
            content={<CustomTooltipContent theme={theme} />}
            cursor={{ fill: theme.background, opacity: 0.5 }}
          />
          <Bar
            dataKey="attempts"
            name="Intentos"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {insights.length > 0 && (
        <InsightBox theme={theme}>
          <InsightTitle theme={theme}>💡 Insights de tu practica</InsightTitle>
          <InsightList theme={theme}>
            {insights.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </InsightList>
        </InsightBox>
      )}
    </ChartContainer>
  );
};

export default DistributionChart;
