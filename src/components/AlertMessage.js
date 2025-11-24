import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const AlertContainer = styled(motion.div)`
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 4px solid ${props => props.$borderColor};
  background: ${props => props.$backgroundColor};
  color: ${props => props.$textColor};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const IconContainer = styled.div`
  font-size: 1.2rem;
  flex-shrink: 0;
`;

const MessageText = styled.div`
  flex: 1;
  font-weight: 500;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
  }
`;

const getAlertStyles = (type) => {
  switch (type) {
    case 'error':
      return {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        textColor: '#DC2626',
        icon: '❌'
      };
    case 'warning':
      return {
        backgroundColor: '#FEF3C7',
        borderColor: '#FBBF24',
        textColor: '#D97706',
        icon: '⚠️'
      };
    case 'success':
      return {
        backgroundColor: '#D1FAE5',
        borderColor: '#009688',
        textColor: '#065F46',
        icon: '✅'
      };
    case 'info':
    default:
      return {
        backgroundColor: '#E9F3FF',
        borderColor: '#3190FC',
        textColor: '#1E40AF',
        icon: 'ℹ️'
      };
  }
};

function AlertMessage({ type = 'info', message, onClose, icon }) {
  const styles = getAlertStyles(type);
  const displayIcon = icon || styles.icon;

  return (
    <AnimatePresence>
      <AlertContainer
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        $backgroundColor={styles.backgroundColor}
        $borderColor={styles.borderColor}
        $textColor={styles.textColor}
        role="alert"
      >
        <IconContainer>{displayIcon}</IconContainer>
        <MessageText>{message}</MessageText>
        {onClose && (
          <CloseButton onClick={onClose} title="Cerrar">
            ×
          </CloseButton>
        )}
      </AlertContainer>
    </AnimatePresence>
  );
}

export default AlertMessage;