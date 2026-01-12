// src/components/evaluacion/GuidedPracticeMode.js
import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DIFFICULTY_LEVELS,
  generatePracticePlan,
  determineDifficultyLevel,
  getHintsForDimension
} from '../../services/practiceService';

const ModeContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 2px solid ${props => props.theme.primary};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const ModeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.border};
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`;

const ModeTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModeBadge = styled.div`
  background: ${props => props.theme.primary};
  color: white;
  padding: 0.375rem 0.875rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PracticePlanCard = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const PlanTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PlanDescription = styled.p`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const DifficultySelector = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const DifficultyCard = styled(motion.button)`
  background: ${props => props.$selected ? props.theme.primary : props.theme.background};
  color: ${props => props.$selected ? 'white' : props.theme.text};
  border: 2px solid ${props => props.$selected ? props.theme.primary : props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${props => props.theme.primary};
  }
`;

const DifficultyIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;

const DifficultyLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
`;

const DifficultyDesc = styled.div`
  font-size: 0.75rem;
  opacity: 0.9;
  line-height: 1.3;
`;

const DifficultyFeatures = styled.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  font-size: 0.7rem;
  opacity: 0.8;
  
  li {
    margin: 0.25rem 0;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const StatCard = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color || props.theme.text};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StepsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const StepCard = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

const StepNumber = styled.div`
  background: ${props => props.theme.primary};
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
`;

const StepDescription = styled.div`
  color: ${props => props.theme.textMuted};
  font-size: 0.8rem;
  line-height: 1.4;
`;

const ActionButton = styled(motion.button)`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  
  &:hover {
    background: ${props => props.theme.primaryDark};
  }
`;

const ToggleModeButton = styled(motion.button)`
  background: transparent;
  color: ${props => props.theme.textMuted};
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.primary};
    color: ${props => props.theme.primary};
  }
`;

const RecommendationBanner = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.primary}15, ${props => props.theme.info}15);
  border: 1px solid ${props => props.theme.primary};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const RecommendationIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
`;

const RecommendationText = styled.div`
  flex: 1;
  
  h4 {
    margin: 0 0 0.25rem 0;
    color: ${props => props.theme.text};
    font-size: 0.9rem;
  }
  
  p {
    margin: 0;
    color: ${props => props.theme.textMuted};
    font-size: 0.8rem;
    line-height: 1.4;
  }
`;

const NoSelectionBanner = styled.div`
  background: ${props => props.theme.warning}15;
  border: 1px solid ${props => props.theme.warning};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
`;

const NoSelectionIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
`;

const NoSelectionText = styled.div`
  flex: 1;
  
  h4 {
    margin: 0 0 0.25rem 0;
    color: ${props => props.theme.text};
    font-size: 0.9rem;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    color: ${props => props.theme.textMuted};
    font-size: 0.85rem;
    line-height: 1.4;
  }
`;

/**
 * Componente de Modo de Práctica Guiada
 */
