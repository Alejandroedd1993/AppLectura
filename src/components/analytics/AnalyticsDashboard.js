/**
 * AnalyticsDashboard - Dashboard interactivo con filtros temporales
 * FASE 3 Parte 3: Dashboard con filtros avanzados
 * 
 * Features:
 * - Filtros temporales (última semana, mes, trimestre, todo)
 * - Filtro por rúbrica específica
 * - Estadísticas en tiempo real
 * - Gráficos adaptativos según filtros
 * - Exportación de reportes filtrados
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Area, AreaChart 
} from 'recharts';

const AnalyticsDashboard = ({ sessions, theme }) => {
  const [timeRange, setTimeRange] = useState('all'); // 'week' | 'month' | 'quarter' | 'all'
  const [selectedRubric, setSelectedRubric] = useState('all'); // 'all' | 'rubrica1' | ...

  // Definición de rúbricas
  const rubrics = [
    { id: 'all', name: 'Todas las Rúbricas', icon: '📊', color: '#3B82F6' },
    { id: 'rubrica1', name: 'Comprensión Literal', icon: '📖', color: '#3B82F6' },
    { id: 'rubrica2', name: 'Análisis Crítico', icon: '🔍', color: '#8B5CF6' },
    { id: 'rubrica3', name: 'Contextualización', icon: '🌍', color: '#10B981' },
    { id: 'rubrica4', name: 'Argumentación', icon: '💬', color: '#F59E0B' },
    { id: 'rubrica5', name: 'Metacognición', icon: '🧠', color: '#EF4444' }
  ];

  // Filtrar sesiones con progreso
  const sessionsWithProgress = useMemo(() => {
    return sessions.filter(s => s.rubricProgress && Object.keys(s.rubricProgress).length > 0);
  }, [sessions]);

  // Aplicar filtro temporal
  const filteredByTime = useMemo(() => {
    if (timeRange === 'all') return sessionsWithProgress;

    const now = Date.now();
    const ranges = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000
    };

    const cutoff = now - ranges[timeRange];
    return sessionsWithProgress.filter(s => {
      const timestamp = s.timestamp || s.createdAt || 0;
      return timestamp >= cutoff;
    });
  }, [sessionsWithProgress, timeRange]);

  // Calcular datos del dashboard
  const dashboardData = useMemo(() => {
    if (filteredByTime.length === 0) return null;

    const rubricIds = selectedRubric === 'all' 
      ? ['rubrica1', 'rubrica2', 'rubrica3', 'rubrica4', 'rubrica5']
      : [selectedRubric];

    // Calcular promedios por sesión
    const sessionScores = filteredByTime.map((session, index) => {
      const progress = session.rubricProgress || {};
      
      const scores = rubricIds.map(rubricId => progress[rubricId]?.average || 0);
      const average = scores.reduce((sum, val) => sum + val, 0) / scores.length;

      return {
        sessionNumber: index + 1,
        sessionTitle: session.title || `Sesión ${index + 1}`,
        average: Math.round(average * 10) / 10,
        rubrica1: progress.rubrica1?.average || 0,
        rubrica2: progress.rubrica2?.average || 0,
        rubrica3: progress.rubrica3?.average || 0,
        rubrica4: progress.rubrica4?.average || 0,
        rubrica5: progress.rubrica5?.average || 0,
        timestamp: session.timestamp || session.createdAt,
        date: new Date(session.timestamp || session.createdAt).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short'
        })
      };
    });

    // Calcular estadísticas generales
    const allScores = sessionScores.map(s => s.average);
    const totalAttempts = sessionScores.reduce((sum, s) => {
      const progress = filteredByTime[sessionScores.indexOf(s)].rubricProgress || {};
      return sum + rubricIds.reduce((acc, id) => 
        acc + (progress[id]?.scores?.length || 0), 0
      );
    }, 0);

    // Calcular tendencia (comparar primera vs segunda mitad)
    const midpoint = Math.ceil(allScores.length / 2);
    const firstHalf = allScores.slice(0, midpoint);
    const secondHalf = allScores.slice(midpoint);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendPercentage = ((avgSecond - avgFirst) / avgFirst) * 100;

    // Distribución de puntuaciones
    const distribution = {
      excelente: allScores.filter(s => s >= 8).length,
      bueno: allScores.filter(s => s >= 6 && s < 8).length,
      regular: allScores.filter(s => s >= 4 && s < 6).length,
      bajo: allScores.filter(s => s < 4).length
    };

    // Progreso por rúbrica (solo si "Todas")
    const rubricProgress = selectedRubric === 'all' ? rubricIds.map(rubricId => {
      const allRubricScores = filteredByTime.map(s => 
        s.rubricProgress?.[rubricId]?.average || 0
      );
      const avg = allRubricScores.reduce((a, b) => a + b, 0) / allRubricScores.length;
      
      return {
        id: rubricId,
        name: rubrics.find(r => r.id === rubricId)?.name,
        icon: rubrics.find(r => r.id === rubricId)?.icon,
        average: Math.round(avg * 10) / 10,
        color: rubrics.find(r => r.id === rubricId)?.color
      };
    }) : null;

    return {
      sessionScores,
      stats: {
        totalSessions: filteredByTime.length,
        averageScore: Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10,
        maxScore: Math.max(...allScores),
        minScore: Math.min(...allScores),
        totalAttempts,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
        isImproving: trendPercentage > 0
      },
      distribution,
      rubricProgress
    };
  }, [filteredByTime, selectedRubric, rubrics]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <TooltipContainer theme={theme}>
        <TooltipTitle>{data.sessionTitle}</TooltipTitle>
        <TooltipDate>{data.date}</TooltipDate>
        <TooltipDivider />
        {selectedRubric === 'all' ? (
          <>
            <TooltipStat><strong>Promedio General:</strong> {data.average.toFixed(1)}/10</TooltipStat>
            <TooltipDivider />
            <TooltipStat>📖 Comprensión: {data.rubrica1.toFixed(1)}</TooltipStat>
            <TooltipStat>🔍 ACD: {data.rubrica2.toFixed(1)}</TooltipStat>
            <TooltipStat>🌍 Contextualización: {data.rubrica3.toFixed(1)}</TooltipStat>
            <TooltipStat>💬 Argumentación: {data.rubrica4.toFixed(1)}</TooltipStat>
            <TooltipStat>🧠 Metacognición: {data.rubrica5.toFixed(1)}</TooltipStat>
          </>
        ) : (
          <TooltipStat>
            <strong>{rubrics.find(r => r.id === selectedRubric)?.name}:</strong> {data[selectedRubric].toFixed(1)}/10
          </TooltipStat>
        )}
      </TooltipContainer>
    );
  };

  if (sessionsWithProgress.length === 0) {
    return (
      <EmptyState theme={theme}>
        <EmptyIcon>📊</EmptyIcon>
        <EmptyText>No hay sesiones con progreso</EmptyText>
        <EmptyHint>Completa evaluaciones para ver el dashboard</EmptyHint>
      </EmptyState>
    );
  }

  if (filteredByTime.length === 0) {
    return (
      <Container>
        <Header>
          <Title theme={theme}>📊 Dashboard de Analíticas</Title>
        </Header>

        {/* Filtros */}
        <FiltersSection>
          <FilterGroup>
            <FilterLabel theme={theme}>📅 Período</FilterLabel>
            <FilterButtons>
              {[
                { value: 'week', label: 'Última semana' },
                { value: 'month', label: 'Último mes' },
                { value: 'quarter', label: 'Últimos 3 meses' },
                { value: 'all', label: 'Todo el tiempo' }
              ].map(option => (
                <FilterButton
                  key={option.value}
                  theme={theme}
                  $active={timeRange === option.value}
                  onClick={() => setTimeRange(option.value)}
                >
                  {option.label}
                </FilterButton>
              ))}
            </FilterButtons>
          </FilterGroup>
        </FiltersSection>

        <EmptyState theme={theme}>
          <EmptyIcon>🔍</EmptyIcon>
          <EmptyText>No hay datos en este período</EmptyText>
          <EmptyHint>Intenta seleccionar un rango de tiempo más amplio</EmptyHint>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title theme={theme}>📊 Dashboard de Analíticas</Title>
        <Subtitle theme={theme}>
          Análisis interactivo de tu progreso académico
        </Subtitle>
      </Header>

      {/* Filtros */}
      <FiltersSection>
        <FilterGroup>
          <FilterLabel theme={theme}>📅 Período</FilterLabel>
          <FilterButtons>
            {[
              { value: 'week', label: 'Última semana', count: sessionsWithProgress.filter(s => {
                const now = Date.now();
                const week = 7 * 24 * 60 * 60 * 1000;
                return (s.timestamp || s.createdAt || 0) >= (now - week);
              }).length },
              { value: 'month', label: 'Último mes', count: sessionsWithProgress.filter(s => {
                const now = Date.now();
                const month = 30 * 24 * 60 * 60 * 1000;
                return (s.timestamp || s.createdAt || 0) >= (now - month);
              }).length },
              { value: 'quarter', label: '3 meses', count: sessionsWithProgress.filter(s => {
                const now = Date.now();
                const quarter = 90 * 24 * 60 * 60 * 1000;
                return (s.timestamp || s.createdAt || 0) >= (now - quarter);
              }).length },
              { value: 'all', label: 'Todo', count: sessionsWithProgress.length }
            ].map(option => (
              <FilterButton
                key={option.value}
                theme={theme}
                $active={timeRange === option.value}
                onClick={() => setTimeRange(option.value)}
              >
                {option.label}
                <FilterCount theme={theme} $active={timeRange === option.value}>
                  {option.count}
                </FilterCount>
              </FilterButton>
            ))}
          </FilterButtons>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel theme={theme}>🎯 Rúbrica</FilterLabel>
          <FilterButtons>
            {rubrics.map(rubric => (
              <FilterButton
                key={rubric.id}
                theme={theme}
                $active={selectedRubric === rubric.id}
                onClick={() => setSelectedRubric(rubric.id)}
              >
                {rubric.icon} {rubric.name.split(' ')[0]}
              </FilterButton>
            ))}
          </FilterButtons>
        </FilterGroup>
      </FiltersSection>

      {/* KPIs principales */}
      <KPIsGrid>
        <KPICard theme={theme}>
          <KPIIcon>📚</KPIIcon>
          <KPIValue>{dashboardData.stats.totalSessions}</KPIValue>
          <KPILabel>Sesiones</KPILabel>
        </KPICard>

        <KPICard theme={theme}>
          <KPIIcon>🎯</KPIIcon>
          <KPIValue>{dashboardData.stats.averageScore.toFixed(1)}/10</KPIValue>
          <KPILabel>Promedio</KPILabel>
        </KPICard>

        <KPICard theme={theme}>
          <KPIIcon>🏆</KPIIcon>
          <KPIValue>{dashboardData.stats.maxScore.toFixed(1)}/10</KPIValue>
          <KPILabel>Mejor Score</KPILabel>
        </KPICard>

        <KPICard theme={theme}>
          <KPIIcon>
            {dashboardData.stats.isImproving ? '📈' : '📉'}
          </KPIIcon>
          <KPIValue 
            $color={dashboardData.stats.isImproving ? '#10B981' : '#EF4444'}
          >
            {dashboardData.stats.isImproving ? '+' : ''}
            {dashboardData.stats.trendPercentage}%
          </KPIValue>
          <KPILabel>Tendencia</KPILabel>
        </KPICard>
      </KPIsGrid>

      {/* Gráfico principal de evolución */}
      <ChartSection>
        <SectionHeader>
          <SectionTitle theme={theme}>
            📈 Evolución Temporal
          </SectionTitle>
          <ChartLegend theme={theme}>
            {selectedRubric === 'all' ? 'Promedio de todas las rúbricas' : rubrics.find(r => r.id === selectedRubric)?.name}
          </ChartLegend>
        </SectionHeader>
        
        <ChartContainer>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboardData.sessionScores}>
              <defs>
                <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primary || '#3B82F6'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme.primary || '#3B82F6'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border || '#E5E7EB'} />
              <XAxis 
                dataKey="date" 
                stroke={theme.textMuted || '#6B7280'}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 10]} 
                stroke={theme.textMuted || '#6B7280'}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey={selectedRubric === 'all' ? 'average' : selectedRubric}
                stroke={theme.primary || '#3B82F6'} 
                strokeWidth={2.5}
                fill="url(#colorAverage)"
                dot={{ r: 4, fill: theme.primary || '#3B82F6' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </ChartSection>

      {/* Distribución de puntuaciones */}
      <TwoColumnsGrid>
        <ChartSection>
          <SectionTitle theme={theme}>📊 Distribución de Resultados</SectionTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart 
                data={[
                  { name: 'Excelente\n(8-10)', count: dashboardData.distribution.excelente, fill: '#10B981' },
                  { name: 'Bueno\n(6-8)', count: dashboardData.distribution.bueno, fill: '#F59E0B' },
                  { name: 'Regular\n(4-6)', count: dashboardData.distribution.regular, fill: '#F97316' },
                  { name: 'Bajo\n(<4)', count: dashboardData.distribution.bajo, fill: '#EF4444' }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border || '#E5E7EB'} />
                <XAxis 
                  dataKey="name" 
                  stroke={theme.textMuted || '#6B7280'}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke={theme.textMuted || '#6B7280'}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    background: theme.surface || '#FFFFFF',
                    border: `1px solid ${theme.border || '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {[
                    { name: 'Excelente\n(8-10)', count: dashboardData.distribution.excelente, fill: '#10B981' },
                    { name: 'Bueno\n(6-8)', count: dashboardData.distribution.bueno, fill: '#F59E0B' },
                    { name: 'Regular\n(4-6)', count: dashboardData.distribution.regular, fill: '#F97316' },
                    { name: 'Bajo\n(<4)', count: dashboardData.distribution.bajo, fill: '#EF4444' }
                  ].map((entry, index) => (
                    <Bar key={`cell-${index}`} dataKey="count" fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartSection>

        {/* Progreso por rúbrica (solo cuando "Todas") */}
        {dashboardData.rubricProgress && (
          <ProgressByRubric>
            <SectionTitle theme={theme}>📋 Progreso por Competencia</SectionTitle>
            <RubricsList>
              {dashboardData.rubricProgress
                .sort((a, b) => b.average - a.average)
                .map(rubric => (
                  <RubricItem key={rubric.id} theme={theme}>
                    <RubricHeader>
                      <RubricIcon>{rubric.icon}</RubricIcon>
                      <RubricName>{rubric.name}</RubricName>
                    </RubricHeader>
                    <RubricProgressBar>
                      <RubricProgressFill 
                        $percent={(rubric.average / 10) * 100}
                        $color={rubric.color}
                      />
                    </RubricProgressBar>
                    <RubricScore $color={rubric.color}>
                      {rubric.average.toFixed(1)}/10
                    </RubricScore>
                  </RubricItem>
                ))}
            </RubricsList>
          </ProgressByRubric>
        )}
      </TwoColumnsGrid>

      {/* Resumen estadístico */}
      <SummarySection theme={theme}>
        <SectionTitle theme={theme}>📈 Resumen del Período</SectionTitle>
        <SummaryGrid>
          <SummaryCard theme={theme}>
            <SummaryLabel>Total de intentos</SummaryLabel>
            <SummaryValue>{dashboardData.stats.totalAttempts}</SummaryValue>
          </SummaryCard>
          <SummaryCard theme={theme}>
            <SummaryLabel>Puntuación máxima</SummaryLabel>
            <SummaryValue>{dashboardData.stats.maxScore.toFixed(1)}/10</SummaryValue>
          </SummaryCard>
          <SummaryCard theme={theme}>
            <SummaryLabel>Puntuación mínima</SummaryLabel>
            <SummaryValue>{dashboardData.stats.minScore.toFixed(1)}/10</SummaryValue>
          </SummaryCard>
          <SummaryCard theme={theme}>
            <SummaryLabel>Rango de tiempo</SummaryLabel>
            <SummaryValue>
              {timeRange === 'week' ? '7 días' :
               timeRange === 'month' ? '30 días' :
               timeRange === 'quarter' ? '90 días' :
               'Todo el historial'}
            </SummaryValue>
          </SummaryCard>
        </SummaryGrid>
      </SummarySection>
    </Container>
  );
};

// Styled Components

const Container = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  text-align: center;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.text || '#1F2937'};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.textMuted || '#6B7280'};
  margin: 0;
`;

const FiltersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: ${props => props.theme?.surfaceVariant || '#F9FAFB'};
  border-radius: 12px;
  border: 1px solid ${props => props.theme?.border || '#E5E7EB'};
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const FilterLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.theme.text || '#1F2937'};
`;

const FilterButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$active 
    ? (props.theme.primary || '#3B82F6')
    : (props.theme.background || '#FFFFFF')
  };
  color: ${props => props.$active 
    ? '#FFFFFF'
    : (props.theme.text || '#1F2937')
  };
  border: 1px solid ${props => props.$active 
    ? (props.theme.primary || '#3B82F6')
    : (props.theme.border || '#E5E7EB')
  };
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.$active 
      ? (props.theme.primaryDark || '#2563EB')
      : (props.theme.surfaceVariant || '#F3F4F6')
    };
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const FilterCount = styled.span`
  padding: 0.125rem 0.375rem;
  background: ${props => props.$active 
    ? 'rgba(255, 255, 255, 0.2)'
    : (props.theme.surfaceVariant || '#E5E7EB')
  };
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const KPIsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const KPICard = styled.div`
  background: ${props => props.theme.surfaceVariant || '#F9FAFB'};
  border: 1px solid ${props => props.theme.border || '#E5E7EB'};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const KPIIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const KPIValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.$color || (props.theme?.text || '#1F2937')};
  margin-bottom: 0.25rem;
`;

const KPILabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.textMuted || '#6B7280'};
  font-weight: 500;
`;

const ChartSection = styled.div`
  background: ${props => props.theme?.background || '#FFFFFF'};
  border: 1px solid ${props => props.theme?.border || '#E5E7EB'};
  border-radius: 12px;
  padding: 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.text || '#1F2937'};
  margin: 0;
