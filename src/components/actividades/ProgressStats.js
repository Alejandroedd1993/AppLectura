import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

/**
 * 📊 ProgressStats - Panel de estadísticas de progreso del estudiante
 * 
 * Muestra:
 * - Progreso general por artefacto (4 dimensiones)
 * - Nivel alcanzado en cada rúbrica
 * - Historial de intentos por artefacto
 * - Puntuación más alta por dimensión
 * - Indicador visual de completitud
 */

const Container = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  h3 {
    margin: 0;
    font-size: 1.3rem;
    color: ${props => props.theme.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const OverallProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${props => props.theme.primary}10;
  border: 1px solid ${props => props.theme.primary}30;
  border-radius: 8px;
  
  .icon {
    font-size: 2.5rem;
  }
  
  .info {
    flex: 1;
  }
  
  .label {
    font-size: 0.85rem;
    color: ${props => props.theme.textSecondary};
    font-weight: 500;
    margin-bottom: 0.3rem;
  }
  
  .progress-bar {
    height: 24px;
    background: ${props => props.theme.background};
    border: 1px solid ${props => props.theme.border};
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    margin-bottom: 0.3rem;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, ${props => props.theme.primary}, ${props => props.theme.success});
    transition: width 0.5s ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
    color: white;
    font-weight: 700;
    font-size: 0.85rem;
  }
  
  .stats {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: ${props => props.theme.textSecondary};
  }
`;

const ArtefactosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
`;

const ArtefactoCard = styled(motion.div)`
  background: ${props => props.theme.background};
  border: 2px solid ${props => props.$completed ? props.theme.success : props.theme.border};
  border-radius: 12px;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.$color || props.theme.primary};
  }
`;

const ArtefactoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  
  .icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .title {
    flex: 1;
    
    h4 {
      margin: 0 0 0.2rem 0;
      font-size: 1.05rem;
      color: ${props => props.theme.textPrimary};
    }
    
    p {
      margin: 0;
      font-size: 0.8rem;
      color: ${props => props.theme.textSecondary};
    }
  }
  
  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    background: ${props => props.$badgeColor}20;
    color: ${props => props.$badgeColor};
    border: 1px solid ${props => props.$badgeColor};
  }
