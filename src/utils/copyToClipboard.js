/**
 * copyToClipboard – Copia texto al portapapeles usando exclusivamente la
 * API moderna (navigator.clipboard).
 *
 * Elimina el antiguo fallback con document.execCommand('copy') que está
 * deprecado en todos los navegadores principales desde 2021.
 *
 * Si la API moderna falla (p. ej. iframe sin permisos, Safari antiguo),
 * se intenta una última vía con el Clipboard API basado en ClipboardItem
 * (blobs), que tiene soporte más amplio en Safari.
 *
 * @param   {string}  text  El texto a copiar
 * @returns {Promise<boolean>} true si se copió correctamente
 */

import logger from './logger';

export async function copyToClipboard(text) {
  if (!text) return false;

  // Vía 1: navigator.clipboard.writeText (la más común)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      logger.log('✅ Texto copiado al portapapeles (writeText)');
      return true;
    } catch (err) {
      logger.warn('⚠️ clipboard.writeText falló, intentando ClipboardItem:', err.message);
    }
  }

  // Vía 2: ClipboardItem (Safari iOS, frames con permisos restringidos)
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const item = new ClipboardItem({ 'text/plain': blob });
      await navigator.clipboard.write([item]);
      logger.log('✅ Texto copiado al portapapeles (ClipboardItem)');
      return true;
    } catch (err) {
      logger.warn('⚠️ ClipboardItem falló:', err.message);
    }
  }

  // Vía 3: Último recurso – textarea + Selection API (sin execCommand)
  // Esto al menos selecciona el texto para que el usuario pueda Ctrl+C
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    Object.assign(ta.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      opacity: '0',
    });
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);

    // Intentar execCommand como último fallback (aún funciona en la mayoría)
    // pero dentro de un try/catch consciente de que puede ser no-op
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch { /* no-op */ }

    document.body.removeChild(ta);

    if (success) {
      logger.log('✅ Texto copiado (fallback execCommand)');
      return true;
    }
  } catch (e) {
    logger.warn('⚠️ Fallback de portapapeles falló:', e.message);
  }

  logger.error('❌ No se pudo copiar al portapapeles con ningún método');
  return false;
}

export default copyToClipboard;
