// Utilidades compartidas: IDs robustos, hash de texto y fetch con timeout/abort

export const genId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

export const hashText = (str) => {
  const s = (str || '').toString();
  let h = 0x811c9dc5; // FNV-1a 32-bit
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
};

export const fetchWithTimeout = (resource, options = {}, timeoutMs = 45000) => {
  const { signal: extSignal, ...rest } = options || {};
  const controller = new AbortController();

  const onAbort = () => {
    try { controller.abort(); } catch {}
  };
  if (extSignal) {
    if (extSignal.aborted) onAbort();
    else extSignal.addEventListener('abort', onAbort, { once: true });
  }

  const timer = setTimeout(() => {
    try { controller.abort(); } catch {}
  }, timeoutMs);

  const fetchPromise = fetch(resource, { ...rest, signal: controller.signal });
  const abortPromise = new Promise((_, reject) => {
    const handler = () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      reject(err);
    };
    controller.signal.addEventListener('abort', handler, { once: true });
  });

  return Promise.race([fetchPromise, abortPromise])
    .finally(() => {
      clearTimeout(timer);
      if (extSignal) extSignal.removeEventListener('abort', onAbort);
    });
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableNetworkError = (error) => {
  if (!error) return false;

  if (error.name === 'AbortError') {
    return false;
  }

  const message = String(error.message || '').trim();
  return (
    error.name === 'TypeError' ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED')
  );
};

export const retryAsync = async (
  operation,
  {
    retries = 0,
    initialDelayMs = 1000,
    backoffMultiplier = 1.5,
    getDelayMs,
    shouldRetry = isRetryableNetworkError,
    onRetry
  } = {}
) => {
  let delayMs = initialDelayMs;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt + 1)) {
        throw error;
      }

      const currentDelayMs = typeof getDelayMs === 'function'
        ? getDelayMs(attempt + 1, delayMs)
        : delayMs;

      if (typeof onRetry === 'function') {
        onRetry(error, {
          attempt: attempt + 1,
          maxAttempts: retries + 1,
          delayMs: currentDelayMs
        });
      }

      await sleep(currentDelayMs);
      delayMs = typeof getDelayMs === 'function'
        ? currentDelayMs
        : currentDelayMs * backoffMultiplier;
    }
  }

  return operation();
};

export const fetchWithRetry = (resource, options = {}, retryOptions = {}) => {
  return retryAsync(() => fetch(resource, options), retryOptions);
};
