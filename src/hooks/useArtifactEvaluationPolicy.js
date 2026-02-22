import { useCallback } from 'react';
import useRateLimit from './useRateLimit';

export default function useArtifactEvaluationPolicy({
  rateLimitKey,
  cooldownMs = 5000,
  maxPerHour = 10,
  maxAttempts = 3
} = {}) {
  const rateLimit = useRateLimit(rateLimitKey, {
    cooldownMs,
    maxPerHour
  });

  const isAttemptLimitReached = useCallback(
    (attempts) => Number(attempts || 0) >= maxAttempts,
    [maxAttempts]
  );

  const canEvaluate = useCallback(({
    loading = false,
    isValid = true,
    attempts = 0,
    isSubmitted = false,
    viewingVersion = null
  } = {}) => {
    return Boolean(isValid) &&
      !loading &&
      rateLimit.canProceed &&
      !isAttemptLimitReached(attempts) &&
      !isSubmitted &&
      !viewingVersion;
  }, [rateLimit.canProceed, isAttemptLimitReached]);

  return {
    rateLimit,
    maxAttempts,
    isAttemptLimitReached,
    canEvaluate
  };
}
