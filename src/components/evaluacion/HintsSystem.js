// src/components/evaluacion/HintsSystem.js
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const getTheme = (props) => props.$theme || props.theme || {};

const HintsContainer = styled.div`
  background: ${props => getTheme(props).infoBg};
  border: 1px solid ${props => getTheme(props).info};
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
  color: ${props => getTheme(props).text};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HintsCounter = styled.div`
  font-size: 0.8rem;
  color: ${props => getTheme(props).textMuted};
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
  background: ${props => getTheme(props).surface};
  border-left: 3px solid ${props => getTheme(props).info};
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.5;
  color: ${props => getTheme(props).text};
`;

const HintButton = styled(motion.button)`
  background: ${props => getTheme(props).info};
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
    background: ${props => getTheme(props).infoDark || getTheme(props).info};
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: ${props => getTheme(props).border};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const NoHintsMessage = styled.div`
  text-align: center;
  padding: 1rem;
  color: ${props => getTheme(props).textMuted};
  font-size: 0.85rem;
  font-style: italic;
`;

const WarningMessage = styled.div`
  background: ${props => getTheme(props).warningBg || '#fff3cd'};
  color: ${props => getTheme(props).warning || '#856404'};
  border: 1px solid ${props => getTheme(props).warning || '#ffc107'};
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

  const themeOverrides = useMemo(() => {
    if (!theme || typeof theme !== 'object') return null;
    // Si el theme que nos pasan no tiene tokens de info, NO lo usamos para no romper estilos.
    if (!theme.info && !theme.infoBg) return null;
    return theme;
  }, [theme]);
  
  const hasHints = hints && hints.length > 0;
  const totalHints = Math.min(maxHints, hints.length);
  const remainingHints = Math.max(0, totalHints - revealedHints.length);
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
      <HintsContainer $theme={themeOverrides}>
        <HintsTitle $theme={themeOverrides}>💡 Hints de Apoyo</HintsTitle>
        <NoHintsMessage $theme={themeOverrides}>
          No hay hints disponibles para esta pregunta
        </NoHintsMessage>
      </HintsContainer>
    );
  }
  
  return (
    <HintsContainer $theme={themeOverrides}>
      <HintsHeader>
        <HintsTitle $theme={themeOverrides}>
          💡 Hints de Apoyo
        </HintsTitle>
        <HintsCounter $theme={themeOverrides}>
          <span>{remainingHints}/{totalHints}</span>
          <span>disponibles</span>
        </HintsCounter>
      </HintsHeader>
      
      {revealedHints.length > 0 && (
        <HintsList>
          <AnimatePresence>
            {revealedHints.map((hint, index) => (
              <HintCard
                key={index}
                $theme={themeOverrides}
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
            $theme={themeOverrides}
            onClick={handleRevealHint}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>💡</span>
            <span>Revelar Hint #{revealedHints.length + 1}</span>
          </HintButton>
          
          {revealedHints.length === 0 && (
            <WarningMessage $theme={themeOverrides}>
              ⚠️ Intenta responder primero sin hints para desarrollar tu pensamiento crítico
            </WarningMessage>
          )}
        </>
      ) : (
        <NoHintsMessage $theme={themeOverrides}>
          {revealedHints.length >= maxHints 
            ? '✅ Has usado todos los hints disponibles'
            : '✅ Has revelado todos los hints'}
        </NoHintsMessage>
      )}
    </HintsContainer>
  );
};

export default HintsSystem;
