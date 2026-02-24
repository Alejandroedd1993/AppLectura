/**
 * Componente Actividades (V2)
 * ARQUITECTURA: Checkpoint MCQ → 5 DimensionCards (Práctica + Artefacto) → Progreso
 * Práctica es andamiaje OPCIONAL con puntos extra y desafíos cruzados.
 * OPTIMIZACIÓN: Lazy loading de artefactos para reducir bundle inicial
 */

import React, { useState, useContext, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import DashboardRubricas from './evaluacion/DashboardRubricas';
import NextStepCard from './common/NextStepCard';
import DraftWarning from './common/DraftWarning';
import ErrorBoundary from './common/ErrorBoundary';
import logger from '../utils/logger';

// ✅ EAGER: Componentes ligeros que se usan siempre
import PreguntasPersonalizadas from './actividades/PreguntasPersonalizadas';
import ProgressStats from './actividades/ProgressStats';
import ExportProgressButton from './actividades/ExportProgressButton';
import ModoPracticaGuiada from './actividades/ModoPracticaGuiada';
import AnalyticsPanel from './evaluacion/AnalyticsPanel';
import DimensionCard, { DIMENSIONS } from './actividades/DimensionCard';
import { generatePracticePlan } from '../services/practiceService';

// ✅ LAZY: Artefactos pesados (solo cargan cuando se necesitan)
const ResumenAcademico = lazy(() => import('./artefactos/ResumenAcademico'));
const TablaACD = lazy(() => import('./artefactos/TablaACD'));
const MapaActores = lazy(() => import('./artefactos/MapaActores'));
const RespuestaArgumentativa = lazy(() => import('./artefactos/RespuestaArgumentativa'));
const BitacoraEticaIA = lazy(() => import('./artefactos/BitacoraEticaIA'));

const Container = styled.div`
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  background: ${props => props.theme.background || '#f8f9fa'};
  min-height: calc(100vh - 120px);
`;

const Header = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${props => props.theme.primary || '#3190FC'};
`;

const HeaderTitle = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.textPrimary || '#333'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const HeaderDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.textSecondary || '#666'};
  font-size: 1rem;
  line-height: 1.5;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.$active ? props.theme.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : props.theme.textPrimary};
  border: 2px solid ${props => props.$active ? props.theme.primary : props.theme.border};
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${props => props.disabled ? 0.5 : 1};
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};
  
  &:hover:not(:disabled) {
    background: ${props => props.$active ? props.theme.primary : props.theme.surface};
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h2`
  font-size: 28px;
  margin-bottom: 8px;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const EmptyDescription = styled.p`
  font-size: 16px;
  color: ${props => props.theme.textSecondary || '#666'};
  max-width: 500px;
  line-height: 1.6;
`;

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 992px) {
    grid-template-columns: ${props => props.$layout === 'full' ? '1fr' : '2fr 1fr'};
  }
