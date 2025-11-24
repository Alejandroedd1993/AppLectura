import { segmentText, hashText } from '../../src/services/segmentTextService';

describe('segmentTextService', () => {
  const sample = `Primera línea.\n\nSegunda línea corta.\nTercera línea que es un poco más larga y debería permanecer como parte del mismo párrafo porque no hay doble salto aquí.\n\nPárrafo extra muy corto.\nOtro corto.\n\nÚltimo párrafo extremadamente largo que deberíamos dividir en caso de que supere el máximo permitido, pero para esta prueba mantendremos la longitud moderada.`;

  it('segmenta y devuelve metadatos básicos', () => {
    const res = segmentText(sample);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(2);
    res.forEach((p, i) => {
      expect(typeof p.id).toBe('string');
      expect(p.index).toBe(i);
      expect(typeof p.content).toBe('string');
      expect(p.content.length).toBeGreaterThan(5);
    });
  });

  it('produce hash estable para el mismo texto', () => {
    const h1 = hashText(sample);
    const h2 = hashText(sample + ' '); // espacio extra al final se normaliza
    expect(h1).toBe(h2);
  });

  it('maneja texto vacío', () => {
    expect(segmentText('')).toEqual([]);
  });
});
