// src/components/evaluacion/AnalyticsPanel.js
import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { calculateDetailedStats } from '../../services/analyticsService';
import { getAllSessionsMerged } from '../../services/sessionManager';
import ProgressChart from '../analytics/ProgressChart';
import RadarComparisonChart from '../analytics/RadarComparisonChart';
import DistributionChart from '../analytics/DistributionChart';
import SessionComparison from '../analytics/SessionComparison';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard';

const PanelContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const PanelTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const MetricCard = styled.div`
  background: ${props => props.$bgColor || props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.$color || props.theme.text};
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TrendBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    if (props.$trend === 'improving') return '#10b98120';
    if (props.$trend === 'declining') return '#ef444420';
    return props.theme.background;
  }};
  color: ${props => {
    if (props.$trend === 'improving') return '#10b981';
    if (props.$trend === 'declining') return '#ef4444';
    return props.theme.textMuted;
  }};
`;

const RecommendationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const RecommendationCard = styled.div`
  background: ${props => {
    if (props.$priority === 'high') return props.theme.errorBackground || '#fee';
    if (props.$priority === 'medium') return props.theme.infoBg;
    return props.theme.background;
  }};
  border-left: 4px solid ${props => {
    if (props.$priority === 'high') return '#ef4444';
    if (props.$priority === 'medium') return props.theme.primary;
    return props.theme.border;
  }};
  padding: 1rem;
  border-radius: 6px;
`;

const RecTitle = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const RecDescription = styled.div`
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
`;

const RecAction = styled.div`
  color: ${props => props.theme.primary};
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const PerformanceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PerformanceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: ${props => props.theme.background};
  border-radius: 6px;
  font-size: 0.85rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
`;

/**
 * Panel de analíticas y métricas educativas
 */
