/**
 * Componente ResumenAcademico
 * Artefacto de Aprendizaje para Rúbrica 1: Comprensión Analítica
 * 
 * Permite al estudiante crear un resumen académico con citas textuales
 * y recibir evaluación criterial dual (DeepSeek + OpenAI)
 */

import React, { useState, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluarResumenAcademico, validarResumenAcademico } from '../../services/resumenAcademico.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useRateLimit from '../../hooks/useRateLimit';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import TeacherScoreOverrideBanner from './TeacherScoreOverrideBanner';
import { renderMarkdown } from '../../utils/markdownUtils';

const ResumenAcademico = ({ theme }) => {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation, updateActivitiesProgress, sourceCourseId, currentTextoId, activitiesProgress } = useContext(AppContext);
  const rewards = useRewards();
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const rewardsResourceId = lectureId ? `${lectureId}:ResumenAcademico` : null;

  // 🆕 Ref para rastrear si ya procesamos el reset (evita bucle infinito)
  const resetProcessedRef = useRef(null);

  // Estados con recuperación de sessionStorage como respaldo
  // 🆕 FASE 1 FIX: Usa claves namespaced por textoId (se re-evalúa cuando currentTextoId cambia)
  const [resumen, setResumen] = useState('');

  // 🆕 Efecto para cargar borrador cuando cambia el lectureId
  useEffect(() => {
    if (!lectureId) return;

    // Al cambiar de lectura, limpiar primero para evitar que contenido
    // del documento anterior se persista con la nueva clave.
    setResumen('');

    let cancelled = false;

    // Importar helper dinámicamente para evitar dependencia circular
    import('../../services/sessionManager').then(({ getDraftKey }) => {
      const key = getDraftKey('resumenAcademico_draft', lectureId);
      const savedDraft = sessionStorage.getItem(key);
      if (savedDraft) {
        if (!cancelled) setResumen(savedDraft);
        console.log('📂 [ResumenAcademico] Borrador cargado para lectureId:', lectureId);
      } else {
        console.log('📝 [ResumenAcademico] Sin borrador para lectureId:', lectureId);
      }
    });

    return () => { cancelled = true; };
  }, [lectureId]);
  const [evaluacion, setEvaluacion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
  const [showGuide, setShowGuide] = useState(true);
  const [showCitasPanel, setShowCitasPanel] = useState(false); // 🆕 Panel de citas guardadas
  const [pasteError, setPasteError] = useState(null); // 🆕 Error de pegado externo
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  const [evaluationAttempts, setEvaluationAttempts] = useState(0); // 🆕 Intentos de evaluación (Max 3)
  const [history, setHistory] = useState([]); // 🆕 Historial de versiones { timestamp, resumen, evaluacion }
  const [viewingVersion, setViewingVersion] = useState(null); // 🆕 Versión que se está visualizando (null = actual)
  const [isSubmitted, setIsSubmitted] = useState(false); // 🆕 Estado de entrega final
  const [teacherScoreOverride, setTeacherScoreOverride] = useState(null); // 🆕 Info de cambio de nota por docente
  const MAX_ATTEMPTS = 3;

  // 🆕 Rate limiting: 5s cooldown, máximo 10 evaluaciones/hora
  const rateLimit = useRateLimit('evaluate_resumen', {
    cooldownMs: 5000,
    maxPerHour: 10
  });

  // 🆕 Keyboard shortcuts para productividad
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);

  useKeyboardShortcuts({
    'ctrl+s': (_e) => {
      console.log('⌨️ Ctrl+S: Guardando borrador manualmente...');
      persistence.saveManual();
      // Mostrar feedback visual
      setShowShortcutsHint(true);
      setTimeout(() => setShowShortcutsHint(false), 2000);
    },
    'ctrl+enter': (_e) => {
      console.log('⌨️ Ctrl+Enter: Evaluando resumen...');
      if (!loading && validacion.valid && rateLimit.canProceed && evaluationAttempts < MAX_ATTEMPTS) {
        handleEvaluar();
      }
    },
    'escape': (_e) => {
      console.log('⌨️ Esc: Cerrando paneles...');
      if (showCitasPanel) {
        setShowCitasPanel(false);
      } else if (pasteError) {
        setPasteError(null);
      } else if (viewingVersion) {
        setViewingVersion(null); // Salir del modo historial
      }
    }
  }, {
    enabled: true,
    excludeInputs: false // Permitir en textarea
  });

  // Persistencia
  const persistence = useActivityPersistence(lectureId, {
    enabled: !!lectureId,
    courseId: sourceCourseId, // 🆕 Aislar datos por curso
    legacyDocumentIds: (currentTextoId && documentId && currentTextoId !== documentId) ? [documentId] : [],
    studentAnswers: { resumen },
    aiFeedbacks: { evaluacion },
    criterionFeedbacks: {},
    currentIndex: 0,
    attempts: evaluationAttempts, // 🆕 Persistir intentos
    history, // 🆕 Persistir historial
    submitted: isSubmitted, // 🆕 Persistir estado de entrega
    onRehydrate: (data) => {
      console.log('📦 [ResumenAcademico] Rehidratando datos...', {
        documentId,
        hasResumen: !!data.student_answers?.resumen,
        hasEvaluacion: !!data.ai_feedbacks?.evaluacion,
        attempts: data.attempts,
        historyLength: data.history?.length || 0
      });

      // ✅ Rehidratación robusta
      if (data.student_answers?.resumen) {
        setResumen(data.student_answers.resumen);
        console.log(`✅ Resumen rehidratado: ${data.student_answers.resumen.substring(0, 50)}...`);
      }
      if (data.ai_feedbacks?.evaluacion) {
        setEvaluacion(data.ai_feedbacks.evaluacion);
        console.log('✅ Evaluación rehidratada');
      }

      // 🆕 Rehidratar intentos
      if (typeof data.attempts === 'number') {
        setEvaluationAttempts(data.attempts);
        console.log(`✅ Intentos rehidratados: ${data.attempts}`);
      }

      // 🆕 Rehidratar historial
      if (Array.isArray(data.history)) {
        setHistory(data.history);
        console.log(`✅ Historial rehidratado: ${data.history.length} versiones`);
      }

      // 🆕 Rehidratar estado de entrega
      if (data.submitted) {
        setIsSubmitted(true);
        setIsLocked(true); // 🔒 También bloquear la edición
        console.log('✅ Estado de entrega rehidratado: ENTREGADO + LOCKED');
      }
    }
  });

  // 🆕 CLOUD SYNC: Cargar history/drafts desde Firestore (activitiesProgress) - tiene prioridad sobre localStorage
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

    const cloudData = findCloudArtifact('resumenAcademico');
    
    // � DEBUG: Ver datos del cloud para diagnóstico
    console.log('🔍 [ResumenAcademico] Cloud data check:', {
      hasCloudData: !!cloudData,
      resetBy: cloudData?.resetBy,
      resetAt: cloudData?.resetAt,
      submitted: cloudData?.submitted,
      hasHistory: !!(cloudData?.history?.length)
    });
    
    // �🔄 DETECTAR RESET: Si cloudData tiene resetBy='docente', verificar si aplica
    // Convertir resetAt a timestamp en milisegundos (puede ser string ISO, Firestore Timestamp, o número)
    const rawResetAt = cloudData?.resetAt;
    let resetTimestamp = 0;
    if (rawResetAt) {
      if (rawResetAt.seconds) {
        // Firestore Timestamp
        resetTimestamp = rawResetAt.seconds * 1000;
      } else if (typeof rawResetAt === 'string') {
        // ISO string
        resetTimestamp = new Date(rawResetAt).getTime();
      } else if (typeof rawResetAt === 'number') {
        // Ya es timestamp (verificar si es segundos o milisegundos)
        resetTimestamp = rawResetAt > 1e12 ? rawResetAt : rawResetAt * 1000;
      }
    }
    
    // 🆕 CLAVE: Si submitted === false explícitamente por el reset, debemos aplicarlo
    // El reset escribe submitted: false, así que si cloudData.submitted es false
    // y hay resetBy='docente', es un reset válido
    const wasResetByDocente = cloudData?.resetBy === 'docente' && resetTimestamp > 0;
    const isCurrentlySubmitted = cloudData?.submitted === true;
    
    // Solo aplicar reset si:
    // 1. Hay resetBy='docente' y resetTimestamp válido
    // 2. El artefacto NO está actualmente submitted (el docente lo reseteó a submitted: false)
    const shouldApplyReset = wasResetByDocente && !isCurrentlySubmitted;
    
    if (shouldApplyReset) {
      // Verificar si ya procesamos este reset específico
      const resetKey = `${lectureId}_${resetTimestamp}`;
      if (resetProcessedRef.current === resetKey) {
        // Ya procesamos este reset, no hacer nada
        return;
      }
      
      console.log('🔄 [ResumenAcademico] Detectado RESET por docente, limpiando estado local...');
      console.log('🔄 [ResumenAcademico] resetTimestamp:', resetTimestamp, 'isCurrentlySubmitted:', isCurrentlySubmitted);
      resetProcessedRef.current = resetKey; // Marcar como procesado
      
      // Limpiar estados
      setIsSubmitted(false);
      setIsLocked(false);
      setHistory([]);
      setEvaluationAttempts(0);
      setEvaluacion(null);
      setResumen('');
      setViewingVersion(null);
      setTeacherScoreOverride(null); // Limpiar override docente tras reset
      
      // Limpiar sessionStorage
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const key = getDraftKey('resumenAcademico_draft', lectureId);
        sessionStorage.removeItem(key);
        console.log('🧹 [ResumenAcademico] Borrador sessionStorage limpiado tras reset');
      });
      
      // Limpiar localStorage (persistence storage key)
      if (persistence?.clearResults) {
        persistence.clearResults();
      }
      // También limpiar directamente localStorage con la key del artefacto
      try {
        const storageKeys = Object.keys(localStorage).filter(k => 
          k.includes('activity_results_') && k.includes(lectureId)
        );
        storageKeys.forEach(k => {
          localStorage.removeItem(k);
          console.log('🧹 [ResumenAcademico] localStorage key limpiada:', k);
        });
      } catch (e) {
        console.warn('Error limpiando localStorage:', e);
      }
      
      return; // No procesar más, ya reseteamos
    }
    
    if (!cloudData) return;

    // Priorizar datos de cloud sobre localStorage
    if (cloudData.history && Array.isArray(cloudData.history)) {
      console.log('☁️ [ResumenAcademico] Cargando historial desde Firestore:', cloudData.history.length, 'versiones');
      setHistory(prev => {
        // Merge: mantener el que tenga más versiones o timestamps más recientes
        if (prev.length >= cloudData.history.length) return prev;
        return cloudData.history;
      });
    }

    if (cloudData.attempts && typeof cloudData.attempts === 'number') {
      setEvaluationAttempts(prev => Math.max(prev, cloudData.attempts));
    }

    if (cloudData.submitted) {
      setIsSubmitted(true);
      setIsLocked(true); // 🔒 También bloquear la edición al rehidratar entrega
    }

    // 🆕 Capturar info de cambio de nota por docente
    if (cloudData.teacherOverrideScore != null) {
      setTeacherScoreOverride({
        teacherOverrideScore: cloudData.teacherOverrideScore,
        scoreOverrideReason: cloudData.scoreOverrideReason,
        scoreOverriddenAt: cloudData.scoreOverriddenAt,
        docenteNombre: cloudData.docenteNombre
      });
    }

    // 🆕 Restaurar borrador desde cloud si existe y sessionStorage está vacío
    if (cloudData.draft) {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const key = getDraftKey('resumenAcademico_draft', lectureId);
        const localDraft = sessionStorage.getItem(key);
        if (!localDraft || localDraft.length === 0) {
          sessionStorage.setItem(key, cloudData.draft);
          setResumen(cloudData.draft);
          console.log('☁️ [ResumenAcademico] Borrador restaurado desde Firestore');
        }
      });
    }
  }, [lectureId, activitiesProgress, persistence]);

  // 🆕 FASE 1 FIX: Guardar respaldo en sessionStorage con clave namespaced
  useEffect(() => {
    if (!lectureId) return;

    // Si está bloqueado por evaluación, entregado o mostrando versión histórica, no re-guardar borrador
    if (isLocked || isSubmitted || viewingVersion) return;

    if (!resumen) return;

    let cancelled = false;
    let timeoutId = null;

    import('../../services/sessionManager').then(({ getDraftKey, updateCurrentSession, captureArtifactsDrafts }) => {
      if (cancelled) return;

      const key = getDraftKey('resumenAcademico_draft', lectureId);
      sessionStorage.setItem(key, resumen);
      console.log('💾 [ResumenAcademico] Borrador guardado para lectureId:', lectureId);

      // 🆕 Trigger cloud sync (debounced)
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(lectureId) });
      }, 4000);
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [resumen, lectureId, isLocked, isSubmitted, viewingVersion]);

  // 🆕 Escuchar restauración de sesión para actualizar el estado desde sessionStorage
  useEffect(() => {
    const handleSessionRestored = () => {
      // Compat: preferir clave namespaced por lectureId, con fallback a clave legacy
      let restoredDraft = null;

      if (lectureId) {
        import('../../services/sessionManager').then(({ getDraftKey }) => {
          const key = getDraftKey('resumenAcademico_draft', lectureId);
          const scoped = sessionStorage.getItem(key);
          const legacy = sessionStorage.getItem('resumenAcademico_draft');
          const picked = scoped || legacy;
          if (picked && picked !== resumen) {
            console.log('🔄 [ResumenAcademico] Restaurando borrador desde sesión...');
            setResumen(picked);
            // Normalizar: si venía de legacy, copiar a namespaced
            if (!scoped && legacy) {
              sessionStorage.setItem(key, legacy);
            }
          }
        });
        return;
      }

      restoredDraft = sessionStorage.getItem('resumenAcademico_draft');
      if (restoredDraft && restoredDraft !== resumen) {
        console.log('🔄 [ResumenAcademico] Restaurando borrador desde sesión...');
        setResumen(restoredDraft);
      }
    };

    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [resumen, lectureId]);

  // Validación en tiempo real
  const validacion = useMemo(() => {
    if (!resumen || !texto) return { valid: false, errors: [], citasEncontradas: 0 };
    return validarResumenAcademico(resumen, texto);
  }, [resumen, texto]);

  // Contador de palabras
  const palabras = useMemo(() => {
    return resumen.trim().split(/\s+/).filter(Boolean).length;
  }, [resumen]);

  // Handler de evaluación
  const handleEvaluar = useCallback(async () => {
    if (!validacion.valid) {
      setError(validacion.errors.join('\n'));
      return;
    }

    // 🆕 Verificar límite de intentos
    if (evaluationAttempts >= MAX_ATTEMPTS) {
      setError(`🚫 Has alcanzado el límite de ${MAX_ATTEMPTS} intentos de evaluación para este artefacto.`);
      return;
    }

    // ✅ Verificar rate limit antes de proceder
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
    setCurrentEvaluationStep({ label: 'Iniciando evaluación...', icon: '🚀', duration: 2 });

    // 🆕 Incrementar intentos inmediatamente
    setEvaluationAttempts(prev => prev + 1);

    try {
      console.log(`📝 [ResumenAcademico] Solicitando evaluación dual (Intento ${evaluationAttempts + 1}/${MAX_ATTEMPTS})...`);

      // Simular pasos para feedback visual
      const stepTimeouts = [
        setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando estructura...', icon: '📊', duration: 5 }), 1000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 3000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 10 }), 15000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 3 }), 25000)
      ];

      const result = await evaluarResumenAcademico({
        resumen,
        textoOriginal: texto
      });

      // Cancelar timeouts pendientes si la evaluación terminó antes
      stepTimeouts.forEach(timeout => clearTimeout(timeout));

      console.log('✅ [ResumenAcademico] Evaluación recibida:', result);
      setEvaluacion(result);
      setIsLocked(true); // 🔒 Bloquear textarea después de evaluar

      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica1', {
        score: result.scoreGlobal,
        nivel: result.nivel,
        artefacto: 'ResumenAcademico',
        criterios: result.criteriosEvaluados,
        textoId: lectureId
      });

      // 🆕 Archivar en Historial
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        content: { resumen },
        feedback: result,
        score: result.scoreGlobal,
        attemptNumber: evaluationAttempts + 1
      };

      setHistory(prev => [...prev, newHistoryEntry]);
      console.log('📜 [ResumenAcademico] Versión archivada en historial');

      // 🔄 CLOUD SYNC: Sincronizar historial y borrador con Firestore para cross-browser
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => ({
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            resumenAcademico: {
              ...(prev?.artifacts?.resumenAcademico || {}),
              history: [...(prev?.artifacts?.resumenAcademico?.history || []), newHistoryEntry],
              attempts: evaluationAttempts + 1,
              lastScore: result.scoreGlobal,
              lastNivel: result.nivel,
              lastEvaluatedAt: Date.now(),
              draft: resumen, // Guardar el borrador actual también
              // 🆕 Limpiar flags de reset cuando el estudiante trabaja
              resetBy: null,
              resetAt: null
            }
          }
        }));
        console.log('☁️ [ResumenAcademico] Historial sincronizado con Firestore');
      }

      // �🎮 REGISTRAR RECOMPENSAS
      if (rewards) {
        // Puntos base por enviar evaluación
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'ResumenAcademico',
          rubricId: 'rubrica1',
          resourceId: rewardsResourceId
        });

        // Puntos según nivel alcanzado
        const nivelEvent = `EVALUATION_LEVEL_${result.nivel}`;
        rewards.recordEvent(nivelEvent, {
          score: result.scoreGlobal,
          nivel: result.nivel,
          artefacto: 'ResumenAcademico',
          resourceId: rewardsResourceId
        });

        // Puntos por citas textuales usadas
        const citasCount = (resumen.match(/"/g) || []).length / 2; // Contar pares de comillas
        if (citasCount > 0) {
          rewards.recordEvent('QUOTE_USED', {
            count: Math.floor(citasCount),
            artefacto: 'ResumenAcademico',
            resourceId: rewardsResourceId
          });
        }

        // Bonus si el anclaje textual es sólido (3+ citas)
        if (citasCount >= 3) {
          rewards.recordEvent('STRONG_TEXTUAL_ANCHORING', {
            citasCount: Math.floor(citasCount),
            artefacto: 'ResumenAcademico',
            resourceId: rewardsResourceId
          });
        }


        // Achievement: Score perfecto
        if (result.scoreGlobal >= 9.5) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: result.scoreGlobal,
            artefacto: 'ResumenAcademico',
            resourceId: rewardsResourceId
          });
        }

        console.log('🎮 [ResumenAcademico] Recompensas registradas');
      }

      // 🗑️ Limpiar sessionStorage para eliminar advertencia de borrador
      try {
        if (lectureId) {
          import('../../services/sessionManager').then(({ getDraftKey }) => {
            const key = getDraftKey('resumenAcademico_draft', lectureId);
            sessionStorage.removeItem(key);
          });
        }
      } catch { /* noop */ }
      // Legacy (compat)
      sessionStorage.removeItem('resumenAcademico_draft');

      // 📢 Disparar evento para que DraftWarning se actualice inmediatamente
      window.dispatchEvent(new Event('evaluation-complete'));

      // Guardar manualmente para asegurar persistencia inmediata
      persistence.saveManual();

    } catch (error) {
      console.error('❌ [ResumenAcademico] Error:', error);
      setError(`Error al evaluar: ${error.message}`);
    } finally {
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [resumen, texto, validacion.valid, evaluationAttempts, rateLimit, rewards, rewardsResourceId, setError, updateRubricScore, persistence, lectureId, updateActivitiesProgress]);

  // 🆕 Función para entrega final
  const handleSubmit = useCallback(() => {
    if (!evaluacion) return;

    if (window.confirm('¿Estás seguro que deseas entregar tu tarea? Una vez entregada, no podrás realizar más cambios ni solicitar nuevas evaluaciones.')) {
      setIsSubmitted(true);

      // Guardar inmediatamente
      setTimeout(() => persistence.saveManual(), 100);

      // 🆕 SYNC: Registrar entrega en contexto global para Dashboard (preservando historial)
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => {
          // Obtener el score previo guardado (lastScore) o usar scoreGlobal de la evaluación
          const previousArtifact = prev?.artifacts?.resumenAcademico || {};
          const scoreToUse = previousArtifact.lastScore || evaluacion.scoreGlobal || 0;
          
          console.log('📤 [ResumenAcademico] Entregando con score:', scoreToUse, 'lastScore:', previousArtifact.lastScore, 'scoreGlobal:', evaluacion.scoreGlobal);
          
          return {
            ...prev,
            artifacts: {
              ...(prev?.artifacts || {}),
              resumenAcademico: {
                ...previousArtifact,
                submitted: true,
                submittedAt: Date.now(),
                score: scoreToUse,
                nivel: evaluacion.nivel || previousArtifact.lastNivel || 'Sin evaluar',
                history: history,
                attempts: evaluationAttempts,
                finalContent: resumen
              }
            }
          };
        });
      }

      // Registrar evento de recompensa
      if (rewards) {
        rewards.recordEvent('ARTIFACT_SUBMITTED', {
          artefacto: 'ResumenAcademico',
          level: evaluacion.nivel,
          resourceId: rewardsResourceId
        });
      }

      console.log('✅ [ResumenAcademico] Tarea entregada y sincronizada con Dashboard');
    }
  }, [evaluacion, rewards, persistence, lectureId, updateActivitiesProgress, rewardsResourceId, history, evaluationAttempts, resumen]);

  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    console.log('✏️ [ResumenAcademico] Desbloqueando para editar...');
    setIsLocked(false);
    setEvaluacion(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);

  // 🆕 Obtener citas guardadas manualmente por el estudiante (sin auto-extraer)
  const citasGuardadas = useMemo(() => {
    if (!lectureId) return [];
    const arr = getCitations?.(lectureId);
    return Array.isArray(arr) ? arr : [];
  }, [lectureId, getCitations]);

  // Insertar entrada del cuaderno en el resumen con formato según tipo
  const insertarCita = useCallback((textoCita, tipo = 'cita') => {
    // Citas textuales van entre comillas, reflexiones/comentarios van como texto directo
    const textoFormateado = tipo === 'cita' ? `"${textoCita}" ` : `${textoCita} `;
    setResumen(prev => {
      return prev + (prev && !prev.endsWith(' ') ? ' ' : '') + textoFormateado;
    });
    setShowCitasPanel(false);
    console.log(`✅ Entrada (${tipo}) insertada en el resumen`);
  }, []);

  // 🆕 Eliminar cita guardada
  const handleEliminarCita = useCallback((citaId) => {
    if (lectureId) {
      deleteCitation(lectureId, citaId);
      console.log(`🗑️ Cita ${citaId} eliminada`);
    }
  }, [lectureId, deleteCitation]);

  // 🆕 Prevención de pegado externo (anti-plagio) mejorada
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    // Si intenta pegar mucho texto (>40 palabras), bloquear
    if (wordCount > 40) {
      const message = `⚠️ Solo puedes pegar hasta 40 palabras (intentaste pegar ${wordCount}). Escribe con tus propias palabras o usa citas guardadas.`;
      setPasteError(message);
      setTimeout(() => setPasteError(null), 5000);
      console.warn('🚫 Intento de pegado bloqueado (excede 40 palabras)');
      return;
    }

    // ✅ Lógica correcta para insertar en textarea controlado
    const textarea = e.target;
    const { selectionStart, selectionEnd } = textarea;
    const currentText = resumen || '';

    // Insertar texto en la posición del cursor o reemplazar selección
    const newText =
      currentText.substring(0, selectionStart) +
      pastedText +
      currentText.substring(selectionEnd);

    // Actualizar estado y luego restaurar cursor (necesita useEffect o setTimeout, 
    // pero React input normal suele moverlo al final. Para mejor UX, podríamos gestionarlo, 
    // pero lo básico es que inserte el texto.)
    setResumen(newText);

    console.log(`✅ Paste permitido: ${wordCount} palabras`);
    setPasteError(null); // Limpiar error si lo hubiera
  }, [resumen]);

  // 🆕 Helper para obtener color por nivel
  const getNivelColor = useCallback((nivel) => {
    const colors = {
      1: theme.danger || '#F44336',
      2: theme.warning || '#FF9800',
      3: theme.primary || '#2196F3',
      4: theme.success || '#4CAF50'
    };
    return colors[nivel] || '#757575';
  }, [theme]);

  // 🆕 Visualizar una versión histórica
  const handleViewVersion = useCallback((entry) => {
    if (!entry) {
      setViewingVersion(null); // Volver al actual
      return;
    }
    setViewingVersion(entry);
    console.log(`📜 Visualizando versión: Intento ${entry.attemptNumber}`);
  }, []);

  // 🆕 Restaurar versión antigua como actual
  const handleRestoreVersion = useCallback(() => {
    if (!viewingVersion || isSubmitted) return;

    // Restaurar contenido
    setResumen(viewingVersion.content.resumen);

    // Restaurar evaluación
    setEvaluacion(viewingVersion.feedback);

    // Configurar estado
    setViewingVersion(null);
    setIsLocked(true); // Se restaura bloqueado para que vea el feedback asociado

    // Guardar inmediatamente este cambio de estado
    // Nota: No incrementamos intentos ni borramos historial, solo "rebobinamos" el presente
    setTimeout(() => persistence.saveManual(), 100);

    console.log('rewind ⏪ Versión restaurada exitosamente');
  }, [viewingVersion, persistence, isSubmitted]);

  // Determine what to show: Current state or specific version
  const displayedResumen = viewingVersion ? viewingVersion.content.resumen : resumen;
  const displayedEvaluacion = viewingVersion ? viewingVersion.feedback : evaluacion;
  const _isReadOnly = !!viewingVersion || (isLocked && !viewingVersion); // Read only if viewing history OR locked current

  // Helper para obtener label por nivel
  const getNivelLabel = useCallback((nivel) => {
    const labels = {
      1: 'Insuficiente',
      2: 'Básico',
      3: 'Competente',
      4: 'Avanzado'
    };
    return labels[nivel] || 'En desarrollo';
  }, []);

  // Si no hay texto cargado
  if (!texto) {
    return (
      <EmptyState>
        <EmptyIcon>📚</EmptyIcon>
        <EmptyTitle theme={theme}>No hay texto cargado</EmptyTitle>
        <EmptyDescription theme={theme}>
          Carga un texto en "Lectura Guiada" y analízalo en "Análisis del Texto" para crear tu resumen académico.
        </EmptyDescription>
      </EmptyState>
    );
  }

  return (
    <Container>
      {/* Header */}
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <span>📝</span>
          Resumen Académico con Citas
        </HeaderTitle>
        <HeaderDescription theme={theme}>
          Demuestra tu comprensión analítica resumiendo las ideas centrales del texto con al menos 2 citas textuales.
        </HeaderDescription>
      </Header>

      {/* 🆕 Banner de Entrega Final - SIEMPRE después del Header */}
      {isSubmitted && (
        <SubmissionBanner
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={theme}
        >
          <span className="icon">✅</span>
          <span className="text">
            <strong>Tarea Entregada:</strong> No se pueden realizar más cambios.
          </span>
        </SubmissionBanner>
      )}

      {/* 🆕 Banner de cambio de nota por el docente */}
      <TeacherScoreOverrideBanner cloudData={teacherScoreOverride} theme={theme} />

      {/* Guía pedagógica colapsable - estilo expandir/colapsar */}
      <GuideSection theme={theme} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <GuideHeader onClick={() => setShowGuide(!showGuide)}>
          <GuideTitle theme={theme}>
            💡 ¿Cómo escribir un buen resumen académico?
          </GuideTitle>
          <ToggleIcon $expanded={showGuide}>▼</ToggleIcon>
        </GuideHeader>
        <AnimatePresence>
          {showGuide && (
            <GuideContent
              theme={theme}
              as={motion.div}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <GuideList>
                <GuideItem>
                  <strong>1. Identifica la tesis central:</strong> ¿Cuál es la idea principal que defiende el autor?
                </GuideItem>
                <GuideItem>
                  <strong>2. Usa citas textuales:</strong> Selecciona al menos 2 fragmentos representativos entre "comillas".
                </GuideItem>
                <GuideItem>
                  <strong>3. Parafrasea con tus palabras:</strong> No copies párrafos enteros, demuestra comprensión.
                </GuideItem>
                <GuideItem>
                  <strong>4. Construye inferencias:</strong> ¿Qué sugiere el autor sin decirlo explícitamente?
                </GuideItem>
              </GuideList>
            </GuideContent>
          )}
        </AnimatePresence>
      </GuideSection>

      {/* 🆕 Panel lateral de citas guardadas manualmente */}
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
              <h3 style={{ margin: 0 }}>� Cuaderno de Lectura</h3>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                {citasGuardadas.length === 0
                  ? 'Selecciona texto en "Lectura Guiada" y usa 📌 Cita o 📓 Anotar'
                  : 'Haz clic en "Insertar" para añadir al resumen'}
              </p>
            </CitasPanelHeader>

            <CitasList>
              {citasGuardadas.length === 0 ? (
                <EmptyCitasMessage theme={theme}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                  <p><strong>¿Cómo usar el Cuaderno?</strong></p>
                  <ol style={{ textAlign: 'left', lineHeight: 1.6 }}>
                    <li>Ve a la pestaña "Lectura Guiada"</li>
                    <li>Selecciona el texto importante</li>
                    <li>📌 <strong>Cita</strong> guarda el fragmento textual</li>
                    <li>📓 <strong>Anotar</strong> permite añadir reflexiones o comentarios</li>
                    <li>Regresa aquí para insertarlos en tu resumen</li>
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
                      <CitaTexto theme={theme}>{tipo === 'cita' ? cita.texto : cita.texto}</CitaTexto>
                      {cita.nota && tipo !== 'cita' && (
                        <CitaNota theme={theme}>📎 Sobre: «{cita.nota.length > 60 ? cita.nota.substring(0, 60) + '…' : cita.nota}»</CitaNota>
                      )}
                      {cita.nota && tipo === 'cita' && (
                        <CitaNota theme={theme}>📝 {cita.nota}</CitaNota>
                      )}
                      <CitaFooter>
                        <CitaInfo theme={theme}>
                          {new Date(cita.timestamp).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </CitaInfo>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isInsertable && (
                            <InsertarButton
                              onClick={() => insertarCita(cita.texto, tipo)}
                              theme={theme}
                            >
                              📌 Insertar
                            </InsertarButton>
                          )}
                          <EliminarButton
                            onClick={() => handleEliminarCita(cita.id)}
                            theme={theme}
                            title="Eliminar entrada"
                          >
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

      {/* Formulario del resumen */}
      <EditorSection>
        {/* 🆕 Ribbon de Historial - "Actual" primero, luego historial */}
        {history.length > 0 && (
          <HistoryRibbon theme={theme}>
            <HistoryTitle theme={theme}>Versiones:</HistoryTitle>

            <HistoryBadge
              $active={!viewingVersion}
              onClick={() => handleViewVersion(null)}
              theme={theme}
            >
              Actual
              <span className="score">En progreso</span>
            </HistoryBadge>

            {history.slice().reverse().map((entry, idx) => (
              <HistoryBadge
                key={idx}
                $active={viewingVersion && viewingVersion.timestamp === entry.timestamp}
                onClick={() => handleViewVersion(entry)}
                theme={theme}
              >
                Intento {entry.attemptNumber}
                <span className="score">★ {entry.score}</span>
              </HistoryBadge>
            ))}
          </HistoryRibbon>
        )}

        {/* 🆕 Banner de Restauración */}
        <AnimatePresence>
          {viewingVersion && (
            <RestoreBanner
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              theme={theme}
            >
              <span>
                👁️ Estás viendo el <strong>Intento {viewingVersion.attemptNumber}</strong> ({new Date(viewingVersion.timestamp).toLocaleString()}).
                Es de solo lectura.
              </span>
              <RestoreButton onClick={handleRestoreVersion} theme={theme}>
                🔄 Restaurar esta versión
              </RestoreButton>
            </RestoreBanner>
          )}
        </AnimatePresence>


        <EditorHeader>
          <Label theme={theme}>✏️ Tu resumen {viewingVersion ? '(Histórico)' : ''}</Label>
          <Stats>
            <Stat $valid={palabras >= 50} theme={theme}>
              {palabras} palabras
            </Stat>
            <Stat $valid={validacion.citasEncontradas >= 2} theme={theme}>
              {validacion.citasEncontradas} citas
            </Stat>
          </Stats>
        </EditorHeader>

        {/* 🆕 Mensaje de auto-guardado (solo si es actual) */}
        {!viewingVersion && resumen.length > 0 && (
          <AutoSaveMessage theme={theme}>
            💾 Tu trabajo se guarda automáticamente. Puedes cambiar de pestaña sin perder tu progreso.
          </AutoSaveMessage>
        )}

        {/* 🆕 Hints de atajos de teclado */}
        <AnimatePresence>
          {showShortcutsHint && (
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

        <ShortcutsBar theme={theme}>
          <ShortcutItem theme={theme}>
            <kbd>Ctrl</kbd> + <kbd>S</kbd> <span>Guardar</span>
          </ShortcutItem>
          <ShortcutItem theme={theme}>
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> <span>Evaluar</span>
          </ShortcutItem>
          <ShortcutItem theme={theme}>
            <kbd>Esc</kbd> <span>Cerrar</span>
          </ShortcutItem>
        </ShortcutsBar>

        <Textarea
          value={displayedResumen}
          onChange={(e) => !viewingVersion && !isSubmitted && setResumen(e.target.value)}
          onPaste={handlePaste}
          placeholder="Escribe tu resumen académico aquí..."
          rows={12}
          theme={theme}
          disabled={loading || !!viewingVersion || isSubmitted}
          spellCheck="false"
          style={isLocked ? { borderColor: theme.success || '#4CAF50' } : {}}
        />

        {/* 🔒 Mensaje cuando está bloqueado después de evaluar (no mostrar si ya entregó) */}
        {isLocked && !viewingVersion && !isSubmitted && (
          <LockedMessage theme={theme}>
            <LockIcon>🔒</LockIcon>
            <LockText>
              <strong>Resumen enviado a evaluación</strong>
              <span>Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".</span>
            </LockText>
            <UnlockButton onClick={handleSeguirEditando} theme={theme}>
              ✏️ Seguir Editando
            </UnlockButton>
          </LockedMessage>
        )}

        {/* 🆕 Mensaje de error cuando se intenta pegar desde fuente externa */}
        {pasteError && (
          <PasteErrorMessage theme={theme}>
            {pasteError}
          </PasteErrorMessage>
        )}

        {/* Validación en tiempo real */}
        {!viewingVersion && resumen.length > 0 && !validacion.valid && (
          <ValidationErrors theme={theme}>
            {validacion.errors.map((error, i) => (
              <ErrorItem key={i}>⚠️ {error}</ErrorItem>
            ))}
          </ValidationErrors>
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

        {/* Botón de evaluación */}
        <ActionButtons>
          <EvaluateButton
            onClick={handleEvaluar}
            disabled={!validacion.valid || loading || evaluationAttempts >= MAX_ATTEMPTS || !rateLimit.canProceed || isSubmitted || Boolean(viewingVersion)}
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
            {loading ? '⏳ Evaluando con IA Dual...' :
              viewingVersion ? '👁️ Modo Lectura' :
                evaluationAttempts >= MAX_ATTEMPTS ? '🚫 Intentos Agotados' :
                  !rateLimit.canProceed && rateLimit.nextAvailableIn > 0 ? `⏱️ Espera ${rateLimit.nextAvailableIn}s` :
                    rateLimit.remaining === 0 ? '🚦 Límite alcanzado' :
                      `🎓 Solicitar Evaluación (${MAX_ATTEMPTS - evaluationAttempts} restantes)`}
          </EvaluateButton>

          {/* 🆕 Botón de Entrega Final */}
          {!isSubmitted && evaluacion && !viewingVersion && !loading && (
            <SubmitButton onClick={handleSubmit} theme={theme}>
              🔒 Entregar Tarea
            </SubmitButton>
          )}
        </ActionButtons>
      </EditorSection>

      {/* 🆕 Barra de progreso durante evaluación */}
      <AnimatePresence>
        {loading && (
          <EvaluationProgressBar
            isEvaluating={loading}
            estimatedSeconds={30}
            currentStep={currentEvaluationStep}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Resultados de la evaluación */}
      <AnimatePresence>
        {displayedEvaluacion && (
          <ResultsSection
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            theme={theme}
          >
            <ResultsHeader theme={theme}>
              <ResultsTitle>
                <span>🎓</span>
                Evaluación Criterial de Comprensión Analítica {viewingVersion ? `(Histórico: Intento ${viewingVersion.attemptNumber})` : ''}
              </ResultsTitle>
              <NivelGlobalBadge $color={getNivelColor(displayedEvaluacion.nivel)}>
                Nivel {displayedEvaluacion.nivel}/4: {getNivelLabel(displayedEvaluacion.nivel)}
              </NivelGlobalBadge>
            </ResultsHeader>

            {/* Resumen de la dimensión */}
            {displayedEvaluacion.resumenDimension && (
              <ResumenDimension theme={theme}>
                {renderMarkdown(displayedEvaluacion.resumenDimension)}
              </ResumenDimension>
            )}

            {/* Criterios evaluados */}
            <CriteriosGrid>
              {displayedEvaluacion.criteriosEvaluados?.map((criterio, idx) => (
                <CriterioCard key={idx} theme={theme}>
                  <CriterioHeader>
                    <CriterioTitulo theme={theme}>
                      {criterio.criterio}
                    </CriterioTitulo>
                    <NivelBadge $color={getNivelColor(criterio.nivel)}>
                      Nivel {criterio.nivel}/4
                    </NivelBadge>
                  </CriterioHeader>

                  {/* Evidencias */}
                  {criterio.evidencia && criterio.evidencia.length > 0 && (
                    <EvidenciaSection>
                      <SectionLabel theme={theme}>📌 Evidencia detectada:</SectionLabel>
                      {criterio.evidencia.map((ev, i) => (
                        <EvidenciaItem key={i} theme={theme}>"{ev}"</EvidenciaItem>
                      ))}
                    </EvidenciaSection>
                  )}

                  {/* Fortalezas */}
                  {criterio.fortalezas && criterio.fortalezas.length > 0 && (
                    <FeedbackSection>
                      <SectionLabel $color={theme.success}>✨ Fortalezas:</SectionLabel>
                      <FeedbackList>
                        {criterio.fortalezas.map((f, i) => (
                          <FeedbackItem key={i} theme={theme}>{renderMarkdown(f)}</FeedbackItem>
                        ))}
                      </FeedbackList>
                    </FeedbackSection>
                  )}

                  {/* Mejoras */}
                  {criterio.mejoras && criterio.mejoras.length > 0 && (
                    <FeedbackSection>
                      <SectionLabel $color={theme.warning}>🌱 Áreas de mejora:</SectionLabel>
                      <FeedbackList>
                        {criterio.mejoras.map((m, i) => (
                          <FeedbackItem key={i} theme={theme}>{renderMarkdown(m)}</FeedbackItem>
                        ))}
                      </FeedbackList>
                    </FeedbackSection>
                  )}

                  {/* Fuente de la IA */}
                  <FuenteLabel theme={theme}>
                    Evaluado por: {criterio.fuente}
                  </FuenteLabel>
                </CriterioCard>
              ))}
            </CriteriosGrid>

            {/* Siguientes pasos */}
            {Array.isArray(evaluacion?.siguientesPasos) && evaluacion.siguientesPasos.length > 0 && (
              <SiguientesPasosCard theme={theme}>
                <SiguientesPasosTitle theme={theme}>
                  🚀 Siguientes pasos para mejorar
                </SiguientesPasosTitle>
                <SiguientesPasosList>
                  {evaluacion.siguientesPasos.map((paso, i) => (
                    <PasoItem key={i} theme={theme}>
                      {i + 1}. {renderMarkdown(paso)}
                    </PasoItem>
                  ))}
                </SiguientesPasosList>
              </SiguientesPasosCard>
            )}
          </ResultsSection>
        )}
      </AnimatePresence>
    </Container >
  );
};

// ============================================================
// STYLED COMPONENTS
// ============================================================

const Container = styled.div`
  padding: clamp(1rem, 3vw, 1.5rem);
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  background: linear-gradient(135deg, ${props => props.theme.primary || '#2196F3'} 0%, ${props => props.theme.primaryDark || props.theme.primary || '#1976D2'} 100%);
  border-radius: 12px;
  color: white;
`;

const HeaderTitle = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: white;
`;

const HeaderDescription = styled.p`
  margin: 0;
  font-size: clamp(0.85rem, 2.2vw, 0.95rem);
  opacity: 0.9;
  line-height: 1.5;
  color: white;
`;

// 🆕 Guía pedagógica estilo expandir/colapsar (consistente con otros artefactos)
const GuideSection = styled(motion.div)`
  background: ${props => props.theme.surface || '#ffffff'};
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const GuideHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`;

const GuideTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.text || '#333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
`;

const ToggleIcon = styled.span`
  transition: transform 0.3s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const GuideContent = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border || '#e0e0e0'};
`;

const GuideList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const GuideItem = styled.li`
  color: ${props => props.theme.textMuted || '#666'};
  font-size: 0.9rem;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.5;

  &::before {
    content: '💡';
    position: absolute;
    left: 0;
  }
`;

// 🆕 Componentes para Historial de Versiones
const HistoryRibbon = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: ${props => props.theme.surfaceAlt || '#f8f9fa'};
  border-bottom: 1px solid ${props => props.theme.border || '#e0e0e0'};
  overflow-x: auto;
  margin-bottom: 1rem;
  border-radius: 8px 8px 0 0;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border || '#ccc'};
    border-radius: 2px;
  }
`;

const HistoryTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${props => props.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
`;

const HistoryBadge = styled.button`
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid ${props => props.$active ? props.theme.primary : props.theme.border};
  background: ${props => props.$active ? props.theme.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : props.theme.textSecondary};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.$active ? props.theme.primaryHover : props.theme.background};
    border-color: ${props => props.theme.primary};
  }
  
  span.score {
    background: ${props => props.$active ? 'rgba(255,255,255,0.2)' : props.theme.surfaceAlt};
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    font-size: 0.75rem;
  }
`;

const RestoreBanner = styled(motion.div)`
  background: ${props => props.theme.warning}15;
  border: 1px solid ${props => props.theme.warning};
  color: ${props => props.theme.warning};
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
`;

const RestoreButton = styled.button`
  background: ${props => props.theme.warning};
  color: white;
  border: none;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`;

const EditorSection = styled.div`
  background: ${props => props.theme.cardBg || '#ffffff'};
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Label = styled.label`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const Stats = styled.div`
  display: flex;
  gap: 1rem;
`;

const Stat = styled.span`
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: ${props => props.$valid ? `${props.theme.success || '#4CAF50'}20` : `${props.theme.warning || '#FF9800'}20`};
  color: ${props => props.$valid ? props.theme.success || '#4CAF50' : props.theme.warning || '#FF9800'};
  font-weight: 600;
  font-size: 0.9rem;
`;

const Textarea = styled.textarea`
  width: 100%;
  max-width: 100%; /* Evitar desbordamiento horizontal */
  box-sizing: border-box; /* Asegurar padding dentro del ancho */
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid ${props => props.theme.border || '#e0e0e0'};
  background: ${props => props.$isLocked ? `${props.theme.surface || '#f5f5f5'}` : props.theme.background || '#fff'};
  color: ${props => props.theme.textPrimary || '#333'};
  font-size: clamp(0.9rem, 2.2vw, 0.95rem);
  line-height: 1.8;
  font-family: inherit;
  resize: vertical;
  min-height: 200px;
  overflow-y: auto; /* Scroll si el contenido es muy largo */
  white-space: pre-wrap; /* Mantener saltos de línea y ajustar */
  opacity: ${props => props.$isLocked ? 0.7 : 1};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary || '#2196F3'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${props => props.theme.surface || '#f5f5f5'};
  }

  @media (max-width: 640px) {
    min-height: 160px;
  }
`;

const LockedMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin-top: 1rem;
  background: linear-gradient(135deg, ${props => props.theme.primary}15, ${props => props.theme.info}10);
  border: 2px solid ${props => props.theme.primary}40;
  border-radius: 8px;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  border-radius: 8px;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SubmissionBanner = styled(motion.div)`
  background: ${props => `${props.theme.success || '#4CAF50'}10`};
  border: 1px solid ${props => props.theme.success || '#4CAF50'};
  color: ${props => props.theme.success || '#1b5e20'};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);

  .icon { font-size: 1.5rem; }
  .text { font-size: 1rem; }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover {
    background: ${props => props.theme.successDark || '#388E3C'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => `${props.theme.success || '#4CAF50'}40`};
  }
`;

const LockIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
`;

const LockText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  strong {
    color: ${props => props.theme.textPrimary};
    font-size: 1rem;
  }
  
  span {
    color: ${props => props.theme.textSecondary};
    font-size: 0.9rem;
  }
`;

const UnlockButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background: ${props => props.theme.primaryDark || props.theme.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.theme.primary}40;
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ValidationErrors = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${props => `${props.theme.warning || '#FF9800'}15`};
  border-left: 3px solid ${props => props.theme.warning || '#FF9800'};
  border-radius: 6px;
`;

const ErrorItem = styled.div`
  color: ${props => props.theme.textPrimary || '#333'};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const EvaluateButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.theme.primary || '#2196F3'};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  }
`;

const _SecondaryButton = styled.button`
  padding: 0.9rem 1.8rem;
  background: transparent;
  color: ${props => props.theme.primary || '#2196F3'};
  border: 2px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => `${props.theme.primary || '#2196F3'}10`};
    transform: translateY(-2px);
  }
