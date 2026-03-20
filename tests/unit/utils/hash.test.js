import { compactTextHash, hashStringDjb2, legacyContentHash, simpleTextHash } from '../../../src/utils/hash';

describe('hash utils', () => {
  test('simpleTextHash conserva el formato base36 no firmado', () => {
    expect(simpleTextHash('')).toBe('0');
    expect(simpleTextHash('abc')).toBe(simpleTextHash('abc'));
    expect(simpleTextHash('abc')).not.toBe(simpleTextHash('abcd'));
  });

  test('legacyContentHash preserva la semantica absoluta usada por ids legacy', () => {
    expect(legacyContentHash('', { emptyValue: 'empty' })).toBe('empty');
    expect(legacyContentHash('abc', { emptyValue: '0' })).toMatch(/^[0-9a-z]+$/);
    expect(legacyContentHash('abc', { emptyValue: '0' })).toBe(hashStringDjb2('abc', {
      mode: 'absolute',
      radix: 36,
      emptyValue: '0',
    }));
  });

  test('compactTextHash permite limitar caracteres preservando determinismo', () => {
    const base = 'x'.repeat(200);
    expect(compactTextHash(base, { maxChars: 120 })).toBe(compactTextHash(base, { maxChars: 120 }));
    expect(compactTextHash(base, { maxChars: 10 })).not.toBe(compactTextHash(base, { maxChars: 120 }));
  });
});