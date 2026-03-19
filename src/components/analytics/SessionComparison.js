/**
 * SessionComparison - Comparación de progreso entre múltiples sesiones
 * FASE 3 Parte 2: Analytics Cross-Session
 * 
 * Features:
 * - Tabla comparativa de sesiones
 * - Gráfico de tendencia de mejora
 * - Identificación de patrones de aprendizaje
 * - Métricas agregadas (mejor sesión, promedio global, etc.)
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useMediaQuery from '../../hooks/useMediaQuery';

function getSessionRubricScore(session, rubricId) {
  const snapshotScore = Number(session?.progressSnapshot?.rubricsById?.[rubricId]?.effectiveScore || 0);
  if (snapshotScore > 0) return snapshotScore;
  return Number(session?.rubricProgress?.[rubricId]?.average || 0);
}

function getSessionAverageScore(session) {
  const snapshotEvaluated = Number(session?.progressSnapshot?.summary?.evaluatedCount || 0);
  if (snapshotEvaluated > 0) {
    return Number(session?.progressSnapshot?.summary?.averageEvaluatedScore || 0);
  }

  const progress = session?.rubricProgress || {};
  const rubrics = Object.keys(progress).filter((key) => key.startsWith('rubrica'));
  if (rubrics.length === 0) return 0;

  return rubrics.reduce((sum, key) => sum + Number(progress[key]?.average || 0), 0) / rubrics.length;
}

const SessionComparison = ({ sessions, theme }) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  // Filtrar sesiones con progreso de rúbricas
  const sessionsWithProgress = useMemo(() => {
    return sessions.filter((session) =>
      Boolean(session?.progressSnapshot?.hasData) ||
      Boolean(session?.rubricProgress && Object.keys(session.rubricProgress).length > 0)
    );
  }, [sessions]);

  // Calcular datos para gráfico de tendencia
  const trendData = useMemo(() => {
    if (sessionsWithProgress.length === 0) return [];
    return sessionsWithProgress
      .sort((a, b) => (a.timestamp || a.createdAt) - (b.timestamp || b.createdAt))
      .map((session, index) => {
        return {
          sessionNumber: index + 1,
          sessionTitle: session.title || `Sesión ${index + 1}`,
          promedio: Math.round(getSessionAverageScore(session) * 10) / 10,
          rubrica1: getSessionRubricScore(session, 'rubrica1'),
          rubrica2: getSessionRubricScore(session, 'rubrica2'),
          rubrica3: getSessionRubricScore(session, 'rubrica3'),
          rubrica4: getSessionRubricScore(session, 'rubrica4'),
          rubrica5: getSessionRubricScore(session, 'rubrica5'),
          timestamp: session.timestamp || session.createdAt
        };
      });
  }, [sessionsWithProgress]);

  // Calcular métricas agregadas
  const aggregateMetrics = useMemo(() => {
    if (trendData.length === 0) return null;

    const averages = trendData.map(d => d.promedio);
    const maxScore = Math.max(...averages);
    const minScore = Math.min(...averages);
    const globalAverage = averages.reduce((sum, val) => sum + val, 0) / averages.length;
    
    // Detectar tendencia (mejora/empeora)
    const firstHalf = averages.slice(0, Math.ceil(averages.length / 2));
    const secondHalf = averages.slice(Math.ceil(averages.length / 2));
    const avgFirstHalf = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    const trend = avgSecondHalf > avgFirstHalf ? 'mejora' : avgSecondHalf < avgFirstHalf ? 'declive' : 'estable';
    const trendDiff = Math.abs(avgSecondHalf - avgFirstHalf);

    // Identificar mejor y peor sesión
    const bestSessionIndex = averages.indexOf(maxScore);
    const worstSessionIndex = averages.indexOf(minScore);

    return {
      totalSessions: trendData.length,
      globalAverage: Math.round(globalAverage * 10) / 10,
      maxScore: Math.round(maxScore * 10) / 10,
      minScore: Math.round(minScore * 10) / 10,
      trend,
      trendDiff: Math.round(trendDiff * 10) / 10,
      bestSession: trendData[bestSessionIndex],
      worstSession: trendData[worstSessionIndex],
      improvement: maxScore - minScore
    };
  }, [trendData]);

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <TooltipContainer theme={theme}>
        <TooltipTitle>{data.sessionTitle}</TooltipTitle>
        <TooltipStat>
          <strong>Promedio:</strong> {data.promedio.toFixed(1)}/10
        </TooltipStat>
        <TooltipDivider />
        <TooltipStat>📖 Comprensión: {data.rubrica1.toFixed(1)}</TooltipStat>
        <TooltipStat>🔍 ACD: {data.rubrica2.toFixed(1)}</TooltipStat>
        <TooltipStat>🌍 Contextualización: {data.rubrica3.toFixed(1)}</TooltipStat>
        <TooltipStat>💬 Argumentación: {data.rubrica4.toFixed(1)}</TooltipStat>
        <TooltipStat>🧠 Metacognición: {data.rubrica5.toFixed(1)}</TooltipStat>
      </TooltipContainer>
    );
  };

  if (sessionsWithProgress.length === 0) {
    return (
      <EmptyState theme={theme}>
        <EmptyIcon>📊</EmptyIcon>
        <EmptyText>No hay sesiones con progreso para comparar</EmptyText>
        <EmptyHint>Completa evaluaciones en tus sesiones para ver comparaciones</EmptyHint>
      </EmptyState>
    );
  }

  if (sessionsWithProgress.length === 1) {
    return (
      <EmptyState theme={theme}>
        <EmptyIcon>📈</EmptyIcon>
        <EmptyText>Se necesitan al menos 2 sesiones con progreso</EmptyText>
        <EmptyHint>Continúa trabajando en más textos para ver tu evolución</EmptyHint>
      </EmptyState>
    );
  }

  return (
    <Container>
      <Header>
        <Title theme={theme}>
          📊 Comparación entre Sesiones
        </Title>
        <Subtitle theme={theme}>
          Analiza tu evolución a través de {aggregateMetrics.totalSessions} sesiones
        </Subtitle>
      </Header>

      {/* Métricas agregadas */}
      {aggregateMetrics && (
        <MetricsGrid>
          <MetricCard theme={theme}>
            <MetricIcon>🎯</MetricIcon>
            <MetricValue>{aggregateMetrics.globalAverage}/10</MetricValue>
            <MetricLabel>Promedio Global</MetricLabel>
          </MetricCard>

          <MetricCard theme={theme}>
            <MetricIcon>🏆</MetricIcon>
            <MetricValue>{aggregateMetrics.maxScore}/10</MetricValue>
            <MetricLabel>Mejor Sesión</MetricLabel>
            <MetricHint>{aggregateMetrics.bestSession.sessionTitle}</MetricHint>
          </MetricCard>

          <MetricCard theme={theme}>
            <MetricIcon>
              {aggregateMetrics.trend === 'mejora' ? '📈' : 
               aggregateMetrics.trend === 'declive' ? '📉' : '➡️'}
            </MetricIcon>
            <MetricValue 
              $color={aggregateMetrics.trend === 'mejora' ? '#10B981' : 
                      aggregateMetrics.trend === 'declive' ? '#EF4444' : '#6B7280'}
            >
              {aggregateMetrics.trend === 'mejora' ? '+' : 
               aggregateMetrics.trend === 'declive' ? '-' : ''}
              {aggregateMetrics.trendDiff}
            </MetricValue>
            <MetricLabel>
              Tendencia {aggregateMetrics.trend === 'mejora' ? 'positiva' : 
                         aggregateMetrics.trend === 'declive' ? 'negativa' : 'estable'}
            </MetricLabel>
          </MetricCard>

          <MetricCard theme={theme}>
            <MetricIcon>📚</MetricIcon>
            <MetricValue>{aggregateMetrics.totalSessions}</MetricValue>
            <MetricLabel>Sesiones Completadas</MetricLabel>
          </MetricCard>
        </MetricsGrid>
      )}

      {/* Gráfico de tendencia */}
      <ChartSection>
        <SectionTitle theme={theme}>📈 Evolución del Promedio</SectionTitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border || '#E5E7EB'} />
              <XAxis 
                dataKey="sessionNumber" 
                stroke={theme.textMuted || '#6B7280'}
                tick={{ fontSize: 12 }}
                label={{ value: 'Número de Sesión', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                domain={[0, 10]} 
                stroke={theme.textMuted || '#6B7280'}
                tick={{ fontSize: 12 }}
                label={{ value: 'Puntuación', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="promedio" 
                stroke={theme.primary || '#3B82F6'} 
                strokeWidth={3}
                dot={{ r: 5, fill: theme.primary || '#3B82F6' }}
                activeDot={{ r: 7 }}
                name="Promedio General"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </ChartSection>

      {/* Tabla comparativa detallada */}
      <TableSection>
        <SectionTitle theme={theme}>📋 Detalle por Sesión</SectionTitle>
        {isMobile ? (
          <SessionCards>
            {trendData.map((session, index) => {
              const isBest = session.sessionNumber === aggregateMetrics.bestSession.sessionNumber;
              return (
                <SessionCard key={index} $highlight={isBest}>
                  <SessionCardHeader>
                    <div>
                      <SessionTitleLine>Sesión {session.sessionNumber}</SessionTitleLine>
                      <SessionSubtitle>{session.sessionTitle}</SessionSubtitle>
                    </div>
                    <ScoreBadge $score={session.promedio}>
                      {session.promedio.toFixed(1)}
                    </ScoreBadge>
                  </SessionCardHeader>
                  <SessionStats>
                    <SessionStatItem>
                      <span className="label">📖</span>
                      <span className="value">{session.rubrica1.toFixed(1)}</span>
                    </SessionStatItem>
                    <SessionStatItem>
                      <span className="label">🔍</span>
                      <span className="value">{session.rubrica2.toFixed(1)}</span>
                    </SessionStatItem>
                    <SessionStatItem>
                      <span className="label">🌍</span>
                      <span className="value">{session.rubrica3.toFixed(1)}</span>
                    </SessionStatItem>
                    <SessionStatItem>
                      <span className="label">💬</span>
                      <span className="value">{session.rubrica4.toFixed(1)}</span>
                    </SessionStatItem>
                    <SessionStatItem>
                      <span className="label">🧠</span>
                      <span className="value">{session.rubrica5.toFixed(1)}</span>
                    </SessionStatItem>
                  </SessionStats>
                </SessionCard>
              );
            })}
          </SessionCards>
        ) : (
          <TableContainer>
            <Table theme={theme}>
              <thead>
                <tr>
                  <Th theme={theme}>#</Th>
                  <Th theme={theme}>Sesión</Th>
                  <Th theme={theme}>Promedio</Th>
                  <Th theme={theme}>📖</Th>
                  <Th theme={theme}>🔍</Th>
                  <Th theme={theme}>🌍</Th>
                  <Th theme={theme}>💬</Th>
                  <Th theme={theme}>🧠</Th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((session, index) => (
                  <Tr 
                    key={index} 
                    theme={theme}
                    $highlight={
                      session.sessionNumber === aggregateMetrics.bestSession.sessionNumber
                    }
                  >
                    <Td theme={theme}>{session.sessionNumber}</Td>
                    <Td theme={theme} $bold>{session.sessionTitle}</Td>
                    <Td theme={theme} $bold>
                      <ScoreBadge $score={session.promedio}>
                        {session.promedio.toFixed(1)}
                      </ScoreBadge>
                    </Td>
                    <Td theme={theme}>{session.rubrica1.toFixed(1)}</Td>
                    <Td theme={theme}>{session.rubrica2.toFixed(1)}</Td>
                    <Td theme={theme}>{session.rubrica3.toFixed(1)}</Td>
                    <Td theme={theme}>{session.rubrica4.toFixed(1)}</Td>
                    <Td theme={theme}>{session.rubrica5.toFixed(1)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        )}
      </TableSection>

      {/* Insights */}
      <InsightsSection theme={theme}>
        <SectionTitle theme={theme}>💡 Insights</SectionTitle>
        <InsightsList>
          {aggregateMetrics.trend === 'mejora' && (
            <InsightItem theme={theme} $type="success">
              <InsightIcon>✅</InsightIcon>
              <InsightText>
                <strong>Mejora constante:</strong> Tu promedio mejoró {aggregateMetrics.trendDiff} puntos 
                entre la primera y segunda mitad de tus sesiones. ¡Sigue así!
              </InsightText>
            </InsightItem>
          )}

          {aggregateMetrics.trend === 'declive' && (
            <InsightItem theme={theme} $type="warning">
              <InsightIcon>⚠️</InsightIcon>
              <InsightText>
                <strong>Atención:</strong> Tu promedio disminuyó {aggregateMetrics.trendDiff} puntos 
                en las últimas sesiones. Considera revisar tus estrategias de lectura.
              </InsightText>
            </InsightItem>
          )}

          {aggregateMetrics.improvement > 3 && (
            <InsightItem theme={theme} $type="success">
              <InsightIcon>🚀</InsightIcon>
              <InsightText>
                <strong>Excelente progreso:</strong> La diferencia entre tu mejor y peor sesión es de {aggregateMetrics.improvement.toFixed(1)} puntos,
                mostrando una capacidad de mejora significativa.
              </InsightText>
            </InsightItem>
          )}

          {aggregateMetrics.globalAverage >= 7 && (
            <InsightItem theme={theme} $type="info">
              <InsightIcon>🌟</InsightIcon>
              <InsightText>
                <strong>Alto rendimiento:</strong> Tu promedio global de {aggregateMetrics.globalAverage}/10 
                demuestra consistencia y dominio de las competencias lectoras.
              </InsightText>
            </InsightItem>
          )}
        </InsightsList>
      </InsightsSection>
    </Container>
  );
};

// Styled Components

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: clamp(1rem, 3vw, 1.5rem);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 0.5rem;
`;

const Title = styled.h2`
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 700;
  color: ${props => props.theme.text || '#1F2937'};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  font-size: clamp(0.85rem, 2.2vw, 1rem);
  color: ${props => props.theme.textMuted || '#6B7280'};
  margin: 0;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  @media (max-width: 640px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
`;

const MetricCard = styled.div`
  background: ${props => props.theme.surfaceVariant || '#F9FAFB'};
  border: 1px solid ${props => props.theme.border || '#E5E7EB'};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const MetricIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: clamp(1.2rem, 4vw, 1.75rem);
  font-weight: 700;
  color: ${props => props.$color || props.theme.text || '#1F2937'};
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.textMuted || '#6B7280'};
  font-weight: 500;
`;

const MetricHint = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted || '#9CA3AF'};
  margin-top: 0.25rem;
  font-style: italic;
`;

const ChartSection = styled.div`
  background: ${props => props.theme?.background || '#FFFFFF'};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme?.border || '#E5E7EB'};
`;

const SectionTitle = styled.h3`
  font-size: clamp(1rem, 2.4vw, 1.25rem);
  font-weight: 600;
  color: ${props => props.theme.text || '#1F2937'};
  margin: 0 0 1rem 0;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: clamp(240px, 45vw, 350px);
`;

const TableSection = styled.div`
  background: ${props => props.theme?.background || '#FFFFFF'};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme?.border || '#E5E7EB'};
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const SessionCards = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const SessionCard = styled.div`
  border: 1px solid ${props => props.theme?.border || '#E5E7EB'};
  border-radius: 12px;
  padding: 0.85rem;
  background: ${props => props.$highlight ? (props.theme?.successLight || '#D1FAE5') : (props.theme?.surface || '#FFFFFF')};
`;

const SessionCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const SessionTitleLine = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  color: ${props => props.theme?.text || '#1F2937'};
`;

const SessionSubtitle = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme?.textMuted || '#6B7280'};
`;

const SessionStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 0.5rem;
`;

const SessionStatItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${props => props.theme?.surfaceVariant || '#F9FAFB'};
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  .label { opacity: 0.8; }
  .value { font-weight: 600; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

const Th = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: ${props => props.theme.text || '#1F2937'};
  border-bottom: 2px solid ${props => props.theme.border || '#E5E7EB'};
  background: ${props => props.theme.surfaceVariant || '#F9FAFB'};
`;

const Tr = styled.tr`
  background: ${props => props.$highlight 
    ? (props.theme.successLight || '#D1FAE5')
    : 'transparent'
  };
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.surfaceVariant || '#F9FAFB'};
  }
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.border || '#E5E7EB'};
  color: ${props => props.theme.text || '#1F2937'};
  font-weight: ${props => props.$bold ? '600' : '400'};
`;

const ScoreBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-weight: 600;
  background: ${props => 
    props.$score >= 8 ? '#D1FAE5' :
    props.$score >= 6 ? '#FEF3C7' :
    props.$score >= 4 ? '#FED7AA' :
    '#FEE2E2'
  };
  color: ${props => 
    props.$score >= 8 ? '#065F46' :
    props.$score >= 6 ? '#92400E' :
    props.$score >= 4 ? '#9A3412' :
    '#991B1B'
  };
`;

const InsightsSection = styled.div`
  background: ${props => props.theme.surfaceVariant || '#F9FAFB'};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme.border || '#E5E7EB'};
`;

const InsightsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InsightItem = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background: ${props => 
    props.$type === 'success' ? '#D1FAE5' :
    props.$type === 'warning' ? '#FEF3C7' :
    props.$type === 'info' ? '#DBEAFE' :
    props.theme.background || '#FFFFFF'
  };
  border-left: 4px solid ${props => 
    props.$type === 'success' ? '#10B981' :
    props.$type === 'warning' ? '#F59E0B' :
    props.$type === 'info' ? '#3B82F6' :
    props.theme.border || '#E5E7EB'
  };
`;

const InsightIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const InsightText = styled.div`
  font-size: 0.95rem;
  line-height: 1.5;
  color: ${props => props.theme.text || '#1F2937'};

  strong {
    font-weight: 600;
  }
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
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
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

export default SessionComparison;
