// src/components/SistemaEvaluacionMejorado.js
import React, { useState, useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import { lightTheme, darkTheme } from '../styles/theme';
import EnhancedDashboard from './evaluacion/EnhancedDashboard';
import AnalyticsPanel from './evaluacion/AnalyticsPanel';
import ExportPanel from './evaluacion/ExportPanel';
import GuidedPracticeMode from './evaluacion/GuidedPracticeMode';
import HintsSystem from './evaluacion/HintsSystem';
import PrerequisitosChecklist from './evaluacion/PrerequisitosChecklist';
import ErrorDisplay from './evaluacion/ErrorDisplay';
import EvaluationProgress from './evaluacion/EvaluationProgress';
import SkipNavigation from './common/SkipNavigation';
import { announceToScreenReader, ariaHelpers } from '../utils/accessibility';
import { generarPregunta, evaluarRespuesta, sugerirArtefactos, DIMENSION_MAP } from '../services/evaluacionIntegral.service';
import { generarConRetry, evaluarConRetry } from '../services/retryWrapper';
import { createEvaluationError } from '../services/evaluationErrors';
import useActivityPersistence from '../hooks/useActivityPersistence';
import AlertMessage from './AlertMessage';
import NextStepCard from './common/NextStepCard';

// ============================================
// STYLED COMPONENTS
// ============================================

const Container = styled.div`
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  color: ${props => props.theme.text};
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const Title = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${props => props.theme.text};
  
  @media (max-width: 640px) {
    font-size: 1.5rem;
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
  
  @media (max-width: 640px) {
    font-size: 0.875rem;
    padding: 0 0.5rem;
  }
`;

const SelectorDimension = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SelectorTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SelectorSubtitle = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
  
  strong {
    color: ${props => props.theme.primary};
    font-weight: 600;
  }
`;

const DimensionesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const DimensionCard = styled.button`
  background: ${props => props.$selected ? props.theme.primary : 'transparent'};
  color: ${props => props.$selected ? 'white' : props.theme.text};
  border: 2px solid ${props => props.$selected ? props.theme.primary : props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.$selected ? props.theme.primary : props.theme.border}40;
  }
`;

const DimensionIcon = styled.div`
  font-size: 1.5rem;
`;

const DimensionNombre = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
`;

const PreguntaCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
    border-radius: 8px;
  }
`;

const PreguntaHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const DimensionBadge = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const PreguntaTexto = styled.div`
  font-size: 1.1rem;
  line-height: 1.6;
  color: ${props => props.theme.text};
  font-weight: 500;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${props => props.theme.background};
  border-left: 4px solid ${props => props.theme.primary};
  border-radius: 4px;
  
  @media (max-width: 640px) {
    font-size: 1rem;
    padding: 0.75rem;
    line-height: 1.5;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.primary}20;
  }
  
  &::placeholder {
    color: ${props => props.theme.textMuted};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme.success};
  color: white;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme.text};
  border: 1px solid ${props => props.theme.border};

  &:hover:not(:disabled) {
    background: ${props => props.theme.surfaceHover};
  }
`;

const CharCount = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
`;

const FeedbackCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 2px solid ${props => props.theme.primary};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FeedbackHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ScoreBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ScoreValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => {
    const score = props.$score;
    if (score >= 8.6) return '#8b5cf6';
    if (score >= 5.6) return '#10b981';
    if (score >= 2.6) return '#f59e0b';
    return '#ef4444';
  }};
`;

const NivelLabel = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${props => {
    const nivel = props.$nivel;
    if (nivel === 4) return '#e9d5ff';
    if (nivel === 3) return '#dcfce7';
    if (nivel === 2) return '#fed7aa';
    return '#fee2e2';
  }};
  color: ${props => {
    const nivel = props.$nivel;
    if (nivel === 4) return '#6b21a8';
    if (nivel === 3) return '#166534';
    if (nivel === 2) return '#c2410c';
    return '#991b1b';
  }};
  font-weight: 700;
  font-size: 0.9rem;
`;

const FeedbackSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  color: ${props => props.theme.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ListaItems = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ListItem = styled.li`
  padding-left: 1.5rem;
  position: relative;
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;

  &::before {
    content: '${props => props.$icon}';
    position: absolute;
    left: 0;
  }
`;

const Detalles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  background: ${props => props.theme.background};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const DetalleItem = styled.div`
  text-align: center;
`;

const DetalleLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
`;

const DetalleValor = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
`;

const SugerenciasCard = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1.5rem;
`;

const SugerenciaItem = styled.div`
  padding: 1rem;
  background: ${props => props.theme.background};
  border-left: 4px solid ${props => props.theme.primary};
  border-radius: 4px;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`;

const SugerenciaNombre = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 0.25rem;
`;

const SugerenciaRazon = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
`;

const LoadingSpinner = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1rem;
`;

const SpinnerIcon = styled(motion.div)`
  font-size: 3rem;
`;

const LoadingText = styled.div`
  color: ${props => props.theme.textMuted};
  font-size: 0.95rem;
`;

// ============================================
// DIMENSIONES DISPONIBLES
// ============================================

const DIMENSIONES = [
  { id: 'comprension_analitica', nombre: 'Comprensión Analítica', icono: '📚' },
  { id: 'acd', nombre: 'Análisis Ideológico-Discursivo', icono: '🔍' },
  { id: 'contextualizacion', nombre: 'Contextualización Socio-Histórica', icono: '🗺️' },
  { id: 'argumentacion', nombre: 'Argumentación y Contraargumento', icono: '💭' },
  { id: 'metacognicion_etica_ia', nombre: 'Metacognición Ética del Uso de IA', icono: '🤖' }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SistemaEvaluacionMejorado() {
  const { texto, completeAnalysis, modoOscuro, rubricProgress, updateRubricScore } = useContext(AppContext);
  const theme = modoOscuro ? darkTheme : lightTheme;

  // Estados
  const [dimensionSeleccionada, setDimensionSeleccionada] = useState(null);
  const [preguntaActual, setPreguntaActual] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);
  const [prerequisitosFaltantes, setPrerequisitosFaltantes] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryCallback, setRetryCallback] = useState(null);
  const [progressStep, setProgressStep] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  
  // Estados para modo práctica guiada
  const [guidedMode, setGuidedMode] = useState(null); // { difficulty, hints, level }
  const [revealedHintsCount, setRevealedHintsCount] = useState(0);

  // Persistencia
  const documentId = completeAnalysis?.metadata?.document_id || 'general';
  const persistenceKey = documentId; // Usar directamente el document_id

  const { saveManual, clearResults, getMetrics } = useActivityPersistence(persistenceKey, {
    enabled: !!documentId && !!texto,
    studentAnswers: { 
      [dimensionSeleccionada || 'general']: respuesta 
    },
    aiFeedbacks: { 
      [dimensionSeleccionada || 'general']: feedback 
    },
    currentIndex: dimensionSeleccionada ? DIMENSIONES.findIndex(d => d.id === dimensionSeleccionada) : 0,
    onRehydrate: useCallback((data) => {
      console.log('🔄 [SistemaEvaluacion] Rehidratando datos:', data);
      
      // Restaurar respuesta de la dimensión actual
      const savedAnswer = data.student_answers?.[dimensionSeleccionada];
      if (savedAnswer) {
        setRespuesta(savedAnswer);
      }
      
      // Restaurar feedback de la dimensión actual
      const savedFeedback = data.ai_feedbacks?.[dimensionSeleccionada];
      if (savedFeedback) {
        setFeedback(savedFeedback);
      }
    }, [dimensionSeleccionada])
  });

  // Generar nueva pregunta
  const handleGenerarPregunta = useCallback(async () => {
    if (!texto || !dimensionSeleccionada || cargando) return;

    setCargando(true);
    setError(null);
    setRespuesta('');
    setFeedback(null);
    setSugerencias([]);
    setPrerequisitosFaltantes(null);
    setRetryAttempt(0);
    setProgressStep('generating');
    setProgressPercent(0);

    try {
      const result = await generarConRetry(
        generarPregunta,
        {
          texto,
          completeAnalysis,
          dimension: dimensionSeleccionada,
          nivelDificultad: 'intermedio',
          onProgress: (prog) => {
            setProgressStep(prog.step);
            setProgressPercent(prog.progress);
          }
        },
        (progress) => {
          if (progress.type === 'attempt') {
            setRetryAttempt(progress.attempt);
          }
        }
      );

      // Verificar si faltan prerequisitos
      if (result.needsPrerequisites) {
        setPrerequisitosFaltantes(result);
        return;
      }

      setPreguntaActual(result);
      setRetryAttempt(0);
      setProgressStep(null);
      setProgressPercent(0);
      announceToScreenReader('Pregunta generada exitosamente. Puedes comenzar a responder.');
    } catch (err) {
      console.error('❌ Error generando pregunta:', err);
      console.error('Error type:', typeof err);
      console.error('Error message:', err?.message);
      console.error('Error stack:', err?.stack);
      console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      
      const evaluationError = createEvaluationError(err);
      console.log('✅ Evaluation error created:', evaluationError);
      console.log('Error type:', evaluationError.type);
      console.log('Error message:', evaluationError.message);
      
      setError(evaluationError);
      
      if (evaluationError.retryable) {
        setRetryCallback(() => handleGenerarPregunta);
      }
      setProgressStep(null);
      setProgressPercent(0);
    } finally {
      setCargando(false);
    }
  }, [texto, completeAnalysis, dimensionSeleccionada, cargando]);

  // Evaluar respuesta
  const handleEvaluar = useCallback(async () => {
    if (!preguntaActual || !respuesta.trim() || evaluando) return;

    // Validación client-side
    if (respuesta.trim().length < 50) {
      const shortError = createEvaluationError(new Error('Tu respuesta debe tener al menos 50 caracteres'));
      setError(shortError);
      return;
    }

    if (respuesta.length > 2000) {
      const longError = createEvaluationError(new Error('Tu respuesta no debe exceder 2000 caracteres'));
      setError(longError);
      return;
    }

    setEvaluando(true);
    setError(null);
    setRetryAttempt(0);
    setProgressStep('submitting');
    setProgressPercent(0);

    try {
      const result = await evaluarConRetry(
        evaluarRespuesta,
        {
          texto,
          pregunta: preguntaActual.pregunta,
          respuesta,
          dimension: dimensionSeleccionada,
          onProgress: (prog) => {
            setProgressStep(prog.step);
            setProgressPercent(prog.progress);
          }
        },
        (progress) => {
          if (progress.type === 'attempt') {
            setRetryAttempt(progress.attempt);
          }
        }
      );

      // Adaptar feedback según modo guiado si está activo
      let finalResult = result;
      if (guidedMode && guidedMode.difficulty) {
        const { adaptFeedbackToDifficulty } = require('../services/practiceService');
        const adaptedFeedback = adaptFeedbackToDifficulty(
          result.feedback_estructura + '\n\n' + result.feedback_profundidad,
          guidedMode.difficulty,
          result.score
        );
        finalResult = {
          ...result,
          feedback_combined: adaptedFeedback,
          practiceMode: {
            difficulty: guidedMode.difficulty,
            level: guidedMode.level.label,
            hintsUsed: revealedHintsCount
          }
        };
      }
      
      setFeedback(finalResult);
      setRetryAttempt(0);
      setProgressStep(null);
      setProgressPercent(0);
      announceToScreenReader(
        `Evaluación completada. Obtuviste ${finalResult.score} puntos sobre 10, nivel ${finalResult.nivel} de 4.`,
        'assertive'
      );

      // Actualizar progreso de rúbrica
      const rubricId = DIMENSION_MAP[dimensionSeleccionada];
      if (rubricId && updateRubricScore) {
        updateRubricScore(rubricId, {
          score: result.score,
          nivel: result.nivel,
          artefacto: 'Evaluacion',
          criterios: result.detalles
        });
      }

      // Generar sugerencias
      const sugerenciasGeneradas = sugerirArtefactos(result, rubricProgress);
      setSugerencias(sugerenciasGeneradas);

    } catch (err) {
      console.error('Error evaluando respuesta:', err);
      const evaluationError = createEvaluationError(err);
      setError(evaluationError);
      
      if (evaluationError.retryable) {
        setRetryCallback(() => handleEvaluar);
      }
      setProgressStep(null);
      setProgressPercent(0);
    } finally {
      setEvaluando(false);
    }
  }, [preguntaActual, respuesta, evaluando, texto, dimensionSeleccionada, rubricProgress, updateRubricScore]);

  // Manejar selección de dimensión desde dashboard
  const handleSelectFromDashboard = useCallback((rubricId) => {
    const dimensionKey = Object.keys(DIMENSION_MAP).find(k => DIMENSION_MAP[k] === rubricId);
    if (dimensionKey) {
      setDimensionSeleccionada(dimensionKey);
      setPreguntaActual(null);
      setRespuesta('');
      setFeedback(null);
      setSugerencias([]);
      setPrerequisitosFaltantes(null);
      setError(null);
      setRetryAttempt(0);
    }
  }, []);

  // Nueva pregunta (resetear todo)
  const handleNuevaPregunta = useCallback(() => {
    setPreguntaActual(null);
    setRespuesta('');
    setFeedback(null);
    setSugerencias([]);
    setPrerequisitosFaltantes(null);
    setError(null);
    setRetryAttempt(0);
  }, []);

  // Navegar a otra pestaña desde prerequisitos
  const handleNavigateFromPrerequisites = useCallback((tabId) => {
    window.dispatchEvent(new CustomEvent('app-change-tab', { 
      detail: { tabId } 
    }));
  }, []);

  // Handlers para modo guiado
  const handleStartGuidedPractice = useCallback((practiceConfig) => {
    setGuidedMode(practiceConfig);
    setRevealedHintsCount(0);
    announceToScreenReader(`Modo de práctica guiada activado. Nivel: ${practiceConfig.level.label}`);
  }, []);

  const handleHintRevealed = useCallback((index, hint) => {
    setRevealedHintsCount(prev => prev + 1);
    announceToScreenReader(`Hint revelado: ${hint}`);
  }, []);

  if (!texto) {
    return (
      <Container>
        <Header>
          <Title>📝 Evaluación Criterial Integral</Title>
          <Subtitle>Evalúa tu literacidad crítica en las 5 dimensiones pedagógicas</Subtitle>
        </Header>
        <AlertMessage type="info" message="Carga un texto para comenzar la evaluación." />
      </Container>
    );
  }

  return (
    <Container 
      role="main"
      aria-label="Sistema de evaluación de literacidad crítica"
      id="main-content"
      tabIndex={-1}
    >
      <SkipNavigation theme={theme} />
      <Header theme={theme} role="banner">
        <Title theme={theme} as="h1">📝 Evaluación Criterial Integral</Title>
        <Subtitle>
          Evalúa tu literacidad crítica en las 5 dimensiones pedagógicas con preguntas contextualizadas y feedback dual (DeepSeek + OpenAI)
        </Subtitle>
      </Header>

      {/* Dashboard de progreso */}
      <div id="dashboard-rubricas">
        <EnhancedDashboard 
          rubricProgress={rubricProgress}
          theme={theme} 
          onSelectRubric={handleSelectFromDashboard} 
        />
      </div>

      {/* Panel de analíticas */}
      <AnalyticsPanel 
        rubricProgress={rubricProgress}
        theme={theme}
      />

      {/* Panel de exportación */}
      <ExportPanel 
        rubricProgress={rubricProgress}
        theme={theme}
      />

      {/* Modo de práctica guiada */}
      {!preguntaActual && !feedback && (
        <GuidedPracticeMode
          rubricProgress={rubricProgress}
          selectedDimension={dimensionSeleccionada}
          onStartPractice={handleStartGuidedPractice}
          theme={theme}
        />
      )}

      {/* Prerequisitos faltantes */}
      {prerequisitosFaltantes && (
        <PrerequisitosChecklist
          dimension={prerequisitosFaltantes.dimension}
          faltantes={prerequisitosFaltantes.faltantes}
          onNavigate={handleNavigateFromPrerequisites}
          theme={theme}
        />
      )}

      {/* Display de errores */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={retryCallback ? () => retryCallback() : null}
          onDismiss={() => setError(null)}
          attempt={retryAttempt}
          maxAttempts={3}
          showDetails={process.env.NODE_ENV === 'development'}
          theme={theme}
        />
      )}

      {/* Progreso de operaciones */}
      {(cargando || evaluando) && progressStep && (
        <EvaluationProgress
          mode={cargando ? 'generating' : 'evaluating'}
          currentStep={progressStep}
          progress={progressPercent}
          theme={theme}
        />
      )}

      {/* Selector de dimensión */}
      {!preguntaActual && !feedback && !prerequisitosFaltantes && (
        <SelectorDimension 
          theme={theme}
          role="region"
          aria-label="Selección de dimensión a evaluar"
        >
          <SelectorTitle theme={theme}>
            🎯 Selecciona la dimensión que deseas evaluar
          </SelectorTitle>
          <SelectorSubtitle theme={theme}>
            Solo puedes evaluar <strong>una dimensión a la vez</strong> para garantizar un análisis profundo y contextualizado.
            {dimensionSeleccionada && (
              <span style={{ display: 'block', marginTop: '0.5rem', color: theme.success }}>
                ✅ Dimensión seleccionada: <strong>{DIMENSIONES.find(d => d.id === dimensionSeleccionada)?.nombre}</strong>
              </span>
            )}
          </SelectorSubtitle>
          <DimensionesGrid>
            {DIMENSIONES.map((dim) => (
              <DimensionCard
                key={dim.id}
                $selected={dimensionSeleccionada === dim.id}
                theme={theme}
                onClick={() => {
                  setDimensionSeleccionada(dim.id);
                  announceToScreenReader(`Dimensión ${dim.nombre} seleccionada`);
                }}
                role="button"
                tabIndex={0}
                aria-pressed={dimensionSeleccionada === dim.id}
                aria-label={`Seleccionar dimensión: ${dim.nombre}`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDimensionSeleccionada(dim.id);
                    announceToScreenReader(`Dimensión ${dim.nombre} seleccionada`);
                  }
                }}
              >
                <DimensionIcon>{dim.icono}</DimensionIcon>
                <DimensionNombre>{dim.nombre}</DimensionNombre>
              </DimensionCard>
            ))}
          </DimensionesGrid>

          {dimensionSeleccionada && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <PrimaryButton theme={theme} onClick={handleGenerarPregunta} disabled={cargando}>
                {cargando ? '⏳ Generando pregunta...' : '✨ Generar Pregunta Contextualizada'}
              </PrimaryButton>
            </div>
          )}
        </SelectorDimension>
      )}

      {/* Loading */}
      {cargando && (
        <LoadingSpinner>
          <SpinnerIcon
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            🔄
          </SpinnerIcon>
          <LoadingText theme={theme}>Generando pregunta contextualizada con IA...</LoadingText>
        </LoadingSpinner>
      )}

      {/* Pregunta y respuesta */}
      {preguntaActual && !feedback && !cargando && (
        <PreguntaCard
          theme={theme}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PreguntaHeader>
            <DimensionBadge theme={theme}>
              {preguntaActual.dimensionLabel}
            </DimensionBadge>
            <span style={{ fontSize: '0.85rem', color: theme.textMuted }}>
              Nivel: {preguntaActual.nivelDificultad}
            </span>
          </PreguntaHeader>

          <PreguntaTexto theme={theme}>
            {preguntaActual.pregunta}
          </PreguntaTexto>

          {/* Sistema de hints en modo guiado */}
          {guidedMode && guidedMode.hints && guidedMode.hints.length > 0 && (
            <HintsSystem
              hints={guidedMode.hints}
              maxHints={guidedMode.level.hintsAvailable}
              onHintRevealed={handleHintRevealed}
              theme={theme}
            />
          )}

          <Textarea
            theme={theme}
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Escribe tu respuesta aquí... Procura ser específico y usar evidencias del texto."
            disabled={evaluando}
            aria-label="Tu respuesta a la pregunta de evaluación"
            aria-required="true"
            aria-describedby="respuesta-hint"
            aria-invalid={respuesta.length > 0 && respuesta.length < 50}
          />
          <span id="respuesta-hint" style={{ position: 'absolute', left: '-10000px' }}>
            Escribe una respuesta de al menos 50 caracteres para ser evaluada.
          </span>

          <ButtonGroup>
            <CharCount theme={theme}>
              {respuesta.length} caracteres
            </CharCount>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <SecondaryButton theme={theme} onClick={handleNuevaPregunta} disabled={evaluando}>
                🔄 Nueva Pregunta
              </SecondaryButton>
              <PrimaryButton
                theme={theme}
                onClick={handleEvaluar}
                disabled={!respuesta.trim() || respuesta.length < 50 || evaluando}
              >
                {evaluando ? '⏳ Evaluando...' : '✅ Evaluar con IA Dual'}
              </PrimaryButton>
            </div>
          </ButtonGroup>
        </PreguntaCard>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {feedback && !evaluando && (
          <FeedbackCard
            theme={theme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FeedbackHeader>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.text }}>
                  📊 Evaluación Criterial (IA Dual)
                </h3>
                <DimensionBadge theme={theme}>{feedback.dimensionLabel}</DimensionBadge>
              </div>
              <ScoreBadge>
                <div>
                  <ScoreValue $score={feedback.score}>{feedback.score}/10</ScoreValue>
                </div>
                <NivelLabel $nivel={feedback.nivel}>
                  Nivel {feedback.nivel}/4
                </NivelLabel>
              </ScoreBadge>
            </FeedbackHeader>

            {/* Detalles */}
            <Detalles theme={theme}>
              <DetalleItem>
                <DetalleLabel theme={theme}>Claridad</DetalleLabel>
                <DetalleValor theme={theme}>{feedback.detalles.claridad}/4</DetalleValor>
              </DetalleItem>
              <DetalleItem>
                <DetalleLabel theme={theme}>Anclaje</DetalleLabel>
                <DetalleValor theme={theme}>{feedback.detalles.anclaje}/4</DetalleValor>
              </DetalleItem>
              <DetalleItem>
                <DetalleLabel theme={theme}>Completitud</DetalleLabel>
                <DetalleValor theme={theme}>{feedback.detalles.completitud}/4</DetalleValor>
              </DetalleItem>
              <DetalleItem>
                <DetalleLabel theme={theme}>Profundidad</DetalleLabel>
                <DetalleValor theme={theme}>{feedback.detalles.profundidad}/4</DetalleValor>
              </DetalleItem>
              <DetalleItem>
                <DetalleLabel theme={theme}>Comprensión</DetalleLabel>
                <DetalleValor theme={theme}>{feedback.detalles.comprension}/4</DetalleValor>
              </DetalleItem>
              <DetalleItem>
                <DetalleLabel theme={theme}>Originalidad</DetalleLabel>
                <DetalleValor theme={theme}>{feedback.detalles.originalidad}/4</DetalleValor>
              </DetalleItem>
            </Detalles>

            {/* Fortalezas */}
            {feedback.fortalezas?.length > 0 && (
              <FeedbackSection>
                <SectionTitle theme={theme}>✅ Fortalezas</SectionTitle>
                <ListaItems>
                  {feedback.fortalezas.map((f, idx) => (
                    <ListItem key={idx} theme={theme} $icon="✓">
                      {f}
                    </ListItem>
                  ))}
                </ListaItems>
              </FeedbackSection>
            )}

            {/* Mejoras */}
            {feedback.mejoras?.length > 0 && (
              <FeedbackSection>
                <SectionTitle theme={theme}>💡 Oportunidades de mejora</SectionTitle>
                <ListaItems>
                  {feedback.mejoras.map((m, idx) => (
                    <ListItem key={idx} theme={theme} $icon="→">
                      {m}
                    </ListItem>
                  ))}
                </ListaItems>
              </FeedbackSection>
            )}

            {/* Comentario crítico */}
            {feedback.comentarioCritico && (
              <FeedbackSection>
                <SectionTitle theme={theme}>📝 Comentario Crítico</SectionTitle>
                <p style={{ color: theme.textSecondary, fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                  {feedback.comentarioCritico}
                </p>
              </FeedbackSection>
            )}

            {/* Feedback adaptado de modo guiado */}
            {feedback.feedback_combined && feedback.practiceMode && (
              <FeedbackSection>
                <SectionTitle theme={theme}>
                  🎯 Feedback del Modo Práctica ({feedback.practiceMode.level})
                </SectionTitle>
                <p style={{ color: theme.textSecondary, fontSize: '0.95rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {feedback.feedback_combined}
                </p>
                {feedback.practiceMode.hintsUsed > 0 && (
                  <p style={{ color: theme.textMuted, fontSize: '0.85rem', marginTop: '0.75rem' }}>
                    💡 Utilizaste {feedback.practiceMode.hintsUsed} hint(s) durante esta práctica.
                  </p>
                )}
              </FeedbackSection>
            )}

            <ButtonGroup>
              <SecondaryButton theme={theme} onClick={handleNuevaPregunta}>
                🔄 Nueva Pregunta
              </SecondaryButton>
            </ButtonGroup>
          </FeedbackCard>
        )}
      </AnimatePresence>

      {/* Sugerencias de artefactos */}
      {sugerencias.length > 0 && (
        <SugerenciasCard theme={theme}>
          <h4 style={{ margin: '0 0 1rem 0', color: theme.text }}>
            💡 Artefactos sugeridos para mejorar
          </h4>
          {sugerencias.map((sug, idx) => (
            <SugerenciaItem key={idx} theme={theme}>
              <SugerenciaNombre theme={theme}>
                {sug.icono} {sug.nombre}
              </SugerenciaNombre>
              <SugerenciaRazon theme={theme}>{sug.razon}</SugerenciaRazon>
            </SugerenciaItem>
          ))}
        </SugerenciasCard>
      )}

      {/* Controles de persistencia */}
      {(respuesta || feedback) && (
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          justifyContent: 'center', 
          marginTop: '1rem',
          flexWrap: 'wrap'
        }}>
          <SecondaryButton 
            theme={theme} 
            onClick={() => {
              saveManual();
              alert('✅ Progreso guardado manualmente');
            }}
            style={{ fontSize: '0.9rem' }}
          >
            💾 Guardar Progreso
          </SecondaryButton>
          <SecondaryButton 
            theme={theme} 
            onClick={() => {
              if (window.confirm('¿Estás seguro de que quieres borrar tu progreso en esta dimensión?')) {
                clearResults();
                setRespuesta('');
                setFeedback(null);
                setSugerencias([]);
                alert('🗑️ Progreso eliminado');
              }
            }}
            style={{ fontSize: '0.9rem', opacity: 0.7 }}
          >
            🗑️ Limpiar Progreso
          </SecondaryButton>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: '1rem' }}>
          <AlertMessage 
            type="error" 
            message={error instanceof Error ? error.message : (error.message || String(error))} 
          />
        </div>
      )}

      {/* Next Step Card */}
      <NextStepCard
        icon="📚"
        title="Practica con Artefactos Formativos"
        description="La evaluación criterial te muestra tu nivel actual. Para mejorar, ve a la pestaña Actividades y practica con los artefactos pedagógicos que reciben feedback formativo detallado."
        actionLabel="Ir a Actividades →"
        onAction={() => {
          window.dispatchEvent(new CustomEvent('app-change-tab', { 
            detail: { tabId: 'actividades' } 
          }));
        }}
        theme={theme}
        variant="primary"
      />
    </Container>
  );
}

