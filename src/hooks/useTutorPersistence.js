import { useMemo, useCallback } from 'react';

/**
 * Hook de persistencia ligera para TutorCore.
 * Serializa mensajes en formato compacto [{r,c}] evitando IDs internos.
 * Uso:
 *   const { initialMessages, handleMessagesChange } = useTutorPersistence();
 *   <TutorCore initialMessages={initialMessages} onMessagesChange={handleMessagesChange}>...
 */
export default function useTutorPersistence(options = {}) {
  const { storageKey = 'tutorHistorial', max = 40 } = options;

  const initialMessages = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map(o => ({ role: o.r, content: o.c })).filter(m => m.content);
    } catch { return []; }
  }, [storageKey]);

  const handleMessagesChange = useCallback((msgs) => {
    try {
      const compact = msgs.map(m => ({ r: m.role, c: m.content })).slice(-max);
      localStorage.setItem(storageKey, JSON.stringify(compact));
    } catch { /* noop */ }
  }, [storageKey, max]);

  return { initialMessages, handleMessagesChange };
}
