import { useEffect, useCallback, useRef } from 'react';
import { buildPromptFromAction } from '../utils/readerActionPrompts';

import logger from '../utils/logger';
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

  // Normaliza IDs de acción a la convención estándar del sistema (en inglés)
  // Soporta equivalentes en español que podrían venir de UIs legacy.
  const normalizeAction = useCallback((a) => {
    const id = (a || '').toString().trim().toLowerCase();
    if (!id) return '';
    const map = {
      'explicar': 'explain',
      'resumir': 'summarize',
      'preguntar': 'question',
      'profundizar': 'deep',
      'nota': 'notes',
      'notas': 'notes'
    };
    return map[id] || id;
  }, []);

  const handler = useCallback((e) => {
    const { action, text } = e.detail || {};
    if (!action || !text) return;
    const std = normalizeAction(action);
    
    // IGNORAR acción 'notes' - se maneja directamente en ReadingWorkspace
    if (std === 'notes') {
      logger.log('🔇 useReaderActions: Ignorando acción "notes" (manejada por ReadingWorkspace)');
      return;
    }
    
    // Construir prompt con la acción normalizada; puede ser null (p.ej., 'notes')
    const prompt = buildPromptFromAction(std, text);
    // Anti-duplicado: hash simple + debounce de 250ms
    const ts = Date.now();
    if (ts - lastTsRef.current < 250) return;
    const hash = std + '|' + (text.length > 80 ? text.slice(0, 80) : text);
    if (lastHashRef.current === hash) return;
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
