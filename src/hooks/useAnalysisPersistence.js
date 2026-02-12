// Hook ligero para persistir y rehidratar el estado del análisis en localStorage
// No depende de React state del llamador: sólo orquesta load/save a partir de callbacks parametrizables.
import { useEffect, useRef } from 'react';
import logger from '../utils/logger';

const DEBOUNCE_MS = 500;

/**
 * useAnalysisPersistence
 * @param {string|null} sessionKey - clave única por texto
 * @param {object} options
 *  - enabled: boolean para permitir guardado
 *  - toPersist: objeto con campos a guardar (se serializa tal cual)
 *  - onRehydrate: fn(data) llamada cuando hay datos guardados
 */
export default function useAnalysisPersistence(sessionKey, { enabled, toPersist, onRehydrate }) {
  const lastKeyRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Rehidratación cuando cambia la clave de sesión
  useEffect(() => {
    if (!sessionKey) return;
    if (lastKeyRef.current === sessionKey) return;
    lastKeyRef.current = sessionKey;
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (onRehydrate) onRehydrate(data);
      }
    } catch (e) {
      logger.warn('[useAnalysisPersistence] Error al leer:', e);
    }
  }, [sessionKey, onRehydrate]);

  // 🔧 H2 FIX: Guardado automático CON debounce para evitar escrituras excesivas
  useEffect(() => {
    if (!sessionKey || !enabled) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(sessionKey, JSON.stringify(toPersist ?? {}));
      } catch (e) {
        logger.warn('[useAnalysisPersistence] Error al guardar:', e);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [sessionKey, enabled, toPersist]);
}
