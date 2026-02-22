import logger from './logger';

function isCourseScopedId(value) {
  if (!value || typeof value !== 'string') return false;
  if (value === 'global_progress') return false;
  if (value === 'free') return false;
  if (value.startsWith('free::')) return false;
  return true;
}

function parseJsonSafe(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getSessionStorageKeysForCourse(courseId) {
  const keys = [];
  if (!courseId || typeof sessionStorage === 'undefined') return keys;

  const artifactMarkers = [
    'resumenAcademico',
    'tablaACD',
    'mapaActores',
    'respuestaArgumentativa',
    'ensayoIntegrador'
  ];

  Object.keys(sessionStorage).forEach((key) => {
    if (!key || typeof key !== 'string') return;

    if (key.startsWith(`${courseId}_`)) {
      keys.push(key);
      return;
    }

    if (key.endsWith('_courseId')) {
      const storedValue = sessionStorage.getItem(key);
      if (storedValue === courseId) keys.push(key);
      return;
    }

    if (key.includes(courseId) && artifactMarkers.some((marker) => key.includes(marker))) {
      keys.push(key);
    }
  });

  return keys;
}

function getLocalStorageKeysForCourse(courseId) {
  const keys = [];
  if (!courseId || typeof localStorage === 'undefined') return keys;

  Object.keys(localStorage).forEach((key) => {
    if (!key || typeof key !== 'string') return;

    if (key.startsWith(`activity_results_${courseId}_`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith(`tutorInteractionsLog:${courseId}::`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith(`ethicalReflections:${courseId}::`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith(`studyitems:${courseId}_`) || key.startsWith(`studyitems:${courseId}:`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith(`notas_disponibles_${courseId}_`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith('rubricProgress_') && key.includes(`_${courseId}_`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith('activitiesProgress_') && key.includes(`_${courseId}_`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith('savedCitations_') && key.includes(`_${courseId}_`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith('firestore_backup_') && key.includes(`_${courseId}_`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith('tutorHistorial:') && key.includes(`:${courseId}:`)) {
      keys.push(key);
      return;
    }

    if (key.startsWith('courseProgress_') && key.includes(courseId)) {
      keys.push(key);
      return;
    }
  });

  return keys;
}

function cleanupNotesProgressForCourse(courseId, userId = null) {
  if (!courseId || typeof localStorage === 'undefined') return 0;

  const storageKeys = userId
    ? [`notas_estudio_progreso:${userId}`, 'notas_estudio_progreso']
    : ['notas_estudio_progreso'];

  const uniqueStorageKeys = Array.from(new Set(storageKeys));

  let removedEntries = 0;

  uniqueStorageKeys.forEach((storageKey) => {
    const parsed = parseJsonSafe(localStorage.getItem(storageKey));
    if (!parsed || typeof parsed !== 'object') return;

    const data = parsed.data && typeof parsed.data === 'object' ? { ...parsed.data } : null;
    if (!data) return;

    Object.keys(data).forEach((entryKey) => {
      if (entryKey && entryKey.startsWith(`${courseId}_`)) {
        delete data[entryKey];
        removedEntries += 1;
      }
    });

    if (Object.keys(data).length === 0) {
      localStorage.removeItem(storageKey);
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify({ ...parsed, data }));
  });

  return removedEntries;
}

function cleanupSessionContainersForCourse(courseId, userId = null) {
  if (!courseId || typeof localStorage === 'undefined') {
    return { removedSessions: 0, touchedContainers: 0 };
  }

  const targetUsers = Array.from(new Set(userId ? [userId, 'guest'] : ['guest']));
  let removedSessions = 0;
  let touchedContainers = 0;

  targetUsers.forEach((uid) => {
    const sessionsKey = `appLectura_sessions_${uid}`;
    const currentSessionKey = `appLectura_current_session_id_${uid}`;
    const pendingSyncsKey = `appLectura_pending_syncs_${uid}`;
    const tombstoneKey = `appLectura_deleted_sessions_${uid}`;

    const sessions = parseJsonSafe(localStorage.getItem(sessionsKey), []);
    if (!Array.isArray(sessions)) return;

    const removedIds = [];
    const kept = sessions.filter((session) => {
      const scid = session?.sourceCourseId || session?.text?.sourceCourseId || null;
      const remove = scid === courseId;
      if (remove && session?.id) removedIds.push(session.id);
      return !remove;
    });

    if (removedIds.length === 0) return;

    localStorage.setItem(sessionsKey, JSON.stringify(kept));
    touchedContainers += 1;
    removedSessions += removedIds.length;

    const currentSessionId = localStorage.getItem(currentSessionKey);
    if (currentSessionId && removedIds.includes(currentSessionId)) {
      localStorage.removeItem(currentSessionKey);
      touchedContainers += 1;
    }

    const pending = parseJsonSafe(localStorage.getItem(pendingSyncsKey), []);
    if (Array.isArray(pending)) {
      const filteredPending = pending.filter((id) => !removedIds.includes(id));
      if (filteredPending.length !== pending.length) {
        localStorage.setItem(pendingSyncsKey, JSON.stringify(filteredPending));
        touchedContainers += 1;
      }
    }

    const tombstones = parseJsonSafe(localStorage.getItem(tombstoneKey), null);
    if (tombstones && typeof tombstones === 'object') {
      let changed = false;
      removedIds.forEach((id) => {
        if (Object.prototype.hasOwnProperty.call(tombstones, id)) {
          delete tombstones[id];
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(tombstoneKey, JSON.stringify(tombstones));
        touchedContainers += 1;
      }
    }
  });

  return { removedSessions, touchedContainers };
}

function parseCourseIdFromKeyByPrefix(key, prefix) {
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  return parseCourseIdFromTail(rest);
}

function parseCourseIdFromTail(rest) {

  if (!rest || typeof rest !== 'string') return null;

  const markerCandidates = ['_texto', '_doc', '_lectura', '_activity', '_artifact'];
  for (const marker of markerCandidates) {
    const idx = rest.lastIndexOf(marker);
    if (idx > 0) {
      return rest.slice(0, idx);
    }
  }

  const separator = rest.lastIndexOf('_');
  if (separator <= 0) return null;
  return rest.slice(0, separator);
}

function parseCourseIdFromScopedKeyWithoutUserId(key, prefix) {
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const firstSeparator = rest.indexOf('_');
  if (firstSeparator <= 0) return null;
  const payload = rest.slice(firstSeparator + 1);
  return parseCourseIdFromTail(payload);
}

function extractConservativeCourseCandidatesFromAmbiguousKey(key) {
  if (typeof key !== 'string') return [];

  const collectPrefixCandidates = (rawValue) => {
    if (typeof rawValue !== 'string' || !rawValue.includes('_')) return [];
    const candidates = [];
    for (let idx = rawValue.indexOf('_'); idx > 0; idx = rawValue.indexOf('_', idx + 1)) {
      candidates.push(rawValue.slice(0, idx));
    }
    return candidates;
  };

  if (key.startsWith('activity_results_')) {
    const rest = key.slice('activity_results_'.length);
    return collectPrefixCandidates(rest);
  }

  if (key.startsWith('studyitems:')) {
    const rest = key.slice('studyitems:'.length);
    const payload = rest.split(':')[0] || rest;
    return collectPrefixCandidates(payload);
  }

  return [];
}

function isConservativeCourseIdCandidate(value) {
  if (!isCourseScopedId(value) || typeof value !== 'string') return false;
  if (!/^[A-Za-z0-9_-]{4,100}$/.test(value)) return false;

  const blocked = [
    'resumen',
    'tabla',
    'mapa',
    'respuesta',
    'ensayo',
    'global',
    'free',
    'academico',
    'ideologico'
  ];

  const normalized = value.toLowerCase();
  return !blocked.some((token) => normalized.includes(token));
}

function extractCourseIdFromActivityIndexEntry(entryKey, entryData = null) {
  if (entryData && typeof entryData === 'object' && typeof entryData.courseId === 'string') {
    return entryData.courseId;
  }

  if (typeof entryKey === 'string' && entryKey.includes('::')) {
    const [coursePart] = entryKey.split('::');
    return coursePart || null;
  }

  return null;
}

function pruneActivityResultsIndexForCourse(courseId) {
  if (!courseId || typeof localStorage === 'undefined') return 0;

  const raw = localStorage.getItem('activity_results_index');
  const parsed = parseJsonSafe(raw, null);
  if (!parsed || typeof parsed !== 'object') return 0;

  let removed = 0;
  Object.entries(parsed).forEach(([entryKey, entryData]) => {
    const entryCourseId = extractCourseIdFromActivityIndexEntry(entryKey, entryData);
    if (entryCourseId === courseId) {
      delete parsed[entryKey];
      removed += 1;
    }
  });

  if (removed <= 0) return 0;

  if (Object.keys(parsed).length === 0) {
    localStorage.removeItem('activity_results_index');
  } else {
    localStorage.setItem('activity_results_index', JSON.stringify(parsed));
  }

  return removed;
}

export function inferCourseIdsFromBrowserData(userId = null) {
  const ids = new Set();
  const ambiguousEvidence = new Map();

  const registerAmbiguousEvidence = (candidateId, source) => {
    if (!isConservativeCourseIdCandidate(candidateId) || !source) return;
    const existing = ambiguousEvidence.get(candidateId) || {
      keyHits: 0,
      sources: new Set()
    };
    existing.keyHits += 1;
    existing.sources.add(source);
    ambiguousEvidence.set(candidateId, existing);
  };

  if (typeof localStorage !== 'undefined') {
    Object.keys(localStorage).forEach((key) => {
      if (!key || typeof key !== 'string') return;

      const conservativeCandidates = extractConservativeCourseCandidatesFromAmbiguousKey(key);
      conservativeCandidates.forEach((conservativeCandidate) => {
        const source = key.startsWith('activity_results_') ? 'activity_results' : 'studyitems';
        registerAmbiguousEvidence(conservativeCandidate, source);
      });

      let courseId = null;

      if (key.startsWith('tutorInteractionsLog:')) {
        const m = key.match(/^tutorInteractionsLog:([^:]+)::/);
        courseId = m?.[1] || null;
      } else if (key.startsWith('ethicalReflections:')) {
        const m = key.match(/^ethicalReflections:([^:]+)::/);
        courseId = m?.[1] || null;
      } else if (key.startsWith('notas_disponibles_')) {
        courseId = parseCourseIdFromKeyByPrefix(key, 'notas_disponibles_');
      } else if (key.startsWith('rubricProgress_')) {
        if (userId) {
          courseId = parseCourseIdFromKeyByPrefix(key, `rubricProgress_${userId}_`);
        } else {
          courseId = parseCourseIdFromScopedKeyWithoutUserId(key, 'rubricProgress_');
        }
      } else if (key.startsWith('activitiesProgress_')) {
        if (userId) {
          courseId = parseCourseIdFromKeyByPrefix(key, `activitiesProgress_${userId}_`);
        } else {
          courseId = parseCourseIdFromScopedKeyWithoutUserId(key, 'activitiesProgress_');
        }
      } else if (key.startsWith('savedCitations_')) {
        if (userId) {
          courseId = parseCourseIdFromKeyByPrefix(key, `savedCitations_${userId}_`);
        } else {
          courseId = parseCourseIdFromScopedKeyWithoutUserId(key, 'savedCitations_');
        }
      } else if (key.startsWith('tutorHistorial:')) {
        const parts = key.split(':');
        if (parts.length >= 4) courseId = parts[2];
      }

      if (isCourseScopedId(courseId)) ids.add(courseId);
    });

    ambiguousEvidence.forEach((evidence, candidateId) => {
      const hasStrongSignal = evidence.sources.size >= 2 || evidence.keyHits >= 3;
      if (hasStrongSignal) ids.add(candidateId);
    });

    const activityIndex = parseJsonSafe(localStorage.getItem('activity_results_index'), null);
    if (activityIndex && typeof activityIndex === 'object') {
      Object.entries(activityIndex).forEach(([entryKey, entryData]) => {
        const scid = extractCourseIdFromActivityIndexEntry(entryKey, entryData);
        if (isCourseScopedId(scid)) ids.add(scid);
      });
    }

    const sessionKeys = userId
      ? [`appLectura_sessions_${userId}`, 'appLectura_sessions_guest']
      : ['appLectura_sessions_guest'];

    for (const sessionsKey of sessionKeys) {
      const sessions = parseJsonSafe(localStorage.getItem(sessionsKey), []);
      if (!Array.isArray(sessions)) continue;
      sessions.forEach((session) => {
        const scid = session?.sourceCourseId || session?.text?.sourceCourseId || null;
        if (isCourseScopedId(scid)) ids.add(scid);
      });
    }

    const notasKeys = userId
      ? [`notas_estudio_progreso:${userId}`, 'notas_estudio_progreso']
      : ['notas_estudio_progreso'];

    notasKeys.forEach((notasKey) => {
      const notas = parseJsonSafe(localStorage.getItem(notasKey), null);
      const notasData = notas?.data && typeof notas.data === 'object' ? notas.data : null;
      if (!notasData) return;
      Object.keys(notasData).forEach((entryKey) => {
        const separator = entryKey.indexOf('_');
        if (separator <= 0) return;
        const scid = entryKey.slice(0, separator);
        if (isCourseScopedId(scid)) ids.add(scid);
      });
    });
  }

  // NOTA: evitamos inferir courseId desde sessionStorage porque las claves de modo libre
  // pueden compartir prefijos ambiguos y provocar limpieza destructiva por falso positivo.

  return Array.from(ids);
}

export function cleanupCourseScopedBrowserData({ courseId, userId = null } = {}) {
  if (!courseId) {
    return {
      removedLocalStorageKeys: 0,
      removedSessionStorageKeys: 0,
      removedActivityIndexEntries: 0,
      removedNotesEntries: 0,
      removedSessions: 0
    };
  }

  const localKeys = getLocalStorageKeysForCourse(courseId);
  localKeys.forEach((key) => localStorage.removeItem(key));

  const sessionKeys = getSessionStorageKeysForCourse(courseId);
  sessionKeys.forEach((key) => sessionStorage.removeItem(key));

  const removedActivityIndexEntries = pruneActivityResultsIndexForCourse(courseId);
  const removedNotesEntries = cleanupNotesProgressForCourse(courseId, userId);
  const sessionsCleanup = cleanupSessionContainersForCourse(courseId, userId);

  try {
    if (localStorage.getItem('currentCourseId') === courseId) {
      localStorage.removeItem('currentCourseId');
    }
    if (localStorage.getItem('sourceCourseId') === courseId) {
      localStorage.removeItem('sourceCourseId');
    }
  } catch {
    // noop
  }

  logger.log('[CourseCleanup] Limpieza local por curso:', {
    courseId,
    userId: userId || 'unknown',
    localKeys: localKeys.length,
    sessionKeys: sessionKeys.length,
    removedActivityIndexEntries,
    removedNotesEntries,
    removedSessions: sessionsCleanup.removedSessions
  });

  return {
    removedLocalStorageKeys: localKeys.length,
    removedSessionStorageKeys: sessionKeys.length,
    removedActivityIndexEntries,
    removedNotesEntries,
    removedSessions: sessionsCleanup.removedSessions
  };
}

export function cleanupMultipleCoursesBrowserData({ courseIds = [], userId = null } = {}) {
  const unique = Array.from(new Set((courseIds || []).filter(Boolean)));
  let removedLocalStorageKeys = 0;
  let removedSessionStorageKeys = 0;
  let removedActivityIndexEntries = 0;
  let removedNotesEntries = 0;
  let removedSessions = 0;

  unique.forEach((courseId) => {
    const stats = cleanupCourseScopedBrowserData({ courseId, userId });
    removedLocalStorageKeys += stats.removedLocalStorageKeys || 0;
    removedSessionStorageKeys += stats.removedSessionStorageKeys || 0;
    removedActivityIndexEntries += stats.removedActivityIndexEntries || 0;
    removedNotesEntries += stats.removedNotesEntries || 0;
    removedSessions += stats.removedSessions || 0;
  });

  return {
    courses: unique.length,
    removedLocalStorageKeys,
    removedSessionStorageKeys,
    removedActivityIndexEntries,
    removedNotesEntries,
    removedSessions
  };
}
