/**
 * Componente SynthesisQuestions
 * 2 preguntas de síntesis cortas (100-150 palabras)
 * Preparación para los artefactos formales
 */

import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
  line-height: 1.5;
`;

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const ProgressDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${p => p.$active ? p.theme.primary : p.theme.border};
  transition: all 0.3s ease;
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
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const QuestionIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
`;

const QuestionContent = styled.div`
  flex: 1;
`;

const QuestionTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${p => p.theme.textPrimary};
`;

const QuestionText = styled.p`
  margin: 0 0 0.75rem 0;
  font-size: 1.05rem;
  color: ${p => p.theme.textSecondary};
  line-height: 1.6;
`;

const GuideText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${p => p.theme.textTertiary};
  background: ${p => p.theme.surface};
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border-left: 3px solid ${p => p.theme.primary};
`;

const TextAreaWrapper = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 180px;
  padding: 1rem;
  border: 2px solid ${p => p.$hasError ? '#f44336' : p.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  color: ${p => p.theme.textPrimary};
  background: ${p => p.theme.surface};
  resize: vertical;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${p => p.$hasError ? '#f44336' : p.theme.primary};
  }
  
  &::placeholder {
    color: ${p => p.theme.textTertiary};
  }
`;

const WordCounter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
`;

const WordCount = styled.span`
  color: ${p => {
    if (p.$count < p.$min) return '#ff9808';
    if (p.$count > p.$max) return '#f44336';
    return '#10b981';
  }};
  font-weight: 600;
`;

const WordGuidance = styled.span`
  color: ${p => p.theme.textTertiary};
  font-size: 0.85rem;
`;

const ValidationMessage = styled(motion.div)`
  background: ${p => p.$type === 'error' ? '#f4433620' : '#ff980820'};
  border: 1px solid ${p => p.$type === 'error' ? '#f44336' : '#ff9808'};
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  color: ${p => p.$type === 'error' ? '#f44336' : '#ff9808'};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
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

const CompletionCard = styled(motion.div)`
  background: ${p => p.theme.cardBg};
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
`;

const CompletionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 2rem;
  color: #10b981;
`;

const CompletionText = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
  color: ${p => p.theme.textSecondary};
  line-height: 1.6;
`;

const SynthesisQuestions = ({ questions = [], onComplete, theme, initialAnswers }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers || {});
  const [showCompletion, setShowCompletion] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex] || '';

  const wordCount = useMemo(() => {
    return currentAnswer.trim().split(/\s+/).filter(Boolean).length;
  }, [currentAnswer]);

  const validation = useMemo(() => {
    if (!currentAnswer.trim()) {
      return { valid: false, message: '⚠️ Por favor escribe una respuesta', type: 'warning' };
    }
    if (wordCount < 50) {
      return { valid: false, message: '⚠️ La respuesta es muy corta. Desarrolla más tus ideas.', type: 'warning' };
    }
    if (wordCount > 200) {
      return { valid: false, message: '❌ La respuesta excede el límite. Sé más conciso.', type: 'error' };
    }
    return { valid: true, message: '', type: '' };
  }, [currentAnswer, wordCount]);

  const handleAnswerChange = useCallback((e) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: e.target.value
    }));
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (!validation.valid) return;

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowCompletion(true);
    }
  }, [currentIndex, questions.length, validation.valid]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleFinish = useCallback(() => {
    if (onComplete) {
      onComplete({ answers, totalQuestions: questions.length });
    }
  }, [answers, questions.length, onComplete]);

  if (!questions || questions.length === 0) {
    return (
      <Container>
        <QuestionCard theme={theme}>
          <QuestionText theme={theme}>
            No hay preguntas de síntesis disponibles
          </QuestionText>
        </QuestionCard>
      </Container>
    );
  }

  if (showCompletion) {
    return (
      <Container>
        <CompletionCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={theme}
        >
          <CompletionTitle>
            ✅ ¡Preparación completada!
          </CompletionTitle>

          <CompletionText theme={theme}>
            Has respondido las preguntas de síntesis. <br />
            <strong>Ahora estás listo para crear tus artefactos académicos formales.</strong>
          </CompletionText>

          <ActionButton
            $variant="primary"
            onClick={handleFinish}
            theme={theme}
          >
            Ir a Artefactos →
          </ActionButton>
        </CompletionCard>
      </Container>
    );
  }

  const getQuestionIcon = (tipo) => {
    if (tipo === 'sintesis_principal') return '📝';
    if (tipo === 'conexion_personal') return '💭';
    return '❓';
  };

  const getQuestionTitle = (tipo) => {
    if (tipo === 'sintesis_principal') return 'Síntesis Principal';
    if (tipo === 'conexion_personal') return 'Conexión Personal';
    return 'Reflexión';
  };

  return (
    <Container>
      <Header>
        <Title>
          💭 Preguntas de Síntesis
        </Title>
        <Subtitle>
          Reflexiona sobre el texto en 100-150 palabras por pregunta
        </Subtitle>
      </Header>

      <ProgressIndicator>
        {questions.map((_, idx) => (
          <ProgressDot
            key={idx}
            $active={idx === currentIndex}
            theme={theme}
          />
        ))}
      </ProgressIndicator>

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
            <QuestionIcon>
              {getQuestionIcon(currentQuestion.tipo)}
            </QuestionIcon>
            <QuestionContent>
              <QuestionTitle theme={theme}>
                {getQuestionTitle(currentQuestion.tipo)}
              </QuestionTitle>
              <QuestionText theme={theme}>
                {currentQuestion.pregunta}
              </QuestionText>
              <GuideText theme={theme}>
                💡 {currentQuestion.guia}
              </GuideText>
            </QuestionContent>
          </QuestionHeader>

          <TextAreaWrapper>
            <TextArea
              value={currentAnswer}
              onChange={handleAnswerChange}
              placeholder="Escribe tu respuesta aquí..."
              theme={theme}
              $hasError={!validation.valid && wordCount > 0}
            />
            <WordCounter>
              <WordCount
                $count={wordCount}
                $min={50}
                $max={200}
              >
                {wordCount} palabras
              </WordCount>
              <WordGuidance theme={theme}>
                Objetivo: {currentQuestion.palabras_objetivo || 150} palabras
              </WordGuidance>
            </WordCounter>
          </TextAreaWrapper>

          {!validation.valid && currentAnswer.trim() && (
            <ValidationMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              $type={validation.type}
            >
              {validation.message}
            </ValidationMessage>
          )}

          <ActionsRow>
            {currentIndex > 0 && (
              <ActionButton
                $variant="outline"
                onClick={handlePrevious}
                theme={theme}
              >
                ← Anterior
              </ActionButton>
            )}

            <ActionButton
              $variant="primary"
              onClick={handleNext}
              disabled={!validation.valid}
              theme={theme}
            >
              {currentIndex < questions.length - 1 ? 'Siguiente →' : 'Finalizar'}
            </ActionButton>
          </ActionsRow>
        </QuestionCard>
      </AnimatePresence>
    </Container>
  );
};

export default React.memo(SynthesisQuestions);
