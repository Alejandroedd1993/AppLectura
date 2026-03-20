import React, { useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { calculateDetailedStats } from '../../services/analyticsService';
import { hasSessionScoreForRubrics } from '../../services/progressAnalyticsView';
import { buildProgressSnapshot } from '../../services/progressSnapshot';
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
  margin-top: 1.5rem;
`;

const PanelTitle = styled.h3`
  margin: 0 0 0.4rem 0;
  color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PanelSubtitle = styled.p`
  margin: 0 0 1.2rem 0;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  font-size: 0.88rem;
  line-height: 1.55;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid ${props => props.theme.border};
  overflow-x: auto;
`;

const Tab = styled.button`
  padding: 0.7rem 1rem;
  background: ${props => props.$active ? (props.theme.primary || '#2563EB') : 'transparent'};
  color: ${props => props.$active ? '#FFFFFF' : (props.theme.textSecondary || props.theme.textMuted || '#6B7280')};
  border: none;
  border-radius: 10px 10px 0 0;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.55 : 1};
`;

const Section = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.9rem 0;
  color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  font-size: 0.98rem;
`;

const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const OverviewCard = styled.div`
  padding: 0.9rem;
  border-radius: 12px;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};

  .label {
    display: block;
    margin-bottom: 0.3rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  }

  .value {
    display: block;
    font-size: 1.18rem;
    font-weight: 700;
    color: ${props => props.$accent || props.theme.textPrimary || props.theme.text || '#111827'};
  }

  .helper {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.78rem;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  }
