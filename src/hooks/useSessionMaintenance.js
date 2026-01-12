import { useState, useEffect } from 'react';
import {
    createActiveSession,
    closeActiveSession,
    listenToSessionConflicts,
    startSessionHeartbeat,
    getSessionInfo
} from '../firebase/sessionManager';

/**
 * Hook para gestionar el mantenimiento de la sesión activa:
 * - Creación de sesión única
 * - Heartbeat
 * - Detección de conflictos (otra sesión: otra pestaña/navegador)
 * - Limpieza de flags
 */
export const useSessionMaintenance = (currentUser, userData) => {
    const [sessionConflict, setSessionConflict] = useState(false);
    const [conflictingSessionInfo, setConflictingSessionInfo] = useState(null);

    // 1. Gestión de Sesión Activa (Heartbeat + Conflictos)
    useEffect(() => {
        if (!currentUser?.uid || !userData?.role) {
            return;
        }

        let unsubscribeSession = null;
        let stopHeartbeat = null;

        const initializeSession = async () => {
            try {
                // Crear sesión activa (cierra automáticamente sesiones previas)
                await createActiveSession(currentUser.uid, {
                    role: userData.role,
                    email: currentUser.email,
                    sessionInfo: getSessionInfo()
                });

                // Iniciar heartbeat para mantener sesión viva
                stopHeartbeat = startSessionHeartbeat(currentUser.uid);

                // Escuchar conflictos de sesión (otra sesión toma control)
                unsubscribeSession = listenToSessionConflicts(currentUser.uid, (conflictData) => {
                    // Diferir setState para evitar warning de React
                    setTimeout(() => {
                        setSessionConflict(true);
                        setConflictingSessionInfo({
                            browser: conflictData.browser,
                            createdAt: conflictData.createdAt?.toDate?.() || new Date(conflictData.createdAt)
                        });
                    }, 0);
                });

            } catch (error) {
                console.error('❌ [Session] Error inicializando sesión:', error);
            }
        };

        initializeSession();

        // Cleanup al desmontar o cambiar usuario
        return () => {
            if (stopHeartbeat) {
                stopHeartbeat();
            }

            if (unsubscribeSession) {
                unsubscribeSession();
            }

            // Cerrar sesión activa al desmontar
            if (currentUser?.uid) {
                closeActiveSession(currentUser.uid)
                    .catch(err => console.warn('⚠️ [Session] Error cerrando sesión:', err));
            }
        };
    }, [currentUser, userData]);

    // 2. Limpieza de flags de restauración (Stuck Flag Cleanup)
    useEffect(() => {
        const checkStuckFlag = () => {
            const flag = localStorage.getItem('__restoring_session__');
            if (flag) {
                const timestamp = parseInt(flag, 10);
                const now = Date.now();
                if (now - timestamp > 30000) { // 30 segundos
                    console.warn('⚠️ [Session] Flag __restoring_session__ stuck, limpiando...');
                    localStorage.removeItem('__restoring_session__');
                }
            }
        };

        // Verificar al montar y cada 10 segundos
        checkStuckFlag();

        let interval;
        if (process.env.NODE_ENV !== 'test') {
            interval = setInterval(checkStuckFlag, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    return {
        sessionConflict,
        conflictingSessionInfo
    };
};
