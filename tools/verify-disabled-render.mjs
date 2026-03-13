import crypto from 'crypto';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { getAdminApp } from '../server/config/firebaseAdmin.js';

loadEnv({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
if (!apiKey) {
  throw new Error('Falta REACT_APP_FIREBASE_API_KEY');
}

const uid = `disabled-check-${crypto.randomUUID()}`;
const app = getAdminApp();

try {
  const customToken = await app.auth().createCustomToken(uid);

  const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });

  const signInBody = await signInRes.json();
  if (!signInRes.ok || !signInBody.idToken) {
    throw new Error(`No se pudo obtener idToken: ${JSON.stringify(signInBody)}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 2500));
  await app.auth().updateUser(uid, { disabled: true });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const response = await fetch('https://applectura-backend.onrender.com/api/chat/completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signInBody.idToken}`
    },
    body: JSON.stringify({})
  });

  const text = await response.text();
  console.log(JSON.stringify({ uid, status: response.status, body: text }, null, 2));
} finally {
  try {
    await app.auth().deleteUser(uid);
  } catch {
    // Ignorado: el helper es solo para verificacion puntual.
  }
}