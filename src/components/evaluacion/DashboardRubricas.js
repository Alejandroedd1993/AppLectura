// src/components/evaluacion/DashboardRubricas.js
import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';

const DashboardContainer = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const DashboardTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RubricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const RubricCard = styled(motion.div)`
  background: ${props => props.theme.background};
  border: 2px solid ${props => {
    const avg = props.$average;
    if (avg === 0) return props.theme.border;
    if (avg >= 8.6) return '#8b5cf6';
    if (avg >= 5.6) return props.theme.success;
    if (avg >= 2.6) return '#f59e0b';
    return '#ef4444';
  }};
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px ${props => {
      const avg = props.$average;
      if (avg === 0) return 'rgba(0,0,0,0.1)';
      if (avg >= 8.6) return 'rgba(139, 92, 246, 0.3)';
      if (avg >= 5.6) return 'rgba(16, 185, 129, 0.3)';
      if (avg >= 2.6) return 'rgba(245, 158, 11, 0.3)';
      return 'rgba(239, 68, 68, 0.3)';
    }};
  }
`;

const RubricIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const RubricName = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  text-align: center;
  margin-bottom: 0.75rem;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RubricScore = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  color: ${props => {
    const avg = props.$average;
    if (avg === 0) return props.theme.textMuted;
    if (avg >= 8.6) return '#8b5cf6';
    if (avg >= 5.6) return '#10b981';
    if (avg >= 2.6) return '#f59e0b';
    return '#ef4444';
  }};
  margin-bottom: 0.25rem;
`;

const RubricLabel = styled.div`
  font-size: 0.7rem;
  text-align: center;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RubricAttempts = styled.div`
  font-size: 0.7rem;
  text-align: center;
  color: ${props => props.theme.textMuted};
  margin-top: 0.5rem;
  font-style: italic;
`;

const PromedioGlobal = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, ${props => props.theme.primary}15, ${props => props.theme.secondary}15);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PromedioLabel = styled.span`
  font-weight: 600;
  color: ${props => props.theme.text};
  font-size: 1rem;
`;

const PromedioValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => {
    const avg = props.$value;
    if (avg >= 8.6) return '#8b5cf6';
    if (avg >= 5.6) return '#10b981';
    if (avg >= 2.6) return '#f59e0b';
    return '#ef4444';
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textMuted};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: 0.95rem;
`;

const RUBRICAS_INFO = {
  rubrica1: {
    nombre: 'Comprensión Analítica',
    icono: '📚',
    descripcion: 'Síntesis con evidencias textuales'
  },
  rubrica2: {
    nombre: 'Análisis Ideológico-Discursivo',
    icono: '🔍',
    descripcion: 'Marcos ideológicos y estrategias retóricas'
  },
  rubrica3: {
    nombre: 'Contextualización Socio-Histórica',
    icono: '🗺️',
    descripcion: 'Actores, relaciones de poder y consecuencias'
  },
  rubrica4: {
    nombre: 'Argumentación y Contraargumento',
    icono: '💭',
    descripcion: 'Tesis, evidencias y refutación dialógica'
  },
  rubrica5: {
    nombre: 'Metacognición Ética del Uso de IA',
    icono: '🤖',
    descripcion: 'Reflexión transparente y responsable'
  }
};

export default function DashboardRubricas({ theme, onSelectRubric }) {
  const { rubricProgress } = useContext(AppContext);

  const getSummativeScore = (summative) => {
    const n = Number(summative?.score);
    if (summative?.status !== 'graded') return 0;
    if (!Number.isFinite(n)) return 0;
    return n > 0 ? n : 0;
  };

  // Calcular promedio global y dimensiones evaluadas
  const { promedioGlobal, dimensionesEvaluadas } = useMemo(() => {
    const rubricasConDatos = Object.values(rubricProgress || {}).filter(r => {
      const summativeScore = getSummativeScore(r?.summative);
      const displayAvg = (r?.average || 0) > 0 ? r.average : summativeScore;
      return displayAvg > 0;
    });
    if (rubricasConDatos.length === 0) return { promedioGlobal: 0, dimensionesEvaluadas: 0 };
    
    const suma = rubricasConDatos.reduce((sum, r) => {
      const summativeScore = getSummativeScore(r?.summative);
      const displayAvg = (r?.average || 0) > 0 ? r.average : summativeScore;
      return sum + displayAvg;
    }, 0);
    const promedio = Math.round((suma / rubricasConDatos.length) * 10) / 10;
    
    return { 
      promedioGlobal: promedio, 
      dimensionesEvaluadas: rubricasConDatos.length 
    };
  }, [rubricProgress]);

  // Verificar si hay algún dato
  const hayDatos = useMemo(() => {
    return Object.values(rubricProgress || {}).some(r => {
      const formativeCount = r?.scores?.length || 0;
      const hasSummative = getSummativeScore(r?.summative) > 0;
      return formativeCount > 0 || hasSummative;
    });
  }, [rubricProgress]);

  if (!hayDatos) {
    return (
      <DashboardContainer theme={theme}>
        <DashboardTitle theme={theme}>
          📊 Tu Progreso en las 5 Dimensiones de Literacidad Crítica
        </DashboardTitle>
        <EmptyState theme={theme}>
          <EmptyIcon>📭</EmptyIcon>
          <EmptyText>
            Aún no has completado ningún artefacto. Ve a la pestaña <strong>Actividades</strong> para empezar a practicar.
          </EmptyText>
        </EmptyState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer theme={theme}>
      <DashboardTitle theme={theme}>
        📊 Tu Progreso en las 5 Dimensiones de Literacidad Crítica
      </DashboardTitle>

      <RubricsGrid>
        {Object.entries(RUBRICAS_INFO).map(([rubricId, info]) => {
          const data = rubricProgress[rubricId] || { scores: [], average: 0 };
          const summativeScore = getSummativeScore(data?.summative);
          const hasSummative = summativeScore > 0;
          const intentos = (data?.scores?.length || 0) + (hasSummative ? 1 : 0);
          const displayAvg = data.average > 0 ? data.average : (hasSummative ? summativeScore : 0);
          
          return (
            <RubricCard
              key={rubricId}
              $average={displayAvg}
              theme={theme}
              onClick={() => onSelectRubric?.(rubricId)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: parseInt(rubricId.replace('rubrica', '')) * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RubricIcon>{info.icono}</RubricIcon>
              <RubricName theme={theme}>{info.nombre}</RubricName>
              <RubricScore $average={displayAvg} theme={theme}>
                {displayAvg > 0 ? `${displayAvg}/10` : '—'}
              </RubricScore>
              <RubricLabel theme={theme}>
                {displayAvg === 0 ? 'Sin evaluar' : 
                 displayAvg >= 8.6 ? 'Experto' :
                 displayAvg >= 5.6 ? 'Competente' :
                 displayAvg >= 2.6 ? 'Aprendiz' : 'Novato'}
              </RubricLabel>
              {intentos > 0 && (
                <RubricAttempts theme={theme}>
                  {intentos} {intentos === 1 ? 'intento' : 'intentos'}
                </RubricAttempts>
              )}
            </RubricCard>
          );
        })}
      </RubricsGrid>

      {promedioGlobal > 0 && (
        <PromedioGlobal theme={theme}>
          <PromedioLabel theme={theme}>
            🎯 Promedio Global de Literacidad Crítica
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 400, 
              marginLeft: '0.5rem',
              opacity: 0.8 
            }}>
              ({dimensionesEvaluadas}/5 dimensiones)
            </span>
          </PromedioLabel>
          <PromedioValue $value={promedioGlobal} theme={theme}>
            {promedioGlobal}/10
          </PromedioValue>
        </PromedioGlobal>
      )}
    </DashboardContainer>
  );
}



