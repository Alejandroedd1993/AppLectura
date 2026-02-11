/**
 * CitasPanel.styled.js
 * Componentes compartidos para el sistema de citas textuales.
 * Usado por ResumenAcademico, TablaACD, MapaActores, RespuestaArgumentativa.
 */
import styled from 'styled-components';

export const CitasButton = styled.button`
  position: fixed;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  right: calc(1.25rem + env(safe-area-inset-right));
  z-index: 1001;
  padding: 0.7rem 1.2rem;
  background: ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.cardBg || '#fff'};
  color: ${props => props.$active ? '#fff' : props.theme.textPrimary};
  border: 2px solid ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.border};
  border-radius: 50px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  
  ${props => props.$hasNotification && !props.$active && `
    &:after {
      content: '';
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: ${props.theme.success || '#4CAF50'};
      border: 2px solid ${props.theme.cardBg || '#fff'};
      border-radius: 50%;
      animation: fabPulse 2s ease-in-out infinite;
    }
    @keyframes fabPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
  `}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    border-color: ${props => props.theme.warning || '#f59e0b'};
  }

  &:focus-visible {
    outline: 3px solid ${props => props.theme.primary || '#3190FC'};
    outline-offset: 2px;
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    bottom: calc(4rem + env(safe-area-inset-bottom));
    right: calc(1rem + env(safe-area-inset-right));
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
`;

export const CitasPanel = styled.div`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: ${props => props.theme.surface};
  border-left: 2px solid ${props => props.theme.border};
  box-shadow: -4px 0 20px rgba(0,0,0,0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

export const CitasPanelHeader = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.primary};
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
`;

export const CitasList = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.surface};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border};
    border-radius: 4px;
  }
`;

export const CitaItem = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`;

export const CitaTexto = styled.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${props => props.theme.textPrimary || props.theme.text};
  margin: 0 0 0.75rem 0;
  font-style: italic;
`;

export const CitaFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const CitaInfo = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

export const InsertarButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.successHover || '#45a049'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

export const EliminarButton = styled.button`
  padding: 0.4rem 0.6rem;
  background: transparent;
  color: ${props => props.theme.danger || '#F44336'};
  border: 1px solid ${props => props.theme.danger || '#F44336'};
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.danger || '#F44336'};
    color: white;
  }
`;

export const EmptyCitasMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary || props.theme.textMuted};
  
  strong {
    color: ${props => props.theme.textPrimary || props.theme.text};
    font-size: 1.1rem;
  }
  
  ol {
    margin-top: 1rem;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
`;
