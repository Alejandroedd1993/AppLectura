import { buildValidationErrorPayload } from '../../../server/utils/validationError.js';

describe('validationError util', () => {
  test('construye payload con contrato semantico y extras', () => {
    expect(buildValidationErrorPayload({
      error: 'Texto vacio',
      mensaje: 'Debes enviar texto.',
      codigo: 'EMPTY_TEXT',
      field: 'texto'
    })).toEqual({
      error: 'Texto vacio',
      mensaje: 'Debes enviar texto.',
      codigo: 'EMPTY_TEXT',
      field: 'texto'
    });
  });

  test('omite details cuando no se envian', () => {
    expect(buildValidationErrorPayload({
      error: 'JSON invalido',
      mensaje: 'Payload mal formado.',
      codigo: 'INVALID_JSON_PAYLOAD'
    })).toEqual({
      error: 'JSON invalido',
      mensaje: 'Payload mal formado.',
      codigo: 'INVALID_JSON_PAYLOAD'
    });
  });
});