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
import { 
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { RUBRIC_PROGRESS_META } from '../../services/progressSnapshot';
import {
  ANALYTICS_RUBRIC_IDS,
  getSessionAverageForRubrics,
  getSessionAttemptCount,
  getSessionRubricScore,
  getSessionTimestamp,
  hasSessionScoreForRubrics
} from '../../services/progressAnalyticsView';

const TIME_RANGE_WINDOWS = {
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  quarter: 90 * 24 * 60 * 60 * 1000
};

const RUBRIC_OPTIONS = [
  { id: 'all', name: 'Todas las Rubricas', shortLabel: 'Todas', icon: '📊', color: '#3B82F6' },
  ...ANALYTICS_RUBRIC_IDS.map((rubricId) => ({
    id: rubricId,
    name: RUBRIC_PROGRESS_META[rubricId]?.name || rubricId,
    shortLabel: RUBRIC_PROGRESS_META[rubricId]?.shortName || rubricId,
    icon: RUBRIC_PROGRESS_META[rubricId]?.icon || '📘',
    color: RUBRIC_PROGRESS_META[rubricId]?.color || '#3B82F6'
  }))
];

const TOOLTIP_RUBRIC_OPTIONS = ANALYTICS_RUBRIC_IDS.map((rubricId) => ({
  id: rubricId,
  icon: RUBRIC_PROGRESS_META[rubricId]?.icon || '📘',
  shortLabel: RUBRIC_PROGRESS_META[rubricId]?.shortName || rubricId
}));

function isSessionInTimeRange(session, range, now = Date.now()) {
  if (range === 'all') return true;
  const windowMs = TIME_RANGE_WINDOWS[range];
  if (!windowMs) return true;
  const timestamp = getSessionTimestamp(session);
  return timestamp >= (now - windowMs);
}

const AnalyticsDashboard = ({ sessions, theme }) => {
  const [timeRange, setTimeRange] = useState('all'); // 'week' | 'month' | 'quarter' | 'all'
  const [selectedRubric, setSelectedRubric] = useState('all'); // 'all' | 'rubrica1' | ...
  const rubrics = RUBRIC_OPTIONS;

  // Filtrar sesiones con progreso
  const sessionsWithProgress = useMemo(() => {
    return sessions.filter((session) =>
      Boolean(session?.progressSnapshot?.hasData) ||
      Boolean(session?.rubricProgress && Object.keys(session.rubricProgress).length > 0)
    );
  }, [sessions]);

  const selectedRubricIds = useMemo(() => (
    selectedRubric === 'all' ? ANALYTICS_RUBRIC_IDS : [selectedRubric]
  ), [selectedRubric]);

  // Aplicar filtro temporal
  const filteredByTime = useMemo(() => {
    return sessionsWithProgress.filter((session) => isSessionInTimeRange(session, timeRange));
  }, [sessionsWithProgress, timeRange]);

  const periodOptions = useMemo(() => {
    const options = [
      { value: 'week', label: 'Última semana' },
      { value: 'month', label: 'Último mes' },
      { value: 'quarter', label: '3 meses' },
      { value: 'all', label: 'Todo' }
    ];

    return options.map((option) => ({
      ...option,
      count: sessionsWithProgress.filter((session) => (
        isSessionInTimeRange(session, option.value) &&
        hasSessionScoreForRubrics(session, selectedRubricIds)
      )).length
    }));
  }, [selectedRubricIds, sessionsWithProgress]);

  // Calcular datos del dashboard
  const dashboardData = useMemo(() => {
    if (filteredByTime.length === 0) return null;

    const rubricIds = selectedRubricIds;
    const comparableSessions = filteredByTime
      .filter((session) => hasSessionScoreForRubrics(session, rubricIds))
      .sort((a, b) => getSessionTimestamp(a) - getSessionTimestamp(b));

    if (comparableSessions.length === 0) {
      return {
        hasComparableData: false,
        sessionScores: [],
        stats: {
          totalSessions: 0,
          averageScore: 0,
          maxScore: 0,
          minScore: 0,
          totalAttempts: 0,
          trendPercentage: 0,
          trendDirection: 'stable'
        },
        distribution: {
          excelente: 0,
          bueno: 0,
          regular: 0,
          bajo: 0
        },
        rubricProgress: null
      };
    }

    // Calcular promedios por sesión
    const sessionScores = comparableSessions.map((session, index) => {
      const average = getSessionAverageForRubrics(session, rubricIds);
      const rubricState = ANALYTICS_RUBRIC_IDS.reduce((acc, rubricId) => {
        const hasData = hasSessionScoreForRubrics(session, [rubricId]);
        const score = getSessionRubricScore(session, rubricId);
        acc[rubricId] = hasData ? Math.round(score * 10) / 10 : null;
        acc[`${rubricId}HasData`] = hasData;
        return acc;
      }, {});

      return {
        sessionNumber: index + 1,
        sessionTitle: session.title || `Sesión ${index + 1}`,
        average: Math.round(average * 10) / 10,
        timestamp: getSessionTimestamp(session),
        date: new Date(getSessionTimestamp(session)).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short'
        }),
        ...rubricState
      };
    });

    // Calcular estadísticas generales
    const allScores = sessionScores.map(s => s.average);
    const totalAttempts = comparableSessions.reduce((sum, session) => (
      sum + getSessionAttemptCount(session, rubricIds)
    ), 0);

    // Calcular tendencia (comparar primera vs segunda mitad)
    const midpoint = Math.ceil(allScores.length / 2);
    const firstHalf = allScores.slice(0, midpoint);
    const secondHalf = allScores.slice(midpoint);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : avgFirst;
    const trendPercentage = avgFirst > 0
      ? ((avgSecond - avgFirst) / avgFirst) * 100
      : (avgSecond > 0 ? 100 : 0);
    const roundedTrendPercentage = Math.round(trendPercentage * 10) / 10;
    const normalizedTrendPercentage = Math.abs(roundedTrendPercentage) < 0.05 ? 0 : roundedTrendPercentage;
    const trendDirection = normalizedTrendPercentage > 0
      ? 'improving'
      : (normalizedTrendPercentage < 0 ? 'declining' : 'stable');

    // Distribución de puntuaciones
    const distribution = {
      excelente: allScores.filter(s => s >= 8).length,
      bueno: allScores.filter(s => s >= 6 && s < 8).length,
      regular: allScores.filter(s => s >= 4 && s < 6).length,
      bajo: allScores.filter(s => s < 4).length
    };

    // Progreso por rúbrica (solo si "Todas")
    const rubricProgress = selectedRubric === 'all'
      ? rubricIds
        .map((rubricId) => {
          const allRubricScores = comparableSessions
            .map((session) => getSessionRubricScore(session, rubricId))
            .filter((score) => score > 0);

          if (allRubricScores.length === 0) {
            return null;
          }

          const avg = allRubricScores.reduce((sum, score) => sum + score, 0) / allRubricScores.length;
          const rubricMeta = rubrics.find((rubric) => rubric.id === rubricId);

          return {
            id: rubricId,
            name: rubricMeta?.name,
            icon: rubricMeta?.icon,
            average: Math.round(avg * 10) / 10,
            color: rubricMeta?.color
          };
        })
        .filter(Boolean)
      : null;

    return {
      hasComparableData: true,
      sessionScores,
      stats: {
        totalSessions: comparableSessions.length,
        averageScore: Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10,
        maxScore: Math.max(...allScores),
        minScore: Math.min(...allScores),
        totalAttempts,
        trendPercentage: normalizedTrendPercentage,
        trendDirection
      },
      distribution,
      rubricProgress: rubricProgress?.length > 0 ? rubricProgress : null
    };
  }, [filteredByTime, rubrics, selectedRubric, selectedRubricIds]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const formatRubricValue = (rubricId) => (
      data[`${rubricId}HasData`] ? `${data[rubricId].toFixed(1)}/10` : 'Sin dato'
    );
    return (
      <TooltipContainer theme={theme}>
        <TooltipTitle>{data.sessionTitle}</TooltipTitle>
        <TooltipDate>{data.date}</TooltipDate>
        <TooltipDivider />
        {selectedRubric === 'all' ? (
          <>
            <TooltipStat><strong>Promedio con evidencia:</strong> {data.average.toFixed(1)}/10</TooltipStat>
            <TooltipDivider />
            {TOOLTIP_RUBRIC_OPTIONS.map((rubric) => (
              <TooltipStat key={rubric.id}>
                {rubric.icon} {rubric.shortLabel}: {formatRubricValue(rubric.id)}
              </TooltipStat>
            ))}
          </>
        ) : (
          <TooltipStat>
            <strong>{rubrics.find(r => r.id === selectedRubric)?.name}:</strong> {formatRubricValue(selectedRubric)}
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

  const resultDistributionData = dashboardData ? [
    { name: 'Excelente\n(8-10)', count: dashboardData.distribution.excelente, fill: '#10B981' },
    { name: 'Bueno\n(6-8)', count: dashboardData.distribution.bueno, fill: '#F59E0B' },
    { name: 'Regular\n(4-6)', count: dashboardData.distribution.regular, fill: '#F97316' },
    { name: 'Bajo\n(<4)', count: dashboardData.distribution.bajo, fill: '#EF4444' }
  ] : [];
  const trendDirection = dashboardData?.stats?.trendDirection || 'stable';
  const trendIcon = trendDirection === 'improving' ? '📈' : trendDirection === 'declining' ? '📉' : '➡️';
  const trendColor = trendDirection === 'improving'
    ? '#10B981'
    : (trendDirection === 'declining' ? '#EF4444' : (theme.textMuted || '#6B7280'));
  const trendPrefix = trendDirection === 'improving' ? '+' : '';

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
            {periodOptions.map(option => (
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
                {rubric.icon} {rubric.shortLabel}
              </FilterButton>
            ))}
          </FilterButtons>
        </FilterGroup>
      </FiltersSection>

      {!dashboardData.hasComparableData ? (
        <EmptyState theme={theme}>
          <EmptyIcon>ðŸ”Ž</EmptyIcon>
          <EmptyText>No hay notas comparables para este filtro</EmptyText>
          <EmptyHint>
            {selectedRubric === 'all'
              ? 'AÃºn no existen sesiones con evidencia evaluada suficiente en este perÃ­odo.'
              : 'Esta rÃºbrica todavÃ­a no tiene puntuaciones registradas en el perÃ­odo seleccionado.'}
          </EmptyHint>
        </EmptyState>
      ) : (
        <>
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
          <KPIIcon>{trendIcon}</KPIIcon>
          <KPIValue 
            $color={trendColor}
          >
            {trendPrefix}
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
            {selectedRubric === 'all'
              ? 'Promedio de rúbricas con evidencia por sesión'
              : rubrics.find(r => r.id === selectedRubric)?.name}
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
              <BarChart data={resultDistributionData}>
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
                  {resultDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
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
        </>
      )}
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
