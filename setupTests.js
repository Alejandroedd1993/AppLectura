// Configuración global para Jest
import '@testing-library/jest-dom';
import fetchMock from 'jest-fetch-mock';

// Mock global de IntersectionObserver para jsdom (estable, no jest.fn para evitar resets)
class MockIntersectionObserver {
  constructor() {}
  observe() {
    // no-op para pruebas
  }
  unobserve() {}
  disconnect() {}
}
const intersectionObserverValue = MockIntersectionObserver;
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: intersectionObserverValue,
  });
}
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: intersectionObserverValue,
});

// ============================================
// 🔥 MOCKS DE FIREBASE (REDUCCIÓN DE MEMORIA)
// ============================================
// Mock completo de Firebase para evitar cargar el SDK completo en tests
// Esto reduce ~200MB de memoria por test
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({}))
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: (auth, callback) => {
    // Simular usuario no autenticado
    callback(null);
    return () => {}; // unsubscribe estable
  },
  signOut: jest.fn(() => Promise.resolve()),
  connectAuthEmulator: jest.fn(),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
  signInWithPopup: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
  GoogleAuthProvider: jest.fn(),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  updateProfile: jest.fn(() => Promise.resolve())
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({ id: 'test-doc' })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-doc' })),
  onSnapshot: jest.fn((docRef, callback) => {
    // Simular snapshot vacío
    callback({ exists: () => false, data: () => ({}) });
    return jest.fn(); // unsubscribe
  }),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date) => ({ toDate: () => date }))
  }
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  connectStorageEmulator: jest.fn(),
  ref: jest.fn(() => ({})),
  uploadBytes: jest.fn(() => Promise.resolve({ ref: {} })),
  getDownloadURL: jest.fn(() => Promise.resolve('https://example.com/file.pdf')),
  deleteObject: jest.fn(() => Promise.resolve())
}));

// Mock de los módulos de Firebase de la app
jest.mock('./src/firebase/config.js', () => ({
  __esModule: true,
  isConfigValid: false,
  default: null,
  auth: { currentUser: null },
  db: {},
  storage: {}
}));

// Habilitar mocks de fetch
fetchMock.enableMocks();

// Respuesta por defecto estable para fetch en todos los tests.
// Importante: `resetMocks: true` puede borrar implementaciones de jest.fn,
// así que configuramos el mock antes de cada test.
beforeEach(() => {
  fetchMock.resetMocks();
  fetchMock.mockResponse(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Mock framer-motion antes de cualquier importación
jest.mock('framer-motion', () => {
  const React = require('react');
  
  const createMotionComponent = (tag) => {
    return React.forwardRef((props, ref) => {
      const { animate, initial, exit, transition, whileHover, whileTap, variants, ...otherProps } = props;
      return React.createElement(tag, { ...otherProps, ref });
    });
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'), 
      p: createMotionComponent('p'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      h3: createMotionComponent('h3'),
      button: createMotionComponent('button'),
      section: createMotionComponent('section'),
      article: createMotionComponent('article'),
      nav: createMotionComponent('nav'),
      header: createMotionComponent('header'),
      footer: createMotionComponent('footer'),
      aside: createMotionComponent('aside'),
      main: createMotionComponent('main'),
      ul: createMotionComponent('ul'),
      ol: createMotionComponent('ol'),
      li: createMotionComponent('li'),
      a: createMotionComponent('a'),
      img: createMotionComponent('img'),
      form: createMotionComponent('form'),
      input: createMotionComponent('input'),
      textarea: createMotionComponent('textarea'),
      select: createMotionComponent('select'),
      label: createMotionComponent('label'),
    },
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn(),
    }),
    useMotionValue: () => ({
      get: () => 0,
      set: jest.fn(),
    }),
  };
});

// Mock para ResizeObserver (estable, no jest.fn para evitar resets)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

// Mock de matchMedia (estable, no jest.fn para evitar resets)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function createInMemoryStorageMock() {
  const store = new Map();

  const api = {
    getItem: jest.fn((key) => {
      const k = String(key);
      return store.has(k) ? store.get(k) : null;
    }),
    setItem: jest.fn((key, value) => {
      const k = String(key);
      store.set(k, String(value));
    }),
    removeItem: jest.fn((key) => {
      const k = String(key);
      store.delete(k);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
    key: jest.fn((index) => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    }),
    hasOwnProperty: (key) => {
      const k = String(key);
      return store.has(k);
    },
    __getStore: () => store,
  };

  Object.defineProperty(api, 'length', {
    configurable: true,
    enumerable: true,
    get() {
      return store.size;
    },
  });

  return api;
}

// Mock de localStorage/sessionStorage (en memoria, consistente)
global.localStorage = createInMemoryStorageMock();
global.sessionStorage = createInMemoryStorageMock();

// Suprimir warnings de console en tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // Lista blanca de warnings a silenciar para mantener salida de test limpia
    const suppressed = [
      'Warning: `ReactDOMTestUtils.act` is deprecated',
      'Warning: A suspended resource finished loading inside a test',
      'Warning: An update to %s inside a test was not wrapped in act',
      'Warning: ReactDOM.render is deprecated',
      'Firebase Config', // Suprimir warnings de Firebase en tests
    ];
    if (suppressed.some(w => msg.includes(w))) return;
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// ============================================
// 🧹 CLEANUP AUTOMÁTICO (LIBERACIÓN DE MEMORIA)
// ============================================
import { cleanup } from '@testing-library/react';

afterEach(() => {
  // Limpiar componentes React montados
  cleanup();
  
  // Limpiar todos los mocks
  jest.clearAllMocks();
  
  // Limpiar timers
  jest.clearAllTimers();
  
  // Limpiar localStorage y sessionStorage mocks (si existen)
  const storages = [global.localStorage, global.sessionStorage].filter(Boolean);
  for (const s of storages) {
    try { s.getItem?.mockClear?.(); } catch { }
    try { s.setItem?.mockClear?.(); } catch { }
    try { s.removeItem?.mockClear?.(); } catch { }
    try { s.clear?.mockClear?.(); } catch { }
  }
  
  // Forzar garbage collection si está disponible (solo en modo --expose-gc)
  if (global.gc) {
    global.gc();
  }
});
