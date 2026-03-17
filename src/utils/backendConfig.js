const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export function getBackendUrl() {
  return process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export function getBackendBaseUrl() {
  return getBackendUrl().replace(/\/+$/, '');
}

export function buildBackendUrl(path = '') {
  const normalizedPath = path
    ? (path.startsWith('/') ? path : `/${path}`)
    : '';

  return `${getBackendBaseUrl()}${normalizedPath}`;
}

export { DEFAULT_BACKEND_URL };