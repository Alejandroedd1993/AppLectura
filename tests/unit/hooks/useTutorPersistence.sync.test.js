import React, { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import useTutorPersistence from '../../../src/hooks/useTutorPersistence';

const mockCollection = jest.fn((_db, ...segments) => ({ path: segments.join('/') }));
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockDeleteField = jest.fn(() => ({ __deleteField: true }));
const mockDoc = jest.fn((_db, ...segments) => ({ id: segments[segments.length - 1], path: segments.join('/') }));
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn(() => Promise.resolve({ docs: [] }));
const mockLimit = jest.fn((n) => ({ type: 'limit', n }));
const mockOnSnapshot = jest.fn();
const mockOrderBy = jest.fn((field, direction) => ({ type: 'orderBy', field, direction }));
const mockQuery = jest.fn((ref, ...constraints) => ({ ref, constraints }));
const mockServerTimestamp = jest.fn(() => ({ toMillis: () => Date.now() }));
const mockSetDoc = jest.fn(() => Promise.resolve());

const mockBatch = {
  set: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve()),
};
const mockWriteBatch = jest.fn(() => mockBatch);

let snapshotListener = null;

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  deleteField: (...args) => mockDeleteField(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  limit: (...args) => mockLimit(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  orderBy: (...args) => mockOrderBy(...args),
  query: (...args) => mockQuery(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
  setDoc: (...args) => mockSetDoc(...args),
  writeBatch: (...args) => mockWriteBatch(...args),
}));

jest.mock('../../../src/firebase/config', () => ({
  db: {},
  isConfigValid: true,
}));

const STORAGE_KEY = 'tutorHistorial:sync-test';
const META_KEY = `tutorMeta:${STORAGE_KEY}`;

function makeSnapshot(messages, updatedAtMs) {
  return {
    exists: () => true,
    data: () => ({
      messages,
      updatedAt: { toMillis: () => updatedAtMs },
    }),
  };
}

function makeMessageDocs(rows = []) {
  return {
    docs: rows.map((row) => ({
      id: row.id,
      ref: { id: row.id, path: `users/u1/tutorThreads/t1/messages/${row.id}` },
      data: () => ({ ...row })
    }))
  };
}

function Harness({ onState }) {
  const state = useTutorPersistence({
    storageKey: STORAGE_KEY,
    max: 40,
    syncEnabled: true,
    userId: 'u1',
    courseScope: 'courseA',
    textHash: 'hashA',
    threadId: 't1',
    debounceMs: 10,
  });

  useEffect(() => {
    onState(state);
  }, [state, onState]);

  return <div data-testid="ok">ok</div>;
}