`;

const Section = styled.section`
  background: ${p => p.theme.cardBg || '#ffffff'};
  border: 1px solid ${p => p.theme.border || '#e0e0e0'};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${p => p.theme.textPrimary || '#333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResetButton = styled.button`
  background: ${p => p.$variant === 'danger' ? '#ef4444' : p.theme.error || '#dc3545'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${p => p.$variant === 'danger' ? '#dc2626' : '#c82333'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResetButtonSecondary = styled.button`
  background: transparent;
  color: ${p => p.theme.textSecondary || '#666'};
  border: 1px solid ${p => p.theme.border || '#ddd'};
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${p => p.theme.hoverBg || '#f5f5f5'};
    border-color: ${p => p.theme.textSecondary || '#999'};
  }
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const ConfirmCard = styled.div`
  background: ${p => p.theme.cardBg || 'white'};
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ConfirmTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${p => p.theme.textPrimary || '#333'};
  font-size: 1.3rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConfirmText = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${p => p.theme.textSecondary || '#666'};
  line-height: 1.6;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ProgressActionsBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${p => p.theme.border || '#e0e0e0'};
  flex-wrap: wrap;
`;

// ✅ Loading fallback para lazy loading
const LoadingFallback = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 1rem;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${p => p.theme.border || '#e0e0e0'};
  border-top-color: ${p => p.theme.primary || '#2196F3'};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  margin: 0;
  color: ${p => p.theme.textSecondary || '#666'};
  font-size: 0.95rem;
`;

export default function Actividades() {
  const {
    texto,
    completeAnalysis,
    modoOscuro,
    rubricProgress,
    clearRubricProgress: _clearRubricProgress,
    resetAllProgress,
    activitiesProgress,
    markPreparationProgress,
    currentTextoId,
    sourceCourseId,
    getCitations,
    globalTutorInteractions
  } = useContext(AppContext);
  // Vista principal: 'checkpoint' | 'dimensiones' | 'progreso'
  const [activeSection, setActiveSection] = useState('checkpoint');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedRubricId, setSelectedRubricId] = useState(null);

  // Obtener documentId del análisis
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;

  // 🔎 Estado de preparación (MCQ completado)
  const preparacionCompletada = lectureId
    ? activitiesProgress?.[lectureId]?.preparation?.completed || false
    : false;

  // Auto-navegar a dimensiones cuando se completa el checkpoint
  // 🛡️ FIX CROSS-COURSE: Revertir a checkpoint si preparación ya no es válida
  //    (ej. al cambiar de curso con el mismo textoId, los datos se resetean 1 frame después)
  React.useEffect(() => {
    if (preparacionCompletada && activeSection === 'checkpoint') {
      setActiveSection('dimensiones');
    } else if (!preparacionCompletada && activeSection === 'dimensiones') {
      setActiveSection('checkpoint');
    }
  }, [preparacionCompletada, activeSection]);

  // 🛡️ FIX CROSS-COURSE: Resetear vista al cambiar de curso (mismo textoId)
  const prevCourseIdRef = React.useRef(sourceCourseId);
  React.useEffect(() => {
    if (prevCourseIdRef.current !== sourceCourseId) {
      prevCourseIdRef.current = sourceCourseId;
      setActiveSection('checkpoint');
      setSelectedRubricId(null);
    }
  }, [sourceCourseId]);

  const getArtifactScores = useCallback((scores) => {
    if (!Array.isArray(scores)) return [];
    return scores.filter((s) => s?.artefacto !== 'PracticaGuiada');
  }, []);

  const hasSummativeAttempt = useCallback((summative) => {
    if (!summative || typeof summative !== 'object') return false;
    const status = String(summative.status || '').toLowerCase();
    const attemptsUsed = Number(summative.attemptsUsed || 0);
    return (
      attemptsUsed > 0 ||
      status === 'submitted' ||
      status === 'graded' ||
      Number(summative.submittedAt || 0) > 0 ||
      Number(summative.gradedAt || 0) > 0
    );
  }, []);

  const getSummativeScore = useCallback((summative) => {
    if (String(summative?.status || '').toLowerCase() !== 'graded') return 0;
    const override = Number(summative?.teacherOverrideScore);
    if (Number.isFinite(override) && override > 0) return override;
    const score = Number(summative?.score);
    return Number.isFinite(score) && score > 0 ? score : 0;
  }, []);

  const getEffectiveRubricScore = useCallback((rubricData) => {
    if (!rubricData || typeof rubricData !== 'object') return 0;

    const summativeScore = getSummativeScore(rubricData.summative);
    if (summativeScore > 0) return summativeScore;

    const artifactScores = getArtifactScores(rubricData.scores);
    if (!artifactScores.length) return 0;

    const lastScore = Number(artifactScores[artifactScores.length - 1]?.score);
    return Number.isFinite(lastScore) && lastScore > 0 ? lastScore : 0;
  }, [getArtifactScores, getSummativeScore]);

  // 🆕 Escuchar evento de completación de ejercicios
  React.useEffect(() => {
    const handleExercisesCompleted = () => {
      logger.log('✅ [Actividades] Preparación completada, desbloqueando artefactos');
      if (lectureId && markPreparationProgress) {
        markPreparationProgress(lectureId, { completed: true });
      }
    };

    window.addEventListener('exercises-completed', handleExercisesCompleted);
    return () => window.removeEventListener('exercises-completed', handleExercisesCompleted);
  }, [lectureId, markPreparationProgress]);

  // 🆕 Función para calcular estado de cada artefacto
  const getArtefactoStatus = useCallback((rubricId) => {
    const data = rubricProgress?.[rubricId];
    const effectiveScore = getEffectiveRubricScore(data);

    if (effectiveScore <= 0) {
      return { status: 'empty', icon: '', label: '', color: '' };
    }

    if (effectiveScore >= 8.6) {
      return {
        status: 'excellent',
        icon: '🌟',
        label: effectiveScore.toFixed(1),
        color: '#10b981' // verde brillante
      };
    } else if (effectiveScore >= 5.6) {
      return {
        status: 'good',
        icon: '✅',
        label: effectiveScore.toFixed(1),
        color: '#4CAF50' // verde
      };
    } else {
      return {
        status: 'needs-work',
        icon: '⏳',
        label: effectiveScore.toFixed(1),
        color: '#FF9800' // naranja
      };
    }
  }, [rubricProgress, getEffectiveRubricScore]);

  // Si no hay texto cargado, mostrar estado vacío
  if (!texto) {
    return (
      <Container theme={{ background: modoOscuro ? '#1a1a1a' : '#f8f9fa' }}>
        <EmptyState>
          <EmptyIcon>📝</EmptyIcon>
          <EmptyTitle theme={{ textPrimary: modoOscuro ? '#fff' : '#333' }}>
            No hay texto cargado
          </EmptyTitle>
          <EmptyDescription theme={{ textSecondary: modoOscuro ? '#aaa' : '#666' }}>
            Carga un texto en la sección "Lectura Guiada" para comenzar con las actividades interactivas de literacidad crítica.
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  // Si no hay análisis completo, mostrar mensaje
  if (!completeAnalysis || !completeAnalysis.critical) {
    return (
      <Container theme={{ background: modoOscuro ? '#1a1a1a' : '#f8f9fa' }}>
        <EmptyState>
          <EmptyIcon>⏳</EmptyIcon>
          <EmptyTitle theme={{ textPrimary: modoOscuro ? '#fff' : '#333' }}>
            Análisis en proceso
          </EmptyTitle>
          <EmptyDescription theme={{ textSecondary: modoOscuro ? '#aaa' : '#666' }}>
            Espera a que se complete el análisis del texto en la pestaña "Análisis de Texto" para acceder a las actividades personalizadas.
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  const theme = useMemo(() => ({
    background: modoOscuro ? '#1a1a1a' : '#f8f9fa',
    cardBg: modoOscuro ? '#2a2a2a' : '#ffffff',
    surface: modoOscuro ? '#333' : '#f5f5f5',
    border: modoOscuro ? '#444' : '#e0e0e0',
    textPrimary: modoOscuro ? '#fff' : '#333',
    textSecondary: modoOscuro ? '#aaa' : '#666',
    primary: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
  }), [modoOscuro]);

  // Pre-computar status de cada artefacto (evita 30+ llamadas en JSX)
  const artefactoStatuses = useMemo(() => ({
    rubrica1: getArtefactoStatus('rubrica1'),
    rubrica2: getArtefactoStatus('rubrica2'),
    rubrica3: getArtefactoStatus('rubrica3'),
    rubrica4: getArtefactoStatus('rubrica4'),
    rubrica5: getArtefactoStatus('rubrica5'),
  }), [getArtefactoStatus]);

  // Calcular progreso general
  const artefactosCompletados = useMemo(() => 
    Object.values(artefactoStatuses).filter(s => s.icon !== '').length,
  [artefactoStatuses]);

  const progresoGeneral = Math.round((artefactosCompletados / 5) * 100);

  // ARIA: Cerrar modal con Escape
  const cancelBtnRef = useRef(null);
  useEffect(() => {
    if (!showResetConfirm) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowResetConfirm(false);
    };
    document.addEventListener('keydown', handleEscape);
    cancelBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showResetConfirm]);

  // Dimensiones recomendadas (las más débiles según rubricProgress)
  const recommendedDimensions = useMemo(() => {
    try {
      const plan = generatePracticePlan(rubricProgress);
      return plan?.dimensions?.map(d => d.id) || [];
    } catch { return []; }
  }, [rubricProgress]);

  // Mapeo de dimensión → componente artefacto
  const ARTIFACT_MAP = useMemo(() => ({
    comprension_analitica: { Component: ResumenAcademico, label: 'Resumen Académico' },
    acd: { Component: TablaACD, label: 'Análisis del Discurso' },
    contextualizacion: { Component: MapaActores, label: 'Mapa de Actores' },
    argumentacion: { Component: RespuestaArgumentativa, label: 'Respuesta Argumentativa' },
    metacognicion_etica_ia: { Component: BitacoraEticaIA, label: 'Bitácora Ética IA' }
  }), []);

  // Render helpers para DimensionCard
  const renderPractice = useCallback((dimension) => (
    <ModoPracticaGuiada
      theme={theme}
      rubricProgress={rubricProgress}
      fixedDimension={dimension.id}
    />
  ), [theme, rubricProgress]);

  const renderArtifact = useCallback((dimension) => {
    const mapping = ARTIFACT_MAP[dimension.id];
    if (!mapping) return null;
    const { Component, label } = mapping;
    return (
      <Suspense fallback={
        <LoadingFallback theme={theme}>
          <Spinner theme={theme} />
          <LoadingText theme={theme}>{dimension.icon} Cargando {label}...</LoadingText>
        </LoadingFallback>
      }>
        <ErrorBoundary
          theme={theme}
          componentName={label}
          onReset={() => logger.log(`🔄 Reseteando ${label}`)}
        >
          <Component theme={theme} />
        </ErrorBoundary>
      </Suspense>
    );
  }, [theme, ARTIFACT_MAP]);

  return (
    <Container theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <span>📝</span>
          Actividades de Literacidad Crítica
          {artefactosCompletados > 0 && (
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              marginLeft: '0.75rem',
              color: theme.success,
              opacity: 0.9
            }}>
              ({artefactosCompletados}/5 completados • {progresoGeneral}%)
            </span>
          )}
        </HeaderTitle>
        <HeaderDescription theme={theme}>
          {!preparacionCompletada ? (
            <>
              🧠 <strong>Completa el checkpoint rápido</strong> para desbloquear las 5 dimensiones de literacidad crítica.
            </>
          ) : (
            <>
              Checkpoint completado ✅ • Elige una dimensión. Puedes practicar (opcional, +puntos) o ir directo al artefacto.
            </>
          )}
        </HeaderDescription>
      </Header>

      <DraftWarning theme={theme} />

      {/* Navegación simplificada: 3 vistas */}
      <TabsContainer role="tablist" aria-label="Actividades de literacidad crítica">
        <Tab
          role="tab"
          aria-selected={activeSection === 'checkpoint'}
          $active={activeSection === 'checkpoint'}
          onClick={() => setActiveSection('checkpoint')}
          theme={theme}
        >
          <span>🧠</span>
          Checkpoint
          {preparacionCompletada && ' ✅'}
        </Tab>

        <Tab
          role="tab"
          aria-selected={activeSection === 'dimensiones'}
          $active={activeSection === 'dimensiones'}
          onClick={() => preparacionCompletada && setActiveSection('dimensiones')}
          disabled={!preparacionCompletada}
          theme={theme}
        >
          <span>📚</span>
          Dimensiones
          {!preparacionCompletada && ' 🔒'}
        </Tab>

        <Tab
          role="tab"
          aria-selected={activeSection === 'progreso'}
          $active={activeSection === 'progreso'}
          onClick={() => setActiveSection('progreso')}
          theme={theme}
        >
          <span>📊</span>
          Mi Progreso
        </Tab>
      </TabsContainer>

      {/* ═══════════ CONTENIDO ═══════════ */}
      <AnimatePresence mode="wait">
        {/* ─── CHECKPOINT ─── */}
        {activeSection === 'checkpoint' && (
          <motion.div
            key="checkpoint"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <PreguntasPersonalizadas theme={theme} />

            {preparacionCompletada && (
              <NextStepCard
                icon="📚"
                title="¡Checkpoint Completado! Explora las dimensiones"
                description="Elige cualquiera de las 5 dimensiones. Puedes practicar con preguntas reflexivas (+puntos) o ir directo a crear tu artefacto."
                actionLabel="Ir a Dimensiones →"
                onAction={() => setActiveSection('dimensiones')}
                theme={theme}
                variant="primary"
              />
            )}
          </motion.div>
        )}

        {/* ─── DIMENSIONES (5 cards) ─── */}
        {activeSection === 'dimensiones' && (
          <motion.div
            key="dimensiones"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {DIMENSIONS.map((dim) => (
                <DimensionCard
                  key={dim.id}
                  dimension={dim}
                  theme={theme}
                  rubricProgress={rubricProgress}
                  activitiesProgress={activitiesProgress}
                  lectureId={lectureId}
                  isRecommended={recommendedDimensions.includes(dim.id)}
                  renderPractice={renderPractice}
                  renderArtifact={renderArtifact}
                  expandSignal={selectedRubricId === dim.rubricId ? selectedRubricId : null}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── PROGRESO ─── */}
        {activeSection === 'progreso' && (
          <motion.div
            key="progreso"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Wrapper $layout="sidebar" theme={theme}>
              <Section theme={theme}>
                <SectionTitle theme={theme}>
                  <span>📊</span>
                  Progresión de Literacidad Crítica
                </SectionTitle>
                <DashboardRubricas
                  theme={theme}
                  onSelectRubric={(rubricId) => {
                    // Navegar a dimensiones al hacer clic en una rúbrica
                    setSelectedRubricId(rubricId || null);
                    setActiveSection('dimensiones');
                  }}
                />

                {/* 💡 Ayuda para el usuario */}
                <p style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  background: theme.primary + '10',
                  border: `1px solid ${theme.primary}40`,
                  borderRadius: '8px',
                  color: theme.textSecondary,
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                  <span>
                    <strong>Tip:</strong> Haz clic en cualquier tarjeta de rúbrica para ir a la vista de dimensiones y abrir el artefacto correspondiente para revisarlo o mejorarlo.
                  </span>
                </p>

                {/* 📈 Gráficas de progreso (dashboard analítico) */}
                <AnalyticsPanel rubricProgress={rubricProgress} theme={theme} />
              </Section>

              <Section theme={theme}>
                <SectionTitle theme={theme}>
                  <span>📊</span>
                  Mi Progreso Detallado
                </SectionTitle>

                {/* Panel de Estadísticas de Progreso */}
                <ProgressStats rubricProgress={rubricProgress} />

                {/* Botones de Exportación */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '1.1rem',
                    color: theme.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>📥</span>
                    Exportar Datos de Progreso
                  </h4>
                  <p style={{
                    margin: '0 0 1rem 0',
                    color: theme.textSecondary,
                    fontSize: '0.9rem',
                    lineHeight: 1.6
                  }}>
                    Descarga tu progreso en formatos útiles:
                  </p>
                  <ul style={{
                    margin: '0 0 1rem 1.5rem',
                    color: theme.textSecondary,
                    fontSize: '0.85rem',
                    lineHeight: 1.7
                  }}>
                    <li><strong>CSV:</strong> Ideal para Excel, análisis estadístico y gráficos. Cada fila es una evaluación con fecha, puntuación y nivel.</li>
                    <li><strong>PDF:</strong> Informe legible para portafolios: resumen + tabla por artefacto + contenido (si existe).</li>
                  </ul>
                  <p style={{
                    margin: '0 0 1rem 0',
                    color: theme.textSecondary,
                    fontSize: '0.8rem',
                    fontStyle: 'italic'
                  }}>
                    💡 Útil para portafolios académicos, seguimiento docente o análisis de progreso personal.
                  </p>
                  <ExportProgressButton
                    rubricProgress={rubricProgress}
                    documentId={documentId}
                    studentName="estudiante"
                    tutorInteractions={globalTutorInteractions}
                    savedCitations={getCitations ? getCitations(lectureId) : []}
                    lectureId={lectureId}
                    sourceCourseId={sourceCourseId}
                  />
                </div>

                {/* 🆕 Botón crítico: al final */}
                <ProgressActionsBar theme={theme}>
                  <ResetButton
                    $variant="danger"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={!rubricProgress || Object.values(rubricProgress).every(r => {
                      const formativeCount = getArtifactScores(r?.scores).length;
                      const hasSummative = hasSummativeAttempt(r?.summative);
                      const effectiveScore = getEffectiveRubricScore(r);
                      return formativeCount === 0 && !hasSummative && effectiveScore <= 0;
                    })}
                    title="Resetear todo el progreso"
                  >
                    <span>🗑️</span>
                    Resetear Todo el Progreso
                  </ResetButton>
                </ProgressActionsBar>
              </Section>
            </Wrapper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🆕 Diálogo de confirmación de reseteo */}
      {showResetConfirm && (
        <ConfirmDialog
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          onClick={() => setShowResetConfirm(false)}
        >
          <ConfirmCard theme={theme} onClick={(e) => e.stopPropagation()}>
            <ConfirmTitle id="reset-dialog-title" theme={theme}>
              <span>⚠️</span>
              ¿Resetear todo el progreso?
            </ConfirmTitle>
            <ConfirmText theme={theme}>
              Esta acción eliminará <strong>todas las evaluaciones y puntuaciones</strong> de las 5 rúbricas de literacidad crítica.
              Los artefactos creados (textos, tablas, mapas, etc.) <strong>no se borrarán</strong>, pero sus puntuaciones sí.
              <br /><br />
              Esta acción <strong>no se puede deshacer</strong>.
            </ConfirmText>
            <ConfirmActions>
              <ResetButtonSecondary
                ref={cancelBtnRef}
                onClick={() => setShowResetConfirm(false)}
                theme={theme}
              >
                Cancelar
              </ResetButtonSecondary>
              <ResetButton
                $variant="danger"
                onClick={() => {
                  resetAllProgress();
                  setShowResetConfirm(false);
                }}
              >
                <span>🗑️</span>
                Sí, Resetear Todo
              </ResetButton>
            </ConfirmActions>
          </ConfirmCard>
        </ConfirmDialog>
      )}
    </Container>
  );
}
