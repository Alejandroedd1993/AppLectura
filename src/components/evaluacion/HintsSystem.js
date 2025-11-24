// src/components/evaluacion/HintsSystem.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const HintsContainer = styled.div`
  background: ${props => props.theme.infoBg};
  border: 1px solid ${props => props.theme.info};
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
`;

const HintsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const HintsTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HintsCounter = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const HintsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const HintCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-left: 3px solid ${props => props.theme.info};
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.5;
  color: ${props => props.theme.text};
`;

const HintButton = styled(motion.button)`
  background: ${props => props.theme.info};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${props => props.theme.infoDark || props.theme.info};
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: ${props => props.theme.border};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const NoHintsMessage = styled.div`
  text-align: center;
  padding: 1rem;
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`;

const WarningMessage = styled.div`
  background: ${props => props.theme.warningBg || '#fff3cd'};
  color: ${props => props.theme.warning || '#856404'};
  border: 1px solid ${props => props.theme.warning || '#ffc107'};
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/**
 * Sistema de hints progresivos
 */
const HintsSystem = ({ 
  hints = [], 
  maxHints = 3, 
  onHintRevealed,
  theme 
}) => {
  const [revealedHints, setRevealedHints] = useState([]);
  
  const hasHints = hints && hints.length > 0;
  const remainingHints = maxHints - revealedHints.length;
  const canRevealMore = remainingHints > 0 && revealedHints.length < hints.length;
  
  const handleRevealHint = () => {
    if (canRevealMore) {
      const nextHintIndex = revealedHints.length;
      const newRevealedHints = [...revealedHints, hints[nextHintIndex]];
      setRevealedHints(newRevealedHints);
      
      if (onHintRevealed) {
        onHintRevealed(nextHintIndex, hints[nextHintIndex]);
      }
    }
  };
  
  if (!hasHints) {
    return (
      <HintsContainer theme={theme}>
        <HintsTitle theme={theme}>💡 Hints de Apoyo</HintsTitle>
        <NoHintsMessage theme={theme}>
          No hay hints disponibles para esta pregunta
        </NoHintsMessage>
      </HintsContainer>
    );
  }
  
  return (
    <HintsContainer theme={theme}>
      <HintsHeader>
        <HintsTitle theme={theme}>
          💡 Hints de Apoyo
        </HintsTitle>
        <HintsCounter theme={theme}>
          <span>{revealedHints.length}/{Math.min(maxHints, hints.length)}</span>
          <span>disponibles</span>
        </HintsCounter>
      </HintsHeader>
      
      {revealedHints.length > 0 && (
        <HintsList>
          <AnimatePresence>
            {revealedHints.map((hint, index) => (
              <HintCard
                key={index}
                theme={theme}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {hint}
              </HintCard>
            ))}
          </AnimatePresence>
        </HintsList>
      )}
      
      {canRevealMore ? (
        <>
          <HintButton
            theme={theme}
            onClick={handleRevealHint}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>💡</span>
            <span>Revelar Hint #{revealedHints.length + 1}</span>
          </HintButton>
          
          {revealedHints.length === 0 && (
            <WarningMessage theme={theme}>
              ⚠️ Intenta responder primero sin hints para desarrollar tu pensamiento crítico
            </WarningMessage>
          )}
        </>
      ) : (
        <NoHintsMessage theme={theme}>
          {revealedHints.length >= maxHints 
            ? '✅ Has usado todos los hints disponibles'
            : '✅ Has revelado todos los hints'}
        </NoHintsMessage>
      )}
    </HintsContainer>
  );
};

export default HintsSystem;