`;

const SparseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SparseCard = styled.div`
  padding: 1rem;
  border-radius: 12px;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};

  strong {
    display: block;
    margin-bottom: 0.35rem;
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
    font-size: 0.95rem;
  }

  p {
    margin: 0;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
    font-size: 0.86rem;
    line-height: 1.55;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
`;

const MetricCard = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 10px;
  padding: 0.95rem;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.55rem;
  font-weight: 700;
  color: ${props => props.$color || props.theme.textPrimary || props.theme.text || '#111827'};
  margin-bottom: 0.2rem;
`;

const MetricLabel = styled.div`
  font-size: 0.74rem;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TrendBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  background: ${props => {
    if (props.$trend === 'improving') return '#10B98120';
    if (props.$trend === 'declining') return '#EF444420';
    return props.theme.surface;
  }};
  color: ${props => {
    if (props.$trend === 'improving') return '#10B981';
    if (props.$trend === 'declining') return '#EF4444';
    return props.theme.textSecondary || props.theme.textMuted || '#6B7280';
  }};
`;

const PerformanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const PerformanceBlock = styled.div`
  padding: 1rem;
  border-radius: 12px;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
`;

const PerformanceTitle = styled.h5`
  margin: 0 0 0.8rem 0;
  color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  font-size: 0.92rem;
`;

const PerformanceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const PerformanceItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: ${props => props.theme.surface};
  font-size: 0.83rem;
`;

const RecommendationsList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const RecommendationCard = styled.div`
  padding: 1rem;
  border-left: 4px solid ${props => {
    if (props.$priority === 'high') return '#EF4444';
    if (props.$priority === 'medium') return props.theme.primary || '#2563EB';
    return '#94A3B8';
  }};
  border-radius: 10px;
  background: ${props => {
    if (props.$priority === 'high') return props.theme.errorBackground || '#FEF2F2';
    if (props.$priority === 'medium') return props.theme.infoBg || props.theme.background;
    return props.theme.background;
  }};
`;

const RecTitle = styled.div`
  font-weight: 700;
  color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
`;

const RecDescription = styled.div`
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 0.4rem;
`;

const RecAction = styled.div`
  color: ${props => props.theme.primary || '#2563EB'};
  font-size: 0.82rem;
  font-weight: 700;
`;

const InsightCard = styled.div`
  padding: 1rem;
  border: 1px dashed ${props => props.theme.border};
  border-radius: 12px;
  background: ${props => props.theme.background};
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  font-size: 0.88rem;
  line-height: 1.55;
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  font-size: 0.92rem;
  line-height: 1.6;
`;

function withinCurrentScope(session, currentTextoId, sourceCourseId) {
  if (!session || typeof session !== 'object') return false;
  const sessionTextoId =
    session.currentTextoId ||
    session.text?.metadata?.id ||
    session.text?.textoId ||
    session.textoId ||
    null;
  const sessionCourseId = session.sourceCourseId || session.text?.sourceCourseId || null;

  if (currentTextoId && sessionTextoId && sessionTextoId !== currentTextoId) return false;
  if (sourceCourseId != null && sessionCourseId !== sourceCourseId) return false;
  return true;
}

function getSessionLectureId(session) {
  return (
    session?.currentTextoId ||
    session?.text?.metadata?.id ||
    session?.text?.textoId ||
    session?.textoId ||
    null
  );
}

function getTrendLabel(trends) {
  if (!trends?.hasSufficientData) return 'Sin tendencia';
  if (trends.overallTrend === 'improving') return 'Mejorando';
  if (trends.overallTrend === 'declining') return 'Bajando';
  return 'Estable';
}

function getTrendHelper(trends) {
  if (!trends?.hasSufficientData) {
    return 'Necesitas 2 intentos en una misma dimension para comparar evolucion.';
  }

  if (trends?.hasConsistencyData) {
    return `Consistencia ${trends.consistencyScore.toFixed(1)}`;
  }

  return 'Tendencia calculada con la evidencia comparable disponible.';
}

const AnalyticsPanel = ({ rubricProgress = {}, progressSnapshot, theme }) => {
  const { currentTextoId, sourceCourseId } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('current');
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const loadSessions = async () => {
      const allSessions = await getAllSessionsMerged();
      setSessions(allSessions);
    };

    loadSessions();
  }, []);

  const analytics = useMemo(() => (
    calculateDetailedStats(rubricProgress, progressSnapshot)
  ), [rubricProgress, progressSnapshot]);

  const scopedSessions = useMemo(() => (
    sessions
      .map((session) => ({
        ...session,
        progressSnapshot: buildProgressSnapshot({
          rubricProgress: session.rubricProgress || {},
          activitiesProgress: session.activitiesProgress || {},
          lectureId: getSessionLectureId(session)
        })
      }))
      .filter((session) =>
        withinCurrentScope(session, currentTextoId, sourceCourseId) &&
        session.progressSnapshot?.hasData
      )
  ), [sessions, currentTextoId, sourceCourseId]);

  const comparableScopedSessions = useMemo(() => (
    scopedSessions.filter((session) => hasSessionScoreForRubrics(session))
  ), [scopedSessions]);

  const hasProgressData = Boolean(progressSnapshot?.hasData) || analytics.summary.totalAttempts > 0;
  const hasMultipleSessions = comparableScopedSessions.length >= 2;
  const canShowTimeSeries = progressSnapshot?.hasMeaningfulTimeSeries;
  const canShowRadar = progressSnapshot?.canRenderRadar;
  const canShowDistribution = progressSnapshot?.canRenderDistribution;
  const sparseMode = Boolean(progressSnapshot) && !canShowTimeSeries && !canShowRadar && !canShowDistribution;
  const shownRecommendations = analytics.recommendations;

  useEffect(() => {
    if (!hasMultipleSessions && activeTab !== 'current') {
      setActiveTab('current');
    }
  }, [activeTab, hasMultipleSessions]);

  if (!hasProgressData) {
    return (
      <PanelContainer theme={theme}>
        <PanelTitle theme={theme}>📈 Analiticas y metricas</PanelTitle>
        <PanelSubtitle theme={theme}>
          Esta seccion usa solo la lectura y el curso actuales para evitar mezclar historiales incompatibles.
        </PanelSubtitle>
        <EmptyState theme={theme}>
          Completa al menos una evaluacion formativa para empezar a ver tendencias utiles y comparables.
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
      <PanelTitle theme={theme}>📈 Analiticas y metricas</PanelTitle>
      <PanelSubtitle theme={theme}>
        Si aun hay poco dato, el panel prioriza claridad y siguiente accion antes que mostrar graficas vacias.
      </PanelSubtitle>

      <TabsContainer theme={theme}>
        <Tab theme={theme} $active={activeTab === 'current'} onClick={() => setActiveTab('current')}>
          Sesion actual
        </Tab>
        <Tab
          theme={theme}
          $active={activeTab === 'comparison'}
          onClick={() => setActiveTab('comparison')}
          disabled={!hasMultipleSessions}
          title={!hasMultipleSessions ? 'Necesitas al menos 2 sesiones comparables dentro de esta lectura o curso.' : ''}
        >
          Comparar sesiones
        </Tab>
        <Tab
          theme={theme}
          $active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          disabled={!hasMultipleSessions}
          title={!hasMultipleSessions ? 'El dashboard historico necesita mas de una sesion comparable.' : ''}
        >
          Dashboard historico
        </Tab>
      </TabsContainer>

      {activeTab === 'current' ? (
        <>
          {!sparseMode && (
            <OverviewGrid>
              <OverviewCard theme={theme} $accent={theme.primary}>
                <span className="label">Cobertura</span>
                <span className="value">{progressSnapshot?.summary.coverageCount || 0}/5</span>
                <span className="helper">{progressSnapshot?.summary.coveragePercent || 0}% activa</span>
              </OverviewCard>
              <OverviewCard theme={theme} $accent={theme.success}>
                <span className="label">Con nota</span>
                <span className="value">{analytics.summary.evaluatedRubrics}/{analytics.summary.totalRubrics}</span>
                <span className="helper">Promedio {analytics.summary.averageScore.toFixed(1)}/10</span>
              </OverviewCard>
              <OverviewCard theme={theme} $accent={theme.warning}>
                <span className="label">Intentos</span>
                <span className="value">{analytics.summary.totalAttempts}</span>
                <span className="helper">Datos disponibles en esta lectura</span>
              </OverviewCard>
              <OverviewCard theme={theme} $accent={theme.secondary}>
                <span className="label">Tendencia</span>
                <span className="value">{getTrendLabel(analytics.trends)}</span>
                <span className="helper">{getTrendHelper(analytics.trends)}</span>
              </OverviewCard>
            </OverviewGrid>
          )}

          {sparseMode ? (
            <Section>
              <SectionTitle theme={theme}>Lectura en etapa inicial</SectionTitle>
              <SparseGrid>
                <SparseCard theme={theme}>
                  <strong>Lo que ya tienes</strong>
                  <p>
                    Hay {progressSnapshot?.summary.coverageCount || 0} dimension(es) activas y {analytics.summary.totalAttempts} intento(s) registrados.
                    {analytics.summary.averageScore > 0 ? ` En lo evaluado llevas ${analytics.summary.averageScore.toFixed(1)}/10.` : ''}
                  </p>
                </SparseCard>
                <SparseCard theme={theme}>
                  <strong>Lo que falta para ver tendencias</strong>
                  <p>
                    Necesitas 2 intentos en una misma dimension para la evolucion temporal y 2 dimensiones con nota para el radar comparativo.
                  </p>
                </SparseCard>
                <SparseCard theme={theme}>
                  <strong>Siguiente hito</strong>
                  <p>
                    {progressSnapshot?.nextAction?.description || 'Suma una nueva evidencia evaluada para volver este panel mucho mas util.'}
                  </p>
                </SparseCard>
              </SparseGrid>
            </Section>
          ) : (
            <Section>
              <SectionTitle theme={theme}>Graficas de apoyo</SectionTitle>

              {canShowTimeSeries ? (
                <ProgressChart
                  rubricProgress={rubricProgress}
                  progressSnapshot={progressSnapshot}
                  theme={theme}
                />
              ) : (
                <InsightCard theme={theme}>
                  Todavia no existen dos intentos en una misma dimension. Cuando eso ocurra, aqui veras una evolucion temporal mas util.
                </InsightCard>
              )}

              {canShowRadar ? (
                <RadarComparisonChart
                  rubricProgress={rubricProgress}
                  progressSnapshot={progressSnapshot}
                  theme={theme}
                />
              ) : (
                <InsightCard theme={theme}>
                  El radar aparece cuando hay al menos dos dimensiones con nota. Antes de eso conviene enfocarse en cobertura y siguiente accion.
                </InsightCard>
              )}

              {canShowDistribution ? (
                <DistributionChart
                  rubricProgress={rubricProgress}
                  progressSnapshot={progressSnapshot}
                  theme={theme}
                />
              ) : (
                <InsightCard theme={theme}>
                  La distribucion por dimension se mostrara cuando exista mas de un intento o cobertura suficiente para comparar.
                </InsightCard>
              )}
            </Section>
          )}

          {!sparseMode && (
            <Section>
              <SectionTitle theme={theme}>Lecturas rapidas</SectionTitle>
              <MetricsGrid>
                <MetricCard theme={theme}>
                  <MetricValue theme={theme} $color={theme.primary}>{analytics.summary.evaluatedRubrics}</MetricValue>
                  <MetricLabel theme={theme}>Con nota</MetricLabel>
                </MetricCard>
                <MetricCard theme={theme}>
                  <MetricValue theme={theme}>
                    {analytics.summary.hasMedianData ? analytics.summary.medianScore.toFixed(1) : '—'}
                  </MetricValue>
                  <MetricLabel theme={theme}>Mediana</MetricLabel>
                </MetricCard>
                <MetricCard theme={theme}>
                  <MetricValue theme={theme} $color={theme.info || theme.primary}>
                    {analytics.trends.hasConsistencyData ? analytics.trends.consistencyScore.toFixed(1) : '—'}
                  </MetricValue>
                  <MetricLabel theme={theme}>Consistencia</MetricLabel>
                </MetricCard>
                <MetricCard theme={theme}>
                  <MetricValue theme={theme}>
                    <TrendBadge theme={theme} $trend={analytics.trends.overallTrend}>
                      {getTrendLabel(analytics.trends)}
                    </TrendBadge>
                  </MetricValue>
                  <MetricLabel theme={theme}>Tendencia</MetricLabel>
                </MetricCard>
              </MetricsGrid>
            </Section>
          )}

          {!sparseMode && (analytics.performance.strengths.length > 0 || analytics.performance.weaknesses.length > 0) && (
            <Section>
              <SectionTitle theme={theme}>Fortalezas y focos de mejora</SectionTitle>
              <PerformanceGrid>
                <PerformanceBlock theme={theme}>
                  <PerformanceTitle theme={theme}>Fortalezas</PerformanceTitle>
                  <PerformanceList>
                    {analytics.performance.strengths.length > 0 ? analytics.performance.strengths.map((item, idx) => (
                      <PerformanceItem key={idx} theme={theme}>
                        <span>{item.rubricLabel || item.rubricId}</span>
                        <strong style={{ color: '#10B981' }}>{item.score.toFixed(1)}</strong>
                      </PerformanceItem>
                    )) : (
                      <InsightCard theme={theme}>Aun no hay suficientes notas altas para destacar una fortaleza clara.</InsightCard>
                    )}
                  </PerformanceList>
                </PerformanceBlock>

                <PerformanceBlock theme={theme}>
                  <PerformanceTitle theme={theme}>Focos de mejora</PerformanceTitle>
                  <PerformanceList>
                    {analytics.performance.weaknesses.length > 0 ? analytics.performance.weaknesses.map((item, idx) => (
                      <PerformanceItem key={idx} theme={theme}>
                        <span>{item.rubricLabel || item.rubricId}</span>
                        <strong style={{ color: '#EF4444' }}>{item.score.toFixed(1)}</strong>
                      </PerformanceItem>
                    )) : (
                      <InsightCard theme={theme}>Todavia no hay una debilidad dominante; sigue sumando evidencia para equilibrar el mapa.</InsightCard>
                    )}
                  </PerformanceList>
                </PerformanceBlock>
              </PerformanceGrid>
            </Section>
          )}

          {!sparseMode && shownRecommendations.length > 0 && (
            <Section>
              <SectionTitle theme={theme}>Recomendaciones personalizadas</SectionTitle>
              <RecommendationsList>
                {shownRecommendations.map((rec, idx) => (
                  <RecommendationCard key={idx} theme={theme} $priority={rec.priority}>
                    <RecTitle theme={theme}>{rec.title}</RecTitle>
                    <RecDescription theme={theme}>{rec.description}</RecDescription>
                    <RecAction theme={theme}>→ {rec.action}</RecAction>
                  </RecommendationCard>
                ))}
              </RecommendationsList>
            </Section>
          )}
        </>
      ) : activeTab === 'comparison' ? (
        <SessionComparison sessions={comparableScopedSessions} theme={theme} />
      ) : (
        <AnalyticsDashboard sessions={comparableScopedSessions} theme={theme} />
      )}
    </PanelContainer>
  );
};

export default AnalyticsPanel;
