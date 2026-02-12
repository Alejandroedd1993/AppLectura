/**
 * SyncIndicator - Componente de indicador de estado de sincronización
 * 
 * Muestra visualmente el estado de sincronización con Firestore:
 * - idle: Sin actividad (no muestra nada o icono sutil)
 * - syncing: Sincronizando (animación de rotación)
 * - synced: Sincronizado (check verde)
 * - error: Error de sincronización (warning naranja con tooltip)
 * 
 * @module components/common/SyncIndicator
 */

import React, { useContext, useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { AppContext } from '../../context/AppContext';
import { getPendingSyncs, syncPendingSessions } from '../../services/sessionManager';

import logger from '../../utils/logger';
// Animación de rotación para estado "syncing"
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Animación de pulso para estado "error"
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// Animación de entrada
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const Container = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  animation: ${fadeIn} 0.2s ease-out;
  transition: all 0.3s ease;
  cursor: default;
  
  ${({ $status, $modoOscuro }) => {
        switch ($status) {
            case 'syncing':
                return css`
          background: ${$modoOscuro ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'};
          color: ${$modoOscuro ? '#93c5fd' : '#2563eb'};
          border: 1px solid ${$modoOscuro ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'};
        `;
            case 'synced':
                return css`
          background: ${$modoOscuro ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)'};
          color: ${$modoOscuro ? '#86efac' : '#16a34a'};
          border: 1px solid ${$modoOscuro ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'};
        `;
            case 'error':
                return css`
          background: ${$modoOscuro ? 'rgba(251, 146, 60, 0.2)' : 'rgba(251, 146, 60, 0.1)'};
          color: ${$modoOscuro ? '#fdba74' : '#ea580c'};
          border: 1px solid ${$modoOscuro ? 'rgba(251, 146, 60, 0.3)' : 'rgba(251, 146, 60, 0.2)'};
        `;
            default: // idle
                return css`
          background: transparent;
          color: ${$modoOscuro ? '#9ca3af' : '#6b7280'};
          border: 1px solid transparent;
          opacity: 0.6;
        `;
        }
    }}
`;

const Icon = styled.span`
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  ${({ $status }) => $status === 'syncing' && css`
    animation: ${rotate} 1s linear infinite;
  `}
  
  ${({ $status }) => $status === 'error' && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;

const Label = styled.span`
  white-space: nowrap;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 8px 12px;
  background: ${({ $modoOscuro }) => $modoOscuro ? '#374151' : '#1f2937'};
  color: white;
  font-size: 11px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1000;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${({ $modoOscuro }) => $modoOscuro ? '#374151' : '#1f2937'};
  }
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  
  &:hover ${Tooltip} {
    opacity: 1;
    visibility: visible;
  }
`;

/**
 * Componente de indicador de sincronización
 * @param {object} props
 * @param {boolean} props.showLabel - Mostrar etiqueta de texto (default: true)
 * @param {boolean} props.compact - Modo compacto sin etiqueta (default: false)
 * @param {string} props.className - Clase CSS adicional
 */
const SyncIndicator = ({ showLabel = true, compact = false, className }) => {
  const { syncStatus, modoOscuro, currentUser } = useContext(AppContext);
    const [visible, setVisible] = useState(false);
  const [pendingSessionsCount, setPendingSessionsCount] = useState(0);
  const [syncingPendingSessions, setSyncingPendingSessions] = useState(false);

  // Mantener conteo de sesiones pendientes (persisten en localStorage)
  useEffect(() => {
    const refreshPending = () => {
      try {
        setPendingSessionsCount(getPendingSyncs().length);
      } catch (e) {
        setPendingSessionsCount(0);
      }
    };

    refreshPending();

    // Eventos que ya existen en la app para cambios de sesiones/sync
    window.addEventListener('session-updated', refreshPending);
    window.addEventListener('sync-error', refreshPending);
    window.addEventListener('online', refreshPending);

    return () => {
      window.removeEventListener('session-updated', refreshPending);
      window.removeEventListener('sync-error', refreshPending);
      window.removeEventListener('online', refreshPending);
    };
  }, []);

    // Mostrar solo cuando hay actividad de sync o error
    useEffect(() => {
      if (pendingSessionsCount > 0 || syncingPendingSessions) {
        setVisible(true);
        return;
      }

      if (syncStatus === 'syncing' || syncStatus === 'error') {
        setVisible(true);
      } else if (syncStatus === 'synced') {
        // Mostrar brevemente cuando se sincroniza
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 3000);
        return () => clearTimeout(timer);
      } else {
        setVisible(false);
      }
    }, [syncStatus, pendingSessionsCount, syncingPendingSessions]);

    // No renderizar si no hay nada que mostrar
    if (!visible && syncStatus === 'idle' && pendingSessionsCount === 0) {
        return null;
    }

    const handleRetryPendingSessions = async () => {
      if (pendingSessionsCount === 0 || syncingPendingSessions) return;
      if (!currentUser) {
        alert('Debes iniciar sesión para sincronizar con la nube');
        return;
      }

      try {
        setSyncingPendingSessions(true);
        const result = await syncPendingSessions();
        // Refrescar conteo local inmediatamente
        setPendingSessionsCount(getPendingSyncs().length);

        if ((result?.synced || 0) > 0) {
          // Mensaje breve, no intrusivo
          logger.log(`✅ [SyncIndicator] Pendientes sincronizadas: ${result.synced} ok, ${result.failed} fallidas`);
        }
      } catch (e) {
        logger.warn('⚠️ [SyncIndicator] Error sincronizando pendientes:', e);
      } finally {
        setSyncingPendingSessions(false);
      }
    };

    const getIcon = () => {
      if (syncingPendingSessions) return '🔄';
      if (pendingSessionsCount > 0) return '⚠️';
        switch (syncStatus) {
            case 'syncing': return '🔄';
            case 'synced': return '✓';
            case 'error': return '⚠️';
            default: return '☁️';
        }
    };

    const getLabel = () => {
      if (syncingPendingSessions) return 'Sincronizando...';
      if (pendingSessionsCount > 0) return `Pendientes (${pendingSessionsCount})`;
        switch (syncStatus) {
            case 'syncing': return 'Sincronizando...';
            case 'synced': return 'Sincronizado';
            case 'error': return 'Sin sincronizar';
            default: return 'Desconectado';
        }
    };

    const getTooltip = () => {
      if (syncingPendingSessions) return 'Sincronizando sesiones pendientes...';
      if (pendingSessionsCount > 0) return `Hay ${pendingSessionsCount} sesiones pendientes de sincronizar. Haz clic para reintentar.`;
        switch (syncStatus) {
            case 'syncing': return 'Guardando cambios en la nube...';
            case 'synced': return 'Todos los cambios guardados';
            case 'error': return 'No se pudo sincronizar. Se reintentará automáticamente.';
            default: return 'Sin conexión a la nube';
        }
    };

    const clickable = pendingSessionsCount > 0 && !!currentUser;
    const displayStatus = syncingPendingSessions ? 'syncing' : (pendingSessionsCount > 0 ? 'error' : syncStatus);

    if (compact) {
        return (
        <TooltipWrapper className={className} $clickable={clickable} onClick={clickable ? handleRetryPendingSessions : undefined}>
          <Icon $status={displayStatus} title={getTooltip()}>
                    {getIcon()}
                </Icon>
                <Tooltip $modoOscuro={modoOscuro}>{getTooltip()}</Tooltip>
            </TooltipWrapper>
        );
    }

    return (
      <TooltipWrapper className={className} $clickable={clickable} onClick={clickable ? handleRetryPendingSessions : undefined}>
        <Container $status={displayStatus} $modoOscuro={modoOscuro}>
          <Icon $status={displayStatus}>{getIcon()}</Icon>
                {showLabel && <Label>{getLabel()}</Label>}
            </Container>
            <Tooltip $modoOscuro={modoOscuro}>{getTooltip()}</Tooltip>
        </TooltipWrapper>
    );
};

export default SyncIndicator;
