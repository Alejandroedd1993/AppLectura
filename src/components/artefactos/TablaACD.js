// src/components/artefactos/TablaACD.js
import React, { useState, useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateTablaACD } from '../../services/tablaACD.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useArtifactEvaluationPolicy from '../../hooks/useArtifactEvaluationPolicy';
import useTeacherArtifactReset from '../../hooks/useTeacherArtifactReset';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import KeyboardShortcutsBar from '../ui/KeyboardShortcutsBar';
import HistoryRibbon from '../ui/HistoryRibbon';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import { getDimension } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';
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
  ShortcutsHint,
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

export default function TablaACD({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation, updateActivitiesProgress, sourceCourseId, currentTextoId, activitiesProgress } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas

  // 🆕 Ref para rastrear todos los timers activos y limpiarlos al desmontar
  const timersRef = useRef([]);

  // Limpiar todos los timers pendientes al desmontar
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // 🆕 FASE 1 FIX: Estados con carga dinámica por textoId
  const [marcoIdeologico, setMarcoIdeologico] = useState('');
  const [estrategiasRetoricas, setEstrategiasRetoricas] = useState('');
  const [vocesPresentes, setVocesPresentes] = useState('');
  const [vocesSilenciadas, setVocesSilenciadas] = useState('');

  // 🆕 Efecto para cargar borradores cuando cambia el textoId
  useEffect(() => {
    if (!currentTextoId) return;

    // Evitar contaminación visual entre documentos mientras se rehidrata
    setMarcoIdeologico('');
    setEstrategiasRetoricas('');
    setVocesPresentes('');
    setVocesSilenciadas('');

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

      setMarcoIdeologico(readAndMigrateLegacy('tablaACD_marcoIdeologico'));
      setEstrategiasRetoricas(readAndMigrateLegacy('tablaACD_estrategiasRetoricas'));
      setVocesPresentes(readAndMigrateLegacy('tablaACD_vocesPresentes'));
      setVocesSilenciadas(readAndMigrateLegacy('tablaACD_vocesSilenciadas'));

      logger.log('📂 [TablaACD] Borradores cargados para textoId:', currentTextoId);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentTextoId]);

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  // 🆕 Estados para sistema de citas
  const [showCitasPanel, setShowCitasPanel] = useState(false);
  const [pasteError, setPasteError] = useState(null);
  const [evaluationAttempts, setEvaluationAttempts] = useState(0); // 🆕 Intentos (Max 3)
  const [history, setHistory] = useState([]); // 🆕 Historial de versiones
  const [viewingVersion, setViewingVersion] = useState(null); // 🆕 Versión en modo lectura
  const [isSubmitted, setIsSubmitted] = useState(false); // 🆕 Estado de entrega final
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // 🆕 Modal de confirmación de entrega
  const [teacherScoreOverride, setTeacherScoreOverride] = useState(null); // 🆕 Override docente
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  const {
    rateLimit,
    maxAttempts: MAX_ATTEMPTS
  } = useArtifactEvaluationPolicy({
    rateLimitKey: 'evaluate_tabla_acd',
    cooldownMs: 5000,
    maxPerHour: 10,
    maxAttempts: 3
  });

  // 🆕 Keyboard shortcuts para productividad
  const [showSaveHint, setShowSaveHint] = useState(false);

  useKeyboardShortcuts({
    'ctrl+s': (_e) => {
      logger.log('⌨️ Ctrl+S: Guardando borrador TablaACD...');
      if (!currentTextoId) return;

      // Guardar manualmente en sessionStorage (namespaced por textoId)
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);
        if (marcoIdeologico) sessionStorage.setItem(getKey('tablaACD_marcoIdeologico'), marcoIdeologico);
        if (estrategiasRetoricas) sessionStorage.setItem(getKey('tablaACD_estrategiasRetoricas'), estrategiasRetoricas);
        if (vocesPresentes) sessionStorage.setItem(getKey('tablaACD_vocesPresentes'), vocesPresentes);
        if (vocesSilenciadas) sessionStorage.setItem(getKey('tablaACD_vocesSilenciadas'), vocesSilenciadas);
      }).catch(() => {});
      // Feedback visual
      setShowSaveHint(true);
      timersRef.current.push(setTimeout(() => setShowSaveHint(false), 2000));
    },
    'ctrl+enter': (_e) => {
      logger.log('⌨️ Ctrl+Enter: Evaluando tabla ACD...');
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
      }
    }
  }, {
    enabled: true,
    excludeInputs: false
  });

  // 🆕 Refs para guardar posición del cursor en cada textarea
  const marcoRef = React.useRef(null);
  const estrategiasRef = React.useRef(null);
  const presentesRef = React.useRef(null);
  const silenciadasRef = React.useRef(null);
  const [cursorPositions, setCursorPositions] = React.useState({
    marco: 0,
    estrategias: 0,
    presentes: 0,
    silenciadas: 0
  });

  // Validación
  const isValid = useMemo(() => {
    return marcoIdeologico.trim().length >= 10 &&
      estrategiasRetoricas.trim().length >= 20 &&
      vocesPresentes.trim().length >= 3 &&
      vocesSilenciadas.trim().length >= 3;
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas]);

  const validationMessage = useMemo(() => {
    if (!marcoIdeologico.trim()) return '⚠️ Identifica el marco ideológico del texto';
    if (marcoIdeologico.trim().length < 10) return '⚠️ Describe el marco ideológico con más detalle (mín. 10 caracteres)';
    if (!estrategiasRetoricas.trim()) return '⚠️ Lista al menos 2 estrategias retóricas con ejemplos';
    if (estrategiasRetoricas.trim().length < 20) return '⚠️ Desarrolla las estrategias retóricas (mín. 20 caracteres)';
    if (!vocesPresentes.trim()) return '⚠️ Identifica las voces presentes en el discurso';
    if (!vocesSilenciadas.trim()) return '⚠️ Identifica las voces silenciadas o ausentes';
    return '✅ Análisis completo. Solicita evaluación criterial.';
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas]);

  // 🆕 FASE 1 FIX: Guardar respaldo en sessionStorage con claves namespaced
  useEffect(() => {
    if (!currentTextoId) return;

    import('../../services/sessionManager').then(({ getDraftKey }) => {
      const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

      if (marcoIdeologico) sessionStorage.setItem(getKey('tablaACD_marcoIdeologico'), marcoIdeologico);
      if (estrategiasRetoricas) sessionStorage.setItem(getKey('tablaACD_estrategiasRetoricas'), estrategiasRetoricas);
      if (vocesPresentes) sessionStorage.setItem(getKey('tablaACD_vocesPresentes'), vocesPresentes);
      if (vocesSilenciadas) sessionStorage.setItem(getKey('tablaACD_vocesSilenciadas'), vocesSilenciadas);

      logger.log('💾 [TablaACD] Borradores guardados para textoId:', currentTextoId);
    }).catch(() => {});
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, currentTextoId]);

  // 🆕 Sincronización en la nube de borradores (debounced)
  useEffect(() => {
    if (!currentTextoId) return;

    if (marcoIdeologico || estrategiasRetoricas || vocesPresentes || vocesSilenciadas) {
      const timer = setTimeout(() => {
        import('../../services/sessionManager').then(({ updateCurrentSession, captureArtifactsDrafts }) => {
          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId, sourceCourseId) });
        }).catch(() => {});
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, currentTextoId]);

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

        const restoredMarco = readAndMigrateLegacy('tablaACD_marcoIdeologico');
        const restoredEstrategias = readAndMigrateLegacy('tablaACD_estrategiasRetoricas');
        const restoredPresentes = readAndMigrateLegacy('tablaACD_vocesPresentes');
        const restoredSilenciadas = readAndMigrateLegacy('tablaACD_vocesSilenciadas');

        if (restoredMarco !== marcoIdeologico) setMarcoIdeologico(restoredMarco);
        if (restoredEstrategias !== estrategiasRetoricas) setEstrategiasRetoricas(restoredEstrategias);
        if (restoredPresentes !== vocesPresentes) setVocesPresentes(restoredPresentes);
        if (restoredSilenciadas !== vocesSilenciadas) setVocesSilenciadas(restoredSilenciadas);

        if (restoredMarco || restoredEstrategias || restoredPresentes || restoredSilenciadas) {
          logger.log('🔄 [TablaACD] Borradores restaurados desde sesión');
        }
      }).catch(() => {});
    };

    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, currentTextoId]);

  // Persistencia principal
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const rewardsResourceId = lectureId ? `${lectureId}:TablaACD` : null;
  const persistenceKey = lectureId ? `tabla_acd_${lectureId}` : null;

  // ✅ Estructura corregida: onRehydrate debe estar en options, NO dentro de studentAnswers
  const persistence = useActivityPersistence(persistenceKey, {
    enabled: !!persistenceKey,
    courseId: sourceCourseId, // 🆕 Aislar datos por curso
    legacyDocumentIds: (currentTextoId && documentId && lectureId && lectureId !== documentId) ? [`tabla_acd_${documentId}`] : [],
    studentAnswers: {
      marco_ideologico: marcoIdeologico,
      estrategias_retoricas: estrategiasRetoricas,
      voces_presentes: vocesPresentes,
      voces_silenciadas: vocesSilenciadas
    },
    aiFeedbacks: { tabla_acd: feedback },
    attempts: evaluationAttempts,
    history: history,
    submitted: isSubmitted,
    onRehydrate: (data, meta) => {
      if (meta?.isEmpty) {
        setMarcoIdeologico('');
        setEstrategiasRetoricas('');
        setVocesPresentes('');
        setVocesSilenciadas('');
        setFeedback(null);
        setEvaluationAttempts(0);
        setHistory([]);
        setIsSubmitted(false);
        setIsLocked(false);
        setTeacherScoreOverride(null);
        return;
      }

      if (data.student_answers?.marco_ideologico) setMarcoIdeologico(data.student_answers.marco_ideologico);
      if (data.student_answers?.estrategias_retoricas) setEstrategiasRetoricas(data.student_answers.estrategias_retoricas);
      if (data.student_answers?.voces_presentes) setVocesPresentes(data.student_answers.voces_presentes);
      if (data.student_answers?.voces_silenciadas) setVocesSilenciadas(data.student_answers.voces_silenciadas);
      if (data.ai_feedbacks?.tabla_acd) setFeedback(data.ai_feedbacks.tabla_acd);

      // 🆕 Rehidratar intentos
      if (typeof data.attempts === 'number') {
        setEvaluationAttempts(data.attempts);
      }

      // 🆕 Rehidratar historial
      if (Array.isArray(data.history)) {
        setHistory(data.history);
      }

      // 🆕 Rehidratar estado de entrega
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
    setMarcoIdeologico('');
    setEstrategiasRetoricas('');
    setVocesPresentes('');
    setVocesSilenciadas('');
    setViewingVersion(null);
    setTeacherScoreOverride(null);
  }, []);

  const maybeApplyTeacherReset = useTeacherArtifactReset({
    artifactLabel: 'TablaACD',
    lectureId,
    sourceCourseId,
    persistence,
    draftKeyBases: [
      'tablaACD_marcoIdeologico',
      'tablaACD_estrategiasRetoricas',
      'tablaACD_vocesPresentes',
      'tablaACD_vocesSilenciadas'
    ],
    onApplyReset: applyTeacherReset
  });

  // 🆕 CLOUD SYNC: Cargar history/drafts desde Firestore (activitiesProgress) - tiene prioridad sobre localStorage
  // También detecta resets del docente y limpia el estado local
  useEffect(() => {
    if (!lectureId) return;

    const findCloudArtifact = (artifactKey) => {
      if (!activitiesProgress) return null;
      // Estructura anidada (preferida)
      const nested = activitiesProgress?.[lectureId]?.artifacts?.[artifactKey];
      if (nested) return nested;

      // Estructura directa
      const direct = activitiesProgress?.artifacts?.[artifactKey];
      if (direct) return direct;

      // Buscar en cualquier key
      if (typeof activitiesProgress === 'object') {
        for (const key of Object.keys(activitiesProgress)) {
          const candidate = activitiesProgress?.[key]?.artifacts?.[artifactKey];
          if (candidate) return candidate;
        }
      }
      return null;
    };

    const cloudData = findCloudArtifact('tablaACD');
    
    if (maybeApplyTeacherReset(cloudData)) {
      return;
    }
    
    if (!cloudData) return;

    // Priorizar datos de cloud sobre localStorage
    if (cloudData.history && Array.isArray(cloudData.history)) {
      logger.log('☁️ [TablaACD] Cargando historial desde Firestore:', cloudData.history.length, 'versiones');
      setHistory(prev => {
        if (prev.length >= cloudData.history.length) return prev;
        return cloudData.history;
      });
    }

    if (cloudData.attempts && typeof cloudData.attempts === 'number') {
      setEvaluationAttempts(prev => Math.max(prev, cloudData.attempts));
    }

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

    // 🆕 Restaurar borradores desde cloud si sessionStorage está vacío
    if (cloudData.drafts) {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, lectureId, sourceCourseId);

        if (cloudData.drafts.marcoIdeologico && !sessionStorage.getItem(getKey('tablaACD_marcoIdeologico'))) {
          sessionStorage.setItem(getKey('tablaACD_marcoIdeologico'), cloudData.drafts.marcoIdeologico);
          setMarcoIdeologico(cloudData.drafts.marcoIdeologico);
        }
        if (cloudData.drafts.estrategiasRetoricas && !sessionStorage.getItem(getKey('tablaACD_estrategiasRetoricas'))) {
          sessionStorage.setItem(getKey('tablaACD_estrategiasRetoricas'), cloudData.drafts.estrategiasRetoricas);
          setEstrategiasRetoricas(cloudData.drafts.estrategiasRetoricas);
        }
        if (cloudData.drafts.vocesPresentes && !sessionStorage.getItem(getKey('tablaACD_vocesPresentes'))) {
          sessionStorage.setItem(getKey('tablaACD_vocesPresentes'), cloudData.drafts.vocesPresentes);
          setVocesPresentes(cloudData.drafts.vocesPresentes);
        }
        if (cloudData.drafts.vocesSilenciadas && !sessionStorage.getItem(getKey('tablaACD_vocesSilenciadas'))) {
          sessionStorage.setItem(getKey('tablaACD_vocesSilenciadas'), cloudData.drafts.vocesSilenciadas);
          setVocesSilenciadas(cloudData.drafts.vocesSilenciadas);
        }
        logger.log('☁️ [TablaACD] Borradores restaurados desde Firestore');
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
        const previousArtifact = prev?.artifacts?.tablaACD || {};
        const scoreToUse = previousArtifact.lastScore || (feedback.nivel_global ? feedback.nivel_global * 2.5 : 0);
        const attemptsToUse = Math.max(
          Number(previousArtifact.attempts || 0),
          Number(evaluationAttempts || 0),
          Array.isArray(history) ? history.length : 0
        );
        
        logger.log('📤 [TablaACD] Entregando con score:', scoreToUse, 'lastScore:', previousArtifact.lastScore, 'feedback.nivel_global:', feedback.nivel_global);
        
        return {
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            tablaACD: {
              ...previousArtifact,
              submitted: true,
              submittedAt: Date.now(),
              score: scoreToUse,
              nivel: feedback.nivel_global || previousArtifact.lastNivel || 0,
              history: history,
              attempts: attemptsToUse,
              finalContent: { marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas }
            }
          }
        };
      });
    }

    if (rewards) {
      rewards.recordEvent('ARTIFACT_SUBMITTED', {
        artefacto: 'TablaACD',
        level: feedback.nivel_global,
        resourceId: rewardsResourceId
      });
    }

    logger.log('✅ [TablaACD] Tarea entregada y sincronizada con Dashboard');
  }, [feedback, rewards, persistence, lectureId, updateActivitiesProgress, rewardsResourceId, history, evaluationAttempts, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas]);

  // Garantizar persistencia con estado actualizado tras entregar
  useEffect(() => {
    if (!isSubmitted) return;
    persistence.saveManual();
  }, [isSubmitted, persistence]);

  const handleSubmit = useCallback(() => {
    if (!feedback) return;
    setShowSubmitConfirm(true);
  }, [feedback]);

  // 🆕 Visualizar una versión histórica
  const handleViewVersion = useCallback((entry) => {
    if (!entry) {
      setViewingVersion(null); // Volver al actual
      return;
    }
    setViewingVersion(entry);
    logger.log(`📜 Visualizando versión: Intento ${entry.attemptNumber}`);
  }, []);

  // 🆕 Restaurar versión antigua como actual
  const handleRestoreVersion = useCallback(() => {
    if (!viewingVersion || isSubmitted) return;

    // Restaurar contenido (todos los campos)
    if (viewingVersion.content) {
      setMarcoIdeologico(viewingVersion.content.marco_ideologico || '');
      setEstrategiasRetoricas(viewingVersion.content.estrategias_retoricas || '');
      setVocesPresentes(viewingVersion.content.voces_presentes || '');
      setVocesSilenciadas(viewingVersion.content.voces_silenciadas || '');
    }

    // Restaurar evaluación
    setFeedback(viewingVersion.feedback);

    // Configurar estado
    setViewingVersion(null);
    // Nota: TablaACD no tiene estado "Locked" explícito como Resumen, 
    // pero al restaurar el feedback se muestra la evaluación.

    // Guardar inmediatamente este cambio de estado
    timersRef.current.push(setTimeout(() => persistence.saveManual(), 100));

    logger.log('rewind ⏪ Versión restaurada exitosamente');
  }, [viewingVersion, persistence, isSubmitted]);

  // Determine what to show: Current state or specific version
  const displayedContent = useMemo(() => {
    if (viewingVersion && viewingVersion.content) {
      return {
        marco: viewingVersion.content.marco_ideologico,
        estrategias: viewingVersion.content.estrategias_retoricas,
        presentes: viewingVersion.content.voces_presentes,
        silenciadas: viewingVersion.content.voces_silenciadas
      };
    }
    return {
      marco: marcoIdeologico,
      estrategias: estrategiasRetoricas,
      presentes: vocesPresentes,
      silenciadas: vocesSilenciadas
    };
  }, [viewingVersion, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas]);

  // 🆕 Feedback a mostrar (histórico o actual)
  const displayedFeedback = useMemo(() => {
    if (viewingVersion && viewingVersion.feedback) {
      return viewingVersion.feedback;
    }
    return feedback;
  }, [viewingVersion, feedback]);

  const isReadOnly = Boolean(viewingVersion) || isSubmitted;

  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    logger.log('✏️ [TablaACD] Desbloqueando para editar...');
    setIsLocked(false);
    setFeedback(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);

  // 🆕 Obtener citas guardadas
  const citasGuardadas = useMemo(() => {
    if (!lectureId) return [];
    return getCitations(lectureId);
  }, [lectureId, getCitations]);

  // 🆕 Insertar cita en posición del cursor
  const insertarCita = useCallback((textoCita, campo, tipo = 'cita') => {
    const citaFormateada = tipo === 'cita' ? `"${textoCita}" ` : `${textoCita} `;

    const refMap = {
      marco: marcoRef,
      estrategias: estrategiasRef,
      presentes: presentesRef,
      silenciadas: silenciadasRef
    };

    const setterMap = {
      marco: setMarcoIdeologico,
      estrategias: setEstrategiasRetoricas,
      presentes: setVocesPresentes,
      silenciadas: setVocesSilenciadas
    };

    const ref = refMap[campo];
    const setter = setterMap[campo];

    if (ref && ref.current && setter) {
      const textarea = ref.current;
      const start = textarea.selectionStart || cursorPositions[campo] || 0;
      const end = textarea.selectionEnd || cursorPositions[campo] || 0;

      setter(prev => {
        const before = prev.substring(0, start);
        const after = prev.substring(end);
        const newText = before + citaFormateada + after;

        // Actualizar cursor después de la inserción
        timersRef.current.push(setTimeout(() => {
          if (textarea) {
            const newPosition = start + citaFormateada.length;
            textarea.focus();
            textarea.setSelectionRange(newPosition, newPosition);
          }
        }, 0));

        return newText;
      });
    }

    setShowCitasPanel(false);
  }, [cursorPositions]);

  // 🆕 Capturar posición del cursor
  const handleCursorChange = useCallback((campo, event) => {
    const position = event.target.selectionStart;
    setCursorPositions(prev => ({ ...prev, [campo]: position }));
  }, []);

  // 🆕 Eliminar cita
  const handleEliminarCita = useCallback((citaId) => {
    if (lectureId) deleteCitation(lectureId, citaId);
  }, [lectureId, deleteCitation]);

  // 🆕 Prevención de pegado
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    if (wordCount <= 40) {
      // Permitir paste de hasta 40 palabras
      document.execCommand('insertText', false, pastedText);
    } else {
      setPasteError(`⚠️ Solo puedes pegar hasta 40 palabras (intentaste pegar ${wordCount}). Escribe con tus propias palabras o usa citas guardadas.`);
      timersRef.current.push(setTimeout(() => setPasteError(null), 5000));
    }
  }, []);

  // Rúbrica
  const rubricDimension = useMemo(() => getDimension('acd'), []);

  // Evaluación
  const handleEvaluate = useCallback(async () => {
    if (!isValid || !texto) return;

    // 🆕 Verificar límite de intentos
    if (evaluationAttempts >= MAX_ATTEMPTS) {
      setError(`🚫 Has alcanzado el límite de ${MAX_ATTEMPTS} intentos de evaluación para este artefacto.`);
      return;
    }

    // ✅ Verificar rate limit
    const rateLimitResult = rateLimit.attemptOperation();
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.reason === 'cooldown') {
        setError(`⏱️ Por favor espera ${rateLimitResult.waitSeconds} segundos antes de evaluar nuevamente.`);
      } else if (rateLimitResult.reason === 'hourly_limit') {
        setError(`🚦 Has alcanzado el límite de 10 evaluaciones totales por hora. Intenta más tarde.`);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando análisis crítico...', icon: '🔍', duration: 2 });

    const stepTimeouts = [];
    try {
      // Simular pasos para feedback visual
      stepTimeouts.push(
        setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando marco ideológico...', icon: '📊', duration: 6 }), 1000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 4000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), 16000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando análisis...', icon: '🔧', duration: 4 }), 28000)
      );
      timersRef.current.push(...stepTimeouts);

      const result = await evaluateTablaACD({
        text: texto,
        marcoIdeologico,
        estrategiasRetoricas,
        vocesPresentes,
        vocesSilenciadas
      });

      setFeedback(result);
      setIsLocked(true); // 🔒 Bloquear formulario después de evaluar
      setEvaluationAttempts(prev => prev + 1); // Incrementar solo tras éxito
      updateRubricScore('rubrica2', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'AnalisisCriticoDiscurso',
        sourceArtefacto: 'TablaACD',
        criterios: result.criterios,
        textoId: lectureId
      });

      // 🆕 Archivar en Historial
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        content: {
          marco_ideologico: marcoIdeologico,
          estrategias_retoricas: estrategiasRetoricas,
          voces_presentes: vocesPresentes,
          voces_silenciadas: vocesSilenciadas,
        },
        feedback: result,
        score: result.nivel_global * 2.5,
        attemptNumber: evaluationAttempts + 1
      };

      setHistory(prev => [...prev, newHistoryEntry]);
      logger.log('📜 [TablaACD] Versión archivada en historial');

      // 🆕 CLOUD SYNC: Sincronizar historial y borradores con Firestore
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => ({
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            tablaACD: {
              ...(prev?.artifacts?.tablaACD || {}),
              history: [...(prev?.artifacts?.tablaACD?.history || []), newHistoryEntry],
              attempts: evaluationAttempts + 1,
              lastScore: result.nivel_global * 2.5,
              lastNivel: result.nivel_global,
              lastEvaluatedAt: Date.now(),
              drafts: { marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas },
              // 🆕 Limpiar flags de reset cuando el estudiante trabaja
              resetBy: null,
              resetAt: null
            }
          }
        }));
        logger.log('☁️ [TablaACD] Historial sincronizado con Firestore');
      }

      // 🧹 Limpiar borradores tras evaluación exitosa (scoped + legacy)
      if (currentTextoId) {
        import('../../services/sessionManager').then(({ getDraftKey, updateCurrentSession, captureArtifactsDrafts }) => {
          const getKey = (base) => getDraftKey(base, currentTextoId, sourceCourseId);

          // scoped
          sessionStorage.removeItem(getKey('tablaACD_marcoIdeologico'));
          sessionStorage.removeItem(getKey('tablaACD_estrategiasRetoricas'));
          sessionStorage.removeItem(getKey('tablaACD_vocesPresentes'));
          sessionStorage.removeItem(getKey('tablaACD_vocesSilenciadas'));

          // legacy
          sessionStorage.removeItem('tablaACD_marcoIdeologico');
          sessionStorage.removeItem('tablaACD_estrategiasRetoricas');
          sessionStorage.removeItem('tablaACD_vocesPresentes');
          sessionStorage.removeItem('tablaACD_vocesSilenciadas');

          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId, sourceCourseId) });
        }).catch(() => {});
      }

      // 🎮 REGISTRAR RECOMPENSAS
      if (rewards) {
        // Puntos base por evaluación
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'TablaACD',
          rubricId: 'rubrica2',
          resourceId: rewardsResourceId
        });

        // Puntos según nivel
        const nivelEvent = `EVALUATION_LEVEL_${result.nivel_global}`;
        rewards.recordEvent(nivelEvent, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'TablaACD',
          resourceId: rewardsResourceId
        });

        // Puntos especiales por completar Tabla ACD
        rewards.recordEvent('TABLA_ACD_COMPLETED', {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          resourceId: rewardsResourceId
        });

        // Puntos por identificar marco ideológico
        if (marcoIdeologico && marcoIdeologico.trim().length > 50) {
          rewards.recordEvent('ACD_FRAME_IDENTIFIED', {
            frame: marcoIdeologico.substring(0, 100),
            resourceId: `${rewardsResourceId}:acd_frame`
          });
        }

        // Puntos por identificar estrategias retóricas
        if (estrategiasRetoricas && estrategiasRetoricas.trim().length > 50) {
          rewards.recordEvent('ACD_STRATEGY_IDENTIFIED', {
            strategies: estrategiasRetoricas.substring(0, 100),
            resourceId: `${rewardsResourceId}:acd_strategy`
          });
        }

        // Puntos por análisis de poder (voces silenciadas)
        if (vocesSilenciadas && vocesSilenciadas.trim().length > 50) {
          rewards.recordEvent('ACD_POWER_ANALYSIS', {
            analysis: vocesSilenciadas.substring(0, 100),
            resourceId: `${rewardsResourceId}:acd_power`
          });
        }

        // Achievement: Score perfecto
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'TablaACD',
            resourceId: rewardsResourceId
          });
        }

        logger.log('🎮 [TablaACD] Recompensas registradas');
      }

    } catch (error) {
      logger.error('Error evaluando Tabla ACD:', error);
      setError(error.message || 'Error al evaluar el análisis');
    } finally {
      stepTimeouts.forEach(t => clearTimeout(t));
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValid, texto, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, setError, evaluationAttempts, rateLimit, currentTextoId, rewards, rewardsResourceId, updateRubricScore, lectureId, updateActivitiesProgress, history, persistence]);

  // Verificar si hay texto
  if (!texto) {
    return (
      <Container>
        <Header>
          <Title>🔍 Tabla de Análisis Crítico del Discurso</Title>
          <Subtitle>Carga un texto para comenzar</Subtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>🔍 Tabla de Análisis Crítico del Discurso (ACD)</Title>
        <Subtitle>
          Identifica marcos ideológicos, estrategias retóricas y voces presentes/silenciadas en el texto.
          Recibirás evaluación criterial basada en la Rúbrica 2 de Literacidad Crítica.
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
                  ? 'Guarda citas y anotaciones desde "Lectura Guiada"'
                  : 'Selecciona el campo y haz clic en "Insertar"'}
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
                    <li>Regresa aquí para insertar en tu tabla</li>
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
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'marco', tipo)} theme={theme}>
                                Marco
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'estrategias', tipo)} theme={theme}>
                                Estrategias
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'presentes', tipo)} theme={theme}>
                                Presentes
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'silenciadas', tipo)} theme={theme}>
                                Silenciadas
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

      {/* Guía pedagógica */}
      {/* ... (guía stays same) ... */}

      {/* 🆕 Ribbon de Historial - SIEMPRE visible */}
        <HistoryRibbon
          history={history}
          viewingVersion={viewingVersion}
          onViewVersion={handleViewVersion}
          theme={theme}
          scoreFormat="nivel"
        />

      {/* 🆕 Banner de Restauración */}
      {viewingVersion && (
        <RestoreBanner
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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

      {/* 🔒 Mensaje cuando está bloqueado después de evaluar */}
      {isLocked && !viewingVersion && !isSubmitted && (
        <LockedMessage theme={theme}>
          <LockIcon>🔒</LockIcon>
          <LockText>
            <strong>Análisis enviado a evaluación</strong>
            <span>Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".</span>
          </LockText>
          <UnlockButton onClick={handleSeguirEditando} theme={theme}>
            ✏️ Seguir Editando
          </UnlockButton>
        </LockedMessage>
      )}

      {/* Formulario */}
      {!viewingVersion && (
        <>
          {/* 🆕 Mensaje de auto-guardado */}
          {(marcoIdeologico || estrategiasRetoricas || vocesPresentes || vocesSilenciadas) && (
            <AutoSaveMessage theme={theme}>
              💾 Tu trabajo se guarda automáticamente. No perderás nada al cambiar de pestaña.
            </AutoSaveMessage>
          )}

          {/* 🆕 Hint de guardado manual */}
          <AnimatePresence>
            {showSaveHint && (
              <ShortcutsHint
                as={motion.div}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                theme={theme}
              >
                ✅ Guardado manual exitoso
              </ShortcutsHint>
            )}
          </AnimatePresence>

          {/* 🆕 Barra de atajos de teclado */}
          <KeyboardShortcutsBar
            theme={theme}
            shortcuts={[
              { keys: ['Ctrl', 'S'], label: 'Guardar' },
              { keys: ['Ctrl', 'Enter'], label: 'Evaluar' },
              { keys: ['Esc'], label: 'Cerrar' }
            ]}
          />

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>1️⃣ Marco Ideológico</SectionTitle>
            <Label theme={theme}>¿Qué marco ideológico identifica en el texto?</Label>
            <Textarea
              ref={marcoRef}
              theme={theme}
              value={displayedContent.marco}
              onChange={(e) => !viewingVersion && !isSubmitted && setMarcoIdeologico(e.target.value)}
              onClick={(e) => handleCursorChange('marco', e)}
              onKeyUp={(e) => handleCursorChange('marco', e)}
              onPaste={handlePaste}
              placeholder="Ej: El texto opera desde un marco neoliberal que naturaliza la competencia individual..."
              disabled={loading || isReadOnly}
            />
            {pasteError && <PasteErrorMessage theme={theme}>{pasteError}</PasteErrorMessage>}
            <HintText theme={theme}>
              Ejemplos: neoliberal, feminista, conservador, socialista, postcolonial, ambientalista...
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>2️⃣ Estrategias Retóricas</SectionTitle>
            <Label theme={theme}>¿Qué estrategias retóricas usa el autor y para qué?</Label>
            <Textarea
              ref={estrategiasRef}
              theme={theme}
              value={displayedContent.estrategias}
              onChange={(e) => !viewingVersion && !isSubmitted && setEstrategiasRetoricas(e.target.value)}
              onClick={(e) => handleCursorChange('estrategias', e)}
              onKeyUp={(e) => handleCursorChange('estrategias', e)}
              onPaste={handlePaste}
              placeholder='Ej: Uso de metáforas biológicas ("supervivencia del más apto") para justificar desigualdades...'
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Ejemplos: metáforas, eufemismos, nominalización, voz pasiva, presuposiciones, apelación a autoridad, falsa dicotomía...
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>3️⃣ Voces en el Discurso</SectionTitle>
            <Label theme={theme}>Voces presentes (legitimadas):</Label>
            <Textarea
              ref={presentesRef}
              theme={theme}
              value={displayedContent.presentes}
              onChange={(e) => !viewingVersion && !isSubmitted && setVocesPresentes(e.target.value)}
              onClick={(e) => handleCursorChange('presentes', e)}
              onKeyUp={(e) => handleCursorChange('presentes', e)}
              onPaste={handlePaste}
              placeholder="Ej: Expertos económicos, organismos internacionales, empresarios exitosos..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '100px' }}
            />
            <HintText theme={theme} style={{ marginBottom: '1rem' }}>
              ¿Quiénes tienen autoridad en este texto?
            </HintText>

            <Label theme={theme}>Voces silenciadas (ausentes):</Label>
            <Textarea
              ref={silenciadasRef}
              theme={theme}
              value={displayedContent.silenciadas}
              onChange={(e) => !viewingVersion && !isSubmitted && setVocesSilenciadas(e.target.value)}
              onClick={(e) => handleCursorChange('silenciadas', e)}
              onKeyUp={(e) => handleCursorChange('silenciadas', e)}
              onPaste={handlePaste}
              placeholder="Ej: Trabajadores informales, sindicatos, comunidades afectadas, perspectivas ecológicas..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '100px' }}
            />
            <HintText theme={theme}>
              ¿Quiénes NO tienen voz en este discurso?
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
              {loading ? '⏳ Analizando...' :
                viewingVersion ? '👁️ Modo Lectura' :
                  evaluationAttempts >= MAX_ATTEMPTS ? '🚫 Intentos Agotados' :
                    !rateLimit.canProceed && rateLimit.nextAvailableIn > 0 ? `⏱️ Espera ${rateLimit.nextAvailableIn}s` :
                      `🔍 Solicitar Evaluación (${MAX_ATTEMPTS - evaluationAttempts} restantes)`}
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

      {/* 🆕 Barra de progreso durante evaluación */}
      <AnimatePresence>
        {loading && (
          <EvaluationProgressBar
            isEvaluating={loading}
            estimatedSeconds={35}
            currentStep={currentEvaluationStep}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Loading antiguo (mantener como fallback) */}
      {loading && false && (
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
                  📊 Evaluación Criterial {viewingVersion ? `(Histórico: Intento ${viewingVersion.attemptNumber})` : ''}
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
              {/* Marco Ideológico */}
              {displayedFeedback.criterios.marco_ideologico && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Marco Ideológico</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.marco_ideologico.nivel}>
                    Nivel {displayedFeedback.criterios.marco_ideologico.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.marco_ideologico.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.marco_ideologico.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.marco_ideologico.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.marco_ideologico.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Estrategias Retóricas */}
              {displayedFeedback.criterios.estrategias_retoricas && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Estrategias Retóricas</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.estrategias_retoricas.nivel}>
                    Nivel {displayedFeedback.criterios.estrategias_retoricas.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.estrategias_retoricas.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.estrategias_retoricas.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.estrategias_retoricas.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.estrategias_retoricas.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Voces y Silencios */}
              {displayedFeedback.criterios.voces_silencios && (
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Voces y Silencios</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.voces_silencios.nivel}>
                    Nivel {displayedFeedback.criterios.voces_silencios.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.voces_silencios.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.voces_silencios.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.voces_silencios.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.voces_silencios.mejoras.map((m, idx) => (
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
