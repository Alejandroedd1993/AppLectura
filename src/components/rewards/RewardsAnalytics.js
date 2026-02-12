import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRewards } from '../../context/PedagogyContext';

import logger from '../../utils/logger';
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

const DangerZone = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: ${props => props.theme.error}10;
  border: 1px solid ${props => props.theme.error}40;
  border-radius: 12px;
`;

const ResetButton = styled.button`
  background: transparent;
  color: ${props => props.theme.error};
  border: 1px solid ${props => props.theme.error};
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.error};
    color: white;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const ConfirmBox = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 2px solid ${props => props.theme.error};
  border-radius: 16px;
  max-width: 450px;
  width: 100%;
  padding: 2rem;
  text-align: center;
  
  h3 {
    color: ${props => props.theme.error};
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
  }
  
  p {
    color: ${props => props.theme.textSecondary};
    margin: 0 0 1.5rem 0;
    line-height: 1.6;
  }
  
  .warning-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .confirm-input {
    width: 100%;
    padding: 0.8rem;
    border: 2px solid ${props => props.theme.border};
    border-radius: 8px;
    font-size: 1rem;
    text-align: center;
    margin-bottom: 1rem;
    background: ${props => props.theme.background};
    color: ${props => props.theme.textPrimary};
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.error};
    }
  }
  
  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
