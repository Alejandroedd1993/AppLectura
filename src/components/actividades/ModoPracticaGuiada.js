import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { AppContext } from '../../context/AppContext';
import GuidedPracticeMode from '../evaluacion/GuidedPracticeMode';
import HintsSystem from '../evaluacion/HintsSystem';
import { evaluarRespuesta, generarPregunta, generarHintsParaPregunta, generarDesafioCruzado } from '../../services/evaluacionIntegral.service';
import { evaluarConRetry, generarConRetry } from '../../services/retryWrapper';
import { useRewards } from '../../context/PedagogyContext';
import usePracticeHistory from '../../hooks/usePracticeHistory';

const Box = styled.div`
  background: ${p => p.theme.cardBg};
  border: 1px solid ${p => p.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
`;

const Title = styled.h3`
  margin: 0 0 0.5rem 0;
  color: ${p => p.theme.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Subtitle = styled.p`
  margin: 0 0 1rem 0;
  color: ${p => p.theme.textSecondary};
  line-height: 1.5;
`;

const DimGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
`;

const DimBtn = styled.button`
  background: ${p => p.$selected ? p.theme.primary : 'transparent'};
  color: ${p => p.$selected ? 'white' : p.theme.textPrimary};
  border: 2px solid ${p => p.$selected ? p.theme.primary : p.theme.border};
  border-radius: 10px;
  padding: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &:hover {
    transform: translateY(-1px);
    background: ${p => p.$selected ? p.theme.primary : p.theme.surface};
  }
`;

const Small = styled.div`
  font-size: 0.85rem;
  opacity: 0.9;
  font-weight: 600;
`;

const PracticeCard = styled.div`
  margin-top: 1rem;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: 12px;
  padding: 1.25rem;
`;

const PracticeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const PracticeTitle = styled.h4`
  margin: 0;
  color: ${p => p.theme.textPrimary};
  font-size: 1.05rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Meta = styled.div`
  font-size: 0.8rem;
  color: ${p => p.theme.textSecondary};
`;

const QuestionBox = styled.div`
  background: ${p => p.theme.background};
  border: 1px solid ${p => p.theme.border};
  border-radius: 10px;
  padding: 1rem;
  color: ${p => p.theme.textPrimary};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const AnswerLabel = styled.div`
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: ${p => p.theme.textSecondary};
  font-weight: 700;
  font-size: 0.9rem;
`;

const AnswerArea = styled.textarea`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: block;
  min-height: 140px;
  resize: vertical;
  padding: 0.9rem;
  border-radius: 10px;
  border: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.background};
  color: ${p => p.theme.textPrimary};
  outline: none;
  line-height: 1.5;

  &:focus {
    border-color: ${p => p.theme.primary};
    box-shadow: 0 0 0 3px ${p => p.theme.primary}22;
  }
`;

const ActionsRow = styled.div`
  margin-top: 0.9rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  background: ${p => (p.$variant === 'primary' ? p.theme.primary : 'transparent')};
  color: ${p => (p.$variant === 'primary' ? 'white' : p.theme.textPrimary)};
  border: 2px solid ${p => (p.$variant === 'primary' ? p.theme.primary : p.theme.border)};
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-weight: 800;
  cursor: pointer;
  opacity: ${p => (p.disabled ? 0.6 : 1)};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: ${p => (p.$variant === 'primary' ? p.theme.primary : p.theme.surface)};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const Message = styled.div`
  margin-top: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px solid ${p => (p.$type === 'error' ? p.theme.error : p.theme.border)};
  background: ${p => (p.$type === 'error' ? `${p.theme.error}10` : p.theme.surface)};
  color: ${p => (p.$type === 'error' ? p.theme.error : p.theme.textSecondary)};
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;

  ul {
    margin: 0.5rem 0 0 1.25rem;
    padding: 0;
  }

  li {
    margin: 0.15rem 0;
  }
`;

const FeedbackPanel = styled.div`
  margin-top: 0.9rem;
  border: 1px solid ${p => p.theme.border};
  border-radius: 10px;
  background: ${p => p.theme.background};
  padding: 0.9rem;
`;

const FeedbackGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
`;

const FeedbackCard = styled.div`
  border: 1px solid ${p => p.theme.border};
  border-radius: 10px;
  background: ${p => p.theme.surface};
  padding: 0.75rem;
`;

const FeedbackCardTitle = styled.div`
  font-weight: 800;
  color: ${p => p.theme.textPrimary};
  margin-bottom: 0.4rem;
`;

const CriteriaList = styled.div`
  margin-top: 0.8rem;
  display: grid;
  gap: 0.55rem;
`;

const CriterionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: center;
`;

const CriterionLabel = styled.div`
  color: ${p => p.theme.textSecondary};
  font-size: 0.86rem;
  font-weight: 700;
`;

const CriterionValue = styled.div`
  color: ${p => p.theme.textPrimary};
  font-size: 0.82rem;
  font-weight: 800;
`;

const CriterionTrack = styled.div`
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 999px;
  background: ${p => p.theme.border};
  overflow: hidden;
`;

const CriterionFill = styled.div`
  height: 100%;
  width: ${p => `${Math.max(0, Math.min(100, (Number(p.$value || 0) / 4) * 100))}%`};
  background: ${p => {
    const v = Number(p.$value || 0);
    if (v >= 3.5) return '#16a34a';
    if (v >= 2.5) return '#f59e0b';
    return '#ef4444';
  }};
`;

// ─── Session Progress Dashboard ─────────────────────────────────────

const ProgressDashboard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: 10px;
`;

const StatCard = styled.div`
  text-align: center;
  padding: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
  color: ${p => p.$color || p.theme.primary};
`;

const StatLabel = styled.div`
  font-size: 0.72rem;
  color: ${p => p.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.15rem;
`;

const TrendBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${p => {
    if (p.$trend === 'improving') return '#dcfce7';
    if (p.$trend === 'declining') return '#fee2e2';
    return '#f3f4f6';
  }};
  color: ${p => {
    if (p.$trend === 'improving') return '#16a34a';
    if (p.$trend === 'declining') return '#dc2626';
    return '#6b7280';
  }};
`;

const WeakCriterionTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${p => p.theme.primary}12;
  color: ${p => p.theme.textSecondary};
  border: 1px solid ${p => p.theme.border};
`;

// ─── Reflection Panel ───────────────────────────────────────────────

const ReflectionPanel = styled.div`
  margin-top: 0.75rem;
  border: 2px solid ${p => p.theme.primary}40;
  border-radius: 10px;
  background: ${p => p.theme.primary}08;
  padding: 1rem;
`;

const ReflectionTitle = styled.div`
  font-weight: 800;
  color: ${p => p.theme.textPrimary};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const ReflectionPrompt = styled.p`
  font-size: 0.88rem;
  color: ${p => p.theme.textSecondary};
  margin: 0 0 0.5rem 0;
  line-height: 1.5;
`;

const ReflectionArea = styled.textarea`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: block;
  min-height: 80px;
  resize: vertical;
  padding: 0.7rem;
  border-radius: 8px;
  border: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.background};
  color: ${p => p.theme.textPrimary};
  outline: none;
  line-height: 1.5;
  font-size: 0.88rem;

  &:focus {
    border-color: ${p => p.theme.primary};
    box-shadow: 0 0 0 3px ${p => p.theme.primary}22;
  }
`;

const ReflectionSaved = styled.div`
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: #16a34a;
  font-weight: 600;
`;

// ─── History Panel ──────────────────────────────────────────────────

const HistoryToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1px solid ${p => p.theme.border};
  color: ${p => p.theme.textSecondary};
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.5rem;

  &:hover {
    background: ${p => p.theme.surface};
  }
`;

const HistoryList = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 260px;
  overflow-y: auto;
`;

const HistoryItem = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  font-size: 0.82rem;
`;

const HistoryScore = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  color: white;
  background: ${p => {
    const s = Number(p.$score || 0);
    if (s >= 8) return '#16a34a';
    if (s >= 5.5) return '#f59e0b';
    return '#ef4444';
  }};
`;

const HistoryMeta = styled.div`
  color: ${p => p.theme.textSecondary};
  font-size: 0.75rem;
