import {
  limitItems,
  readBoundedIntEnv,
  truncateText,
  truncateTextWithNotice
} from '../../../server/utils/textLimits.js';

describe('textLimits util', () => {
  test('truncateText agrega sufijo por defecto cuando excede el maximo', () => {
    expect(truncateText('abcdefgh', 5)).toBe('abcde...');
  });

  test('truncateText permite sufijo vacio', () => {
    expect(truncateText('abcdefgh', 5, { suffix: '' })).toBe('abcde');
  });

  test('truncateTextWithNotice agrega nota con longitud original', () => {
    expect(truncateTextWithNotice('abcdefgh', 5, (len) => ` (${len})`)).toBe('abcde (8)');
  });

  test('limitItems recorta arrays y devuelve array vacio para otros valores', () => {
    expect(limitItems([1, 2, 3, 4], 2)).toEqual([1, 2]);
    expect(limitItems(null, 2)).toEqual([]);
  });

  test('readBoundedIntEnv respeta min y max', () => {
    const original = process.env.TEST_LIMIT;
    process.env.TEST_LIMIT = '999';

    expect(readBoundedIntEnv('TEST_LIMIT', 10, { min: 1, max: 100 })).toBe(100);

    if (original === undefined) {
      delete process.env.TEST_LIMIT;
    } else {
      process.env.TEST_LIMIT = original;
    }
  });
});