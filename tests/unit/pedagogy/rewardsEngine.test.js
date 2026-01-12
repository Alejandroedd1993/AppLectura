import { RewardsEngine } from '../../../src/pedagogy/rewards/rewardsEngine';

describe('RewardsEngine anti-farming', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  test('EVALUATION_SUBMITTED deduplica cuando dedupe=true y resourceId está presente', () => {
    const engine = new RewardsEngine(localStorage);
    engine.setUserId('u_test');

    // Con resourceId, dedupe debería bloquear la segunda llamada
    const r1 = engine.recordEvent('EVALUATION_SUBMITTED', { resourceId: 'texto_1:eval' });
    const afterFirst = engine.getState().totalPoints;
    const r2 = engine.recordEvent('EVALUATION_SUBMITTED', { resourceId: 'texto_1:eval' });
    const afterSecond = engine.getState().totalPoints;

    expect(r1.totalEarned).toBeGreaterThan(0);
    expect(r2.totalEarned).toBe(0);
    expect(afterSecond).toBe(afterFirst);
  });

  test('deduplica solo cuando resourceId está presente', () => {
    const engine = new RewardsEngine(localStorage);
    engine.setUserId('u_test');

    const r1 = engine.recordEvent('TABLA_ACD_COMPLETED', { resourceId: 'texto_1' });
    const afterFirst = engine.getState().totalPoints;
    const r2 = engine.recordEvent('TABLA_ACD_COMPLETED', { resourceId: 'texto_1' });
    const afterSecond = engine.getState().totalPoints;

    expect(r1.totalEarned).toBeGreaterThan(0);
    expect(r2.totalEarned).toBe(0);

    // Solo debe sumar una vez (el primer evento puede incluir bonus por achievements)
    expect(afterSecond).toBe(afterFirst);
  });

  test('QUOTE_USED deduplica cuando resourceId está presente (evita farming por reevaluación)', () => {
    const engine = new RewardsEngine(localStorage);
    engine.setUserId('u_test');

    const r1 = engine.recordEvent('QUOTE_USED', { count: 2, resourceId: 't1:ResumenAcademico' });
    const afterFirst = engine.getState().totalPoints;
    const r2 = engine.recordEvent('QUOTE_USED', { count: 3, resourceId: 't1:ResumenAcademico' });
    const afterSecond = engine.getState().totalPoints;

    expect(r1.totalEarned).toBeGreaterThan(0);
    expect(r2.totalEarned).toBe(0);
    expect(afterSecond).toBe(afterFirst);
  });

  test('QUOTE_USED sigue sumando si NO hay resourceId', () => {
    const engine = new RewardsEngine(localStorage);
    engine.setUserId('u_test');

    engine.recordEvent('QUOTE_USED', { count: 1 });
    engine.recordEvent('QUOTE_USED', { count: 1 });

    const state = engine.getState();
    expect(state.totalPoints).toBeGreaterThanOrEqual(10);
  });

  test('WEB_SEARCH_USED usa dailyLimit en lugar de dedupe (permite hasta 10/día)', () => {
    const engine = new RewardsEngine(localStorage);
    engine.setUserId('u_test');

    // Sin dedupe, pero con dailyLimit: 10, ambas búsquedas deberían sumar puntos
    const r1 = engine.recordEvent('WEB_SEARCH_USED', { query: 'x', resourceId: 't1' });
    const afterFirst = engine.getState().totalPoints;
    const r2 = engine.recordEvent('WEB_SEARCH_USED', { query: 'y', resourceId: 't1' });
    const afterSecond = engine.getState().totalPoints;

    expect(r1.totalEarned).toBeGreaterThan(0);
    expect(r2.totalEarned).toBeGreaterThan(0); // dailyLimit permite múltiples usos
    expect(afterSecond).toBeGreaterThan(afterFirst);
  });

  test('ACD_STRATEGY_IDENTIFIED deduplica una vez por texto y estrategia cuando resourceId está presente', () => {
    const engine = new RewardsEngine(localStorage);
    engine.setUserId('u_test');

    const r1 = engine.recordEvent('ACD_STRATEGY_IDENTIFIED', { strategy: 'Voz Pasiva', resourceId: 't1:acd_strategy:voz_pasiva' });
    const afterFirst = engine.getState().totalPoints;
    const r2 = engine.recordEvent('ACD_STRATEGY_IDENTIFIED', { strategy: 'Voz Pasiva', resourceId: 't1:acd_strategy:voz_pasiva' });
    const afterSecond = engine.getState().totalPoints;

    expect(r1.totalEarned).toBeGreaterThan(0);
    expect(r2.totalEarned).toBe(0);
    expect(afterSecond).toBe(afterFirst);

    // Una estrategia distinta (resourceId distinto) sí debe sumar
    const r3 = engine.recordEvent('ACD_STRATEGY_IDENTIFIED', { strategy: 'Eufemismo', resourceId: 't1:acd_strategy:eufemismo' });
    expect(r3.totalEarned).toBeGreaterThan(0);
  });

  test('ACD_POWER_ANALYSIS deduplica una vez por texto cuando resourceId está presente', () => {
    const engine = new RewardsEngine(localStorage);
    engine.setUserId('u_test');

    const r1 = engine.recordEvent('ACD_POWER_ANALYSIS', { detectedTypes: ['dominance'], resourceId: 't1:acd_power' });
    const afterFirst = engine.getState().totalPoints;
    const r2 = engine.recordEvent('ACD_POWER_ANALYSIS', { detectedTypes: ['dominance', 'resistance'], resourceId: 't1:acd_power' });
    const afterSecond = engine.getState().totalPoints;

    expect(r1.totalEarned).toBeGreaterThan(0);
    expect(r2.totalEarned).toBe(0);
    expect(afterSecond).toBe(afterFirst);
  });
});
