import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('Feature flag REACT_APP_DISABLE_LEGACY_INTERACTIVE', () => {
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