const DEFAULT_BACKEND_URL = 'http://localhost:3001';

function normalizeBackendUrl(value) {
  return String(value || DEFAULT_BACKEND_URL).trim() || DEFAULT_BACKEND_URL;
}

const BACKEND_URL = normalizeBackendUrl(process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL);
const BACKEND_BASE_URL = BACKEND_URL.replace(/\/+$/, '');

function getBackendUrl() {
  return BACKEND_URL;
}

function getBackendBaseUrl() {
  return BACKEND_BASE_URL;
}

function buildBackendUrl(path = '') {
  const normalizedPath = path
    ? (path.startsWith('/') ? path : `/${path}`)
    : '';

  return `${BACKEND_BASE_URL}${normalizedPath}`;
}

export {
  BACKEND_BASE_URL,
  BACKEND_URL,
  DEFAULT_BACKEND_URL,
  buildBackendUrl,
  getBackendBaseUrl,
  getBackendUrl,
};