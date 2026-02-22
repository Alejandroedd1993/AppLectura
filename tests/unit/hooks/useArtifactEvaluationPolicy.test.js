import { renderHook } from '@testing-library/react';
import useArtifactEvaluationPolicy from '../../../src/hooks/useArtifactEvaluationPolicy';

jest.mock('../../../src/hooks/useRateLimit', () => jest.fn());

const useRateLimitMock = require('../../../src/hooks/useRateLimit');

describe('useArtifactEvaluationPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRateLimitMock.mockReturnValue({
      canProceed: true,
      nextAvailableIn: 0,
      attemptOperation: jest.fn(() => ({ allowed: true }))
    });
  });

  test('expone maxAttempts configurable y rateLimit', () => {
    const { result } = renderHook(() => useArtifactEvaluationPolicy({
      rateLimitKey: 'artifact_eval',
      maxAttempts: 5,
      cooldownMs: 3000,
      maxPerHour: 7
    }));

    expect(useRateLimitMock).toHaveBeenCalledWith('artifact_eval', {
      cooldownMs: 3000,
      maxPerHour: 7
    });
    expect(result.current.maxAttempts).toBe(5);
    expect(result.current.rateLimit.canProceed).toBe(true);
  });

  test('detecta límite de intentos alcanzado', () => {
    const { result } = renderHook(() => useArtifactEvaluationPolicy({
      rateLimitKey: 'artifact_eval',
      maxAttempts: 3
    }));

    expect(result.current.isAttemptLimitReached(2)).toBe(false);
    expect(result.current.isAttemptLimitReached(3)).toBe(true);
    expect(result.current.isAttemptLimitReached(10)).toBe(true);
  });

  test('canEvaluate respeta validez, loading, rate-limit y estado de entrega/historial', () => {
    const { result: canProceedTrue } = renderHook(() => useArtifactEvaluationPolicy({
      rateLimitKey: 'artifact_eval',
      maxAttempts: 3
    }));

    expect(canProceedTrue.current.canEvaluate({
      loading: false,
      isValid: true,
      attempts: 1,
      isSubmitted: false,
      viewingVersion: null
    })).toBe(true);

    expect(canProceedTrue.current.canEvaluate({
      loading: true,
      isValid: true,
      attempts: 1,
      isSubmitted: false,
      viewingVersion: null
    })).toBe(false);

    expect(canProceedTrue.current.canEvaluate({
      loading: false,
      isValid: false,
      attempts: 1,
      isSubmitted: false,
      viewingVersion: null
    })).toBe(false);

    expect(canProceedTrue.current.canEvaluate({
      loading: false,
      isValid: true,
      attempts: 3,
      isSubmitted: false,
      viewingVersion: null
    })).toBe(false);

    expect(canProceedTrue.current.canEvaluate({
      loading: false,
      isValid: true,
      attempts: 1,
      isSubmitted: true,
      viewingVersion: null
    })).toBe(false);

    expect(canProceedTrue.current.canEvaluate({
      loading: false,
      isValid: true,
      attempts: 1,
      isSubmitted: false,
      viewingVersion: { id: 'hist-1' }
    })).toBe(false);

    useRateLimitMock.mockReturnValue({ canProceed: false, nextAvailableIn: 3, attemptOperation: jest.fn() });
    const { result: canProceedFalse } = renderHook(() => useArtifactEvaluationPolicy({
      rateLimitKey: 'artifact_eval',
      maxAttempts: 3
    }));

    expect(canProceedFalse.current.canEvaluate({
      loading: false,
      isValid: true,
      attempts: 1,
      isSubmitted: false,
      viewingVersion: null
    })).toBe(false);
  });
});
