// src/components/common/TouchFriendlyButton.js
import React from 'react';
import styled from 'styled-components';

/**
 * Botón optimizado para táctil
 * - Tamaño mínimo 44x44px (WCAG 2.5.5)
 * - Feedback visual inmediato
 * - Sin hover en dispositivos táctiles
 */
const StyledTouchButton = styled.button`
  /* Tamaño mínimo táctil */
  min-width: 44px;
  min-height: 44px;
  
  /* Estilos base */
  padding: ${props => props.$size === 'large' ? '1rem 2rem' : '0.75rem 1.5rem'};
  border-radius: ${props => props.theme.borderRadius?.md || '8px'};
  font-size: ${props => props.$size === 'large' ? '1.125rem' : '1rem'};
  font-weight: ${props => props.theme.fontWeight?.semibold || 600};
  
  /* Colores */
  background: ${props => {
    if (props.disabled) return props.theme.disabled;
    if (props.$variant === 'primary') return props.theme.primary;
    if (props.$variant === 'secondary') return 'transparent';
    return props.theme.surface;
  }};
  
  color: ${props => {
    if (props.disabled) return props.theme.disabledText;
    if (props.$variant === 'primary') return 'white';
    return props.theme.text;
  }};
  
  border: ${props => {
    if (props.$variant === 'secondary') return `2px solid ${props.theme.border}`;
    return 'none';
  }};
  
  /* Transiciones */
  transition: ${props => props.theme.transition?.fast || '150ms ease'};
  
  /* Estado hover (solo en dispositivos con mouse) */
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${props => {
        if (props.$variant === 'primary') return props.theme.primaryDark || props.theme.primaryHover;
        return props.theme.surfaceHover || props.theme.hover;
      }};
      transform: translateY(-1px);
      box-shadow: ${props => props.theme.shadow?.md || '0 4px 6px rgba(0, 0, 0, 0.1)'};
    }
  }
  
  /* Estado active (táctil) */
  &:active:not(:disabled) {
    transform: scale(0.98);
    opacity: 0.9;
  }
  
  /* Estado focus */
  &:focus-visible {
    outline: 3px solid ${props => props.theme.focus || '#4d90fe'};
    outline-offset: 2px;
  }
  
  /* Estado disabled */
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  /* Prevenir selección de texto */
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  
  /* Optimizar para touch */
  touch-action: manipulation;
  
  /* Flex para alinear contenido */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  /* Responsive */
  @media (max-width: 640px) {
    width: ${props => props.$fullWidthMobile ? '100%' : 'auto'};
    font-size: ${props => props.$size === 'large' ? '1rem' : '0.9375rem'};
    padding: ${props => props.$size === 'large' ? '0.875rem 1.5rem' : '0.625rem 1.25rem'};
  }
`;

/**
 * Componente TouchFriendlyButton
 */
const TouchFriendlyButton = ({ 
  children, 
  variant = 'primary',
  size = 'medium',
  fullWidthMobile = false,
  theme,
  ...props 
}) => {
  return (
    <StyledTouchButton
      $variant={variant}
      $size={size}
      $fullWidthMobile={fullWidthMobile}
      theme={theme}
      {...props}
    >
      {children}
    </StyledTouchButton>
  );
};

export default TouchFriendlyButton;
