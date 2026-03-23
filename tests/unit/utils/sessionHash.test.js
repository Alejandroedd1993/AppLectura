import { simpleHash } from '../../../src/utils/sessionHash';

describe('sessionHash legacy compatibility', () => {
  test('simpleHash ignora el orden de claves de primer nivel', () => {
    const left = { b: 1, a: 'x' };
    const right = { a: 'x', b: 1 };

    expect(simpleHash(left)).toBe(simpleHash(right));
  });

  test('simpleHash conserva la semantica legacy basada solo en claves del primer nivel', () => {
    const left = { a: { nested: 1 }, b: 2 };
    const right = { a: { other: 999 }, b: 2 };

    expect(simpleHash(left)).toBe(simpleHash(right));
  });
});