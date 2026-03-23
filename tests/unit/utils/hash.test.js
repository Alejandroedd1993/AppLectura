import { buildDistributedFingerprint, buildEdgeFingerprint, compactTextHash, hashStringDjb2, legacyContentHash, simpleTextHash } from '../../../src/utils/hash';

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

  test('buildEdgeFingerprint combina extremos y longitud de forma estable', () => {
    expect(buildEdgeFingerprint('')).toBe('0');
    expect(buildEdgeFingerprint('abcdef', { headChars: 2, tailChars: 2 })).toBe('ab::ef::6');
    expect(buildEdgeFingerprint('abcdef', { headChars: 3, tailChars: 0, includeLength: false })).toBe('abc');
  });

  test('buildDistributedFingerprint toma muestras repartidas y preserva el texto corto', () => {
    expect(buildDistributedFingerprint('abc', { sampleSize: 10 })).toBe('abc');

    const long = 'a'.repeat(1500) + 'MID' + 'b'.repeat(1500) + 'END';
    const fingerprint = buildDistributedFingerprint(long, { sampleSize: 300 });

    expect(fingerprint.length).toBe(300);
    expect(fingerprint.startsWith('a'.repeat(100))).toBe(true);
    expect(fingerprint.includes('MID')).toBe(true);
    expect(fingerprint.endsWith('b'.repeat(97) + 'END')).toBe(true);
  });

  test('hashStringDjb2 soporta modo signed para compatibilidad legacy', () => {
    expect(hashStringDjb2('abc', { mode: 'signed', radix: 10 })).toBe('96354');
    expect(hashStringDjb2('x'.repeat(100), { mode: 'signed', radix: 10 })).toMatch(/^-?\d+$/);
  });
});