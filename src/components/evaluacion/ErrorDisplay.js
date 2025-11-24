// src/components/evaluacion/ErrorDisplay.js
import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserFriendlyMessage } from '../../services/evaluationErrors';

const ErrorContainer = styled(motion.div)`
  background: ${props => props.theme.errorBackground || '#fee'};
  border: 2px solid ${props => props.theme.errorBorder || '#f88'};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.1);
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h3`
  color: ${props => props.theme.errorText || '#c00'};
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  color: ${props => props.theme.text};
  margin: 0 0 1rem 0;
  line-height: 1.5;
`;

const ErrorAction = styled.p`
  color: ${props => props.theme.textSecondary};
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-style: italic;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const RetryButton = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.theme.primaryDark || props.theme.primary};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${props => props.theme.disabled || '#ccc'};
    cursor: not-allowed;
    transform: none;
  }
`;

const DismissButton = styled.button`
  background: transparent;
  color: ${props => props.theme.textSecondary};
  border: 2px solid ${props => props.theme.border};
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.backgroundSecondary};
    border-color: ${props => props.theme.textSecondary};
  }
`;

const ErrorDetails = styled.details`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
  
  summary {
    cursor: pointer;
    color: ${props => props.theme.textSecondary};
    font-size: 0.9rem;
    user-select: none;
    
    &:hover {
      color: ${props => props.theme.text};
    }
  }
`;

const ErrorDetailsContent = styled.pre`
  background: ${props => props.theme.backgroundSecondary};
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  overflow-x: auto;
  color: ${props => props.theme.textSecondary};
`;

const AttemptCounter = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => props.theme.backgroundSecondary};
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 1rem;
`;

/**
 * Componente para mostrar errores de evaluación con UI amigable
 */
const ErrorDisplay = ({ 
  error, 
  onRetry, 
  onDismiss, 
  showDetails = false,
  attempt = null,
  maxAttempts = null,
  theme 
}) => {
  if (!error) return null;

  // Asegurarse de que error tenga el formato correcto
  const errorObj = error instanceof Error 
    ? { type: 'UNKNOWN', message: error.message, retryable: true, details: {} }
    : error;

  const errorInfo = getUserFriendlyMessage(errorObj.type || 'UNKNOWN');
  const canRetry = errorObj.retryable && onRetry;

  return (
    <AnimatePresence mode="wait">
      <ErrorContainer
        theme={theme}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {attempt && maxAttempts && (
          <AttemptCounter theme={theme}>
            🔄 Intento {attempt}/{maxAttempts}
          </AttemptCounter>
        )}

        <ErrorHeader>
          <ErrorTitle theme={theme}>{errorInfo.title}</ErrorTitle>
        </ErrorHeader>

        <ErrorMessage theme={theme}>
          {errorInfo.message}
        </ErrorMessage>

        <ErrorAction theme={theme}>
          💡 {errorInfo.action}
        </ErrorAction>

        <ButtonGroup>
          {canRetry && (
            <RetryButton theme={theme} onClick={onRetry}>
              🔄 Reintentar
            </RetryButton>
          )}
          
          {onDismiss && (
            <DismissButton theme={theme} onClick={onDismiss}>
              ✕ Cerrar
            </DismissButton>
          )}
        </ButtonGroup>

        {showDetails && errorObj.details && (
          <ErrorDetails theme={theme}>
            <summary>🔍 Detalles técnicos</summary>
            <ErrorDetailsContent theme={theme}>
              {JSON.stringify({
                type: errorObj.type,
                message: errorObj.message,
                timestamp: errorObj.timestamp,
                details: typeof errorObj.details === 'object' 
                  ? Object.keys(errorObj.details).reduce((acc, key) => {
                      const value = errorObj.details[key];
                      acc[key] = value instanceof Error ? value.message : value;
                      return acc;
                    }, {})
                  : errorObj.details
              }, null, 2)}
            </ErrorDetailsContent>
          </ErrorDetails>
        )}
      </ErrorContainer>
    </AnimatePresence>
  );
};

export default ErrorDisplay;
