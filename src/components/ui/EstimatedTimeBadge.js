/**
 * EstimatedTimeBadge
 * 
 * Badge pequeño para mostrar tiempo estimado de completar un artefacto
 * Se muestra en las tabs de navegación de Actividades
 */

import React from 'react';
import styled from 'styled-components';

const EstimatedTimeBadge = ({ minutes, theme, compact = false }) => {
  if (!minutes) return null;

  return (
    <Badge theme={theme} $compact={compact} title={`Tiempo estimado: ${minutes} minutos`}>
      ⏱️ {compact ? `${minutes}m` : `~${minutes} min`}
    </Badge>
  );
};

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: ${props => props.$compact ? '0.15rem 0.4rem' : '0.25rem 0.6rem'};
  background: ${props => props.theme.warning}15 || '#fff3cd';
  color: ${props => props.theme.warning || '#f59e0b'};
  border-radius: 12px;
  font-size: ${props => props.$compact ? '0.7rem' : '0.75rem'};
  font-weight: 600;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 0.65rem;
    padding: 0.15rem 0.35rem;
  }
`;

export default EstimatedTimeBadge;
