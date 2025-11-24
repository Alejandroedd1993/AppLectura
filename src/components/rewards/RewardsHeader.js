import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRewards } from '../../context/PedagogyContext';
import { ACHIEVEMENTS } from '../../pedagogy/rewards/rewardsEngine';
import RewardsAnalytics from './RewardsAnalytics';

/**
 * 🎮 RewardsHeader - Header global con indicador de puntos, racha y achievements
 * 
 * Características:
 * - Muestra puntos totales acumulados
 * - Indicador de racha con emoji dinámico
 * - Badge de achievements desbloqueados
 * - Animación al ganar puntos (toast)
 * - Click en header abre panel de detalles (opcional)
 */

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 0.9rem;
  user-select: none;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
`;

const PointsBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: ${props => props.theme.success};
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 150, 136, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  .icon {
    font-size: 1.1em;
  }
  
  .value {
    font-size: 1.1em;
  }
`;

const StreakBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: ${props => getStreakGradient(props.$streak)};
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid ${props => props.theme.border};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  .icon {
    font-size: 1.1em;
    animation: ${props => props.$streak >= 3 ? 'pulse 2s ease-in-out infinite' : 'none'};
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
`;

const AchievementsBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: ${props => props.theme.primary};
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(49, 144, 252, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  .icon {
    font-size: 1.1em;
  }
`;

const LevelBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: ${props => props.theme.textSecondary};
  font-size: 0.85em;
  
  .level-icon {
    font-size: 1em;
  }
`;

// Toast flotante para notificar puntos ganados
const PointsToast = styled(motion.div)`
  position: fixed;
  top: 80px;
  right: 20px;
  background: ${props => props.theme.success};
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 150, 136, 0.4);
  z-index: 10000;
  font-weight: 700;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  
  .icon {
    font-size: 2em;
  }
  
  .content {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .points {
    font-size: 1.3em;
  }
  
  .reason {
    font-size: 0.75em;
    opacity: 0.9;
  }
`;

// Achievement unlock popup
const AchievementPopup = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${props => props.theme.primary};
  color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(49, 144, 252, 0.5);
  z-index: 10001;
  text-align: center;
  max-width: 400px;
  
  .title {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
  }
  
  .icon {
    font-size: 4rem;
    margin: 1rem 0;
    animation: bounce 1s ease-in-out;
  }
  
  .description {
    font-size: 0.9rem;
    opacity: 0.95;
    margin-top: 0.5rem;
  }
  
  .points {
    font-size: 1.2rem;
    font-weight: 700;
    margin-top: 1rem;
    color: #FBBF24;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
`;

// Utilidad para gradiente de racha dinámico
function getStreakGradient(streak) {
  if (streak >= 30) return '#dc2626'; // Racha legendaria
  if (streak >= 7) return '#f59e0b'; // Racha semanal
  if (streak >= 3) return '#009688'; // Racha iniciada (usando nuevo verde)
  return '#607D8B'; // Sin racha (usando texto secundario)
}

// Emoji dinámico según racha
function getStreakEmoji(streak) {
  if (streak >= 30) return '🔥🔥🔥'; // Legendario
  if (streak >= 7) return '🔥🔥'; // Semanal
  if (streak >= 3) return '🔥'; // Iniciado
  return '📅'; // Sin racha
}

export default function RewardsHeader({ onClickDetails }) {
  const rewards = useRewards();
  const [state, setState] = useState(() => rewards?.getState() || { totalPoints: 0, streak: 0, achievements: [] });
  const [toastInfo, setToastInfo] = useState(null); // { points, reason, multiplier }
  const [achievementPopup, setAchievementPopup] = useState(null); // { achievement }
  const [showAnalytics, setShowAnalytics] = useState(false); // 📊 Panel de analytics
  
  // 🆕 Suscribirse a eventos de cambio de rewardsEngine (actualización INMEDIATA)
  useEffect(() => {
    if (!rewards) return;
    
    const handleRewardsChange = (event) => {
      const newState = rewards.getState();
      
      setState(prevState => {
        const prevPoints = prevState.totalPoints;
        const newPoints = newState.totalPoints;
        
        console.log('🎮 [RewardsHeader] rewards-state-changed:', { prevPoints, newPoints });
        
        // Detectar incremento de puntos y mostrar toast
        if (newPoints > prevPoints) {
          const diff = newPoints - prevPoints;
          setToastInfo({
            points: diff,
            reason: 'Acción completada',
            multiplier: newState.lastMultiplier || 1
          });
          
          // Auto-cerrar toast después de 4 segundos
          setTimeout(() => setToastInfo(null), 4000);
        }
        
        // Detectar nuevo achievement
        const prevAchievements = prevState.achievements?.length || 0;
        const newAchievements = newState.achievements?.length || 0;
        if (newAchievements > prevAchievements) {
          const latestAchievementId = newState.achievements[newAchievements - 1];
          const achievementData = ACHIEVEMENTS[latestAchievementId.toUpperCase()];
          if (achievementData) {
            setAchievementPopup({ achievement: achievementData });
            
            // Auto-cerrar popup después de 6 segundos
            setTimeout(() => setAchievementPopup(null), 6000);
          }
        }
        
        return newState;
      });
    };
    
    // Escuchar evento de cambio en rewardsEngine
    window.addEventListener('rewards-state-changed', handleRewardsChange);
    
    // Actualizar estado inicial al montar
    const initialState = rewards.getState();
    setState(initialState);
    
    return () => window.removeEventListener('rewards-state-changed', handleRewardsChange);
  }, [rewards]); // Solo depende de rewards, no de state

  // 🆕 LISTENER: Actualizar inmediatamente cuando llega sync de Firestore
  useEffect(() => {
    if (!rewards) return;
    
    const handleProgressSync = (event) => {
      console.log('🔄 [RewardsHeader] Evento progress-synced-from-cloud recibido:', event.detail);
      
      // Diferir setState para evitar warning de React
      setTimeout(() => {
        const newState = rewards.getState();
        console.log('📊 [RewardsHeader] Estado actualizado desde rewards:', {
          totalPoints: newState.totalPoints,
          availablePoints: newState.availablePoints
        });
        setState(newState);
      }, 0);
    };
    
    window.addEventListener('progress-synced-from-cloud', handleProgressSync);
    
    return () => {
      window.removeEventListener('progress-synced-from-cloud', handleProgressSync);
    };
  }, [rewards]);
  
  if (!rewards) return null; // No renderizar si no hay sistema de rewards
  
  const { totalPoints, availablePoints, streak, achievements } = state;
  const achievementCount = achievements?.length || 0;
  
  // Calcular nivel aproximado (cada 500 puntos = 1 nivel)
  const level = Math.floor(totalPoints / 500) + 1;
  
  // Handler para abrir analytics
  const handleOpenAnalytics = () => {
    setShowAnalytics(true);
    if (onClickDetails) onClickDetails();
  };
  
  return (
    <>
      <HeaderContainer>
        <PointsBadge
          onClick={handleOpenAnalytics}
          title={`Puntos totales: ${totalPoints} (${availablePoints} disponibles)`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="icon">⭐</span>
          <span className="value">{totalPoints}</span>
          <span style={{ fontSize: '0.8em', opacity: 0.9 }}>pts</span>
        </PointsBadge>
        
        <StreakBadge
          $streak={streak}
          title={`Racha: ${streak} días consecutivos`}
        >
          <span className="icon">{getStreakEmoji(streak)}</span>
          <span>{streak} días</span>
        </StreakBadge>
        
        <AchievementsBadge
          onClick={handleOpenAnalytics}
          title={`Achievements desbloqueados: ${achievementCount}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="icon">🏆</span>
          <span>{achievementCount}</span>
        </AchievementsBadge>
        
        <LevelBadge title={`Nivel ${level} (${totalPoints} pts)`}>
          <span className="level-icon">🎓</span>
          <span>Nivel {level}</span>
        </LevelBadge>
      </HeaderContainer>
      
      {/* Toast de puntos ganados */}
      <AnimatePresence>
        {toastInfo && (
          <PointsToast
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="icon">🎉</div>
            <div className="content">
              <div className="points">
                +{toastInfo.points} pts
                {toastInfo.multiplier > 1 && (
                  <span style={{ fontSize: '0.7em', marginLeft: '0.3rem' }}>
                    (x{toastInfo.multiplier.toFixed(1)})
                  </span>
                )}
              </div>
              <div className="reason">{toastInfo.reason}</div>
            </div>
          </PointsToast>
        )}
      </AnimatePresence>
      
      {/* Popup de achievement desbloqueado */}
      <AnimatePresence>
        {achievementPopup && (
          <AchievementPopup
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onClick={() => setAchievementPopup(null)}
          >
            <div className="title">🎊 Achievement Desbloqueado!</div>
            <div className="icon">{achievementPopup.achievement?.icon || '🏆'}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '0.5rem' }}>
              {achievementPopup.achievement?.name || 'Logro Especial'}
            </div>
            <div className="description">
              {achievementPopup.achievement?.description || 'Has alcanzado un hito importante'}
            </div>
            <div className="points">
              +{achievementPopup.achievement?.points || 0} pts
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '1rem', opacity: 0.8 }}>
              Click para cerrar
            </div>
          </AchievementPopup>
        )}
      </AnimatePresence>
      
      {/* Panel de Analytics */}
      <RewardsAnalytics 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
      />
    </>
  );
}
