import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useZDPDetector } from '../../context/PedagogyContext';

/**
 * 🧠 BloomLevelIndicator - Indicador visual del nivel cognitivo actual (Bloom)
 * 
 * Características:
 * - Muestra nivel actual del estudiante (1-6)
 * - Indica zona de desarrollo próximo (ZDP)
 * - Barra de progreso hacia siguiente nivel
 * - Tooltip con información pedagógica
 * - Animaciones suaves en transiciones
 */

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${props => props.theme.surface};
  border: 2px solid ${props => props.$color || props.theme.border};
  border-radius: 8px;
  font-size: 0.85rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
`;

const LevelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const CurrentLevel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: ${props => props.$color || props.theme.textPrimary};
  
  .icon {
    font-size: 1.3em;
  }
  
  .name {
    font-size: 1em;
  }
`;

const LevelPoints = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85em;
  color: ${props => props.theme.textSecondary};
  background: ${props => props.theme.background};
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  
  .value {
    font-weight: 700;
    color: #fbbf24;
  }
`;

const ZDPGoal = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8em;
  color: ${props => props.theme.textSecondary};
  padding: 0.4rem 0.6rem;
  background: ${props => props.theme.background};
  border-radius: 6px;
  border-left: 3px solid ${props => props.$color || props.theme.primary};
  
  .label {
    opacity: 0.8;
  }
  
  .goal {
    font-weight: 700;
    color: ${props => props.$color || props.theme.primary};
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${props => props.theme.background};
  border-radius: 3px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, ${props => props.$color || props.theme.primary} 0%, ${props => props.$color ? adjustBrightness(props.$color, -20) : props.theme.primaryDark || props.theme.primary} 100%);
  border-radius: 3px;
`;

const InfoTooltip = styled.div`
  font-size: 0.75em;
  color: ${props => props.theme.textSecondary};
  line-height: 1.4;
  margin-top: 0.3rem;
  padding: 0.4rem;
  background: ${props => props.theme.background};
  border-radius: 4px;
  
  strong {
    color: ${props => props.theme.textPrimary};
  }
`;

const ScaffoldingHint = styled(motion.div)`
  display: flex;
  align-items: start;
  gap: 0.4rem;
  padding: 0.5rem;
  background: ${props => props.theme.info ? `${props.theme.info}15` : '#dbeafe'};
  border: 1px solid ${props => props.theme.info || '#3b82f6'};
  border-radius: 6px;
  font-size: 0.75em;
  color: ${props => props.theme.textPrimary};
  line-height: 1.4;
  margin-top: 0.3rem;
  
  .icon {
    font-size: 1.2em;
    flex-shrink: 0;
  }
`;

// Utilidad para ajustar brillo de color
function adjustBrightness(color, percent) {
  try {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  } catch {
    return color;
  }
}

export default function BloomLevelIndicator({ compact = false, showTooltip = true }) {
  const zdpDetector = useZDPDetector();
  const [currentDetection, setCurrentDetection] = useState(null);
  const [progression, setProgression] = useState(null);
  
  useEffect(() => {
    if (!zdpDetector) return;
    
    try {
      // Analizar progresión actual
      const prog = zdpDetector.analyzeProgression();
      setProgression(prog);
      
      // Si hay historial, usar el nivel más reciente
      const history = zdpDetector.history || [];
      if (history.length > 0) {
        setCurrentDetection(history[history.length - 1]);
      }
    } catch (e) {
      console.warn('Error obteniendo progresión ZDP:', e);
    }
  }, [zdpDetector]);
  
  if (!zdpDetector || !progression) {
    // Estado inicial sin detección
    return (
      <Container $color="#6b7280">
        <LevelHeader>
          <CurrentLevel $color="#6b7280">
            <span className="icon">🎯</span>
            <span className="name">Sin nivel detectado</span>
          </CurrentLevel>
        </LevelHeader>
        {!compact && showTooltip && (
          <InfoTooltip>
            Haz una pregunta para que el tutor detecte tu nivel cognitivo actual
          </InfoTooltip>
        )}
      </Container>
    );
  }
  
  const currentLevel = currentDetection?.current || progression?.current || { id: 1, name: 'Recordar', color: '#10b981', icon: '📖' };
  const zdpLevel = currentDetection?.zdp || progression?.zdp || { id: 2, name: 'Comprender', color: '#3b82f6', icon: '💡' };
  const shouldScaffold = currentDetection?.shouldScaffold ?? true;
  const confidence = currentDetection?.confidence || 0;
  
  // Calcular progreso hacia siguiente nivel (basado en confianza de detección)
  const progressToNext = Math.min(confidence * 100, 100);
  
  // Puntos por nivel
  const points = zdpDetector.calculatePoints ? zdpDetector.calculatePoints(currentLevel.id) : 0;
  
  return (
    <Container
      $color={currentLevel.color}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <LevelHeader>
        <CurrentLevel $color={currentLevel.color}>
          <span className="icon">{currentLevel.icon}</span>
          <span className="name">{currentLevel.name}</span>
        </CurrentLevel>
        
        <LevelPoints>
          <span className="value">+{points}</span>
          <span>pts</span>
        </LevelPoints>
      </LevelHeader>
      
      {!compact && (
        <>
          <ZDPGoal $color={zdpLevel.color}>
            <span className="label">Meta ZDP:</span>
            <span className="goal">
              {zdpLevel.icon} {zdpLevel.name}
            </span>
          </ZDPGoal>
          
          <ProgressBar>
            <ProgressFill
              $color={currentLevel.color}
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </ProgressBar>
          
          {showTooltip && currentLevel.description && (
            <InfoTooltip>
              <strong>{currentLevel.name}:</strong> {currentLevel.description}
            </InfoTooltip>
          )}
          
          {shouldScaffold && zdpLevel.scaffoldingPrompt && (
            <ScaffoldingHint
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <span className="icon">💡</span>
              <span>{zdpLevel.scaffoldingPrompt}</span>
            </ScaffoldingHint>
          )}
          
          {progression && progression.trend && (
            <div style={{ 
              fontSize: '0.75em', 
              color: progression.trend === 'ascending' ? '#10b981' : progression.trend === 'descending' ? '#f59e0b' : '#6b7280',
              marginTop: '0.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span>
                {progression.trend === 'ascending' && '📈 Progreso ascendente'}
                {progression.trend === 'descending' && '📉 Dificultad temporal'}
                {progression.trend === 'stable' && '➡️ Nivel estable'}
              </span>
              <span style={{ opacity: 0.7 }}>
                (Promedio: {progression.avgLevel?.toFixed(1) || 'N/A'})
              </span>
            </div>
          )}
        </>
      )}
    </Container>
  );
}
