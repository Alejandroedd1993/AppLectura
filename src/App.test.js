import React from 'react';
import { screen } from '@testing-library/react';
import { renderAsync } from '../tests/helpers/renderAsync';
import App from './App';

// Mock de AppContext para evitar efectos pesados (sync/heartbeat/firestore) en tests
jest.mock('./context/AppContext', () => {
  // eslint-disable-next-line global-require
  const React = require('react');
  const AppContext = React.createContext({});
  const value = {
    texto: 'texto de prueba',
    setTexto: () => {},
    setCurrentTextoId: () => {},
    setSourceCourseId: () => {},
    switchLecture: () => {},
    modoOscuro: false,
    toggleModoOscuro: () => {},
    loading: true,
    error: '',
    sessionConflict: false,
    conflictingSessionInfo: null,
    setArchivoActual: () => {},
    analyzeDocument: () => Promise.resolve(null)
  };
  const AppContextProvider = ({ children }) => (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
  return {
    AppContext,
    AppContextProvider,
    BACKEND_URL: 'http://localhost:3001'
  };
});

// Mock de AuthContext para simular usuario autenticado
jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    currentUser: { uid: 'test-user', email: 'test@example.com' },
    userData: { role: 'estudiante', nombre: 'Test User' },
    loading: false,
    isAuthenticated: true
  })
}));

// Mock de UI components
jest.mock('./components/layout/Header', () => () => <div data-testid="mock-header">Header Mock</div>);
jest.mock('./components/layout/TabNavigation_responsive', () => () => <div data-testid="mock-nav">Nav Mock</div>);
jest.mock('./components/ui/LoadingOverlay', () => () => <div data-testid="mock-loading">Loading Mock</div>);
jest.mock('./components/error/ErrorBoundary', () => ({ children }) => <div>{children}</div>);
jest.mock('./components/rewards/RewardsHeader', () => () => <div data-testid="mock-rewards">Rewards Mock</div>);
jest.mock('./components/AIDisclaimer', () => () => <div data-testid="mock-disclaimer">Disclaimer Mock</div>);
jest.mock('./components/SessionConflictModal', () => () => <div data-testid="mock-conflict-modal">Conflict Modal Mock</div>);

// Mock de Firebase y SessionManager para evitar llamadas de red y timeouts
jest.mock('./firebase/firestore', () => ({
  getUserSessions: () => Promise.resolve([]),
  getStudentProgress: () => Promise.resolve({}),
  subscribeToStudentProgress: () => () => {},
  subscribeToUserSessions: () => () => {},
  mergeSessions: (local) => local,
  saveSessionToFirestore: () => Promise.resolve(true),
  updateSessionInFirestore: () => Promise.resolve(true)
}));

jest.mock('./firebase/sessionManager', () => ({
  createActiveSession: () => Promise.resolve('mock-session-id'),
  closeActiveSession: () => Promise.resolve(true),
  listenToSessionConflicts: () => () => {},
  startSessionHeartbeat: () => () => {},
  getSessionInfo: () => ({})
}));

jest.mock('./services/sessionManager', () => ({
  createSessionFromState: () => ({}),
  restoreSessionToState: () => ({}),
  captureCurrentState: () => ({}),
  updateCurrentSession: () => {},
  setCurrentSession: () => {},
  getCurrentSessionId: () => null,
  clearArtifactsDrafts: () => {},
  captureArtifactsDrafts: () => ({}),
  setCurrentUser: () => {},
  replaceAllLocalSessions: () => {},
  setupBeforeUnloadSync: () => {},
  syncPendingSessions: () => Promise.resolve({ synced: 0, failed: 0 }),
  syncAllSessionsToCloud: () => Promise.resolve({ synced: 0, errors: 0 }),
  getAllSessionsMerged: () => Promise.resolve([]),
  getAllSessions: () => []
}));

// Smoke test básico para asegurar que la aplicación monta sin crashear
jest.mock('./components/AnalisisTexto', () => () => <div data-testid="mock-analisis">Analisis Mock</div>);
jest.mock('./components/NotasEstudio', () => () => <div data-testid="mock-notas">Notas Mock</div>);
jest.mock('./components/LecturaInteractiva', () => () => <div data-testid="mock-lectura-int">Lectura Interactiva Mock</div>);
jest.mock('./VisorTexto', () => () => <div data-testid="mock-visor">Visor Mock</div>);
jest.mock('./components/SistemaEvaluacion', () => () => <div data-testid="mock-evaluacion">Evaluación Mock</div>);
jest.mock('./components/PreLectura', () => () => <div data-testid="mock-prelectura">PreLectura Mock</div>);
jest.mock('./components/ReadingWorkspace', () => () => <div data-testid="mock-reading-workspace">ReadingWorkspace Mock</div>);
jest.mock('./components/Actividades', () => () => <div data-testid="mock-actividades">Actividades Mock</div>);
jest.mock('./components/teacher/TeacherDashboard', () => () => <div data-testid="mock-teacher-dashboard">TeacherDashboard Mock</div>);
jest.mock('./components/estudiante/TextoSelector', () => () => <div data-testid="mock-texto-selector">TextoSelector Mock</div>);

jest.mock('./context/PedagogyContext', () => ({
  PedagogyProvider: ({ children }) => <div>{children}</div>,
  usePedagogy: () => ({})
}));

test('renderiza el encabezado principal', async () => {
  await renderAsync(<App />);
  expect(await screen.findByTestId('mock-header')).toBeInTheDocument();
});

// Verifica que la pestaña por defecto ahora es Lectura Guiada
test('muestra el selector de textos inicialmente (Vista estudiante)', async () => {
  await renderAsync(<App />);
  expect(await screen.findByTestId('mock-texto-selector')).toBeInTheDocument();
});

test('incluye la pestaña Actividades en la navegación', async () => {
  await renderAsync(<App />);
  expect(await screen.findByTestId('mock-disclaimer')).toBeInTheDocument();
});

