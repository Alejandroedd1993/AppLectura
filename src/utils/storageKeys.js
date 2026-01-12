// Utilidades centralizadas para claves/prefijos de storage.
// Objetivo: evitar convenciones duplicadas y facilitar migraciones controladas.

export const STORAGE_PREFIXES = {
  APP_LECTURA: 'appLectura_',
  APP_LECTURA_LOWER: 'applectura_',
  FIRESTORE_BACKUP: 'firestore_backup_',
  ANALYSIS_CACHE: 'analysis_cache_',
  RATE_LIMIT: 'ratelimit_'
};

export const LEGACY_KEYS = {
  REWARDS_STATE: 'rewards_state',
  APPLECTURA_SESSIONS: 'applectura_sessions',
  APPLECTURA_CURRENT_SESSION: 'applectura_current_session',
  APPLECTURA_PENDING_SYNCS: 'appLectura_pending_syncs',
  // SessionManager también contempla legacy con prefijo correcto:
  APPLECTURA_SESSIONS_UNSCOPED: 'appLectura_sessions',
  APPLECTURA_CURRENT_SESSION_ID_UNSCOPED: 'appLectura_current_session_id',
  APPLECTURA_PENDING_SYNCS_UNSCOPED: 'appLectura_pending_syncs'
};

export function rewardsStateKey(uid) {
  return uid ? `rewards_state_${uid}` : LEGACY_KEYS.REWARDS_STATE;
}

export function rubricProgressKey(uid, textoId) {
  return `rubricProgress_${uid}_${textoId}`;
}

export function activitiesProgressKey(uid) {
  return `activitiesProgress_${uid}`;
}

export function activitiesProgressMigratedKey(uid) {
  return `activitiesProgress_migrated_${uid}`;
}

export function sessionsKey(uid) {
  return `appLectura_sessions_${uid}`;
}

export function currentSessionIdKey(uid) {
  return `appLectura_current_session_id_${uid}`;
}

export function pendingSyncsKey(uid) {
  return `appLectura_pending_syncs_${uid}`;
}

export function appSessionIdKey() {
  return 'appLectura_sessionId';
}

export function storagePrefixesToClear() {
  return [
    'activity_',
    'session_',
    'artifact_',
    'tutorHistorial',
    'tutorFollowUpsEnabled',
    STORAGE_PREFIXES.APP_LECTURA,
    STORAGE_PREFIXES.APP_LECTURA_LOWER,
    STORAGE_PREFIXES.RATE_LIMIT,
    STORAGE_PREFIXES.ANALYSIS_CACHE,
    'appLectura_analysis_cache',
    STORAGE_PREFIXES.FIRESTORE_BACKUP
  ];
}
