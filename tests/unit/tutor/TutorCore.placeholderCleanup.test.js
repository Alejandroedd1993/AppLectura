/**
 * H2 FIX regression test: Streaming placeholder (▌) must be cleaned up
 * when a non-AbortError occurs during callBackendWith.
 *
 * Strategy: Render TutorCore with real hooks (no mock). Make fetch throw a
 * network error (not AbortError). Verify that:
 *   1. The ▌ placeholder message is removed from state.
 *   2. An error message (⚠️) is shown instead.
 *   3. loading returns to false.
 */

import React from 'react'; // eslint-disable-line no-unused-vars -- required for JSX
import { render, waitFor, act } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';

// We need to mock dependencies that TutorCore uses internally
jest.mock('../../../src/firebase/config', () => ({
  auth: { currentUser: null },
  db: {},
  isConfigValid: false,
}));
jest.mock('../../../src/utils/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../src/pedagogy/prompts/tutorSystemPrompts', () => ({
  VALID_INTENTS: [],
  SYSTEM_TOPIC_GUARD: 'GUARD',
  SYSTEM_EQUITY_GUARD: 'EQUITY',
  SYSTEM_ANTI_REDUNDANCY: 'ANTI_REDUNDANCY',
}));
jest.mock('../../../src/pedagogy/safety/tutorGuard', () => ({
  detectHateOrSlur: () => false,
  redactHateOrSlur: (t) => t,
  slurAppearsInContext: () => false,
  validateResponse: () => ({ isValid: true, errors: [] }),
}));
jest.mock('../../../src/utils/fetchWebSearch', () => ({
  fetchWebSearch: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../../src/pedagogy/tutor/studentNeedsAnalyzer', () => ({
  detectStudentNeeds: () => ({}),
}));
jest.mock('../../../src/hooks/usePedagogyIntegration', () => ({
  __esModule: true,
  default: () => ({ zdp: null, rew: null }),
}));

// Import after mocks
const TutorCore = require('../../../src/components/tutor/TutorCore').default; // eslint-disable-line no-unused-vars -- used in JSX: <TutorCore>

describe('TutorCore — H2 placeholder cleanup on non-AbortError', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('removes ▌ placeholder and shows ⚠️ error when fetch throws network error', async () => {
    // Track messages from TutorCore
    const messagesSnapshots = [];
    let latestApi = null;

    // Fetch returns a response that starts streaming, then the reader throws
    fetchMock.mockRejectOnce(new TypeError('Failed to fetch'));

    render(
      <TutorCore
        onMessagesChange={(msgs) => { messagesSnapshots.push(msgs.map(m => m.content)); }}
        backendUrl="http://localhost:3001"
      >
        {(api) => {
          latestApi = api;
          return (
            <div>
              {api.messages.map(m => (
                <div key={m.id} data-testid={`msg-${m.role}`}>{m.content}</div>
              ))}
              {api.loading && <div data-testid="loading">loading</div>}
            </div>
          );
        }}
      </TutorCore>
    );

    // Set context so sendPrompt works
    act(() => {
      latestApi.setContext({ fullText: 'texto de prueba', fragment: '' });
    });

    // Send a prompt that will trigger fetch → NetworkError
    await act(async () => {
      latestApi.sendPrompt('¿Qué es esto?');
      // Advance timers for retry backoff (1s, 2s) + timeouts
      // MAX_RETRIES=2, so it will retry twice then show error
    });

    // Advance past retry delays (1s first retry, 2s second retry)
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    await act(async () => {
      jest.advanceTimersByTime(2500);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // The final state should have: user message + error message, NO ▌ placeholder
    await waitFor(() => {
      const msgs = latestApi.messages;
      // There should be at least 2 messages (user + error)
      expect(msgs.length).toBeGreaterThanOrEqual(2);
      // No message should end with the streaming cursor ▌
      const hasPlaceholder = msgs.some(m => m.content.includes('▌'));
      expect(hasPlaceholder).toBe(false);
      // The last message should be an error (⚠️)
      const errorMsgs = msgs.filter(m => m.content.startsWith('⚠️'));
      expect(errorMsgs.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });

    // Loading should be false
    expect(latestApi.loading).toBe(false);
  });

  test('does NOT show error when AbortError occurs (intentional cancel)', async () => {
    let latestApi = null;

    // Fetch throws AbortError
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    fetchMock.mockRejectOnce(abortError);

    render(
      <TutorCore backendUrl="http://localhost:3001">
        {(api) => {
          latestApi = api;
          return (
            <div>
              {api.messages.map(m => (
                <div key={m.id}>{m.content}</div>
              ))}
            </div>
          );
        }}
      </TutorCore>
    );

    act(() => {
      latestApi.setContext({ fullText: 'texto', fragment: '' });
    });

    await act(async () => {
      latestApi.sendPrompt('pregunta test');
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // After AbortError, no error message should appear
    await waitFor(() => {
      const errorMsgs = latestApi.messages.filter(m => m.content.startsWith('⚠️'));
      expect(errorMsgs.length).toBe(0);
    });
  });
});
