export function readBoundedIntEnv(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = Number.parseInt(String(process.env[name] || ''), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(raw, min), max);
}

export function truncateText(value, maxChars, { suffix = '...', trim = false } = {}) {
  const text = typeof value === 'string' ? (trim ? value.trim() : value) : '';
  if (!Number.isFinite(maxChars) || maxChars <= 0) return text;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}${suffix}`;
}

export function truncateTextWithNotice(value, maxChars, buildNotice) {
  const text = typeof value === 'string' ? value : '';
  if (!Number.isFinite(maxChars) || maxChars <= 0 || text.length <= maxChars) return text;
  const notice = typeof buildNotice === 'function' ? buildNotice(text.length) : '';
  return `${text.slice(0, maxChars)}${notice || ''}`;
}

export function limitItems(list, maxItems) {
  return Array.isArray(list) ? list.slice(0, maxItems) : [];
}

export default {
  limitItems,
  readBoundedIntEnv,
  truncateText,
  truncateTextWithNotice
};