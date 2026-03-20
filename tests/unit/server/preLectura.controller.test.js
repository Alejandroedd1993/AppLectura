import { createFallbackAnalysis } from '../../../server/services/preLecturaFallback.service.js';

describe('preLectura.controller fallback sanitization', () => {
  test('createFallbackAnalysis no expone mensajes internos y conserva solo un codigo seguro', () => {
    const analysis = createFallbackAnalysis(
      'Texto de prueba',
      1234,
      'PRELECTURA_PARSE_ERROR',
      null
    );

    expect(analysis._isFallback).toBe(true);
    expect(analysis.metadata.error).toBe(true);
    expect(analysis.metadata.errorCode).toBe('PRELECTURA_PARSE_ERROR');
    expect(analysis._errorCode).toBe('PRELECTURA_PARSE_ERROR');
    expect(analysis.metadata.errorMessage).toBe('Analisis fallback generado por un error interno controlado.');
    expect(analysis._errorMessage).toBe('Analisis fallback generado por un error interno controlado.');
    expect(JSON.stringify(analysis)).not.toContain('parseError');
    expect(JSON.stringify(analysis)).not.toContain('stack');
    expect(JSON.stringify(analysis)).not.toContain('Error parseando respuesta IA');
  });
});
