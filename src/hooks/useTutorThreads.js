import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, isConfigValid } from '../firebase/config';
import logger from '../utils/logger';

const MAX_THREADS_PER_TEXT_DEFAULT = 5;
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
        const existsPrev = prev && next.some(t => t.id === prev);
        if (existsPrev) return prev;
        const cached = readJson(activeKey, null);
        if (cached && next.some(t => t.id === cached)) return cached;
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

  const createThread = useCallback(async (initialMessages = []) => {
    const now = Date.now();
    const threadId = `${courseScope}_${textHash}_${now}`;

    const userPrompt = Array.isArray(initialMessages)
      ? initialMessages.find((m) => (m?.role || m?.r) === 'user')
      : null;

    const title = truncateTitle(userPrompt?.content || userPrompt?.c || 'Nuevo hilo');

    const payload = {
      title,
      textHash,
      courseScope,
      messageCount: Array.isArray(initialMessages) ? initialMessages.length : 0,
      messages: Array.isArray(initialMessages)
        ? initialMessages.map((m) => ({ r: m?.r || m?.role || 'assistant', c: String(m?.c || m?.content || '') })).filter((m) => m.c)
        : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (syncEnabled) {
      try {
        const threadRef = doc(db, 'users', userId, 'tutorThreads', threadId);
        await setDoc(threadRef, payload, { merge: true });

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
          await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
        }
      } catch (err) {
        logger.warn('[useTutorThreads] No se pudo crear hilo en Firestore:', err);
        setError(err);
      }
    }

    setThreads((prev) => {
      const nowThread = {
        id: threadId,
        title,
        textHash,
        courseScope,
        updatedAtMs: now,
        createdAtMs: now,
        messageCount: Array.isArray(initialMessages) ? initialMessages.length : 0
      };
      const deduped = [nowThread, ...prev.filter(t => t.id !== threadId)].slice(0, maxThreads);
      writeJson(indexKey, deduped);
      return deduped;
    });

    persistActiveSelection(threadId);
    return threadId;
  }, [syncEnabled, courseScope, textHash, userId, maxThreads, indexKey, persistActiveSelection]);

  const deleteThread = useCallback(async (threadId) => {
    if (!threadId) return;

    if (syncEnabled) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'tutorThreads', threadId));
      } catch (err) {
        logger.warn('[useTutorThreads] No se pudo eliminar hilo:', err);
        setError(err);
      }
    }

    setThreads((prev) => {
      const next = prev.filter(t => t.id !== threadId);
      writeJson(indexKey, next);
      setActiveThreadId((prevActive) => {
        if (prevActive !== threadId) return prevActive;
        const nextId = next[0]?.id || null;
        writeJson(activeKey, nextId);
        return nextId;
      });
      return next;
    });
  }, [syncEnabled, userId, indexKey, activeKey]);

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
