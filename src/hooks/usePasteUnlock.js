/**
 * usePasteUnlock — Hook para desbloquear pegado ilimitado en artefactos (modo QA/testing).
 *
 * Escucha Ctrl+Alt+U a nivel global. Cada vez que se presiona, alterna
 * entre pegado bloqueado (por defecto) y pegado sin límite.
 *
 * El estado se almacena en window.__PASTE_UNLOCKED para que sea compartido
 * entre todos los componentes sin necesidad de Context o props.
 *
 * Uso:
 *   const pasteUnlocked = usePasteUnlock();
 *   // En handlePaste:  if (pasteUnlocked) { permitir todo } else { aplicar restricción }
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = '__PASTE_UNLOCKED';

function getGlobalFlag() {
  return window[STORAGE_KEY] === true;
}

export default function usePasteUnlock() {
  const [unlocked, setUnlocked] = useState(getGlobalFlag);

  useEffect(() => {
    const handler = (e) => {
      // Ctrl+Alt+U  (Windows/Linux) — Cmd+Alt+U (Mac)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'u') {
        e.preventDefault();
        const next = !getGlobalFlag();
        window[STORAGE_KEY] = next;
        setUnlocked(next);

        // Notificar a otros componentes montados
        window.dispatchEvent(new CustomEvent('paste-unlock-toggle', { detail: { unlocked: next } }));

        // Feedback visual discreto (solo en consola)
        // eslint-disable-next-line no-console
        console.log(
          `%c🔑 Pegado ${next ? 'DESBLOQUEADO ✅' : 'BLOQUEADO 🔒'}`,
          `font-size:14px;font-weight:bold;color:${next ? '#10b981' : '#ef4444'}`
        );
      }
    };

    // Escuchar cambios desde otros componentes
    const syncHandler = (e) => setUnlocked(e.detail.unlocked);

    window.addEventListener('keydown', handler);
    window.addEventListener('paste-unlock-toggle', syncHandler);

    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('paste-unlock-toggle', syncHandler);
    };
  }, []);

  return unlocked;
}
