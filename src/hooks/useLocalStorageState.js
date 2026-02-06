import { useCallback, useEffect, useRef, useState } from 'react';

// 🚀 PERF: Tiempo de debounce para escrituras en localStorage (ms).
// Evita escrituras en cada frame durante drag/resize.
const LS_WRITE_DEBOUNCE_MS = 300;

export default function useLocalStorageState(key, defaultValue, options = {}) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    legacyKeys = [],
    migrateLegacy = true,
  } = options;

  const ignoreNextWriteRef = useRef(false);
  const prevKeyRef = useRef(key);

  const resolveValueForKey = useCallback((targetKey) => {
    const fallback = typeof defaultValue === 'function' ? defaultValue() : defaultValue;

    const tryRead = (k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw == null) return { found: false };
        return { found: true, value: deserialize(raw) };
      } catch {
        return { found: false };
      }
    };

    // 1) Clave actual
    const direct = tryRead(targetKey);
    if (direct.found) return { value: direct.value, sourceKey: targetKey, migrated: false };

    // 2) Legacy (en orden)
    for (const legacyKey of Array.isArray(legacyKeys) ? legacyKeys : []) {
      const legacy = tryRead(legacyKey);
      if (legacy.found) {
        if (migrateLegacy) {
          try {
            localStorage.setItem(targetKey, serialize(legacy.value));
          } catch {
            // noop
          }
        }
        return { value: legacy.value, sourceKey: legacyKey, migrated: migrateLegacy };
      }
    }

    return { value: fallback, sourceKey: null, migrated: false };
  }, [defaultValue, deserialize, legacyKeys, migrateLegacy, serialize]);

  const [value, setValue] = useState(() => {
    return resolveValueForKey(key).value;
  });

  // Si cambia la key (p.ej. cambia userId), rehidratar desde storage para evitar fugas cross-user.
  useEffect(() => {
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    const next = resolveValueForKey(key).value;
    ignoreNextWriteRef.current = true;
    setValue(next);
  }, [key, resolveValueForKey]);

  const writeTimerRef = useRef(null);

  useEffect(() => {
    try {
      if (ignoreNextWriteRef.current) {
        ignoreNextWriteRef.current = false;
        return;
      }
      // 🚀 PERF: Debounce escrituras en localStorage para evitar I/O excesivo
      // durante operaciones rápidas (drag resize, sliders, etc.)
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(key, serialize(value));
        } catch {
          // noop
        }
      }, LS_WRITE_DEBOUNCE_MS);
    } catch {
      // noop
    }
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [key, value, serialize]);

  return [value, setValue];
}
