import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db, isConfigValid } from '../firebase/config';
import logger from '../utils/logger';

const EMPTY_MESSAGES = [];
const ID_PREFIX = 'legacy_';

function fastHash(input) {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function ensureCompactIds(items) {
  const seen = new Set();
  const occurrenceByBase = new Map();

  return (Array.isArray(items) ? items : []).map((item) => {
    const role = String(item?.r || 'assistant');
    const content = String(item?.c || '');
    const explicitId = String(item?.id || item?.mid || '').trim();
    let id = explicitId;

    if (!id) {
      const baseKey = `${role}|${content}`;
      const occurrence = (occurrenceByBase.get(baseKey) || 0) + 1;
      occurrenceByBase.set(baseKey, occurrence);
      id = `${ID_PREFIX}${fastHash(baseKey)}_${occurrence}`;
    }

    let uniqueId = id;
    let suffix = 1;
    while (seen.has(uniqueId)) {
      uniqueId = `${id}_${suffix}`;
      suffix += 1;
    }
    seen.add(uniqueId);

    return { id: uniqueId, r: role, c: content };
  });
}

function normalizeMessages(raw, max = 40) {
  if (!Array.isArray(raw)) return EMPTY_MESSAGES;
  const compact = raw
    .map((o) => ({
      id: o?.id || o?.mid || '',
      r: o?.r || o?.role || 'assistant',
      c: String(o?.c || o?.content || '')
    }))
    .filter((m) => m.c)
    .slice(-max);
  if (!compact.length) return EMPTY_MESSAGES;
  return ensureCompactIds(compact).map((m) => ({
    id: m.id,
    role: m.r,
    content: m.c
  }));
}

function toCompact(msgs, max = 40) {
  const compact = (Array.isArray(msgs) ? msgs : [])
    .map((m) => ({ id: m.id || '', r: m.role, c: m.content }))
    .filter((m) => m.c)
    .slice(-max);
  return ensureCompactIds(compact);
}

function sanitizeCompact(raw, max = 40) {
  const compact = (Array.isArray(raw) ? raw : [])
    .map((m) => ({
      id: String(m?.id || m?.mid || '').trim(),
      r: m?.r || m?.role || 'assistant',
      c: String(m?.c || m?.content || '')
    }))
    .filter((m) => m.c)
    .slice(-max);
  return ensureCompactIds(compact);
}

function readStorage(storageKey, max) {
  try {
    return normalizeMessages(JSON.parse(localStorage.getItem(storageKey) || '[]'), max);
  } catch {
    return EMPTY_MESSAGES;
  }
}

function readMeta(metaKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(metaKey) || '{}');
    return Number(parsed?.updatedAtMs) || 0;
  } catch {
    return 0;
  }
}

function writeMeta(metaKey, updatedAtMs) {
  try {
    localStorage.setItem(metaKey, JSON.stringify({ updatedAtMs: Number(updatedAtMs) || Date.now() }));
  } catch { /* noop */ }
}

function deriveTitle(compact) {
  const userMessage = compact.find((m) => m.r === 'user');
  const text = String(userMessage?.c || 'Nuevo hilo').replace(/\s+/g, ' ').trim();
  if (!text) return 'Nuevo hilo';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

function toMillis(value) {
  try {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toMillis === 'function') return value.toMillis();
    return new Date(value).getTime() || 0;
  } catch {
    return 0;
  }
}

function nextLogicalMs(prev = 0) {
  const now = Date.now();
  return now > prev ? now : prev + 1;
}

function compactSignature(compact) {
  try {
    return JSON.stringify(Array.isArray(compact) ? compact : []);
  } catch {
    return '[]';
  }
}

function sameCompactEntry(a, b) {
  if (a?.id && b?.id) return a.id === b.id;
  return a?.r === b?.r && a?.c === b?.c;
}

