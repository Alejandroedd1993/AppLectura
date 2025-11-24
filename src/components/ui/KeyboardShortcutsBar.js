/**
 * KeyboardShortcutsBar
 * 
 * Componente reutilizable para mostrar atajos de teclado disponibles
 * Mejora la discoverability y productividad del usuario
 */

import React from 'react';
import styled from 'styled-components';

const KeyboardShortcutsBar = ({ shortcuts, theme, className }) => {
  return (
    <ShortcutsBar theme={theme} className={className}>
      {shortcuts.map((shortcut, index) => (
        <ShortcutItem key={index} theme={theme}>
          {shortcut.keys.map((key, i) => (
            <React.Fragment key={i}>
              <Kbd theme={theme}>{key}</Kbd>
              {i < shortcut.keys.length - 1 && <Separator>+</Separator>}
            </React.Fragment>
          ))}
          <Label>{shortcut.label}</Label>
        </ShortcutItem>
      ))}
    </ShortcutsBar>
  );
};

const ShortcutsBar = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: ${props => props.theme.surfaceAlt || props.theme.background || '#f8f9fa'};
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    padding: 0.5rem;
  }
`;

const ShortcutItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary || '#666'};
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const Kbd = styled.kbd`
  display: inline-block;
  padding: 0.2rem 0.4rem;
  background: ${props => props.theme.surface || '#fff'};
  border: 1px solid ${props => props.theme.border || '#ddd'};
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary || '#333'};
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  
  @media (max-width: 768px) {
    padding: 0.15rem 0.3rem;
    font-size: 0.7rem;
  }
`;

const Separator = styled.span`
  margin: 0 0.15rem;
  font-weight: 600;
`;

const Label = styled.span`
  font-size: 0.75rem;
  margin-left: 0.2rem;
`;

export default KeyboardShortcutsBar;
