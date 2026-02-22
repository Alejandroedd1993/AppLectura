import admin from 'firebase-admin';

let cachedApp = null;
let initTried = false;
let initError = null;

function parseServiceAccountFromEnv() {
  const jsonRaw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (jsonRaw) {
    try {
      return JSON.parse(jsonRaw);
    } catch (error) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON inválido: ${error.message}`);
    }
  }

  const b64Raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim();
  if (b64Raw) {
    try {
      const decoded = Buffer.from(b64Raw, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_BASE64 inválido: ${error.message}`);
    }
  }

  return null;
}

function resolveProjectId() {
  return String(
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    ''
  ).trim() || undefined;
}

function ensureInitialized() {
  if (cachedApp) return cachedApp;
  if (initTried && !cachedApp) {
    if (initError) throw initError;
    throw new Error('Firebase Admin no inicializado');
  }

  initTried = true;

  try {
    const credentialJson = parseServiceAccountFromEnv();
    const projectId = resolveProjectId();

    const appOptions = {
      projectId
    };

    if (credentialJson) {
      appOptions.credential = admin.credential.cert(credentialJson);
    } else {
      appOptions.credential = admin.credential.applicationDefault();
    }

    cachedApp = admin.apps.length > 0
      ? admin.app()
      : admin.initializeApp(appOptions);

    initError = null;
    return cachedApp;
  } catch (error) {
    initError = error;
    throw error;
  }
}

export function isFirebaseAdminConfigured() {
  try {
    ensureInitialized();
    return true;
  } catch {
    return false;
  }
}

export function getAdminApp() {
  return ensureInitialized();
}

export function getAdminDb() {
  return getAdminApp().firestore();
}

export { admin };
