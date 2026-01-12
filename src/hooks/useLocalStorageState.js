import { useCallback, useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    try {
      if (ignoreNextWriteRef.current) {
        ignoreNextWriteRef.current = false;
        return;
      }
      localStorage.setItem(key, serialize(value));
    } catch {
      // noop
    }
  }, [key, value, serialize]);

  return [value, setValue];
}
