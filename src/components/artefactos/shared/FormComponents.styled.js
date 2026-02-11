/**
 * FormComponents.styled.js
 * Componentes compartidos para formularios de los artefactos.
 * Usado por TablaACD, MapaActores, RespuestaArgumentativa.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const FormSection = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

export const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const Label = styled.label`
  display: block;
  color: ${props => props.theme.text};
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
`;

export const Textarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-family: inherit;
  font-size: clamp(0.9rem, 2.2vw, 0.95rem);
  color: ${props => props.theme.text};
  background: ${props => props.theme.background};
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary || '#2196F3'};
  }

  &::placeholder {
    color: ${props => props.theme.textMuted};
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    min-height: 100px;
  }
`;

export const HintText = styled.p`
  margin: 0.5rem 0 0 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`;

export const ValidationMessage = styled(motion.div)`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  background: ${props => props.$valid ? '#dcfce7' : '#fee2e2'};
  border: 1px solid ${props => props.$valid ? '#86efac' : '#fca5a5'};
  color: ${props => props.$valid ? '#166534' : '#991b1b'};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const Button = styled.button`
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PrimaryButton = styled(Button)`
  background: ${props => props.theme.primary || '#2196F3'};
  color: white;

  &:hover:not(:disabled) {
    background: ${props => props.theme.primaryHover || props.theme.primaryDark || props.theme.primary || '#1976D2'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => `${props.theme.primary || '#2196F3'}40`};
  }
`;
