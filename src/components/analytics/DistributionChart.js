/**
 * DistributionChart - Gráfico de barras que muestra la distribución de intentos y scores
 * Útil para ver cuántas veces se ha evaluado cada rúbrica y el rango de puntuaciones
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

const RUBRIC_COLORS = {
  rubrica1: '#3B82F6',
  rubrica2: '#8B5CF6',
  rubrica3: '#10B981',
  rubrica4: '#F59E0B',
  rubrica5: '#EF4444',
};

const RUBRIC_NAMES = {
  rubrica1: 'Comprensión',
  rubrica2: 'ACD',
  rubrica3: 'Contextualización',
  rubrica4: 'Argumentación',
  rubrica5: 'Metacognición',
};

const CustomTooltipContent = ({ active, payload, theme }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  
  return (
    <CustomTooltip theme={theme}>
      <TooltipLabel theme={theme}>{data.fullName}</TooltipLabel>
      <TooltipRow>
        <TooltipKey theme={theme}>Intentos:</TooltipKey>
        <TooltipValue theme={theme}>{data.attempts}</TooltipValue>
      </TooltipRow>
      <TooltipRow>
        <TooltipKey theme={theme}>Promedio:</TooltipKey>
        <TooltipValue theme={theme}>{data.average.toFixed(1)}/10</TooltipValue>
      </TooltipRow>
      <TooltipRow>
        <TooltipKey theme={theme}>Mejor:</TooltipKey>
        <TooltipValue theme={theme} style={{ color: '#10B981' }}>{data.best.toFixed(1)}/10</TooltipValue>
      </TooltipRow>
      <TooltipRow>
        <TooltipKey theme={theme}>Último:</TooltipKey>
        <TooltipValue theme={theme}>{data.last.toFixed(1)}/10</TooltipValue>
      </TooltipRow>
    </CustomTooltip>
  );
};

const DistributionChart = ({ rubricProgress = {}, theme }) => {
  const chartData = useMemo(() => {
    const data = [];
    
    Object.entries(rubricProgress).forEach(([rubricId, rubricData]) => {
      if (rubricId.startsWith('rubrica') && rubricData?.scores?.length > 0) {
        const scores = rubricData.scores.map(s => 
          typeof s === 'object' ? Number(s.score) : Number(s)
        );
        
        data.push({
          rubric: rubricId,
          name: RUBRIC_NAMES[rubricId] || rubricId,
          fullName: RUBRIC_NAMES[rubricId] || rubricId,
          attempts: scores.length,
          average: Number(rubricData.average || 0),
          best: Math.max(...scores),
          last: scores[scores.length - 1],
          color: RUBRIC_COLORS[rubricId],
        });
      }
    });

    return data.sort((a, b) => b.attempts - a.attempts); // Ordenar por más intentos
  }, [rubricProgress]);

  const insights = useMemo(() => {
    if (chartData.length === 0) return [];

    const insights = [];
    const totalAttempts = chartData.reduce((sum, d) => sum + d.attempts, 0);
    const avgAttemptsPerRubric = totalAttempts / chartData.length;

    // Más practicada
    const mostPracticed = chartData[0];
    if (mostPracticed.attempts > avgAttemptsPerRubric * 1.5) {
      insights.push(`${mostPracticed.name} es tu dimensión más practicada (${mostPracticed.attempts} intentos)`);
    }

    // Menos practicada
    const leastPracticed = chartData[chartData.length - 1];
    if (leastPracticed.attempts < avgAttemptsPerRubric * 0.5) {
      insights.push(`Considera practicar más ${leastPracticed.name} (solo ${leastPracticed.attempts} intento${leastPracticed.attempts > 1 ? 's' : ''})`);
    }

    // Mayor mejora
    const improvements = chartData.filter(d => d.last > d.average);
    if (improvements.length > 0) {
      const biggest = improvements.sort((a, b) => (b.last - b.average) - (a.last - a.average))[0];
      insights.push(`¡Tu último intento en ${biggest.name} superó tu promedio! (${biggest.last.toFixed(1)} vs ${biggest.average.toFixed(1)})`);
    }

    // Distribución desigual
    const maxAttempts = Math.max(...chartData.map(d => d.attempts));
    const minAttempts = Math.min(...chartData.map(d => d.attempts));
    if (maxAttempts - minAttempts > 5) {
      insights.push('Tu práctica está desbalanceada. Intenta distribuir intentos más equitativamente');
    }

    return insights;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <ChartContainer theme={theme}>
        <ChartTitle theme={theme}>📊 Distribución de Intentos</ChartTitle>
        <EmptyState theme={theme}>
          <p>📊 Aún no hay datos</p>
          <p>Completa evaluaciones para ver la distribución de tus intentos</p>
        </EmptyState>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer theme={theme}>
      <ChartTitle theme={theme}>📊 Distribución de Intentos por Dimensión</ChartTitle>
      <ChartDescription theme={theme}>
        Visualiza cuántas veces has evaluado cada dimensión y tu promedio en cada una.
        Las barras más altas indican mayor práctica.
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
              value: 'Número de Intentos', 
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
          <InsightTitle theme={theme}>💡 Insights de tu Práctica</InsightTitle>
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
