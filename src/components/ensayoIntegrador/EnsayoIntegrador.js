import React, { useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { AppContext } from '../../context/AppContext';
import { validateEssayFormat } from '../../services/essayFormatValidator';
import { evaluateEssayDual, EssayEvaluationError } from '../../services/ensayoIntegrador.service';
import { getDraftKey } from '../../services/sessionManager';
import EnsayoDimensionSelector from './EnsayoDimensionSelector';
import EnsayoPrerequisites from './EnsayoPrerequisites';
import EnsayoGuidelines from './EnsayoGuidelines';
import EnsayoEditor from './EnsayoEditor';
import EssayFeedbackPanel from './EssayFeedbackPanel';
import TeacherScoreOverrideBanner from '../artefactos/TeacherScoreOverrideBanner';

import logger from '../../utils/logger';
const Section = styled.section`
  margin-top: 1.5rem;
`;

const Header = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1rem;
`;

const Title = styled.h3`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 1.2rem;
`;

const Subtitle = styled.p`
  margin: 0.5rem 0 0 0;
  color: ${props => props.theme.textMuted};
  line-height: 1.5;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
`;

const AttemptPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid ${props => (props.$highlight ? props.theme.primary : props.theme.border)};
  border-radius: 999px;
  background: ${props => (props.$highlight ? props.theme.surface : props.theme.background)};
  color: ${props => props.theme.text};
  font-weight: 800;
  font-size: 0.85rem;
`;

const AttemptHint = styled.div`
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  font-weight: 600;
`;

const Button = styled.button`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Primary = styled(Button)`
  background: ${props => props.theme.success};
  color: white;

  &:hover:not(:disabled) {
    opacity: 0.95;
  }
`;

const Secondary = styled(Button)`
  background: transparent;
  color: ${props => props.theme.text};
  border: 1px solid ${props => props.theme.border};

  &:hover:not(:disabled) {
    border-color: ${props => props.theme.primary};
  }
`;

const ErrorBox = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-left: 4px solid ${props => props.theme.danger || props.theme.primary};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: ${props => props.theme.text};
`;

const InfoBox = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-left: 4px solid ${props => props.theme.primary};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: ${props => props.theme.text};
`;

const Checklist = styled.ul`
  margin: 0.35rem 0 0 1.25rem;
  color: ${props => props.theme.text};
  line-height: 1.45;
`;

// 🆕 Animaciones para el indicador de progreso
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const EvaluationProgress = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.primary}10, ${props => props.theme.surface});
  border: 1px solid ${props => props.theme.primary}40;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
`;

const ProgressTitle = styled.div`
  font-weight: 700;
  font-size: 1.05rem;
  color: ${props => props.theme.text};
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Spinner = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid ${props => props.theme.primary}30;
  border-top-color: ${props => props.theme.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const ProgressSteps = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin: 1rem 0;
  flex-wrap: wrap;
`;

const ProgressStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  opacity: ${props => props.$active ? 1 : 0.4};
  animation: ${props => props.$active ? pulse : 'none'} 1.5s ease-in-out infinite;
`;

const StepIcon = styled.div`
  font-size: 1.5rem;
`;

const StepLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  font-weight: 600;
`;

const DraftBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$cloud ? props.theme.primary + '15' : props.theme.success + '15'};
  color: ${props => props.$cloud ? props.theme.primary : props.theme.success};
  border: 1px solid ${props => props.$cloud ? props.theme.primary + '30' : props.theme.success + '30'};
  transition: opacity 0.3s ease;
`;

const CloudButton = styled(Button)`
  background: ${props => props.theme.primary}15;
  color: ${props => props.theme.primary};
  border: 1px solid ${props => props.theme.primary}40;
  font-size: 0.85rem;

  &:hover:not(:disabled) {
    background: ${props => props.theme.primary}25;
  }
`;

const DRAFT_SAVE_DELAY = 800; // ms debounce para auto-guardado

const ProgressHint = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
  margin-top: 0.5rem;
`;

const DIMENSION_TO_RUBRIC = {
  comprension_analitica: 'rubrica1',
  acd: 'rubrica2',
  contextualizacion: 'rubrica3',
  argumentacion: 'rubrica4'
};

const RUBRIC_TO_DIMENSION = Object.entries(DIMENSION_TO_RUBRIC).reduce((acc, [dimensionId, rubricId]) => {
  acc[rubricId] = dimensionId;
  return acc;
}, {});