describe('useTutorPersistence cross-device sync', () => {
  let latestState;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    snapshotListener = null;
    latestState = null;

    // Re-configure mocks after clearAllMocks (which clears implementations)
    mockWriteBatch.mockReturnValue(mockBatch);
    mockBatch.commit.mockReturnValue(Promise.resolve());

    mockGetDoc.mockResolvedValue(makeSnapshot([], 1000));
    mockGetDocs.mockResolvedValue(makeMessageDocs([]));
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      snapshotListener = onNext;
      return () => {};
    });
  });

  test('aplica snapshot remoto valido aunque haya write local en curso', async () => {
    let resolveThreadWrite;
    mockSetDoc.mockImplementation((_ref, payload) => {
      if (payload?.storageModel === 'append_v1') {
        return new Promise((resolve) => { resolveThreadWrite = resolve; });
      }
      return Promise.resolve();
    });

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      expect(latestState).toBeTruthy();
      expect(snapshotListener).toBeTruthy();
    });

    await act(async () => {
      latestState.handleMessagesChange([{ role: 'user', content: 'Local en curso' }]);
    });

    let pendingFlush;
    await act(async () => {
      pendingFlush = latestState.flushNow();
    });

    await waitFor(() => {
      const hasThreadWrite = mockSetDoc.mock.calls.some(([, payload]) => payload?.storageModel === 'append_v1');
      expect(hasThreadWrite).toBe(true);
      expect(typeof resolveThreadWrite).toBe('function');
    });

    await act(async () => {
      snapshotListener(makeSnapshot([{ r: 'assistant', c: 'Cambio remoto' }], 2000));
    });

    await waitFor(() => {
      const contents = (latestState.initialMessages || []).map((m) => m.content);
      expect(contents).toContain('Cambio remoto');
    });

    await act(async () => {
      resolveThreadWrite();
      await pendingFlush;
    });
  });

  test('propaga clear remoto cuando el hilo local tenia mensajes', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ r: 'user', c: 'Mensaje local' }]));
    mockGetDoc.mockResolvedValue(makeSnapshot([{ r: 'user', c: 'Mensaje local' }], 1000));

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      const contents = (latestState?.initialMessages || []).map((m) => m.content);
      expect(contents).toContain('Mensaje local');
    });

    await act(async () => {
      snapshotListener(makeSnapshot([], 3000));
    });

    await waitFor(() => {
      expect(latestState.initialMessages || []).toHaveLength(0);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
    });
  });

  test('adopta remoto aunque meta local tenga timestamp mayor (clock skew)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(META_KEY, JSON.stringify({ updatedAtMs: 9999999999999 }));
    mockGetDoc.mockResolvedValue(makeSnapshot([{ r: 'assistant', c: 'Desde otro dispositivo' }], 1000));

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      const contents = (latestState?.initialMessages || []).map((m) => m.content);
      expect(contents).toContain('Desde otro dispositivo');
    });
  });

  test('mergea ramas divergentes en vez de pisar una de ellas', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ r: 'user', c: 'Base' }]));
    mockGetDoc.mockResolvedValue(makeSnapshot([{ r: 'user', c: 'Base' }], 1000));

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      const contents = (latestState?.initialMessages || []).map((m) => m.content);
      expect(contents).toContain('Base');
    });

    await act(async () => {
      latestState.handleMessagesChange([
        { role: 'user', content: 'Base' },
        { role: 'assistant', content: 'Rama local' }
      ]);
    });

    await act(async () => {
      snapshotListener(makeSnapshot([
        { r: 'user', c: 'Base' },
        { r: 'assistant', c: 'Rama remota' }
      ], 2000));
    });

    await waitFor(() => {
      const contents = (latestState.initialMessages || []).map((m) => m.content);
      expect(contents).toContain('Rama local');
      expect(contents).toContain('Rama remota');
    });
  });

  test('preserva IDs de mensaje al persistir en subcoleccion Firestore', async () => {
    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      expect(latestState).toBeTruthy();
    });

    // Esperar hidratación antes de flush para evitar que flushRemote compita con getDoc del effect.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      latestState.handleMessagesChange([
        { id: 'user-msg-1', role: 'user', content: 'Con ID estable' }
      ]);
    });

    await act(async () => {
      await latestState.flushNow();
    });

    // FIX: Mensajes ahora se escriben via writeBatch en lugar de setDoc individual.
    expect(mockBatch.commit).toHaveBeenCalled();
    const messageWrite = mockBatch.set.mock.calls.find(([, payload]) => payload?.id === 'user-msg-1');
    expect(messageWrite?.[1]?.id).toBe('user-msg-1');
  });

  test('limpia campo legacy messages al escribir metadata append-only', async () => {
    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      expect(latestState).toBeTruthy();
    });

    // Esperar hidratación antes de flush
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      latestState.handleMessagesChange([
        { id: 'meta-1', role: 'assistant', content: 'Payload metadata' }
      ]);
    });

    await act(async () => {
      await latestState.flushNow();
    });

    // FIX: Mensajes se escriben via writeBatch; metadata del thread via setDoc.
    expect(mockBatch.commit).toHaveBeenCalled();
    const metadataWrite = mockSetDoc.mock.calls.find(([, payload]) => payload?.storageModel === 'append_v1');
    expect(metadataWrite).toBeTruthy();
    expect(mockDeleteField).toHaveBeenCalled();
  });

  test('no colapsa mensajes distintos con mismo contenido si tienen IDs distintos', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'base-1', r: 'user', c: 'Base' }]));
    mockGetDoc.mockResolvedValue(makeSnapshot([{ id: 'base-1', r: 'user', c: 'Base' }], 1000));

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      const contents = (latestState?.initialMessages || []).map((m) => m.content);
      expect(contents).toContain('Base');
    });

    await act(async () => {
      latestState.handleMessagesChange([
        { id: 'base-1', role: 'user', content: 'Base' },
        { id: 'local-1', role: 'assistant', content: 'Duplicado' }
      ]);
    });

    await act(async () => {
      snapshotListener(makeSnapshot([
        { id: 'base-1', r: 'user', c: 'Base' },
        { id: 'remote-1', r: 'assistant', c: 'Duplicado' }
      ], 2000));
    });

    await waitFor(() => {
      const msgs = latestState.initialMessages || [];
      const ids = msgs.map((m) => m.id);
      expect(ids).toContain('local-1');
      expect(ids).toContain('remote-1');
    });
  });

  test('hidrata desde subcoleccion remota aunque thread.messages este vacio', async () => {
    mockGetDoc.mockResolvedValue(makeSnapshot([], 1500));
    mockGetDocs.mockResolvedValue(makeMessageDocs([
      { id: 'remote-sub-1', r: 'assistant', c: 'Desde subcoleccion', clientCreatedAtMs: 1234 }
    ]));

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      const contents = (latestState?.initialMessages || []).map((m) => m.content);
      expect(contents).toContain('Desde subcoleccion');
    });
  });
});
