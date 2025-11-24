/**
 * NextStepCard - Componente de guía pedagógica entre pestañas
 * Parte de la arquitectura de literacidad crítica guiada
 * 
 * Función: Conectar explícitamente las etapas del ciclo pedagógico
 * Ciclo: Lectura Guiada → Análisis → Actividades → Evaluación
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const NextStepCard = ({ icon, title, description, actionLabel, onAction, theme, variant = 'primary' }) => {
  const variants = {
    primary: {
      bgGradient: `linear-gradient(135deg, ${theme.primary}10, ${theme.success}10)`,
      borderColor: `${theme.primary}40`,
      iconColor: theme.primary,
      buttonBg: theme.primary
    },
    success: {
      bgGradient: `linear-gradient(135deg, ${theme.success}10, ${theme.primary}10)`,
      borderColor: `${theme.success}40`,
      iconColor: theme.success,
      buttonBg: theme.success
    },
    warning: {
      bgGradient: `linear-gradient(135deg, ${theme.warning}10, ${theme.primary}10)`,
      borderColor: `${theme.warning}40`,
      iconColor: theme.warning,
      buttonBg: theme.warning
    }
  };

  const variantStyles = variants[variant] || variants.primary;

  return (
    <CardContainer
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      $bgGradient={variantStyles.bgGradient}
      $borderColor={variantStyles.borderColor}
    >
      <ContentWrapper>
        <IconWrapper $iconColor={variantStyles.iconColor}>
          {icon}
        </IconWrapper>
        
        <TextContent>
          <Title theme={theme}>{title}</Title>
          <Description theme={theme}>{description}</Description>
        </TextContent>
      </ContentWrapper>
      
      {onAction && actionLabel && (
        <ActionButton
          onClick={onAction}
          $buttonBg={variantStyles.buttonBg}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {actionLabel}
        </ActionButton>
      )}
    </CardContainer>
  );
};

export default NextStepCard;

// ============================================================
// STYLED COMPONENTS
// ============================================================

const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: ${props => props.$bgGradient};
  border: 2px solid ${props => props.$borderColor};
  border-radius: 12px;
  margin-top: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => props.$iconColor}15;
  border-radius: 50%;
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const TextContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.text || props.theme.textPrimary};
`;

const Description = styled.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${props => props.theme.textSecondary || props.theme.textMuted};
`;

const ActionButton = styled(motion.button)`
  align-self: flex-start;
  padding: 0.75rem 1.5rem;
  background: ${props => props.$buttonBg};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 2px 8px ${props => props.$buttonBg}40;
  
  &:hover {
    box-shadow: 0 4px 12px ${props => props.$buttonBg}50;
  }
`;
