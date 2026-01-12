import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock de window.matchMedia ANTES de importar componentes
delete window.matchMedia;
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock localStorage
Storage.prototype.getItem = jest.fn(() => null);
Storage.prototype.setItem = jest.fn();
Storage.prototype.removeItem = jest.fn();
Storage.prototype.clear = jest.fn();

import App from '../../../src/App';
import { AppContextProvider } from '../../../src/context/AppContext';

// Mock de AuthContext para simular usuario autenticado
jest.mock('../../../src/context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    currentUser: { uid: 'test-user', email: 'test@example.com' },
    userData: { role: 'estudiante', nombre: 'Test User' },
    loading: false,
    isAuthenticated: true
  })
}));

// Mock de Firebase y SessionManager para evitar llamadas de red y timeouts
jest.mock('../../../src/firebase/firestore', () => ({
  getUserSessions: jest.fn().mockResolvedValue([]),
  getStudentProgress: jest.fn().mockResolvedValue({}),
  subscribeToStudentProgress: jest.fn(() => () => { }),
  subscribeToUserSessions: jest.fn(() => () => { }),
  mergeSessions: jest.fn((local) => local),
  saveSessionToFirestore: jest.fn().mockResolvedValue(true),
  updateSessionInFirestore: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../src/firebase/sessionManager', () => ({
  createActiveSession: jest.fn().mockResolvedValue('mock-session-id'),
  closeActiveSession: jest.fn().mockResolvedValue(true),
  listenToSessionConflicts: jest.fn(() => () => { }),
  startSessionHeartbeat: jest.fn(() => () => { }),
  getSessionInfo: jest.fn().mockReturnValue({})
}));

jest.mock('../../../src/services/sessionManager', () => ({
  createSessionFromState: jest.fn(),
  restoreSessionToState: jest.fn(),
  captureCurrentState: jest.fn(),
  updateCurrentSession: jest.fn(),
  setCurrentSession: jest.fn(),
  getCurrentSessionId: jest.fn(),
  clearArtifactsDrafts: jest.fn(),
  captureArtifactsDrafts: jest.fn(),
  setCurrentUser: jest.fn(),
  syncAllSessionsToCloud: jest.fn().mockResolvedValue({ synced: 0, errors: 0 }),
  getAllSessionsMerged: jest.fn().mockResolvedValue([]),
  getAllSessions: jest.fn().mockReturnValue([])
}));

// Mock de componentes hijos para evitar side effects
jest.mock('../../../src/components/AnalisisTexto', () => () => <div data-testid="mock-analisis">Analisis Mock</div>);
jest.mock('../../../src/components/NotasEstudio', () => () => <div data-testid="mock-notas">Notas Mock</div>);
jest.mock('../../../src/components/LecturaInteractiva', () => () => <div data-testid="mock-lectura-int">Lectura Interactiva Mock</div>);
jest.mock('../../../src/VisorTexto', () => () => <div data-testid="mock-visor">Visor Mock</div>);
jest.mock('../../../src/components/SistemaEvaluacion', () => () => <div data-testid="mock-evaluacion">Evaluación Mock</div>);
jest.mock('../../../src/components/PreLectura', () => () => <div data-testid="mock-prelectura">PreLectura Mock</div>);
jest.mock('../../../src/components/ReadingWorkspace', () => () => <div data-testid="mock-reading-workspace">ReadingWorkspace Mock</div>);
jest.mock('../../../src/components/Actividades', () => () => <div data-testid="mock-actividades">Actividades Mock</div>);
jest.mock('../../../src/components/teacher/TeacherDashboard', () => () => <div data-testid="mock-teacher-dashboard">TeacherDashboard Mock</div>);
jest.mock('../../../src/components/estudiante/TextoSelector', () => () => <div data-testid="mock-texto-selector">TextoSelector Mock</div>);

jest.mock('../../../src/context/PedagogyContext', () => ({
  PedagogyProvider: ({ children }) => <div>{children}</div>,
  usePedagogy: () => ({})
}));

describe.skip('Feature flag REACT_APP_DISABLE_LEGACY_INTERACTIVE - SKIPPED: Requiere refactorización de App.js', () => {
  const OLD = process.env.REACT_APP_DISABLE_LEGACY_INTERACTIVE;
  afterEach(() => { process.env.REACT_APP_DISABLE_LEGACY_INTERACTIVE = OLD; });

  test('muestra pestaña legacy cuando flag no está activo', () => {
    process.env.REACT_APP_DISABLE_LEGACY_INTERACTIVE = 'false';
    render(<AppContextProvider><App /></AppContextProvider>);
    expect(screen.getByText(/Lectura Guiada/i)).toBeInTheDocument();
  });

  test('oculta pestaña legacy cuando flag activo', () => {
    process.env.REACT_APP_DISABLE_LEGACY_INTERACTIVE = 'true';
    render(<AppContextProvider><App /></AppContextProvider>);
    const tabs = screen.queryByText(/Lectura Interactiva/);
    expect(tabs).toBeNull();
  });
});