export default function EnsayoIntegrador({ theme }) {
  const {
    texto,
    rubricProgress,
    currentTextoId,
    sourceCourseId,
    checkEssayPrerequisites,
    submitSummativeEssay,
    getCitations
  } = useContext(AppContext);

  const [dimension, setDimension] = useState(null);
  const [essayText, setEssayText] = useState('');
  const [formatErrors, setFormatErrors] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluationPhase, setEvaluationPhase] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [prefillBlocked, setPrefillBlocked] = useState(false);
  const [prefillHint, setPrefillHint] = useState(null);
  const [partialEvaluation, setPartialEvaluation] = useState(null);
  const [draftStatus, setDraftStatus] = useState(null); // 'saving' | 'saved-local' | 'saved-cloud' | null
  const [cloudSaving, setCloudSaving] = useState(false);

  const draftTimerRef = useRef(null);
  const draftStatusTimerRef = useRef(null);
  const initialDraftLoadedRef = useRef(false);

  // 🆕 Citas guardadas del documento actual
  const citations = useMemo(() => {
    if (!getCitations || !currentTextoId) return [];
    try {
      return getCitations(currentTextoId) || [];
    } catch {
      return [];
    }
  }, [getCitations, currentTextoId]);

  // --- Helper: claves de sessionStorage namespaced ---
  const draftTextKey = useMemo(() => getDraftKey('ensayoIntegrador_text', currentTextoId, sourceCourseId), [currentTextoId, sourceCourseId]);
  const draftDimKey = useMemo(() => getDraftKey('ensayoIntegrador_dimension', currentTextoId, sourceCourseId), [currentTextoId, sourceCourseId]);

  // rubricId necesita estar antes de los callbacks que lo usan
  const rubricId = dimension ? DIMENSION_TO_RUBRIC[dimension] : null;

  // --- Cleanup de todos los timers al desmontar ---
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (draftStatusTimerRef.current) clearTimeout(draftStatusTimerRef.current);
    };
  }, []);

  // --- Auto-guardar en sessionStorage con debounce ---
  useEffect(() => {
    // No guardar en draft durante carga inicial ni si está vacío
    if (!initialDraftLoadedRef.current) return;
    if (!essayText.trim() && !dimension) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    draftTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(draftTextKey, essayText);
        if (dimension) sessionStorage.setItem(draftDimKey, dimension);
        setDraftStatus('saved-local');
        // Auto-ocultar badge después de 3s
        if (draftStatusTimerRef.current) clearTimeout(draftStatusTimerRef.current);
        draftStatusTimerRef.current = setTimeout(() => setDraftStatus(null), 3000);
      } catch (e) {
        logger.warn('⚠️ [EnsayoIntegrador] Error guardando borrador local:', e);
      }
    }, DRAFT_SAVE_DELAY);

    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [essayText, dimension, draftTextKey, draftDimKey]);

  // --- Cargar borrador de sessionStorage al montar / cambiar textoId ---
  useEffect(() => {
    // Resetear estado al cambiar de texto para evitar stale closures
    initialDraftLoadedRef.current = false;
    setEssayText('');
    setDimension(null);
    setPrefillBlocked(false);
    setPrefillHint(null);
    setEvaluation(null);
    setSubmitError(null);
    setFormatErrors([]);
    setDraftStatus(null);

    try {
      const savedText = sessionStorage.getItem(draftTextKey);
      const savedDim = sessionStorage.getItem(draftDimKey);

      if (savedDim) {
        setDimension(savedDim);
      }
      if (savedText && savedText.trim().length > 0) {
        setEssayText(savedText);
        setPrefillHint('Se restauró tu borrador local guardado.');
      }
    } catch (e) {
      logger.warn('⚠️ [EnsayoIntegrador] Error cargando borrador local:', e);
    }
    // Marcar que ya se intentó cargar el draft inicial
    initialDraftLoadedRef.current = true;
  }, [draftTextKey, draftDimKey]);

  // --- Guardar borrador en la nube (explícito) ---
  const handleSaveDraftToCloud = useCallback(() => {
    if (!dimension || !rubricId || !essayText.trim() || cloudSaving || !submitSummativeEssay) return;

    setCloudSaving(true);
    setDraftStatus('saving');

    try {
      submitSummativeEssay(rubricId, {
        textoId: currentTextoId || null,
        status: 'draft',
        essayContent: essayText,
        dimension,
      });

      setDraftStatus('saved-cloud');
      if (draftStatusTimerRef.current) clearTimeout(draftStatusTimerRef.current);
      draftStatusTimerRef.current = setTimeout(() => setDraftStatus(null), 4000);
    } catch (e) {
      logger.error('❌ [EnsayoIntegrador] Error guardando borrador en nube:', e);
      setDraftStatus(null);
    } finally {
      setCloudSaving(false);
    }
  }, [dimension, rubricId, essayText, cloudSaving, submitSummativeEssay, currentTextoId]);

  // --- Insertar entrada del cuaderno en el editor (posición del cursor gestionada por EnsayoEditor) ---
  const handleInsertCitation = useCallback((citationText, insertionSelection, tipo = 'cita') => {
    setEssayText(prev => {
      // Citas textuales van entre «», reflexiones/comentarios van como texto directo
      const formatted = tipo === 'cita' ? `«${citationText}»` : citationText;

      let start = null;
      let end = null;

      if (typeof insertionSelection === 'number') {
        start = insertionSelection;
        end = insertionSelection;
      } else if (insertionSelection && typeof insertionSelection === 'object') {
        start = Number.isFinite(Number(insertionSelection.start)) ? Number(insertionSelection.start) : null;
        end = Number.isFinite(Number(insertionSelection.end)) ? Number(insertionSelection.end) : start;
      }

      // Si se proporciona selección/posición válida, insertar/reemplazar ahí; si no, al final
      if (start != null && end != null && start >= 0 && end >= start && end <= prev.length) {
        return prev.slice(0, start) + formatted + prev.slice(end);
      }

      const separator = prev.trim().length > 0 ? '\n\n' : '';
      return prev + separator + formatted;
    });
    if (formatErrors.length) setFormatErrors([]);
  }, [formatErrors]);

  const prereq = useMemo(() => {
    try {
      return checkEssayPrerequisites ? checkEssayPrerequisites({ minScoreEach: 5.0 }) : null;
    } catch {
      return null;
    }
  }, [checkEssayPrerequisites, rubricProgress]);

  const attemptsUsed = useMemo(() => {
    if (!rubricId) return 0;
    const s = rubricProgress?.[rubricId]?.summative;
    return Number(s?.attemptsUsed || 0) || 0;
  }, [rubricProgress, rubricId]);

  const allowRevision = useMemo(() => {
    if (!rubricId) return false;
    const s = rubricProgress?.[rubricId]?.summative;
    return Boolean(s?.allowRevision);
  }, [rubricProgress, rubricId]);

  const maxAttempts = allowRevision ? 2 : 1;
  const isLockedByAttempts = Boolean(rubricId && attemptsUsed >= maxAttempts);

  const isRevisionContext = Boolean(rubricId && allowRevision && attemptsUsed === 1 && !isLockedByAttempts);

  const savedSummative = useMemo(() => {
    if (!rubricId) return null;
    return rubricProgress?.[rubricId]?.summative || null;
  }, [rubricProgress, rubricId]);

  const globalSubmittedEssay = useMemo(() => {
    const rubricEntries = Object.values(DIMENSION_TO_RUBRIC);

    for (const candidateRubricId of rubricEntries) {
      const summative = rubricProgress?.[candidateRubricId]?.summative;
      if (!summative) continue;

      const status = String(summative.status || '').toLowerCase();
      const attemptsUsed = Number(summative.attemptsUsed || 0);
      const hasNumericScore =
        summative?.score !== null &&
        summative?.score !== undefined &&
        Number.isFinite(Number(summative.score));

      const hasSubmission =
        status === 'submitted' ||
        status === 'graded' ||
        attemptsUsed > 0 ||
        Number(summative.submittedAt || 0) > 0 ||
        Number(summative.gradedAt || 0) > 0 ||
        hasNumericScore;

      if (!hasSubmission) continue;

      return {
        rubricId: candidateRubricId,
        dimension: RUBRIC_TO_DIMENSION[candidateRubricId],
        status
      };
    }

    return null;
  }, [rubricProgress]);

  const isGlobalEssayLocked = Boolean(globalSubmittedEssay);
  const globallyLockedDimension = globalSubmittedEssay?.dimension || null;

  useEffect(() => {
    if (!isGlobalEssayLocked || !globallyLockedDimension) return;
    if (dimension === globallyLockedDimension) return;
    setDimension(globallyLockedDimension);
  }, [isGlobalEssayLocked, globallyLockedDimension, dimension]);

  const savedEssayContent = useMemo(() => {
    // Priorizar borrador de nube sobre versión calificada
    // Solo usar draft si la dimensión coincide con la actual
    const draft = savedSummative?.draftContent;
    const draftDim = savedSummative?.draftDimension;
    const submitted = savedSummative?.essayContent;
    const useDraft = typeof draft === 'string' && draft.trim() && draftDim === dimension;
    const content = useDraft ? draft : submitted;
    return typeof content === 'string' ? content : '';
  }, [savedSummative, dimension]);

  const savedEvaluation = useMemo(() => {
    if (!savedSummative) return null;
    if (savedSummative.status !== 'graded') return null;

    const feedback = savedSummative.feedback || {};
    return {
      __source: 'saved',
      score: savedSummative.teacherOverrideScore ?? savedSummative.score,
      nivel: savedSummative.nivel,
      fortalezas: feedback.fortalezas,
      debilidades: feedback.debilidades,
      recomendaciones: feedback.recomendaciones,
      evaluators: savedSummative.evaluators,
      submittedAt: savedSummative.submittedAt,
      gradedAt: savedSummative.gradedAt,
      attemptsUsed: savedSummative.attemptsUsed
    };
  }, [savedSummative]);

  const teacherScoreOverride = useMemo(() => {
    if (!savedSummative || savedSummative.teacherOverrideScore == null) return null;
    return {
      teacherOverrideScore: savedSummative.teacherOverrideScore,
      scoreOverrideReason: savedSummative.scoreOverrideReason,
      scoreOverriddenAt: savedSummative.scoreOverriddenAt,
      docenteNombre: savedSummative.docenteNombre
    };
  }, [savedSummative]);

  const teacherCommentData = useMemo(() => {
    if (!savedSummative?.teacherComment) return null;
    const timestamp = savedSummative.commentedAt;
    const formattedDate = timestamp
      ? new Date(timestamp).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
      : null;

    return {
      comment: savedSummative.teacherComment,
      docenteNombre: savedSummative.docenteNombre,
      commentedAt: formattedDate
    };
  }, [savedSummative]);

  const canAccess = Boolean(prereq?.canAccess);

  const attemptSummary = useMemo(() => {
    if (!rubricId) return null;
    const used = Math.min(attemptsUsed, maxAttempts);
    const base = `Intentos: ${used}/${maxAttempts}`;

    if (allowRevision) {
      if (isLockedByAttempts) return { base, hint: 'Revisión no disponible (máximo alcanzado).' };
      if (used === 0) return { base, hint: 'Incluye 1 revisión opcional.' };
      if (used === 1) return { base, hint: 'Revisión disponible (último intento).' };
      return { base, hint: 'Revisión no disponible.' };
    }

    return { base, hint: 'Sin revisión.' };
  }, [rubricId, attemptsUsed, maxAttempts, allowRevision, isLockedByAttempts]);

  const submitLabel = useMemo(() => {
    if (!rubricId) return 'Enviar ensayo';
    if (loading) return 'Evaluando…';
    if (allowRevision && attemptsUsed === 1 && !isLockedByAttempts) return 'Enviar revisión';
    return 'Enviar ensayo';
  }, [rubricId, loading, allowRevision, attemptsUsed, isLockedByAttempts]);

  const displayEvaluation = useMemo(() => {
    const base = evaluation || savedEvaluation;
    if (!base) return null;
    const overrideScore = savedSummative?.teacherOverrideScore;
    if (overrideScore > 0) {
      return { ...base, score: overrideScore };
    }
    return base;
  }, [evaluation, savedEvaluation, savedSummative]);

  const showRevisionTip = Boolean(
    displayEvaluation?.__source === 'saved'
    && allowRevision
    && attemptsUsed === 1
    && !isLockedByAttempts
  );

  // ✅ Prefill: si hay ensayo guardado y el editor está vacío, cargarlo.
  // Prioridad: sessionStorage draft > cloud draft > submitted essay
  // - No sobrescribe si ya hay texto.
  // - Si el usuario hace "Limpiar", no se vuelve a precargar hasta cambiar de dimensión.
  React.useEffect(() => {
    if (!rubricId) {
      setPrefillHint(null);
      return;
    }

    // Al cambiar de dimensión, re-habilitar el prefill.
    setPrefillBlocked(false);
    setPrefillHint(null);
  }, [rubricId]);

  // Ref para evitar re-ejecutar prefill en cada keystroke
  const essayTextRef = useRef(essayText);
  essayTextRef.current = essayText;

  React.useEffect(() => {
    if (!rubricId) return;
    if (prefillBlocked) return;
    if (loading) return;
    if (essayTextRef.current.trim() !== '') return;

    // sessionStorage ya se cargó en el efecto de arriba, solo precargar desde cloud/submitted
    const localDraft = sessionStorage.getItem(draftTextKey);
    if (localDraft && localDraft.trim().length > 0) return; // Ya cargado desde sessionStorage

    if (savedEssayContent.trim() !== '') {
      setEssayText(savedEssayContent);
      const source = savedSummative?.draftContent ? 'borrador en la nube' : 'versión anterior calificada';
      setPrefillHint(
        isRevisionContext
          ? `Modo revisión: se cargó tu ${source}.`
          : `Se cargó tu ${source} para esta dimensión.`
      );
    }
  }, [rubricId, prefillBlocked, loading, savedEssayContent, isRevisionContext, draftTextKey, savedSummative?.draftContent]);

  const onGoToActivities = useCallback(() => {
    window.dispatchEvent(new CustomEvent('app-change-tab', { detail: { tabId: 'actividades' } }));
  }, []);

  const handleSubmit = useCallback(async () => {
    // Cancelar auto-save pendiente para evitar race condition con limpieza de sessionStorage
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    setSubmitError(null);
    setFormatErrors([]);
    setEvaluationPhase('validating'); // 🆕 Fase 1

    if (!canAccess) {
      setSubmitError('No cumples los prerequisitos para enviar el ensayo.');
      setEvaluationPhase(null);
      return;
    }

    if (!dimension || !rubricId) {
      setSubmitError('Selecciona una dimensión antes de enviar.');
      setEvaluationPhase(null);
      return;
    }

    if (isGlobalEssayLocked) {
      setSubmitError('Ya enviaste tu ensayo integrador. Solo se permite un envío total por lectura.');
      setEvaluationPhase(null);
      return;
    }

    if (isLockedByAttempts) {
      setSubmitError('Ya utilizaste tus intentos de ensayo para esta dimensión.');
      setEvaluationPhase(null);
      return;
    }

    const formatCheck = validateEssayFormat(essayText);
    if (!formatCheck.valid) {
      setFormatErrors(formatCheck.errors || ['Formato inválido.']);
      setEvaluationPhase(null);
      return;
    }

    setLoading(true);
    setEvaluationPhase('evaluating'); // 🆕 Fase 2
    try {
      const result = await evaluateEssayDual({
        texto,
        essayText,
        dimension
      });

      setEvaluationPhase('combining'); // 🆕 Fase 3
      // Pequeña pausa para que el usuario vea la fase de combinación
      await new Promise(r => setTimeout(r, 400));

      setEvaluation(result);

      // 🆕 FIX: Registrar si la evaluación fue parcial (un proveedor falló)
      if (result.partial && result.failedProviders?.length > 0) {
        setPartialEvaluation({
          partial: true,
          failedProviders: result.failedProviders
        });
      } else {
        setPartialEvaluation(null);
      }

      if (submitSummativeEssay) {
        const nextAttemptsUsed = Math.min(attemptsUsed + 1, maxAttempts);
        submitSummativeEssay(rubricId, {
          textoId: currentTextoId || null,
          status: 'graded',
          submittedAt: Date.now(),
          gradedAt: Date.now(),
          attemptsUsed: nextAttemptsUsed,
          score: result.score,
          nivel: result.nivel,
          essayContent: essayText,
          feedback: {
            fortalezas: result.fortalezas,
            debilidades: result.debilidades,
            recomendaciones: result.recomendaciones
          },
          evaluators: result.evaluators,
          dimension: result.dimension
        });

        // 🆕 Limpiar borrador local tras envío exitoso
        try {
          sessionStorage.removeItem(draftTextKey);
          sessionStorage.removeItem(draftDimKey);
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      // 🆕 Usar mensaje amigable si es EssayEvaluationError
      if (err instanceof EssayEvaluationError) {
        setSubmitError(err.userMessage);
        logger.error('📝 [EnsayoIntegrador] Error de evaluación:', {
          code: err.code,
          message: err.message,
          details: err.details
        });
      } else {
        setSubmitError(err instanceof Error ? err.message : String(err));
        logger.error('📝 [EnsayoIntegrador] Error inesperado:', err);
      }
    } finally {
      setLoading(false);
      setEvaluationPhase(null);
    }
  }, [canAccess, dimension, rubricId, isGlobalEssayLocked, isLockedByAttempts, essayText, texto, submitSummativeEssay, currentTextoId, attemptsUsed, maxAttempts, draftTextKey, draftDimKey]);

  const handleReset = useCallback(() => {
    setEssayText('');
    setFormatErrors([]);
    setSubmitError(null);
    setEvaluation(null);
    setPrefillBlocked(true);
    setPrefillHint(null);
    setPartialEvaluation(null);
    setDraftStatus(null);
    // 🆕 Limpiar borrador local
    try {
      sessionStorage.removeItem(draftTextKey);
      // No limpiar la dimensión — el usuario puede querer mantenerla
    } catch (e) { /* ignore */ }
  }, [draftTextKey]);

  return (
    <Section aria-label="Ensayo Integrador" theme={theme}>
      <Header theme={theme}>
        <Title theme={theme}>📝 Ensayo Integrador (Sumativo)</Title>
        <Subtitle theme={theme}>
          Disponible tras completar los 4 artefactos obligatorios. Elige una dimensión y envía un único ensayo (800–1200 palabras) para evaluación dual.
        </Subtitle>
      </Header>

      <Grid>
        <EnsayoPrerequisites
          theme={theme}
          prerequisitesResult={prereq}
          onGoToActivities={onGoToActivities}
        />

        <EnsayoDimensionSelector
          theme={theme}
          value={dimension}
          onChange={(d) => {
            if (isGlobalEssayLocked) return;
            setDimension(d);
            setSubmitError(null);
            setFormatErrors([]);
            setEvaluation(null);
            setPrefillHint(null);
          }}
          disabled={!canAccess || loading || isGlobalEssayLocked}
        />

        <EnsayoGuidelines theme={theme} />

        <EnsayoEditor
          theme={theme}
          value={essayText}
          onChange={(t) => {
            setEssayText(t);
            if (formatErrors.length) setFormatErrors([]);
          }}
          disabled={!canAccess || loading || isLockedByAttempts || isGlobalEssayLocked}
          citations={citations}
          onInsertCitation={handleInsertCitation}
        />

        {isGlobalEssayLocked && (
          <InfoBox theme={theme}>
            🔒 Ya registraste tu ensayo integrador en la dimensión <strong>{globallyLockedDimension}</strong>. El envío quedó cerrado para todas las dimensiones.
          </InfoBox>
        )}

        {isLockedByAttempts && (
          <ErrorBox theme={theme}>
            🔒 Ya utilizaste tus intentos para esta dimensión ({Math.min(attemptsUsed, maxAttempts)}/{maxAttempts}).
          </ErrorBox>
        )}

        {formatErrors.length > 0 && (
          <ErrorBox theme={theme}>
            <div style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Revisa el formato:</div>
            <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
              {formatErrors.map((e, idx) => <li key={`fe-${idx}`}>{e}</li>)}
            </ul>
          </ErrorBox>
        )}

        {submitError && (
          <ErrorBox theme={theme}>
            <div style={{ fontWeight: 800 }}>Error:</div>
            <div>{submitError}</div>
          </ErrorBox>
        )}

        <Actions>
          {attemptSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <AttemptPill
                theme={theme}
                aria-label="Intentos del Ensayo Integrador"
                $highlight={isRevisionContext}
              >
                🎯 {attemptSummary.base}
              </AttemptPill>
              <AttemptHint theme={theme}>
                {prefillHint ? `${prefillHint} — ${attemptSummary.hint}` : attemptSummary.hint}
              </AttemptHint>
            </div>
          ) : (
            <AttemptHint theme={theme}>Selecciona una dimensión para ver tus intentos.</AttemptHint>
          )}

          <ButtonGroup>
            {draftStatus && (
              <DraftBadge theme={theme} $cloud={draftStatus === 'saved-cloud'}>
                {draftStatus === 'saving' && '⏳ Guardando...'}
                {draftStatus === 'saved-local' && '💾 Borrador local guardado'}
                {draftStatus === 'saved-cloud' && '☁️ Guardado (sincronizando nube)'}
              </DraftBadge>
            )}
            <CloudButton
              theme={theme}
              type="button"
              onClick={handleSaveDraftToCloud}
              disabled={loading || cloudSaving || !dimension || !essayText.trim() || isLockedByAttempts || isGlobalEssayLocked}
              title="Guardar borrador (sincronización en segundo plano)"
            >
              ☁️ Guardar
            </CloudButton>
            <Secondary theme={theme} type="button" onClick={handleReset} disabled={loading}>
              Limpiar
            </Secondary>
            <Primary
              theme={theme}
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canAccess || !dimension || isLockedByAttempts || isGlobalEssayLocked || !essayText.trim()}
            >
              {submitLabel}
            </Primary>
          </ButtonGroup>
        </Actions>

        {showRevisionTip && (
          <InfoBox theme={theme}>
            💡 Tienes una <strong>revisión disponible</strong>. Usa el feedback guardado para mejorar tu ensayo y luego envía la revisión (último intento).
          </InfoBox>
        )}

        {isRevisionContext && (
          <InfoBox theme={theme}>
            <div style={{ fontWeight: 800 }}>Checklist de revisión (rápido)</div>
            <Checklist theme={theme}>
              <li>Corrige al menos 2 puntos del feedback (debilidades/recomendaciones).</li>
              <li>Refuerza tu evidencia (citas/ejemplos) y conecta mejor con tu tesis.</li>
              <li>Revisa estructura y coherencia (introducción → desarrollo → cierre) manteniendo 800–1200 palabras.</li>
            </Checklist>
          </InfoBox>
        )}

        {/* 🆕 Indicador de progreso durante evaluación */}
        {loading && evaluationPhase && (
          <EvaluationProgress theme={theme}>
            <ProgressTitle theme={theme}>
              <Spinner theme={theme} />
              Evaluando tu ensayo...
            </ProgressTitle>
            <ProgressSteps>
              <ProgressStep theme={theme} $active={evaluationPhase === 'validating'}>
                <StepIcon>📋</StepIcon>
                <StepLabel theme={theme}>Validando formato</StepLabel>
              </ProgressStep>
              <ProgressStep theme={theme} $active={evaluationPhase === 'evaluating'}>
                <StepIcon>🤖</StepIcon>
                <StepLabel theme={theme}>Evaluación dual IA</StepLabel>
              </ProgressStep>
              <ProgressStep theme={theme} $active={evaluationPhase === 'combining'}>
                <StepIcon>⚖️</StepIcon>
                <StepLabel theme={theme}>Combinando resultados</StepLabel>
              </ProgressStep>
            </ProgressSteps>
            <ProgressHint theme={theme}>
              {evaluationPhase === 'validating' && 'Verificando requisitos de formato...'}
              {evaluationPhase === 'evaluating' && 'Dos evaluadores IA analizan tu ensayo (10-20 seg)...'}
              {evaluationPhase === 'combining' && 'Promediando puntajes y consolidando feedback...'}
            </ProgressHint>
          </EvaluationProgress>
        )}

        {partialEvaluation?.partial && (
          <InfoBox theme={theme} style={{ borderLeftColor: theme.warning || '#f59e0b' }}>
            ⚠️ <strong>Evaluación parcial:</strong> Uno de los evaluadores IA no respondió ({partialEvaluation.failedProviders?.map(f => f.provider).join(', ')}). 
            El puntaje se calculó con el evaluador disponible.
          </InfoBox>
        )}

        <TeacherScoreOverrideBanner cloudData={teacherScoreOverride} theme={theme} />

        {teacherCommentData && (
          <InfoBox theme={theme} style={{ borderLeftColor: theme.primary || '#2563eb' }}>
            💬 <strong>Comentario del docente{teacherCommentData.docenteNombre ? ` (${teacherCommentData.docenteNombre})` : ''}:</strong>
            <div style={{ marginTop: '0.35rem' }}>{teacherCommentData.comment}</div>
            {teacherCommentData.commentedAt && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', opacity: 0.75 }}>
                {teacherCommentData.commentedAt}
              </div>
            )}
          </InfoBox>
        )}

        <EssayFeedbackPanel theme={theme} evaluation={displayEvaluation} />
      </Grid>
    </Section>
  );
}
