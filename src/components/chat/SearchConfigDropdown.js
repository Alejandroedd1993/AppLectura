import React from 'react';
import styled from 'styled-components';

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  background: ${p => p.theme.surface || '#fff'};
  color: ${p => p.theme.text || '#111'};
  border: 1px solid ${p => p.theme.border || '#e5e7eb'};
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  appearance: none;
  padding-right: 2rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #16a34a;
  }
  
  &:focus {
    outline: none;
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Label = styled.label`
  font-size: 0.7rem;
  color: ${p => p.theme.textSecondary || '#6b7280'};
  margin-bottom: 0.25rem;
  display: block;
`;

const SEARCH_CONFIGS = {
  rapida: {
    label: '⚡ Rápida',
    maxResults: 3,
    description: '3 resultados relevantes'
  },
  profunda: {
    label: '🔍 Profunda',
    maxResults: 5,
    description: '5 resultados detallados'
  },
  exhaustiva: {
    label: '🎯 Exhaustiva',
    maxResults: 8,
    description: '8 resultados completos'
  }
};

/**
 * Mejora #3: Configuración rápida de búsqueda
 * Permite al usuario elegir entre búsqueda rápida, profunda o exhaustiva
 */
export default function SearchConfigDropdown({ value = 'rapida', onChange, disabled, showLabel = true }) {
  return (
    <DropdownContainer>
      {showLabel && <Label>Tipo de búsqueda</Label>}
      <Select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        title="Selecciona el tipo de búsqueda web"
      >
        {Object.entries(SEARCH_CONFIGS).map(([key, config]) => (
          <option key={key} value={key}>
            {config.label} — {config.description}
          </option>
        ))}
      </Select>
    </DropdownContainer>
  );
}

export { SEARCH_CONFIGS };
