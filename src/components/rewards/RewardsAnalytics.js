import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRewards } from '../../context/PedagogyContext';

/**
 * 🎮 RewardsAnalytics - Panel de estadísticas y exportación
 * 
 * Funcionalidades:
 * - Vista general de métricas clave
 * - Distribución de niveles Bloom
 * - Historial de eventos reciente
 * - Exportación CSV para investigación
 * - Análisis de calidad (citas, ACD)
 */

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(4px);
`;

const ModalContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    max-width: 95vw;
    max-height: 95vh;
  }
`;

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, ${props => props.theme.primary}, ${props => props.theme.success});
  color: white;
  border-radius: 16px 16px 0 0;
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

const Content = styled.div`
  padding: 1.5rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
  
  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
    color: ${props => props.theme.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const MetricCard = styled.div`
  background: ${props => props.$highlight ? `${props.theme.primary}15` : `${props.theme.background}`};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  .icon {
    font-size: 2rem;
  }
  
  .label {
    font-size: 0.85rem;
    color: ${props => props.theme.textSecondary};
    font-weight: 500;
  }
  
  .value {
    font-size: 1.8rem;
    font-weight: 800;
    color: ${props => props.theme.primary};
  }
  
  .sub {
    font-size: 0.75rem;
    color: ${props => props.theme.textSecondary};
  }
`;

const BloomDistribution = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const BloomBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  
  .label {
    min-width: 140px;
    font-size: 0.85rem;
    color: ${props => props.theme.textSecondary};
    font-weight: 500;
  }
  
  .bar-container {
    flex: 1;
    height: 24px;
    background: ${props => props.theme.surface};
    border: 1px solid ${props => props.theme.border};
    border-radius: 12px;
    overflow: hidden;
    position: relative;
  }
  
  .bar-fill {
    height: 100%;
    background: ${props => props.$color};
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    transition: width 0.5s ease;
  }
  
  .count {
    min-width: 40px;
    text-align: right;
    font-weight: 700;
    color: ${props => props.theme.textPrimary};
  }
`;

const HistoryTable = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
`;

const HistoryRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr 100px;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid ${props => props.theme.border};
  font-size: 0.85rem;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${props => props.theme.surface};
  }
  
  .timestamp {
    color: ${props => props.theme.textSecondary};
    font-size: 0.8rem;
  }
  
  .event {
    color: ${props => props.theme.textPrimary};
    font-weight: 500;
  }
  
  .points {
    text-align: right;
    font-weight: 700;
    color: ${props => props.$earned > 0 ? props.theme.success : props.theme.error};
  }
`;

const ExportButton = styled.button`
  background: ${props => props.theme.success};
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 150, 136, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 150, 136, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  .icon {
    font-size: 1.2em;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 4rem;
    opacity: 0.3;
    margin-bottom: 1rem;
  }
  
  .message {
    font-size: 1.1rem;
    font-weight: 500;
  }
`;

const BLOOM_COLORS = {
  1: '#607D8B',
  2: '#03A9F4',
  3: '#4CAF50',
  4: '#FF9800',
  5: '#E91E63',
  6: '#9C27B0'
};

const BLOOM_LABELS = {
  1: '📖 Recordar',
  2: '💡 Comprender',
  3: '🌍 Aplicar',
  4: '🔍 Analizar',
  5: '⚖️ Evaluar (ACD)',
  6: '✨ Crear'
};

