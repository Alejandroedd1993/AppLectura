import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { AppContext } from '../../context/AppContext';
import GuidedPracticeMode from '../evaluacion/GuidedPracticeMode';
import HintsSystem from '../evaluacion/HintsSystem';
import { evaluarRespuesta, generarPregunta, generarHintsParaPregunta, generarDesafioCruzado } from '../../services/evaluacionIntegral.service';
import { evaluarConRetry, generarConRetry } from '../../services/retryWrapper';
import { useRewards } from '../../context/PedagogyContext';

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

export default function ModoPracticaGuiada({ theme, rubricProgress, fixedDimension }) {
  const { texto, completeAnalysis, updateRubricScore, currentTextoId } = useContext(AppContext);
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

      // 🧭 Persistir como intento formativo (no sumativo)
      // Nota: updateRubricScore usa rubrica1–5, por eso mapeamos por dimensión.
      const dimensionToRubric = {
        comprension_analitica: 'rubrica1',
        acd: 'rubrica2',
        contextualizacion: 'rubrica3',
        argumentacion: 'rubrica4',
        metacognicion_etica_ia: 'rubrica5'
      };
      const rubricId = dimensionToRubric[selectedDimension];
      if (rubricId && updateRubricScore) {
        updateRubricScore(rubricId, {
          score: res?.score,
          nivel: res?.nivel,
          artefacto: 'PracticaGuiada',
          criterios: res?.detalles,
          textoId: lectureId || undefined
        });
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
  }, [texto, selectedDimension, question, answer, updateRubricScore, lectureId, practiceConfig, isCrossChallenge]);

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
            <Message theme={theme}>
              {`✅ Resultado: ${Number(feedback?.score ?? 0)}/10 · Nivel ${Number(feedback?.nivel ?? 0)}/4`}
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
          )}
        </PracticeCard>
      )}
    </Box>
  );
}
