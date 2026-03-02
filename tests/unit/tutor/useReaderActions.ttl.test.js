/**
 * H3 FIX regression test: useReaderActions anti-duplicate hash must expire
 * after 3 seconds (TTL), allowing the same action+fragment to be re-sent.
 *
 * Strategy: Render a component that uses useReaderActions. Dispatch the same
 * reader-action event twice:
 *   1. First within 250ms → deduplicated (only 1 call)
 *   2. After 3s TTL expiry → allowed through (2 calls total)
 *   3. Immediately after that (<250ms) → debounced (still 2 calls)
 */

import React from 'react'; // eslint-disable-line no-unused-vars -- required for JSX
import { render, act } from '@testing-library/react';

jest.mock('../../../src/utils/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
}));

// Mock buildPromptFromAction since it's a dependency
jest.mock('../../../src/utils/readerActionPrompts', () => ({
  buildPromptFromAction: (action, text) => `${action}: ${text}`,
}));

const useReaderActions = require('../../../src/hooks/useReaderActions').default;

function TestHarness({ onPrompt }) { // eslint-disable-line no-unused-vars -- used in JSX via render(<TestHarness>)
  useReaderActions({ onPrompt });
  return <div data-testid="harness">ready</div>;
}

function dispatchReaderAction(action, text) {
  window.dispatchEvent(new CustomEvent('reader-action', {
    detail: { action, text }
  }));
}

describe('useReaderActions — H3 TTL anti-duplicate', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('allows same action+fragment after 3s TTL expiry', () => {
    const onPrompt = jest.fn();
    render(<TestHarness onPrompt={onPrompt} />);

    // First dispatch — should go through
    act(() => {
      dispatchReaderAction('explain', 'El texto seleccionado dice algo importante');
    });
    expect(onPrompt).toHaveBeenCalledTimes(1);

    // Second dispatch immediately (<250ms debounce) — should be deduplicated
    act(() => {
      jest.advanceTimersByTime(100);
      dispatchReaderAction('explain', 'El texto seleccionado dice algo importante');
    });
    expect(onPrompt).toHaveBeenCalledTimes(1); // Still 1

    // Advance past debounce but within TTL — same hash should still block
    act(() => {
      jest.advanceTimersByTime(500); // total ~600ms
      dispatchReaderAction('explain', 'El texto seleccionado dice algo importante');
    });
    expect(onPrompt).toHaveBeenCalledTimes(1); // Still 1 (within 3s TTL)

    // Advance past 3s TTL — same action should now go through
    act(() => {
      jest.advanceTimersByTime(2500); // total ~3100ms from first
      dispatchReaderAction('explain', 'El texto seleccionado dice algo importante');
    });
    expect(onPrompt).toHaveBeenCalledTimes(2); // Now 2!

    // Verify payload shape
    expect(onPrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'explain',
        fragment: 'El texto seleccionado dice algo importante',
        prompt: expect.any(String),
        ts: expect.any(Number),
      })
    );
  });

  test('different action on same fragment is not blocked', () => {
    const onPrompt = jest.fn();
    render(<TestHarness onPrompt={onPrompt} />);

    act(() => {
      dispatchReaderAction('explain', 'fragmento A');
    });
    expect(onPrompt).toHaveBeenCalledTimes(1);

    // Different action, same text — should go through immediately
    act(() => {
      jest.advanceTimersByTime(300); // past debounce
      dispatchReaderAction('summarize', 'fragmento A');
    });
    expect(onPrompt).toHaveBeenCalledTimes(2);
  });

  test('notes action is ignored (handled by ReadingWorkspace)', () => {
    const onPrompt = jest.fn();
    render(<TestHarness onPrompt={onPrompt} />);

    act(() => {
      dispatchReaderAction('notes', 'cualquier texto');
    });
    expect(onPrompt).toHaveBeenCalledTimes(0);

    // Also test Spanish alias
    act(() => {
      jest.advanceTimersByTime(300);
      dispatchReaderAction('notas', 'texto cualquiera');
    });
    expect(onPrompt).toHaveBeenCalledTimes(0);
  });
});
