import { buildValidationErrorPayload } from '../../../server/utils/validationError.js';

describe('validationError util', () => {
  test('construye payload con contrato semantico y extras', () => {
    expect(buildValidationErrorPayload({
      error: 'Texto vacio',
      mensaje: 'Debes enviar texto.',
      codigo: 'EMPTY_TEXT',
      field: 'texto'
    })).toEqual({
      ok: false,
      error: 'Texto vacio',
      mensaje: 'Debes enviar texto.',
      message: 'Debes enviar texto.',
      codigo: 'EMPTY_TEXT',
      errorInfo: {
        code: 'EMPTY_TEXT',
        message: 'Debes enviar texto.'
      },
      field: 'texto'
    });
  });

  test('omite details cuando no se envian', () => {
    expect(buildValidationErrorPayload({
      error: 'JSON invalido',
      mensaje: 'Payload mal formado.',
      codigo: 'INVALID_JSON_PAYLOAD'
    })).toEqual({
      ok: false,
      error: 'JSON invalido',
      mensaje: 'Payload mal formado.',
      message: 'Payload mal formado.',
      codigo: 'INVALID_JSON_PAYLOAD',
      errorInfo: {
        code: 'INVALID_JSON_PAYLOAD',
        message: 'Payload mal formado.'
      }
    });
  });
});