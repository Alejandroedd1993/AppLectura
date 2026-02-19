import { auth } from '../firebase/config';
import { getBackendUrl } from './backendUtils';

export function buildBackendEndpoint(endpointPath = '') {
  const base = (getBackendUrl() || '').replace(/\/+$/, '');
  const normalized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${base}${normalized}`;
}

export async function getFirebaseAuthHeader() {
  try {
    const idToken = await auth?.currentUser?.getIdToken?.();
    return idToken ? { Authorization: `Bearer ${idToken}` } : {};
  } catch {
    return {};
  }
}

