import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const StatCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.color || props.theme.primary};
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.color || props.theme.primary};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
  font-weight: 500;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${props => props.theme.border};
  border-radius: 3px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.color || props.theme.primary};
  border-radius: 3px;
`;

function EstadisticasEvaluacion({ 
  promedio, 
  totalPreguntas, 
  porNivel, 
  theme 
}) {
  const getNivelColor = (nivel) => {
    const colores = {
      literal: '#009688',
      inferencial: '#FF9800',
      'critico-valorativo': '#F44336'
    };
    return colores[nivel] || theme.primary;
  };

  const getPromedioColor = (promedio) => {
    if (promedio >= 8) return '#009688';
    if (promedio >= 6) return '#FF9800';
    return '#F44336';
  };

  return (
    <StatsContainer>
      <StatCard
        theme={theme}
        color={getPromedioColor(promedio)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatValue color={getPromedioColor(promedio)}>
          {promedio.toFixed(1)}/10
        </StatValue>
        <StatLabel theme={theme}>Promedio General</StatLabel>
        <ProgressBar theme={theme}>
          <ProgressFill
            color={getPromedioColor(promedio)}
            initial={{ width: 0 }}
            animate={{ width: `${(promedio / 10) * 100}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </ProgressBar>
      </StatCard>

      <StatCard
        theme={theme}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StatValue theme={theme}>
          {totalPreguntas}
        </StatValue>
        <StatLabel theme={theme}>Preguntas Respondidas</StatLabel>
      </StatCard>

      {Object.entries(porNivel).map(([nivel, stats], index) => (
        <StatCard
          key={nivel}
          theme={theme}
          color={getNivelColor(nivel)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          <StatValue color={getNivelColor(nivel)}>
            {stats.promedio ? stats.promedio.toFixed(1) : 0}/10
          </StatValue>
          <StatLabel theme={theme}>
            {nivel === 'literal' && 'Nivel Literal'}
            {nivel === 'inferencial' && 'Nivel Inferencial'}
            {nivel === 'critico-valorativo' && 'Nivel Crítico'}
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              ({stats.cantidad} pregunta{stats.cantidad !== 1 ? 's' : ''})
            </div>
          </StatLabel>
          {stats.promedio > 0 && (
            <ProgressBar theme={theme}>
              <ProgressFill
                color={getNivelColor(nivel)}
                initial={{ width: 0 }}
                animate={{ width: `${(stats.promedio / 10) * 100}%` }}
                transition={{ duration: 1, delay: 0.7 + index * 0.2 }}
              />
            </ProgressBar>
          )}
        </StatCard>
      ))}
    </StatsContainer>
  );
}

export default EstadisticasEvaluacion;