`;

const ResultsSection = styled.div`
  background: ${props => props.theme.cardBg || '#ffffff'};
  border: 2px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 12px;
  padding: 2rem;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ResultsTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${props => props.theme.textPrimary || '#333'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const NivelGlobalBadge = styled.span`
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  background: ${props => props.$color};
  color: white;
  font-weight: 700;
  font-size: 1rem;
`;

const ResumenDimension = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${props => `${props.theme.primary || '#2196F3'}08`};
  border-radius: 8px;
  font-size: 1.05rem;
  line-height: 1.8;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const CriteriosGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const CriterioCard = styled.div`
  background: ${props => props.theme.surface || '#f5f5f5'};
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
`;

const CriterioHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const CriterioTitulo = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const NivelBadge = styled.span`
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: ${props => props.$color};
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
`;

const EvidenciaSection = styled.div`
  margin-bottom: 1rem;
`;

const SectionLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.$color || props.theme.textPrimary || '#333'};
  margin-bottom: 0.5rem;
`;

const EvidenciaItem = styled.div`
  padding: 0.75rem;
  background: ${props => props.theme.background || '#fff'};
  border-left: 3px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 4px;
  font-style: italic;
  color: ${props => props.theme.textSecondary || '#666'};
  margin-top: 0.5rem;
