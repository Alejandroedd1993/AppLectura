/**
 * Tests unitarios básicos para unifiedAiService helpers
 */
import {
  parseJSONFromContent,
  extractContent,
  normalizeBackendErrorPayload
} from '../../src/services/unifiedAiService';

describe('unifiedAiService helpers', () => {
  test('extractContent retorna el contenido del primer choice', () => {
    const json = {
      choices: [
        { message: { content: 'Hola mundo' } }
      ]
    };
    expect(extractContent(json)).toBe('Hola mundo');
  });

  test('parseJSONFromContent parsea JSON simple', () => {
    const input = '{"a":1,"b":"x"}';
    expect(parseJSONFromContent(input)).toEqual({ a: 1, b: 'x' });
  });

  test('parseJSONFromContent elimina code fences ```json', () => {
    const input = '```json\n{\n  "ok": true\n}\n```';
    expect(parseJSONFromContent(input)).toEqual({ ok: true });
  });

  test('parseJSONFromContent intenta extraer el primer objeto JSON si hay ruido', () => {
    const input = 'texto antes {"k":42} texto después';
    expect(parseJSONFromContent(input)).toEqual({ k: 42 });
  });

  test('parseJSONFromContent retorna null cuando no hay JSON válido', () => {
    const input = 'sin json aquí';
    expect(parseJSONFromContent(input)).toBeNull();
  });

  test('normalizeBackendErrorPayload prioriza mensaje y codigo del backend', () => {
    const normalized = normalizeBackendErrorPayload({
      error: 'Token revocado',
      mensaje: 'La sesión fue revocada. Vuelve a iniciar sesión.',
      codigo: 'AUTH_TOKEN_REVOKED',
      requestId: 'req-123'
    }, { status: 401 });

    expect(normalized).toEqual(expect.objectContaining({
      status: 401,
      code: 'AUTH_TOKEN_REVOKED',
      backendError: 'Token revocado',
      message: 'La sesión fue revocada. Vuelve a iniciar sesión.',
      requestId: 'req-123'
    }));
  });

  test('normalizeBackendErrorPayload soporta envelope nuevo con errorInfo', () => {
    const normalized = normalizeBackendErrorPayload({
      ok: false,
      error: 'Respuesta invalida del proveedor',
      mensaje: 'La evaluacion no pudo interpretarse correctamente.',
      codigo: 'ASSESSMENT_INVALID_PROVIDER_RESPONSE',
      errorInfo: {
        code: 'ASSESSMENT_INVALID_PROVIDER_RESPONSE',
        message: 'La evaluacion no pudo interpretarse correctamente.',
        details: { degraded: true }
      },
      requestId: 'req-new'
    }, { status: 503 });

    expect(normalized).toEqual(expect.objectContaining({
      status: 503,
      code: 'ASSESSMENT_INVALID_PROVIDER_RESPONSE',
      backendError: 'Respuesta invalida del proveedor',
      message: 'La evaluacion no pudo interpretarse correctamente.',
      requestId: 'req-new',
      details: { degraded: true }
    }));
  });
});
