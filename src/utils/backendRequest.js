import { auth } from '../firebase/config';
import { buildBackendUrl } from './backendConfig';

export function buildBackendEndpoint(endpointPath = '') {
  return buildBackendUrl(endpointPath);
}

export async function getFirebaseAuthHeader() {
  try {
    const idToken = await auth?.currentUser?.getIdToken?.();
    return idToken ? { Authorization: `Bearer ${idToken}` } : {};
  } catch {
    return {};
  }
}

