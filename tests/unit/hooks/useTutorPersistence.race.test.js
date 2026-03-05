import React from 'react';
import { render, waitFor } from '@testing-library/react';
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
    mockGetDocs.mockResolvedValue({ docs: [] });
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
      expect(snapshotListener).toBeTruthy();
    });

    const writesAfterGetDoc = mockSetDoc.mock.calls.length;

    const repeatedSnapshot = makeSnapshot([{ r: 'assistant', c: 'remoto' }], 9999999999999);
    snapshotListener?.(repeatedSnapshot);

    await waitFor(() => {
      expect(mockSetDoc.mock.calls.length).toBe(writesAfterGetDoc);
    });
  });
});
