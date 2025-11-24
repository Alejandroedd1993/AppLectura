/**
 * EvaluationProgressBar
 * 
 * Componente para mostrar progreso de evaluación con IA
 * Incluye barra animada, tiempo estimado y pasos del proceso
 * Reduce ansiedad del usuario durante operaciones largas
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// Pasos típicos de evaluación dual (definidos fuera del componente para evitar recreaciones)
const DEFAULT_STEPS = [
  { label: 'Analizando estructura...', icon: '📊', duration: 5 },
  { label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 },
  { label: 'Evaluando con OpenAI...', icon: '🧠', duration: 10 },
  { label: 'Combinando feedback...', icon: '🔧', duration: 3 }
];

const EvaluationProgressBar = ({ 
  isEvaluating, 
  estimatedSeconds = 30,
  currentStep = null,
  theme 
}) => {
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = useMemo(() => DEFAULT_STEPS, []);

  // Calcular progreso basado en tiempo transcurrido
  useEffect(() => {
    if (!isEvaluating) {
      setProgress(0);
      setElapsedSeconds(0);
      setCurrentStepIndex(0);
      return;
    }

    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      // Progreso no lineal: rápido al inicio, más lento cerca del final
      const rawProgress = Math.min((elapsed / estimatedSeconds) * 100, 95);
      const smoothProgress = Math.pow(rawProgress / 100, 0.8) * 100;
      setProgress(Math.min(smoothProgress, 95));

      // Actualizar paso actual basado en duración acumulada
      let accumulatedTime = 0;
      for (let i = 0; i < steps.length; i++) {
        accumulatedTime += steps[i].duration;
        if (elapsed < accumulatedTime) {
          setCurrentStepIndex(i);
          break;
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isEvaluating, estimatedSeconds]); // Removido 'steps' de dependencias

  // Usar paso proporcionado externamente si está disponible
  const displayStep = currentStep || steps[currentStepIndex];

  if (!isEvaluating) return null;

  const remainingSeconds = Math.max(0, estimatedSeconds - elapsedSeconds);

  return (
    <Container
      as={motion.div}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      theme={theme}
    >
      {/* Header con tiempo estimado */}
      <Header>
        <StepInfo>
          <StepIcon>{displayStep.icon}</StepIcon>
          <StepLabel theme={theme}>{displayStep.label}</StepLabel>
        </StepInfo>
        <TimeInfo theme={theme}>
          ⏱️ ~{remainingSeconds}s restantes
        </TimeInfo>
      </Header>

      {/* Barra de progreso */}
      <ProgressBarContainer theme={theme}>
        <ProgressBarFill 
          $progress={progress}
          theme={theme}
        />
        <ProgressPercentage theme={theme}>
          {Math.round(progress)}%
        </ProgressPercentage>
      </ProgressBarContainer>

      {/* Indicador de pasos */}
      <StepsIndicator>
        {steps.map((step, index) => (
          <StepDot 
            key={index}
            $active={index === currentStepIndex}
            $completed={index < currentStepIndex}
            theme={theme}
            title={step.label}
          >
            {index < currentStepIndex ? '✓' : step.icon}
          </StepDot>
        ))}
      </StepsIndicator>

      {/* Mensaje de paciencia */}
      <PatientMessage theme={theme}>
        💡 <strong>Tip:</strong> Evaluación dual para máxima precisión. 
        No cierres esta pestaña.
      </PatientMessage>
    </Container>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div`
  background: ${props => props.theme.surface || '#fff'};
  border: 2px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const StepInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StepIcon = styled.span`
  font-size: 1.5rem;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const StepLabel = styled.span`
  font-weight: 600;
  color: ${props => props.theme.textPrimary || '#333'};
  font-size: 0.95rem;
`;

const TimeInfo = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textSecondary || '#666'};
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  background: ${props => props.theme.surfaceAlt || '#f5f5f5'};
  border-radius: 20px;
`;

const ProgressBarContainer = styled.div`
  position: relative;
  width: 100%;
  height: 24px;
  background: ${props => props.theme.border || '#e0e0e0'};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressBarFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(
    90deg,
    ${props => props.theme.primary || '#2196F3'} 0%,
    ${props => props.theme.success || '#4CAF50'} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 2s linear infinite;
  transition: width 0.3s ease;
  border-radius: 12px;
`;

const ProgressPercentage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: ${props => props.theme.surface || '#fff'};
  font-weight: 700;
  font-size: 0.8rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  z-index: 1;
  mix-blend-mode: difference;
`;

const StepsIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
`;

const StepDot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  ${props => props.$completed && css`
    background: ${props.theme.success || '#4CAF50'};
    color: white;
    box-shadow: 0 2px 8px ${props.theme.success}40;
  `}
  
  ${props => props.$active && css`
    background: ${props.theme.primary || '#2196F3'};
    color: white;
    box-shadow: 0 2px 8px ${props.theme.primary}40;
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
  
  ${props => !props.$active && !props.$completed && css`
    background: ${props.theme.border || '#e0e0e0'};
    opacity: 0.5;
  `}
`;

const PatientMessage = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textSecondary || '#666'};
  text-align: center;
  line-height: 1.5;
  padding: 0.75rem;
  background: ${props => props.theme.warning}10 || '#fff3cd';
  border-radius: 6px;
  
  strong {
    color: ${props => props.theme.textPrimary || '#333'};
  }
`;

export default EvaluationProgressBar;
