/**
 * LockSystem.styled.js
 * Componentes compartidos para el sistema de bloqueo/entrega de artefactos.
 * Usado por los 5 artefactos: ResumenAcademico, TablaACD, MapaActores,
 * RespuestaArgumentativa, BitacoraEticaIA.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const SubmissionBanner = styled(motion.div)`
  background: ${props => `${props.theme.success || '#4CAF50'}10`};
  border: 1px solid ${props => props.theme.success || '#4CAF50'};
  color: ${props => props.theme.success || '#1b5e20'};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);

  .icon { font-size: 1.5rem; }
  .text { font-size: 1rem; }
`;

export const SubmitButton = styled.button`
  padding: 0.9rem 1.8rem;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover {
    background: ${props => props.theme.successDark || '#388E3C'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => `${props.theme.success || '#4CAF50'}40`};
  }
`;

export const LockedMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  background: linear-gradient(135deg, ${props => props.theme.primary}15, ${props => props.theme.info}10);
  border: 2px solid ${props => props.theme.primary}40;
  border-radius: 8px;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const LockIcon = styled.span`
  font-size: 1.5rem;
`;

export const LockText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  strong {
    color: ${props => props.theme?.text || '#333'};
    font-size: 1rem;
  }
  
  span {
    color: ${props => props.theme?.textSecondary || '#666'};
    font-size: 0.9rem;
  }
`;

export const UnlockButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: ${props => props.theme.primary || '#2196F3'};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.primaryHover || '#1976D2'};
    transform: translateY(-1px);
  }
`;