`;

const FeedbackSection = styled.div`
  margin-bottom: 1rem;
`;

const FeedbackList = styled.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
`;

const FeedbackItem = styled.li`
  margin-bottom: 0.5rem;
  line-height: 1.6;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const FuenteLabel = styled.div`
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${props => props.theme.border || '#e0e0e0'};
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary || '#666'};
  font-style: italic;
`;

const SiguientesPasosCard = styled.div`
  background: ${props => `${props.theme.success || '#4CAF50'}10`};
  border: 1px solid ${props => `${props.theme.success || '#4CAF50'}40`};
  border-radius: 8px;
  padding: 1.5rem;
`;

const SiguientesPasosTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const SiguientesPasosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PasoItem = styled.div`
  color: ${props => props.theme.textPrimary || '#333'};
  line-height: 1.6;
  font-size: 0.95rem;
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
  font-size: 1.75rem;
  margin-bottom: 8px;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const EmptyDescription = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.textSecondary || '#666'};
  max-width: 500px;
  line-height: 1.6;
`;

// 🆕 Styled Components para Panel de Citas
const CitasButton = styled.button`
  position: fixed;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  right: calc(1.25rem + env(safe-area-inset-right));
  z-index: 1001;
  padding: 0.7rem 1.2rem;
  background: ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.cardBg || '#fff'};
  color: ${props => props.$active ? '#fff' : props.theme.textPrimary};
  border: 2px solid ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.border};
  border-radius: 50px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  
  ${props => props.$hasNotification && !props.$active && `
    &:after {
      content: '';
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: ${props.theme.success || '#4CAF50'};
      border: 2px solid ${props.theme.cardBg || '#fff'};
      border-radius: 50%;
      animation: fabPulse 2s ease-in-out infinite;
    }
    @keyframes fabPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
  `}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    border-color: ${props => props.theme.warning || '#f59e0b'};
  }

  &:focus-visible {
    outline: 3px solid ${props => props.theme.primary || '#3190FC'};
    outline-offset: 2px;
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    bottom: calc(4rem + env(safe-area-inset-bottom));
    right: calc(1rem + env(safe-area-inset-right));
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
`;

const CitasPanel = styled.div`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: ${props => props.theme.surface};
  border-left: 2px solid ${props => props.theme.border};
  box-shadow: -4px 0 20px rgba(0,0,0,0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const CitasPanelHeader = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.primary};
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const CitasList = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
`;

const CitaItem = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`;

const CitaTexto = styled.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${props => props.theme.textPrimary};
  margin: 0 0 0.75rem 0;
  font-style: italic;
`;

const CitaFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CitaInfo = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const _CopiarButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.primaryHover};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const AutoSaveMessage = styled.div`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.success}15;
  border: 1px solid ${props => props.theme.success}40;
  border-radius: 6px;
  color: ${props => props.theme.success || '#4CAF50'};
  font-size: 0.85rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// 🆕 Nuevos componentes para sistema de citas mejorado
const PasteErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.danger}15;
  border: 1px solid ${props => props.theme.danger}40;
  border-radius: 6px;
  color: ${props => props.theme.danger || '#F44336'};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.5s ease;
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;

const EmptyCitasMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary};
  
  strong {
    color: ${props => props.theme.textPrimary};
    font-size: 1.1rem;
  }
  
  ol {
    margin-top: 1rem;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
`;

const CitaNota = styled.p`
  font-size: 0.8rem;
  line-height: 1.4;
  color: ${props => props.theme.primary};
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: ${props => props.theme.primary}10;
  border-left: 3px solid ${props => props.theme.primary};
  border-radius: 4px;
`;

const InsertarButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.successHover || '#45a049'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EliminarButton = styled.button`
  padding: 0.4rem 0.6rem;
  background: transparent;
  color: ${props => props.theme.danger || '#F44336'};
  border: 1px solid ${props => props.theme.danger || '#F44336'};
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.danger || '#F44336'};
    color: white;
  }
`;

const ShortcutsBar = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: ${props => props.theme.surfaceAlt || props.theme.background || '#f8f9fa'};
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    padding: 0.5rem;
  }
`;

const ShortcutItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary || '#666'};
  
  kbd {
    display: inline-block;
    padding: 0.2rem 0.4rem;
    background: ${props => props.theme.surface || '#fff'};
    border: 1px solid ${props => props.theme.border || '#ddd'};
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${props => props.theme.textPrimary || '#333'};
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  
  span {
    font-size: 0.75rem;
  }
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
    
    kbd {
      padding: 0.15rem 0.3rem;
      font-size: 0.7rem;
    }
  }
`;

const ShortcutsHint = styled.div`
  position: absolute;
  top: -40px;
  right: 0;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 10;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    right: 20px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${props => props.theme.success || '#4CAF50'};
  }
`;

export default ResumenAcademico;


