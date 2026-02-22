import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
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

import logger from '../../utils/logger';
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
    activitiesProgress, // 🆕 FASE 4: Para verificar artefactos ya entregados
    sourceCourseId // 🔧 FIX CROSS-COURSE: Para scope de borradores
  } = useContext(AppContext);

  const [sessions, setSessions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [_deletingId, setDeletingId] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [diagnosticEvents, setDiagnosticEvents] = useState([]);
  const lastBackgroundRefreshRef = useRef(0);

  // 🆕 FASE 2: Estado de filtros
  const [filters, setFilters] = useState({
    searchQuery: '',
    dateRange: 'all',
    hasAnalysis: 'all',
    hasProgress: 'all',
    sortBy: 'recent',
    syncStatus: 'all'
  });

  const loadSessions = useCallback(async ({ silent = false } = {}) => {
    // En actualizaciones de fondo, hacer throttle para evitar parpadeo continuo de UI
    if (silent) {
      const now = Date.now();
      if (now - lastBackgroundRefreshRef.current < 1200) {
        return;
      }
      lastBackgroundRefreshRef.current = now;
    }

    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

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

        logger.log('📊 [SessionsHistory] Sesiones cargadas:', {
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
      logger.error('❌ Error cargando sesiones:', error);
      // Fallback a sesiones locales
      const localSessions = getAllSessions();
      setSessions(localSessions);
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [currentUser]);

  // Cargar sesiones al montar y cuando cambie el estado
  useEffect(() => {
    loadSessions({ silent: false });

    // Escuchar eventos de actualización de sesiones (sin bloquear botones)
    const handleSessionUpdate = () => loadSessions({ silent: true });
    window.addEventListener('session-updated', handleSessionUpdate);

    return () => {
      window.removeEventListener('session-updated', handleSessionUpdate);
    };
  }, [loadSessions]);

  const pushDiagnosticEvent = useCallback((step, ok, detail = '') => {
    setDiagnosticEvents(prev => [
      {
        ts: Date.now(),
        step,
        ok,
        detail
      },
      ...prev
    ].slice(0, 12));
  }, []);

  const runSessionDiagnostics = useCallback(async () => {
    try {
      setLoading(true);

      const localSessions = getAllSessions();
      const pendingSyncs = getPendingSyncs();
      const currentSessionId = getCurrentSessionId();

      let mergedSessionsCount = null;
      if (currentUser) {
        try {
          const merged = await getAllSessionsMerged();
          mergedSessionsCount = merged.length;
        } catch (error) {
          mergedSessionsCount = null;
          pushDiagnosticEvent('fetch-merged', false, error?.message || 'Error obteniendo sesiones merged');
        }
      }

      const checks = [
        {
          key: 'restore-handler',
          label: 'RestoreSession disponible en contexto',
          ok: Boolean(restoreSession),
          value: Boolean(restoreSession)
        },
        {
          key: 'create-handler',
          label: 'CreateSession disponible en contexto',
          ok: Boolean(createSession),
          value: Boolean(createSession)
        },
        {
          key: 'local-sessions',
          label: 'Sesiones locales detectadas',
          ok: localSessions.length > 0,
          value: localSessions.length
        },
        {
          key: 'current-session-id',
          label: 'Sesión actual activa',
          ok: Boolean(currentSessionId),
          value: currentSessionId || 'ninguna'
        },
        {
          key: 'pending-syncs',
          label: 'Pendientes de sincronización',
          ok: pendingSyncs.length === 0,
          value: pendingSyncs.length
        },
        {
          key: 'merged-sessions',
          label: 'Sesiones merged (local + cloud)',
          ok: currentUser ? Number.isFinite(mergedSessionsCount) : true,
          value: currentUser ? (Number.isFinite(mergedSessionsCount) ? mergedSessionsCount : 'error') : 'sin usuario'
        }
      ];

      const okCount = checks.filter(c => c.ok).length;
      setDiagnosticReport({
        executedAt: Date.now(),
        okCount,
        total: checks.length,
        checks
      });

      pushDiagnosticEvent('run-diagnostics', okCount === checks.length, `${okCount}/${checks.length} checks OK`);
      setDiagnosticMode(true);
    } catch (error) {
      logger.error('❌ [SessionsHistory] Error ejecutando diagnóstico:', error);
      pushDiagnosticEvent('run-diagnostics', false, error?.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [createSession, currentUser, pushDiagnosticEvent, restoreSession]);

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

      pushDiagnosticEvent('sync-pending', result.failed === 0, `${result.synced} ok / ${result.failed} fallidas`);

      alert(`✅ Sincronización de pendientes completada:\n${result.synced} sesiones sincronizadas\n${result.failed} fallidas`);
      loadSessions({ silent: true });
    } catch (error) {
      logger.error('❌ Error sincronizando pendientes:', error);
      pushDiagnosticEvent('sync-pending', false, error?.message || 'Error en sync pendientes');
      alert('Error sincronizando pendientes. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadSessions, pushDiagnosticEvent]);

  const handleSessionClick = useCallback(async (session) => {
    logger.log('🖱️ [SessionsHistory] Click en sesión:', {
      id: session.id,
      timestamp: session.timestamp,
      hasText: !!session.text,
      restoreSessionAvailable: !!restoreSession
    });

    if (!restoreSession) {
      logger.error('❌ restoreSession no disponible en contexto');
      return;
    }

    // 🆕 Verificar si hay borradores sin evaluar (FASE 4: también considera activitiesProgress)
    const { hasDrafts } = checkUnsaveDrafts(currentTextoId, rubricProgress, activitiesProgress, sourceCourseId);
    if (hasDrafts) {
      const warningMessage = getWarningMessage(currentTextoId, rubricProgress, activitiesProgress, sourceCourseId);
      const confirmed = window.confirm(warningMessage);

      if (!confirmed) {
        logger.log('❌ [SessionsHistory] Cambio de sesión cancelado por el usuario');
        return;
      }
    }

    logger.log('📂 [SessionsHistory] Restaurando sesión:', session.id);
    const success = await restoreSession(session);
    logger.log('🔄 [SessionsHistory] Resultado restauración:', success ? '✅ Éxito' : '❌ Error');
    pushDiagnosticEvent('restore-session', success, session.id);

    if (success) {
      setIsExpanded(false);
      // Cambiar a lectura guiada
      setTimeout(() => {
        logger.log('🔀 [SessionsHistory] Cambiando a tab "lectura-guiada"');
        window.dispatchEvent(new CustomEvent('app-change-tab', {
          detail: { tabId: 'lectura-guiada' }
        }));
      }, 300);
    } else {
      logger.error('❌ [SessionsHistory] No se pudo restaurar la sesión');
    }
  }, [restoreSession, currentTextoId, rubricProgress, activitiesProgress, pushDiagnosticEvent]);

  const handleDeleteSession = useCallback(async (sessionId, e) => {
    e.stopPropagation();

    if (!window.confirm('¿Estás seguro de que quieres eliminar esta sesión? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(sessionId);

    const success = await deleteSession(sessionId);
    if (success) {
      loadSessions({ silent: true });
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
      loadSessions({ silent: true });
      window.dispatchEvent(new CustomEvent('session-updated'));
    }
  }, [sessions.length, loadSessions]);

  const handleCreateNewSession = useCallback(async () => {
    if (!texto || !createSession) {
      logger.warn('⚠️ No hay texto cargado para crear sesión');
      return;
    }

    const session = await createSession();
    if (session) {
      pushDiagnosticEvent('create-session', true, session.id);
      loadSessions({ silent: true });
      setIsExpanded(false);
    } else {
      pushDiagnosticEvent('create-session', false, 'createSession retornó null');
    }
  }, [texto, createSession, loadSessions, pushDiagnosticEvent]);

  // 🆕 NUEVA FUNCIÓN: Guardar cambios en sesión actual
  const handleSaveCurrentSession = useCallback(async () => {
    if (!texto) {
      logger.warn('⚠️ [SessionsHistory] No hay texto para guardar');
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
        loadSessions({ silent: true });
        pushDiagnosticEvent('save-session', true, result);
        alert('✅ Sesión guardada exitosamente');
      } else {
        pushDiagnosticEvent('save-session', false, 'updateCurrentSessionFromState retornó null');
        alert('❌ Error guardando sesión');
      }
    } else {
      logger.error('❌ updateCurrentSessionFromState no disponible');
      pushDiagnosticEvent('save-session', false, 'updateCurrentSessionFromState no disponible');
    }
  }, [texto, updateCurrentSessionFromState, loadSessions, pushDiagnosticEvent]);

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

      pushDiagnosticEvent('sync-all', result.errors === 0, `${result.synced} ok / ${result.errors} errores`);

      alert(`✅ Sincronización completada:\n${result.synced} sesiones sincronizadas\n${result.errors} errores`);

      loadSessions({ silent: true });
    } catch (error) {
      logger.error('❌ Error sincronizando:', error);
      pushDiagnosticEvent('sync-all', false, error?.message || 'Error sincronizando sesiones');
      alert('Error sincronizando sesiones. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadSessions, pushDiagnosticEvent]);

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

  const handleExportSession = useCallback(async (session) => {
    try {
      const { exportGenericPDF } = await import('../../utils/exportUtils');
      const sections = [];
      sections.push({
        heading: 'Información de la sesión', keyValues: {
          ID: session.id,
          Fecha: session.timestamp ? new Date(session.timestamp).toLocaleString('es-ES') : 'N/A',
          'Última actividad': session.lastActivity ? new Date(session.lastActivity).toLocaleString('es-ES') : 'N/A',
        }
      });
      if (session.text) {
        sections.push({
          heading: 'Texto', keyValues: {
            Título: session.text.title || session.text.fileName || 'Sin título',
            Tamaño: session.text.content ? `${session.text.content.length} caracteres` : 'N/A',
          }
        });
        if (session.text.content) {
          sections.push({ text: session.text.content.slice(0, 2000) + (session.text.content.length > 2000 ? '\n[...texto truncado...]' : '') });
        }
      }
      if (session.savedCitations && Object.keys(session.savedCitations).length > 0) {
        sections.push({ heading: 'Citas guardadas', list: Object.values(session.savedCitations).map(c => typeof c === 'string' ? c : c.text || JSON.stringify(c)) });
      }
      if (session.analysis) {
        sections.push({ heading: 'Análisis', keyValues: session.analysis });
      }
      await exportGenericPDF({
        title: `Sesión de Lectura - ${session.text?.title || session.id}`,
        sections,
        fileName: `sesion-${session.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      logger.log('✅ Sesión exportada como PDF:', session.id);
    } catch (error) {
      logger.error('❌ Error exportando sesión:', error);
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
          {(loading || isRefreshing) && <LoadingSpinner>⏳</LoadingSpinner>}
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

            <DiagnosticActionsRow>
              <SyncButton
                theme={theme}
                onClick={runSessionDiagnostics}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading}
              >
                🩺 Diagnóstico Smart Resume
              </SyncButton>

              {diagnosticMode && (
                <ClearAllButton
                  theme={theme}
                  onClick={() => setDiagnosticMode(false)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                >
                  Ocultar diagnóstico
                </ClearAllButton>
              )}
            </DiagnosticActionsRow>

            {diagnosticMode && (
              <DiagnosticPanel theme={theme}>
                <DiagnosticHeader>
                  <DiagnosticTitle theme={theme}>🩺 Diagnóstico Smart Resume</DiagnosticTitle>
                  <DiagnosticSubtitle theme={theme}>
                    {diagnosticReport
                      ? `Última ejecución: ${new Date(diagnosticReport.executedAt).toLocaleTimeString('es-ES')} · ${diagnosticReport.okCount}/${diagnosticReport.total} checks OK`
                      : 'Ejecuta el diagnóstico para revisar el flujo crear → guardar → restaurar'
                    }
                  </DiagnosticSubtitle>
                </DiagnosticHeader>

                {diagnosticReport?.checks?.length > 0 && (
                  <DiagnosticChecks>
                    {diagnosticReport.checks.map((check) => (
                      <DiagnosticCheck key={check.key} $ok={check.ok} theme={theme}>
                        <span>{check.ok ? '✅' : '❌'} {check.label}</span>
                        <strong>{String(check.value)}</strong>
                      </DiagnosticCheck>
                    ))}
                  </DiagnosticChecks>
                )}

                {diagnosticEvents.length > 0 && (
                  <DiagnosticEvents>
                    <DiagnosticEventsTitle theme={theme}>Eventos recientes</DiagnosticEventsTitle>
                    {diagnosticEvents.map((event, index) => (
                      <DiagnosticEventRow key={`${event.ts}-${event.step}-${index}`} $ok={event.ok} theme={theme}>
                        <span>{event.ok ? '✅' : '❌'} {event.step}</span>
                        <small>{new Date(event.ts).toLocaleTimeString('es-ES')} · {event.detail || 'sin detalle'}</small>
                      </DiagnosticEventRow>
                    ))}
                  </DiagnosticEvents>
                )}
              </DiagnosticPanel>
            )}

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
                    onDelete={(sess) => handleDeleteSession(sess.id, { stopPropagation: () => { } })}
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
  max-width: 100%;
  overflow-x: hidden;
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
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;

  > button {
    min-width: 0;
    flex: 1 1 calc(50% - 0.25rem);
  }

  @media (max-width: 420px) {
    > button {
      flex-basis: 100%;
    }
  }
`;

const DiagnosticActionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: -0.25rem 0 1rem;

  > button {
    min-width: 0;
    flex: 1 1 100%;
  }
`;

const SyncButton = styled(motion.button)`
  padding: 0.65rem;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  white-space: normal;
  word-break: break-word;
  
  &:hover {
    background: linear-gradient(135deg, #2563EB, #1E40AF);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ClearAllButton = styled(motion.button)`
  padding: 0.65rem;
  background: ${props => props.theme.surface || '#FFFFFF'};
  color: ${props => props.theme.danger || '#C62828'};
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: normal;
  word-break: break-word;

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

const DiagnosticPanel = styled.div`
  margin: 0.5rem 0 1rem;
  padding: 0.875rem;
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  background: ${props => props.theme.surface || '#FFFFFF'};
  border-radius: 8px;
  max-width: 100%;
  overflow: hidden;
`;

const DiagnosticHeader = styled.div`
  margin-bottom: 0.625rem;
`;

const DiagnosticTitle = styled.div`
  font-weight: 700;
  color: ${props => props.theme.text || '#232B33'};
`;

const DiagnosticSubtitle = styled.div`
  margin-top: 0.2rem;
  font-size: 0.82rem;
  color: ${props => props.theme.textMuted || '#607D8B'};
`;

const DiagnosticChecks = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.4rem;
  margin-bottom: 0.7rem;
`;

const DiagnosticCheck = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.45rem 0.55rem;
  border-radius: 6px;
  border: 1px solid ${props => props.$ok
    ? (props.theme.success || '#10B981')
    : (props.theme.error || '#EF4444')};
  background: ${props => props.$ok
    ? (props.theme.successLight || '#ECFDF5')
    : (props.theme.errorLight || '#FEF2F2')};
  color: ${props => props.theme.text || '#232B33'};
  font-size: 0.85rem;

  > span {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  > strong {
    max-width: 45%;
    text-align: right;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
`;

const DiagnosticEvents = styled.div`
  border-top: 1px dashed ${props => props.theme.border || '#E4EAF1'};
  padding-top: 0.6rem;
`;

const DiagnosticEventsTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${props => props.theme.textMuted || '#607D8B'};
  margin-bottom: 0.35rem;
`;

const DiagnosticEventRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  padding: 0.2rem 0;
  color: ${props => props.$ok
    ? (props.theme.success || '#10B981')
    : (props.theme.error || '#EF4444')};
`;

export default SessionsHistory;

