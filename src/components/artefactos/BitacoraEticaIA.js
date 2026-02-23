/**
 * Componente Bitácora Ética del Uso de IA
 * RÚBRICA 5: Metacognición Ética del Uso de IA
 * 
 * Tres dimensiones evaluadas:
 * 1. Registro y Transparencia: ¿Documenta el uso de IA?
 * 2. Evaluación Crítica: ¿Contrasta la información con otras fuentes?
 * 3. Agencia y Responsabilidad: ¿Asume autoría y uso ético?
 */

import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { usePedagogy, useRewards } from '../../context/PedagogyContext';
import { evaluateBitacoraEticaIA } from '../../services/bitacoraEticaIA.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useArtifactEvaluationPolicy from '../../hooks/useArtifactEvaluationPolicy';
import useTeacherArtifactReset from '../../hooks/useTeacherArtifactReset';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { renderMarkdown } from '../../utils/markdownUtils';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import TeacherScoreOverrideBanner from './TeacherScoreOverrideBanner';
import ConfirmModal from '../common/ConfirmModal';
import KeyboardShortcutsBar from '../ui/KeyboardShortcutsBar';
import HistoryRibbon from '../ui/HistoryRibbon';
import logger from '../../utils/logger';
import {
  AutoSaveMessage,
  Container,
  CriterioCard,
  CriterioHeader,
  CriterioNivel,
  CriterioTitle,
  CriteriosGrid,
  FeedbackHeader,
  Header,
  HeaderDescription,
  HeaderTitle,
  List,
  ListItem,
  ListSection,
  ListTitle,
  LockIcon,
  LockText,
  LockedMessage,
  RestoreBanner,
  RestoreButton,
  SectionTitle,
  SubmissionBanner,
  SubmitButton,
  UnlockButton
} from './shared';

// ... (component definition) ...

const DeclarationsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

