import React from 'react';
import styled from 'styled-components';

const StyledButton = styled.button`
  background: ${props => props.theme.secondary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: ${props => props.theme.secondary}cc;
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

const ExportButton = ({ onExport, disabled }) => {
  return (
    <StyledButton onClick={onExport} disabled={disabled}>
      Descargar Análisis
    </StyledButton>
  );
};

export default ExportButton;