`;

const ChartLegend = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted || '#6B7280'};
  font-style: italic;
`;

const ChartContainer = styled.div`
  width: 100%;
`;

const TwoColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const ProgressByRubric = styled.div`
  background: ${props => props.theme?.background || '#FFFFFF'};
  border: 1px solid ${props => props.theme?.border || '#E5E7EB'};
  border-radius: 12px;
  padding: 1.5rem;
`;

const RubricsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const RubricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const RubricHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RubricIcon = styled.span`
  font-size: 1.25rem;
`;

const RubricName = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${props => props.theme?.text || '#1F2937'};
`;

const RubricProgressBar = styled.div`
  height: 8px;
  background: ${props => props.theme?.border || '#E5E7EB'};
  border-radius: 4px;
  overflow: hidden;
`;

const RubricProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => props.$color || '#3B82F6'};
  transition: width 0.5s ease;
  border-radius: 4px;
`;

const RubricScore = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.$color || '#1F2937'};
  text-align: right;
`;

const SummarySection = styled.div`
  background: ${props => props.theme.surfaceVariant || '#F9FAFB'};
  border: 1px solid ${props => props.theme.border || '#E5E7EB'};
  border-radius: 12px;
  padding: 1.5rem;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const SummaryCard = styled.div`
  background: ${props => props.theme.background || '#FFFFFF'};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const SummaryLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted || '#6B7280'};
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.text || '#1F2937'};
`;

const TooltipContainer = styled.div`
  background: ${props => props.theme.surface || '#FFFFFF'};
  border: 1px solid ${props => props.theme.border || '#E5E7EB'};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const TooltipTitle = styled.div`
  font-weight: 600;
  color: ${props => props.theme?.text || '#1F2937'};
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`;

const TooltipDate = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme?.textMuted || '#9CA3AF'};
  margin-bottom: 0.5rem;
`;

const TooltipStat = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme?.textMuted || '#6B7280'};
  margin: 0.25rem 0;

  strong {
    font-weight: 600;
    color: ${props => props.theme?.text || '#1F2937'};
  }
`;

const TooltipDivider = styled.div`
  height: 1px;
  background: ${props => props.theme?.border || '#E5E7EB'};
  margin: 0.5rem 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${props => props.theme.textMuted || '#6B7280'};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.text || '#1F2937'};
`;

const EmptyHint = styled.div`
  font-size: 0.9rem;
`;

export default AnalyticsDashboard;
