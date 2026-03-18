// src/components/artefactos/RespuestaArgumentativa.js
import React, { useState, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateRespuestaArgumentativa } from '../../services/respuestaArgumentativa.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useArtifactEvaluationPolicy from '../../hooks/useArtifactEvaluationPolicy';
import useTeacherArtifactReset from '../../hooks/useTeacherArtifactReset';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import usePasteUnlock from '../../hooks/usePasteUnlock';
import logger from '../../utils/logger';

import { getDimension } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import TeacherScoreOverrideBanner from './TeacherScoreOverrideBanner';
import ConfirmModal from '../common/ConfirmModal';
import KeyboardShortcutsBar from '../ui/KeyboardShortcutsBar';
import HistoryRibbon from '../ui/HistoryRibbon';
import {
  EVAL_STEP_ANALYZE_DELAY_MS,
  EVAL_STEP_DEEPSEEK_DELAY_MS,
  EVAL_STEP_OPENAI_DELAY_MS,
  EVAL_STEP_COMBINE_DELAY_MS,
} from '../../constants/timeoutConstants';
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
// COMPONENTE PRINCIPAL
// ============================================

export default function RespuestaArgumentativa({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation, updateActivitiesProgress, sourceCourseId, currentTextoId, activitiesProgress } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas
  const {
    rateLimit,
    maxAttempts: MAX_ATTEMPTS
  } = useArtifactEvaluationPolicy({
    rateLimitKey: 'evaluate_respuesta_argumentativa',
    cooldownMs: 5000,
    maxPerHour: 10,
    maxAttempts: 3
  });

  // 🆕 Ref para rastrear todos los setTimeout y evitar memory leaks
  const timersRef = useRef([]);

  // 🆕 Cleanup de todos los timers al desmontar
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // 🆕 FASE 1 FIX: Estados con carga dinámica por textoId
  const [tesis, setTesis] = useState('');
  const [evidencias, setEvidencias] = useState('');
  const [contraargumento, setContraargumento] = useState('');
  const [refutacion, setRefutacion] = useState('');

  // 🆕 Efecto para cargar borradores cuando cambia el textoId
  useEffect(() => {
    if (!currentTextoId) return;

    // Evitar contaminación visual entre documentos mientras se rehidrata
    setTesis('');
    setEvidencias('');
    setContraargumento('');
    setRefutacion('');

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

      setTesis(readAndMigrateLegacy('respuestaArgumentativa_tesis'));
      setEvidencias(readAndMigrateLegacy('respuestaArgumentativa_evidencias'));
      setContraargumento(readAndMigrateLegacy('respuestaArgumentativa_contraargumento'));
      setRefutacion(readAndMigrateLegacy('respuestaArgumentativa_refutacion'));

      logger.log('📂 [RespuestaArgumentativa] Borradores cargados para textoId:', currentTextoId);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentTextoId]);

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
  const [evaluationAttempts, setEvaluationAttempts] = useState(0); // 🆕 Contador de intentos
  const [history, setHistory] = useState([]); // 🆕 Historial de versiones
  const [viewingVersion, setViewingVersion] = useState(null); // 🆕 Versión en modo lectura
  const [isSubmitted, setIsSubmitted] = useState(false); // 🆕 Estado de entrega final
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // 🆕 Modal de confirmación de entrega
  const [teacherScoreOverride, setTeacherScoreOverride] = useState(null); // 🆕 Override docente
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  const [showGuide, setShowGuide] = useState(true);

  // 🆕 Estados para panel de citas y error de pegado
  const [showCitasPanel, setShowCitasPanel] = useState(false);
  const [pasteError, setPasteError] = useState(null);

  // 🆕 Refs para rastrear posición del cursor
  const tesisRef = React.useRef(null);
  const evidenciasRef = React.useRef(null);
  const contraargumentoRef = React.useRef(null);
  const refutacionRef = React.useRef(null);
  const [cursorPositions, setCursorPositions] = React.useState({
    tesis: { start: 0, end: 0 },
    evidencias: { start: 0, end: 0 },
    contraargumento: { start: 0, end: 0 },
    refutacion: { start: 0, end: 0 }
  });

  // 🔑 Toggle de pegado para QA/testing (Ctrl+Alt+U)
  const pasteUnlocked = usePasteUnlock();

  // 🆕 Keyboard shortcuts para productividad
  const [_showSaveHint, setShowSaveHint] = useState(false);

  useKeyboardShortcuts({
    'ctrl+s': (_e) => {
      logger.log('⌨️ Ctrl+S: Guardando borrador RespuestaArgumentativa...');
      if (!currentTextoId) return;
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);
        if (tesis) sessionStorage.setItem(getKey('respuestaArgumentativa_tesis'), tesis);
        if (evidencias) sessionStorage.setItem(getKey('respuestaArgumentativa_evidencias'), evidencias);
        if (contraargumento) sessionStorage.setItem(getKey('respuestaArgumentativa_contraargumento'), contraargumento);
        if (refutacion) sessionStorage.setItem(getKey('respuestaArgumentativa_refutacion'), refutacion);
      }).catch(() => {});
      setShowSaveHint(true);
      timersRef.current.push(setTimeout(() => setShowSaveHint(false), 2000));
    },
    'ctrl+enter': (_e) => {
      logger.log('⌨️ Ctrl+Enter: Evaluando Respuesta Argumentativa...');
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

  // 🆕 Memo para contenido visualizado (actual o histórico)
  const displayedContent = useMemo(() => {
    if (viewingVersion) {
      return {
        tesis: viewingVersion.content.tesis,
        evidencias: viewingVersion.content.evidencias,
        contraargumento: viewingVersion.content.contraargumento,
        refutacion: viewingVersion.content.refutacion,
        feedback: viewingVersion.feedback
      };
    }
    return {
      tesis,
      evidencias,
      contraargumento,
      refutacion,
      feedback
    };
  }, [viewingVersion, tesis, evidencias, contraargumento, refutacion, feedback]);

  // 🆕 FIX: También deshabilitar campos cuando se agotaron los intentos (solo queda entregar)
  const attemptsExhausted = evaluationAttempts >= MAX_ATTEMPTS && !isSubmitted;
  const isReadOnly = viewingVersion !== null || isSubmitted || attemptsExhausted;

  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    logger.log('✏️ [RespuestaArgumentativa] Desbloqueando para editar...');
    setIsLocked(false);
    setFeedback(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);

  // Validación
  const isValid = useMemo(() => {
    return tesis.trim().length >= 20 &&
      evidencias.trim().length >= 30 &&
      contraargumento.trim().length >= 20 &&
      refutacion.trim().length >= 30;
  }, [tesis, evidencias, contraargumento, refutacion]);

  const validationMessage = useMemo(() => {
    if (!tesis.trim()) return '⚠️ Formula tu tesis (postura clara sobre el texto)';
    if (tesis.trim().length < 20) return '⚠️ Desarrolla tu tesis con más claridad (mín. 20 caracteres)';
    if (!evidencias.trim()) return '⚠️ Presenta evidencias del texto que sustenten tu tesis';
    if (evidencias.trim().length < 30) return '⚠️ Desarrolla las evidencias (mín. 30 caracteres)';
    if (!contraargumento.trim()) return '⚠️ Presenta una objeción válida a tu tesis';
    if (contraargumento.trim().length < 20) return '⚠️ Desarrolla el contraargumento (mín. 20 caracteres)';
    if (!refutacion.trim()) return '⚠️ Refuta el contraargumento defendiendo tu postura';
    if (refutacion.trim().length < 30) return '⚠️ Desarrolla la refutación (mín. 30 caracteres)';
    return '✅ Argumento completo. Solicita evaluación criterial.';
  }, [tesis, evidencias, contraargumento, refutacion]);

  // 🆕 FASE 1 FIX: Guardar respaldo en sessionStorage con claves namespaced
  useEffect(() => {
    if (!currentTextoId) return;

    import('../../services/sessionManager').then(({ getDraftKey }) => {
      const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

      if (tesis) sessionStorage.setItem(getKey('respuestaArgumentativa_tesis'), tesis);
      if (evidencias) sessionStorage.setItem(getKey('respuestaArgumentativa_evidencias'), evidencias);
      if (contraargumento) sessionStorage.setItem(getKey('respuestaArgumentativa_contraargumento'), contraargumento);
      if (refutacion) sessionStorage.setItem(getKey('respuestaArgumentativa_refutacion'), refutacion);

      logger.log('💾 [RespuestaArgumentativa] Borradores guardados para textoId:', currentTextoId);
    }).catch(() => {});
  }, [tesis, evidencias, contraargumento, refutacion, currentTextoId]);

  // 🆕 Sincronización en la nube de borradores (debounced)
  useEffect(() => {
    if (!currentTextoId) return;

    if (tesis || evidencias || contraargumento || refutacion) {
      const timer = setTimeout(() => {
        import('../../services/sessionManager').then(({ updateCurrentSession, captureArtifactsDrafts }) => {
          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId, sourceCourseId) });
        }).catch(() => {});
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [tesis, evidencias, contraargumento, refutacion, currentTextoId]);

  // 🆕 Escuchar restauración de sesión para actualizar estados desde sessionStorage
  useEffect(() => {
    if (!currentTextoId) return;

    const handleSessionRestored = () => {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
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

        const restoredTesis = readAndMigrateLegacy('respuestaArgumentativa_tesis');
        const restoredEvidencias = readAndMigrateLegacy('respuestaArgumentativa_evidencias');
        const restoredContra = readAndMigrateLegacy('respuestaArgumentativa_contraargumento');
        const restoredRefutacion = readAndMigrateLegacy('respuestaArgumentativa_refutacion');

        if (restoredTesis !== tesis) setTesis(restoredTesis);
        if (restoredEvidencias !== evidencias) setEvidencias(restoredEvidencias);
        if (restoredContra !== contraargumento) setContraargumento(restoredContra);
        if (restoredRefutacion !== refutacion) setRefutacion(restoredRefutacion);

        if (restoredTesis || restoredEvidencias || restoredContra || restoredRefutacion) {
          logger.log('🔄 [RespuestaArgumentativa] Borradores restaurados desde sesión');
        }
      }).catch(() => {});
    };

    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [tesis, evidencias, contraargumento, refutacion, currentTextoId]);

  // Persistencia
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const rewardsResourceId = lectureId ? `${lectureId}:RespuestaArgumentativa` : null;
  const persistenceKey = lectureId ? `respuesta_argumentativa_${lectureId}` : null;

  // ✅ Estructura corregida: capturamos el retorno del hook para usar saveManual
  const persistence = useActivityPersistence(persistenceKey, {
    enabled: !!persistenceKey,
    courseId: sourceCourseId, // 🆕 Aislar datos por curso
    legacyDocumentIds: (currentTextoId && documentId && lectureId && lectureId !== documentId) ? [`respuesta_argumentativa_${documentId}`] : [],
    studentAnswers: {
      tesis: tesis,
      evidencias: evidencias,
      contraargumento: contraargumento,
      refutacion: refutacion
    },
    attempts: evaluationAttempts,
    history: history,
    submitted: isSubmitted,
    aiFeedbacks: { respuesta_argumentativa: feedback },
    onRehydrate: (data, meta) => {
      if (meta?.isEmpty) {
        setTesis('');
        setEvidencias('');
        setContraargumento('');
        setRefutacion('');
        setFeedback(null);
        setEvaluationAttempts(0);
        setHistory([]);
        setIsSubmitted(false);
        setIsLocked(false);
        setTeacherScoreOverride(null);
        return;
      }

      if (data.student_answers?.tesis) setTesis(data.student_answers.tesis);
      if (data.student_answers?.evidencias) setEvidencias(data.student_answers.evidencias);
      if (data.student_answers?.contraargumento) setContraargumento(data.student_answers.contraargumento);
      if (data.student_answers?.refutacion) setRefutacion(data.student_answers.refutacion);
      if (typeof data.attempts === 'number') setEvaluationAttempts(data.attempts);
      if (data.history) setHistory(data.history);
      if (data.submitted) {
        setIsSubmitted(true);
        setIsLocked(true);
      }
      if (data.ai_feedbacks?.respuesta_argumentativa) setFeedback(data.ai_feedbacks.respuesta_argumentativa);
    }
  });

  const applyTeacherReset = useCallback(() => {
    setIsSubmitted(false);
    setIsLocked(false);
    setHistory([]);
    setEvaluationAttempts(0);
    setFeedback(null);
    setTesis('');
    setEvidencias('');
    setContraargumento('');
    setRefutacion('');
    setViewingVersion(null);
    setTeacherScoreOverride(null);
  }, []);

  const maybeApplyTeacherReset = useTeacherArtifactReset({
    artifactLabel: 'RespuestaArgumentativa',
    lectureId,
    sourceCourseId,
    persistence,
    draftKeyBases: [
      'respuestaArgumentativa_tesis',
      'respuestaArgumentativa_evidencias',
      'respuestaArgumentativa_contraargumento',
      'respuestaArgumentativa_refutacion'
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

    const cloudData = findCloudArtifact('respuestaArgumentativa');
    
    if (maybeApplyTeacherReset(cloudData)) {
      return;
    }
    
    if (!cloudData) return;

    if (cloudData.history && Array.isArray(cloudData.history)) {
      logger.log('☁️ [RespuestaArgumentativa] Cargando historial desde Firestore:', cloudData.history.length, 'versiones');
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

        if (cloudData.drafts.tesis && !sessionStorage.getItem(getKey('respuestaArgumentativa_tesis'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_tesis'), cloudData.drafts.tesis);
          setTesis(cloudData.drafts.tesis);
        }
        if (cloudData.drafts.evidencias && !sessionStorage.getItem(getKey('respuestaArgumentativa_evidencias'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_evidencias'), cloudData.drafts.evidencias);
          setEvidencias(cloudData.drafts.evidencias);
        }
        if (cloudData.drafts.contraargumento && !sessionStorage.getItem(getKey('respuestaArgumentativa_contraargumento'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_contraargumento'), cloudData.drafts.contraargumento);
          setContraargumento(cloudData.drafts.contraargumento);
        }
        if (cloudData.drafts.refutacion && !sessionStorage.getItem(getKey('respuestaArgumentativa_refutacion'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_refutacion'), cloudData.drafts.refutacion);
          setRefutacion(cloudData.drafts.refutacion);
        }
        logger.log('☁️ [RespuestaArgumentativa] Borradores restaurados desde Firestore');
      }).catch(() => {});
    }
  }, [lectureId, activitiesProgress, sourceCourseId, maybeApplyTeacherReset]);

  // 🆕 Manejadores de Historial (definidos DESPUÉS de persistence para poder usar saveManual)
  const handleViewVersion = useCallback((version) => {
    setViewingVersion(version);
  }, []);

  const handleRestoreVersion = useCallback(() => {
    if (!viewingVersion || isSubmitted) return;

    setTesis(viewingVersion.content.tesis);
    setEvidencias(viewingVersion.content.evidencias);
    setContraargumento(viewingVersion.content.contraargumento);
    setRefutacion(viewingVersion.content.refutacion);
    setFeedback(viewingVersion.feedback);
    setViewingVersion(null);

    timersRef.current.push(setTimeout(() => persistence.saveManual(), 100));
  }, [viewingVersion, persistence, isSubmitted]);

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
        const previousArtifact = prev?.artifacts?.respuestaArgumentativa || {};
        const scoreToUse = previousArtifact.lastScore || (feedback.nivel_global ? feedback.nivel_global * 2.5 : 0);
        const attemptsToUse = Math.max(
          Number(previousArtifact.attempts || 0),
          Number(evaluationAttempts || 0),
          Array.isArray(history) ? history.length : 0
        );
        
        logger.log('📤 [RespuestaArgumentativa] Entregando con score:', scoreToUse, 'lastScore:', previousArtifact.lastScore, 'feedback.nivel_global:', feedback.nivel_global);
        
        return {
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            respuestaArgumentativa: {
              ...previousArtifact,
              submitted: true,
              submittedAt: Date.now(),
              score: scoreToUse,
              nivel: feedback.nivel_global || previousArtifact.lastNivel || 0,
              history: history,
              attempts: attemptsToUse,
              finalContent: { tesis, evidencias, contraargumento, refutacion },
              // 🔧 FIX: Limpiar marcadores de reset al hacer nueva entrega
              resetBy: null,
              resetAt: null
            }
          }
        };
      });
    }

    const event = new CustomEvent('evaluation-complete', {
      detail: {
        artefacto: 'RespuestaArgumentativa',
        score: feedback.nivel_global * 2.5,
        submitted: true
      }
    });
    window.dispatchEvent(event);

    logger.log('✅ [RespuestaArgumentativa] Tarea entregada y sincronizada con Dashboard');
  }, [feedback, persistence, lectureId, updateActivitiesProgress, history, evaluationAttempts, tesis, evidencias, contraargumento, refutacion]);

  // Garantizar persistencia con estado actualizado tras entregar
  useEffect(() => {
    if (!isSubmitted) return;
    persistence.saveManual();
  }, [isSubmitted, persistence]);

  const handleSubmit = useCallback(() => {
    if (!feedback) return;
    setShowSubmitConfirm(true);
  }, [feedback]);

  // Rúbrica
  const rubricDimension = useMemo(() => getDimension('argumentacion'), []);

  // 🆕 Gestión de citas guardadas
  const citasGuardadas = useMemo(() => {
    if (!lectureId) return [];
    return getCitations(lectureId);
  }, [lectureId, getCitations]);

  const insertarCita = useCallback((textoCita, campo, tipo = 'cita') => {
    const citaFormateada = tipo === 'cita' ? `"${textoCita}" ` : `${textoCita} `;

    const refMap = {
      tesis: tesisRef,
      evidencias: evidenciasRef,
      contraargumento: contraargumentoRef,
      refutacion: refutacionRef
    };

    const setterMap = {
      tesis: setTesis,
      evidencias: setEvidencias,
      contraargumento: setContraargumento,
      refutacion: setRefutacion
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

        // Refocus y reposicionar cursor después de la inserción
        timersRef.current.push(setTimeout(() => {
          if (textarea) {
            const newPosition = start + citaFormateada.length;
            textarea.focus();
            textarea.setSelectionRange(newPosition, newPosition);
            setCursorPositions((prevPos) => ({
              ...prevPos,
              [campo]: { start: newPosition, end: newPosition }
            }));
          }
        }, 0));

        return newText;
      });
    }

    setShowCitasPanel(false);
  }, [cursorPositions]);

  const handleCursorChange = useCallback((campo, event) => {
    const start = event?.target?.selectionStart ?? 0;
    const end = event?.target?.selectionEnd ?? start;
    setCursorPositions(prev => ({ ...prev, [campo]: { start, end } }));
  }, []);

  const handleEliminarCita = useCallback((citaId) => {
    if (lectureId) {
      deleteCitation(lectureId, citaId);
    }
  }, [lectureId, deleteCitation]);

  const handlePaste = useCallback((e) => {
    // 🔑 Si el pegado está desbloqueado (QA mode), permitir todo sin límite
    if (pasteUnlocked) return;

    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    setPasteError(`🚫 El pegado está deshabilitado. Escribe con tus propias palabras o usa citas guardadas del Cuaderno de Lectura. (Intentaste pegar ${wordCount} palabras)`);
    timersRef.current.push(setTimeout(() => setPasteError(null), 5000));
  }, [pasteUnlocked]);

  // Evaluación
  const handleEvaluate = useCallback(async () => {
    if (!isValid || !texto) return;

    // 🆕 Verificar límite de intentos
    if (evaluationAttempts >= MAX_ATTEMPTS) {
      setError(`⚠️ Límite de ${MAX_ATTEMPTS} intentos alcanzado`);
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
    setCurrentEvaluationStep({ label: 'Iniciando análisis argumentativo...', icon: '🔍', duration: 2 });

    // 🆕 Programar pasos de evaluación
    let stepTimeouts = [];
    stepTimeouts = [
      setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando estructura de la tesis...', icon: '💡', duration: 5 }), EVAL_STEP_ANALYZE_DELAY_MS),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), EVAL_STEP_DEEPSEEK_DELAY_MS),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), EVAL_STEP_OPENAI_DELAY_MS),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 4 }), EVAL_STEP_COMBINE_DELAY_MS)
    ];
    stepTimeouts.forEach(id => timersRef.current.push(id));

    try {
      const result = await evaluateRespuestaArgumentativa({
        text: texto,
        tesis,
        evidencias,
        contraargumento,
        refutacion
      });

      setFeedback(result);
      setIsLocked(true); // 🔒 Bloquear formulario después de evaluar
      setEvaluationAttempts(prev => prev + 1); // Incrementar solo tras éxito

      // 🆕 Guardar en historial
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        attemptNumber: evaluationAttempts + 1,
        content: {
          tesis,
          evidencias,
          contraargumento,
          refutacion
        },
        feedback: result,
        score: result.nivel_global * 2.5
      };
      setHistory(prev => [...prev, newHistoryEntry]);

      // 🆕 CLOUD SYNC: Sincronizar historial y borradores con Firestore
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => ({
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            respuestaArgumentativa: {
              ...(prev?.artifacts?.respuestaArgumentativa || {}),
              history: [...(prev?.artifacts?.respuestaArgumentativa?.history || []), newHistoryEntry],
              attempts: evaluationAttempts + 1,
              lastScore: result.nivel_global * 2.5,
              lastNivel: result.nivel_global,
              lastEvaluatedAt: Date.now(),
              drafts: { tesis, evidencias, contraargumento, refutacion },
              // 🆕 Limpiar flags de reset cuando el estudiante trabaja
              resetBy: null,
              resetAt: null
            }
          }
        }));
        logger.log('☁️ [RespuestaArgumentativa] Historial sincronizado con Firestore');
      }

      // 🆕 Limpiar drafts
      if (currentTextoId) {
        import('../../services/sessionManager').then(({ getDraftKey, updateCurrentSession, captureArtifactsDrafts }) => {
          const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

          // scoped
          sessionStorage.removeItem(getKey('respuestaArgumentativa_tesis'));
          sessionStorage.removeItem(getKey('respuestaArgumentativa_evidencias'));
          sessionStorage.removeItem(getKey('respuestaArgumentativa_contraargumento'));
          sessionStorage.removeItem(getKey('respuestaArgumentativa_refutacion'));

          // legacy
          sessionStorage.removeItem('respuestaArgumentativa_tesis');
          sessionStorage.removeItem('respuestaArgumentativa_evidencias');
          sessionStorage.removeItem('respuestaArgumentativa_contraargumento');
          sessionStorage.removeItem('respuestaArgumentativa_refutacion');

          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId, sourceCourseId) });
        }).catch(() => {});
      }

      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica4', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'RespuestaArgumentativa',
        criterios: result.criterios,
        textoId: lectureId
      });

      // 🎮 Registrar recompensas
      if (rewards) {
        rewards.recordEvent('ARTIFACT_SUBMITTED', {
          artefacto: 'RespuestaArgumentativa',
          rubricId: 'rubrica4',
          score: result.nivel_global * 2.5,
          resourceId: rewardsResourceId
        });

        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'RespuestaArgumentativa',
          rubricId: 'rubrica4',
          resourceId: rewardsResourceId
        });

        rewards.recordEvent(`EVALUATION_LEVEL_${result.nivel_global}`, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'RespuestaArgumentativa',
          resourceId: rewardsResourceId
        });

        // Bonos de contenido: solo si el nivel es >= 3 (competente)
        if (result.nivel_global >= 3) {
          // Bonificación por tesis crítica sólida (>100 caracteres)
          if (tesis.length > 100) {
            rewards.recordEvent('CRITICAL_THESIS_DEVELOPED', {
              length: tesis.length,
              artefacto: 'RespuestaArgumentativa',
              resourceId: rewardsResourceId
            });
          }

          // Bonificación por contraargumento anticipado (>80 caracteres)
          if (contraargumento.length > 80) {
            rewards.recordEvent('COUNTERARGUMENT_ANTICIPATED', {
              length: contraargumento.length,
              artefacto: 'RespuestaArgumentativa',
              resourceId: rewardsResourceId
            });
          }

          // Bonificación por refutación elaborada (>80 caracteres)
          if (refutacion.length > 80) {
            rewards.recordEvent('REFUTATION_ELABORATED', {
              length: refutacion.length,
              artefacto: 'RespuestaArgumentativa',
              resourceId: rewardsResourceId
            });
          }
        }

        // Puntuación perfecta
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'RespuestaArgumentativa',
            resourceId: rewardsResourceId
          });
        }

        logger.log('🎮 [RespuestaArgumentativa] Recompensas registradas');
      }

    } catch (error) {
      logger.error('Error evaluando Respuesta Argumentativa:', error);
      setError(error.message || 'Error al evaluar el argumento');
    } finally {
      // Limpiar step timeouts en cualquier caso (éxito o error)
      stepTimeouts.forEach(clearTimeout);
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValid, texto, tesis, evidencias, contraargumento, refutacion, setError, rewards, rewardsResourceId, evaluationAttempts, rateLimit, updateRubricScore, lectureId, updateActivitiesProgress, history, persistence, currentTextoId]);

  // Verificar si hay texto
  if (!texto) {
    return (
      <Container>
        <Header>
          <Title>💭 Respuesta Argumentativa</Title>
          <Subtitle>Carga un texto para comenzar</Subtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>💭 Respuesta Argumentativa</Title>
        <Subtitle>
          Construye una postura fundamentada sobre el texto, presenta evidencias, anticipa objeciones y refútalas.
          Recibirás evaluación criterial basada en la Rúbrica 4 de Literacidad Crítica.
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

      {/* 🆕 Botón flotante para citas guardadas */}
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
                  ? 'Guarda citas y anotaciones desde "Lectura Guiada"'
                  : 'Selecciona el campo y haz clic en el botón correspondiente'}
              </p>
            </CitasPanelHeader>

            <CitasList>
              {citasGuardadas.length === 0 ? (
                <EmptyCitasMessage theme={theme}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📓</div>
                  <p><strong>Tu cuaderno está vacío</strong></p>
                  <ol style={{ textAlign: 'left', lineHeight: 1.6 }}>
                    <li>Ve a "Lectura Guiada"</li>
                    <li>Selecciona texto y usa 📌 Cita o 📓 Anotar</li>
                    <li>Regresa aquí para insertar en tu respuesta</li>
                  </ol>
                </EmptyCitasMessage>
              ) : (
                citasGuardadas.map((cita) => {
                  const tipo = cita.tipo || 'cita';
                  const isInsertable = tipo !== 'pregunta';
                  const badgeColors = { cita: '#3190fc', reflexion: '#8b5cf6', comentario: '#f59e0b', pregunta: '#ef4444' };
                  const badgeLabels = { cita: '📌 Cita', reflexion: '💭 Reflexión', comentario: '💬 Comentario', pregunta: '❓ Pregunta' };
                  return (
                    <CitaItem key={cita.id} theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                          background: badgeColors[tipo] + '22', color: badgeColors[tipo], fontWeight: 600
                        }}>{badgeLabels[tipo]}</span>
                      </div>
                      <CitaTexto theme={theme}>
                        {tipo === 'cita' ? `«${cita.texto}»` : cita.texto}
                      </CitaTexto>
                      {tipo !== 'cita' && cita.nota && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic', margin: '0.25rem 0' }}>
                          Ref: «{cita.nota.substring(0, 60)}{cita.nota.length > 60 ? '…' : ''}»
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
                          {isInsertable && (
                            <>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'tesis', tipo)} theme={theme}>
                                Tesis
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'evidencias', tipo)} theme={theme}>
                                Evidencias
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'contraargumento', tipo)} theme={theme}>
                                Contra
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'refutacion', tipo)} theme={theme}>
                                Refutación
                              </InsertarButton>
                            </>
                          )}
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

      {/* 🆕 Historial y Navegación de Versiones */}
      <HistoryRibbon
        history={history}
        viewingVersion={viewingVersion}
        onViewVersion={handleViewVersion}
        theme={theme}
        scoreFormat="score"
      />

      {/* 🆕 Banner de Restauración */}
      <AnimatePresence>
        {viewingVersion && (
          <RestoreBanner
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>
              👁️ Estás viendo el <strong>Intento {viewingVersion.attemptNumber}</strong> ({new Date(viewingVersion.timestamp).toLocaleString()}).
              Es de solo lectura.
            </span>
            <RestoreButton onClick={handleRestoreVersion}>
              🔄 Restaurar esta versión
            </RestoreButton>
          </RestoreBanner>
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
                <strong>Argumento enviado a evaluación</strong>
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

      {/* Formulario - Visible solo cuando no está bloqueado */}
      {!viewingVersion && (
        <>
          {/* 🆕 Mensaje de guardado automático */}
          {(tesis || evidencias || contraargumento || refutacion) && (
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
            <SectionTitle theme={theme}>1️⃣ Tu Tesis (Postura Fundamentada)</SectionTitle>
            <Label theme={theme}>¿Cuál es tu postura sobre el texto?</Label>
            <Textarea
              ref={tesisRef}
              theme={theme}
              value={displayedContent.tesis}
              onChange={(e) => !viewingVersion && setTesis(e.target.value)}
              onClick={(e) => handleCursorChange('tesis', e)}
              onKeyUp={(e) => handleCursorChange('tesis', e)}
              onSelect={(e) => handleCursorChange('tesis', e)}
              onPaste={handlePaste}
              placeholder="Ej: Sostengo que el texto naturaliza la lógica neoliberal al presentar la competencia como única forma legítima de organización social, excluyendo alternativas cooperativas del debate público."
              disabled={loading || isReadOnly}
            />
            {pasteError && <PasteErrorMessage theme={theme}>{pasteError}</PasteErrorMessage>}
            <HintText theme={theme}>
              Formula una tesis clara, específica y defendible (no una obviedad ni algo imposible de sostener)
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>2️⃣ Evidencias del Texto</SectionTitle>
            <Label theme={theme}>¿Qué evidencias del texto sustentan tu tesis?</Label>
            <Textarea
              ref={evidenciasRef}
              theme={theme}
              value={displayedContent.evidencias}
              onChange={(e) => !viewingVersion && setEvidencias(e.target.value)}
              onClick={(e) => handleCursorChange('evidencias', e)}
              onKeyUp={(e) => handleCursorChange('evidencias', e)}
              onSelect={(e) => handleCursorChange('evidencias', e)}
              onPaste={handlePaste}
              placeholder='Ej: En el párrafo 3, el autor afirma que "la competencia es ley natural", naturalizando así un modelo económico histórico como inevitable. Además, al usar metáforas deportivas ("ganar/perder") en el párrafo 5, refuerza una visión individualista donde solo hay ganadores y perdedores, omitiendo modelos de economía solidaria documentados en...'
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Ancla tus evidencias en citas textuales y explica CÓMO sustentan tu tesis
            </HintText>
          </FormSection>

          <FormSection>
            <Label theme={theme}>3️⃣ Contraargumento (al menos 20 caracteres)</Label>
            <Textarea
              ref={contraargumentoRef}
              theme={theme}
              value={displayedContent.contraargumento}
              onChange={(e) => !viewingVersion && setContraargumento(e.target.value)}
              onClick={(e) => handleCursorChange('contraargumento', e)}
              onKeyUp={(e) => handleCursorChange('contraargumento', e)}
              onSelect={(e) => handleCursorChange('contraargumento', e)}
              onPaste={handlePaste}
              placeholder="Ej: Se podría objetar que la competencia ha demostrado históricamente generar innovación tecnológica y mejora de productos, como evidencia el desarrollo industrial de los últimos dos siglos."
              disabled={loading || isReadOnly}
              style={{ minHeight: '120px' }}
            />
            <HintText theme={theme}>
              Presenta el contraargumento MÁS FUERTE, no una versión débil o caricaturizada
            </HintText>
          </FormSection>

          <FormSection>
            <Label theme={theme}>4️⃣ Refutación (al menos 30 caracteres)</Label>
            <Textarea
              ref={refutacionRef}
              theme={theme}
              value={displayedContent.refutacion}
              onChange={(e) => !viewingVersion && setRefutacion(e.target.value)}
              onClick={(e) => handleCursorChange('refutacion', e)}
              onKeyUp={(e) => handleCursorChange('refutacion', e)}
              onSelect={(e) => handleCursorChange('refutacion', e)}
              onPaste={handlePaste}
              placeholder="Ej: Si bien es cierto que la competencia puede generar innovación, esta lógica ignora los costos sociales (precarización laboral, desigualdad extrema) y excluye del análisis modelos donde la cooperación también produjo innovación significativa, como el software libre, las cooperativas de Mondragón, o la economía social y solidaria en América Latina."
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Reconoce lo válido del contraargumento, pero muestra sus limitaciones o aspectos que ignora
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
              disabled={!isValid || loading || evaluationAttempts >= MAX_ATTEMPTS || !rateLimit.canProceed || isReadOnly}
            >
              {loading ? '⏳ Evaluando...' :
                !rateLimit.canProceed ? `⏳ Espera ${rateLimit.nextAvailableIn}s` :
                  `💭 Solicitar Evaluación (${MAX_ATTEMPTS - evaluationAttempts} restantes)`}
            </PrimaryButton>

            {!isSubmitted && feedback && !viewingVersion && !loading && (
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
        {displayedContent.feedback && !loading && (
          <FeedbackSection
            theme={theme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FeedbackHeader>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.text }}>
                  📊 Evaluación Criterial ({viewingVersion ? `Intento ${viewingVersion.attemptNumber}` : 'IA Dual'})
                </h3>
                <NivelGlobal $nivel={displayedContent.feedback.nivel_global}>
                  Nivel {displayedContent.feedback.nivel_global}/4
                </NivelGlobal>
              </div>
            </FeedbackHeader>

            <DimensionLabel theme={theme}>
              <strong>{displayedContent.feedback.dimension_label}:</strong> {displayedContent.feedback.dimension_description}
            </DimensionLabel>

            {displayedContent.feedback.criterios && (
            <CriteriosGrid>
              {/* Solidez de la Tesis */}
              {displayedContent.feedback.criterios.solidez_tesis && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Solidez de la Tesis</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.solidez_tesis.nivel}>
                    Nivel {displayedContent.feedback.criterios.solidez_tesis.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.solidez_tesis.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.solidez_tesis.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.solidez_tesis.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.solidez_tesis.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Uso de Evidencia */}
              {displayedContent.feedback.criterios.uso_evidencia && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Uso de Evidencia</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.uso_evidencia.nivel}>
                    Nivel {displayedContent.feedback.criterios.uso_evidencia.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.uso_evidencia.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.uso_evidencia.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.uso_evidencia.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.uso_evidencia.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Manejo del Contraargumento */}
              {displayedContent.feedback.criterios.manejo_contraargumento && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Manejo del Contraargumento</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.manejo_contraargumento.nivel}>
                    Nivel {displayedContent.feedback.criterios.manejo_contraargumento.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.manejo_contraargumento.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.manejo_contraargumento.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.manejo_contraargumento.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.manejo_contraargumento.mejoras.map((m, idx) => (
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