const GuidedPracticeMode = ({ 
  rubricProgress, 
  selectedDimension,
  onStartPractice,
  theme 
}) => {
  const [showPlan, setShowPlan] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  
  // Generar plan de práctica personalizado
  const practicePlan = useMemo(() => 
    generatePracticePlan(rubricProgress),
    [rubricProgress]
  );
  
  // Determinar nivel actual para la dimensión seleccionada
  const currentLevel = useMemo(() => {
    if (!selectedDimension) return DIFFICULTY_LEVELS.EASY;
    return determineDifficultyLevel(rubricProgress, selectedDimension);
  }, [rubricProgress, selectedDimension]);
  
  // Obtener hints para la dimensión y dificultad seleccionadas
  const availableHints = useMemo(() => {
    if (!selectedDimension || !selectedDifficulty) return [];
    return getHintsForDimension(selectedDimension, selectedDifficulty);
  }, [selectedDimension, selectedDifficulty]);
  
  const handleStartPractice = () => {
    const difficulty = selectedDifficulty || currentLevel.id;
    if (onStartPractice) {
      onStartPractice({
        practiceId: `${selectedDimension || 'no-dim'}:${difficulty}:${Date.now()}`,
        dimension: selectedDimension || null,
        difficulty,
        hints: availableHints,
        level: selectedDifficulty ? DIFFICULTY_LEVELS[selectedDifficulty.toUpperCase()] : currentLevel
      });
    }
  };
  
  if (!showPlan) {
    return (
      <ToggleModeButton
        theme={theme}
        onClick={() => setShowPlan(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>🎯</span>
        <span>Activar Modo Práctica Guiada</span>
      </ToggleModeButton>
    );
  }
  
  return (
    <ModeContainer
      theme={theme}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <ModeHeader theme={theme}>
        <ModeTitle theme={theme}>
          🎯 Modo Práctica Guiada
        </ModeTitle>
        <ModeBadge theme={theme}>
          <span>✨</span>
          <span>ACTIVO</span>
        </ModeBadge>
      </ModeHeader>
      
      {/* Banner de selección de dimensión */}
      {!selectedDimension && (
        <NoSelectionBanner theme={theme}>
          <NoSelectionIcon>⚠️</NoSelectionIcon>
          <NoSelectionText theme={theme}>
            <h4>Selecciona una Dimensión Primero</h4>
            <p>
              Para comenzar la práctica guiada, primero debes seleccionar una de las 5 dimensiones 
              en las tarjetas de arriba. Cada dimensión evalúa un aspecto diferente de tu literacidad crítica.
            </p>
          </NoSelectionText>
        </NoSelectionBanner>
      )}
      
      {/* Recomendación personalizada */}
      {selectedDimension && (
        <RecommendationBanner theme={theme}>
          <RecommendationIcon>🎓</RecommendationIcon>
          <RecommendationText theme={theme}>
            <h4>Recomendación Personalizada</h4>
            <p>{practicePlan.reason}</p>
          </RecommendationText>
        </RecommendationBanner>
      )}
      
      {/* Plan de práctica */}
      <PracticePlanCard theme={theme}>
        <PlanTitle theme={theme}>
          📋 Tu Plan de Práctica
        </PlanTitle>
        <PlanDescription theme={theme}>
          Tiempo estimado: {practicePlan.estimatedTime}
        </PlanDescription>
        
        {/* Estadísticas de progreso */}
        <StatsGrid>
          {Object.entries(practicePlan.statistics).map(([difficulty, stats]) => (
            <StatCard key={difficulty} theme={theme}>
              <StatValue 
                theme={theme}
                $color={
                  difficulty === 'easy' ? '#10b981' :
                  difficulty === 'medium' ? '#f59e0b' : '#ef4444'
                }
              >
                {stats.completed}
              </StatValue>
              <StatLabel theme={theme}>
                {DIFFICULTY_LEVELS[difficulty.toUpperCase()].label}
              </StatLabel>
            </StatCard>
          ))}
        </StatsGrid>
        
        {/* Pasos del plan */}
        <StepsContainer>
          {practicePlan.steps.map((step) => (
            <StepCard key={step.step}>
              <StepNumber theme={theme}>{step.step}</StepNumber>
              <StepContent>
                <StepTitle theme={theme}>{step.title}</StepTitle>
                <StepDescription theme={theme}>{step.description}</StepDescription>
              </StepContent>
            </StepCard>
          ))}
        </StepsContainer>
      </PracticePlanCard>
      
      {/* Información de dimensión seleccionada */}
      {selectedDimension && (
        <PracticePlanCard theme={theme}>
          <PlanTitle theme={theme}>
            🎯 Dimensión Seleccionada
          </PlanTitle>
          <PlanDescription theme={theme}>
            Practicarás con preguntas específicas de la dimensión: <strong>{selectedDimension}</strong>
            <br />
            Tu progreso actual en esta dimensión se reflejará en las estadísticas y plan de práctica.
          </PlanDescription>
        </PracticePlanCard>
      )}
      
      {/* Selector de dificultad */}
      <PlanTitle theme={theme}>
        🎚️ Selecciona tu Nivel de Dificultad
      </PlanTitle>
      {!selectedDimension && (
        <PlanDescription theme={theme} style={{ marginBottom: '1rem', opacity: 0.7 }}>
          ⚠️ Selecciona una dimensión arriba para activar el selector de dificultad
        </PlanDescription>
      )}
      <DifficultySelector style={{ opacity: selectedDimension ? 1 : 0.5 }}>
        {Object.values(DIFFICULTY_LEVELS).map((level) => (
          <DifficultyCard
            key={level.id}
            theme={theme}
            $selected={selectedDifficulty === level.id}
            onClick={() => selectedDimension && setSelectedDifficulty(level.id)}
            whileHover={{ scale: selectedDimension ? 1.02 : 1 }}
            whileTap={{ scale: selectedDimension ? 0.98 : 1 }}
            style={{ cursor: selectedDimension ? 'pointer' : 'not-allowed' }}
            disabled={!selectedDimension}
          >
            <DifficultyIcon>{level.label.split(' ')[0]}</DifficultyIcon>
            <DifficultyLabel>{level.label}</DifficultyLabel>
            <DifficultyDesc>{level.description}</DifficultyDesc>
            <DifficultyFeatures>
              {level.characteristics.map((char, idx) => (
                <li key={idx}>{char}</li>
              ))}
            </DifficultyFeatures>
          </DifficultyCard>
        ))}
      </DifficultySelector>
      
      {/* Sistema de hints preview */}
      {selectedDifficulty && selectedDimension && availableHints.length > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <PlanDescription theme={theme}>
              💡 Tendrás {DIFFICULTY_LEVELS[selectedDifficulty.toUpperCase()].hintsAvailable} hints disponibles para esta práctica
            </PlanDescription>
          </motion.div>
        </AnimatePresence>
      )}
      
      {/* Botones de acción */}
      <ActionButton
        theme={theme}
        onClick={handleStartPractice}
        disabled={!selectedDifficulty || !selectedDimension}
        style={{
          opacity: (selectedDifficulty && selectedDimension) ? 1 : 0.5,
          cursor: (selectedDifficulty && selectedDimension) ? 'pointer' : 'not-allowed'
        }}
        whileHover={{ scale: (selectedDifficulty && selectedDimension) ? 1.02 : 1 }}
        whileTap={{ scale: (selectedDifficulty && selectedDimension) ? 0.98 : 1 }}
      >
        <span>🚀</span>
        <span>
          {!selectedDimension ? 'Selecciona una Dimensión' :
           !selectedDifficulty ? 'Selecciona un Nivel de Dificultad' :
           'Comenzar Práctica'}
        </span>
      </ActionButton>
      
      {selectedDimension && selectedDifficulty && (
        <PlanDescription theme={theme} style={{ 
          textAlign: 'center', 
          marginTop: '0.75rem',
          fontSize: '0.85rem',
          color: theme.success
        }}>
          ✅ Todo listo para comenzar tu práctica guiada en <strong>{selectedDimension}</strong> nivel <strong>{DIFFICULTY_LEVELS[selectedDifficulty.toUpperCase()].label}</strong>
        </PlanDescription>
      )}
      
      <ToggleModeButton
        theme={theme}
        onClick={() => setShowPlan(false)}
        style={{ marginTop: '0.75rem' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>❌</span>
        <span>Desactivar Modo Guiado</span>
      </ToggleModeButton>
    </ModeContainer>
  );
};

export default GuidedPracticeMode;
