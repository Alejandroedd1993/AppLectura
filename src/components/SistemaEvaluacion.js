// src/components/SistemaEvaluacionMejorado.js
/* eslint-disable no-unused-vars */
import React, { useState, useCallback, useContext } from 'react';
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
import { announceToScreenReader } from '../utils/accessibility';
import { generarPregunta, evaluarRespuesta, sugerirArtefactos, DIMENSION_MAP } from '../services/evaluacionIntegral.service';
import { generarConRetry, evaluarConRetry } from '../services/retryWrapper';
import { createEvaluationError } from '../services/evaluationErrors';
import useActivityPersistence from '../hooks/useActivityPersistence';
import AlertMessage from './AlertMessage';
import NextStepCard from './common/NextStepCard';
import EnsayoIntegrador from './ensayoIntegrador/EnsayoIntegrador';
import DashboardRubricas from './evaluacion/DashboardRubricas';

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
  const { texto, completeAnalysis, modoOscuro, rubricProgress, updateRubricScore, currentTextoId } = useContext(AppContext);
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
  const legacyDocumentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || legacyDocumentId || 'general';
  const persistenceKey = lectureId; // 🆕 Clave estable por lectura (textoId)

  const { saveManual, clearResults, getMetrics: _getMetrics } = useActivityPersistence(persistenceKey, {
    enabled: !!lectureId && !!texto,
    legacyDocumentIds: legacyDocumentId && legacyDocumentId !== lectureId ? [legacyDocumentId] : [],
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
          criterios: result.detalles,
          textoId: currentTextoId // 🛡️ CRÍTICO: Asegurar que se guarde en el documento correcto
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
  }, [preguntaActual, respuesta, evaluando, texto, dimensionSeleccionada, rubricProgress, updateRubricScore, currentTextoId]);

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
          <Title>📝 Ensayo Integrador (Evaluación Final)</Title>
          <Subtitle>Envía tu ensayo integrador y recibe evaluación IA dual</Subtitle>
        </Header>
        <AlertMessage type="info" message="Carga un texto para comenzar la evaluación." />
      </Container>
    );
  }

  return (
    <Container
      role="main"
      aria-label="Evaluación final: Ensayo Integrador"
      id="main-content"
      tabIndex={-1}
    >
      <SkipNavigation
        theme={theme}
        links={[{ href: '#dashboard-rubricas', label: 'Saltar a resultados y progreso' }]}
      />
      <Header theme={theme} role="banner">
        <Title theme={theme} as="h1">📝 Ensayo Integrador (Evaluación Final)</Title>
        <Subtitle>
          Envía tu ensayo integrador y recibe evaluación IA dual (DeepSeek + OpenAI).
        </Subtitle>
      </Header>

      <SelectorDimension
        theme={theme}
        id="dashboard-rubricas"
        tabIndex={-1}
        aria-label="Resultados y progreso"
      >
        <SelectorTitle theme={theme}>📊 Resultados y progreso</SelectorTitle>
        <SelectorSubtitle theme={theme}>
          Aquí ves un resumen de tus rúbricas. El detalle completo (incluye <strong>Mi progreso</strong>, exportación y gestión)
          está en la pestaña <strong>Actividades</strong>.
        </SelectorSubtitle>

        <DashboardRubricas
          theme={theme}
          onSelectRubric={() => {
            handleNavigateFromPrerequisites('actividades');
          }}
        />
      </SelectorDimension>

      <EnsayoIntegrador theme={theme} />

      {/*
        Nota: La generación de preguntas contextualizadas y la práctica guiada
        se mantienen en la pestaña "Actividades" como trabajo opcional.
        Esta pestaña queda enfocada en la evaluación final (Ensayo Integrador).
      */}
    </Container>
  );
}
