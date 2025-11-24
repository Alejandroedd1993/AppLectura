// src/components/evaluacion/EvaluationProgress.js
import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const ProgressContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 2px solid ${props => props.theme.primary};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const ProgressHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const ProgressIcon = styled.div`
  font-size: 2rem;
  ${css`animation: ${pulse} 2s ease-in-out infinite;`}
`;

const ProgressTitle = styled.h3`
  color: ${props => props.theme.text};
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const StepsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StepRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StepIndicator = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  
  ${props => {
    if (props.$status === 'completed') {
      return css`
        background: ${props.theme.success || '#4caf50'};
        color: white;
      `;
    }
    if (props.$status === 'active') {
      return css`
        background: ${props.theme.primary};
        color: white;
        animation: ${pulse} 1.5s ease-in-out infinite;
      `;
    }
    return css`
      background: ${props.theme.backgroundSecondary};
      color: ${props.theme.textSecondary};
      border: 2px solid ${props.theme.border};
    `;
  }}
`;

const StepContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StepLabel = styled.div`
  color: ${props => props.$active ? props.theme.text : props.theme.textSecondary};
  font-weight: ${props => props.$active ? '600' : '400'};
  font-size: 0.95rem;
`;

const StepDescription = styled.div`
  color: ${props => props.theme.textSecondary};
  font-size: 0.85rem;
  font-style: italic;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: ${props => props.theme.backgroundSecondary};
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
`;

const ProgressBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(
    90deg,
    ${props => props.theme.primary} 0%,
    ${props => props.theme.primaryLight || props.theme.primary} 50%,
    ${props => props.theme.primary} 100%
  );
  background-size: 200% 100%;
  ${css`animation: ${shimmer} 2s linear infinite;`}
  border-radius: 4px;
`;

const TimeEstimate = styled.div`
  color: ${props => props.theme.textSecondary};
  font-size: 0.85rem;
  text-align: center;
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

/**
 * Pasos del proceso de evaluación
 */
export const EVALUATION_STEPS = {
  GENERATING: {
    id: 'generating',
    icon: '✨',
    label: 'Generando pregunta',
    description: 'Analizando el texto y creando pregunta contextualizada',
    estimatedDuration: 3000 // ms
  },
  SUBMITTING: {
    id: 'submitting',
    icon: '📤',
    label: 'Enviando respuesta',
    description: 'Preparando tu respuesta para evaluación',
    estimatedDuration: 1000
  },
  EVALUATING_STRUCTURE: {
    id: 'evaluating_structure',
    icon: '🔍',
    label: 'Evaluando estructura',
    description: 'DeepSeek analiza claridad y evidencias textuales',
    estimatedDuration: 5000
  },
  EVALUATING_DEPTH: {
    id: 'evaluating_depth',
    icon: '🧠',
    label: 'Evaluando profundidad',
    description: 'GPT-4 evalúa pensamiento crítico y originalidad',
    estimatedDuration: 6000
  },
  COMBINING: {
    id: 'combining',
    icon: '⚖️',
    label: 'Combinando resultados',
    description: 'Generando retroalimentación integral',
    estimatedDuration: 1000
  }
};

/**
 * Componente de progreso para operaciones de evaluación
 */
const EvaluationProgress = ({ 
  mode = 'generating', // 'generating' | 'evaluating'
  currentStep = null,
  progress = 0,
  estimatedTimeRemaining = null,
  theme 
}) => {
  // Definir steps según el modo
  const steps = mode === 'generating' 
    ? [EVALUATION_STEPS.GENERATING]
    : [
        EVALUATION_STEPS.SUBMITTING,
        EVALUATION_STEPS.EVALUATING_STRUCTURE,
        EVALUATION_STEPS.EVALUATING_DEPTH,
        EVALUATION_STEPS.COMBINING
      ];

  // Determinar el step actual
  const activeStepIndex = currentStep 
    ? steps.findIndex(s => s.id === currentStep)
    : 0;

  // Calcular progreso visual
  const visualProgress = currentStep
    ? ((activeStepIndex + 1) / steps.length) * 100
    : progress;

  return (
    <AnimatePresence mode="wait">
      <ProgressContainer
        theme={theme}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <ProgressHeader>
          <ProgressIcon>
            {mode === 'generating' ? '✨' : '🎯'}
          </ProgressIcon>
          <ProgressTitle theme={theme}>
            {mode === 'generating' 
              ? 'Generando pregunta contextualizada...'
              : 'Evaluando tu respuesta...'
            }
          </ProgressTitle>
        </ProgressHeader>

        <StepsContainer>
          {steps.map((step, index) => {
            const isCompleted = index < activeStepIndex;
            const isActive = index === activeStepIndex;
            const status = isCompleted ? 'completed' : isActive ? 'active' : 'pending';

            return (
              <StepRow key={step.id}>
                <StepIndicator $status={status} theme={theme}>
                  {isCompleted ? '✓' : step.icon}
                </StepIndicator>
                <StepContent>
                  <StepLabel $active={isActive} theme={theme}>
                    {step.label}
                  </StepLabel>
                  {isActive && (
                    <StepDescription theme={theme}>
                      {step.description}
                    </StepDescription>
                  )}
                </StepContent>
              </StepRow>
            );
          })}
        </StepsContainer>

        <ProgressBarContainer theme={theme}>
          <ProgressBarFill
            theme={theme}
            initial={{ width: 0 }}
            animate={{ width: `${visualProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </ProgressBarContainer>

        {estimatedTimeRemaining && (
          <TimeEstimate theme={theme}>
            ⏱️ Tiempo estimado: {Math.ceil(estimatedTimeRemaining / 1000)}s
          </TimeEstimate>
        )}
      </ProgressContainer>
    </AnimatePresence>
  );
};

export default EvaluationProgress;
