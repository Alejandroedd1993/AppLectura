import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const Modal = styled(motion.div)`
  background: ${p => p.theme.surface};
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 2px solid ${p => p.theme.warning || '#ff9800'};
`;

const Icon = styled.div`
  font-size: 4rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  color: ${p => p.theme.text};
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 1rem 0;
`;

const Message = styled.p`
  color: ${p => p.theme.textSecondary};
  font-size: 1rem;
  text-align: center;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
`;

const SessionInfo = styled.div`
  background: ${p => p.theme.background};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  
  p {
    margin: 0.5rem 0;
    color: ${p => p.theme.textSecondary};
    
    strong {
      color: ${p => p.theme.text};
    }
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.primary {
    background: ${p => p.theme.primary};
    color: white;
    
    &:hover {
      background: ${p => p.theme.primaryDark || p.theme.primary};
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(49, 144, 252, 0.3);
    }
  }
  
  &.secondary {
    background: ${p => p.theme.border};
    color: ${p => p.theme.text};
    
    &:hover {
      background: ${p => p.theme.borderDark || p.theme.border};
    }
  }
`;

/**
 * Modal que notifica al usuario cuando otra sesión tomó control de su cuenta
 */
export default function SessionConflictModal({ isOpen, sessionInfo, onReload, onLogout }) {
  if (!isOpen) return null;
  
  const formatDate = (date) => {
    if (!date) return 'Desconocido';
    try {
      return new Date(date).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return 'Desconocido';
    }
  };
  
  const getBrowserName = (userAgent) => {
    if (!userAgent) return 'Navegador desconocido';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'Otro navegador';
  };
  
  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Modal
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <Icon>🔒</Icon>
          
          <Title>Sesión Activa en Otro Dispositivo</Title>
          
          <Message>
            Se detectó que tu cuenta está siendo usada en otro dispositivo. 
            Solo puedes tener una sesión activa a la vez.
          </Message>
          
          {sessionInfo && (
            <SessionInfo>
              <p><strong>Navegador:</strong> {getBrowserName(sessionInfo.browser)}</p>
              <p><strong>Iniciada:</strong> {formatDate(sessionInfo.createdAt)}</p>
            </SessionInfo>
          )}
          
          <Message style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            ¿Quieres cerrar la otra sesión y continuar aquí?
          </Message>
          
          <ButtonContainer>
            <Button className="secondary" onClick={onLogout}>
              Cerrar Sesión
            </Button>
            <Button className="primary" onClick={onReload}>
              Continuar Aquí
            </Button>
          </ButtonContainer>
        </Modal>
      </Overlay>
    </AnimatePresence>
  );
}
