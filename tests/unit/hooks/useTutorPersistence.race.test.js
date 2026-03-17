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

function makeSnapshot(messages, updatedAtMs) {
  return {
    exists: () => true,
    data: () => ({
      messages,
      updatedAt: { toMillis: () => updatedAtMs },
    }),
  };
}

function Harness({ threadId = 't1', storageKey = 'tutorHistorial:test-r13', onState }) {
  const state = useTutorPersistence({
    storageKey,
    max: 40,
    syncEnabled: true,
    userId: 'u1',
    courseScope: 'courseA',
    textHash: 'hashA',
    threadId,
    debounceMs: 10,
  });

  useEffect(() => {
    if (typeof onState === 'function') onState(state);
  }, [state, onState]);

  return <div data-testid="ok">ok</div>;
}

describe('useTutorPersistence race guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    snapshotListener = null;
    mockWriteBatch.mockReturnValue(mockBatch);
    mockBatch.commit.mockReturnValue(Promise.resolve());

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

  test('no reprograma flush del hilo anterior despues de cambiar de thread', async () => {
    let latestState = null;
    let resolveFirstBatchCommit;
    let firstBatchCommitPending = true;

    mockBatch.commit.mockImplementation(() => {
      if (firstBatchCommitPending) {
        firstBatchCommitPending = false;
        return new Promise((resolve) => { resolveFirstBatchCommit = resolve; });
      }
      return Promise.resolve();
    });

    const { rerender } = render(
      <Harness
        threadId="t1"
        storageKey="tutorHistorial:test-r13:t1"
        onState={(state) => { latestState = state; }}
      />
    );

    await waitFor(() => {
      expect(latestState).toBeTruthy();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      latestState.handleMessagesChange([{ role: 'user', content: 'mensaje t1' }]);
    });

    let pendingFlushT1;
    await act(async () => {
      pendingFlushT1 = latestState.flushNow();
    });

    await waitFor(() => {
      expect(typeof resolveFirstBatchCommit).toBe('function');
    });

    rerender(
      <Harness
        threadId="t2"
        storageKey="tutorHistorial:test-r13:t2"
        onState={(state) => { latestState = state; }}
      />
    );

    await waitFor(() => {
      expect(latestState).toBeTruthy();
    });

    await act(async () => {
      latestState.handleMessagesChange([{ role: 'user', content: 'mensaje t2' }]);
      await latestState.flushNow();
    });

    const writesToT2BeforeResolve = mockSetDoc.mock.calls.filter(
      ([ref, payload]) => ref?.path === 'users/u1/tutorThreads/t2' && payload?.storageModel === 'append_v1'
    ).length;

    await act(async () => {
      resolveFirstBatchCommit();
      await pendingFlushT1;
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    const writesToT2AfterResolve = mockSetDoc.mock.calls.filter(
      ([ref, payload]) => ref?.path === 'users/u1/tutorThreads/t2' && payload?.storageModel === 'append_v1'
    ).length;

    expect(writesToT2AfterResolve).toBe(writesToT2BeforeResolve);
  });
});
