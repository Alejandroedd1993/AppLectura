import { useEffect, useCallback, useRef } from 'react';
import { buildPromptFromAction } from '../utils/readerActionPrompts';

import logger from '../utils/logger';

// Q2 FIX: Función pura de mapeo extraída a nivel de módulo (antes era useCallback innecesario).
// Normaliza IDs de acción a la convención estándar del sistema (en inglés).
// Soporta equivalentes en español que podrían venir de UIs legacy.
const ACTION_MAP = {
  'explicar': 'explain',
  'resumir': 'summarize',
  'preguntar': 'question',
  'profundizar': 'deep',
  'nota': 'notes',
  'notas': 'notes'
};

function normalizeAction(a) {
  const id = (a || '').toString().trim().toLowerCase();
  if (!id) return '';
  return ACTION_MAP[id] || id;
}

/**
 * Hook transversal que escucha eventos 'reader-action' emitidos por el visor de Solo Lectura
 * y notifica a un consumidor (TutorCore) con un prompt generado.
 *
 * Contrato:
 *   useReaderActions({ onPrompt })
 *     - onPrompt: (payload: { action, fragment, prompt, ts }) => void
 */
export default function useReaderActions({ onPrompt }) {
  const onPromptRef = useRef(onPrompt);
  onPromptRef.current = onPrompt;
  const lastHashRef = useRef(null);
  const lastTsRef = useRef(0);

  const handler = useCallback((e) => {
    const { action, text } = e.detail || {};
    // R8 HARDENING: ignorar payloads malformados (text no-string)
    if (!action || typeof text !== 'string' || !text.trim()) return;
    const std = normalizeAction(action);
    
    // IGNORAR acción 'notes' - se maneja directamente en ReadingWorkspace
    if (std === 'notes') {
      logger.log('🔇 useReaderActions: Ignorando acción "notes" (manejada por ReadingWorkspace)');
      return;
    }
    
    // Construir prompt con la acción normalizada; puede ser null (p.ej., 'notes')
    const prompt = buildPromptFromAction(std, text);
    // Anti-duplicado: debounce 250ms + hash con ventana temporal de 3s
    // H3 FIX: Antes el hash bloqueaba indefinidamente la misma acción+fragmento.
    // Ahora el bloqueo expira tras 3s para permitir reintentos legítimos.
    const ts = Date.now();
    if (ts - lastTsRef.current < 250) return;
    const hash = std + '|' + (text.length > 80 ? text.slice(0, 80) : text);
    const HASH_TTL_MS = 3000;
    if (lastHashRef.current === hash && (ts - lastTsRef.current < HASH_TTL_MS)) return;
    lastHashRef.current = hash;
    lastTsRef.current = ts;
    // Siempre notificar la acción normalizada + fragmento; prompt será útil para flujos que prefieren sendPrompt
    onPromptRef.current?.({ action: std, fragment: text, prompt, ts });
  }, []);

  useEffect(() => {
    window.addEventListener('reader-action', handler);
    return () => window.removeEventListener('reader-action', handler);
  }, [handler]);
}