`;

const ConfirmButton = styled.button`
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.cancel {
    background: ${props => props.theme.background};
    border: 1px solid ${props => props.theme.border};
    color: ${props => props.theme.textPrimary};
    
    &:hover {
      background: ${props => props.theme.surface};
    }
  }
  
  &.danger {
    background: ${props => props.theme.error};
    border: none;
    color: white;
    
    &:hover:not(:disabled) {
      transform: scale(1.05);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
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
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 🆕 Forzar re-render

  // 🆕 Escuchar cambios en el estado de rewards
  useEffect(() => {
    const handleRewardsChange = () => {
      logger.log('📊 [RewardsAnalytics] Detectado cambio en rewards, refrescando...');
      setRefreshKey(k => k + 1);
    };

    const handleProgressSync = (e) => {
      logger.log('📊 [RewardsAnalytics] Detectado sync desde cloud:', e.detail);
      // Pequeño delay para asegurar que el engine ya procesó el importState
      setTimeout(() => setRefreshKey(k => k + 1), 100);
    };

    window.addEventListener('rewards-state-changed', handleRewardsChange);
    window.addEventListener('progress-synced-from-cloud', handleProgressSync);
    return () => {
      window.removeEventListener('rewards-state-changed', handleRewardsChange);
      window.removeEventListener('progress-synced-from-cloud', handleProgressSync);
    };
  }, []);

  // 🆕 Refrescar al abrir el modal
  useEffect(() => {
    if (isOpen) {
      logger.log('📊 [RewardsAnalytics] Modal abierto, obteniendo datos actuales...');
      setRefreshKey(k => k + 1);
    }
  }, [isOpen]);

  // 🆕 Obtener analytics directamente (sin cache de useMemo problemático)
  const getAnalyticsNow = useCallback(() => {
    const engine = typeof window !== 'undefined' ? window.__rewardsEngine : rewards;
    if (!engine) {
      logger.warn('📊 [RewardsAnalytics] No hay engine disponible');
      return null;
    }
    const state = engine.getState();
    logger.log('📊 [RewardsAnalytics] Estado actual:', {
      totalPoints: state.totalPoints,
      historyLength: state.history?.length,
      stats: state.stats
    });
    return engine.getAnalytics();
  }, [rewards]);

  // Estado local de analytics que se actualiza con cada cambio
  const [analytics, setAnalytics] = useState(() => getAnalyticsNow());

  // Actualizar analytics cuando cambie refreshKey o se abra el modal
  useEffect(() => {
    const newAnalytics = getAnalyticsNow();
    setAnalytics(newAnalytics);
  }, [refreshKey, isOpen, getAnalyticsNow]);

  const handleResetPoints = useCallback(async () => {
    const engine = typeof window !== 'undefined' ? window.__rewardsEngine : rewards;
    if (confirmText !== 'CONFIRMAR' || !engine) return;
    
    setIsResetting(true);
    try {
      // Resetear el motor de recompensas (ahora incluye forceSync automático)
      engine.reset();
      
      // Persistir el estado vacío en localStorage
      engine.persist();
      
      logger.log('🗑️ [RewardsAnalytics] Puntos reiniciados correctamente');
      
      // Cerrar modales
      setShowConfirmReset(false);
      setConfirmText('');
      
      // Refrescar analytics
      setRefreshKey(k => k + 1);
      
      // Cerrar el panel principal después de un momento
      setTimeout(() => onClose(), 500);
    } catch (error) {
      logger.error('Error al reiniciar puntos:', error);
    } finally {
      setIsResetting(false);
    }
  }, [confirmText, rewards, onClose]);

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

  // Últimos 20 eventos (filtrar eventos sintéticos de recuperación legacy)
  const recentHistory = history
    .filter(h => h.event !== 'LEGACY_POINTS_RECOVERED')
    .slice(-20)
    .reverse();

  // 🆕 Detectar si hay puntos sin historial real (solo entrada sintética)
  const hasOnlySyntheticHistory = history.length === 1 && 
    history[0]?.event === 'LEGACY_POINTS_RECOVERED';

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

              {/* Investigación y Metacognición */}
              <Section>
                <h3>🔍 Investigación y Metacognición</h3>
                <MetricsGrid>
                  <MetricCard>
                    <div className="icon">🧠</div>
                    <div className="label">Reflexiones Metacognitivas</div>
                    <div className="value">{quality.metacognitiveReflections}</div>
                    <div className="sub">pensamiento sobre el pensar</div>
                  </MetricCard>

                  <MetricCard>
                    <div className="icon">🌐</div>
                    <div className="label">Búsquedas Web</div>
                    <div className="value">{quality.webSearchesUsed}</div>
                    <div className="sub">enriquecimiento de contexto</div>
                  </MetricCard>

                  <MetricCard>
                    <div className="icon">🖌️</div>
                    <div className="label">Anotaciones y Notas</div>
                    <div className="value">{quality.annotationsCreated + quality.notesCreated}</div>
                    <div className="sub">{quality.annotationsCreated} resaltados, {quality.notesCreated} notas</div>
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
                    <div className="icon">{hasOnlySyntheticHistory ? '📊' : '📭'}</div>
                    <div className="message">
                      {hasOnlySyntheticHistory 
                        ? 'Puntos acumulados de sesiones anteriores'
                        : gamification.totalPoints > 0 
                          ? 'El historial detallado se sincronizará pronto'
                          : 'Aún no hay eventos registrados'}
                    </div>
                    {(gamification.totalPoints > 0 || hasOnlySyntheticHistory) && (
                      <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>
                        {hasOnlySyntheticHistory 
                          ? `Tienes ${gamification.totalPoints} puntos de progreso anterior. El historial detallado se irá construyendo con tus nuevas interacciones.`
                          : `Tienes ${gamification.totalPoints} puntos acumulados. El historial de acciones se actualizará con tu próxima interacción.`
                        }
                      </div>
                    )}
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

              {/* Zona de Peligro - Reiniciar Puntos */}
              <DangerZone>
                <h3 style={{ 
                  margin: '0 0 0.75rem 0', 
                  color: 'inherit',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ⚠️ Zona de Peligro
                </h3>
                <p style={{
                  fontSize: '0.85rem',
                  margin: '0 0 1rem 0',
                  lineHeight: 1.6,
                  opacity: 0.9
                }}>
                  Si deseas empezar de cero, puedes reiniciar todos tus puntos y estadísticas.
                  Esta acción es <strong>irreversible</strong>.
                </p>
                <ResetButton 
                  onClick={() => setShowConfirmReset(true)}
                  disabled={gamification.totalPoints === 0}
                >
                  🗑️ Reiniciar todos los puntos
                </ResetButton>
                {gamification.totalPoints === 0 && (
                  <span style={{ 
                    marginLeft: '1rem', 
                    fontSize: '0.8rem', 
                    opacity: 0.7 
                  }}>
                    (No hay puntos que reiniciar)
                  </span>
                )}
              </DangerZone>
            </Content>
          </ModalContainer>

          {/* Modal de Confirmación de Reset */}
          <AnimatePresence>
            {showConfirmReset && (
              <ConfirmModal
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowConfirmReset(false);
                  setConfirmText('');
                }}
              >
                <ConfirmBox
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="warning-icon">⚠️</div>
                  <h3>¿Estás seguro?</h3>
                  <p>
                    Vas a eliminar <strong>{gamification.totalPoints} puntos</strong> y todo tu historial de recompensas.
                    <br /><br />
                    <strong style={{ color: 'inherit' }}>
                      Esta acción NO se puede deshacer.
                    </strong>
                  </p>
                  <p style={{ fontSize: '0.9rem' }}>
                    Escribe <strong>CONFIRMAR</strong> para continuar:
                  </p>
                  <input
                    type="text"
                    className="confirm-input"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="CONFIRMAR"
                    autoFocus
                  />
                  <div className="buttons">
                    <ConfirmButton 
                      className="cancel"
                      onClick={() => {
                        setShowConfirmReset(false);
                        setConfirmText('');
                      }}
                    >
                      Cancelar
                    </ConfirmButton>
                    <ConfirmButton 
                      className="danger"
                      disabled={confirmText !== 'CONFIRMAR' || isResetting}
                      onClick={handleResetPoints}
                    >
                      {isResetting ? '⏳ Eliminando...' : '🗑️ Eliminar todo'}
                    </ConfirmButton>
                  </div>
                </ConfirmBox>
              </ConfirmModal>
            )}
          </AnimatePresence>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
}