export default function BitacoraEticaIA({ theme }) {
  const { modoOscuro, completeAnalysis, setError, updateRubricScore, updateActivitiesProgress, sourceCourseId, currentTextoId, globalTutorInteractions, clearGlobalTutorLog, activitiesProgress } = useContext(AppContext);
  const { progression: _progression } = usePedagogy();
  const rewards = useRewards(); // 🎮 Hook de recompensas

  // 🆕 Ref para rastrear todos los setTimeout y evitar memory leaks
  const timersRef = useRef([]);

  // 🤖 Consumir interacciones del tutor desde el contexto global (con fallback local)
  const [localTutorInteractions, setLocalTutorInteractions] = useState([]);
  const tutorInteractions = (globalTutorInteractions && globalTutorInteractions.length > 0)
    ? globalTutorInteractions
    : localTutorInteractions;

  // 🆕 Cleanup de todos los timers al desmontar
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Datos de diagnóstico disponibles si se necesitan
  // textoId: currentTextoId, interacciones: globalTutorInteractions?.length

  // Estado local para reflexiones
  const [verificacionFuentes, setVerificacionFuentes] = useState('');
  const [procesoUsoIA, setProcesoUsoIA] = useState('');
  const [reflexionEtica, setReflexionEtica] = useState('');
  const [declaraciones, setDeclaraciones] = useState({
    respuestasPropias: false,
    verificacionRealizada: false,
    usoTransparente: false,
    contrasteMultifuente: false
  });

  // Estados para evaluación criterial
  const [feedbackCriterial, setFeedbackCriterial] = useState(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación

  // 🆕 Estados para Límites e Historial
  const [evaluationAttempts, setEvaluationAttempts] = useState(0); // Intentos de evaluación (Max 3)
  const [history, setHistory] = useState([]); // Historial de versiones
  const [viewingVersion, setViewingVersion] = useState(null); // Versión visualizada
  const [isSubmitted, setIsSubmitted] = useState(false); // 🆕 Estado de entrega final
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // 🆕 Modal de confirmación de entrega
  const [showClearLogConfirm, setShowClearLogConfirm] = useState(false); // 🆕 Modal de confirmación de borrar historial
  const [teacherScoreOverride, setTeacherScoreOverride] = useState(null); // 🆕 Override docente
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  const {
    rateLimit,
    maxAttempts: MAX_ATTEMPTS
  } = useArtifactEvaluationPolicy({
    rateLimitKey: 'bitacora_eval',
    cooldownMs: 5000,
    maxPerHour: 10,
    maxAttempts: 3
  });

  // NOTA: tutorInteractions ahora se consume desde AppContext (globalTutorInteractions)

  // Persistencia robusta
  const legacyDocumentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || legacyDocumentId || 'global';
  const rewardsResourceId = lectureId ? `${lectureId}:BitacoraEticaIA` : null;
  const persistenceKey = `bitacora_etica_ia_${lectureId}`;
  const legacyPersistenceIds = legacyDocumentId && legacyDocumentId !== lectureId
    ? [`bitacora_etica_ia_${legacyDocumentId}`]
    : [];

  // Claves en localStorage aisladas por lectura + curso
  const courseScope = sourceCourseId ? `${sourceCourseId}::` : '';
  const tutorLogStorageKey = `tutorInteractionsLog:${courseScope}${lectureId}`;
  const reflectionsStorageKey = `ethicalReflections:${courseScope}${lectureId}`;

  // 🆕 Keyboard shortcuts para productividad
  const [_showSaveHint, setShowSaveHint] = useState(false);
  const handleEvaluateCriterialRef = useRef(null);
  const handleEvaluarBitacora = useCallback(() => {
    if (handleEvaluateCriterialRef.current) {
      handleEvaluateCriterialRef.current();
    }
  }, []);

  useKeyboardShortcuts({
    'ctrl+s': (_e) => {
      logger.log('⌨️ Ctrl+S: Guardando borrador BitacoraEticaIA...');
      // Guardar reflexiones manualmente
      const reflections = {
        verificacionFuentes,
        procesoUsoIA,
        reflexionEtica,
        declaraciones
      };
      localStorage.setItem(reflectionsStorageKey, JSON.stringify(reflections));
      setShowSaveHint(true);
      timersRef.current.push(setTimeout(() => setShowSaveHint(false), 2000));
    },
    'ctrl+enter': (_e) => {
      logger.log('⌨️ Ctrl+Enter: Evaluando Bitácora Ética IA...');
      if (!loadingEvaluation && rateLimit.canProceed && evaluationAttempts < MAX_ATTEMPTS && !isSubmitted && !viewingVersion) {
        handleEvaluarBitacora();
      }
    },
    'escape': (_e) => {
      logger.log('⌨️ Esc: Cerrando paneles...');
      if (viewingVersion) {
        setViewingVersion(null);
      }
    }
  }, {
    enabled: true,
    excludeInputs: false
  });

  // Verificación de localStorage (solo en desarrollo si es necesario)
  // Los logs de debug fueron removidos para mejorar rendimiento

  // 🧩 Fallback: si el contexto está vacío, cargar desde localStorage por lectura
  React.useEffect(() => {
    if (globalTutorInteractions && globalTutorInteractions.length > 0) return;
    try {
      const stored = JSON.parse(localStorage.getItem(tutorLogStorageKey) || '[]');
      setLocalTutorInteractions(Array.isArray(stored) ? stored : []);
    } catch {
      setLocalTutorInteractions([]);
    }
  }, [tutorLogStorageKey, globalTutorInteractions]);

  // 🆕 Variables para visualizar contenido (Actual o Histórico)
  const displayedContent = React.useMemo(() => {
    if (viewingVersion) {
      return {
        verificacionFuentes: viewingVersion.content.verificacionFuentes || '',
        procesoUsoIA: viewingVersion.content.procesoUsoIA || '',
        reflexionEtica: viewingVersion.content.reflexionEtica || '',
        declaraciones: viewingVersion.content.declaraciones || declaraciones,
        interactions: viewingVersion.content.tutorInteractions || [],
        feedback: viewingVersion.feedback || null
      };
    }
    return {
      verificacionFuentes,
      procesoUsoIA,
      reflexionEtica,
      declaraciones,
      interactions: tutorInteractions,
      feedback: feedbackCriterial
    };
  }, [viewingVersion, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, tutorInteractions, feedbackCriterial]);

  // Feedback se muestra via displayedContent.feedback en el JSX
  const _displayedFeedback = React.useMemo(() => {
    if (viewingVersion) return viewingVersion.feedback;
    return feedbackCriterial;
  }, [viewingVersion, feedbackCriterial]);

  const isReadOnly = !!viewingVersion || isSubmitted;

  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    logger.log('✏️ [BitacoraEticaIA] Desbloqueando para editar...');
    setIsLocked(false);
    setFeedbackCriterial(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);

  // 🆕 Manejadores de Historial
  const handleViewVersion = useCallback((entry) => {
    if (!entry) {
      setViewingVersion(null);
      return;
    }
    setViewingVersion(entry);
  }, []);

  const handleRestoreVersion = useCallback(() => {
    if (!viewingVersion || isSubmitted) return;

    setVerificacionFuentes(viewingVersion.content.verificacionFuentes || '');
    setProcesoUsoIA(viewingVersion.content.procesoUsoIA || '');
    setReflexionEtica(viewingVersion.content.reflexionEtica || '');
    if (viewingVersion.content.declaraciones) {
      setDeclaraciones(viewingVersion.content.declaraciones);
    }
    // Nota: No restauramos tutorInteractions porque esas son acumulativas/externas, 
    // pero guardamos el snapshot histórico para referencia.

    setFeedbackCriterial(viewingVersion.feedback);
    setViewingVersion(null);
  }, [viewingVersion, isSubmitted]);

  const applyTeacherReset = useCallback(() => {
    setIsSubmitted(false);
    setIsLocked(false);
    setHistory([]);
    setEvaluationAttempts(0);
    setFeedbackCriterial(null);
    setVerificacionFuentes('');
    setProcesoUsoIA('');
    setReflexionEtica('');
    setDeclaraciones({
      respuestasPropias: false,
      verificacionRealizada: false,
      usoTransparente: false,
      contrasteMultifuente: false
    });
    setViewingVersion(null);
    setTeacherScoreOverride(null);
  }, []);

  // Cargar reflexiones guardadas (interacciones del tutor ahora se manejan en AppContext)

  useEffect(() => {
    // Cargar reflexiones guardadas
    let savedReflections = {};
    try {
      savedReflections = JSON.parse(localStorage.getItem(reflectionsStorageKey) || '{}');
      if (!savedReflections || typeof savedReflections !== 'object') savedReflections = {};
    } catch {
      savedReflections = {};
    }

    // Fallback legacy solo en modo sin curso (evitar contaminar cursos)
    if (Object.keys(savedReflections).length === 0 && !sourceCourseId) {
      try {
        const legacyByLecture = JSON.parse(localStorage.getItem(`ethicalReflections:${lectureId}`) || '{}');
        if (legacyByLecture && typeof legacyByLecture === 'object') savedReflections = legacyByLecture;
      } catch {
        // ignore
      }
    }

    // Fallback final SOLO para bitácora global legacy
    if (Object.keys(savedReflections).length === 0 && !sourceCourseId && lectureId === 'global') {
      try {
        const legacy = JSON.parse(localStorage.getItem('ethicalReflections') || '{}');
        if (legacy && typeof legacy === 'object') savedReflections = legacy;
      } catch {
        // ignore
      }
    }

    if (savedReflections.verificacionFuentes) setVerificacionFuentes(savedReflections.verificacionFuentes);
    if (savedReflections.procesoUsoIA) setProcesoUsoIA(savedReflections.procesoUsoIA);
    if (savedReflections.reflexionEtica) setReflexionEtica(savedReflections.reflexionEtica);
    if (savedReflections.declaraciones) setDeclaraciones(savedReflections.declaraciones);

    // NOTA: El listener de 'tutor-interaction-logged' ahora está en AppContext
    // para capturar interacciones incluso cuando esta pestaña no está activa
  }, [reflectionsStorageKey, lectureId, sourceCourseId]);

  // ✅ Capturamos el retorno del hook para usar saveManual
  const persistence = useActivityPersistence(persistenceKey, {
    enabled: true,
    courseId: sourceCourseId, // 🆕 Aislar datos por curso
    legacyDocumentIds: legacyPersistenceIds,
    studentAnswers: {
      verificacionFuentes,
      procesoUsoIA,
      reflexionEtica,
      declaraciones
    },
    aiFeedbacks: { bitacora: feedbackCriterial },
    attempts: evaluationAttempts,
    history,
    submitted: isSubmitted,
    onRehydrate: (data, meta) => {
      if (meta?.isEmpty) {
        setVerificacionFuentes('');
        setProcesoUsoIA('');
        setReflexionEtica('');
        setDeclaraciones({
          respuestasPropias: false,
          verificacionRealizada: false,
          usoTransparente: false,
          contrasteMultifuente: false
        });
        setFeedbackCriterial(null);
        setEvaluationAttempts(0);
        setHistory([]);
        setIsSubmitted(false);
        setIsLocked(false);
        setViewingVersion(null);
        setTeacherScoreOverride(null);
        return;
      }

      const answers = data?.student_answers || {};
      setVerificacionFuentes(answers.verificacionFuentes || '');
      setProcesoUsoIA(answers.procesoUsoIA || '');
      setReflexionEtica(answers.reflexionEtica || '');
      setDeclaraciones(answers.declaraciones || {
        respuestasPropias: false,
        verificacionRealizada: false,
        usoTransparente: false,
        contrasteMultifuente: false
      });
      setFeedbackCriterial(data?.ai_feedbacks?.bitacora || null);

      // Rehidratación de historial
      if (typeof data?.attempts === 'number') {
        setEvaluationAttempts(data.attempts);
      } else {
        setEvaluationAttempts(0);
      }
      setHistory(Array.isArray(data?.history) ? data.history : []);
      const submitted = Boolean(data?.submitted);
      setIsSubmitted(submitted);
      setIsLocked(submitted);
    }
  });

  const maybeApplyTeacherReset = useTeacherArtifactReset({
    artifactLabel: 'BitacoraEticaIA',
    lectureId,
    sourceCourseId,
    persistence,
    draftKeyBases: [
      'bitacoraEticaIA_verificacionFuentes',
      'bitacoraEticaIA_procesoUsoIA',
      'bitacoraEticaIA_reflexionEtica'
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

    const cloudData = findCloudArtifact('bitacoraEticaIA');
    
    if (maybeApplyTeacherReset(cloudData)) {
      return;
    }
    
    if (!cloudData) return;

    if (cloudData.history && Array.isArray(cloudData.history)) {
      logger.log('☁️ [BitacoraEticaIA] Cargando historial desde Firestore:', cloudData.history.length, 'versiones');
      setHistory(prev => prev.length >= cloudData.history.length ? prev : cloudData.history);
    }

    if (cloudData.attempts) setEvaluationAttempts(prev => Math.max(prev, cloudData.attempts));
    if (cloudData.submitted) setIsSubmitted(true);

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
      if (cloudData.drafts.verificacionFuentes && !verificacionFuentes) {
        setVerificacionFuentes(cloudData.drafts.verificacionFuentes);
      }
      if (cloudData.drafts.procesoUsoIA && !procesoUsoIA) {
        setProcesoUsoIA(cloudData.drafts.procesoUsoIA);
      }
      if (cloudData.drafts.reflexionEtica && !reflexionEtica) {
        setReflexionEtica(cloudData.drafts.reflexionEtica);
      }
      logger.log('☁️ [BitacoraEticaIA] Borradores restaurados desde Firestore');
    }
  }, [lectureId, activitiesProgress, verificacionFuentes, procesoUsoIA, reflexionEtica, maybeApplyTeacherReset]);

  // 🆕 Handle submission confirmada
  const handleConfirmedSubmit = useCallback(() => {
    setShowSubmitConfirm(false);
    setIsSubmitted(true);

    // ✅ Forzar guardado inmediato con saveManual
    timersRef.current.push(setTimeout(() => persistence.saveManual(), 100));

    // 🆕 SYNC: Registrar entrega en contexto global para Dashboard (preservando historial)
    if (lectureId && updateActivitiesProgress) {
      updateActivitiesProgress(lectureId, prev => {
        // Obtener el score previo guardado (lastScore) o calcular desde feedback
        const previousArtifact = prev?.artifacts?.bitacoraEticaIA || {};
        const scoreToUse = previousArtifact.lastScore || (feedbackCriterial.nivel_global ? feedbackCriterial.nivel_global * 2.5 : 0);
        
        logger.log('📤 [BitacoraEticaIA] Entregando con score:', scoreToUse, 'lastScore:', previousArtifact.lastScore, 'feedback.nivel_global:', feedbackCriterial.nivel_global);
        
        return {
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            bitacoraEticaIA: {
              ...previousArtifact,
              submitted: true,
              submittedAt: Date.now(),
              score: scoreToUse,
              nivel: feedbackCriterial.nivel_global || previousArtifact.lastNivel || 0,
              history: history,
              attempts: evaluationAttempts,
              finalContent: { verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones }
            }
          }
        };
      });
    }

    const event = new CustomEvent('evaluation-complete', {
      detail: {
        artefacto: 'BitacoraEticaIA',
        score: feedbackCriterial.nivel_global * 2.5,
        submitted: true
      }
    });
    window.dispatchEvent(event);

    logger.log('✅ [BitacoraEticaIA] Tarea entregada y sincronizada con Dashboard');
  }, [feedbackCriterial, persistence, lectureId, updateActivitiesProgress, history, evaluationAttempts, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones]);

  const handleSubmit = useCallback(() => {
    if (!feedbackCriterial) return;
    setShowSubmitConfirm(true);
  }, [feedbackCriterial]);

  // Guardar reflexiones en localStorage legacy (compatibilidad)
  useEffect(() => {
    const reflections = {
      verificacionFuentes,
      procesoUsoIA,
      reflexionEtica,
      declaraciones
    };
    // Scoped por lectura (evita mezclar lecturas)
    localStorage.setItem(reflectionsStorageKey, JSON.stringify(reflections));
    // Legacy global: mantener compatibilidad SOLO para la bitácora global
    if (lectureId === 'global') {
      localStorage.setItem('ethicalReflections', JSON.stringify(reflections));
    }
  }, [verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, reflectionsStorageKey]);

  const handleCheckboxChange = (key) => {
    setDeclaraciones(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Usar función del contexto global para limpiar log del tutor
  const handleConfirmedClearLog = useCallback(() => {
    setShowClearLogConfirm(false);
    clearGlobalTutorLog();
    // Compatibilidad legacy (solo modo sin curso)
    localStorage.removeItem(tutorLogStorageKey);
    if (!sourceCourseId && lectureId === 'global') {
      localStorage.removeItem('tutorInteractionsLog');
    }
  }, [clearGlobalTutorLog, tutorLogStorageKey, sourceCourseId, lectureId]);

  const clearTutorLog = useCallback(() => {
    setShowClearLogConfirm(true);
  }, []);

  const exportBitacora = useCallback(async () => {
    try {
      const { exportGenericPDF } = await import('../../utils/exportUtils');
      const sections = [];
      if (tutorInteractions.length > 0) {
        sections.push({
          heading: 'Interacciones con el Tutor IA',
          list: tutorInteractions.map((interaction) => {
            if (typeof interaction === 'string') return `Estudiante: ${interaction}`;

            const question = String(
              interaction?.question ??
              interaction?.content ??
              ''
            ).trim();
            const context = String(interaction?.context || '').trim();
            const mode = String(interaction?.tutorMode || interaction?.mode || '').trim();

            const contextPart = context ? ` (Contexto: ${context})` : '';
            const modePart = mode ? ` [Modo: ${mode}]` : '';

            return `Estudiante: ${question || '(sin pregunta)'}${contextPart}${modePart}`;
          })
        });
      }
      sections.push({ heading: 'Reflexiones' });
      if (verificacionFuentes) sections.push({ heading: 'Verificación de Fuentes', text: verificacionFuentes });
      if (procesoUsoIA) sections.push({ heading: 'Proceso de Uso de IA', text: procesoUsoIA });
      if (reflexionEtica) sections.push({ heading: 'Reflexión Ética', text: reflexionEtica });
      const declResumen = Object.entries(declaraciones).filter(([, v]) => v).map(([k]) => k);
      if (declResumen.length > 0) sections.push({ heading: 'Declaraciones', list: declResumen });
      if (feedbackCriterial) {
        const evalKV = {};
        if (feedbackCriterial.criterios) {
          Object.entries(feedbackCriterial.criterios).forEach(([k, v]) => {
            evalKV[k] = v.nivel ? `${v.nivel}/10` : JSON.stringify(v);
          });
        }
        sections.push({ heading: 'Evaluación Criterial IA', keyValues: evalKV });
      }
      await exportGenericPDF({
        title: 'Bitácora Ética de IA',
        sections,
        fileName: `bitacora-etica-ia-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    } catch (error) {
      logger.error('Error exportando bitácora como PDF:', error);
    }
  }, [tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, feedbackCriterial]);

  // Evaluación de la Rúbrica 5
  // Evaluación de la Rúbrica 5 (Reactiva al contenido visualizado)
  const evaluacion = useMemo(() => {
    const { verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones } = displayedContent;
    let scoreRegistro = 0;
    let scoreEvaluacionCritica = 0;
    let scoreAgencia = 0;

    // Dimensión 1: Registro y Transparencia (0-10)
    if (tutorInteractions.length > 0) scoreRegistro += 3;
    if (tutorInteractions.length >= 5) scoreRegistro += 2;
    if (procesoUsoIA.length > 100) scoreRegistro += 3;
    if (procesoUsoIA.length > 300) scoreRegistro += 2;

    // Dimensión 2: Evaluación Crítica (0-10)
    if (verificacionFuentes.length > 100) scoreEvaluacionCritica += 3;
    if (verificacionFuentes.length > 300) scoreEvaluacionCritica += 2;
    if (declaraciones.contrasteMultifuente) scoreEvaluacionCritica += 3;
    if (verificacionFuentes.includes('fuente') || verificacionFuentes.includes('verificar')) scoreEvaluacionCritica += 2;

    // Dimensión 3: Agencia y Responsabilidad (0-10)
    const declaracionesCompletadas = Object.values(declaraciones).filter(Boolean).length;
    scoreAgencia = declaracionesCompletadas * 2.5;
    if (reflexionEtica.length > 100) scoreAgencia = Math.min(10, scoreAgencia + 2);

    return {
      dimensiones: {
        registro: Math.min(10, scoreRegistro),
        evaluacionCritica: Math.min(10, scoreEvaluacionCritica),
        agencia: Math.min(10, scoreAgencia)
      },
      promedio: ((Math.min(10, scoreRegistro) + Math.min(10, scoreEvaluacionCritica) + Math.min(10, scoreAgencia)) / 3).toFixed(1)
    };
  }, [displayedContent, tutorInteractions]);

  // Validación para evaluación criterial
  const isValidForEvaluation = (
    verificacionFuentes.length >= 50 &&
    procesoUsoIA.length >= 50 &&
    reflexionEtica.length >= 50 &&
    Object.values(declaraciones).filter(Boolean).length >= 2
  );

  // Evaluación criterial dual
  const handleEvaluateCriterial = useCallback(async () => {
    if (!isValidForEvaluation) return;

    // 🆕 Verificaciones de Límite y Rate Limit
    if (evaluationAttempts >= MAX_ATTEMPTS) {
      setError('Has alcanzado el número máximo de intentos para esta actividad.');
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

    setLoadingEvaluation(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando evaluación ética...', icon: '🔍', duration: 2 });

    // 🆕 Programar pasos de evaluación
    let stepTimeouts = [];
    stepTimeouts = [
      setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando transparencia...', icon: '📝', duration: 5 }), 1000),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 3500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), 15500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 4 }), 27500)
    ];
    stepTimeouts.forEach(id => timersRef.current.push(id));

    try {
      const result = await evaluateBitacoraEticaIA({
        tutorInteractions,
        verificacionFuentes,
        procesoUsoIA,
        reflexionEtica,
        declaraciones
      });

      setFeedbackCriterial(result);
      setIsLocked(true); // 🔒 Bloquear formulario después de evaluar
      setEvaluationAttempts(prev => prev + 1); // Incrementar solo tras éxito

      // 🆕 Archivar en Historial
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        content: {
          verificacionFuentes,
          procesoUsoIA,
          reflexionEtica,
          declaraciones,
          tutorInteractions: [...tutorInteractions] // Copia del log actual
        },
        feedback: result,
        score: result.nivel_global * 2.5,
        attemptNumber: evaluationAttempts + 1
      };

      setHistory(prev => [...prev, newHistoryEntry]);

      // 🆕 CLOUD SYNC: Sincronizar historial con Firestore
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => ({
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            bitacoraEticaIA: {
              ...(prev?.artifacts?.bitacoraEticaIA || {}),
              history: [...(prev?.artifacts?.bitacoraEticaIA?.history || []), newHistoryEntry],
              attempts: evaluationAttempts + 1,
              lastScore: result.nivel_global * 2.5,
              lastNivel: result.nivel_global,
              lastEvaluatedAt: Date.now(),
              drafts: { verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones },
              // 🆕 Limpiar flags de reset cuando el estudiante trabaja
              resetBy: null,
              resetAt: null
            }
          }
        }));
        logger.log('☁️ [BitacoraEticaIA] Historial sincronizado con Firestore');
      }

      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica5', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'BitacoraEticaIA',
        criterios: result.criterios,
        textoId: lectureId && lectureId !== 'global' ? lectureId : null
      });

      // 🏆 Registrar recompensas
      if (rewards) {
        rewards.recordEvent('ARTIFACT_SUBMITTED', {
          artefacto: 'BitacoraEticaIA',
          rubricId: 'rubrica5',
          score: result.nivel_global * 2.5,
          resourceId: rewardsResourceId
        });

        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'BitacoraEticaIA',
          rubricId: 'rubrica5',
          resourceId: rewardsResourceId
        });

        rewards.recordEvent(`EVALUATION_LEVEL_${result.nivel_global}`, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'BitacoraEticaIA',
          resourceId: rewardsResourceId
        });

        // Reflexión metacognitiva (este artefacto es metacognición ética)
        if (reflexionEtica.length > 80) {
          rewards.recordEvent('METACOGNITIVE_REFLECTION', {
            length: reflexionEtica.length,
            artefacto: 'BitacoraEticaIA',
            resourceId: rewardsResourceId
          });
        }

        // 🏆 Puntuación perfecta
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'BitacoraEticaIA',
            resourceId: rewardsResourceId
          });
        }

        logger.log('🎮 [BitacoraEticaIA] Recompensas registradas');
      }

      // Despachar evento de completitud solo si es el primer exito o mejora
      const event = new CustomEvent('evaluation-complete', {
        detail: {
          artefacto: 'BitacoraEticaIA',
          score: result.nivel_global * 2.5
        }
      });
      window.dispatchEvent(event);

    } catch (error) {
      logger.error('Error evaluando Bitácora Ética de IA:', error);
      setError(error.message || 'Error al evaluar la bitácora');
    } finally {
      // Limpiar step timeouts en cualquier caso (éxito o error)
      stepTimeouts.forEach(clearTimeout);
      setLoadingEvaluation(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValidForEvaluation, evaluationAttempts, MAX_ATTEMPTS, rateLimit, tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, setError, updateRubricScore, lectureId, updateActivitiesProgress, persistence, rewards, rewardsResourceId]);

  useEffect(() => {
    handleEvaluateCriterialRef.current = handleEvaluateCriterial;
  }, [handleEvaluateCriterial]);

  // Usar theme del prop o crear uno basado en modoOscuro si no viene
  const effectiveTheme = theme || {
    background: modoOscuro ? '#1a1a1a' : '#f8f9fa',
    cardBg: modoOscuro ? '#2a2a2a' : '#ffffff',
    surface: modoOscuro ? '#333' : '#f5f5f5',
    border: modoOscuro ? '#444' : '#e0e0e0',
    textPrimary: modoOscuro ? '#fff' : '#333',
    textSecondary: modoOscuro ? '#aaa' : '#666',
    textMuted: modoOscuro ? '#888' : '#999',
    primary: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    purple: '#9C27B0'
  };

  return (
    <Container theme={effectiveTheme}>
      <Header theme={effectiveTheme}>
        <HeaderTitle theme={effectiveTheme}>
          <span>🤖</span>
          Bitácora Ética del Uso de IA
        </HeaderTitle>
        <HeaderDescription theme={effectiveTheme}>
          Rúbrica 5: Metacognición sobre el uso responsable y ético de herramientas de inteligencia artificial en tu proceso de aprendizaje.
        </HeaderDescription>
      </Header>

      {/* 🆕 Banner de Entrega Final */}
      {isSubmitted && (
        <SubmissionBanner
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={effectiveTheme}
        >
          <span className="icon">✅</span>
          <span className="text">
            <strong>Tarea Entregada:</strong> No se pueden realizar más cambios.
          </span>
        </SubmissionBanner>
      )}

      {/* 🆕 Banner de cambio de nota docente */}
      <TeacherScoreOverrideBanner cloudData={teacherScoreOverride} theme={effectiveTheme} />

      {/* 🆕 Historial y Navegación de Versiones */}
      <HistoryRibbon
        history={history}
        viewingVersion={viewingVersion}
        onViewVersion={handleViewVersion}
        theme={effectiveTheme}
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

      {/* Resumen de Evaluación - Solo mostrar si hay algún progreso */}
      {(tutorInteractions.length > 0 ||
        verificacionFuentes.length > 0 ||
        procesoUsoIA.length > 0 ||
        reflexionEtica.length > 0 ||
        Object.values(declaraciones).some(Boolean) ||
        feedbackCriterial) && (
          <EvaluacionSummary theme={effectiveTheme}>
            <SummaryTitle theme={effectiveTheme}>📊 Tu Evaluación Actual - Rúbrica 5</SummaryTitle>
            <DimensionesGrid>
              <DimensionCard theme={effectiveTheme} $color={effectiveTheme.primary}>
                <DimensionIcon>📝</DimensionIcon>
                <DimensionName>Registro y Transparencia</DimensionName>
                <DimensionScore>{evaluacion.dimensiones.registro}/10</DimensionScore>
                <DimensionDesc>¿Documentas el uso de IA?</DimensionDesc>
              </DimensionCard>

              <DimensionCard theme={effectiveTheme} $color={effectiveTheme.warning}>
                <DimensionIcon>🔍</DimensionIcon>
                <DimensionName>Evaluación Crítica</DimensionName>
                <DimensionScore>{evaluacion.dimensiones.evaluacionCritica}/10</DimensionScore>
                <DimensionDesc>¿Contrastas con otras fuentes?</DimensionDesc>
              </DimensionCard>

              <DimensionCard theme={effectiveTheme} $color={effectiveTheme.success}>
                <DimensionIcon>✍️</DimensionIcon>
                <DimensionName>Agencia y Responsabilidad</DimensionName>
                <DimensionScore>{evaluacion.dimensiones.agencia}/10</DimensionScore>
                <DimensionDesc>¿Asumes autoría clara?</DimensionDesc>
              </DimensionCard>
            </DimensionesGrid>

            <PromedioFinal theme={effectiveTheme}>
              <span>Promedio Rúbrica 5:</span>
              <PromedioValue $score={parseFloat(evaluacion.promedio)}>
                {evaluacion.promedio}/10
              </PromedioValue>
            </PromedioFinal>
          </EvaluacionSummary>
        )}

      {/* Sección 1: Registro de Interacciones con el Tutor */}
      <Section theme={effectiveTheme}>
        <SectionHeader>
          <SectionTitle theme={effectiveTheme}>
            <span>🤖</span>
            1. Registro de Interacciones con el Tutor IA
          </SectionTitle>
          <ActionButtons>
            <SmallButton onClick={clearTutorLog} theme={effectiveTheme} $variant="danger">
              🗑️ Limpiar Historial
            </SmallButton>
          </ActionButtons>
        </SectionHeader>

        <SectionDescription theme={effectiveTheme}>
          Este es el registro automático de todas tus consultas al tutor IA durante la lectura.
          La transparencia en el uso de IA es fundamental para un aprendizaje ético.
        </SectionDescription>

        {tutorInteractions.length === 0 ? (
          <EmptyState theme={effectiveTheme}>
            <EmptyIcon>📭</EmptyIcon>
            <EmptyText>No hay interacciones registradas todavía</EmptyText>
            <EmptyHint>Usa el tutor IA en la pestaña "Lectura Guiada" para que se registren aquí automáticamente</EmptyHint>
          </EmptyState>
        ) : (
          <InteractionsList>
            {tutorInteractions.slice().reverse().map((interaction, index) => (
              <InteractionCard
                key={index}
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                theme={effectiveTheme}
              >
                <InteractionHeader>
                  <Timestamp theme={effectiveTheme}>
                    🕒 {new Date(interaction.timestamp).toLocaleString('es-ES')}
                  </Timestamp>
                  {interaction.bloomLevel && (
                    <BloomBadge theme={effectiveTheme}>
                      Bloom: {interaction.bloomLevel}
                    </BloomBadge>
                  )}
                </InteractionHeader>

                <QuestionLabel theme={effectiveTheme}>Pregunta al tutor:</QuestionLabel>
                <QuestionText theme={effectiveTheme}>{interaction.question}</QuestionText>

                {interaction.context && (
                  <>
                    <ContextLabel theme={effectiveTheme}>Contexto:</ContextLabel>
                    <ContextText theme={effectiveTheme}>{interaction.context}</ContextText>
                  </>
                )}

                {interaction.tutorMode && (
                  <ModeTag theme={effectiveTheme}>{interaction.tutorMode}</ModeTag>
                )}
              </InteractionCard>
            ))}
          </InteractionsList>
        )}

        <StatsBar theme={effectiveTheme}>
          <StatItem>
            <StatLabel>Total de consultas:</StatLabel>
            <StatValue>{tutorInteractions.length}</StatValue>
          </StatItem>
        </StatsBar>
      </Section>

      {/* 🔒 Mensaje cuando está bloqueado después de evaluar */}
      {isLocked && !viewingVersion && !isSubmitted && (
        <LockedMessage theme={effectiveTheme}>
          <LockIcon>🔒</LockIcon>
          <LockText>
            <strong>Bitácora enviada a evaluación</strong>
            <span>Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".</span>
          </LockText>
          <UnlockButton onClick={handleSeguirEditando} theme={effectiveTheme}>
            ✏️ Seguir Editando
          </UnlockButton>
        </LockedMessage>
      )}

      {/* Mensaje de guardado automático */}
      {!viewingVersion && (verificacionFuentes || procesoUsoIA || reflexionEtica) && (
        <AutoSaveMessage theme={effectiveTheme}>
          💾 Tu trabajo se guarda automáticamente. No perderás nada al cambiar de pestaña.
        </AutoSaveMessage>
      )}

      {/* Atajos de teclado */}
      <KeyboardShortcutsBar
        theme={effectiveTheme}
        shortcuts={[
          { keys: ['Ctrl', 'S'], label: 'Guardar' },
          { keys: ['Ctrl', 'Enter'], label: 'Evaluar' },
          { keys: ['Esc'], label: 'Cerrar' }
        ]}
      />

      {/* Sección 2: Reflexión Metacognitiva */}
      <Section theme={effectiveTheme}>
        <SectionTitle theme={effectiveTheme}>
          <span>IA</span>
          2. Reflexión Metacognitiva sobre el Uso de IA
        </SectionTitle>

        <SectionDescription theme={effectiveTheme}>
          Reflexiona críticamente sobre cómo has usado la inteligencia artificial en tu proceso de aprendizaje.
        </SectionDescription>

        <ReflectionQuestion theme={effectiveTheme}>
          <QuestionIcon>🔍</QuestionIcon>
          <QuestionTitle>¿Qué información de la IA verificaste en otras fuentes?</QuestionTitle>
          <QuestionHint>
            Describe qué fuentes consultaste (libros, artículos académicos, expertos) y qué información contrastaste.
          </QuestionHint>
          <ReflectionTextarea
            value={displayedContent.verificacionFuentes}
            onChange={(e) => !viewingVersion && setVerificacionFuentes(e.target.value)}
            placeholder="Ej: Verifiqué la definición de 'hegemonía' consultando el diccionario de la RAE y comparándola con la definición que me dio la IA. También contraté el contexto histórico mencionado con mi libro de texto..."
            rows={5}
            theme={effectiveTheme}
            disabled={isReadOnly}
          />
          <CharCount theme={effectiveTheme}>
            {displayedContent.verificacionFuentes.length} caracteres
          </CharCount>
        </ReflectionQuestion>

        <ReflectionQuestion theme={effectiveTheme}>
          <QuestionIcon>🤔</QuestionIcon>
          <QuestionTitle>¿Cómo usaste la IA? (guía vs. respuestas directas)</QuestionTitle>
          <QuestionHint>
            Explica si usaste la IA como guía para explorar conceptos o si buscaste respuestas directas. ¿Procesaste la información críticamente?
          </QuestionHint>
          <ReflectionTextarea
            value={displayedContent.procesoUsoIA}
            onChange={(e) => !viewingVersion && setProcesoUsoIA(e.target.value)}
            placeholder="Ej: Usé el tutor principalmente para aclarar conceptos complejos como 'análisis crítico del discurso'. No copié las respuestas directamente, sino que las usé como punto de partida para mi propia investigación..."
            rows={5}
            theme={effectiveTheme}
            disabled={isReadOnly}
          />
          <CharCount theme={effectiveTheme}>
            {displayedContent.procesoUsoIA.length} caracteres
          </CharCount>
        </ReflectionQuestion>

        <ReflectionQuestion theme={effectiveTheme}>
          <QuestionIcon>💭</QuestionIcon>
          <QuestionTitle>Reflexión ética: ¿Qué aprendiste sobre el uso responsable de IA?</QuestionTitle>
          <QuestionHint>
            ¿Qué desafíos éticos identificaste? ¿Cómo garantizaste que tu aprendizaje sea auténtico y no dependiente de la IA?
          </QuestionHint>
          <ReflectionTextarea
            value={displayedContent.reflexionEtica}
            onChange={(e) => !viewingVersion && setReflexionEtica(e.target.value)}
            placeholder="Ej: Aprendí que es importante no confiar ciegamente en la IA. Debo ser crítico y verificar la información. También me di cuenta de que la IA puede ayudarme a explorar ideas, pero el pensamiento crítico final debe ser mío..."
            rows={5}
            theme={effectiveTheme}
            disabled={isReadOnly}
          />
          <CharCount theme={effectiveTheme}>
            {displayedContent.reflexionEtica.length} caracteres
          </CharCount>
        </ReflectionQuestion>
      </Section>

      {/* Sección 3: Declaración de Autoría */}
      <Section theme={effectiveTheme}>
        <SectionTitle theme={effectiveTheme}>
          <span>✍️</span>
          3. Declaración de Autoría y Uso Ético
        </SectionTitle>

        <SectionDescription theme={effectiveTheme}>
          Declara de manera transparente cómo has usado la IA y asume responsabilidad sobre tu trabajo.
        </SectionDescription>

        <DeclarationsContainer>
          <DeclaracionItem
            onClick={() => !isReadOnly && handleCheckboxChange('respuestasPropias')}
            theme={effectiveTheme}
            $checked={displayedContent.declaraciones.respuestasPropias}
            style={{ cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.8 : 1 }}
          >
            <Checkbox $checked={displayedContent.declaraciones.respuestasPropias}>
              {displayedContent.declaraciones.respuestasPropias && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>Confirmo que las respuestas reflejan mi comprensión personal</strong>
              <DeclaracionDesc>
                He procesado la información de la IA y generado mis propias conclusiones.
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>

          <DeclaracionItem
            onClick={() => !isReadOnly && handleCheckboxChange('verificacionRealizada')}
            theme={effectiveTheme}
            $checked={displayedContent.declaraciones.verificacionRealizada}
            style={{ cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.8 : 1 }}
          >
            <Checkbox $checked={displayedContent.declaraciones.verificacionRealizada}>
              {displayedContent.declaraciones.verificacionRealizada && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>He verificado la información de la IA con otras fuentes</strong>
              <DeclaracionDesc>
                No he aceptado la información de la IA sin contrastarla.
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>

          <DeclaracionItem
            onClick={() => !isReadOnly && handleCheckboxChange('usoTransparente')}
            theme={effectiveTheme}
            $checked={displayedContent.declaraciones.usoTransparente}
            style={{ cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.8 : 1 }}
          >
            <Checkbox $checked={displayedContent.declaraciones.usoTransparente}>
              {displayedContent.declaraciones.usoTransparente && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>Declaro transparentemente el uso de asistencia IA</strong>
              <DeclaracionDesc>
                He registrado y documentado cómo he usado la IA en mi proceso de aprendizaje.
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>

          <DeclaracionItem
            onClick={() => !isReadOnly && handleCheckboxChange('contrasteMultifuente')}
            theme={effectiveTheme}
            $checked={displayedContent.declaraciones.contrasteMultifuente}
            style={{ cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.8 : 1 }}
          >
            <Checkbox $checked={displayedContent.declaraciones.contrasteMultifuente}>
              {displayedContent.declaraciones.contrasteMultifuente && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>He contrastado con múltiples fuentes (académicas, primarias)</strong>
              <DeclaracionDesc>
                No me he limitado a una sola fuente de información (incluida la IA).
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>
        </DeclarationsContainer>

        <DeclaracionesProgress theme={effectiveTheme}>
          <ProgressLabel>Declaraciones completadas:</ProgressLabel>
          <ProgressBar>
            <ProgressFill
              $percentage={(Object.values(displayedContent.declaraciones).filter(Boolean).length / 4) * 100}
              theme={effectiveTheme}
            />
          </ProgressBar>
          <ProgressText>
            {Object.values(displayedContent.declaraciones).filter(Boolean).length} de 4
          </ProgressText>
        </DeclaracionesProgress>
      </Section>

      {/* Botón de Evaluación Criterial */}
      {!feedbackCriterial && !viewingVersion && !isSubmitted && (
        <EvaluationButtonSection>
          <EvaluationValidation theme={effectiveTheme} $valid={isValidForEvaluation}>
            {isValidForEvaluation
              ? '✅ Bitácora completa. Solicita evaluación criterial con IA dual.'
              : '⚠️ Completa al menos 50 caracteres en cada reflexión y 2 declaraciones para evaluar.'}
          </EvaluationValidation>
          <EvaluationButton
            onClick={handleEvaluateCriterial}
            disabled={!isValidForEvaluation || loadingEvaluation || !rateLimit.canProceed || evaluationAttempts >= MAX_ATTEMPTS || isReadOnly}
            theme={effectiveTheme}
            style={{ opacity: (!isValidForEvaluation || loadingEvaluation || evaluationAttempts >= MAX_ATTEMPTS || !rateLimit.canProceed || isReadOnly) ? 0.6 : 1 }}
          >
            {loadingEvaluation ? '⏳ Evaluando con IA Dual...' :
              evaluationAttempts >= MAX_ATTEMPTS ? '🔒 Límite de Intentos Alcanzado' :
                !rateLimit.canProceed ? `⏳ Espera ${rateLimit.nextAvailableIn}s` :
                  `🤖 Solicitar Evaluación (${MAX_ATTEMPTS - evaluationAttempts} restantes)`}
          </EvaluationButton>
        </EvaluationButtonSection>
      )}

      {/* 🆕 Botón de Entrega */}
      {!isSubmitted && feedbackCriterial && !viewingVersion && !loadingEvaluation && (
        <EvaluationButtonSection style={{ marginTop: '1rem' }}>
          <SubmitButton onClick={handleSubmit} theme={effectiveTheme}>
            🔒 Entregar Tarea
          </SubmitButton>
        </EvaluationButtonSection>
      )}

      {/* Barra de progreso de evaluación */}
      {loadingEvaluation && (
        <EvaluationProgressBar
          theme={effectiveTheme}
          isEvaluating={loadingEvaluation}
          currentStep={currentEvaluationStep}
        />
      )}

      {/* Feedback Criterial */}
      <AnimatePresence>
        {displayedContent.feedback && !loadingEvaluation && (
          <FeedbackCriterialSection
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            theme={effectiveTheme}
          >
            <FeedbackHeader theme={effectiveTheme}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.textPrimary }}>
                  📊 Evaluación Criterial ({viewingVersion ? `Intento ${viewingVersion.attemptNumber} ` : 'IA Dual'})
                </h3>
                <NivelGlobalBadge $nivel={displayedContent.feedback.nivel_global} theme={effectiveTheme}>
                  Nivel {displayedContent.feedback.nivel_global}/4
                </NivelGlobalBadge>
              </div>
            </FeedbackHeader>

            <FeedbackDimension theme={effectiveTheme}>
              <strong>{displayedContent.feedback.dimension_label}:</strong> {displayedContent.feedback.dimension_description}
            </FeedbackDimension>

            {displayedContent.feedback.criterios && (
            <CriteriosGrid>
              {/* Criterio 1 */}
              {displayedContent.feedback.criterios.registro_transparencia && (
              <CriterioCard theme={effectiveTheme}>
                <CriterioHeader>
                  <CriterioTitle theme={effectiveTheme}>Registro y Transparencia</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.registro_transparencia.nivel} theme={effectiveTheme}>
                    Nivel {displayedContent.feedback.criterios.registro_transparencia.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.registro_transparencia.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={effectiveTheme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.registro_transparencia.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={effectiveTheme}>✓ {renderMarkdown(f)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.registro_transparencia.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={effectiveTheme}>💡 Oportunidades:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.registro_transparencia.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={effectiveTheme}>→ {renderMarkdown(m)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Criterio 2 */}
              {displayedContent.feedback.criterios.evaluacion_critica_herramienta && (
              <CriterioCard theme={effectiveTheme}>
                <CriterioHeader>
                  <CriterioTitle theme={effectiveTheme}>Evaluación Crítica de la Herramienta</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.evaluacion_critica_herramienta.nivel} theme={effectiveTheme}>
                    Nivel {displayedContent.feedback.criterios.evaluacion_critica_herramienta.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.evaluacion_critica_herramienta.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={effectiveTheme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.evaluacion_critica_herramienta.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={effectiveTheme}>✓ {renderMarkdown(f)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.evaluacion_critica_herramienta.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={effectiveTheme}>💡 Oportunidades:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.evaluacion_critica_herramienta.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={effectiveTheme}>→ {renderMarkdown(m)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}

              {/* Criterio 3 */}
              {displayedContent.feedback.criterios.agencia_responsabilidad && (
              <CriterioCard theme={effectiveTheme}>
                <CriterioHeader>
                  <CriterioTitle theme={effectiveTheme}>Agencia y Responsabilidad</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.agencia_responsabilidad.nivel} theme={effectiveTheme}>
                    Nivel {displayedContent.feedback.criterios.agencia_responsabilidad.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.agencia_responsabilidad.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={effectiveTheme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.agencia_responsabilidad.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={effectiveTheme}>✓ {renderMarkdown(f)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.agencia_responsabilidad.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={effectiveTheme}>💡 Oportunidades:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.agencia_responsabilidad.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={effectiveTheme}>→ {renderMarkdown(m)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
              )}
            </CriteriosGrid>
            )}

            {!viewingVersion && (
              <FeedbackFooter>
                <SecondaryButton onClick={() => setFeedbackCriterial(null)} theme={effectiveTheme}>
                  🔄 Revisar y Mejorar Reflexiones
                </SecondaryButton>
              </FeedbackFooter>
            )}
          </FeedbackCriterialSection>
        )}
      </AnimatePresence>

      {/* Botón de Exportación */}
      <ExportSection>
        <ExportButton onClick={exportBitacora} theme={effectiveTheme}>
          📥 Exportar Bitácora Completa (PDF)
        </ExportButton>
        <ExportHint theme={effectiveTheme}>
          Descarga un registro completo de tu uso ético de IA para incluir en tu portafolio de aprendizaje.
        </ExportHint>
      </ExportSection>

      <ConfirmModal
        open={showSubmitConfirm}
        title="¿Entregar tarea?"
        message="Una vez entregada, no podrás realizar más cambios ni solicitar nuevas evaluaciones."
        confirmText="📤 Sí, Entregar"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        theme={effectiveTheme}
      />

      <ConfirmModal
        open={showClearLogConfirm}
        title="¿Borrar historial del tutor?"
        message="Se eliminará todo el historial de interacciones con el tutor IA."
        confirmText="🗑️ Sí, Borrar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmedClearLog}
        onCancel={() => setShowClearLogConfirm(false)}
        theme={effectiveTheme}
      />
    </Container>
  );
}

const EvaluacionSummary = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.purple}15, ${props => props.theme.primary}15);
  border: 2px solid ${props => props.theme.purple}40;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SummaryTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textPrimary};
  font-size: 1.25rem;
  font-weight: 700;
`;

const DimensionesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DimensionCard = styled.div`
  background: ${props => props.theme.cardBg};
  border: 2px solid ${props => props.$color}40;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px ${props => props.$color}30;
  }
`;

const DimensionIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const DimensionName = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary};
  margin-bottom: 0.5rem;
`;

const DimensionScore = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-bottom: 0.25rem;
`;

const DimensionDesc = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textSecondary};
  font-style: italic;
`;

const PromedioFinal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${props => props.theme.cardBg};
  border-radius: 8px;
  font-weight: 600;
  color: ${props => props.theme.textPrimary};
`;

const PromedioValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => {
    const score = props.$score;
    if (score >= 8.6) return '#4CAF50';
    if (score >= 5.6) return '#2196F3';
    if (score >= 2.6) return '#FF9800';
    return '#F44336';
  }};
`;

const Section = styled.section`
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SectionDescription = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textSecondary};
  line-height: 1.6;
  font-size: 0.95rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const SmallButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.$variant === 'danger' ? props.theme.danger : props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.$variant === 'danger' ? props.theme.danger : props.theme.primary}40;
  }
`;

const InteractionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
  margin-bottom: 1rem;
`;

const InteractionCard = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const InteractionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Timestamp = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  font-weight: 500;
`;

const BloomBadge = styled.span`
  padding: 0.25rem 0.6rem;
  background: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const QuestionLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${props => props.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const QuestionText = styled.div`
  color: ${props => props.theme.textPrimary};
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

const ContextLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${props => props.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const ContextText = styled.div`
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.4;
  font-style: italic;
`;

const ModeTag = styled.span`
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.6rem;
  background: ${props => props.theme.success}20;
  color: ${props => props.theme.success};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background: ${props => props.theme.surface};
  border-radius: 8px;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatLabel = styled.span`
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
`;

const StatValue = styled.span`
  color: ${props => props.theme.primary};
  font-weight: 700;
  font-size: 1.1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme.textSecondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.textPrimary};
`;

const EmptyHint = styled.div`
  font-size: 0.9rem;
  font-style: italic;
`;

const ReflectionQuestion = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${props => props.theme.surface};
  border-radius: 10px;
  border-left: 4px solid ${props => props.theme.primary};
`;

const QuestionIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.75rem;
`;

const QuestionTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.textPrimary};
  font-size: 1.1rem;
  font-weight: 600;
`;

const QuestionHint = styled.p`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;
  font-style: italic;
`;

const ReflectionTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border: 2px solid ${props => props.theme.border};
  border-radius: 8px;
  background: ${props => props.theme.background};
  color: ${props => props.theme.textPrimary};
  font-size: 0.95rem;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.primary}20;
  }
  
  &::placeholder {
    color: ${props => props.theme.textMuted};
    font-style: italic;
  }
`;

const CharCount = styled.div`
  margin-top: 0.5rem;
  text-align: right;
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const DeclaracionItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.$checked ? props.theme.success + '10' : props.theme.surface};
  border: 2px solid ${props => props.$checked ? props.theme.success : props.theme.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$checked ? props.theme.success + '15' : props.theme.primary + '05'};
    border-color: ${props => props.$checked ? props.theme.success : props.theme.primary};
  }
`;

const Checkbox = styled.div`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border: 2px solid ${props => props.$checked ? props.theme.success : props.theme.border};
  border-radius: 6px;
  background: ${props => props.$checked ? props.theme.success : 'transparent'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.2s ease;
`;

const DeclaracionLabel = styled.div`
  flex: 1;
`;

const DeclaracionDesc = styled.div`
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: ${props => props.theme.textSecondary};
  line-height: 1.4;
`;

const DeclaracionesProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.theme.surface};
  border-radius: 8px;
`;

const ProgressLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary};
  white-space: nowrap;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 12px;
  background: ${props => props.theme.border};
  border-radius: 6px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percentage}%;
  background: linear-gradient(90deg, ${props => props.theme.success}, ${props => props.theme.primary});
  transition: width 0.5s ease;
`;

const ProgressText = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
  white-space: nowrap;
`;

const ExportSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  border: 2px dashed ${props => props.theme.border};
`;

const ExportButton = styled.button`
  padding: 1rem 2rem;
  background: ${props => props.theme.purple};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px ${props => props.theme.purple}40;
  
  &:hover {
    background: ${props => props.theme.purple}dd;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${props => props.theme.purple}50;
  }
`;

const ExportHint = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${props => props.theme.textSecondary};
  text-align: center;
  font-style: italic;
`;

// Nuevos styled components para evaluación criterial
const EvaluationButtonSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const EvaluationValidation = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: ${props => props.$valid ? '#dcfce7' : '#fee2e2'};
  border: 1px solid ${props => props.$valid ? '#86efac' : '#fca5a5'};
  color: ${props => props.$valid ? '#166534' : '#991b1b'};
  font-size: 0.9rem;
  text-align: center;
  width: 100%;
  max-width: 600px;
`;

const EvaluationButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.theme.primary || '#2196F3'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover:not(:disabled) {
    background: ${props => props.theme.primaryHover || props.theme.primaryDark || props.theme.primary || '#1976D2'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => `${props.theme.primary || '#2196F3'}40`};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FeedbackCriterialSection = styled.div`
  background: ${props => props.theme.cardBg};
  border: 2px solid ${props => props.theme.purple};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px ${props => props.theme.purple}20;
`;

const NivelGlobalBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${props => {
    switch (props.$nivel) {
      case 1: return '#fee2e2';
      case 2: return '#fed7aa';
      case 3: return '#dcfce7';
      case 4: return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }
  };
  color: ${props => {
    switch (props.$nivel) {
      case 1: return '#991b1b';
      case 2: return '#c2410c';
      case 3: return '#166534';
      case 4: return '#6b21a8';
      default: return '#374151';
    }
  }
  };
  font-weight: 700;
  font-size: 1rem;
`;

const FeedbackDimension = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const FeedbackFooter = styled.div`
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.surface};
  color: ${props => props.theme.textPrimary};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.border};
  }
`;