function isPrefixCompact(prefix, full) {
  if (!Array.isArray(prefix) || !Array.isArray(full)) return false;
  if (prefix.length > full.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (!sameCompactEntry(prefix[i], full[i])) return false;
  }
  return true;
}

function mergeCompacts(remoteRaw, localRaw, max = 40, options = {}) {
  const { preferRemoteClear = true } = options || {};
  const remote = sanitizeCompact(remoteRaw, max);
  const local = sanitizeCompact(localRaw, max);
  const remoteSig = compactSignature(remote);
  const localSig = compactSignature(local);

  if (remoteSig === localSig) return local;
  if (remote.length === 0) return preferRemoteClear ? [] : local;
  if (local.length === 0) return remote;
  if (isPrefixCompact(remote, local)) return local.slice(-max);
  if (isPrefixCompact(local, remote)) return remote.slice(-max);

  let lcp = 0;
  const minLen = Math.min(remote.length, local.length);
  while (lcp < minLen && sameCompactEntry(remote[lcp], local[lcp])) lcp += 1;

  const merged = [];
  const seen = new Set();
  const pushUnique = (entry) => {
    if (!entry?.c) return;
    const key = entry.id ? `id:${entry.id}` : `${entry.r || 'assistant'}|${entry.c}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ id: entry.id, r: entry.r, c: entry.c });
  };

  remote.slice(0, lcp).forEach(pushUnique);
  remote.slice(lcp).forEach(pushUnique);
  local.slice(lcp).forEach(pushUnique);

  return merged.slice(-max);
}

function buildMessagesQuery(userId, threadId, max = 40) {
  const messagesRef = collection(db, 'users', userId, 'tutorThreads', threadId, 'messages');
  const fetchLimit = Math.max(max * 3, 120);
  return query(messagesRef, orderBy('clientCreatedAtMs', 'asc'), limit(fetchLimit));
}

async function readRemoteMessages({ userId, threadId, max = 40 }) {
  const snap = await getDocs(buildMessagesQuery(userId, threadId, max));
  const rows = snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: data.id || d.id,
      r: data.r || data.role || 'assistant',
      c: String(data.c || data.content || ''),
      clientCreatedAtMs: Number(data.clientCreatedAtMs) || 0
    };
  });

  const rowsById = new Map();
  rows.forEach((row) => {
    rowsById.set(row.id, row);
  });

  const compact = sanitizeCompact(rows, Math.max(max * 3, 120)).slice(-max);
  const byId = new Map();
  compact.forEach((m) => {
    const row = rowsById.get(m.id);
    byId.set(m.id, {
      ...m,
      clientCreatedAtMs: Number(row?.clientCreatedAtMs) || 0
    });
  });
  return { compact, byId };
}

async function clearRemoteMessages({ userId, threadId, max = 40 }) {
  let hasMore = true;
  while (hasMore) {
    const snap = await getDocs(buildMessagesQuery(userId, threadId, max));
    if (!snap.docs.length) return;
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    hasMore = snap.docs.length >= Math.max(max * 3, 120);
  }
}

/**
 * Hook de persistencia ligera para TutorCore.
 * Serializa mensajes en formato compacto [{r,c}] evitando IDs internos.
 * Uso:
 *   const { initialMessages, handleMessagesChange } = useTutorPersistence();
 *   <TutorCore initialMessages={initialMessages} onMessagesChange={handleMessagesChange}>...
 */
export default function useTutorPersistence(options = {}) {
  const {
    storageKey = 'tutorHistorial',
    max = 40,
    syncEnabled = false,
    userId = null,
    courseScope = 'free',
    textHash = 'tutor_empty',
    threadId = null,
    debounceMs = 2000,
  } = options;

  const metaKey = useMemo(() => `tutorMeta:${storageKey}`, [storageKey]);
  const fsEnabled = Boolean(syncEnabled && userId && userId !== 'guest' && threadId && isConfigValid);
  const localInitialMessages = useMemo(() => readStorage(storageKey, max), [storageKey, max]);

  const [remoteMessages, setRemoteMessages] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lastSynced, setLastSynced] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [lastConflictAt, setLastConflictAt] = useState(0);
  const [hydrating, setHydrating] = useState(Boolean(fsEnabled));

  const initialMessages = remoteMessages || localInitialMessages;

  const timerRef = useRef(null);
  const latestCompactRef = useRef(toCompact(localInitialMessages, max));
  const messageClockByIdRef = useRef(new Map());
  // FIX: NO usar || Date.now(). En un dispositivo nuevo readMeta() retorna 0.
  // Con el fallback a Date.now(), el dispositivo nuevo cree que está "al día"
  // y rechaza los datos remotos reales (remoteUpdatedAt < Date.now()),
  // causando que el estado vacío local sobreescriba el hilo remoto.
  const lastLocalUpdatedAtRef = useRef(readMeta(metaKey));
  const lastRemoteUpdatedAtRef = useRef(0);
  // FIX: Monotonic write counter — each local write increments this.
  // onSnapshot ignores snapshots whose signature matches our last written data.
  const lastWrittenSignatureRef = useRef(null);
  const remoteReadSeqRef = useRef(0);
  const flushInFlightRef = useRef(false);
  const queuedFlushCompactRef = useRef(null);
  // FIX: Ref espejo de `hydrating` para usar en callbacks (handleMessagesChange)
  // sin crear dependencias que recreen el callback en cada render.
  const hydratingRef = useRef(Boolean(fsEnabled));

  useEffect(() => {
    // FIX: Cancelar flush pendiente del scope/hilo anterior.
    // Sin esto, al cambiar de hilo, el timer pendiente puede escribir datos
    // del hilo anterior al nuevo hilo (porque flushRemoteRef ya apunta al nuevo).
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRemoteMessages(null);
    latestCompactRef.current = toCompact(localInitialMessages, max);
    // FIX: Sin || Date.now() — un dispositivo nuevo debe tener timestamp 0
    // para que los datos remotos (con timestamp real) sean adoptados.
    lastLocalUpdatedAtRef.current = readMeta(metaKey);
    lastRemoteUpdatedAtRef.current = 0;
    messageClockByIdRef.current = new Map();
    remoteReadSeqRef.current += 1;
    setQuotaExceeded(false);
    setSynced(false);
  }, [localInitialMessages, max, metaKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const telemetryKey = `tutorConflictTelemetry:${userId || 'guest'}:${courseScope}:${textHash}`;

    const recordConflict = () => {
      const now = nextLogicalMs(lastLocalUpdatedAtRef.current || 0);
      setConflictCount((prev) => prev + 1);
      setLastConflictAt(now);
      try {
        const previous = Number(sessionStorage.getItem(telemetryKey) || 0);
        sessionStorage.setItem(telemetryKey, String(previous + 1));
      } catch { /* noop */ }
      try {
        window.dispatchEvent(new CustomEvent('tutor-storage-conflict', {
          detail: { storageKey, userId, courseScope, textHash, at: now }
        }));
      } catch { /* noop */ }
    };

    const onStorage = (event) => {
      if (!event || event.storageArea !== localStorage) return;
      if (event.key !== storageKey) return;
      if (event.newValue == null) {
        latestCompactRef.current = [];
        setRemoteMessages(EMPTY_MESSAGES);
        recordConflict();
        return;
      }

      try {
        const incoming = normalizeMessages(JSON.parse(event.newValue || '[]'), max);
        const incomingCompact = toCompact(incoming, max);
        const currentSignature = JSON.stringify(latestCompactRef.current || []);
        const incomingSignature = JSON.stringify(incomingCompact || []);
        if (incomingSignature === currentSignature) return;

        latestCompactRef.current = incomingCompact;
        setRemoteMessages(incoming);
        const now = nextLogicalMs(lastLocalUpdatedAtRef.current || 0);
        lastLocalUpdatedAtRef.current = Math.max(lastLocalUpdatedAtRef.current || 0, now);
        writeMeta(metaKey, now);
        recordConflict();
      } catch (e) {
        logger.warn('[useTutorPersistence] Error procesando cambio cross-tab:', e);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey, metaKey, max, userId, courseScope, textHash]);

  const flushRemote = useCallback(async (compact) => {
    if (!fsEnabled) return;

    // Evita flushes concurrentes sobre el mismo hilo y deja solo el ultimo estado.
    if (flushInFlightRef.current) {
      queuedFlushCompactRef.current = sanitizeCompact(compact, max);
      return;
    }

    flushInFlightRef.current = true;
    let compactToPersist = sanitizeCompact(compact, max);
    try {
      const threadRef = doc(db, 'users', userId, 'tutorThreads', threadId);
      let remoteCompact = [];
      let remoteById = new Map();
      try {
        const [threadSnap, remoteState] = await Promise.all([
          getDoc(threadRef),
          readRemoteMessages({ userId, threadId, max })
        ]);
        remoteCompact = remoteState.compact;
        remoteById = remoteState.byId;
        if (threadSnap.exists()) {
          const remote = threadSnap.data() || {};
          const legacyRemoteCompact = sanitizeCompact(remote.messages, max);
          const mergeBase = remoteCompact.length ? remoteCompact : legacyRemoteCompact;
          compactToPersist = mergeCompacts(mergeBase, compactToPersist, max, { preferRemoteClear: false });
        }
      } catch (e) {
        logger.warn('[useTutorPersistence] Error preparando merge antes de setDoc:', e);
      }

      const sig = compactSignature(compactToPersist);
      lastWrittenSignatureRef.current = sig;

      if (compactToPersist.length === 0) {
        await clearRemoteMessages({ userId, threadId, max });
        messageClockByIdRef.current = new Map();
      } else {
        const mergedIds = new Set(compactToPersist.map((m) => m.id));
        let lastAssignedClock = Math.max(
          lastLocalUpdatedAtRef.current || 0,
          ...Array.from(remoteById.values()).map((m) => Number(m?.clientCreatedAtMs) || 0)
        );

        // FIX: Usar writeBatch para atomicidad — todas las escrituras/borrados
        // se aplican juntas o ninguna, evitando estados parciales en Firestore.
        const batch = writeBatch(db);
        let batchOps = 0;

        for (const msg of compactToPersist) {
          const remoteMsg = remoteById.get(msg.id);
          let clientCreatedAtMs =
            Number(remoteMsg?.clientCreatedAtMs) ||
            Number(messageClockByIdRef.current.get(msg.id)) ||
            0;
          if (!clientCreatedAtMs) {
            clientCreatedAtMs = nextLogicalMs(lastAssignedClock);
          }
          lastAssignedClock = Math.max(lastAssignedClock, clientCreatedAtMs);
          messageClockByIdRef.current.set(msg.id, clientCreatedAtMs);

          const changed =
            !remoteMsg ||
            remoteMsg.r !== msg.r ||
            remoteMsg.c !== msg.c ||
            (Number(remoteMsg.clientCreatedAtMs) || 0) !== clientCreatedAtMs;

          if (changed) {
            const messageRef = doc(db, 'users', userId, 'tutorThreads', threadId, 'messages', msg.id);
            const messagePayload = {
              id: msg.id,
              r: msg.r,
              c: msg.c,
              clientCreatedAtMs,
              updatedAt: serverTimestamp(),
            };
            if (!remoteMsg) {
              messagePayload.createdAt = serverTimestamp();
            }
            batch.set(messageRef, messagePayload, { merge: true });
            batchOps++;
          }
        }

        for (const [remoteId] of remoteById.entries()) {
          if (mergedIds.has(remoteId)) continue;
          const staleRef = doc(db, 'users', userId, 'tutorThreads', threadId, 'messages', remoteId);
          batch.delete(staleRef);
          batchOps++;
          messageClockByIdRef.current.delete(remoteId);
        }

        if (batchOps > 0) {
          await batch.commit();
        }
      }

      // FIX: Solo incluir title si hay un mensaje del usuario del cual derivar.
      // Sin esto, flushRemote con messages=[] sobreescribe el título real con
      // "Nuevo hilo" durante transiciones, clears, o unmounts.
      // merge:true preserva el title existente cuando lo omitimos.
      const derivedTitle = deriveTitle(compactToPersist);
      const payload = {
        textHash,
        courseScope,
        messageCount: compactToPersist.length,
        storageModel: 'append_v1',
        messages: deleteField(),
        updatedAt: serverTimestamp(),
      };
      if (derivedTitle !== 'Nuevo hilo') {
        payload.title = derivedTitle;
      }
      await setDoc(threadRef, payload, { merge: true });
      const now = nextLogicalMs(lastLocalUpdatedAtRef.current || 0);
      setSynced(true);
      setLastSynced(now);
      writeMeta(metaKey, now);
      lastLocalUpdatedAtRef.current = now;
    } catch (e) {
      logger.warn('[useTutorPersistence] Error sincronizando hilo a Firestore:', e);
      setSynced(false);
    } finally {
      flushInFlightRef.current = false;

      const queuedCompact = queuedFlushCompactRef.current;
      queuedFlushCompactRef.current = null;

      if (queuedCompact && fsEnabled) {
        if (timerRef.current) clearTimeout(timerRef.current);
        const compactToFlush = sanitizeCompact(latestCompactRef.current, max);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flushRemoteRef.current(compactToFlush);
        }, debounceMs);
      }
    }
  }, [fsEnabled, userId, threadId, textHash, courseScope, metaKey, max, debounceMs]);

  // P1 FIX: Ref estable para flushRemote — evita re-suscripciones de onSnapshot
  // y permite que el cleanup del timer siempre use la versión más reciente.
  const flushRemoteRef = useRef(flushRemote);
  flushRemoteRef.current = flushRemote;

  // Q2 FIX: Capturar snapshot de flushRemote en una ref local al efecto para
  // evitar que el cleanup use la versión nueva (con fsEnabled=false) cuando se desactiva sync.
  const cleanupFlushRef = useRef(flushRemote);
  useEffect(() => { cleanupFlushRef.current = flushRemote; }, [flushRemote]);

  useEffect(() => {
    return () => {
      const hadPending = Boolean(timerRef.current);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hadPending && fsEnabled) {
        cleanupFlushRef.current(latestCompactRef.current);
      }
    };
  }, [fsEnabled]);

  // B1 FIX: Usar flushRemoteRef.current en el timer callback para evitar que un
  // cambio de userId/threadId (que recrea flushRemote) deje un timer pendiente
  // apuntando a la versión vieja y escriba en el path de Firestore equivocado.
  const scheduleRemoteFlush = useCallback((compact) => {
    if (!fsEnabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const compactToFlush = sanitizeCompact(compact, max);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushRemoteRef.current(compactToFlush);
    }, debounceMs);
  }, [fsEnabled, debounceMs, max]);

  const handleMessagesChange = useCallback((msgs) => {
    const compact = sanitizeCompact(msgs, max);
    // FIX: No persistir estado vacío mientras se hidrata desde remoto.
    // En un dispositivo nuevo, TutorCore puede disparar onMessagesChange([])
    // antes de que getDoc resuelva. Sin esta guarda:
    //   1. Se escribe [] a localStorage con timestamp Date.now()
    //   2. lastLocalUpdatedAtRef se actualiza a Date.now()
    //   3. getDoc resuelve pero remoteUpdatedAt < Date.now() → datos remotos rechazados
    //   4. scheduleRemoteFlush([]) sobreescribe el hilo en Firestore con {title:'Nuevo hilo', messages:[]}
    if (hydratingRef.current && compact.length === 0) {
      return;
    }
    latestCompactRef.current = compact;
    // FIX: Pre-update written signature so onSnapshot rejects echoes even
    // if it fires between handleMessagesChange and flushRemote completing.
    lastWrittenSignatureRef.current = compactSignature(compact);
    try {
      const now = nextLogicalMs(lastLocalUpdatedAtRef.current || 0);
      writeMeta(metaKey, now);
      localStorage.setItem(storageKey, JSON.stringify(compact));
      lastLocalUpdatedAtRef.current = now;
      setQuotaExceeded(false);
    } catch (e) {
      setQuotaExceeded(true);
      logger.warn('[useTutorPersistence] No se pudo guardar en localStorage (cuota o acceso):', e);
    }
    scheduleRemoteFlush(compact);
  }, [max, storageKey, metaKey, scheduleRemoteFlush]);

  useEffect(() => {
    // FIX: Cancelar flush pendiente al cambiar de hilo/scope.
    // Si el timer del hilo anterior sigue activo cuando se monta un nuevo listener,
    // podria escribir datos cruzados entre hilos.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!fsEnabled) return undefined;

    setHydrating(true);
    hydratingRef.current = true;

    const threadRef = doc(db, 'users', userId, 'tutorThreads', threadId);
    let isMounted = true;

    const finishHydration = () => {
      if (!isMounted || !hydratingRef.current) return;
      setHydrating(false);
      hydratingRef.current = false;
    };

    const applyRemoteSnapshot = async (snapshot) => {
      const readSeq = remoteReadSeqRef.current + 1;
      remoteReadSeqRef.current = readSeq;

      const exists = Boolean(snapshot?.exists?.());
      const remote = exists ? (snapshot.data() || {}) : {};
      const remoteUpdatedAt = toMillis(remote.updatedAt);

      let remoteCompact = [];
      let remoteById = new Map();
      try {
        const remoteState = await readRemoteMessages({ userId, threadId, max });
        remoteCompact = remoteState.compact;
        remoteById = remoteState.byId;
      } catch (e) {
        logger.warn('[useTutorPersistence] Error leyendo subcoleccion remota:', e);
      }

      // Compatibilidad temporal: si no hay subcoleccion aun, usar campo legacy.
      if (!remoteCompact.length && exists) {
        remoteCompact = sanitizeCompact(remote.messages, max);
      }

      if (!isMounted || readSeq !== remoteReadSeqRef.current) return;

      if (!exists && remoteCompact.length === 0) {
        if (latestCompactRef.current.length > 0) {
          flushRemoteRef.current(latestCompactRef.current);
        }
        finishHydration();
        return;
      }

      const nextClockById = new Map();
      remoteCompact.forEach((msg) => {
        const remoteClock = Number(remoteById.get(msg.id)?.clientCreatedAtMs) || 0;
        if (remoteClock) nextClockById.set(msg.id, remoteClock);
      });
      messageClockByIdRef.current = nextClockById;

      const localCompact = sanitizeCompact(latestCompactRef.current, max);
      const remoteSig = compactSignature(remoteCompact);
      const localSig = compactSignature(localCompact);

      if (remoteUpdatedAt && remoteUpdatedAt < (lastRemoteUpdatedAtRef.current || 0)) {
        if (latestCompactRef.current.length > 0) {
          flushRemoteRef.current(latestCompactRef.current);
        }
        finishHydration();
        return;
      }

      // Detect echo: si llega exactamente lo que acabamos de escribir, no tocar UI.
      if (remoteSig === lastWrittenSignatureRef.current) {
        const remoteClock = remoteUpdatedAt || nextLogicalMs(lastLocalUpdatedAtRef.current || 0);
        if (remoteUpdatedAt) {
          lastRemoteUpdatedAtRef.current = Math.max(lastRemoteUpdatedAtRef.current || 0, remoteUpdatedAt);
        }
        lastLocalUpdatedAtRef.current = Math.max(lastLocalUpdatedAtRef.current || 0, remoteClock);
        writeMeta(metaKey, remoteClock);
        setSynced(true);
        setLastSynced(remoteClock);
        finishHydration();
        return;
      }

      if (remoteSig !== localSig) {
        const mergedCompact = mergeCompacts(remoteCompact, localCompact, max, { preferRemoteClear: true });
        const mergedSig = compactSignature(mergedCompact);

        if (mergedSig !== localSig) {
          setRemoteMessages(normalizeMessages(mergedCompact, max));
          latestCompactRef.current = mergedCompact;
          try {
            localStorage.setItem(storageKey, JSON.stringify(mergedCompact));
          } catch { /* noop */ }
        }

        const remoteClock = remoteUpdatedAt || nextLogicalMs(lastLocalUpdatedAtRef.current || 0);
        if (remoteUpdatedAt) {
          lastRemoteUpdatedAtRef.current = Math.max(lastRemoteUpdatedAtRef.current || 0, remoteUpdatedAt);
        }
        writeMeta(metaKey, remoteClock);
        lastLocalUpdatedAtRef.current = Math.max(lastLocalUpdatedAtRef.current || 0, remoteClock);
        setSynced(true);
        setLastSynced(remoteClock);

        if (mergedSig !== remoteSig && mergedSig !== lastWrittenSignatureRef.current) {
          scheduleRemoteFlush(mergedCompact);
        }
      } else if (latestCompactRef.current.length > 0 && !remoteSig) {
        flushRemoteRef.current(latestCompactRef.current);
      } else {
        const remoteClock = remoteUpdatedAt || nextLogicalMs(lastLocalUpdatedAtRef.current || 0);
        if (remoteUpdatedAt) {
          lastRemoteUpdatedAtRef.current = Math.max(lastRemoteUpdatedAtRef.current || 0, remoteUpdatedAt);
        }
        lastLocalUpdatedAtRef.current = Math.max(lastLocalUpdatedAtRef.current || 0, remoteClock);
        writeMeta(metaKey, remoteClock);
        setSynced(true);
        setLastSynced(remoteClock);
      }

      finishHydration();
    };

    getDoc(threadRef)
      .then((snapshot) => applyRemoteSnapshot(snapshot))
      .catch((e) => {
        logger.warn('[useTutorPersistence] Error cargando hilo remoto:', e);
        finishHydration();
      });

    const unsub = onSnapshot(threadRef, (snapshot) => {
      applyRemoteSnapshot(snapshot).catch((e) => {
        logger.warn('[useTutorPersistence] Error aplicando snapshot de hilo:', e);
      });
    }, (e) => {
      logger.warn('[useTutorPersistence] Error en onSnapshot de hilo:', e);
    });

    return () => {
      isMounted = false;
      try { unsub(); } catch { /* noop */ }
    };
  }, [fsEnabled, userId, threadId, max, storageKey, metaKey, scheduleRemoteFlush]);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(metaKey);
      latestCompactRef.current = [];
      setRemoteMessages(EMPTY_MESSAGES);
    } catch { /* noop */ }
    // P1/R1 FIX: También limpiar el hilo remoto en Firestore
    if (fsEnabled) {
      flushRemoteRef.current([]).catch(() => { /* noop */ });
    }
  }, [storageKey, metaKey, fsEnabled]);

  // P1 FIX: flushNow estable via useCallback (evita nueva referencia cada render)
  const flushNow = useCallback(() => flushRemoteRef.current(latestCompactRef.current), []);

  return {
    initialMessages,
    handleMessagesChange,
    clearHistory,
    quotaExceeded,
    synced,
    hydrating,
    lastSynced,
    conflictCount,
    lastConflictAt,
    flushNow,
  };
}