`;

const TREND_LABELS = {
  improving: { icon: '📈', text: 'Mejorando' },
  stable: { icon: '➡️', text: 'Estable' },
  declining: { icon: '📉', text: 'A reforzar' }
};

const CRITERIA_LABELS = {
  claridad: 'Claridad',
  anclaje: 'Anclaje',
  completitud: 'Completitud',
  profundidad: 'Profundidad',
  comprension: 'Comprensión',
  originalidad: 'Originalidad'
};

const normalizeBullets = (text) => {
  if (!text || typeof text !== 'string') return [];
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Preferimos líneas “tipo lista”; si no hay, caemos a oraciones.
  const candidateLines = lines.length ? lines : text.split(/(?<=[.!?])\s+/g).map((s) => s.trim()).filter(Boolean);
  const cleaned = candidateLines
    .map((l) => l.replace(/^[-•*\d]+[.)\-\s]+/, '').trim())
    .filter((l) => l.length >= 12);

  // Dedup muy simple
  const uniq = [];
  const seen = new Set();
  for (const item of cleaned) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(item);
    if (uniq.length >= 5) break;
  }
  return uniq;
};

const normalizeScore4 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(4, n));
};

export default function ModoPracticaGuiada({ theme, rubricProgress, fixedDimension }) {
  const { texto, completeAnalysis, currentTextoId } = useContext(AppContext);
  const { recordEvent } = useRewards() || {};
  const [selectedDimension, setSelectedDimension] = useState(fixedDimension || null);
  const [practiceConfig, setPracticeConfig] = useState(null);
  const [isCrossChallenge, setIsCrossChallenge] = useState(false);
  const hintsRef = useRef(null);

  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [questionHints, setQuestionHints] = useState(null);
  const [loadingHints, setLoadingHints] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [progressStep, setProgressStep] = useState(null);

  // ─── Practice History & Reflection ──────────────────────────────
  const {
    stats: practiceStats,
    recentAttempts,
    startAttempt,
    recordAttempt,
    addReflection
  } = usePracticeHistory(selectedDimension);
  const [lastAttemptId, setLastAttemptId] = useState(null);
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const hintsKey = useMemo(() => {
    const base = practiceConfig?.practiceId || `${practiceConfig?.dimension || selectedDimension || 'practice'}:${practiceConfig?.difficulty || 'default'}`;
    const q = question?.pregunta || '';
    // Key corto pero suficientemente cambiante para resetear el estado interno al cambiar la pregunta.
    return `${base}:${q ? q.slice(0, 48) : 'noq'}`;
  }, [practiceConfig, selectedDimension, question]);

  const effectiveHints = useMemo(() => {
    const contextual = Array.isArray(questionHints) ? questionHints.filter(Boolean) : [];
    if (contextual.length > 0) return contextual;
    const fallback = Array.isArray(practiceConfig?.hints) ? practiceConfig.hints : [];
    return fallback;
  }, [questionHints, practiceConfig]);

  const lectureId = useMemo(() => {
    const legacyDocumentId = completeAnalysis?.metadata?.document_id || null;
    return currentTextoId || legacyDocumentId || null;
  }, [completeAnalysis, currentTextoId]);

  const nivelDificultad = useMemo(() => {
    const d = practiceConfig?.difficulty;
    if (d === 'easy') return 'fácil';
    if (d === 'hard') return 'difícil';
    return 'intermedio';
  }, [practiceConfig]);

  const feedbackText = useMemo(() => {
    if (!feedback || typeof feedback !== 'object') return '';
    return String(
      feedback?.feedback_combined ||
      feedback?.feedback_estructura ||
      feedback?.feedback_profundidad ||
      ''
    );
  }, [feedback]);

  const feedbackBullets = useMemo(() => normalizeBullets(feedbackText), [feedbackText]);

    const feedbackQuickComment = useMemo(() => {
      if (!feedback || typeof feedback !== 'object') return '';

      const comentario = String(feedback?.comentarioCritico || '').trim();
      if (comentario) return comentario;

      const mejora = Array.isArray(feedback?.mejoras)
        ? feedback.mejoras.find((m) => typeof m === 'string' && m.trim().length > 0)
        : '';
      if (mejora) return `Sugerencia rápida: ${mejora}`;

      const score = Number(feedback?.score ?? 0);
      if (score >= 8) return 'Vas muy bien. Para subir al máximo nivel, profundiza con una evidencia textual más precisa.';
      if (score >= 6) return 'Buen avance. Intenta fortalecer tu respuesta conectando una evidencia concreta con tu conclusión.';
      return 'Sugerencia rápida: responde de forma más directa a la pregunta y apóyate en al menos una evidencia del texto.';
    }, [feedback]);

    const feedbackStrength = useMemo(() => {
      const f = Array.isArray(feedback?.fortalezas) ? feedback.fortalezas : [];
      const first = f.find((item) => typeof item === 'string' && item.trim().length > 0);
      return first ? first.trim() : 'Respondiste la pregunta y mantuviste una idea central clara.';
    }, [feedback]);

    const feedbackAction = useMemo(() => {
      const m = Array.isArray(feedback?.mejoras) ? feedback.mejoras : [];
      const first = m.find((item) => typeof item === 'string' && item.trim().length > 0);
      return first ? first.trim() : 'Incluye una evidencia textual breve y explica por qué sostiene tu conclusión.';
    }, [feedback]);

    const feedbackCriteria = useMemo(() => {
      if (!feedback || typeof feedback !== 'object') return [];
      const d = feedback?.detalles || {};
      return [
        { key: 'claridad', label: 'Claridad', value: normalizeScore4(d.claridad) },
        { key: 'anclaje', label: 'Anclaje textual', value: normalizeScore4(d.anclaje) },
        { key: 'completitud', label: 'Completitud', value: normalizeScore4(d.completitud) },
        { key: 'profundidad', label: 'Profundidad crítica', value: normalizeScore4(d.profundidad) }
      ].filter((c) => c.value > 0);
    }, [feedback]);

    const rewriteGuide = useMemo(() => {
      return [
        'Reescritura guiada (breve):',
        '1) Responde la pregunta en una frase directa.',
        '2) Añade una evidencia puntual del texto (idea o cita corta).',
        '3) Cierra explicando la relación entre evidencia y conclusión.',
        `\nPista específica: ${feedbackAction}`
      ].join('\n');
    }, [feedbackAction]);

    const handleApplyImprovementGuide = useCallback(() => {
      setAnswer((prev) => {
        const current = String(prev || '').trim();
        const marker = '--- Mejora guiada ---';
        if (current.includes(marker)) return prev;
        return `${current}${current ? '\n\n' : ''}${marker}\n${rewriteGuide}`;
      });
    }, [rewriteGuide]);

    // ─── Reflexión metacognitiva ────────────────────────────────────
    const reflectionPrompts = useMemo(() => {
      if (!feedback) return null;
      const score = Number(feedback?.score ?? 0);
      const weakCrit = practiceStats?.criteria?.weakest?.[0];

      if (score >= 8) {
        return '¿Qué estrategia usaste que te funcionó bien? ¿Cómo podrías aplicarla en otra dimensión?';
      }
      if (weakCrit) {
        const label = CRITERIA_LABELS[weakCrit.key] || weakCrit.key;
        return `Tu criterio más débil fue "${label}". ¿Qué podrías hacer diferente la próxima vez para mejorarlo?`;
      }
      return '¿Qué fue lo más difícil de responder esta pregunta? ¿Qué harías diferente si volvieras a intentarlo?';
    }, [feedback, practiceStats]);

    const handleSaveReflection = useCallback(() => {
      if (!lastAttemptId || !reflectionText.trim()) return;
      addReflection(lastAttemptId, reflectionText.trim());
      setReflectionSaved(true);

      // Registrar evento metacognitivo para rewards
      try {
        recordEvent?.('METACOGNITIVE_REFLECTION', {
          resourceId: `${lectureId || 'no-lectura'}:${selectedDimension}:reflection:${lastAttemptId}`,
          reflectionLength: reflectionText.trim().length
        });
      } catch (_e) { /* no bloquear */ }
    }, [lastAttemptId, reflectionText, addReflection, recordEvent, lectureId, selectedDimension]);

    // Callback para rastrear hints revelados (pasado a HintsSystem)
    const handleHintRevealed = useCallback((idx) => {
      setHintsRevealed((prev) => Math.max(prev, idx + 1));
    }, []);

  const handleGeneratePracticeQuestion = useCallback(async () => {
    if (!texto || !selectedDimension) return;

    setLoadingQuestion(true);
    setLoadingHints(false);
    setQuestionHints(null);
    setEvaluating(false);
    setError(null);
    setFeedback(null);
    setAnswer('');
    setProgressStep('generating');
    setLastAttemptId(null);
    setReflectionText('');
    setReflectionSaved(false);
    setHintsRevealed(0);
    startAttempt(); // ⏱️ Marcar inicio para medir tiempo

    try {
      const res = await generarConRetry(
        generarPregunta,
        {
          texto,
          completeAnalysis,
          dimension: selectedDimension,
          nivelDificultad,
          skipPrerequisitos: true,
          onProgress: (p) => setProgressStep(p?.step || null)
        }
      );

      if (res?.needsPrerequisites) {
        const faltantes = Array.isArray(res?.faltantes) ? res.faltantes.join(', ') : '';
        setQuestion(null);
        setError(
          `Antes de practicar esta dimensión, falta completar prerequisitos: ${faltantes || 'análisis previo'}.
