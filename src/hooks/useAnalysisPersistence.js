// Hook ligero para persistir y rehidratar el estado del análisis en localStorage
// No depende de React state del llamador: sólo orquesta load/save a partir de callbacks parametrizables.
import { useEffect, useRef } from 'react';

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
      console.warn('[useAnalysisPersistence] Error al leer:', e);
    }
  }, [sessionKey, onRehydrate]);

  // Guardado automático cuando cambian los datos y está habilitado
  useEffect(() => {
    if (!sessionKey || !enabled) return;
    try {
      localStorage.setItem(sessionKey, JSON.stringify(toPersist ?? {}));
    } catch (e) {
      console.warn('[useAnalysisPersistence] Error al guardar:', e);
    }
  }, [sessionKey, enabled, toPersist]);
}
