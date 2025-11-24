import React from 'react';
import styled from 'styled-components';

const TermContainer = styled.span`
  padding: 4px 10px;
  border-radius: 12px;
  background-color: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid transparent;
  
  &:hover {
    background-color: ${props => props.theme.primary}30;
    border-color: ${props => props.theme.primary}40;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px ${props => props.theme.primary}20;
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const TermIcon = styled.span`
  font-size: 0.75rem;
  opacity: 0.7;
`;

/**
 * TermTag - Término clickeable que abre modal con definición contextual
 * 
 * @param {string} term - El término a mostrar
 * @param {function} onClick - Callback al hacer click
 * @param {object} theme - Tema actual
 */
const TermTag = ({ term, onClick, theme }) => {
  return (
    <TermContainer 
      theme={theme} 
      onClick={() => onClick(term)}
      title={`Click para ver definición de "${term}"`}
    >
      {term}
      <TermIcon>🔍</TermIcon>
    </TermContainer>
  );
};

export default TermTag;
