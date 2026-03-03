import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isConfigValid } from '../firebase/config';
import logger from '../utils/logger';

const EMPTY_MESSAGES = [];

function normalizeMessages(raw, max = 40) {
  if (!Array.isArray(raw)) return EMPTY_MESSAGES;
  const normalized = raw
    .map((o) => ({
      role: o?.r || o?.role,
      content: o?.c || o?.content
    }))
    .filter((m) => m.content)
    .slice(-max);
  return normalized.length ? normalized : EMPTY_MESSAGES;
}

function toCompact(msgs, max = 40) {
  return (Array.isArray(msgs) ? msgs : [])
    .map((m) => ({ r: m.role, c: m.content }))
    .filter((m) => m.c)
    .slice(-max);
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
  const pendingRemoteRef = useRef(false);
  const lastLocalUpdatedAtRef = useRef(readMeta(metaKey) || Date.now());
  // FIX: Monotonic write counter — each local write increments this.
  // onSnapshot ignores snapshots whose signature matches our last written data.
  const lastWrittenSignatureRef = useRef(null);

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
    lastLocalUpdatedAtRef.current = readMeta(metaKey) || Date.now();
    setQuotaExceeded(false);
    setSynced(false);
  }, [localInitialMessages, max, metaKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const telemetryKey = `tutorConflictTelemetry:${userId || 'guest'}:${courseScope}:${textHash}`;

    const recordConflict = () => {
      const now = Date.now();
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
        const now = Date.now();
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
    pendingRemoteRef.current = true;
    // FIX: Save signature of what we're about to write so onSnapshot can
    // detect echoes reliably (independent of client/server clock skew).
    const sig = JSON.stringify(compact);
    lastWrittenSignatureRef.current = sig;
    try {
      const threadRef = doc(db, 'users', userId, 'tutorThreads', threadId);
      await setDoc(threadRef, {
        textHash,
        courseScope,
        title: deriveTitle(compact),
        messageCount: compact.length,
        messages: compact,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      const now = Date.now();
      setSynced(true);
      setLastSynced(now);
      writeMeta(metaKey, now);
      lastLocalUpdatedAtRef.current = now;
    } catch (e) {
      logger.warn('[useTutorPersistence] Error sincronizando hilo a Firestore:', e);
      setSynced(false);
    } finally {
      // FIX: Delay reset so the server echo (arriving shortly after setDoc
      // resolves) is still blocked by `pendingRemoteRef.current === true`.
      setTimeout(() => { pendingRemoteRef.current = false; }, 3000);
    }
  }, [fsEnabled, userId, threadId, textHash, courseScope, metaKey]);

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
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushRemoteRef.current(compact);
    }, debounceMs);
  }, [fsEnabled, debounceMs]);

  const handleMessagesChange = useCallback((msgs) => {
    const compact = toCompact(msgs, max);
    latestCompactRef.current = compact;
    // FIX: Pre-update written signature so onSnapshot rejects echoes even
    // if it fires between handleMessagesChange and flushRemote completing.
    lastWrittenSignatureRef.current = JSON.stringify(compact);
    try {
      const now = Date.now();
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
    // podría escribir datos cruzados entre hilos.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!fsEnabled) return undefined;

    setHydrating(true);

    const threadRef = doc(db, 'users', userId, 'tutorThreads', threadId);

    let isMounted = true;
    getDoc(threadRef).then((snapshot) => {
      if (!isMounted || !snapshot.exists()) {
        // Q3 FIX: Usar flushRemoteRef.current en vez de flushRemote (closure)
        // para evitar dep faltante y garantizar que se usa la versión más reciente.
        if (latestCompactRef.current.length > 0) flushRemoteRef.current(latestCompactRef.current);
        setHydrating(false);
        return;
      }

      const remote = snapshot.data() || {};
      const remoteUpdatedAt = toMillis(remote.updatedAt);
      const localUpdatedAt = lastLocalUpdatedAtRef.current || 0;
      const remoteMessages = normalizeMessages(remote.messages, max);

      if (remoteUpdatedAt > localUpdatedAt && remoteMessages !== EMPTY_MESSAGES) {
        setRemoteMessages(remoteMessages);
        latestCompactRef.current = toCompact(remoteMessages, max);
        try {
          localStorage.setItem(storageKey, JSON.stringify(latestCompactRef.current));
          writeMeta(metaKey, remoteUpdatedAt || Date.now());
        } catch { /* noop */ }
        // R13 FIX: Mantener el reloj local en sync con el remoto adoptado.
        // Sin esto, onSnapshot puede reaplicar el mismo estado remoto varias veces
        // porque lastLocalUpdatedAtRef queda atrasado.
        lastLocalUpdatedAtRef.current = remoteUpdatedAt || Date.now();
      } else if (latestCompactRef.current.length > 0) {
        flushRemoteRef.current(latestCompactRef.current);
      }
      setHydrating(false);
    }).catch((e) => {
      logger.warn('[useTutorPersistence] Error cargando hilo remoto:', e);
      setHydrating(false);
    });

    const unsub = onSnapshot(threadRef, (snapshot) => {
      if (!snapshot.exists()) return;
      if (pendingRemoteRef.current) return;

      const remote = snapshot.data() || {};
      const remoteUpdatedAt = toMillis(remote.updatedAt);
      const localUpdatedAt = lastLocalUpdatedAtRef.current || 0;
      if (remoteUpdatedAt <= localUpdatedAt) return;

      const remoteMessages = normalizeMessages(remote.messages, max);
      if (remoteMessages === EMPTY_MESSAGES && latestCompactRef.current.length > 0) return;

      // FIX: Detect echo — if the incoming data matches what we just wrote,
      // skip setRemoteMessages to prevent overwriting TutorCore's live state.
      const incomingSig = JSON.stringify(toCompact(remoteMessages, max));
      if (incomingSig === lastWrittenSignatureRef.current) {
        // Still update bookkeeping so next genuine remote change gets through.
        lastLocalUpdatedAtRef.current = remoteUpdatedAt || Date.now();
        writeMeta(metaKey, remoteUpdatedAt || Date.now());
        setSynced(true);
        setLastSynced(remoteUpdatedAt || Date.now());
        return;
      }

      setRemoteMessages(remoteMessages);
      latestCompactRef.current = toCompact(remoteMessages, max);
      try {
        localStorage.setItem(storageKey, JSON.stringify(latestCompactRef.current));
        writeMeta(metaKey, remoteUpdatedAt || Date.now());
      } catch { /* noop */ }
      // R13 FIX: Refrescar ref de tiempo local tras aceptar estado remoto.
      lastLocalUpdatedAtRef.current = remoteUpdatedAt || Date.now();
      setSynced(true);
      setLastSynced(remoteUpdatedAt || Date.now());
    }, (e) => {
      logger.warn('[useTutorPersistence] Error en onSnapshot de hilo:', e);
    });

    return () => {
      isMounted = false;
      try { unsub(); } catch { /* noop */ }
    };
  }, [fsEnabled, userId, threadId, max, storageKey, metaKey]);

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
