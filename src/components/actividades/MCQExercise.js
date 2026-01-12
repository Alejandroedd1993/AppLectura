/**
 * Componente MCQExercise
 * Preguntas de opción múltiple con feedback instantáneo
 * Niveles de Bloom: 1 (Comprensión) → 2 (Análisis) → 3 (Evaluación)
 */

import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #3190FC 0%, #1E40AF 100%);
  border-radius: 12px;
  padding: 2rem;
  color: white;
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 1rem;
  opacity: 0.95;
`;

const ProgressBar = styled.div`
  background: ${p => p.theme.surface};
  border-radius: 8px;
  height: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid ${p => p.theme.border};
`;

const ProgressFill = styled(motion.div)`
  background: linear-gradient(90deg, #3190FC 0%, #10b981 100%);
  height: 100%;
  border-radius: 8px;
`;

const QuestionCard = styled(motion.div)`
  background: ${p => p.theme.cardBg};
  border: 2px solid ${p => p.theme.border};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
`;

const QuestionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const QuestionNumber = styled.div`
  background: ${p => p.theme.primary};
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
`;

const LevelBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${p => p.$color || '#gray'}20;
  color: ${p => p.$color || '#666'};
  border: 1px solid ${p => p.$color || '#gray'};
`;

const QuestionText = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${p => p.theme.textPrimary};
  line-height: 1.6;
`;

const OptionsGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const Option = styled(motion.button)`
  background: ${p => {
    if (p.$answered) {
      if (p.$isCorrect) return '#10b98120';
      if (p.$selected && !p.$isCorrect) return '#f4433620';
      return p.theme.surface;
    }
    return p.$selected ? p.theme.primary + '20' : p.theme.surface;
  }};
  border: 2px solid ${p => {
    if (p.$answered) {
      if (p.$isCorrect) return '#10b981';
      if (p.$selected && !p.$isCorrect) return '#f44336';
      return p.theme.border;
    }
    return p.$selected ? p.theme.primary : p.theme.border;
  }};
  border-radius: 8px;
  padding: 1rem 1.25rem;
  text-align: left;
  cursor: ${p => p.$answered ? 'default' : 'pointer'};
  transition: all 0.2s ease;
  color: ${p => p.theme.textPrimary};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  &:hover {
    ${p => !p.$answered && `
      border-color: ${p.theme.primary};
      transform: translateX(4px);
    `}
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const OptionLabel = styled.span`
  background: ${p => {
    if (p.$answered && p.$isCorrect) return '#10b981';
    if (p.$answered && p.$selected && !p.$isCorrect) return '#f44336';
    return p.theme.primary;
  }};
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
`;

const FeedbackCard = styled(motion.div)`
  background: ${p => p.$correct ? '#10b98110' : '#ff980810'};
  border: 2px solid ${p => p.$correct ? '#10b981' : '#ff9808'};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const FeedbackHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: ${p => p.$correct ? '#10b981' : '#ff9808'};
`;

const FeedbackText = styled.p`
  margin: 0;
  color: ${p => p.theme.textSecondary};
  line-height: 1.6;
`;

const ActionButton = styled.button`
  background: ${p => p.$variant === 'primary' ? p.theme.primary : 'transparent'};
  color: ${p => p.$variant === 'primary' ? 'white' : p.theme.primary};
  border: 2px solid ${p => p.theme.primary};
  border-radius: 8px;
  padding: 0.75rem 2rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${p => p.$variant === 'primary' ? p.theme.primaryHover : p.theme.primary + '10'};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ResultsSummary = styled(motion.div)`
  background: ${p => p.theme.cardBg};
  border: 2px solid ${p => p.$passed ? '#10b981' : '#ff9808'};
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
`;

const ResultsTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 2rem;
  color: ${p => p.$passed ? '#10b981' : '#ff9808'};
`;

const ResultsScore = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: ${p => p.theme.textPrimary};
  margin: 1rem 0;
`;

const ResultsText = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
  color: ${p => p.theme.textSecondary};
  line-height: 1.6;
`;

const MCQExercise = ({ questions = [], onComplete, theme, initialResults }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(initialResults?.selectedAnswers || {});
  const [revealedAnswers, setRevealedAnswers] = useState(initialResults?.revealedAnswers || {});
  const [showResults, setShowResults] = useState(!!initialResults?.passed); // Show results immediately if passed

  const currentQuestion = questions[currentIndex];
  const hasAnswered = revealedAnswers[currentIndex];
  const selectedOption = selectedAnswers[currentIndex];

  const handleSelectOption = useCallback((optionIndex) => {
    if (!hasAnswered) {
      setSelectedAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
    }
  }, [currentIndex, hasAnswered]);

  const handleConfirmAnswer = useCallback(() => {
    setRevealedAnswers(prev => ({ ...prev, [currentIndex]: true }));
  }, [currentIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  }, [currentIndex, questions.length]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleRetry = useCallback(() => {
    setSelectedAnswers({});
    setRevealedAnswers({});
    setShowResults(false);
    setCurrentIndex(0);
  }, []);

  // Calcular resultados
  const results = useMemo(() => {
    const total = questions.length;
    const correct = questions.filter((q, idx) =>
      selectedAnswers[idx] === q.respuesta_correcta
    ).length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = percentage >= 60;

    return { total, correct, percentage, passed, selectedAnswers, revealedAnswers };
  }, [questions, selectedAnswers]);

  const getBadgeColor = (nivel) => {
    if (nivel === 1) return '#3190FC'; // Comprensión
    if (nivel === 2) return '#ff9808'; // Análisis
    return '#9c27b0'; // Evaluación
  };

  const getBadgeLabel = (nivel) => {
    if (nivel === 1) return '📖 Comprensión';
    if (nivel === 2) return '🔍 Análisis';
    return '⚖️ Evaluación';
  };

  if (!questions || questions.length === 0) {
    return (
      <Container>
        <QuestionCard>
          <QuestionText>No hay preguntas disponibles</QuestionText>
          <FeedbackText theme={theme}>
            Las preguntas se generarán automáticamente cuando se complete el análisis del texto.
          </FeedbackText>
        </QuestionCard>
      </Container>
    );
  }

  if (showResults) {
    return (
      <Container>
        <ResultsSummary
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          $passed={results.passed}
          theme={theme}
        >
          <ResultsTitle $passed={results.passed}>
            {results.passed ? '🎉 ¡Excelente trabajo!' : '📚 Sigue practicando'}
          </ResultsTitle>

          <ResultsScore theme={theme}>
            {results.correct}/{results.total}
          </ResultsScore>

          <ResultsText theme={theme}>
            Obtuviste {results.percentage}% de respuestas correctas
          </ResultsText>

          {results.passed ? (
            <FeedbackText theme={theme}>
              ✅ Has demostrado comprensión básica del texto. <br />
              <strong>Ahora puedes continuar con las preguntas de síntesis.</strong>
            </FeedbackText>
          ) : (
            <FeedbackText theme={theme}>
              ⚠️ Necesitas al menos 60% para continuar. <br />
              Te recomendamos revisar el texto nuevamente.
            </FeedbackText>
          )}

          <ActionsRow style={{ justifyContent: 'center', marginTop: '2rem' }}>
            <ActionButton
              $variant="outline"
              onClick={handleRetry}
              theme={theme}
            >
              🔄 Reintentar
            </ActionButton>

            {results.passed && (
              <ActionButton
                $variant="primary"
                onClick={() => onComplete && onComplete(results)}
                theme={theme}
              >
                Continuar →
              </ActionButton>
            )}
          </ActionsRow>
        </ResultsSummary>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          📋 Autoevaluación Rápida
        </Title>
        <Subtitle>
          Responde {questions.length} preguntas para validar tu comprensión del texto
        </Subtitle>
      </Header>

      <ProgressBar theme={theme}>
        <ProgressFill
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </ProgressBar>

      <AnimatePresence mode="wait">
        <QuestionCard
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          theme={theme}
        >
          <QuestionHeader>
            <QuestionNumber theme={theme}>
              {currentIndex + 1}
            </QuestionNumber>
            <LevelBadge $color={getBadgeColor(currentQuestion.nivel)}>
              {getBadgeLabel(currentQuestion.nivel)}
            </LevelBadge>
          </QuestionHeader>

          <QuestionText theme={theme}>
            {currentQuestion.pregunta}
          </QuestionText>

          <OptionsGrid>
            {currentQuestion.opciones.map((opcion, idx) => {
              const isCorrect = idx === currentQuestion.respuesta_correcta;
              const isSelected = selectedOption === idx;

              return (
                <Option
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  $selected={isSelected}
                  $answered={hasAnswered}
                  $isCorrect={isCorrect}
                  disabled={hasAnswered}
                  theme={theme}
                  whileHover={!hasAnswered ? { scale: 1.02 } : {}}
                  whileTap={!hasAnswered ? { scale: 0.98 } : {}}
                >
                  <OptionLabel
                    $selected={isSelected}
                    $answered={hasAnswered}
                    $isCorrect={isCorrect}
                    theme={theme}
                  >
                    {String.fromCharCode(65 + idx)}
                  </OptionLabel>
                  {opcion}
                </Option>
              );
            })}
          </OptionsGrid>

          {hasAnswered && (
            <FeedbackCard
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              $correct={selectedOption === currentQuestion.respuesta_correcta}
            >
              <FeedbackHeader $correct={selectedOption === currentQuestion.respuesta_correcta}>
                {selectedOption === currentQuestion.respuesta_correcta ? (
                  <>✅ ¡Correcto!</>
                ) : (
                  <>❌ Incorrecto</>
                )}
              </FeedbackHeader>
              <FeedbackText theme={theme}>
                {currentQuestion.explicacion}
              </FeedbackText>
            </FeedbackCard>
          )}

          <ActionsRow>
            {currentIndex > 0 && (
              <ActionButton
                $variant="outline"
                onClick={handlePreviousQuestion}
                theme={theme}
              >
                ← Anterior
              </ActionButton>
            )}

            {!hasAnswered ? (
              <ActionButton
                $variant="primary"
                onClick={handleConfirmAnswer}
                disabled={selectedOption === undefined}
                theme={theme}
              >
                Confirmar respuesta
              </ActionButton>
            ) : (
              <ActionButton
                $variant="primary"
                onClick={handleNextQuestion}
                theme={theme}
              >
                {currentIndex < questions.length - 1 ? 'Siguiente →' : 'Ver resultados'}
              </ActionButton>
            )}
          </ActionsRow>
        </QuestionCard>
      </AnimatePresence>
    </Container>
  );
};

export default React.memo(MCQExercise);
