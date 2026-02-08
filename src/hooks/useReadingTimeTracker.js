/**
 * useReadingTimeTracker - Hook para medir el tiempo real de lectura.
 *
 * Funcionalidades:
 *  - Cuenta segundos activos (pausa si la pestaña está oculta o el usuario está inactivo)
 *  - Guarda el delta acumulado cada SAVE_INTERVAL_MS y al desmontar
 *  - Utiliza Firestore increment() para acumular atómicamente
 *
 * Uso:
 *   useReadingTimeTracker({ textoId, userId, isActive })
 */
import { useEffect, useRef, useCallback } from 'react';
import { updateReadingTime } from '../firebase/firestore';

const SAVE_INTERVAL_MS = 30_000;   // Guardar cada 30 s
const IDLE_TIMEOUT_MS  = 120_000;  // Inactivo tras 2 min sin interacción
const TICK_MS          = 1_000;    // Resolución del cronómetro

export function useReadingTimeTracker({ textoId, userId, isActive = true }) {
  // Segundos acumulados desde el último flush
  const elapsedRef     = useRef(0);
  const lastTickRef    = useRef(Date.now());
  const isIdleRef      = useRef(false);
  const idleTimerRef   = useRef(null);
  const tickRef        = useRef(null);
  const saveRef        = useRef(null);
  const isActiveRef    = useRef(isActive);
  const textoIdRef     = useRef(textoId);
  const userIdRef      = useRef(userId);

  // Mantener refs actualizadas sin regenerar callbacks
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { textoIdRef.current  = textoId;  }, [textoId]);
  useEffect(() => { userIdRef.current   = userId;   }, [userId]);

  // ---- Flush: envía delta a Firestore ----
  const flushTime = useCallback(() => {
    const secs = elapsedRef.current;
    if (secs <= 0) return;

    const tid = textoIdRef.current;
    const uid = userIdRef.current;
    if (!tid || !uid) return;

    const minutes = Number((secs / 60).toFixed(2));
    elapsedRef.current = 0;

    // Fire-and-forget (no bloquear la UI)
    updateReadingTime(uid, tid, minutes).catch((err) =>
      console.warn('⏱️ [ReadingTime] Error guardando tiempo:', err)
    );
  }, []);

  // ---- Reset del temporizador de inactividad ----
  const resetIdle = useCallback(() => {
    if (isIdleRef.current) {
      isIdleRef.current = false;
      lastTickRef.current = Date.now(); // no contar el tiempo idle
    }
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
    }, IDLE_TIMEOUT_MS);
  }, []);

  // ---- Ciclo principal ----
  useEffect(() => {
    if (!textoId || !userId || !isActive) return;

    lastTickRef.current = Date.now();
    elapsedRef.current  = 0;

    // Tick cada segundo
    const tick = () => {
      const now = Date.now();
      if (isActiveRef.current && !isIdleRef.current && !document.hidden) {
        const delta = (now - lastTickRef.current) / 1000;
        // Sanity: máximo 5 s por tick (cubre delays de JS por throttle)
        if (delta > 0 && delta < 5) {
          elapsedRef.current += delta;
        }
      }
      lastTickRef.current = now;
    };

    tickRef.current = setInterval(tick, TICK_MS);
    saveRef.current = setInterval(flushTime, SAVE_INTERVAL_MS);

    // Visibilidad
    const onVisibility = () => {
      if (document.hidden) {
        flushTime();
      } else {
        lastTickRef.current = Date.now();
      }
    };

    // Eventos de actividad
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(e =>
      document.addEventListener(e, resetIdle, { passive: true })
    );
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', flushTime);

    resetIdle();

    return () => {
      flushTime(); // guardar al desmontar / cambio de texto
      clearInterval(tickRef.current);
      clearInterval(saveRef.current);
      clearTimeout(idleTimerRef.current);
      activityEvents.forEach(e => document.removeEventListener(e, resetIdle));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', flushTime);
    };
  }, [textoId, userId, isActive, flushTime, resetIdle]);

  return { flush: flushTime, getElapsedSeconds: () => elapsedRef.current };
}

export default useReadingTimeTracker;