Ve a “Análisis del Texto” y vuelve a intentarlo.`
        );
        return;
      }

      // Contrato típico: { pregunta, ... }
      setQuestion(res);
    } catch (e) {
      setQuestion(null);
      setError(e?.message || 'No se pudo generar la pregunta de práctica.');
    } finally {
      setLoadingQuestion(false);
      setProgressStep(null);
    }
  }, [texto, selectedDimension, completeAnalysis, nivelDificultad]);

  const handleGenerateQuestionHints = useCallback(async () => {
    if (!texto || !selectedDimension) return;
    const pregunta = question?.pregunta;
    if (!pregunta) return;

    setLoadingHints(true);
    try {
      const res = await generarConRetry(
        generarHintsParaPregunta,
        {
          texto,
          completeAnalysis,
          dimension: selectedDimension,
          pregunta,
          nivelDificultad,
          count: 5,
          skipPrerequisitos: true,
          onProgress: (p) => {
            if (p?.step) setProgressStep(p.step);
          }
        }
      );

      const hints = Array.isArray(res?.hints) ? res.hints : [];
      setQuestionHints(hints);
    } catch (_e) {
      // Fallback: mantener hints genéricos de practiceConfig
      setQuestionHints(null);
    } finally {
      setLoadingHints(false);
      setProgressStep(null);
    }
  }, [texto, selectedDimension, question, completeAnalysis, nivelDificultad]);

  const handleEvaluatePracticeAnswer = useCallback(async () => {
    if (!texto || !selectedDimension || !question?.pregunta) return;
    if (!answer || !answer.trim()) return;

    setEvaluating(true);
    setError(null);
    setProgressStep('submitting');

    try {
      const res = await evaluarConRetry(
        evaluarRespuesta,
        {
          texto,
          pregunta: question.pregunta,
          respuesta: answer,
          dimension: selectedDimension,
          onProgress: (p) => setProgressStep(p?.step || null)
        }
      );

      setFeedback(res);
      setProgressStep(null);

      // ⚠️ IMPORTANTE: La práctica NO actualiza rubricProgress (calificación del artefacto).
      // Solo otorga puntos de recompensa al score general del estudiante.

      // 📝 Registrar intento en historial persistente
      try {
        const attemptId = recordAttempt({
          dimension: selectedDimension,
          difficulty: practiceConfig?.difficulty || 'medium',
          question: question?.pregunta,
          answer,
          score: res?.score,
          nivel: res?.nivel,
          hintsUsed: hintsRevealed,
          isCrossChallenge,
          feedbackSummary: {
            fortaleza: res?.fortalezas?.[0] || '',
            mejora: res?.mejoras?.[0] || '',
            criterios: res?.detalles || null
          }
        });
        setLastAttemptId(attemptId);
        setReflectionText('');
        setReflectionSaved(false);
      } catch (_e) {
        // no bloquear por historial
      }

      // 🎮 Registrar recompensas por práctica opcional
      try {
        const resourceBase = `${lectureId || 'no-lectura'}:${selectedDimension}:${practiceConfig?.practiceId || 'practice'}`;

        // Recompensa por responder pregunta de práctica
        recordEvent?.('PRACTICE_QUESTION_ANSWERED', {
          resourceId: `${resourceBase}:answered`,
          score: res?.score,
          nivel: res?.nivel,
          difficulty: practiceConfig?.difficulty || null
        });

        // Recompensa por desafío cruzado
        if (isCrossChallenge) {
          recordEvent?.('CROSS_CHALLENGE_COMPLETED', {
            resourceId: `${resourceBase}:cross`,
            score: res?.score
          });
        }

        recordEvent?.('EVALUATION_SUBMITTED', {
          resourceId: `${resourceBase}:submitted`,
          score: res?.score,
          nivel: res?.nivel,
          difficulty: practiceConfig?.difficulty || null
        });

        if (Number(res?.nivel || 0) >= 3) {
          recordEvent?.('PRACTICE_DIMENSION_COMPLETED', {
            resourceId: `${lectureId || 'no-lectura'}:${selectedDimension}`,
            score: res?.score,
            nivel: res?.nivel
          });
        }
      } catch (_e) {
        // no bloquear práctica por rewards
      }
    } catch (e) {
      setError(e?.message || 'No se pudo evaluar tu respuesta.');
      setProgressStep(null);
    } finally {
      setEvaluating(false);
    }
  }, [texto, selectedDimension, question, answer, lectureId, practiceConfig, isCrossChallenge]);

  const dims = useMemo(() => ([
    { id: 'comprension_analitica', name: 'Comprensión Analítica', icon: '📚' },
    { id: 'acd', name: 'ACD', icon: '🔍' },
    { id: 'contextualizacion', name: 'Contextualización', icon: '🗺️' },
    { id: 'argumentacion', name: 'Argumentación', icon: '💭' },
    { id: 'metacognicion_etica_ia', name: 'Ética IA', icon: '🤖' }
  ]), []);

  // Sync fixedDimension prop
  useEffect(() => {
    if (fixedDimension && fixedDimension !== selectedDimension) {
      setSelectedDimension(fixedDimension);
      setPracticeConfig(null);
    }
  }, [fixedDimension]); // eslint-disable-line

  useEffect(() => {
    if (!practiceConfig) return;
    // Hacer visible el resultado del click (sin cambiar UX): enfocar/scroll a hints.
    // Pequeño delay para asegurar que el componente ya esté montado.
    const t = setTimeout(() => {
      if (hintsRef.current?.scrollIntoView) {
        hintsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [practiceConfig]);

  // Cuando se inicia una nueva práctica, generar una pregunta automáticamente
  useEffect(() => {
    if (!practiceConfig) return;
    if (!selectedDimension) return;
    if (!texto) {
      setError('Carga un texto para poder generar una pregunta de práctica.');
      return;
    }
    setQuestion(null);
    setFeedback(null);
    setAnswer('');
    setQuestionHints(null);
    handleGeneratePracticeQuestion();
  }, [practiceConfig, selectedDimension, texto, handleGeneratePracticeQuestion]);

  // Cuando hay una pregunta nueva, generar hints contextualizadas
  useEffect(() => {
    if (!practiceConfig) return;
    if (!question?.pregunta) return;
    handleGenerateQuestionHints();
  }, [practiceConfig, question, handleGenerateQuestionHints]);

  // Handler para desafío cruzado
  const handleCrossChallenge = useCallback(async () => {
    if (!texto || !selectedDimension) return;
    setLoadingQuestion(true);
    setIsCrossChallenge(true);
    setError(null);
    setFeedback(null);
    setAnswer('');
    setQuestionHints(null);
    setProgressStep('generating');
    setLastAttemptId(null);
    setReflectionText('');
    setReflectionSaved(false);
    setHintsRevealed(0);
    startAttempt(); // ⏱️ Marcar inicio

    // Elegir una segunda dimensión diferente al azar
    const otherDims = dims.filter(d => d.id !== selectedDimension);
    const secondDim = otherDims[Math.floor(Math.random() * otherDims.length)];

    try {
      const res = await generarConRetry(
        generarDesafioCruzado,
        {
          texto,
          completeAnalysis,
          dimensionA: selectedDimension,
          dimensionB: secondDim.id,
          nivelDificultad,
          onProgress: (p) => setProgressStep(p?.step || null)
        }
      );
      setQuestion(res);
    } catch (e) {
      setQuestion(null);
      setError(e?.message || 'No se pudo generar el desafío cruzado.');
    } finally {
      setLoadingQuestion(false);
      setProgressStep(null);
    }
  }, [texto, selectedDimension, completeAnalysis, nivelDificultad, dims]);

  return (
    <Box theme={theme} role="region" aria-label="Práctica Guiada">
      <Title theme={theme}>🎮 Práctica Guiada</Title>
      <Subtitle theme={theme}>
        Practica con preguntas reflexivas cortas. Sin impacto en tu evaluación sumativa.
        Gana puntos extra por cada pregunta respondida. ¡Los desafíos cruzados otorgan bonus!
      </Subtitle>

      {/* 📊 Mini-dashboard de progreso de práctica */}
      {selectedDimension && practiceStats.total > 0 && (
        <ProgressDashboard theme={theme}>
          <StatCard>
            <StatValue theme={theme}>{practiceStats.total}</StatValue>
            <StatLabel theme={theme}>Intentos</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color={practiceStats.avgScore >= 7 ? '#16a34a' : practiceStats.avgScore >= 5 ? '#f59e0b' : '#ef4444'} theme={theme}>
              {practiceStats.avgScore}
            </StatValue>
            <StatLabel theme={theme}>Promedio</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#8b5cf6" theme={theme}>{practiceStats.bestScore}</StatValue>
            <StatLabel theme={theme}>Mejor</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue theme={theme}>
              {practiceStats.streak > 0 ? `🔥 ${practiceStats.streak}` : '—'}
            </StatValue>
            <StatLabel theme={theme}>Racha ≥6</StatLabel>
          </StatCard>
          <StatCard>
            <TrendBadge $trend={practiceStats.trend}>
              {TREND_LABELS[practiceStats.trend]?.icon} {TREND_LABELS[practiceStats.trend]?.text}
            </TrendBadge>
            <StatLabel theme={theme} style={{ marginTop: '0.3rem' }}>Tendencia</StatLabel>
          </StatCard>
          {practiceStats.criteria?.weakest?.[0] && (
            <StatCard>
              <WeakCriterionTag theme={theme}>
                🎯 {CRITERIA_LABELS[practiceStats.criteria.weakest[0].key] || practiceStats.criteria.weakest[0].key}
                {' '}({practiceStats.criteria.weakest[0].avg})
              </WeakCriterionTag>
              <StatLabel theme={theme} style={{ marginTop: '0.3rem' }}>A reforzar</StatLabel>
            </StatCard>
          )}
        </ProgressDashboard>
      )}

      {/* Solo mostrar grid de dimensiones si no hay fixedDimension */}
      {!fixedDimension && (
        <DimGrid>
        {dims.map((d) => (
          <DimBtn
            key={d.id}
            theme={theme}
            type="button"
            $selected={selectedDimension === d.id}
            onClick={() => {
              setSelectedDimension(d.id);
              setPracticeConfig(null);
            }}
          >
            <div style={{ fontSize: '1.4rem' }}>{d.icon}</div>
            <div>{d.name}</div>
            <Small>Seleccionar</Small>
          </DimBtn>
        ))}
      </DimGrid>
      )}

      <GuidedPracticeMode
        rubricProgress={rubricProgress}
        selectedDimension={selectedDimension}
        onStartPractice={(cfg) => {
          setIsCrossChallenge(false);
          setPracticeConfig(cfg);
        }}
        theme={theme}
      />

      {effectiveHints.length > 0 && (
        <div ref={hintsRef}>
          <HintsSystem
            key={hintsKey}
            hints={effectiveHints}
            maxHints={practiceConfig?.level?.hintsAvailable ?? 3}
            onHintRevealed={handleHintRevealed}
            theme={theme}
          />
          {loadingHints && (
            <Message theme={theme}>
              ⏳ Generando hints contextualizados para esta pregunta…
            </Message>
          )}
        </div>
      )}

      {practiceConfig && (
        <PracticeCard theme={theme} aria-label="Pregunta de práctica">
          <PracticeHeader>
            <PracticeTitle theme={theme}>
              <span>{isCrossChallenge ? '⚡' : '❓'}</span>
              <span>{isCrossChallenge ? 'Desafío Cruzado' : 'Pregunta de práctica'}</span>
            </PracticeTitle>
            <Meta theme={theme}>
              {selectedDimension ? `Dimensión: ${selectedDimension}` : 'Sin dimensión'}
              {practiceConfig?.difficulty ? ` · Nivel: ${practiceConfig.difficulty}` : ''}
            </Meta>
          </PracticeHeader>

          {!texto && (
            <Message theme={theme} $type="error">
              Carga un texto para poder generar una pregunta.
            </Message>
          )}

          {(loadingQuestion || !question?.pregunta) ? (
            <QuestionBox theme={theme}>
              {loadingQuestion ? '⏳ Generando pregunta…' : (error ? '⚠️ No se pudo generar la pregunta.' : 'Selecciona una dimensión y comienza la práctica.')}
              {progressStep ? `\n\nEstado: ${progressStep}` : ''}
            </QuestionBox>
          ) : (
            <QuestionBox theme={theme}>
              {question.pregunta}
            </QuestionBox>
          )}

          <AnswerLabel theme={theme}>Tu respuesta (mín. 30 caracteres)</AnswerLabel>
          <AnswerArea
            theme={theme}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Escribe tu respuesta aquí…"
            disabled={!question?.pregunta || loadingQuestion || evaluating}
          />

          <ActionsRow>
            <ActionBtn
              theme={theme}
              type="button"
              onClick={() => { setIsCrossChallenge(false); handleGeneratePracticeQuestion(); }}
              disabled={!texto || !selectedDimension || loadingQuestion || evaluating}
            >
              🔄 Nueva pregunta
            </ActionBtn>

            <ActionBtn
              theme={theme}
              type="button"
              onClick={handleCrossChallenge}
              disabled={!texto || !selectedDimension || loadingQuestion || evaluating}
              title="Desafío cruzado: combina 2 dimensiones (+50 pts bonus)"
            >
              ⚡ Desafío cruzado
            </ActionBtn>

            <ActionBtn
              theme={theme}
              type="button"
              $variant="primary"
              onClick={handleEvaluatePracticeAnswer}
              disabled={!question?.pregunta || loadingQuestion || evaluating || (answer.trim().length < 30)}
              title={answer.trim().length < 30 ? 'Tu respuesta debe tener al menos 30 caracteres' : 'Evaluar respuesta'}
            >
              {evaluating ? '⏳ Evaluando…' : '🧪 Evaluar respuesta'}
            </ActionBtn>
          </ActionsRow>

          {error && (
            <Message theme={theme} $type="error">{error}</Message>
          )}

          {feedback && (
            <>
              <Message theme={theme}>
                {`✅ Resultado: ${Number(feedback?.score ?? 0)}/10 · Nivel ${Number(feedback?.nivel ?? 0)}/4`}
                {feedbackQuickComment ? `\n\n💡 ${feedbackQuickComment}` : ''}
                {feedbackBullets.length > 0 ? (
                  <ul>
                    {feedbackBullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : (
                  feedbackText ? `\n\n${feedbackText}` : ''
                )}
              </Message>

              <FeedbackPanel theme={theme} aria-label="Resumen de mejora">
                <FeedbackGrid>
                  <FeedbackCard theme={theme}>
                    <FeedbackCardTitle theme={theme}>✅ Fortaleza principal</FeedbackCardTitle>
                    <div>{feedbackStrength}</div>
                  </FeedbackCard>

                  <FeedbackCard theme={theme}>
                    <FeedbackCardTitle theme={theme}>🎯 Mejora accionable</FeedbackCardTitle>
                    <div>{feedbackAction}</div>
                  </FeedbackCard>
                </FeedbackGrid>

                {feedbackCriteria.length > 0 && (
                  <CriteriaList>
                    {feedbackCriteria.map((c) => (
                      <CriterionRow key={c.key}>
                        <CriterionLabel theme={theme}>{c.label}</CriterionLabel>
                        <CriterionValue theme={theme}>{c.value.toFixed(1)}/4</CriterionValue>
                        <CriterionTrack theme={theme}>
                          <CriterionFill $value={c.value} />
                        </CriterionTrack>
                      </CriterionRow>
                    ))}
                  </CriteriaList>
                )}

                <ActionsRow>
                  <ActionBtn
                    theme={theme}
                    type="button"
                    onClick={handleApplyImprovementGuide}
                    disabled={evaluating || loadingQuestion}
                    title="Inserta una guía breve para mejorar tu respuesta y reintentar"
                  >
                    ✨ Mejorar respuesta
                  </ActionBtn>
                </ActionsRow>
              </FeedbackPanel>

              {/* 🧠 Reflexión metacognitiva */}
              {reflectionPrompts && (
                <ReflectionPanel theme={theme}>
                  <ReflectionTitle theme={theme}>
                    <span>🧠</span>
                    <span>Reflexión rápida</span>
                  </ReflectionTitle>
                  <ReflectionPrompt theme={theme}>{reflectionPrompts}</ReflectionPrompt>
                  {reflectionSaved ? (
                    <ReflectionSaved>✅ Reflexión guardada — ¡Excelente práctica metacognitiva!</ReflectionSaved>
                  ) : (
                    <>
                      <ReflectionArea
                        theme={theme}
                        value={reflectionText}
                        onChange={(e) => setReflectionText(e.target.value)}
                        placeholder="Escribe brevemente tu reflexión…"
                      />
                      <ActionsRow>
                        <ActionBtn
                          theme={theme}
                          type="button"
                          onClick={handleSaveReflection}
                          disabled={!reflectionText.trim()}
                          title="Guarda tu reflexión y gana puntos extra"
                        >
                          💾 Guardar reflexión (+pts)
                        </ActionBtn>
                      </ActionsRow>
                    </>
                  )}
                </ReflectionPanel>
              )}
            </>
          )}

          {/* 📜 Historial de intentos */}
          {recentAttempts.length > 0 && (
            <>
              <HistoryToggle theme={theme} onClick={() => setShowHistory(v => !v)}>
                📜 {showHistory ? 'Ocultar' : 'Ver'} historial ({recentAttempts.length})
              </HistoryToggle>

              {showHistory && (
                <HistoryList>
                  {recentAttempts.map((attempt) => (
                    <HistoryItem key={attempt.id} theme={theme}>
                      <HistoryScore $score={attempt.score}>
                        {Number(attempt.score || 0).toFixed(0)}
                      </HistoryScore>
                      <div>
                        <div style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '0.82rem' }}>
                          {(attempt.question || '').slice(0, 80)}{(attempt.question || '').length > 80 ? '…' : ''}
                        </div>
                        <HistoryMeta theme={theme}>
                          {attempt.isCrossChallenge ? '⚡ Cruzado' : `📊 Nivel ${attempt.nivel}/4`}
                          {attempt.hintsUsed ? ` · 💡${attempt.hintsUsed} hints` : ''}
                          {attempt.reflection ? ' · 🧠' : ''}
                          {' · '}
                          {new Date(attempt.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </HistoryMeta>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                        {attempt.difficulty === 'hard' ? '🔴' : attempt.difficulty === 'easy' ? '🟢' : '🟡'}
                      </div>
                    </HistoryItem>
                  ))}
                </HistoryList>
              )}
            </>
          )}
        </PracticeCard>
      )}
    </Box>
  );
}
