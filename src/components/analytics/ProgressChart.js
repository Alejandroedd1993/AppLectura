/**
 * ProgressChart - Gráfico de evolución temporal de progreso por rúbrica
 * Muestra cómo ha evolucionado el puntaje en cada dimensión a lo largo del tiempo
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  rubrica1: '#3B82F6', // Azul - Comprensión
  rubrica2: '#8B5CF6', // Púrpura - ACD
  rubrica3: '#10B981', // Verde - Contextualización
  rubrica4: '#F59E0B', // Naranja - Argumentación
  rubrica5: '#EF4444', // Rojo - Metacognición
};

const RUBRIC_NAMES = {
  rubrica1: 'Comprensión',
  rubrica2: 'ACD',
  rubrica3: 'Contextualización',
  rubrica4: 'Argumentación',
  rubrica5: 'Metacognición',
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
            {entry.name}: <strong>{entry.value.toFixed(1)}</strong>/10
          </span>
        </TooltipItem>
      ))}
    </CustomTooltip>
  );
};

const ProgressChart = ({ rubricProgress = {}, theme }) => {
  // Transformar datos para el gráfico
  const chartData = useMemo(() => {
    // Obtener todas las rúbricas con datos
    const rubrics = Object.entries(rubricProgress).filter(
      ([key, data]) => key.startsWith('rubrica') && data.scores?.length > 0
    );

    if (rubrics.length === 0) return [];

    // Encontrar el máximo número de intentos
    const maxAttempts = Math.max(...rubrics.map(([_, data]) => data.scores.length));

    // Crear array de datos por intento
    const data = [];
    for (let i = 0; i < maxAttempts; i++) {
      const point = { attempt: i + 1 };
      
      rubrics.forEach(([rubricId, rubricData]) => {
        if (rubricData.scores[i] !== undefined) {
          const score = typeof rubricData.scores[i] === 'object' 
            ? Number(rubricData.scores[i].score) 
            : Number(rubricData.scores[i]);
          point[rubricId] = score;
        }
      });
      
      data.push(point);
    }

    return data;
  }, [rubricProgress]);

  const activeRubrics = useMemo(() => {
    return Object.keys(rubricProgress).filter(
      key => key.startsWith('rubrica') && rubricProgress[key]?.scores?.length > 0
    );
  }, [rubricProgress]);

  if (chartData.length === 0) {
    return (
      <ChartContainer theme={theme}>
        <ChartTitle theme={theme}>📈 Evolución Temporal</ChartTitle>
        <EmptyState theme={theme}>
          <p>📊 Aún no hay suficientes datos para generar el gráfico</p>
          <p>Completa al menos 2 evaluaciones en una rúbrica para ver tu progreso</p>
        </EmptyState>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer theme={theme}>
      <ChartTitle theme={theme}>📈 Evolución Temporal de Progreso</ChartTitle>
      <ChartDescription theme={theme}>
        Observa cómo ha evolucionado tu desempeño en cada dimensión a lo largo de tus intentos.
        Las líneas ascendentes indican mejora continua.
      </ChartDescription>

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
              value: 'Número de Intento', 
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
              value: 'Puntuación (0-10)', 
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
          
          {activeRubrics.map(rubricId => (
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
