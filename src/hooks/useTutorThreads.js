import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, isConfigValid } from '../firebase/config';
import logger from '../utils/logger';

const MAX_THREADS_PER_TEXT_DEFAULT = 5;
const MAX_SEED_MESSAGES = 40;
const REMOTE_MESSAGE_BATCH = 120;
const EMPTY = [];

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

function truncateTitle(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Nuevo hilo';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

function normalizeSeedMessages(raw, max = MAX_SEED_MESSAGES) {
  const seen = new Set();
  const baseClock = Date.now();
  return (Array.isArray(raw) ? raw : [])
    .map((m, index) => {
      const role = m?.r || m?.role || 'assistant';
      const content = String(m?.c || m?.content || '');
      const explicitId = String(m?.id || m?.mid || '').trim();
      const baseId = explicitId || `seed_${baseClock}_${index}`;
      let id = baseId;
      let suffix = 1;
      while (seen.has(id)) {
        id = `${baseId}_${suffix}`;
        suffix += 1;
      }
      seen.add(id);
      return {
        id,
        r: role,
        c: content,
        clientCreatedAtMs: baseClock + index
      };
    })
    .filter((m) => m.c)
    .slice(-max);
}

function buildIndexKey(userId, courseScope, textHash) {
  return `tutorThreadIndex:${userId}:${courseScope}:${textHash}`;
}

function buildActiveKey(userId, courseScope, textHash) {
  return `tutorActiveThread:${userId}:${courseScope}:${textHash}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* noop */ }
}

function buildThreadMeta(snapshotDoc) {
  const data = snapshotDoc.data() || {};
  const title = truncateTitle(data.title);
  const updatedAtMs = toMillis(data.updatedAt);
  return {
    id: snapshotDoc.id,
    title,
    textHash: data.textHash,
    courseScope: data.courseScope,
    updatedAtMs,
    createdAtMs: toMillis(data.createdAt),
    messageCount: Number.isFinite(data.messageCount) ? data.messageCount : 0
  };
}

export default function useTutorThreads(options = {}) {
  const {
    userId,
    courseScope = 'free',
    textHash = 'tutor_empty',
    enabled = true,
    maxThreads = MAX_THREADS_PER_TEXT_DEFAULT,
  } = options;

  const syncEnabled = Boolean(enabled && userId && userId !== 'guest' && isConfigValid);
  const [threads, setThreads] = useState(EMPTY);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [loading, setLoading] = useState(syncEnabled);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const indexKey = useMemo(() => buildIndexKey(userId || 'guest', courseScope, textHash), [userId, courseScope, textHash]);
  const activeKey = useMemo(() => buildActiveKey(userId || 'guest', courseScope, textHash), [userId, courseScope, textHash]);

  useEffect(() => {
    const cachedThreads = readJson(indexKey, EMPTY);
    if (Array.isArray(cachedThreads) && cachedThreads.length > 0) {
      setThreads(cachedThreads.slice(0, maxThreads));
    } else {
      setThreads(EMPTY);
    }

    const cachedActive = readJson(activeKey, null);
    setActiveThreadId(typeof cachedActive === 'string' ? cachedActive : null);
  }, [indexKey, activeKey, maxThreads]);

  useEffect(() => {
    if (!syncEnabled) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const ref = collection(db, 'users', userId, 'tutorThreads');
    const q = query(
      ref,
      where('textHash', '==', textHash),
      where('courseScope', '==', courseScope),
      orderBy('updatedAt', 'desc'),
      limit(maxThreads)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map(buildThreadMeta);
      if (!mountedRef.current) return;
      setThreads(next);
      writeJson(indexKey, next);

      setActiveThreadId((prev) => {
        const existsPrev = prev && next.some((t) => t.id === prev);
        if (existsPrev) return prev;
        const cached = readJson(activeKey, null);
        if (cached && next.some((t) => t.id === cached)) return cached;
        const fallback = next[0]?.id || null;
        writeJson(activeKey, fallback);
        return fallback;
      });

      setLoading(false);
      setError(null);
    }, (err) => {
      logger.warn('[useTutorThreads] Error en onSnapshot:', err);
      if (!mountedRef.current) return;
      setLoading(false);
      setError(err);
    });

    return () => {
      try { unsubscribe(); } catch { /* noop */ }
    };
  }, [syncEnabled, userId, textHash, courseScope, maxThreads, indexKey, activeKey]);

  const persistActiveSelection = useCallback((threadId) => {
    setActiveThreadId(threadId || null);
    writeJson(activeKey, threadId || null);
  }, [activeKey]);

  const selectThread = useCallback((threadId) => {
    if (!threadId) return;
    persistActiveSelection(threadId);
  }, [persistActiveSelection]);

  const clearThreadMessagesRemote = useCallback(async (threadIdToClear) => {
    if (!syncEnabled || !threadIdToClear) return;
    const messagesRef = collection(db, 'users', userId, 'tutorThreads', threadIdToClear, 'messages');
    let hasMore = true;
    while (hasMore) {
      const snap = await getDocs(query(messagesRef, limit(REMOTE_MESSAGE_BATCH)));
      if (!snap.docs.length) return;
      await Promise.all(snap.docs.map((row) => deleteDoc(row.ref)));
      hasMore = snap.docs.length >= REMOTE_MESSAGE_BATCH;
    }
  }, [syncEnabled, userId]);

  const createThread = useCallback(async (initialMessages = []) => {
    const now = Date.now();
    const nonce = Math.random().toString(36).slice(2, 7);
    const threadId = `${courseScope}_${textHash}_${now}_${nonce}`;
    const seedMessages = normalizeSeedMessages(initialMessages, MAX_SEED_MESSAGES);

    const userPrompt = seedMessages.find((m) => m.r === 'user') || null;
    const title = truncateTitle(userPrompt?.c || 'Nuevo hilo');

    const payload = {
      title,
      textHash,
      courseScope,
      messageCount: seedMessages.length,
      storageModel: 'append_v1',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const nowThread = {
      id: threadId,
      title,
      textHash,
      courseScope,
      updatedAtMs: now,
      createdAtMs: now,
      messageCount: seedMessages.length
    };

    // Activar hilo localmente de inmediato para evitar escribir en "no-thread"
    // mientras Firestore responde (latencia/red lenta).
    setThreads((prev) => {
      const deduped = [nowThread, ...prev.filter((t) => t.id !== threadId)].slice(0, maxThreads);
      writeJson(indexKey, deduped);
      return deduped;
    });
    persistActiveSelection(threadId);

    if (syncEnabled) {
      try {
        const threadRef = doc(db, 'users', userId, 'tutorThreads', threadId);
        await setDoc(threadRef, payload, { merge: true });

        if (seedMessages.length > 0) {
          const seedWrites = seedMessages.map((msg) => {
            const messageRef = doc(db, 'users', userId, 'tutorThreads', threadId, 'messages', msg.id);
            return setDoc(messageRef, {
              id: msg.id,
              r: msg.r,
              c: msg.c,
              clientCreatedAtMs: msg.clientCreatedAtMs,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          });
          await Promise.all(seedWrites);
        }

        const ref = collection(db, 'users', userId, 'tutorThreads');
        const cleanupQuery = query(
          ref,
          where('textHash', '==', textHash),
          where('courseScope', '==', courseScope),
          orderBy('updatedAt', 'desc')
        );
        const all = await getDocs(cleanupQuery);
        if (all.size > maxThreads) {
          const toDelete = all.docs.slice(maxThreads);
          await Promise.all(toDelete.map(async (d) => {
            const staleId = d.id || d.ref?.id;
            await clearThreadMessagesRemote(staleId);
            await deleteDoc(d.ref);
          }));
        }
      } catch (err) {
        logger.warn('[useTutorThreads] No se pudo crear hilo en Firestore:', err);
        setError(err);
      }
    }

    return threadId;
  }, [syncEnabled, courseScope, textHash, userId, maxThreads, indexKey, persistActiveSelection, clearThreadMessagesRemote]);

  const deleteThread = useCallback(async (threadId) => {
    if (!threadId) return;

    if (syncEnabled) {
      try {
        await clearThreadMessagesRemote(threadId);
        await deleteDoc(doc(db, 'users', userId, 'tutorThreads', threadId));
      } catch (err) {
        logger.warn('[useTutorThreads] No se pudo eliminar hilo:', err);
        setError(err);
      }
    }

    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== threadId);
      writeJson(indexKey, next);
      setActiveThreadId((prevActive) => {
        if (prevActive !== threadId) return prevActive;
        const nextId = next[0]?.id || null;
        writeJson(activeKey, nextId);
        return nextId;
      });
      return next;
    });
  }, [syncEnabled, userId, indexKey, activeKey, clearThreadMessagesRemote]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  return {
    threads,
    activeThread,
    activeThreadId,
    loading,
    error,
    selectThread,
    createThread,
    deleteThread,
  };
}
