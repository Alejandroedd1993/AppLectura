import React, { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import useTutorThreads from '../../../src/hooks/useTutorThreads';

const mockCollection = jest.fn(() => ({ path: 'users/u1/tutorThreads' }));
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockDoc = jest.fn((_db, ...segments) => ({ id: segments[segments.length - 1], path: segments.join('/') }));
const mockGetDocs = jest.fn(() => Promise.resolve({ size: 0, docs: [] }));
const mockLimit = jest.fn((n) => ({ type: 'limit', n }));
const mockOnSnapshot = jest.fn();
const mockOrderBy = jest.fn((f, d) => ({ type: 'orderBy', f, d }));
const mockQuery = jest.fn(() => ({ type: 'query' }));
const mockServerTimestamp = jest.fn(() => ({ toMillis: () => Date.now() }));
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockWhere = jest.fn((f, op, v) => ({ type: 'where', f, op, v }));

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  doc: (...args) => mockDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  limit: (...args) => mockLimit(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  orderBy: (...args) => mockOrderBy(...args),
  query: (...args) => mockQuery(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
  setDoc: (...args) => mockSetDoc(...args),
  where: (...args) => mockWhere(...args),
}));

jest.mock('../../../src/firebase/config', () => ({
  db: {},
  isConfigValid: true,
}));

function Harness({ onState }) {
  const state = useTutorThreads({
    userId: 'u1',
    courseScope: 'courseA',
    textHash: 'hashA',
    enabled: true,
    maxThreads: 5,
  });

  useEffect(() => {
    onState(state);
  }, [state, onState]);

  return <div data-testid="active-thread">{state.activeThreadId || ''}</div>;
}

describe('useTutorThreads createThread', () => {
  let latestState;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    latestState = null;
    mockSetDoc.mockImplementation(() => Promise.resolve());

    mockOnSnapshot.mockImplementation((_q, onNext) => {
      onNext({ docs: [] });
      return () => {};
    });
  });

  test('selecciona hilo activo localmente antes de que termine setDoc', async () => {
    let resolveSetDoc;
    mockSetDoc.mockImplementation(() => new Promise((resolve) => { resolveSetDoc = resolve; }));
    mockGetDocs.mockImplementation(() => Promise.resolve({ size: 1, docs: [{ ref: { id: 'only' } }] }));

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      expect(latestState).toBeTruthy();
      expect(latestState.loading).toBe(false);
    });

    let createPromise;
    act(() => {
      createPromise = latestState.createThread([]);
    });

    await waitFor(() => {
      expect(latestState.activeThreadId).toBeTruthy();
      expect(latestState.threads[0]?.id).toBe(latestState.activeThreadId);
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSetDoc();
      await createPromise;
    });
  });

  test('siembra mensajes iniciales en subcoleccion append-only', async () => {
    mockGetDocs.mockImplementation(() => Promise.resolve({ size: 1, docs: [{ id: 'only', ref: { id: 'only' } }] }));

    render(<Harness onState={(s) => { latestState = s; }} />);

    await waitFor(() => {
      expect(latestState).toBeTruthy();
      expect(latestState.loading).toBe(false);
    });

    await act(async () => {
      await latestState.createThread([
        { id: 'm-user', role: 'user', content: 'Hola' },
        { id: 'm-assistant', role: 'assistant', content: 'Respuesta' }
      ]);
    });
    const metadataWrite = mockSetDoc.mock.calls.find(([, payload]) => payload?.storageModel === 'append_v1');
    expect(metadataWrite).toBeTruthy();

    const messageWrites = mockSetDoc.mock.calls.filter(([, payload]) => Number.isFinite(payload?.clientCreatedAtMs));
    expect(messageWrites).toHaveLength(2);
    const writtenIds = messageWrites.map(([, payload]) => payload.id);
    expect(writtenIds).toEqual(expect.arrayContaining(['m-user', 'm-assistant']));
  });
});
