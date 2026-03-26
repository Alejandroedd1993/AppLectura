function getRewardsTimestamp(state = {}) {
  return Number(state?.lastInteraction || state?.lastUpdate || 0) || 0;
}

function getRewardsPoints(state = {}) {
  return Number(state?.totalPoints || 0) || 0;
}

function getRewardsResetAt(state = {}) {
  return Number(state?.resetAt || 0) || 0;
}

function isRecentLocalReset(localState, remoteState, now, recentResetWindowMs) {
  const localResetAt = getRewardsResetAt(localState);
  const remoteResetAt = getRewardsResetAt(remoteState);
  return localResetAt > 0 && localResetAt > remoteResetAt && (now - localResetAt) < recentResetWindowMs;
}

function isLocalStateEmpty(localState, remoteState) {
  const localResetAt = getRewardsResetAt(localState);
  const localPoints = getRewardsPoints(localState);
  const remotePoints = getRewardsPoints(remoteState);
  return localResetAt === 0 || (localPoints === 0 && remotePoints > 0);
}

function hasSameResetEpochWithMoreLocalProgress(localState, remoteState) {
  const localResetAt = getRewardsResetAt(localState);
  const remoteResetAt = getRewardsResetAt(remoteState);
  const localPoints = getRewardsPoints(localState);
  const remotePoints = getRewardsPoints(remoteState);
  return localResetAt > 0 && localResetAt === remoteResetAt && localPoints > remotePoints;
}

function getSyncSignals(localState, remoteState, timeToleranceMs) {
  const localPoints = getRewardsPoints(localState);
  const remotePoints = getRewardsPoints(remoteState);
  const localTimestamp = getRewardsTimestamp(localState);
  const remoteTimestamp = getRewardsTimestamp(remoteState);

  return {
    localPoints,
    remotePoints,
    localTimestamp,
    remoteTimestamp,
    remoteIsNewer: remoteTimestamp > (localTimestamp + timeToleranceMs),
    localIsNewer: localTimestamp > (remoteTimestamp + timeToleranceMs),
    remoteHasMoreProgress: remotePoints > localPoints,
    localHasMoreProgress: localPoints > remotePoints,
  };
}

export function decideInitialRewardsSyncAction({
  localState = {},
  remoteState = null,
  now = Date.now(),
  timeToleranceMs = 2000,
  recentResetWindowMs = 10000,
} = {}) {
  if (!remoteState) return 'load-cache';
  if (isRecentLocalReset(localState, remoteState, now, recentResetWindowMs)) return 'push-local-reset';
  if (isLocalStateEmpty(localState, remoteState)) return 'import-remote';
  if (hasSameResetEpochWithMoreLocalProgress(localState, remoteState)) return 'push-local';

  const signals = getSyncSignals(localState, remoteState, timeToleranceMs);
  if (signals.remoteIsNewer || signals.remoteHasMoreProgress) return 'import-remote';
  if (signals.localIsNewer || signals.localHasMoreProgress) return 'push-local';
  return 'noop';
}

export function decideRealtimeRewardsSyncAction({
  localState = {},
  remoteState = null,
  now = Date.now(),
  timeToleranceMs = 2000,
  recentResetWindowMs = 10000,
} = {}) {
  if (!remoteState) return 'noop';
  if (isRecentLocalReset(localState, remoteState, now, recentResetWindowMs)) return 'noop';
  if (isLocalStateEmpty(localState, remoteState)) return 'import-remote';
  if (hasSameResetEpochWithMoreLocalProgress(localState, remoteState)) return 'push-local';

  const signals = getSyncSignals(localState, remoteState, timeToleranceMs);
  if (signals.remoteIsNewer) return 'import-remote';
  if (signals.localIsNewer) return 'push-local';
  if (signals.remoteHasMoreProgress) return 'import-remote';
  if (signals.localHasMoreProgress) return 'push-local';
  return 'noop';
}