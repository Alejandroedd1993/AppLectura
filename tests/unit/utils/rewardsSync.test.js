import { decideInitialRewardsSyncAction, decideRealtimeRewardsSyncAction } from '../../../src/utils/rewardsSync';

describe('rewardsSync', () => {
  test('initial: prioriza push local cuando hay reset reciente', () => {
    expect(decideInitialRewardsSyncAction({
      localState: { totalPoints: 0, resetAt: 5000 },
      remoteState: { totalPoints: 20, resetAt: 1000 },
      now: 6000,
    })).toBe('push-local-reset');
  });

  test('initial: importa remoto si local esta vacio', () => {
    expect(decideInitialRewardsSyncAction({
      localState: { totalPoints: 0, resetAt: 0 },
      remoteState: { totalPoints: 30, lastInteraction: 1000 },
      now: 2000,
    })).toBe('import-remote');
  });

  test('initial: empuja local si tiene mas progreso en mismo reset epoch', () => {
    expect(decideInitialRewardsSyncAction({
      localState: { totalPoints: 50, resetAt: 1000, lastInteraction: 2000 },
      remoteState: { totalPoints: 30, resetAt: 1000, lastInteraction: 1500 },
      now: 4000,
    })).toBe('push-local');
  });

  test('realtime: no-op con reset local reciente', () => {
    expect(decideRealtimeRewardsSyncAction({
      localState: { totalPoints: 0, resetAt: 9000 },
      remoteState: { totalPoints: 20, resetAt: 1000 },
      now: 9500,
    })).toBe('noop');
  });

  test('realtime: importa remoto si es mas nuevo', () => {
    expect(decideRealtimeRewardsSyncAction({
      localState: { totalPoints: 20, lastInteraction: 1000, resetAt: 1000 },
      remoteState: { totalPoints: 20, lastInteraction: 5000, resetAt: 1000 },
      now: 7000,
    })).toBe('import-remote');
  });

  test('realtime: empuja local si tiene mas progreso cuando timestamps empatan', () => {
    expect(decideRealtimeRewardsSyncAction({
      localState: { totalPoints: 60, lastInteraction: 3000, resetAt: 1000 },
      remoteState: { totalPoints: 40, lastInteraction: 3000, resetAt: 1000 },
      now: 7000,
    })).toBe('push-local');
  });
});