export default function RewardsAnalytics({ isOpen, onClose }) {
  const rewards = useRewards();
  
  const analytics = useMemo(() => {
    if (!rewards) return null;
    return rewards.getAnalytics();
  }, [rewards]);
  
  const handleExportCSV = () => {
    if (!rewards) return;
    
    const csv = rewards.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `recompensas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!rewards || !analytics) return null;
  
  const { engagement, quality, gamification, history } = analytics;
  const maxBloomCount = Math.max(...Object.values(quality.bloomLevelDistribution || {}), 1);
  
  // Últimos 20 eventos
  const recentHistory = history.slice(-20).reverse();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContainer
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Header>
              <h2>
                <span>📊</span>
                Estadísticas y Analytics
              </h2>
              <CloseButton onClick={onClose}>✕ Cerrar</CloseButton>
            </Header>
            
            <Content>
              {/* Métricas Generales */}
              <Section>
                <h3>📈 Métricas de Engagement</h3>
                <MetricsGrid>
                  <MetricCard $highlight>
                    <div className="icon">⭐</div>
                    <div className="label">Puntos Totales</div>
                    <div className="value">{gamification.totalPoints}</div>
                    <div className="sub">{gamification.availablePoints} disponibles</div>
                  </MetricCard>
                  
                  <MetricCard>
                    <div className="icon">🔥</div>
                    <div className="label">Racha Actual</div>
                    <div className="value">{engagement.streak}</div>
                    <div className="sub">días consecutivos</div>
                  </MetricCard>
                  
                  <MetricCard>
                    <div className="icon">💬</div>
                    <div className="label">Interacciones</div>
                    <div className="value">{engagement.totalInteractions}</div>
                    <div className="sub">actividades realizadas</div>
                  </MetricCard>
                  
                  <MetricCard>
                    <div className="icon">🏆</div>
                    <div className="label">Achievements</div>
                    <div className="value">{gamification.achievements}</div>
                    <div className="sub">logros desbloqueados</div>
                  </MetricCard>
                </MetricsGrid>
              </Section>
              
              {/* Calidad Cognitiva */}
              <Section>
                <h3>🧠 Calidad Cognitiva</h3>
                <MetricsGrid>
                  <MetricCard>
                    <div className="icon">📊</div>
                    <div className="label">Nivel Bloom Promedio</div>
                    <div className="value">{engagement.avgBloomLevel.toFixed(1)}</div>
                    <div className="sub">de 6 niveles</div>
                  </MetricCard>
                  
                  <MetricCard>
                    <div className="icon">🎭</div>
                    <div className="label">Marcos ACD</div>
                    <div className="value">{quality.acdFramesIdentified}</div>
                    <div className="sub">análisis crítico</div>
                  </MetricCard>
                  
                  <MetricCard>
                    <div className="icon">📎</div>
                    <div className="label">Citas por Evaluación</div>
                    <div className="value">{quality.quotesPerEvaluation}</div>
                    <div className="sub">promedio de evidencia</div>
                  </MetricCard>
                </MetricsGrid>
              </Section>
              
              {/* Distribución Bloom */}
              <Section>
                <h3>📊 Distribución de Niveles Bloom</h3>
                <BloomDistribution>
                  {[1, 2, 3, 4, 5, 6].map(level => {
                    const count = quality.bloomLevelDistribution?.[level] || 0;
                    const percentage = maxBloomCount > 0 ? (count / maxBloomCount) * 100 : 0;
                    
                    return (
                      <BloomBar key={level} $color={BLOOM_COLORS[level]}>
                        <div className="label">{BLOOM_LABELS[level]}</div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{ width: `${percentage}%` }}
                          >
                            {count > 0 && count}
                          </div>
                        </div>
                        <div className="count">{count}</div>
                      </BloomBar>
                    );
                  })}
                </BloomDistribution>
              </Section>
              
              {/* Historial Reciente */}
              <Section>
                <h3>📜 Historial Reciente (últimos 20 eventos)</h3>
                {recentHistory.length === 0 ? (
                  <EmptyState>
                    <div className="icon">📭</div>
                    <div className="message">Aún no hay eventos registrados</div>
                  </EmptyState>
                ) : (
                  <HistoryTable>
                    {recentHistory.map((event, idx) => (
                      <HistoryRow key={idx} $earned={event.earnedPoints}>
                        <div className="timestamp">
                          {new Date(event.timestamp).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="event">{event.label}</div>
                        <div className="points">
                          {event.earnedPoints > 0 ? '+' : ''}{event.earnedPoints} pts
                          {event.multiplier > 1 && (
                            <span style={{ fontSize: '0.8em', opacity: 0.7 }}>
                              {' '}(x{event.multiplier})
                            </span>
                          )}
                        </div>
                      </HistoryRow>
                    ))}
                  </HistoryTable>
                )}
              </Section>
              
              {/* Achievements Desbloqueados */}
              {gamification.achievementsList.length > 0 && (
                <Section>
                  <h3>🏆 Achievements Desbloqueados</h3>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.5rem' 
                  }}>
                    {gamification.achievementsList.map((name, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: `${BLOOM_COLORS[3]}20`,
                          border: `1px solid ${BLOOM_COLORS[3]}`,
                          borderRadius: '20px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: BLOOM_COLORS[3]
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              
              {/* Botón de Exportación */}
              <Section>
                <ExportButton onClick={handleExportCSV}>
                  <span className="icon">📥</span>
                  Exportar CSV de Recompensas
                </ExportButton>
                <p style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', 
                  marginTop: '0.5rem',
                  marginBottom: 0,
                  lineHeight: 1.6
                }}>
                  Descarga el historial completo de tu sistema de recompensas en formato CSV. 
                  Incluye: fecha y hora de cada evento, tipo de acción, descripción, puntos ganados, 
                  multiplicador de racha, nivel Bloom y artefacto asociado. Ideal para Excel y análisis estadístico.
                </p>
              </Section>
            </Content>
          </ModalContainer>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
}
