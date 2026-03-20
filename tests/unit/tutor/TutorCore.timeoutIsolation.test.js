import {
  clearTimeoutRef,
  resetStreamPersistWindow,
  scheduleAbortTimeout,
  shouldNotifyStreamUpdate,
} from '../../../src/components/tutor/streamRuntime';

describe('TutorCore stream runtime helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('el timeout programado aborta solo el controller asociado a esa llamada', () => {
    const timeoutIdRef = { current: null };
    const firstController = new AbortController();
    const secondController = new AbortController();

    scheduleAbortTimeout(timeoutIdRef, firstController, 30000);
    jest.advanceTimersByTime(1000);

    clearTimeoutRef(timeoutIdRef);
    scheduleAbortTimeout(timeoutIdRef, secondController, 30000);

    jest.advanceTimersByTime(29000);

    expect(firstController.signal.aborted).toBe(false);
    expect(secondController.signal.aborted).toBe(false);

    jest.advanceTimersByTime(1000);

    expect(firstController.signal.aborted).toBe(false);
    expect(secondController.signal.aborted).toBe(true);
  });

  test('resetear la ventana de persistencia restablece el umbral del nuevo stream', () => {
    const lastStreamPersistRef = { current: 1200 };

    expect(
      shouldNotifyStreamUpdate({
        notify: false,
        now: 2000,
        lastPersistAt: lastStreamPersistRef.current,
        intervalMs: 3000,
      })
    ).toBe(false);

    resetStreamPersistWindow(lastStreamPersistRef);

    expect(lastStreamPersistRef.current).toBe(0);
    expect(
      shouldNotifyStreamUpdate({
        notify: false,
        now: 2000,
        lastPersistAt: lastStreamPersistRef.current,
        intervalMs: 3000,
      })
    ).toBe(false);
    expect(
      shouldNotifyStreamUpdate({
        notify: false,
        now: 3200,
        lastPersistAt: lastStreamPersistRef.current,
        intervalMs: 3000,
      })
    ).toBe(true);
  });
});
