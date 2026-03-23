function coerceText(value) {
  return String(value || '');
}

export function buildEdgeFingerprint(value, {
  headChars = 0,
  tailChars = 0,
  includeLength = true,
  separator = '::',
} = {}) {
  const text = coerceText(value);
  if (!text) return includeLength ? '0' : '';

  const head = headChars > 0 ? text.slice(0, headChars) : '';
  const tail = tailChars > 0 ? text.slice(Math.max(0, text.length - tailChars)) : '';
  const parts = [];

  if (head) parts.push(head);
  if (tail) parts.push(tail);
  if (includeLength) parts.push(String(text.length));

  return parts.join(separator) || (includeLength ? String(text.length) : text);
}

export function buildDistributedFingerprint(value, {
  sampleSize = 3000,
  includeLength = false,
} = {}) {
  const text = coerceText(value);
  if (!text) return includeLength ? '0' : '';

  if (text.length <= sampleSize) {
    return includeLength ? `${text}${text.length}` : text;
  }

  const firstPart = text.slice(0, Math.floor(sampleSize / 3));
  const middleStart = Math.floor(text.length / 2 - sampleSize / 6);
  const middlePart = text.slice(middleStart, middleStart + Math.floor(sampleSize / 3));
  const lastPart = text.slice(-Math.floor(sampleSize / 3));
  const fingerprint = firstPart + middlePart + lastPart;

  return includeLength ? `${fingerprint}${text.length}` : fingerprint;
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

  if (mode === 'signed') {
    return hash.toString(radix);
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