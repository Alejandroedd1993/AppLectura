import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const SelectorContainer = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ModeButton = styled(motion.button)`
  padding: 8px 16px;
  border: 2px solid ${props => props.active ? props.theme.primary : props.theme.border};
  background: ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.text};
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const APISelector = ({ apis, selectedAPI, onSelect, disabled, theme }) => {
  return (
    <SelectorContainer>
      {apis.map(api => (
        <ModeButton key={api.id} active={selectedAPI === api.id} onClick={() => onSelect(api.id)} disabled={disabled} theme={theme}>
          {api.icon} {api.label}
        </ModeButton>
      ))}
    </SelectorContainer>
  );
};

export default React.memo(APISelector);