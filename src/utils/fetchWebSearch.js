import { auth } from '../firebase/config';
import { getBackendBaseUrl } from './backendConfig';
import { WEB_SEARCH_TIMEOUT_MS } from '../constants/timeoutConstants';
import { createAbortControllerWithTimeout } from './netUtils';
import logger from './logger';

/**
 * Shared utility for web search via backend /api/web-search.
 * Used by TutorCore for inline enrichment.
 *
 * @param {string} query - Search query
 * @param {Object} [opts]
 * @param {number} [opts.maxResults=3]
 * @param {number} [opts.timeoutMs=WEB_SEARCH_TIMEOUT_MS]
 * @param {AbortSignal} [opts.signal] - External abort signal (e.g., component unmount)
 * @param {string} [opts.backendUrl]
 * @returns {Promise<Array|null>} Array of results or null on error/timeout
 */
export async function fetchWebSearch(query, opts = {}) {
  const { maxResults = 3, timeoutMs = WEB_SEARCH_TIMEOUT_MS, signal, backendUrl } = opts;
  const backendBase = (backendUrl || getBackendBaseUrl()).replace(/\/+$/, '');

  // Firebase auth header
  let authHeader = {};
  try {
    const idToken = await auth?.currentUser?.getIdToken?.();
    if (idToken) authHeader = { Authorization: `Bearer ${idToken}` };
  } catch (e) {
    logger.warn('[fetchWebSearch] No se pudo obtener Firebase ID token:', e?.message);
  }

  const abortControl = createAbortControllerWithTimeout({ timeoutMs, signal });

  if (signal?.aborted) {
    abortControl.cleanup();
    return null;
  }

  try {
    const response = await fetch(`${backendBase}/api/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ query: query.trim(), maxResults }),
      signal: abortControl.signal
    });

    if (!response.ok) {
      logger.warn(`[fetchWebSearch] HTTP ${response.status}`);
      return null;
    }

    const raw = await response.json();
    // Unwrap success envelope {ok, data} if present, otherwise use legacy format
    const data = raw?.ok === true && 'data' in raw ? raw.data : raw;
    return data.resultados || [];
  } catch (e) {
    if (e.name === 'AbortError') {
      logger.warn('[fetchWebSearch] Abortado (timeout o señal externa)');
    } else {
      logger.warn('[fetchWebSearch] Error:', e.message);
    }
    return null;
  } finally {
    abortControl.cleanup();
  }
}
