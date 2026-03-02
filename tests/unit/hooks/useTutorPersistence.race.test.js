import React from 'react';
import { render, waitFor } from '@testing-library/react';
import useTutorPersistence from '../../../src/hooks/useTutorPersistence';

const mockDoc = jest.fn(() => ({ path: 'users/u1/tutorThreads/t1' }));
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockServerTimestamp = jest.fn(() => ({ toMillis: () => Date.now() }));

let snapshotListener = null;

jest.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
}));

jest.mock('../../../src/firebase/config', () => ({
  db: {},
  isConfigValid: true,
}));

function makeSnapshot(messages, updatedAtMs) {
  return {
    exists: () => true,
    data: () => ({
      messages,
      updatedAt: { toMillis: () => updatedAtMs },
    }),
  };
}

function Harness() {
  useTutorPersistence({
    storageKey: 'tutorHistorial:test-r13',
    max: 40,
    syncEnabled: true,
    userId: 'u1',
    courseScope: 'courseA',
    textHash: 'hashA',
    threadId: 't1',
    debounceMs: 10,
  });
  return <div data-testid="ok">ok</div>;
}

describe('useTutorPersistence race guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    snapshotListener = null;

    const remoteMessages = [{ r: 'assistant', c: 'remoto' }];
    const remoteUpdatedAt = 9999999999999;

    mockGetDoc.mockResolvedValue(makeSnapshot(remoteMessages, remoteUpdatedAt));
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      snapshotListener = onNext;
      return () => {};
    });
  });

  test('no reaplica el mismo snapshot remoto cuando updatedAt ya fue adoptado (R13)', async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockOnSnapshot).toHaveBeenCalled();
    });

    const storageWritesAfterGetDoc = mockSetDoc.mock.calls.length;

    const repeatedSnapshot = makeSnapshot([{ r: 'assistant', c: 'remoto' }], 9999999999999);
    snapshotListener?.(repeatedSnapshot);

    await waitFor(() => {
      expect(mockSetDoc.mock.calls.length).toBe(storageWritesAfterGetDoc);
    });

    const historyWrites = mockSetDoc.mock.calls.filter(([, payload]) => Array.isArray(payload?.messages));
    expect(historyWrites.length).toBe(0);
  });
});
