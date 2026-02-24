// src/components/artefactos/MapaActores.js
import React, { useState, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateMapaActores } from '../../services/mapaActores.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useArtifactEvaluationPolicy from '../../hooks/useArtifactEvaluationPolicy';
import useTeacherArtifactReset from '../../hooks/useTeacherArtifactReset';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import usePasteUnlock from '../../hooks/usePasteUnlock';
import { getDimension } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import KeyboardShortcutsBar from '../ui/KeyboardShortcutsBar';
import HistoryRibbon from '../ui/HistoryRibbon';
import TeacherScoreOverrideBanner from './TeacherScoreOverrideBanner';
import ConfirmModal from '../common/ConfirmModal';
import logger from '../../utils/logger';
import {
  AutoSaveMessage,
  ButtonGroup,
  CitaFooter,
  CitaInfo,
  CitaItem,
  CitaTexto,
  CitasButton,
  CitasList,
  CitasPanel,
  CitasPanelHeader,
  Container,
  CriterioCard,
  CriterioHeader,
  CriterioNivel,
  CriterioTitle,
  CriteriosGrid,
  DimensionLabel,
  EliminarButton,
  EmptyCitasMessage,
  FeedbackHeader,
  FeedbackSection,
  FormSection,
  GuideContent,
  GuideHeader,
  GuideQuestion,
  GuideQuestions,
  GuideSection,
  GuideTitle,
  Header,
  HeaderDescription as Subtitle,
  HeaderTitle as Title,
  HintText,
  InsertarButton,
  Label,
  List,
  ListItem,
  ListSection,
  ListTitle,
  LoadingSpinner,
  LoadingText,
  LockIcon,
  LockText,
  LockedMessage,
  NivelGlobal,
  PasteErrorMessage,
  PrimaryButton,
  RestoreBanner,
  RestoreButton,
  SectionTitle,
  SpinnerIcon,
  SubmissionBanner,
  SubmitButton,
  Textarea,
  ToggleIcon,
  UnlockButton,
  ValidationMessage
} from './shared';

// ============================================
// STYLED COMPONENTS (reutilizados de TablaACD con ajustes)
// ============================================