const AnalyticsPanel = ({ rubricProgress = {}, theme }) => {
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'comparison' | 'dashboard'
  const [sessions, setSessions] = useState([]);

  // Cargar sesiones
  useEffect(() => {
    const loadSessions = async () => {
      const allSessions = await getAllSessionsMerged();
      setSessions(allSessions);
    };
    loadSessions();
  }, []);

  const analytics = useMemo(() => 
    calculateDetailedStats(rubricProgress),
    [rubricProgress]
  );

  const hasData = analytics.summary.totalAttempts > 0;
  const hasMultipleSessions = sessions.filter(s => 
    s.rubricProgress && Object.keys(s.rubricProgress).length > 0
  ).length >= 2;

  if (!hasData) {
    return (
      <PanelContainer theme={theme}>
        <PanelTitle theme={theme}>📈 Analíticas y Métricas</PanelTitle>
        <EmptyState theme={theme}>
          <p>📊 Aún no hay datos para analizar</p>
          <p>Completa algunas evaluaciones para ver tus métricas de progreso</p>
        </EmptyState>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer
      theme={theme}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PanelTitle theme={theme}>📈 Analíticas y Métricas</PanelTitle>

      {/* Tabs */}
      <TabsContainer>
        <Tab 
          theme={theme}
          $active={activeTab === 'current'}
          onClick={() => setActiveTab('current')}
        >
          📊 Sesión Actual
        </Tab>
        <Tab 
          theme={theme}
          $active={activeTab === 'comparison'}
          onClick={() => setActiveTab('comparison')}
          disabled={!hasMultipleSessions}
          title={!hasMultipleSessions ? 'Necesitas al menos 2 sesiones con progreso' : ''}
        >
          📈 Comparar Sesiones
          {!hasMultipleSessions && ' 🔒'}
        </Tab>
        <Tab 
          theme={theme}
          $active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          disabled={!hasData}
          title={!hasData ? 'Completa evaluaciones para ver el dashboard' : ''}
        >
          🎯 Dashboard Interactivo
          {!hasData && ' 🔒'}
        </Tab>
      </TabsContainer>

      {/* Contenido según tab activo */}
      {activeTab === 'current' ? (
        <>
          {/* Gráficos visuales */}
          <ProgressChart rubricProgress={rubricProgress} theme={theme} />
          <RadarComparisonChart rubricProgress={rubricProgress} theme={theme} />
          <DistributionChart rubricProgress={rubricProgress} theme={theme} />

      {/* Resumen de métricas */}
      <Section>
        <SectionTitle theme={theme}>📊 Resumen General</SectionTitle>
        <MetricsGrid>
          <MetricCard theme={theme}>
            <MetricValue theme={theme} $color={theme.primary}>
              {analytics.summary.evaluatedRubrics}/{analytics.summary.totalRubrics}
            </MetricValue>
            <MetricLabel theme={theme}>Completadas</MetricLabel>
          </MetricCard>
          
          <MetricCard theme={theme}>
            <MetricValue theme={theme}>
              {analytics.summary.totalAttempts}
            </MetricValue>
            <MetricLabel theme={theme}>Total Intentos</MetricLabel>
          </MetricCard>
          
          <MetricCard theme={theme}>
            <MetricValue 
              theme={theme}
              $color={
                analytics.summary.averageScore >= 8.6 ? '#8b5cf6' :
                analytics.summary.averageScore >= 5.6 ? '#10b981' :
                analytics.summary.averageScore >= 2.6 ? '#f59e0b' : '#ef4444'
              }
            >
              {analytics.summary.averageScore.toFixed(1)}
            </MetricValue>
            <MetricLabel theme={theme}>Promedio</MetricLabel>
          </MetricCard>
          
          <MetricCard theme={theme}>
            <MetricValue theme={theme}>
              {analytics.summary.medianScore.toFixed(1)}
            </MetricValue>
            <MetricLabel theme={theme}>Mediana</MetricLabel>
          </MetricCard>
          
          <MetricCard theme={theme}>
            <MetricValue theme={theme} $color={theme.info}>
              {analytics.trends.consistencyScore.toFixed(1)}
            </MetricValue>
            <MetricLabel theme={theme}>Consistencia</MetricLabel>
          </MetricCard>
          
          <MetricCard theme={theme}>
            <MetricValue theme={theme}>
              <TrendBadge $trend={analytics.trends.overallTrend} theme={theme}>
                {analytics.trends.overallTrend === 'improving' && '📈 Mejorando'}
                {analytics.trends.overallTrend === 'declining' && '📉 Declinando'}
                {analytics.trends.overallTrend === 'stable' && '➡️ Estable'}
              </TrendBadge>
            </MetricValue>
            <MetricLabel theme={theme}>Tendencia</MetricLabel>
          </MetricCard>
        </MetricsGrid>
      </Section>

      {/* Fortalezas */}
      {analytics.performance.strengths.length > 0 && (
        <Section>
          <SectionTitle theme={theme}>💪 Fortalezas</SectionTitle>
          <PerformanceList>
            {analytics.performance.strengths.map((item, idx) => (
              <PerformanceItem key={idx} theme={theme}>
                <span>{item.rubricId}</span>
                <strong style={{ color: '#10b981' }}>{item.score.toFixed(1)}</strong>
              </PerformanceItem>
            ))}
          </PerformanceList>
        </Section>
      )}

      {/* Áreas de mejora */}
      {analytics.performance.weaknesses.length > 0 && (
        <Section>
          <SectionTitle theme={theme}>🎯 Áreas de Mejora</SectionTitle>
          <PerformanceList>
            {analytics.performance.weaknesses.map((item, idx) => (
              <PerformanceItem key={idx} theme={theme}>
                <span>{item.rubricId}</span>
                <strong style={{ color: '#ef4444' }}>{item.score.toFixed(1)}</strong>
              </PerformanceItem>
            ))}
          </PerformanceList>
        </Section>
      )}

      {/* Recomendaciones */}
      {analytics.recommendations.length > 0 && (
        <Section>
          <SectionTitle theme={theme}>💡 Recomendaciones Personalizadas</SectionTitle>
          <RecommendationsList>
            {analytics.recommendations.map((rec, idx) => (
              <RecommendationCard 
                key={idx} 
                theme={theme}
                $priority={rec.priority}
              >
                <RecTitle theme={theme}>{rec.title}</RecTitle>
                <RecDescription theme={theme}>{rec.description}</RecDescription>
                <RecAction theme={theme}>
                  → {rec.action}
                </RecAction>
              </RecommendationCard>
            ))}
          </RecommendationsList>
        </Section>
      )}
        </>
      ) : activeTab === 'comparison' ? (
        /* Tab de comparación entre sesiones */
        <SessionComparison sessions={sessions} theme={theme} />
      ) : (
        /* Tab de dashboard interactivo */
        <AnalyticsDashboard sessions={sessions} theme={theme} />
      )}
    </PanelContainer>
  );
};

// Styled Components para Tabs

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid ${props => props.theme?.border || '#E5E7EB'};
`;

const Tab = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.$active 
    ? (props.theme?.primary || '#3B82F6')
    : 'transparent'
  };
  color: ${props => props.$active 
    ? '#FFFFFF'
    : (props.theme?.textMuted || '#6B7280')
  };
  border: none;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.$active 
      ? (props.theme?.primaryDark || '#2563EB')
      : (props.theme?.surfaceVariant || '#F3F4F6')
    };
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

export default AnalyticsPanel;
