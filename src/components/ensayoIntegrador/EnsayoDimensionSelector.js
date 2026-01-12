import React from 'react';
import styled from 'styled-components';

const Selector = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
`;

const Title = styled.h4`
  margin: 0 0 0.75rem 0;
  color: ${props => props.theme.text};
  font-size: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.button`
  background: ${props => props.$selected ? props.theme.primary : 'transparent'};
  color: ${props => props.$selected ? 'white' : props.theme.text};
  border: 2px solid ${props => props.$selected ? props.theme.primary : props.theme.border};
  border-radius: 8px;
  padding: 0.9rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
`;

const Icon = styled.div`
  font-size: 1.4rem;
`;

const Name = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
`;

export default function EnsayoDimensionSelector({ theme, value, onChange, disabled = false }) {
  const DIMENSIONES = [
    { id: 'comprension_analitica', nombre: 'Comprensión Analítica', icono: '📚' },
    { id: 'acd', nombre: 'Análisis ideológico-discursivo (ACD)', icono: '🔍' },
    { id: 'contextualizacion', nombre: 'Contextualización socio-histórica', icono: '🗺️' },
    { id: 'argumentacion', nombre: 'Argumentación y contraargumento', icono: '💭' }
  ];

  return (
    <Selector theme={theme} role="region" aria-label="Seleccionar dimensión del ensayo">
      <Title theme={theme}>🎯 Selecciona 1 dimensión para el Ensayo Integrador</Title>
      <Grid>
        {DIMENSIONES.map((d) => (
          <Card
            key={d.id}
            type="button"
            theme={theme}
            $selected={value === d.id}
            onClick={() => onChange?.(d.id)}
            disabled={disabled}
            aria-pressed={value === d.id}
          >
            <Icon>{d.icono}</Icon>
            <Name>{d.nombre}</Name>
          </Card>
        ))}
      </Grid>
    </Selector>
  );
}