// ... (existing styled components)

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MapaActores({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation, updateActivitiesProgress, sourceCourseId, currentTextoId, activitiesProgress } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas

  const timersRef = useRef([]); // 🧹 Track all setTimeout IDs for cleanup

  // 🧹 Cleanup all tracked timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // 🆕 FASE 1 FIX: Estados con carga dinámica por textoId
  const [actores, setActores] = useState('');
  const [contextoHistorico, setContextoHistorico] = useState('');
  const [conexiones, setConexiones] = useState('');
  const [consecuencias, setConsecuencias] = useState('');

  // 🆕 Efecto para cargar borradores cuando cambia el textoId
  useEffect(() => {
    if (!currentTextoId) return;

    // Evitar contaminación visual entre documentos mientras se rehidrata
    setActores('');
    setContextoHistorico('');
    setConexiones('');
    setConsecuencias('');

    let cancelled = false;

    import('../../services/sessionManager').then(({ getDraftKey }) => {
      if (cancelled) return;
      const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

      const readAndMigrateLegacy = (base) => {
        const scopedKey = getKey(base);
        const scoped = sessionStorage.getItem(scopedKey) || '';
        if (scoped) return scoped;

        const legacy = sessionStorage.getItem(base) || '';
        if (legacy) {
          sessionStorage.setItem(scopedKey, legacy);
          sessionStorage.removeItem(base);
          return legacy;
        }
        return '';
      };

      setActores(readAndMigrateLegacy('mapaActores_actores'));
      setContextoHistorico(readAndMigrateLegacy('mapaActores_contextoHistorico'));
      setConexiones(readAndMigrateLegacy('mapaActores_conexiones'));
      setConsecuencias(readAndMigrateLegacy('mapaActores_consecuencias'));

      logger.log('📂 [MapaActores] Borradores cargados para textoId:', currentTextoId);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentTextoId]);

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
  const [showGuide, setShowGuide] = useState(true);

  // 🆕 Estados para Límites e Historial
  const [evaluationAttempts, setEvaluationAttempts] = useState(0); // Intentos de evaluación (Max 3)
  const [history, setHistory] = useState([]); // Historial de versiones { timestamp, content, feedback }
  const [viewingVersion, setViewingVersion] = useState(null); // Versión que se está visualizando (null = actual)
  const [isSubmitted, setIsSubmitted] = useState(false); // 🆕 Estado de entrega final
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // 🆕 Modal de confirmación de entrega
  const [teacherScoreOverride, setTeacherScoreOverride] = useState(null); // 🆕 Override docente
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  const {
    rateLimit,
    maxAttempts: MAX_ATTEMPTS
  } = useArtifactEvaluationPolicy({
    rateLimitKey: 'mapaActores_eval',
    cooldownMs: 5000,
    maxPerHour: 10,
    maxAttempts: 3
  });

  // 🆕 Estados para sistema de citas
  const [showCitasPanel, setShowCitasPanel] = useState(false);
  const [pasteError, setPasteError] = useState(null);

  // 🆕 Refs para guardar posición del cursor en cada textarea
  const actoresRef = React.useRef(null);
  const contextoRef = React.useRef(null);
  const conexionesRef = React.useRef(null);
  const consecuenciasRef = React.useRef(null);
  const [cursorPositions, setCursorPositions] = React.useState({
    actores: { start: 0, end: 0 },
    contexto: { start: 0, end: 0 },
    conexiones: { start: 0, end: 0 },
    consecuencias: { start: 0, end: 0 }
  });

  // 🔑 Toggle de pegado para QA/testing (Ctrl+Alt+U)
  const pasteUnlocked = usePasteUnlock();

  // 🆕 Keyboard shortcuts para productividad
  const [_showSaveHint, setShowSaveHint] = useState(false);

  useKeyboardShortcuts({
    'ctrl+s': (_e) => {
      logger.log('⌨️ Ctrl+S: Guardando borrador MapaActores...');
      if (!currentTextoId) return;
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);
        if (actores) sessionStorage.setItem(getKey('mapaActores_actores'), actores);
        if (contextoHistorico) sessionStorage.setItem(getKey('mapaActores_contextoHistorico'), contextoHistorico);
        if (conexiones) sessionStorage.setItem(getKey('mapaActores_conexiones'), conexiones);
        if (consecuencias) sessionStorage.setItem(getKey('mapaActores_consecuencias'), consecuencias);
      }).catch(() => {});
      setShowSaveHint(true);
      const saveHintTimerId = setTimeout(() => setShowSaveHint(false), 2000);
      timersRef.current.push(saveHintTimerId);
    },
    'ctrl+enter': (_e) => {
      logger.log('⌨️ Ctrl+Enter: Evaluando Mapa de Actores...');
      if (!loading && isValid && rateLimit.canProceed && evaluationAttempts < MAX_ATTEMPTS && !isSubmitted && !viewingVersion) {
        handleEvaluate();
      }
    },
    'escape': (_e) => {
      logger.log('⌨️ Esc: Cerrando paneles...');
      if (showCitasPanel) {
        setShowCitasPanel(false);
      } else if (pasteError) {
        setPasteError(null);
      } else if (viewingVersion) {
        setViewingVersion(null);
      }
    }
  }, {
    enabled: true,
    excludeInputs: false
  });

  // 🆕 Persistencia
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const rewardsResourceId = lectureId ? `${lectureId}:MapaActores` : null;
  const persistenceKey = lectureId ? `mapa_actores_${lectureId}` : null;

  const persistence = useActivityPersistence(persistenceKey, {
    enabled: !!persistenceKey,
    courseId: sourceCourseId, // 🆕 Aislar datos por curso
    legacyDocumentIds: (currentTextoId && documentId && lectureId && lectureId !== documentId) ? [`mapa_actores_${documentId}`] : [],
    studentAnswers: {
      actores,
      contexto_historico: contextoHistorico,
      conexiones,
      consecuencias
    },
    aiFeedbacks: { mapa_actores: feedback },
    attempts: evaluationAttempts,
    history,
    submitted: isSubmitted,
    onRehydrate: (data, meta) => {
      if (meta?.isEmpty) {
        setActores('');
        setContextoHistorico('');
        setConexiones('');
        setConsecuencias('');
        setFeedback(null);
        setEvaluationAttempts(0);
        setHistory([]);
        setIsSubmitted(false);
        setIsLocked(false);
        setTeacherScoreOverride(null);
        return;
      }

      if (data.student_answers?.actores) setActores(data.student_answers.actores);
      if (data.student_answers?.contexto_historico) setContextoHistorico(data.student_answers.contexto_historico);
      if (data.student_answers?.conexiones) setConexiones(data.student_answers.conexiones);
      if (data.student_answers?.consecuencias) setConsecuencias(data.student_answers.consecuencias);
      if (data.ai_feedbacks?.mapa_actores) setFeedback(data.ai_feedbacks.mapa_actores);

      if (typeof data.attempts === 'number') setEvaluationAttempts(data.attempts);
      if (Array.isArray(data.history)) setHistory(data.history);
      if (data.submitted) {
        setIsSubmitted(true);
        setIsLocked(true);
      }
    }
  });

  const applyTeacherReset = useCallback(() => {
    setIsSubmitted(false);
    setIsLocked(false);
    setHistory([]);
    setEvaluationAttempts(0);
    setFeedback(null);
    setActores('');
    setContextoHistorico('');
    setConexiones('');
    setConsecuencias('');
    setViewingVersion(null);
    setTeacherScoreOverride(null);
  }, []);

  const maybeApplyTeacherReset = useTeacherArtifactReset({
    artifactLabel: 'MapaActores',
    lectureId,
    sourceCourseId,
    persistence,
    draftKeyBases: [
      'mapaActores_actores',
      'mapaActores_contextoHistorico',
      'mapaActores_conexiones',
      'mapaActores_consecuencias'
    ],
    onApplyReset: applyTeacherReset
  });

  // 🆕 CLOUD SYNC: Cargar history/drafts desde Firestore (activitiesProgress)
  // También detecta resets del docente y limpia el estado local
  useEffect(() => {
    if (!lectureId) return;

    const findCloudArtifact = (artifactKey) => {
      if (!activitiesProgress) return null;
      const nested = activitiesProgress?.[lectureId]?.artifacts?.[artifactKey];
      if (nested) return nested;
      const direct = activitiesProgress?.artifacts?.[artifactKey];
      if (direct) return direct;
      if (typeof activitiesProgress === 'object') {
        for (const key of Object.keys(activitiesProgress)) {
          const candidate = activitiesProgress?.[key]?.artifacts?.[artifactKey];
          if (candidate) return candidate;
        }
      }
      return null;
    };

    const cloudData = findCloudArtifact('mapaActores');
    
    if (maybeApplyTeacherReset(cloudData)) {
      return;
    }
    
    if (!cloudData) return;

    if (cloudData.history && Array.isArray(cloudData.history)) {
      logger.log('☁️ [MapaActores] Cargando historial desde Firestore:', cloudData.history.length, 'versiones');
      setHistory(prev => prev.length >= cloudData.history.length ? prev : cloudData.history);
    }

    if (typeof cloudData.attempts === 'number') setEvaluationAttempts(prev => Math.max(prev, cloudData.attempts));
    if (cloudData.submitted) {
      setIsSubmitted(true);
      setIsLocked(true);
    }

    // 🆕 Override de nota docente
    if (cloudData.teacherOverrideScore != null) {
      setTeacherScoreOverride({
        teacherOverrideScore: cloudData.teacherOverrideScore,
        scoreOverrideReason: cloudData.scoreOverrideReason,
        scoreOverriddenAt: cloudData.scoreOverriddenAt,
        docenteNombre: cloudData.docenteNombre
      });
    }

    if (cloudData.drafts) {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, lectureId, sourceCourseId);

        if (cloudData.drafts.actores && !sessionStorage.getItem(getKey('mapaActores_actores'))) {
          sessionStorage.setItem(getKey('mapaActores_actores'), cloudData.drafts.actores);
          setActores(cloudData.drafts.actores);
        }
        if (cloudData.drafts.contextoHistorico && !sessionStorage.getItem(getKey('mapaActores_contextoHistorico'))) {
          sessionStorage.setItem(getKey('mapaActores_contextoHistorico'), cloudData.drafts.contextoHistorico);
          setContextoHistorico(cloudData.drafts.contextoHistorico);
        }
        if (cloudData.drafts.conexiones && !sessionStorage.getItem(getKey('mapaActores_conexiones'))) {
          sessionStorage.setItem(getKey('mapaActores_conexiones'), cloudData.drafts.conexiones);
          setConexiones(cloudData.drafts.conexiones);
        }
        if (cloudData.drafts.consecuencias && !sessionStorage.getItem(getKey('mapaActores_consecuencias'))) {
          sessionStorage.setItem(getKey('mapaActores_consecuencias'), cloudData.drafts.consecuencias);
          setConsecuencias(cloudData.drafts.consecuencias);
        }
        logger.log('☁️ [MapaActores] Borradores restaurados desde Firestore');
      }).catch(() => {});
    }
  }, [lectureId, activitiesProgress, persistence, maybeApplyTeacherReset]);

  // 🆕 Handle submission confirmada
  const handleConfirmedSubmit = useCallback(() => {
    setShowSubmitConfirm(false);
    setIsSubmitted(true);
    setIsLocked(true);
    // Evitar save inmediato con estado stale; se guarda al confirmar isSubmitted

    // 🆕 SYNC: Registrar entrega en contexto global para Dashboard (preservando historial)
    if (lectureId && updateActivitiesProgress) {
      updateActivitiesProgress(lectureId, prev => {
        // Obtener el score previo guardado (lastScore) o calcular desde feedback
        const previousArtifact = prev?.artifacts?.mapaActores || {};
        const scoreToUse = previousArtifact.lastScore || (feedback.nivel_global ? feedback.nivel_global * 2.5 : 0);
        const attemptsToUse = Math.max(
          Number(previousArtifact.attempts || 0),
          Number(evaluationAttempts || 0),
          Array.isArray(history) ? history.length : 0
        );
        
        logger.log('📤 [MapaActores] Entregando con score:', scoreToUse, 'lastScore:', previousArtifact.lastScore, 'feedback.nivel_global:', feedback.nivel_global);
        
        return {
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            mapaActores: {
              ...previousArtifact,
              submitted: true,
              submittedAt: Date.now(),
              score: scoreToUse,
              nivel: feedback.nivel_global || previousArtifact.lastNivel || 0,
              history: history,
              attempts: attemptsToUse,
              finalContent: { actores, contextoHistorico, conexiones, consecuencias },
              // 🔧 FIX: Limpiar marcadores de reset al hacer nueva entrega
              resetBy: null,
              resetAt: null
            }
          }
        };
      });
    } else {
      logger.warn('⚠️ [MapaActores] No se pudo sincronizar - lectureId:', lectureId, 'updateActivitiesProgress:', !!updateActivitiesProgress);
    }

    if (rewards) {
      rewards.recordEvent('ARTIFACT_SUBMITTED', {
        artefacto: 'MapaActores',
        level: feedback.nivel_global,
        resourceId: rewardsResourceId
      });
    }

    logger.log('✅ [MapaActores] Tarea entregada y sincronizada con Dashboard');
  }, [feedback, rewards, persistence, lectureId, updateActivitiesProgress, rewardsResourceId, history, evaluationAttempts, actores, contextoHistorico, conexiones, consecuencias]);

  // Garantizar persistencia con estado actualizado tras entregar
  useEffect(() => {
    if (!isSubmitted) return;
    persistence.saveManual();
  }, [isSubmitted, persistence]);

  const handleSubmit = useCallback(() => {
    if (!feedback) return;
    setShowSubmitConfirm(true);
  }, [feedback]);

  // 🆕 Variables para visualizar contenido (Actual o Histórico)
  const displayedContent = useMemo(() => {
    if (viewingVersion) {
      return {
        actores: viewingVersion.content.actores || '',
        contexto: viewingVersion.content.contexto_historico || '',
        conexiones: viewingVersion.content.conexiones || '',
        consecuencias: viewingVersion.content.consecuencias || ''
      };
    }
    return { actores, contexto: contextoHistorico, conexiones, consecuencias };
  }, [viewingVersion, actores, contextoHistorico, conexiones, consecuencias]);

  const displayedFeedback = useMemo(() => {
    if (viewingVersion) return viewingVersion.feedback;
    return feedback;
  }, [viewingVersion, feedback]);

  // 🆕 FIX: También deshabilitar campos cuando se agotaron los intentos (solo queda entregar)
  const attemptsExhausted = evaluationAttempts >= MAX_ATTEMPTS && !isSubmitted;
  const isReadOnly = !!viewingVersion || isSubmitted || attemptsExhausted;

  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    logger.log('✏️ [MapaActores] Desbloqueando para editar...');
    setIsLocked(false);
    setFeedback(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);

  // 🆕 Manejadores de Historial
  const handleViewVersion = useCallback((entry) => {
    if (!entry) {
      setViewingVersion(null); // Volver al actual
      return;
    }
    setViewingVersion(entry);
    logger.log(`📜 Visualizando versión: Intento ${entry.attemptNumber}`);
  }, []);

  const handleRestoreVersion = useCallback(() => {
    if (!viewingVersion || isSubmitted) return;

    // Restaurar contenido
    setActores(viewingVersion.content.actores || '');
    setContextoHistorico(viewingVersion.content.contexto_historico || '');
    setConexiones(viewingVersion.content.conexiones || '');
    setConsecuencias(viewingVersion.content.consecuencias || '');

    // Restaurar evaluación
    setFeedback(viewingVersion.feedback);

    // Resetear vista
    setViewingVersion(null);

    // Guardar cambio
    const restoreSaveTimerId = setTimeout(() => persistence.saveManual(), 100);
    timersRef.current.push(restoreSaveTimerId);

    logger.log('rewind ⏪ Versión restaurada exitosamente');
  }, [viewingVersion, persistence, isSubmitted]);

  // Validación
  const isValid = useMemo(() => {
    return actores.trim().length >= 20 &&
      contextoHistorico.trim().length >= 15 &&
      conexiones.trim().length >= 20 &&
      consecuencias.trim().length >= 20;
  }, [actores, contextoHistorico, conexiones, consecuencias]);

  const validationMessage = useMemo(() => {
    if (!actores.trim()) return '⚠️ Identifica los actores sociales y políticos relevantes';
    if (actores.trim().length < 20) return '⚠️ Describe los actores con más detalle (mín. 20 caracteres)';
    if (!contextoHistorico.trim()) return '⚠️ Sitúa el texto en su contexto histórico/social';
    if (contextoHistorico.trim().length < 15) return '⚠️ Desarrolla el contexto histórico (mín. 15 caracteres)';
    if (!conexiones.trim()) return '⚠️ Analiza las conexiones e intereses entre actores';
    if (conexiones.trim().length < 20) return '⚠️ Profundiza en las conexiones (mín. 20 caracteres)';
    if (!consecuencias.trim()) return '⚠️ Evalúa las consecuencias o impacto del texto';
    if (consecuencias.trim().length < 20) return '⚠️ Desarrolla las consecuencias (mín. 20 caracteres)';
    return '✅ Análisis completo. Solicita evaluación criterial.';
  }, [actores, contextoHistorico, conexiones, consecuencias]);

  // 🆕 FASE 1 FIX: Guardar respaldo en sessionStorage con claves namespaced
  useEffect(() => {
    if (!currentTextoId) return;

    import('../../services/sessionManager').then(({ getDraftKey }) => {
      const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

      if (actores) sessionStorage.setItem(getKey('mapaActores_actores'), actores);
      if (contextoHistorico) sessionStorage.setItem(getKey('mapaActores_contextoHistorico'), contextoHistorico);
      if (conexiones) sessionStorage.setItem(getKey('mapaActores_conexiones'), conexiones);
      if (consecuencias) sessionStorage.setItem(getKey('mapaActores_consecuencias'), consecuencias);

      logger.log('💾 [MapaActores] Borradores guardados para textoId:', currentTextoId);
    }).catch(() => {});
  }, [actores, contextoHistorico, conexiones, consecuencias, currentTextoId]);

  // 🆕 Sincronización en la nube de borradores (debounced)
  useEffect(() => {
    if (!currentTextoId) return;

    if (actores || contextoHistorico || conexiones || consecuencias) {
      const timer = setTimeout(() => {
        import('../../services/sessionManager').then(({ updateCurrentSession, captureArtifactsDrafts }) => {
          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId, sourceCourseId) });
        }).catch(() => {});
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actores, contextoHistorico, conexiones, consecuencias, currentTextoId]);

  // 🆕 Escuchar restauración de sesión para actualizar estados desde sessionStorage
  useEffect(() => {
    if (!currentTextoId) return;

    const handleSessionRestored = () => {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

        const restoredActores = sessionStorage.getItem(getKey('mapaActores_actores')) || '';
        const restoredContexto = sessionStorage.getItem(getKey('mapaActores_contextoHistorico')) || '';
        const restoredConexiones = sessionStorage.getItem(getKey('mapaActores_conexiones')) || '';
        const restoredConsecuencias = sessionStorage.getItem(getKey('mapaActores_consecuencias')) || '';

        if (restoredActores !== actores) setActores(restoredActores);
        if (restoredContexto !== contextoHistorico) setContextoHistorico(restoredContexto);
        if (restoredConexiones !== conexiones) setConexiones(restoredConexiones);
        if (restoredConsecuencias !== consecuencias) setConsecuencias(restoredConsecuencias);

        if (restoredActores || restoredContexto || restoredConexiones || restoredConsecuencias) {
          logger.log('🔄 [MapaActores] Borradores restaurados desde sesión');
        }
      }).catch(() => {});
    };

    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [actores, contextoHistorico, conexiones, consecuencias, currentTextoId]);

  // 🆕 Obtener citas guardadas
  const citasGuardadas = useMemo(() => {
    if (!lectureId) return [];
    return getCitations(lectureId);
  }, [lectureId, getCitations]);

  // Insertar entrada del cuaderno en posición del cursor
  const insertarCita = useCallback((textoCita, campo, tipo = 'cita') => {
    const citaFormateada = tipo === 'cita' ? `"${textoCita}" ` : `${textoCita} `;

    const refMap = {
      actores: actoresRef,
      contexto: contextoRef,
      conexiones: conexionesRef,
      consecuencias: consecuenciasRef
    };

    const setterMap = {
      actores: setActores,
      contexto: setContextoHistorico,
      conexiones: setConexiones,
      consecuencias: setConsecuencias
    };

    const ref = refMap[campo];
    const setter = setterMap[campo];
    const selection = cursorPositions[campo] || { start: 0, end: 0 };
    const start = selection.start ?? 0;
    const end = selection.end ?? start;

    if (ref && ref.current && setter) {
      const textarea = ref.current;

      setter(prev => {
        const before = prev.substring(0, start);
        const after = prev.substring(end);
        const newText = before + citaFormateada + after;

        const focusTimerId = setTimeout(() => {
          if (textarea) {
            const newPosition = start + citaFormateada.length;
            textarea.focus();
            textarea.setSelectionRange(newPosition, newPosition);
            setCursorPositions((prevPos) => ({
              ...prevPos,
              [campo]: { start: newPosition, end: newPosition }
            }));
          }
        }, 0);
        timersRef.current.push(focusTimerId);

        return newText;
      });
    }

    setShowCitasPanel(false);
  }, [cursorPositions]);

  // 🆕 Capturar posición del cursor
  const handleCursorChange = useCallback((campo, event) => {
    const start = event?.target?.selectionStart ?? 0;
    const end = event?.target?.selectionEnd ?? start;
    setCursorPositions(prev => ({ ...prev, [campo]: { start, end } }));
  }, []);

  // 🆕 Eliminar cita
  const handleEliminarCita = useCallback((citaId) => {
    if (lectureId) deleteCitation(lectureId, citaId);
  }, [lectureId, deleteCitation]);

  // 🆕 Prevención de pegado
  const handlePaste = useCallback((e) => {
    // 🔑 Si el pegado está desbloqueado (QA mode), permitir todo sin límite
    if (pasteUnlocked) return;

    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    setPasteError(`🚫 El pegado está deshabilitado. Escribe con tus propias palabras o usa citas guardadas del Cuaderno de Lectura. (Intentaste pegar ${wordCount} palabras)`);
    const pasteErrorTimerId = setTimeout(() => setPasteError(null), 5000);
    timersRef.current.push(pasteErrorTimerId);
  }, [pasteUnlocked]);

  // Rúbrica
  const rubricDimension = useMemo(() => getDimension('contextualizacion'), []);

  // Evaluación
  const handleEvaluate = useCallback(async () => {
    if (!isValid || !texto) return;

    // 🆕 Verificar límite de intentos
    if (evaluationAttempts >= MAX_ATTEMPTS) {
      setError(`🚫 Has agotado tus ${MAX_ATTEMPTS} intentos de evaluación para este artefacto.`);
      return;
    }

    // ✅ Verificar rate limit y registrar operación
    const rateLimitResult = rateLimit.attemptOperation();
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.reason === 'cooldown') {
        setError(`⏱️ Por favor espera ${rateLimitResult.waitSeconds} segundos antes de evaluar nuevamente.`);
      } else if (rateLimitResult.reason === 'hourly_limit') {
        setError(`🚦 Has alcanzado el límite de 10 evaluaciones por hora. Intenta más tarde.`);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando análisis socio-histórico...', icon: '🔍', duration: 2 });

    // 🆕 Programar pasos de evaluación
    let stepTimeouts = [];
    stepTimeouts = [
      setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando actores y contexto...', icon: '👥', duration: 5 }), 1000),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 3500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), 15500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 4 }), 27500)
    ];
    timersRef.current.push(...stepTimeouts);

    try {
      const result = await evaluateMapaActores({
        text: texto,
        actores,
        contextoHistorico,
        conexiones,
        consecuencias
      });

      setFeedback(result);
      setIsLocked(true); // 🔒 Bloquear formulario después de evaluar

      // 🆕 Incrementar intentos
      setEvaluationAttempts(prev => prev + 1);

      // 🆕 Archivar en Historial
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        content: {
          actores,
          contexto_historico: contextoHistorico,
          conexiones,
          consecuencias
        },
        feedback: result,
        score: result.nivel_global * 2.5,
        attemptNumber: evaluationAttempts + 1
      };

      setHistory(prev => [...prev, newHistoryEntry]);
      logger.log('📜 [MapaActores] Versión archivada en historial');

      // 🆕 CLOUD SYNC: Sincronizar historial y borradores con Firestore
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => ({
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            mapaActores: {
              ...(prev?.artifacts?.mapaActores || {}),
              history: [...(prev?.artifacts?.mapaActores?.history || []), newHistoryEntry],
              attempts: evaluationAttempts + 1,
              lastScore: result.nivel_global * 2.5,
              lastNivel: result.nivel_global,
              lastEvaluatedAt: Date.now(),
              drafts: { actores, contextoHistorico, conexiones, consecuencias },
              // 🆕 Limpiar flags de reset cuando el estudiante trabaja
              resetBy: null,
              resetAt: null
            }
          }
        }));
        logger.log('☁️ [MapaActores] Historial sincronizado con Firestore');
      }

      // 🆕 Limpiar borrador temporal tras éxito
      if (currentTextoId) {
        import('../../services/sessionManager').then(({ getDraftKey, updateCurrentSession, captureArtifactsDrafts }) => {
          const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

          // scoped
          sessionStorage.removeItem(getKey('mapaActores_actores'));
          sessionStorage.removeItem(getKey('mapaActores_contextoHistorico'));
          sessionStorage.removeItem(getKey('mapaActores_conexiones'));
          sessionStorage.removeItem(getKey('mapaActores_consecuencias'));

          // legacy
          sessionStorage.removeItem('mapaActores_actores');
          sessionStorage.removeItem('mapaActores_contextoHistorico');
          sessionStorage.removeItem('mapaActores_conexiones');
          sessionStorage.removeItem('mapaActores_consecuencias');

          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId, sourceCourseId) });
        }).catch(() => {});
      }

      // Notificar completitud
      window.dispatchEvent(new CustomEvent('evaluation-complete', {
        detail: { artefacto: 'MapaActores' }
      }));

      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica3', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'MapaActores',
        criterios: result.criterios,
        textoId: lectureId
      });

      // 🎮 Registrar recompensas
      if (rewards) {
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'MapaActores',
          rubricId: 'rubrica3',
          resourceId: rewardsResourceId
        });

        rewards.recordEvent(`EVALUATION_LEVEL_${result.nivel_global}`, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'MapaActores',
          resourceId: rewardsResourceId
        });

        // Bonos de contenido: solo si el nivel es >= 3 (competente)
        if (result.nivel_global >= 3) {
          // Bonificación por contextualización histórica profunda (>150 caracteres)
          if (contextoHistorico.length > 150) {
            rewards.recordEvent('CONTEXTUALIZATION_HISTORICAL', {
              length: contextoHistorico.length,
              artefacto: 'MapaActores',
              resourceId: rewardsResourceId
            });
          }

          // Bonificación por análisis de conexiones (>100 caracteres)
          if (conexiones.length > 100) {
            rewards.recordEvent('SOCIAL_CONNECTIONS_MAPPED', {
              length: conexiones.length,
              artefacto: 'MapaActores',
              resourceId: rewardsResourceId
            });
          }
        }

        // Puntuación perfecta
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'MapaActores',
            resourceId: rewardsResourceId
          });
        }

        logger.log('🎮 [MapaActores] Recompensas registradas');
      }

    } catch (error) {
      logger.error('Error evaluando Mapa de Actores:', error);
      setError(error.message || 'Error al evaluar el análisis');
    } finally {
      // 🧹 Limpiar step timeouts en todos los casos (éxito, error, cancelación)
      stepTimeouts.forEach(clearTimeout);
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValid, texto, actores, contextoHistorico, conexiones, consecuencias, setError, evaluationAttempts, rateLimit, rewards, rewardsResourceId, updateRubricScore, lectureId, updateActivitiesProgress, history, persistence, currentTextoId]);

  // Verificar si hay texto
  if (!texto) {
    return (
      <Container>
        <Header>
          <Title>🗺️ Mapa de Actores y Consecuencias</Title>
          <Subtitle>Carga un texto para comenzar</Subtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>🔍 Mapa de Actores Sociales</Title>
        <Subtitle>
          Identifica los actores, sus conexiones y el contexto histórico.
          Recibirás evaluación criterial basada en la Rúbrica 2.
        </Subtitle>
      </Header>

      {/* 🆕 Banner de Entrega Final */}
      {isSubmitted && (
        <SubmissionBanner
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={theme}
        >
          <span className="icon">✅</span>
          <span className="text">
            <strong>Tarea Entregada:</strong> Tu nota fue enviada al docente y no se pueden realizar más cambios.
          </span>
        </SubmissionBanner>
      )}

      {/* 🆕 Banner de cambio de nota docente */}
      <TeacherScoreOverrideBanner cloudData={teacherScoreOverride} theme={theme} />

      {/* 🆕 Panel lateral de citas guardadas */}
      <AnimatePresence>
        {showCitasPanel && (
          <CitasPanel
            as={motion.div}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25 }}
            theme={theme}
          >
            <CitasPanelHeader theme={theme}>
              <h3 style={{ margin: 0 }}>Cuaderno de Lectura</h3>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                {citasGuardadas.length === 0
                  ? 'Selecciona texto en "Lectura Guiada" y usa 📌 Cita o 📓 Anotar'
                  : 'Selecciona el campo y haz clic en el botón correspondiente'}
              </p>
            </CitasPanelHeader>

            <CitasList>
              {citasGuardadas.length === 0 ? (
                <EmptyCitasMessage theme={theme}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                  <p><strong>¿Cómo usar el Cuaderno?</strong></p>
                  <ol style={{ textAlign: 'left', lineHeight: 1.6 }}>
                    <li>Ve a "Lectura Guiada"</li>
                    <li>Selecciona texto importante</li>
                    <li>📌 <strong>Cita</strong> o 📓 <strong>Anotar</strong></li>
                    <li>Regresa aquí para usar</li>
                  </ol>
                </EmptyCitasMessage>
              ) : (
                citasGuardadas.map((cita) => {
                  const tipo = cita.tipo || 'cita';
                  const tipoIcons = { cita: '📌', reflexion: '💭', comentario: '📝', pregunta: '❓' };
                  const tipoLabels = { cita: 'Cita', reflexion: 'Reflexión', comentario: 'Comentario', pregunta: 'Pregunta' };
                  const isInsertable = tipo !== 'pregunta';
                  return (
                    <CitaItem key={cita.id} theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px',
                          background: tipo === 'cita' ? '#3190fc20' : tipo === 'reflexion' ? '#8b5cf620' : tipo === 'comentario' ? '#f59e0b20' : '#ef444420',
                          color: tipo === 'cita' ? '#3190fc' : tipo === 'reflexion' ? '#8b5cf6' : tipo === 'comentario' ? '#f59e0b' : '#ef4444'
                        }}>{tipoIcons[tipo]} {tipoLabels[tipo]}</span>
                      </div>
                      <CitaTexto theme={theme}>{cita.texto}</CitaTexto>
                      {cita.nota && tipo !== 'cita' && (
                        <div style={{ fontSize: '0.7rem', color: theme?.textMuted, marginTop: '0.2rem' }}>
                          📎 Sobre: «{cita.nota.length > 50 ? cita.nota.substring(0, 50) + '…' : cita.nota}»
                        </div>
                      )}
                      <CitaFooter>
                        <CitaInfo theme={theme}>
                          {new Date(cita.timestamp).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </CitaInfo>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {isInsertable && (<>
                            <InsertarButton onClick={() => insertarCita(cita.texto, 'actores', tipo)} theme={theme}>
                              Actores
                            </InsertarButton>
                            <InsertarButton onClick={() => insertarCita(cita.texto, 'contexto', tipo)} theme={theme}>
                              Contexto
                            </InsertarButton>
                            <InsertarButton onClick={() => insertarCita(cita.texto, 'conexiones', tipo)} theme={theme}>
                              Conexiones
                            </InsertarButton>
                            <InsertarButton onClick={() => insertarCita(cita.texto, 'consecuencias', tipo)} theme={theme}>
                              Consecuencias
                            </InsertarButton>
                          </>)}
                          <EliminarButton onClick={() => handleEliminarCita(cita.id)} theme={theme}>
                            🗑️
                          </EliminarButton>
                        </div>
                      </CitaFooter>
                    </CitaItem>
                  );
                })
              )}
            </CitasList>
          </CitasPanel>
        )}
      </AnimatePresence>

      {/* Guía pedagógica */}
      <GuideSection theme={theme} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <GuideHeader onClick={() => setShowGuide(!showGuide)}>
          <GuideTitle theme={theme}>
            💡 Preguntas Guía
          </GuideTitle>
          <ToggleIcon $expanded={showGuide}>▼</ToggleIcon>
        </GuideHeader>
        <AnimatePresence>
          {showGuide && (
            <GuideContent
              theme={theme}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <GuideQuestions>
                {rubricDimension?.preguntasGuia?.map((q, idx) => (
                  <GuideQuestion key={idx} theme={theme}>{q}</GuideQuestion>
                ))}
              </GuideQuestions>
            </GuideContent>
          )}
      </AnimatePresence>
      </GuideSection>

      {/* 🆕 Ribbon de Historial - SIEMPRE visible */}
      <HistoryRibbon
        history={history}
        viewingVersion={viewingVersion}
        onViewVersion={handleViewVersion}
        theme={theme}
        scoreFormat="nivel"
      />

      {/* 🆕 Banner de Restauración */}
      <AnimatePresence>
        {viewingVersion && (
          <RestoreBanner
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            theme={theme}
          >
            <div>
              <strong>Modo Lectura:</strong> Estás viendo una versión anterior (Intento {viewingVersion.attemptNumber}).
            </div>
            <RestoreButton onClick={handleRestoreVersion} theme={theme}>
              ↺ Restaurar esta versión
            </RestoreButton>
          </RestoreBanner>
        )}
      </AnimatePresence>

      {/* 🔒 Mensaje cuando está bloqueado después de evaluar */}
      {isLocked && !viewingVersion && !isSubmitted && (
        <LockedMessage theme={theme}>
          <LockIcon>🔒</LockIcon>
          <LockText>
            {attemptsExhausted ? (
              <>
                <strong>Has agotado tus intentos de evaluación</strong>
                <span>Revisa el feedback abajo y entrega tu trabajo con el botón "Entregar Tarea".</span>
              </>
            ) : (
              <>
                <strong>Análisis enviado a evaluación</strong>
                <span>Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".</span>
              </>
            )}
          </LockText>
          {!attemptsExhausted && (
            <UnlockButton onClick={handleSeguirEditando} theme={theme}>
              ✏️ Seguir Editando
            </UnlockButton>
          )}
        </LockedMessage>
      )}

      {/* Formulario - Ahora siempre visible pero controlado por isLocked */}
      {!viewingVersion && (
        <>
          {/* 🆕 Mensaje de guardado automático */}
          {(actores || contextoHistorico || conexiones || consecuencias) && (
            <AutoSaveMessage theme={theme}>
              💾 Tu trabajo se guarda automáticamente. No perderás nada al cambiar de pestaña.
            </AutoSaveMessage>
          )}

          {/* Atajos de teclado */}
          <KeyboardShortcutsBar
            theme={theme}
            shortcuts={[
              { keys: ['Ctrl', 'S'], label: 'Guardar' },
              { keys: ['Ctrl', 'Enter'], label: 'Evaluar' },
              { keys: ['Esc'], label: 'Cerrar' }
            ]}
          />

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>1️⃣ Actores Sociales y Políticos</SectionTitle>
            <Label theme={theme}>¿Qué actores son relevantes en este texto?</Label>
            <Textarea
              ref={actoresRef}
              theme={theme}
              value={displayedContent.actores}
              onChange={(e) => !viewingVersion && setActores(e.target.value)}
              onClick={(e) => handleCursorChange('actores', e)}
              onKeyUp={(e) => handleCursorChange('actores', e)}
              onSelect={(e) => handleCursorChange('actores', e)}
              onPaste={handlePaste}
              placeholder="Ej: Empresas transnacionales, trabajadores precarizados, gobiernos neoliberales, organizaciones sindicales, movimientos sociales..."
              disabled={loading || isReadOnly}
            />
            {pasteError && <PasteErrorMessage theme={theme}>{pasteError}</PasteErrorMessage>}
            <HintText theme={theme}>
              Identifica individuos, grupos, instituciones o clases sociales mencionados o afectados
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>2️⃣ Contexto Histórico/Social</SectionTitle>
            <Label theme={theme}>¿En qué contexto se produce este texto?</Label>
            <Textarea
              ref={contextoRef}
              theme={theme}
              value={displayedContent.contexto}
              onChange={(e) => !viewingVersion && setContextoHistorico(e.target.value)}
              onClick={(e) => handleCursorChange('contexto', e)}
              onKeyUp={(e) => handleCursorChange('contexto', e)}
              onSelect={(e) => handleCursorChange('contexto', e)}
              onPaste={handlePaste}
              placeholder="Ej: Contexto de globalización neoliberal post-1990, crisis financiera 2008, pandemia COVID-19, dictadura militar Chile 1973-1990..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '100px' }}
            />
            <HintText theme={theme}>
              Sitúa en época, eventos históricos, procesos sociales o debates públicos
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>3️⃣ Conexiones e Intereses</SectionTitle>
            <Label theme={theme}>¿Cómo se relacionan los actores? ¿Qué intereses tienen?</Label>
            <Textarea
              ref={conexionesRef}
              theme={theme}
              value={displayedContent.conexiones}
              onChange={(e) => !viewingVersion && setConexiones(e.target.value)}
              onClick={(e) => handleCursorChange('conexiones', e)}
              onKeyUp={(e) => handleCursorChange('conexiones', e)}
              onSelect={(e) => handleCursorChange('conexiones', e)}
              onPaste={handlePaste}
              placeholder="Ej: Empresas buscan maximizar ganancias mediante desregulación laboral, lo cual entra en conflicto con trabajadores que buscan estabilidad. Gobiernos median según correlación de fuerzas..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Analiza relaciones de poder, conflictos, alianzas, hegemonías, resistencias
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>4️⃣ Consecuencias e Impacto</SectionTitle>
            <Label theme={theme}>¿Qué consecuencias reales o potenciales tiene este discurso?</Label>
            <Textarea
              ref={consecuenciasRef}
              theme={theme}
              value={displayedContent.consecuencias}
              onChange={(e) => !viewingVersion && setConsecuencias(e.target.value)}
              onClick={(e) => handleCursorChange('consecuencias', e)}
              onKeyUp={(e) => handleCursorChange('consecuencias', e)}
              onSelect={(e) => handleCursorChange('consecuencias', e)}
              onPaste={handlePaste}
              placeholder="Ej: Corto plazo: aumento del desempleo, protestas sociales. Largo plazo: debilitamiento de identidades colectivas, naturalización del individualismo competitivo..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Distingue entre consecuencias inmediatas y efectos estructurales a largo plazo
            </HintText>
          </FormSection>

          {/* Validación */}
          {!viewingVersion && !isSubmitted && (
            <ValidationMessage
              $valid={isValid}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {validationMessage}
            </ValidationMessage>
          )}

          {/* FAB Cuaderno de Lectura */}
          <CitasButton
            onClick={() => setShowCitasPanel(!showCitasPanel)}
            theme={theme}
            $active={showCitasPanel}
            title="Cuaderno de Lectura"
            $hasNotification={citasGuardadas.length > 0}
          >
            {showCitasPanel ? '✕ Cerrar' : `📓 Cuaderno (${citasGuardadas.length})`}
          </CitasButton>

          {/* Botones */}
          <ButtonGroup>
            <PrimaryButton
              onClick={handleEvaluate}
              disabled={(!isValid && !viewingVersion) || loading || !rateLimit.canProceed || evaluationAttempts >= MAX_ATTEMPTS || isReadOnly}
              theme={theme}
              title={
                viewingVersion
                  ? 'Estás viendo una versión histórica. Vuelve a "Actual" para editar.'
                  : evaluationAttempts >= MAX_ATTEMPTS
                    ? 'Has agotado tus intentos de evaluación'
                    : !rateLimit.canProceed && rateLimit.nextAvailableIn > 0
                      ? `Espera ${rateLimit.nextAvailableIn}s`
                      : rateLimit.remaining === 0
                        ? 'Límite de evaluaciones alcanzado (10/hora)'
                        : `${rateLimit.remaining} evaluaciones restantes esta hora`
              }
            >
              {loading ? '⏳ Evaluando...' :
                viewingVersion ? '👁️ Modo Lectura' :
                  evaluationAttempts >= MAX_ATTEMPTS ? '🚫 Intentos Agotados' :
                    !rateLimit.canProceed && rateLimit.nextAvailableIn > 0 ? `⏱️ Espera ${rateLimit.nextAvailableIn}s` :
                      `🗺️ Solicitar Evaluación (${MAX_ATTEMPTS - evaluationAttempts} restantes)`}
            </PrimaryButton>

            {/* 🆕 Botón de Entrega */}
            {!isSubmitted && feedback && !viewingVersion && (
              <SubmitButton onClick={handleSubmit} theme={theme}>
                🔒 Entregar Tarea
              </SubmitButton>
            )}
          </ButtonGroup>
        </>
      )}

      {/* Loading con barra de progreso animada */}
      {loading && (
        <>
          <EvaluationProgressBar
            theme={theme}
            isEvaluating={loading}
            currentStep={currentEvaluationStep}
          />
          <LoadingSpinner>
            <SpinnerIcon
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              🔄
            </SpinnerIcon>
            <LoadingText theme={theme}>
              Evaluando con estrategia dual (DeepSeek + OpenAI)...
            </LoadingText>
          </LoadingSpinner>
        </>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {displayedFeedback && !loading && (
          <FeedbackSection
            theme={theme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FeedbackHeader>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.text }}>
                  📊 Evaluación Criterial
                </h3>
                <NivelGlobal $nivel={displayedFeedback.nivel_global}>
                  Nivel {displayedFeedback.nivel_global}/4
                </NivelGlobal>
              </div>
            </FeedbackHeader>

            <DimensionLabel theme={theme}>
              <strong>{displayedFeedback.dimension_label}:</strong> {displayedFeedback.dimension_description}
            </DimensionLabel>

            {displayedFeedback.criterios && (
            <CriteriosGrid>
              {/* Actores y Contexto */}
              {displayedFeedback.criterios.actores_contexto && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Actores y Contexto</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.actores_contexto.nivel}>
                    Nivel {displayedFeedback.criterios.actores_contexto.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.actores_contexto.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.actores_contexto.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.actores_contexto.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.actores_contexto.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Conexiones e Intereses */}
              {displayedFeedback.criterios.conexiones_intereses && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Conexiones e Intereses</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.conexiones_intereses.nivel}>
                    Nivel {displayedFeedback.criterios.conexiones_intereses.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.conexiones_intereses.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.conexiones_intereses.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.conexiones_intereses.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.conexiones_intereses.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Impacto y Consecuencias */}
              {displayedFeedback.criterios.impacto_consecuencias && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Impacto y Consecuencias</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.impacto_consecuencias.nivel}>
                    Nivel {displayedFeedback.criterios.impacto_consecuencias.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.impacto_consecuencias.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.impacto_consecuencias.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.impacto_consecuencias.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.impacto_consecuencias.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}
            </CriteriosGrid>
            )}
          </FeedbackSection>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={showSubmitConfirm}
        title="¿Entregar tarea?"
        message="Una vez entregada, no podrás realizar más cambios ni solicitar nuevas evaluaciones."
        confirmText="📤 Sí, Entregar"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        theme={theme}
      />
    </Container>
  );
}
