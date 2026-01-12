/**
 * Configuración de Firebase
 * 
 * INSTRUCCIONES PARA CONFIGURAR:
 * 1. Ve a https://console.firebase.google.com/
 * 2. Crea un nuevo proyecto llamado "AppLectura" (o el nombre que prefieras)
 * 3. Habilita Authentication > Sign-in method > Email/Password y Google
 * 4. Habilita Firestore Database (modo producción)
 * 5. Habilita Storage
 * 6. Ve a Project Settings > General > Your apps > Web app
 * 7. Copia el objeto firebaseConfig y reemplaza las variables de entorno abajo
 * 8. Crea un archivo .env en la raíz del proyecto con estas variables
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import logger from '../utils/logger';

// Configuración de Firebase desde variables de entorno
export const isConfigValid = 
  process.env.REACT_APP_FIREBASE_API_KEY && 
  process.env.REACT_APP_FIREBASE_API_KEY !== 'YOUR_API_KEY' &&
  process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
  !process.env.REACT_APP_FIREBASE_AUTH_DOMAIN.includes('YOUR_PROJECT_ID');

logger.debug('🔍 [Firebase Config] Verificando variables de entorno:', {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY && process.env.REACT_APP_FIREBASE_API_KEY !== 'YOUR_API_KEY' ? '✅ Presente' : '❌ FALTANTE O INVÁLIDO',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN && !process.env.REACT_APP_FIREBASE_AUTH_DOMAIN.includes('YOUR_PROJECT_ID') ? '✅ Presente' : '❌ FALTANTE O INVÁLIDO',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? '✅ Presente' : '❌ FALTANTE',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? '✅ Presente' : '❌ FALTANTE',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? '✅ Presente' : '❌ FALTANTE',
  appId: process.env.REACT_APP_FIREBASE_APP_ID ? '✅ Presente' : '❌ FALTANTE'
});

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'YOUR_APP_ID'
};

// Validar configuración crítica
if (!isConfigValid) {
  logger.error('❌ [Firebase Config] La configuración de Firebase no es válida. Verifica tu archivo .env');
  // No lanzamos error aquí para permitir que la app cargue y muestre un mensaje amigable si es necesario,
  // pero los servicios de Firebase fallarán.
}

// Inicializar Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  logger.log('✅ Firebase initialized successfully');
} catch (error) {
  logger.error('❌ Error initializing Firebase:', error);
  throw error;
}

// Inicializar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Conectar a emuladores en desarrollo (opcional, para testing local)
if (process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
  logger.log('🔧 Conectando a emuladores Firebase...');
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export default app;

