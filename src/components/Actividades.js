/**
 * Componente Actividades
 * REORGANIZACIÓN ARQUITECTÓNICA: Ahora contiene ejercicios prácticos y feedback
 * MIGRADO desde AnalisisTexto: Preguntas personalizadas + Feedback formativo
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
import EstimatedTimeBadge from './ui/EstimatedTimeBadge';
import logger from '../utils/logger';

// ✅ EAGER: Componentes ligeros que se usan siempre
import PreguntasPersonalizadas from './actividades/PreguntasPersonalizadas';
import ProgressStats from './actividades/ProgressStats';
import ExportProgressButton from './actividades/ExportProgressButton';
import ModoPracticaGuiada from './actividades/ModoPracticaGuiada';
import AnalyticsPanel from './evaluacion/AnalyticsPanel';

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

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 0.25rem;
  font-weight: 700;
  background: ${props => props.$color ? `${props.$color}20` : 'transparent'};
  color: ${props => props.$color || 'inherit'};
  border: 1px solid ${props => props.$color ? `${props.$color}60` : 'transparent'};
  white-space: nowrap;
  animation: ${props => props.$status === 'excellent' ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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
    getCitations,
    globalTutorInteractions
  } = useContext(AppContext);
  // ✅ CORREGIDO: Iniciar con 'preparacion' según orden pedagógico
  const [activeSection, setActiveSection] = useState('preparacion');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Obtener documentId del análisis
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;

  // 🔎 Estado de preparación (MCQ + Síntesis completados)
  // Usar activitiesProgress del contexto en lugar de localStorage
  const preparacionCompletada = lectureId
    ? activitiesProgress?.[lectureId]?.preparation?.completed || false
    : false;



  // 🔒 Redirigir a preparación si se intenta acceder a artefactos sin completarla
  React.useEffect(() => {
    const artefactosSections = ['resumen', 'tabla-acd', 'mapa-actores', 'respuesta-argumentativa', 'bitacora-etica'];
    if (!preparacionCompletada && artefactosSections.includes(activeSection)) {
      logger.log('🚫 [Actividades] Acceso denegado a artefacto sin preparación, redirigiendo...');
      setActiveSection('preparacion');
    }
  }, [preparacionCompletada, activeSection]);

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

    if (!data || !data.scores || data.scores.length === 0) {
      return { status: 'empty', icon: '', label: '', color: '' };
    }

    const lastScore = data.scores[data.scores.length - 1].score;

    if (lastScore >= 8.6) {
      return {
        status: 'excellent',
        icon: '🌟',
        label: lastScore.toFixed(1),
        color: '#10b981' // verde brillante
      };
    } else if (lastScore >= 5.6) {
      return {
        status: 'good',
        icon: '✅',
        label: lastScore.toFixed(1),
        color: '#4CAF50' // verde
      };
    } else {
      return {
        status: 'needs-work',
        icon: '⏳',
        label: lastScore.toFixed(1),
        color: '#FF9800' // naranja
      };
    }
  }, [rubricProgress]);

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
              ✅ <strong>Primero completa la Preparación</strong> (autoevaluación + síntesis) para desbloquear los artefactos académicos formales.
            </>
          ) : (
            <>
              Preparación completada ✅ • Ahora puedes crear tus artefactos de análisis crítico con evaluación formativa.
            </>
          )}
        </HeaderDescription>
      </Header>

      {/* 🆕 Advertencia de borradores sin evaluar */}
      <DraftWarning theme={theme} />

      {/* Navegación por pestañas - ORDEN PEDAGÓGICO ÓPTIMO */}
      <TabsContainer role="tablist" aria-label="Actividades de literacidad crítica">
        {/* 1️⃣ PRIMERO: Preparación obligatoria */}
        <Tab
          role="tab"
          aria-selected={activeSection === 'preparacion'}
          aria-controls="panel-preparacion"
          $active={activeSection === 'preparacion'}
          onClick={() => setActiveSection('preparacion')}
          theme={theme}
        >
          <span>📋</span>
          Preparación
          {preparacionCompletada && ' ✅'}
        </Tab>

        {/* 🎮 Práctica guiada (sin bloqueo) */}
        <Tab
          role="tab"
          aria-selected={activeSection === 'practica'}
          aria-controls="panel-practica"
          $active={activeSection === 'practica'}
          onClick={() => setActiveSection('practica')}
          theme={theme}
        >
          <span>🎮</span>
          Práctica
        </Tab>

        {/* 2️⃣-6️⃣ LUEGO: Artefactos de las 5 rúbricas (bloqueados hasta completar preparación) */}
        <Tab
          role="tab"
          aria-selected={activeSection === 'resumen'}
          aria-controls="panel-resumen"
          $active={activeSection === 'resumen'}
          onClick={() => preparacionCompletada && setActiveSection('resumen')}
          disabled={!preparacionCompletada}
          theme={theme}
        >
          <span>📚</span>
          Resumen Académico
          <EstimatedTimeBadge minutes={15} theme={theme} compact />
          {!preparacionCompletada && ' 🔒'}
          {artefactoStatuses.rubrica1.icon && preparacionCompletada && (
            <StatusBadge $status={artefactoStatuses.rubrica1.status} $color={artefactoStatuses.rubrica1.color}>
              {artefactoStatuses.rubrica1.icon} {artefactoStatuses.rubrica1.label}
            </StatusBadge>
          )}
        </Tab>
        <Tab
          role="tab"
          aria-selected={activeSection === 'tabla-acd'}
          aria-controls="panel-tabla-acd"
          $active={activeSection === 'tabla-acd'}
          onClick={() => preparacionCompletada && setActiveSection('tabla-acd')}
          disabled={!preparacionCompletada}
          theme={theme}
        >
          <span>🔍</span>
          Análisis del Discurso
          <EstimatedTimeBadge minutes={18} theme={theme} compact />
          {!preparacionCompletada && ' 🔒'}
          {artefactoStatuses.rubrica2.icon && preparacionCompletada && (
            <StatusBadge $status={artefactoStatuses.rubrica2.status} $color={artefactoStatuses.rubrica2.color}>
              {artefactoStatuses.rubrica2.icon} {artefactoStatuses.rubrica2.label}
            </StatusBadge>
          )}
        </Tab>
        <Tab
          role="tab"
          aria-selected={activeSection === 'mapa-actores'}
          aria-controls="panel-mapa-actores"
          $active={activeSection === 'mapa-actores'}
          onClick={() => preparacionCompletada && setActiveSection('mapa-actores')}
          disabled={!preparacionCompletada}
          theme={theme}
        >
          <span>🗺️</span>
          Mapa de Actores
          <EstimatedTimeBadge minutes={12} theme={theme} compact />
          {!preparacionCompletada && ' 🔒'}
          {artefactoStatuses.rubrica3.icon && preparacionCompletada && (
            <StatusBadge $status={artefactoStatuses.rubrica3.status} $color={artefactoStatuses.rubrica3.color}>
              {artefactoStatuses.rubrica3.icon} {artefactoStatuses.rubrica3.label}
            </StatusBadge>
          )}
        </Tab>
        <Tab
          role="tab"
          aria-selected={activeSection === 'respuesta-argumentativa'}
          aria-controls="panel-respuesta-argumentativa"
          $active={activeSection === 'respuesta-argumentativa'}
          onClick={() => preparacionCompletada && setActiveSection('respuesta-argumentativa')}
          disabled={!preparacionCompletada}
          theme={theme}
        >
          <span>💭</span>
          Respuesta Argumentativa
          <EstimatedTimeBadge minutes={20} theme={theme} compact />
          {!preparacionCompletada && ' 🔒'}
          {artefactoStatuses.rubrica4.icon && preparacionCompletada && (
            <StatusBadge $status={artefactoStatuses.rubrica4.status} $color={artefactoStatuses.rubrica4.color}>
              {artefactoStatuses.rubrica4.icon} {artefactoStatuses.rubrica4.label}
            </StatusBadge>
          )}
        </Tab>
        <Tab
          role="tab"
          aria-selected={activeSection === 'bitacora-etica'}
          aria-controls="panel-bitacora-etica"
          $active={activeSection === 'bitacora-etica'}
          onClick={() => preparacionCompletada && setActiveSection('bitacora-etica')}
          disabled={!preparacionCompletada}
          theme={theme}
        >
          <span>🤖</span>
          Bitácora Ética IA
          <EstimatedTimeBadge minutes={10} theme={theme} compact />
          {!preparacionCompletada && ' 🔒'}
          {artefactoStatuses.rubrica5.icon && preparacionCompletada && (
            <StatusBadge $status={artefactoStatuses.rubrica5.status} $color={artefactoStatuses.rubrica5.color}>
              {artefactoStatuses.rubrica5.icon} {artefactoStatuses.rubrica5.label}
            </StatusBadge>
          )}
        </Tab>

        {/* 7️⃣ DESPUÉS: Metacognición y progreso */}
        <Tab
          role="tab"
          aria-selected={activeSection === 'progreso'}
          aria-controls="panel-progreso"
          $active={activeSection === 'progreso'}
          onClick={() => setActiveSection('progreso')}
          theme={theme}
        >
          <span>📊</span>
          Mi Progreso
        </Tab>
      </TabsContainer>

      {/* Contenido según sección activa */}
      <AnimatePresence mode="wait">
        {activeSection === 'resumen' && (
          <motion.div
            key="resumen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={
              <LoadingFallback theme={theme}>
                <Spinner theme={theme} />
                <LoadingText theme={theme}>📚 Cargando Resumen Académico...</LoadingText>
              </LoadingFallback>
            }>
              <ErrorBoundary
                theme={theme}
                componentName="Resumen Académico"
                onReset={() => logger.log('🔄 Reseteando Resumen Académico')}
              >
                <ResumenAcademico theme={theme} />
              </ErrorBoundary>
            </Suspense>

            {/* ✅ GUÍA PEDAGÓGICA: Siguiente paso */}
            <NextStepCard
              icon="🔍"
              title="Siguiente Paso: Análisis Crítico del Discurso"
              description="Has creado tu resumen académico. Ahora profundiza identificando marcos ideológicos, estrategias retóricas y voces presentes/silenciadas."
              actionLabel="Ir a Análisis del Discurso →"
              onAction={() => setActiveSection('tabla-acd')}
              theme={theme}
              variant="primary"
            />
          </motion.div>
        )}

        {activeSection === 'tabla-acd' && (
          <motion.div
            key="tabla-acd"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={
              <LoadingFallback theme={theme}>
                <Spinner theme={theme} />
                <LoadingText theme={theme}>🔍 Cargando Tabla ACD...</LoadingText>
              </LoadingFallback>
            }>
              <ErrorBoundary
                theme={theme}
                componentName="Tabla ACD"
                onReset={() => logger.log('🔄 Reseteando Tabla ACD')}
              >
                <TablaACD theme={theme} />
              </ErrorBoundary>
            </Suspense>

            {/* ✅ GUÍA PEDAGÓGICA: Siguiente paso */}
            <NextStepCard
              icon="🗺️"
              title="Siguiente Paso: Mapa de Actores y Consecuencias"
              description="Has completado tu Tabla ACD. Ahora contextualiza el texto identificando actores sociales, conexiones e impacto."
              actionLabel="Ir a Mapa de Actores →"
              onAction={() => setActiveSection('mapa-actores')}
              theme={theme}
              variant="primary"
            />
          </motion.div>
        )}

        {activeSection === 'mapa-actores' && (
          <motion.div
            key="mapa-actores"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={
              <LoadingFallback theme={theme}>
                <Spinner theme={theme} />
                <LoadingText theme={theme}>🗺️ Cargando Mapa de Actores...</LoadingText>
              </LoadingFallback>
            }>
              <ErrorBoundary
                theme={theme}
                componentName="Mapa de Actores"
                onReset={() => logger.log('🔄 Reseteando Mapa de Actores')}
              >
                <MapaActores theme={theme} />
              </ErrorBoundary>
            </Suspense>

            {/* ✅ GUÍA PEDAGÓGICA: Siguiente paso */}
            <NextStepCard
              icon="💭"
              title="Siguiente Paso: Respuesta Argumentativa"
              description="Has completado el Mapa de Actores. Ahora construye tu propia postura fundamentada con tesis, evidencias y contraargumentos."
              actionLabel="Ir a Respuesta Argumentativa →"
              onAction={() => setActiveSection('respuesta-argumentativa')}
              theme={theme}
              variant="primary"
            />
          </motion.div>
        )}

        {activeSection === 'respuesta-argumentativa' && (
          <motion.div
            key="respuesta-argumentativa"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={
              <LoadingFallback theme={theme}>
                <Spinner theme={theme} />
                <LoadingText theme={theme}>💭 Cargando Respuesta Argumentativa...</LoadingText>
              </LoadingFallback>
            }>
              <ErrorBoundary
                theme={theme}
                componentName="Respuesta Argumentativa"
                onReset={() => logger.log('🔄 Reseteando Respuesta Argumentativa')}
              >
                <RespuestaArgumentativa theme={theme} />
              </ErrorBoundary>
            </Suspense>

            {/* ✅ GUÍA PEDAGÓGICA: Siguiente paso */}
            <NextStepCard
              icon="🤖"
              title="Siguiente Paso: Bitácora Ética del Uso de IA"
              description="Has completado tu Respuesta Argumentativa. Ahora reflexiona sobre el uso ético y responsable de IA en tu aprendizaje."
              actionLabel="Ir a Bitácora Ética →"
              onAction={() => setActiveSection('bitacora-etica')}
              theme={theme}
              variant="primary"
            />
          </motion.div>
        )}

        {activeSection === 'bitacora-etica' && (
          <motion.div
            key="bitacora-etica"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={
              <LoadingFallback theme={theme}>
                <Spinner theme={theme} />
                <LoadingText theme={theme}>🤖 Cargando Bitácora Ética IA...</LoadingText>
              </LoadingFallback>
            }>
              <ErrorBoundary
                theme={theme}
                componentName="Bitácora Ética IA"
                onReset={() => logger.log('🔄 Reseteando Bitácora Ética')}
              >
                <BitacoraEticaIA theme={theme} />
              </ErrorBoundary>
            </Suspense>

            {/* ✅ GUÍA PEDAGÓGICA: Siguiente paso según flujo pedagógico */}
            <NextStepCard
              icon="📊"
              title="Siguiente Paso: Revisa tu Progreso"
              description="Has completado las 5 rúbricas de literacidad crítica. Ahora visualiza tu progreso y reflexiona sobre tu evolución en las diferentes dimensiones del análisis crítico."
              actionLabel="Ver Mi Progreso →"
              onAction={() => setActiveSection('progreso')}
              theme={theme}
              variant="primary"
            />
          </motion.div>
        )}

        {activeSection === 'preparacion' && (
          <motion.div
            key="preparacion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <PreguntasPersonalizadas theme={theme} />

            {/* ✅ GUÍA PEDAGÓGICA: Siguiente paso (solo si completó preparación) */}
            {preparacionCompletada && (
              <NextStepCard
                icon="📚"
                title="¡Preparación Completada! Siguiente: Resumen Académico"
                description="Has validado tu comprensión del texto. Ahora crea tu primer artefacto formal: un resumen académico estructurado con evaluación criterial."
                actionLabel="Ir a Resumen Académico →"
                onAction={() => setActiveSection('resumen')}
                theme={theme}
                variant="primary"
              />
            )}
          </motion.div>
        )}

        {activeSection === 'practica' && (
          <motion.div
            key="practica"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ModoPracticaGuiada theme={theme} rubricProgress={rubricProgress} />
          </motion.div>
        )}

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
                    // Mapeo de rúbricas a secciones de artefactos
                    const rubricToSection = {
                      'rubrica1': 'resumen',
                      'rubrica2': 'tabla-acd',
                      'rubrica3': 'mapa-actores',
                      'rubrica4': 'respuesta-argumentativa',
                      'rubrica5': 'bitacora-etica'
                    };

                    const targetSection = rubricToSection[rubricId];
                    if (targetSection) {
                      logger.log(`📍 Navegando a artefacto: ${targetSection}`);
                      setActiveSection(targetSection);
                    }
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
                    <strong>Tip:</strong> Haz clic en cualquier tarjeta de rúbrica para ir directamente al artefacto correspondiente y revisarlo o mejorarlo.
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
                  />
                </div>

                {/* 🆕 Botón crítico: al final */}
                <ProgressActionsBar theme={theme}>
                  <ResetButton
                    $variant="danger"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={!rubricProgress || Object.values(rubricProgress).every(r => {
                      const formativeCount = r?.scores?.length || 0;
                      const summativeScore = Number(r?.summative?.score);
                      const hasSummative = r?.summative?.status === 'graded' && Number.isFinite(summativeScore) && summativeScore > 0;
                      return formativeCount === 0 && !hasSummative;
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
