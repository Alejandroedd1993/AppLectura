import { auth } from '../firebase/config';
import { BACKEND_URL } from '../context/AppContext';
import logger from './logger';

/**
 * Shared utility for web search via backend /api/web-search.
 * Used by both TutorCore (inline enrichment) and useWebSearchTutor hook.
 *
 * @param {string} query - Search query
 * @param {Object} [opts]
 * @param {number} [opts.maxResults=3]
 * @param {number} [opts.timeoutMs=6000]
 * @param {AbortSignal} [opts.signal] - External abort signal (e.g., component unmount)
 * @param {string} [opts.backendUrl]
 * @returns {Promise<Array|null>} Array of results or null on error/timeout
 */
export async function fetchWebSearch(query, opts = {}) {
  const { maxResults = 3, timeoutMs = 6000, signal, backendUrl } = opts;
  const backendBase = (backendUrl || BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '');

  // Firebase auth header
  let authHeader = {};
  try {
    const idToken = await auth?.currentUser?.getIdToken?.();
    if (idToken) authHeader = { Authorization: `Bearer ${idToken}` };
  } catch (e) {
    logger.warn('[fetchWebSearch] No se pudo obtener Firebase ID token:', e?.message);
  }

  // Internal controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If external signal aborts, also abort the internal controller
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) { clearTimeout(timeoutId); return null; }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(`${backendBase}/api/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ query: query.trim(), maxResults }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`[fetchWebSearch] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.resultados || [];
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      logger.warn('[fetchWebSearch] Abortado (timeout o señal externa)');
    } else {
      logger.warn('[fetchWebSearch] Error:', e.message);
    }
    return null;
  } finally {
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

export default fetchWebSearch;