`;

const ArtefactoStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: ${props => props.theme.surface};
    border-radius: 6px;
    font-size: 0.85rem;
  }
  
  .stat-label {
    color: ${props => props.theme.textSecondary};
    font-weight: 500;
  }
  
  .stat-value {
    font-weight: 700;
    color: ${props => props.theme.textPrimary};
    
    &.highlight {
      color: ${props => props.theme.success};
      font-size: 1.1em;
    }
  }
  
  .nivel-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.85rem;
    background: ${props => props.$levelColor}20;
    color: ${props => props.$levelColor};
    border: 1px solid ${props => props.$levelColor};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 3rem;
    opacity: 0.3;
    margin-bottom: 0.5rem;
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const ARTEFACTO_CONFIG = {
  rubrica1: {
    name: 'Resumen Académico',
    icon: '📝',
    color: '#3190FC'
  },
  rubrica2: {
    name: 'Tabla ACD',
    icon: '📊',
    color: '#009688'
  },
  rubrica3: {
    name: 'Mapa de Actores',
    icon: '🗺️',
    color: '#FF9800'
  },
  rubrica4: {
    name: 'Respuesta Argumentativa',
    icon: '💭',
    color: '#E91E63'
  },
  rubrica5: {
    name: 'Bitácora Ética IA',
    icon: '🤖',
    color: '#9C27B0'
  }
};

const NIVEL_CONFIG = {
  1: { label: 'Inicial', color: '#607D8B' },
  2: { label: 'Básico', color: '#03A9F4' },
  3: { label: 'Competente', color: '#4CAF50' },
  4: { label: 'Avanzado', color: '#9C27B0' }
};

export default function ProgressStats({ rubricProgress }) {
  const stats = useMemo(() => {
    if (!rubricProgress) return null;
    
    const artefactos = [];
    let totalCompleted = 0;
    let totalScore = 0;
    let totalAttempts = 0;
    let dimensionesEvaluadas = 0;
    
    Object.entries(ARTEFACTO_CONFIG).forEach(([rubricId, config]) => {
      const data = rubricProgress[rubricId];
      const formativeScores = data?.scores || [];
      const hasFormative = formativeScores.length > 0;
      const summative = data?.summative;
      const summativeScoreNum = Number(summative?.score);
      const hasSummative =
        summative &&
        summative.status === 'graded' &&
        Number.isFinite(summativeScoreNum) &&
        summativeScoreNum > 0;
      const hasAny = hasFormative || hasSummative;
      
      const lastFormative = hasFormative ? formativeScores[formativeScores.length - 1] : null;
      const formativeHighestScore = hasFormative ? Math.max(...formativeScores.map(s => s.score)) : 0;
      const formativeAttempts = formativeScores.length;

      const scoreForNivel = lastFormative?.score ?? (hasSummative ? summativeScoreNum : 0);
      const nivel = lastFormative?.nivel ?? summative?.nivel ?? (scoreForNivel > 0 ? Math.ceil(scoreForNivel / 2.5) : 0);
      const isCompleted = scoreForNivel > 0 && nivel >= 3; // Nivel 3+ considerado completado

      artefactos.push({
        rubricId,
        ...config,
        hasFormative,
        formativeLastScore: lastFormative?.score ?? 0,
        formativeHighestScore,
        formativeAttempts,
        formativeLastAttempt: lastFormative?.timestamp ?? null,
        hasSummative,
        summativeScore: hasSummative ? summativeScoreNum : 0,
        summativeNivel: hasSummative ? (summative.nivel ?? Math.ceil(summative.score / 2.5)) : 0,
        summativeTimestamp: hasSummative ? (summative.timestamp ?? summative.gradedAt ?? null) : null,
        nivel,
        isCompleted
      });

      if (hasAny) {
        dimensionesEvaluadas++;
        if (isCompleted) totalCompleted++;
        totalScore += (lastFormative?.score ?? (hasSummative ? summativeScoreNum : 0));
        totalAttempts += formativeAttempts + (hasSummative ? 1 : 0);
      }
    });
    
    const overallProgress = (totalCompleted / 5) * 100;
    const averageScore = dimensionesEvaluadas > 0 ? totalScore / dimensionesEvaluadas : 0;
    
    return {
      artefactos,
      overallProgress,
      totalCompleted,
      averageScore: averageScore.toFixed(1),
      totalAttempts
    };
  }, [rubricProgress]);
  
  if (!stats || stats.totalAttempts === 0) {
    return (
      <Container>
        <Header>
          <h3>📊 Mi Progreso</h3>
        </Header>
        <EmptyState>
          <div className="icon">📭</div>
          <p>Aún no has completado ninguna evaluación.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.8 }}>
            Comienza con la Preparación y luego completa los artefactos.
          </p>
        </EmptyState>
      </Container>
    );
  }
  
  return (
    <Container>
      <Header>
        <h3>📊 Mi Progreso en Literacidad Crítica</h3>
      </Header>
      
      {/* Progreso General */}
      <OverallProgress>
        <div className="icon">
          {stats.overallProgress === 100 ? '🎓' : stats.overallProgress >= 75 ? '🔥' : stats.overallProgress >= 50 ? '📈' : '🌱'}
        </div>
        <div className="info">
          <div className="label">Progreso General</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${stats.overallProgress}%` }}
            >
              {stats.overallProgress > 15 && `${stats.overallProgress.toFixed(0)}%`}
            </div>
          </div>
          <div className="stats">
            <span>✅ {stats.totalCompleted}/5 dimensiones completadas</span>
            <span>📊 Promedio: {stats.averageScore}/10</span>
            <span>🔄 {stats.totalAttempts} intentos totales</span>
          </div>
        </div>
      </OverallProgress>
      
      {/* Grid de Artefactos */}
      <ArtefactosGrid>
        {stats.artefactos.map((artefacto) => (
          <ArtefactoCard
            key={artefacto.rubricId}
            $completed={artefacto.isCompleted}
            $color={artefacto.color}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArtefactoHeader $badgeColor={artefacto.nivel > 0 ? NIVEL_CONFIG[artefacto.nivel].color : '#ccc'}>
              <div className="icon">{artefacto.icon}</div>
              <div className="title">
                <h4>{artefacto.name}</h4>
                <p>{artefacto.rubricId}</p>
              </div>
              {artefacto.nivel > 0 && (
                <div className="badge">
                  {NIVEL_CONFIG[artefacto.nivel].label}
                </div>
              )}
            </ArtefactoHeader>
            
            <ArtefactoStats>
              {artefacto.hasFormative || artefacto.hasSummative ? (
                <>
                  {artefacto.hasFormative ? (
                    <>
                      <div className="stat-row">
                        <span className="stat-label">Última puntuación:</span>
                        <span className="stat-value highlight">{artefacto.formativeLastScore.toFixed(1)}/10</span>
                      </div>

                      <div className="stat-row">
                        <span className="stat-label">Puntuación más alta:</span>
                        <span className="stat-value">{artefacto.formativeHighestScore.toFixed(1)}/10</span>
                      </div>
                    </>
                  ) : (
                    <div className="stat-row">
                      <span className="stat-label">Artefactos:</span>
                      <span className="stat-value">Sin intentos</span>
                    </div>
                  )}

                  {artefacto.nivel > 0 && (
                    <div className="stat-row">
                      <span className="stat-label">Nivel alcanzado:</span>
                      <span
                        className="nivel-badge"
                        style={{
                          background: `${NIVEL_CONFIG[artefacto.nivel].color}20`,
                          color: NIVEL_CONFIG[artefacto.nivel].color,
                          border: `1px solid ${NIVEL_CONFIG[artefacto.nivel].color}`
                        }}
                      >
                        Nivel {artefacto.nivel} - {NIVEL_CONFIG[artefacto.nivel].label}
                      </span>
                    </div>
                  )}

                  {artefacto.hasSummative && (
                    <div className="stat-row">
                      <span className="stat-label">Ensayo (sumativo):</span>
                      <span className="stat-value highlight">{artefacto.summativeScore.toFixed(1)}/10</span>
                    </div>
                  )}

                  <div className="stat-row">
                    <span className="stat-label">Intentos:</span>
                    <span className="stat-value">{artefacto.formativeAttempts + (artefacto.hasSummative ? 1 : 0)}</span>
                  </div>

                  {artefacto.formativeLastAttempt && (
                    <div className="stat-row">
                      <span className="stat-label">Último intento:</span>
                      <span className="stat-value" style={{ fontSize: '0.75rem' }}>
                        {new Date(artefacto.formativeLastAttempt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState style={{ padding: '1rem' }}>
                  <div className="icon" style={{ fontSize: '2rem' }}>📝</div>
                  <p style={{ fontSize: '0.85rem' }}>No completado</p>
                </EmptyState>
              )}
            </ArtefactoStats>
          </ArtefactoCard>
        ))}
      </ArtefactosGrid>
    </Container>
  );
}
