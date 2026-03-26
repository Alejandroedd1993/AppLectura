export function getRewardsEngine() {
  if (typeof window === 'undefined') return null;
  return window.__rewardsEngine || null;
}

export function setRewardsEngine(engine) {
  if (typeof window === 'undefined') return engine || null;
  if (engine) {
    window.__rewardsEngine = engine;
    return engine;
  }
  delete window.__rewardsEngine;
  return null;
}

export function clearRewardsEngine(expectedEngine = null) {
  if (typeof window === 'undefined') return;
  if (expectedEngine && window.__rewardsEngine !== expectedEngine) return;
  delete window.__rewardsEngine;
}