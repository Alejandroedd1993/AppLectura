function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (status === 429 || status >= 500) return true;
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') return true;
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('socket hang up')
  );
}

export async function retryWithBackoff(operation, {
  retries = 2,
  initialDelayMs = 800,
  maxDelayMs = 8000,
  backoffMultiplier = 2,
  jitterRatio = 0.25,
  shouldRetry = defaultShouldRetry,
  onRetry,
} = {}) {
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt + 1)) {
        throw error;
      }

      const jitter = delayMs * jitterRatio * (Math.random() * 2 - 1);
      const waitMs = Math.max(0, Math.min(maxDelayMs, delayMs + jitter));

      if (typeof onRetry === 'function') {
        onRetry(error, {
          attempt: attempt + 1,
          maxAttempts: retries + 1,
          delayMs: waitMs,
        });
      }

      await sleep(waitMs);
      attempt += 1;
      delayMs = Math.min(maxDelayMs, delayMs * backoffMultiplier);
    }
  }
}

export function isRetryableServerError(error) {
  return defaultShouldRetry(error);
}