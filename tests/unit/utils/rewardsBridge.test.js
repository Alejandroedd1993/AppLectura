import { clearRewardsEngine, getRewardsEngine, setRewardsEngine } from '../../../src/utils/rewardsBridge';

describe('rewardsBridge', () => {
  afterEach(() => {
    clearRewardsEngine();
  });

  test('registra y recupera la instancia del rewards engine', () => {
    const engine = { exportState: jest.fn() };

    expect(setRewardsEngine(engine)).toBe(engine);
    expect(getRewardsEngine()).toBe(engine);
  });

  test('clearRewardsEngine no elimina otra instancia por accidente', () => {
    const engineA = { name: 'a' };
    const engineB = { name: 'b' };

    setRewardsEngine(engineA);
    clearRewardsEngine(engineB);
    expect(getRewardsEngine()).toBe(engineA);

    clearRewardsEngine(engineA);
    expect(getRewardsEngine()).toBeNull();
  });
});