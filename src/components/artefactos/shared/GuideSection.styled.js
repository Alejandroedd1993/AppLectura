/**
 * GuideSection.styled.js
 * Componentes compartidos para la guía pedagógica expandible.
 * Usado por TablaACD, MapaActores, RespuestaArgumentativa y ResumenAcademico.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const GuideSection = styled(motion.div)`
  background: ${props => props.theme.surface || '#ffffff'};
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

export const GuideHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`;

export const GuideTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.text || '#333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
`;

export const ToggleIcon = styled.span`
  transition: transform 0.3s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

export const GuideContent = styled(motion.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border || '#e0e0e0'};
`;

export const GuideQuestions = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const GuideQuestion = styled.li`
  color: ${props => props.theme.textMuted || '#666'};
  font-size: 0.9rem;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.5;

  &::before {
    content: '💡';
    position: absolute;
    left: 0;
  }
`;
