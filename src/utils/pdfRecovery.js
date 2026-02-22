import logger from './logger';

function createAbortError() {
  try {
    return new DOMException('Operación abortada', 'AbortError');
  } catch {
    const err = new Error('Operación abortada');
    err.name = 'AbortError';
    return err;
  }
}

function extractStoragePath(fileURL) {
  try {
    const urlObj = new URL(fileURL);
    const pathSegment = urlObj.pathname.split('/o/')[1];
    if (!pathSegment) return null;
    return decodeURIComponent(pathSegment);
  } catch {
    return null;
  }
}

/**
 * Recupera un PDF desde una fileURL de Firebase con cascada de fallbacks.
 * Prioridad: Firebase SDK getBlob -> fetch directo CORS -> proxy backend.
 *
 * @param {string} fileURL
 * @param {object} options
 * @param {string} [options.backendBaseUrl]
 * @param {AbortSignal} [options.signal]
 * @param {object} [options.logger]
 * @param {string} [options.prefix]
 * @returns {Promise<{ blob: Blob, method: 'sdk' | 'direct' | 'proxy' } | null>}
 */
export async function recoverPdfBlobWithFallback(fileURL, options = {}) {
  const {
    backendBaseUrl = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, ''),
    signal,
    logger: customLogger = logger,
    prefix = '[PDFRecovery]'
  } = options;

  if (!fileURL || typeof fileURL !== 'string') return null;

  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw createAbortError();
    }
  };

  throwIfAborted();

  try {
    const storagePath = extractStoragePath(fileURL);
    if (storagePath) {
      const { ref: storageRef, getBlob: firebaseGetBlob } = await import('firebase/storage');
      const { storage: storageInstance } = await import('../firebase/config');
      const fileRef = storageRef(storageInstance, storagePath);
      const blob = await firebaseGetBlob(fileRef);
      throwIfAborted();
      if (blob && blob.size > 500) {
        customLogger.log(`✅ ${prefix} PDF recuperado vía Firebase SDK (${blob.size} bytes)`);
        return { blob, method: 'sdk' };
      }
    }
  } catch (sdkErr) {
    customLogger.warn(`⚠️ ${prefix} Firebase SDK getBlob falló:`, sdkErr?.message || sdkErr);
  }

  try {
    throwIfAborted();
    const directRes = await fetch(fileURL, { mode: 'cors', signal });
    if (directRes.ok) {
      const blob = await directRes.blob();
      throwIfAborted();
      if (blob && blob.size > 500) {
        customLogger.log(`✅ ${prefix} PDF recuperado vía fetch directo (${blob.size} bytes)`);
        return { blob, method: 'direct' };
      }
    }
  } catch (directErr) {
    if (directErr?.name === 'AbortError') throw directErr;
    customLogger.warn(`⚠️ ${prefix} Fetch directo falló:`, directErr?.message || directErr);
  }

  try {
    throwIfAborted();
    const proxyUrl = `${backendBaseUrl}/api/storage/proxy?url=${encodeURIComponent(fileURL)}`;
    const proxyRes = await fetch(proxyUrl, { signal });
    if (proxyRes.ok) {
      const blob = await proxyRes.blob();
      throwIfAborted();
      if (blob && blob.size > 500) {
        customLogger.log(`✅ ${prefix} PDF recuperado vía proxy backend (${blob.size} bytes)`);
        return { blob, method: 'proxy' };
      }
    }
  } catch (proxyErr) {
    if (proxyErr?.name === 'AbortError') throw proxyErr;
    customLogger.warn(`⚠️ ${prefix} Proxy backend falló:`, proxyErr?.message || proxyErr);
  }

  return null;
}
