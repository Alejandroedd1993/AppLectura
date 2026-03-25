import {
  adminCleanupEnqueueRequestSchema,
  glossaryRequestSchema,
  assessmentBulkRequestSchema,
  assessmentEvaluateRequestSchema,
  chatCompletionRequestSchema,
  notesGenerateRequestSchema,
  preLectureRequestSchema,
  storageProxyQuerySchema,
  webSearchAnswerRequestSchema,
  webSearchRequestSchema
} from '../../../server/validators/requestSchemas.js';

describe('requestSchemas', () => {
  test('chatCompletionRequestSchema normaliza provider y mensajes', () => {
    const parsed = chatCompletionRequestSchema.parse({
      provider: ' OPENAI ',
      messages: [{ role: ' USER ', content: '  Hola mundo  ' }],
      temperature: '1.2',
      max_tokens: '300'
    });

    expect(parsed.provider).toBe('openai');
    expect(parsed.messages).toEqual([{ role: 'user', content: 'Hola mundo' }]);
    expect(parsed.temperature).toBeCloseTo(1.2);
    expect(parsed.max_tokens).toBe(300);
  });

  test('notesGenerateRequestSchema aplica defaults y coercion', () => {
    const parsed = notesGenerateRequestSchema.parse({
      texto: '  Texto para notas  ',
      numeroTarjetas: '5'
    });

    expect(parsed).toEqual(expect.objectContaining({
      texto: 'Texto para notas',
      api: 'openai',
      nivelAcademico: 'pregrado',
      tipoTexto: 'auto',
      numeroTarjetas: 5
    }));
  });

  test('assessmentEvaluateRequestSchema sanitiza tamanos y dimension', () => {
    const parsed = assessmentEvaluateRequestSchema.parse({
      texto: `  ${'a'.repeat(12050)}  `,
      respuesta: `  ${'b'.repeat(6020)}  `,
      dimension: ' ComprensionAnalitica '
    });

    expect(parsed.texto).toHaveLength(10000);
    expect(parsed.respuesta).toHaveLength(5000);
    expect(parsed.dimension).toBe('comprensionanalitica');
  });

  test('assessmentBulkRequestSchema limita el lote a 10 items', () => {
    const parsed = assessmentBulkRequestSchema.safeParse({
      items: Array.from({ length: 11 }, () => ({
        texto: 'x'.repeat(80),
        respuesta: 'y'.repeat(40),
        dimension: 'acd'
      }))
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].message).toBe('Reduce la cantidad de evaluaciones enviadas en una sola solicitud.');
  });

  test('preLectureRequestSchema conserva metadata y exige texto suficiente', () => {
    const parsed = preLectureRequestSchema.parse({
      text: 'x'.repeat(120),
      metadata: { source: 'manual' }
    });

    expect(parsed).toEqual({
      text: 'x'.repeat(120),
      metadata: { source: 'manual' }
    });
  });

  test('glossaryRequestSchema aplica default de maxTerms', () => {
    const parsed = glossaryRequestSchema.parse({
      text: 'x'.repeat(220)
    });

    expect(parsed.maxTerms).toBe(6);
  });

  test('webSearch schemas normalizan provider y maxResults', () => {
    const searchParsed = webSearchRequestSchema.parse({
      query: '  pobreza  ',
      maxResults: '7'
    });
    const answerParsed = webSearchAnswerRequestSchema.parse({
      query: '  pobreza  ',
      provider: ' OPENAI '
    });

    expect(searchParsed).toEqual(expect.objectContaining({ query: 'pobreza', maxResults: 7 }));
    expect(answerParsed.provider).toBe('openai');
  });

  test('storageProxyQuerySchema valida URLs absolutas', () => {
    const parsed = storageProxyQuerySchema.safeParse({ url: 'no-valida' });

    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].path).toEqual(['url']);
  });

  test('adminCleanupEnqueueRequestSchema aplica default processNow', () => {
    const parsed = adminCleanupEnqueueRequestSchema.parse({
      courseId: 'course-1',
      studentUid: 'student-1'
    });

    expect(parsed.processNow).toBe(true);
  });
});