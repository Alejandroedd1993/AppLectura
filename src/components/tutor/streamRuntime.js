export function clearTimeoutRef(timeoutIdRef) {
  clearTimeout(timeoutIdRef?.current);
  if (timeoutIdRef) {
    timeoutIdRef.current = null;
  }
}

export function scheduleAbortTimeout(timeoutIdRef, controller, timeoutMs) {
  clearTimeoutRef(timeoutIdRef);
  const timeoutId = setTimeout(() => {
    controller?.abort();
  }, timeoutMs);

  if (timeoutIdRef) {
    timeoutIdRef.current = timeoutId;
  }

  return timeoutId;
}

export function resetStreamPersistWindow(lastStreamPersistRef) {
  if (lastStreamPersistRef) {
    lastStreamPersistRef.current = 0;
  }
}

export function shouldNotifyStreamUpdate({ notify = false, now, lastPersistAt, intervalMs = 3000 }) {
  if (notify) return true;
  return (now - lastPersistAt) >= intervalMs;
}