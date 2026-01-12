import React from 'react';
import styled from 'styled-components';

const Box = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
`;

const Title = styled.h4`
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.text};
  font-size: 1rem;
`;

const List = styled.ul`
  margin: 0.5rem 0 0 1.25rem;
  color: ${props => props.theme.text};
`;

export default function EnsayoGuidelines({ theme }) {
  return (
    <Box theme={theme} role="region" aria-label="Lineamientos del Ensayo Integrador">
      <Title theme={theme}>📌 Lineamientos</Title>
      <List theme={theme}>
        <li>Extensión: 800–1200 palabras.</li>
        <li>Incluye al menos 3 citas textuales entre comillas.</li>
        <li>Organiza en al menos 5 párrafos.</li>
        <li>Conecta explícitamente con tus artefactos (resumen / ACD / mapa / respuesta).</li>
        <li>Evaluación IA dual: se promedia DeepSeek + OpenAI.</li>
      </List>
    </Box>
  );
}
