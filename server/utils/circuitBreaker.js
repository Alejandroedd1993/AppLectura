const sharedBreakers = new Map();

function defaultShouldTrip(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (status === 429 || status >= 500) return true;
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') return true;

  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('socket hang up') ||
    message.includes('service unavailable')
  );
}

export class CircuitBreakerOpenError extends Error {
  constructor(name, retryAfterMs) {
    super(`Circuit breaker abierto para ${name}`);
    this.name = 'CircuitBreakerOpenError';
    this.code = 'CIRCUIT_BREAKER_OPEN';
    this.status = 503;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  constructor(name, {
    failureThreshold = 5,
    resetTimeoutMs = 30000,
    shouldTrip = defaultShouldTrip,
  } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.shouldTrip = shouldTrip;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.openedAt = 0;
    this.halfOpenInFlight = false;
  }

  getState() {
    if (this.state === 'OPEN' && (Date.now() - this.openedAt) >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.openedAt = 0;
    this.halfOpenInFlight = false;
  }

  open() {
    this.state = 'OPEN';
    this.openedAt = Date.now();
    this.halfOpenInFlight = false;
  }

  async execute(operation) {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      const retryAfterMs = Math.max(0, this.resetTimeoutMs - (Date.now() - this.openedAt));
      throw new CircuitBreakerOpenError(this.name, retryAfterMs);
    }

    if (currentState === 'HALF_OPEN') {
      if (this.halfOpenInFlight) {
        throw new CircuitBreakerOpenError(this.name, this.resetTimeoutMs);
      }
      this.halfOpenInFlight = true;
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      if (currentState === 'HALF_OPEN') {
        this.open();
        throw error;
      }

      if (this.shouldTrip(error)) {
        this.failureCount += 1;
        if (this.failureCount >= this.failureThreshold) {
          this.open();
        }
      } else {
        this.reset();
      }

      throw error;
    } finally {
      if (currentState === 'HALF_OPEN') {
        this.halfOpenInFlight = false;
      }
    }
  }
}

export function getSharedCircuitBreaker(name, options = {}) {
  if (!sharedBreakers.has(name)) {
    sharedBreakers.set(name, new CircuitBreaker(name, options));
  }
  return sharedBreakers.get(name);
}

export function resetSharedCircuitBreakers() {
  sharedBreakers.clear();
}