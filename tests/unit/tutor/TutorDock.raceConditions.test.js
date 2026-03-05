import React from 'react';
import { render, waitFor } from '@testing-library/react';
import TutorDock from '../../../src/components/tutor/TutorDock';
import { AppContext } from '../../../src/context/AppContext';
import { generateTextHash } from '../../../src/utils/cache';

const mockApi = {
  messages: [],
  loading: false,
  setContext: jest.fn(),
  loadMessages: jest.fn(),
  cancelPending: jest.fn(),
  clear: jest.fn(),
  sendPrompt: jest.fn(),
  sendAction: jest.fn(),
  generateSessionSummary: jest.fn(),
  regenerateLastResponse: jest.fn(),
};

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ currentUser: null }),
}));

jest.mock('../../../src/components/tutor/TutorCore', () => ({
  __esModule: true,
  default: ({ children }) => children(mockApi),
}));

function dispatchStorageLikeEvent({ key, newValue }) {
  const ev = new Event('storage');
  Object.defineProperty(ev, 'storageArea', { value: localStorage });
  Object.defineProperty(ev, 'key', { value: key });
  Object.defineProperty(ev, 'newValue', { value: newValue });
  window.dispatchEvent(ev);
}

function renderDock(texto = 'Texto carrera tutor') {
  const value = {
    texto,
    setTexto: () => {},
    currentTextoId: 'lectura-race',
    sourceCourseId: 'course-race',
  };
  return render(
    <AppContext.Provider value={value}>
      <TutorDock followUps={false} />
    </AppContext.Provider>
  );
}

describe('TutorDock race conditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('hidrata mensajes remotos tardíos del mismo scope sin cancelar stream activo', async () => {
    const texto = 'Texto carrera A';
    renderDock(texto);

    await waitFor(() => {
      expect(mockApi.cancelPending).toHaveBeenCalled();
    });

    mockApi.cancelPending.mockClear();
    mockApi.loadMessages.mockClear();

    const textHash = generateTextHash(texto, 'tutor');
    const storageKey = `tutorHistorial:guest:course-race:${textHash}`;
    const remoteCompact = [{ r: 'assistant', c: 'Mensaje remoto tardío' }];

    dispatchStorageLikeEvent({ key: storageKey, newValue: JSON.stringify(remoteCompact) });

    await waitFor(() => {
      expect(mockApi.cancelPending).not.toHaveBeenCalled();
      expect(mockApi.loadMessages).toHaveBeenCalled();
      const firstArg = mockApi.loadMessages.mock.calls[0]?.[0] || [];
      expect(firstArg).toEqual([
        expect.objectContaining({ role: 'assistant', content: 'Mensaje remoto tardío' })
      ]);
    });
  });

  test('evita rehidratar de nuevo cuando llega el mismo payload remoto (B5)', async () => {
    const texto = 'Texto carrera B';
    renderDock(texto);

    const textHash = generateTextHash(texto, 'tutor');
    const storageKey = `tutorHistorial:guest:course-race:${textHash}`;
    const remoteCompact = [{ r: 'user', c: 'Persistido una vez' }];

    dispatchStorageLikeEvent({ key: storageKey, newValue: JSON.stringify(remoteCompact) });

    await waitFor(() => {
      expect(mockApi.loadMessages).toHaveBeenCalledTimes(1);
    });

    dispatchStorageLikeEvent({ key: storageKey, newValue: JSON.stringify(remoteCompact) });

    await waitFor(() => {
      expect(mockApi.loadMessages).toHaveBeenCalledTimes(1);
    });
  });
});
