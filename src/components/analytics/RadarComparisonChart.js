/**
 * RadarComparisonChart - Grafico de radar para comparar desempeno entre rubricas
 * Visualiza fortalezas y debilidades en un formato spider chart
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { buildRadarChartData } from '../../services/progressAnalyticsView';

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

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
`;

const LegendColor = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: ${props => props.$color};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
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

const TooltipScore = styled.div`
  color: ${props => props.$color};
  font-size: 1.25rem;
  font-weight: 700;
`;

const CustomTooltipContent = ({ active, payload, theme }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const score = payload[0].value;

  return (
    <CustomTooltip theme={theme}>
      <TooltipLabel theme={theme}>{data.fullName}</TooltipLabel>
      <TooltipScore $color={payload[0].fill}>
        {Number(score || 0).toFixed(1)}/10
      </TooltipScore>
    </CustomTooltip>
  );
};

const RadarComparisonChart = ({ rubricProgress = {}, progressSnapshot = null, theme }) => {
  const chartData = useMemo(
    () => buildRadarChartData({ rubricProgress, progressSnapshot }),
    [rubricProgress, progressSnapshot]
  );

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const scores = chartData.map((item) => item.score);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;

    return {
      average: average.toFixed(1),
      max: max.toFixed(1),
      min: min.toFixed(1),
      range: range.toFixed(1),
      balance: range < 2 ? 'Equilibrado' : range < 4 ? 'Moderado' : 'Desbalanceado'
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <ChartContainer theme={theme}>
        <ChartTitle theme={theme}>🎯 Comparacion de Competencias</ChartTitle>
        <EmptyState theme={theme}>
          <p>Aun no hay datos suficientes.</p>
          <p>Completa al menos 2 rubricas para ver la comparacion.</p>
        </EmptyState>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer theme={theme}>
      <ChartTitle theme={theme}>🎯 Comparacion de Competencias</ChartTitle>
      <ChartDescription theme={theme}>
        Este grafico de radar muestra tu nivel de dominio en cada dimension.
        Un area mas amplia indica mayor desarrollo de competencias.
      </ChartDescription>

      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={chartData}>
          <PolarGrid
            stroke={theme.border || '#E4EAF1'}
            opacity={0.5}
          />
          <PolarAngleAxis
            dataKey="name"
            stroke={theme.textMuted || '#607D8B'}
            style={{
              fontSize: '0.8rem',
              fontWeight: '500'
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            stroke={theme.textMuted || '#607D8B'}
            style={{ fontSize: '0.75rem' }}
            tick={{ fill: theme.textMuted }}
          />
          <Radar
            name="Puntuacion"
            dataKey="score"
            stroke={theme.primary || '#3190FC'}
            fill={theme.primary || '#3190FC'}
            fillOpacity={0.5}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltipContent theme={theme} />} />
        </RadarChart>
      </ResponsiveContainer>

      <LegendContainer>
        <LegendItem>
          <LegendColor $color={theme.primary || '#3190FC'} />
          <span style={{ color: theme.text }}>Tu desempeno actual</span>
        </LegendItem>
      </LegendContainer>

      {stats && (
        <StatsGrid theme={theme}>
          <StatItem>
            <StatValue $color={theme.primary} theme={theme}>
              {stats.average}
            </StatValue>
            <StatLabel theme={theme}>Promedio</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue $color="#10B981" theme={theme}>
              {stats.max}
            </StatValue>
            <StatLabel theme={theme}>Maximo</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue $color="#EF4444" theme={theme}>
              {stats.min}
            </StatValue>
            <StatLabel theme={theme}>Minimo</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue $color={theme.textMuted} theme={theme}>
              {stats.balance}
            </StatValue>
            <StatLabel theme={theme}>Balance</StatLabel>
          </StatItem>
        </StatsGrid>
      )}
    </ChartContainer>
  );
};

export default RadarComparisonChart;
