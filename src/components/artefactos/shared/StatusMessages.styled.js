/**
 * StatusMessages.styled.js
 * Componentes compartidos para mensajes de estado: autoguardado, restauración, etc.
 * Usado por los 5 artefactos.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const AutoSaveMessage = styled(motion.div)`
  background: ${props => (props.theme?.success || '#4CAF50')}15;
  border: 1px solid ${props => props.theme?.success || '#4CAF50'};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  color: ${props => props.theme?.success || '#4CAF50'};
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const RestoreBanner = styled(motion.div)`
  background: ${props => (props.theme.warning || '#f59e0b')}15;
  border: 1px solid ${props => props.theme.warning || '#f59e0b'};
  color: ${props => props.theme.warning || '#92400e'};
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
`;

export const RestoreButton = styled.button`
  background: ${props => props.theme.warning || '#f59e0b'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`;

export const PasteErrorMessage = styled(motion.div)`
  padding: 0.75rem 1rem;
  background: ${props => (props.theme.danger || '#F44336')}15;
  border: 1px solid ${props => (props.theme.danger || '#F44336')}40;
  border-radius: 6px;
  color: ${props => props.theme.danger || '#F44336'};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.5s ease;

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;

export const ShortcutsHint = styled.div`
  position: fixed;
  top: 80px;
  right: 20px;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 9999;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    right: 30px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${props => props.theme.success || '#4CAF50'};
  }
`;
