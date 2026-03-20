function coerceText(value) {
  return String(value || '');
}

export function hashStringDjb2(value, {
  maxChars = Infinity,
  mode = 'unsigned',
  radix = 36,
  emptyValue = '0',
} = {}) {
  const text = coerceText(value);
  if (!text) return emptyValue;

  const limit = Number.isFinite(maxChars) ? Math.max(0, maxChars) : text.length;
  let hash = 0;
  for (let index = 0; index < text.length && index < limit; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }

  if (mode === 'absolute') {
    return Math.abs(hash).toString(radix);
  }

  return (hash >>> 0).toString(radix);
}

export function simpleTextHash(value) {
  return hashStringDjb2(value, { mode: 'unsigned', radix: 36, emptyValue: '0' });
}

export function compactTextHash(value, { maxChars = 120 } = {}) {
  return hashStringDjb2(value, { maxChars, mode: 'unsigned', radix: 36, emptyValue: '0' });
}

export function legacyContentHash(value, { maxChars, emptyValue = 'empty' } = {}) {
  return hashStringDjb2(value, { maxChars, mode: 'absolute', radix: 36, emptyValue });
}