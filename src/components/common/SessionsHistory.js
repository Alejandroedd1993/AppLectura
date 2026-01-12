import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { 
  getAllSessions,
  getAllSessionsMerged,
  deleteSession, 
  deleteAllSessions,
  getCurrentSessionId,
  syncPendingSessions,
  syncAllSessionsToCloud,
  getPendingSyncs,
  getSyncStatus,
  getSessionsLimit
} from '../../services/sessionManager';
import { checkUnsaveDrafts, getWarningMessage } from '../../utils/checkUnsaveDrafts';
import SessionCard from '../historial/SessionCard';
import SessionFilters from '../historial/SessionFilters';

/**
 * Componente de historial de sesiones
 * 🔥 Ahora con sincronización Firebase automática
 */
const SessionsHistory = ({ theme }) => {
  const { 
    texto, 
    modoOscuro: _modoOscuro,
    restoreSession,
    createSession,
    updateCurrentSessionFromState,
    currentUser,
    currentTextoId,
    rubricProgress,
    activitiesProgress // 🆕 FASE 4: Para verificar artefactos ya entregados
  } = useContext(AppContext);
  
  const [sessions, setSessions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [_deletingId, setDeletingId] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  
  // 🆕 FASE 2: Estado de filtros
  const [filters, setFilters] = useState({
    searchQuery: '',
    dateRange: 'all',
    hasAnalysis: 'all',
    hasProgress: 'all',
    sortBy: 'recent',
    syncStatus: 'all'
  });

  // Cargar sesiones al montar y cuando cambie el estado
  useEffect(() => {
    loadSessions();
    
    // Escuchar eventos de actualización de sesiones
    const handleSessionUpdate = () => loadSessions();
    window.addEventListener('session-updated', handleSessionUpdate);
    
    return () => {
      window.removeEventListener('session-updated', handleSessionUpdate);
    };
  }, [currentUser]);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);

      // Actualizar pendientes aunque falle el fetch de cloud
      setPendingSyncCount(getPendingSyncs().length);
      
      // 🔥 Usar sesiones merged si hay usuario autenticado
      if (currentUser) {
        const mergedSessions = await getAllSessionsMerged();
        setSessions(mergedSessions);
        
        // Obtener estado de sincronización
        const status = await getSyncStatus();
        setSyncStatus(status);
        
        // 🆕 Obtener límite de sesiones
        const limit = getSessionsLimit();
        setSessionLimit(limit);
        
        console.log('📊 [SessionsHistory] Sesiones cargadas:', {
          total: mergedSessions.length,
          limit: limit.max,
          remaining: limit.remaining,
          percentUsed: limit.percentUsed + '%',
          isNearLimit: limit.isNearLimit
        });
      } else {
        // Solo sesiones locales
        const localSessions = getAllSessions();
        setSessions(localSessions.map(s => ({ 
          ...s, 
          source: 'local', 
          inCloud: false, 
          inLocal: true 
        })));
        setSyncStatus(null);
      }
    } catch (error) {
      console.error('❌ Error cargando sesiones:', error);
      // Fallback a sesiones locales
      const localSessions = getAllSessions();
      setSessions(localSessions);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleSyncPendingNow = useCallback(async () => {
    if (!currentUser) {
      alert('Debes iniciar sesión para sincronizar con la nube');
      return;
    }

    const pending = getPendingSyncs();
    if (pending.length === 0) {
      alert('✅ No hay sesiones pendientes por sincronizar');
      return;
    }

    try {
      setLoading(true);
      const result = await syncPendingSessions();

      alert(`✅ Sincronización de pendientes completada:\n${result.synced} sesiones sincronizadas\n${result.failed} fallidas`);
      loadSessions();
    } catch (error) {
      console.error('❌ Error sincronizando pendientes:', error);
      alert('Error sincronizando pendientes. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadSessions]);

  const handleSessionClick = useCallback(async (session) => {
    console.log('🖱️ [SessionsHistory] Click en sesión:', {
      id: session.id,
      timestamp: session.timestamp,
      hasText: !!session.text,
      restoreSessionAvailable: !!restoreSession
    });
    
    if (!restoreSession) {
      console.error('❌ restoreSession no disponible en contexto');
      return;
    }
    
    // 🆕 Verificar si hay borradores sin evaluar (FASE 4: también considera activitiesProgress)
    const { hasDrafts } = checkUnsaveDrafts(currentTextoId, rubricProgress, activitiesProgress);
    if (hasDrafts) {
      const warningMessage = getWarningMessage(currentTextoId, rubricProgress, activitiesProgress);
      const confirmed = window.confirm(warningMessage);
      
      if (!confirmed) {
        console.log('❌ [SessionsHistory] Cambio de sesión cancelado por el usuario');
        return;
      }
    }
    
    console.log('📂 [SessionsHistory] Restaurando sesión:', session.id);
    const success = await restoreSession(session);
    console.log('🔄 [SessionsHistory] Resultado restauración:', success ? '✅ Éxito' : '❌ Error');
    
    if (success) {
      setIsExpanded(false);
      // Cambiar a lectura guiada
      setTimeout(() => {
        console.log('🔀 [SessionsHistory] Cambiando a tab "lectura-guiada"');
        window.dispatchEvent(new CustomEvent('app-change-tab', { 
          detail: { tabId: 'lectura-guiada' } 
        }));
      }, 300);
    } else {
      console.error('❌ [SessionsHistory] No se pudo restaurar la sesión');
    }
  }, [restoreSession, currentTextoId, rubricProgress]);

  const handleDeleteSession = useCallback(async (sessionId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta sesión? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setDeletingId(sessionId);
    
    const success = deleteSession(sessionId);
    if (success) {
      loadSessions();
      setTimeout(() => setDeletingId(null), 300);
    }
  }, [loadSessions]);

  const handleDeleteAllSessions = useCallback(() => {
    if (!sessions.length) {
      return;
    }

    const confirmed = window.confirm('¿Eliminar todas las sesiones guardadas? Esta acción borrará el historial completo.');
    if (!confirmed) {
      return;
    }

    const success = deleteAllSessions();
    if (success) {
      loadSessions();
      window.dispatchEvent(new CustomEvent('session-updated'));
    }
  }, [sessions.length, loadSessions]);

  const handleCreateNewSession = useCallback(async () => {
    if (!texto || !createSession) {
      console.warn('⚠️ No hay texto cargado para crear sesión');
      return;
    }
    
    const session = await createSession();
    if (session) {
      loadSessions();
      setIsExpanded(false);
    }
  }, [texto, createSession, loadSessions]);

  // 🆕 NUEVA FUNCIÓN: Guardar cambios en sesión actual
  const handleSaveCurrentSession = useCallback(async () => {
    if (!texto) {
      console.warn('⚠️ [SessionsHistory] No hay texto para guardar');
      return;
    }

    const currentSessionId = getCurrentSessionId();
    if (!currentSessionId) {
      alert('⚠️ No hay sesión activa. Crea una nueva sesión primero.');
      return;
    }

    if (updateCurrentSessionFromState) {
      setLoading(true);
      const result = await updateCurrentSessionFromState();
      setLoading(false);
      
      if (result) {
        loadSessions();
        alert('✅ Sesión guardada exitosamente');
      } else {
        alert('❌ Error guardando sesión');
      }
    } else {
      console.error('❌ updateCurrentSessionFromState no disponible');
    }
  }, [texto, updateCurrentSessionFromState, loadSessions]);

  const handleSyncAllToCloud = useCallback(async () => {
    if (!currentUser) {
      alert('Debes iniciar sesión para sincronizar con la nube');
      return;
    }

    if (!window.confirm('¿Sincronizar todas las sesiones locales con Firebase?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await syncAllSessionsToCloud();
      
      alert(`✅ Sincronización completada:\n${result.synced} sesiones sincronizadas\n${result.errors} errores`);
      
      loadSessions();
    } catch (error) {
      console.error('❌ Error sincronizando:', error);
      alert('Error sincronizando sesiones. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadSessions]);

  // 🆕 FASE 2: Aplicar filtros a las sesiones
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Filtro de búsqueda
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(session => {
        const title = session.title?.toLowerCase() || '';
        const content = session.text?.content?.toLowerCase() || '';
        const preview = session.textPreview?.toLowerCase() || '';
        return title.includes(query) || content.includes(query) || preview.includes(query);
      });
    }

    // Filtro de fecha
    if (filters.dateRange !== 'all') {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;
      const oneMonthMs = 30 * oneDayMs;

      result = result.filter(session => {
        const sessionTime = new Date(session.lastModified || session.createdAt).getTime();
        const diff = now - sessionTime;

        switch (filters.dateRange) {
          case 'today':
            return diff <= oneDayMs;
          case 'week':
            return diff <= oneWeekMs;
          case 'month':
            return diff <= oneMonthMs;
          default:
            return true;
        }
      });
    }

    // Filtro de análisis
    if (filters.hasAnalysis !== 'all') {
      result = result.filter(session => {
        const hasAnalysis = session.hasCompleteAnalysis || false;
        return filters.hasAnalysis === 'yes' ? hasAnalysis : !hasAnalysis;
      });
    }

    // Filtro de progreso
    if (filters.hasProgress !== 'all') {
      result = result.filter(session => {
        const progress = session.rubricProgress || {};
        const hasProgress = Object.keys(progress).some(k => 
          k.startsWith('rubrica') && progress[k]?.scores?.length > 0
        );
        return filters.hasProgress === 'yes' ? hasProgress : !hasProgress;
      });
    }

    // Filtro de estado de sincronización
    if (filters.syncStatus !== 'all') {
      result = result.filter(session => {
        switch (filters.syncStatus) {
          case 'synced':
            return session.syncStatus === 'synced' || (session.inCloud && session.inLocal);
          case 'local':
            return session.source === 'local' && !session.inCloud;
          case 'cloud':
            return session.source === 'firestore' && !session.inLocal;
          default:
            return true;
        }
      });
    }

    // Ordenamiento
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'recent':
          return (b.lastModified || b.createdAt) - (a.lastModified || a.createdAt);
        
        case 'oldest':
          return (a.lastModified || a.createdAt) - (b.lastModified || b.createdAt);
        
        case 'progress': {
          const getAvgProgress = (session) => {
            const progress = session.rubricProgress || {};
            const rubrics = Object.keys(progress).filter(k => k.startsWith('rubrica'));
            if (rubrics.length === 0) return 0;
            const sum = rubrics.reduce((acc, k) => acc + (progress[k]?.average || 0), 0);
            return sum / rubrics.length;
          };
          return getAvgProgress(b) - getAvgProgress(a);
        }
        
        case 'words': {
          const getWords = (session) => session.textMetadata?.words || session.text?.metadata?.words || 0;
          return getWords(b) - getWords(a);
        }
        
        default:
          return 0;
      }
    });

    return result;
  }, [sessions, filters]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleExportSession = useCallback((session) => {
    try {
      const dataStr = JSON.stringify(session, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `session-${session.id}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      console.log('✅ Sesión exportada:', session.id);
    } catch (error) {
      console.error('❌ Error exportando sesión:', error);
      alert('Error exportando la sesión');
    }
  }, []);

  if (sessions.length === 0 && !texto) {
    return null; // No mostrar si no hay sesiones ni texto
  }

  return (
    <HistoryContainer theme={theme}>
      <HistoryHeader onClick={() => setIsExpanded(!isExpanded)}>
        <HistoryTitle theme={theme}>
          <Icon>📚</Icon>
          Historial de Sesiones
          {sessions.length > 0 && (
            <SessionCount theme={theme}>({sessions.length})</SessionCount>
          )}
          {loading && <LoadingSpinner>⏳</LoadingSpinner>}
        </HistoryTitle>
        <ExpandIcon $expanded={isExpanded}>▼</ExpandIcon>
      </HistoryHeader>

      <AnimatePresence>
        {isExpanded && (
          <HistoryContent
            theme={theme}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 🔥 Estado de sincronización */}
            {syncStatus && currentUser && (
              <SyncStatusBanner theme={theme}>
                <SyncStat>
                  <SyncIcon>☁️</SyncIcon>
                  <SyncLabel>{syncStatus.synced} sincronizadas</SyncLabel>
                </SyncStat>
                {syncStatus.localOnly > 0 && (
                  <SyncStat>
                    <SyncIcon>📱</SyncIcon>
                    <SyncLabel>{syncStatus.localOnly} solo locales</SyncLabel>
                  </SyncStat>
                )}
                {syncStatus.needsSync > 0 && (
                  <SyncStat warning>
                    <SyncIcon>⚠️</SyncIcon>
                    <SyncLabel>{syncStatus.needsSync} pendientes</SyncLabel>
                  </SyncStat>
                )}
              </SyncStatusBanner>
            )}

            {/* 🆕 Indicador de límite de sesiones */}
            {sessionLimit && (
              <LimitBanner theme={theme} $warning={sessionLimit.isNearLimit}>
                <LimitInfo>
                  <LimitIcon>{sessionLimit.isFull ? '🔴' : sessionLimit.isNearLimit ? '⚠️' : '💾'}</LimitIcon>
                  <LimitText>
                    <strong>{sessionLimit.current}</strong> de <strong>{sessionLimit.max}</strong> sesiones
                    {sessionLimit.remaining > 0 && (
                      <LimitHint> ({sessionLimit.remaining} disponibles)</LimitHint>
                    )}
                  </LimitText>
                </LimitInfo>
                <ProgressBar $percent={sessionLimit.percentUsed} theme={theme}>
                  <ProgressFill $percent={sessionLimit.percentUsed} $warning={sessionLimit.isNearLimit} />
                </ProgressBar>
                {sessionLimit.isNearLimit && (
                  <LimitWarning>
                    💡 Las sesiones más antiguas se eliminan automáticamente al alcanzar el límite
                  </LimitWarning>
                )}
              </LimitBanner>
            )}

            {/* Botones de acción principales */}
            <ActionsRow>
              {texto && getCurrentSessionId() && (
                <SaveSessionButton
                  theme={theme}
                  onClick={handleSaveCurrentSession}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  <span>💾</span>
                  Guardar Sesión
                </SaveSessionButton>
              )}

              {texto && (
                <NewSessionButton
                  theme={theme}
                  onClick={handleCreateNewSession}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  <span>➕</span>
                  Crear Nueva Sesión
                </NewSessionButton>
              )}

              {/* 🔥 Botón de sincronización */}
              {currentUser && pendingSyncCount > 0 && (
                <SyncButton
                  theme={theme}
                  onClick={handleSyncPendingNow}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                >
                  🔄 Sincronizar pendientes {pendingSyncCount}
                </SyncButton>
              )}

              {currentUser && syncStatus && (syncStatus.localOnly > 0 || syncStatus.needsSync > 0) && (
                <SyncButton
                  theme={theme}
                  onClick={handleSyncAllToCloud}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                >
                  ☁️ Sincronizar {syncStatus.localOnly + syncStatus.needsSync}
                </SyncButton>
              )}

              {sessions.length > 0 && (
                <ClearAllButton
                  theme={theme}
                  onClick={handleDeleteAllSessions}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                >
                  🧹 Eliminar todas
                </ClearAllButton>
              )}
            </ActionsRow>

            {/* 🆕 FASE 2: Filtros */}
            {sessions.length > 0 && (
              <SessionFilters
                onFiltersChange={handleFiltersChange}
                totalSessions={filteredSessions.length}
                theme={theme}
              />
            )}

            {/* Lista de sesiones */}
            {filteredSessions.length === 0 ? (
              <EmptyState theme={theme}>
                {sessions.length === 0 ? (
                  <>
                    <EmptyIcon>📭</EmptyIcon>
                    <EmptyText>No hay sesiones guardadas</EmptyText>
                    <EmptyHint>Carga un texto y trabaja con él para crear tu primera sesión</EmptyHint>
                  </>
                ) : (
                  <>
                    <EmptyIcon>🔍</EmptyIcon>
                    <EmptyText>No se encontraron sesiones</EmptyText>
                    <EmptyHint>Intenta ajustar los filtros de búsqueda</EmptyHint>
                  </>
                )}
              </EmptyState>
            ) : (
              <SessionsList>
                {filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    theme={theme}
                    onRestore={handleSessionClick}
                    onDelete={(sess) => handleDeleteSession(sess.id, { stopPropagation: () => {} })}
                    onExport={handleExportSession}
                  />
                ))}
              </SessionsList>
            )}
          </HistoryContent>
        )}
      </AnimatePresence>
    </HistoryContainer>
  );
};

const HistoryContainer = styled.div`
  margin-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
  padding-top: 1rem;
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.theme.background || '#F6F8FA'};
  }
`;

const HistoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const Icon = styled.span`
  font-size: 1.2rem;
`;

const SessionCount = styled.span`
  font-size: 0.85rem;
  font-weight: 400;
  color: ${props => props.theme.textMuted || '#607D8B'};
  margin-left: 0.25rem;
`;

const ExpandIcon = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted || '#607D8B'};
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s;
`;

const HistoryContent = styled(motion.div)`
  overflow: hidden;
  padding: 0.75rem 0;
`;

const NewSessionButton = styled(motion.button)`
  flex: 1;
  padding: 0.75rem;
  background: ${props => props.theme.primary || '#3190FC'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.theme.primary || '#3190FC'}dd;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SaveSessionButton = styled(motion.button)`
  flex: 1;
  padding: 0.75rem;
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const SyncButton = styled(motion.button)`
  flex: 1;
  padding: 0.65rem;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: linear-gradient(135deg, #2563EB, #1E40AF);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ClearAllButton = styled(motion.button)`
  flex: 1;
  padding: 0.65rem;
  background: ${props => props.theme.surface || '#FFFFFF'};
  color: ${props => props.theme.danger || '#C62828'};
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.border || '#E4EAF1'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 500px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.background || '#F6F8FA'};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border || '#E4EAF1'};
    border-radius: 3px;
    
    &:hover {
      background: ${props => props.theme.textMuted || '#607D8B'};
    }
  }
`;

// Componentes de sesión eliminados - ahora usamos SessionCard component

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${props => props.theme.textMuted || '#607D8B'};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: ${props => props.theme.text || '#232B33'};
`;

const EmptyHint = styled.div`
  font-size: 0.85rem;
`;

// 🔥 Nuevos componentes para sincronización Firebase

const LoadingSpinner = styled.span`
  font-size: 0.9rem;
  margin-left: 0.5rem;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SyncStatusBanner = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: ${props => props.theme.surfaceVariant || '#F6F8FA'};
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  font-size: 0.85rem;
  flex-wrap: wrap;
`;

const SyncStat = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: ${props => props.warning ? props.theme.warning || '#F59E0B' : props.theme.text};
  font-weight: ${props => props.warning ? '600' : '400'};
`;

const SyncIcon = styled.span`
  font-size: 1rem;
`;

const SyncLabel = styled.span`
  font-size: 0.8rem;
`;

// 🆕 Componentes de indicador de límite de sesiones

const LimitBanner = styled.div`
  padding: 0.875rem;
  background: ${props => props.$warning 
    ? (props.theme.warningLight || '#FEF3C7')
    : (props.theme.surfaceVariant || '#F6F8FA')
  };
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid ${props => props.$warning 
    ? (props.theme.warning || '#F59E0B')
    : (props.theme.border || '#E4EAF1')
  };
  transition: all 0.3s ease;
`;

const LimitInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const LimitIcon = styled.span`
  font-size: 1.2rem;
`;

const LimitText = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.text || '#232B33'};
  
  strong {
    font-weight: 600;
  }
`;

const LimitHint = styled.span`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted || '#607D8B'};
  margin-left: 0.25rem;
`;

const ProgressBar = styled.div`
  height: 6px;
  background: ${props => props.theme.border || '#E4EAF1'};
  border-radius: 3px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => props.$warning 
    ? (props.theme.warning || '#F59E0B')
    : (props.theme.primary || '#4A90E2')
  };
  transition: width 0.5s ease, background 0.3s ease;
  border-radius: 3px;
`;

const LimitWarning = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: ${props => props.theme.background || '#FFFFFF'};
  border-radius: 6px;
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted || '#607D8B'};
  line-height: 1.4;
`;

export default SessionsHistory;

