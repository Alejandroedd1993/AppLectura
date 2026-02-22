import { useCallback, useRef } from 'react';
import logger from '../utils/logger';

function toResetTimestamp(resetAt) {
  if (!resetAt) return 0;

  if (resetAt.seconds) {
    return Number(resetAt.seconds) * 1000;
  }

  if (typeof resetAt === 'string') {
    const parsed = new Date(resetAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof resetAt === 'number') {
    return resetAt > 1e12 ? resetAt : resetAt * 1000;
  }

  return 0;
}

export default function useTeacherArtifactReset({
  artifactLabel,
  lectureId,
  sourceCourseId,
  persistence,
  draftKeyBase,
  onApplyReset
} = {}) {
  const resetProcessedRef = useRef(null);

  return useCallback((cloudData) => {
    if (!lectureId || !cloudData) return false;

    const resetTimestamp = toResetTimestamp(cloudData?.resetAt);
    const wasResetByDocente = cloudData?.resetBy === 'docente' && resetTimestamp > 0;
    const isCurrentlySubmitted = cloudData?.submitted === true;
    const shouldApplyReset = wasResetByDocente && !isCurrentlySubmitted;

    if (!shouldApplyReset) return false;

    const resetKey = `${lectureId}_${resetTimestamp}`;
    if (resetProcessedRef.current === resetKey) {
      return true;
    }

    logger.log(`🔄 [${artifactLabel}] Detectado RESET por docente, limpiando estado local...`);
    logger.log(`🔄 [${artifactLabel}] resetTimestamp:`, resetTimestamp, 'isCurrentlySubmitted:', isCurrentlySubmitted);
    resetProcessedRef.current = resetKey;

    if (typeof onApplyReset === 'function') {
      onApplyReset();
    }

    import('../services/sessionManager').then(({ getDraftKey }) => {
      const key = getDraftKey(draftKeyBase, lectureId, sourceCourseId);
      sessionStorage.removeItem(key);
      logger.log(`🧹 [${artifactLabel}] Borrador sessionStorage limpiado tras reset`);
    }).catch(() => {});

    if (persistence?.clearResults) {
      persistence.clearResults();
    }

    try {
      const scopedPrefix = sourceCourseId
        ? `activity_results_${sourceCourseId}_`
        : 'activity_results_';
      const storageKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith(scopedPrefix) && key.includes(lectureId)
      );
      storageKeys.forEach((key) => {
        localStorage.removeItem(key);
        logger.log(`🧹 [${artifactLabel}] localStorage key limpiada:`, key);
      });
    } catch (error) {
      logger.warn(`Error limpiando localStorage (${artifactLabel}):`, error);
    }

    return true;
  }, [artifactLabel, draftKeyBase, lectureId, onApplyReset, persistence, sourceCourseId]);
}
