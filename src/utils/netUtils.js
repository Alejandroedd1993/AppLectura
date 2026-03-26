// Utilidades compartidas: IDs robustos, hash de texto y fetch con timeout/abort

import { hashStringFnv1a } from './hash';

export const genId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

export const hashText = (str) => {
  return hashStringFnv1a(str, { radix: 16, padLength: 8, emptyValue: '00000000' });
};

export const createAbortControllerWithTimeout = ({
  timeoutMs,
  signal: extSignal,
  onTimeout
} = {}) => {
  const controller = new AbortController();

  const abort = () => {
    try { controller.abort(); } catch {}
  };

  const onExternalAbort = () => {
    abort();
  };

  if (extSignal) {
    if (extSignal.aborted) abort();
    else extSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timeoutId = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => {
        if (typeof onTimeout === 'function') {
          onTimeout();
        }
        abort();
      }, timeoutMs)
    : null;

  const cleanup = () => {
    if (timeoutId != null) clearTimeout(timeoutId);
    if (extSignal) extSignal.removeEventListener('abort', onExternalAbort);
  };

  return {
    controller,
    signal: controller.signal,
    abort,
    cleanup
  };
};

export const replaceAbortController = (controllerRef) => {
  if (!controllerRef || typeof controllerRef !== 'object') {
    return new AbortController();
  }

  try {
    controllerRef.current?.abort?.();
  } catch {}

  const controller = new AbortController();
  controllerRef.current = controller;
  return controller;
};

export const fetchWithTimeout = (resource, options = {}, timeoutMs = 45000) => {
  const { signal: extSignal, ...rest } = options || {};
  const abortControl = createAbortControllerWithTimeout({
    timeoutMs,
    signal: extSignal
  });

  const fetchPromise = fetch(resource, { ...rest, signal: abortControl.signal });
  const abortPromise = new Promise((_, reject) => {
    const handler = () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      reject(err);
    };
    abortControl.signal.addEventListener('abort', handler, { once: true });
  });

  return Promise.race([fetchPromise, abortPromise])
    .finally(() => {
      abortControl.cleanup();
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
