/**
 * CORRECCIÓN: Tests unitarios para el módulo de pedagogía
 */

const { scheduleNext, createStudyItem, getDueItems, updateStudyItem } = require('../../src/pedagogy/spaced/scheduler');

describe('Scheduler - Aprendizaje Espaciado', () => {
  beforeEach(() => {
    // Reset Date para tests deterministas
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('scheduleNext aumenta intervalo con buena calidad', () => {
    const start = { interval: 0, repetition: 0, ef: 2.5 };
    const next = scheduleNext(start, 5); // Calidad perfecta
    
    expect(next.interval).toBeGreaterThanOrEqual(1);
    expect(next.repetition).toBeGreaterThanOrEqual(1);
    expect(typeof next.dueDate).toBe('string');
    expect(next.quality).toBe(5);
  });

  test('scheduleNext reinicia con mala calidad', () => {
    const start = { interval: 10, repetition: 3, ef: 2.5 };
    const next = scheduleNext(start, 2); // Calidad baja
    
    expect(next.interval).toBe(1); // Reinicia
    expect(next.repetition).toBe(0);
    expect(next.quality).toBe(2);
  });

  test('createStudyItem genera item válido', () => {
    const item = createStudyItem({
      content: 'Test content',
      dimension: 'comprensionAnalitica',
      anchor: { quote: 'test quote', paragraph: 1 }
    });
    
    expect(item.itemId).toBeDefined();
    expect(item.content).toBe('Test content');
    expect(item.dimension).toBe('comprensionAnalitica');
    expect(item.anchor.quote).toBe('test quote');
    expect(item.isActive).toBe(true);
  });

  test('getDueItems filtra correctamente', () => {
    const items = [
      createStudyItem({ content: 'Item 1' }),
      { ...createStudyItem({ content: 'Item 2' }), dueDate: '2024-01-02T00:00:00Z' },
      { ...createStudyItem({ content: 'Item 3' }), isActive: false }
    ];
    
    const due = getDueItems(items, new Date('2024-01-01T12:00:00Z'));
    
    expect(due).toHaveLength(1);
    expect(due[0].content).toBe('Item 1');
  });

  test('updateStudyItem actualiza correctamente', () => {
    const item = createStudyItem({ content: 'Test' });
    const updated = updateStudyItem(item, 4, { note: 'Good progress' });
    
    expect(updated.reviewCount).toBe(1);
    expect(updated.averageQuality).toBe(4);
    expect(updated.lastQuality).toBe(4);
    expect(updated.note).toBe('Good progress');
  });

  test('validación de calidad arroja error con valores inválidos', () => {
    const item = createStudyItem({ content: 'Test' });
    
    expect(() => scheduleNext(item, -1)).toThrow('Quality debe estar entre 0-5');
    expect(() => scheduleNext(item, 6)).toThrow('Quality debe estar entre 0-5');
    expect(() => scheduleNext(item, 'invalid')).toThrow('Quality debe estar entre 0-5');
  });
});

describe('Templates - Generación de Prompts', () => {
  // Estos tests requieren que los módulos usen ES6 imports
  test('buildTutorPrompt valida entrada', async () => {
    const { buildTutorPrompt, validateTutorInput } = await import('../../src/pedagogy/prompts/templates.js');
    
    const errors = validateTutorInput({
      pregunta: 'Test',
      texto: 'Texto muy corto'
    });
    
    expect(errors).toContain('Texto debe tener al menos 50 caracteres');
  });

  test('buildEvaluatorPrompt incluye rúbrica', async () => {
    const { buildEvaluatorPrompt } = await import('../../src/pedagogy/prompts/templates.js');
    
    const prompt = buildEvaluatorPrompt({
      respuesta: 'Respuesta de ejemplo del estudiante que es lo suficientemente larga',
      texto: 'Texto de referencia que también debe ser lo suficientemente largo para pasar la validación',
      dimension: 'comprensionAnalitica'
    });
    
    expect(prompt).toContain('Comprensión analítica');
    expect(prompt).toContain('Identifica tesis central');
    expect(prompt).toContain('ÚNICAMENTE con un JSON válido');
  });
});

describe('Rúbrica - Validación y Normalización', () => {
  test('normalizeDimensionInput maneja alias', async () => {
    const { normalizeDimensionInput } = await import('../../src/pedagogy/rubrics/criticalLiteracyRubric.js');
    
    expect(normalizeDimensionInput('comprensiónanal ítica')).toBe('comprensionAnalitica');
    expect(normalizeDimensionInput('ACD')).toBe('acd');
    expect(normalizeDimensionInput('invalid')).toBe('comprensionAnalitica'); // fallback
  });

  test('summarizeEvaluation valida y enriquece', async () => {
    const { summarizeEvaluation } = await import('../../src/pedagogy/rubrics/criticalLiteracyRubric.js');
    
    const evaluation = {
      dimension: 'comprensionAnalitica',
      score: 8,
      strengths: ['Good analysis'],
      improvements: ['Need more evidence'],
      evidence: ['Quote from text'],
      summary: 'Overall good work'
    };
    
    const result = summarizeEvaluation(evaluation);
    
    expect(result.valid).toBe(true);
    expect(result.key).toBe('comprensionAnalitica');
    expect(result.level).toBe(3); // score 8 -> level 3
    expect(result.descriptor).toContain('Adecuado');
  });

  test('summarizeEvaluation rechaza datos inválidos', async () => {
    const { summarizeEvaluation } = await import('../../src/pedagogy/rubrics/criticalLiteracyRubric.js');
    
    const invalid = {
      dimension: 'invalid_dimension',
      score: 'not_a_number'
    };
    
    const result = summarizeEvaluation(invalid);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Preguntas Socráticas', () => {
  test('generateSocraticQuestions crea preguntas ancladas', async () => {
    const { generateSocraticQuestions } = await import('../../src/pedagogy/questions/socratic.js');
    
    const anchors = [
      { cita: 'Test quote', parrafo: 1 },
      { cita: 'Another quote', parrafo: 2 }
    ];
    
    const result = generateSocraticQuestions({
      dimension: 'comprensionAnalitica',
      anchors,
      max: 3
    });
    
    expect(result.dimension).toBe('comprensionAnalitica');
    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].anchor).toBeDefined();
    expect(result.questions[0].anchoredQuestion).toContain('Test quote');
  });

  test('assessResponseQuality evalúa respuestas', async () => {
    const { assessResponseQuality } = await import('../../src/pedagogy/questions/socratic.js');
    
    const basicResponse = 'Sí, estoy de acuerdo.';
    const advancedResponse = 'Estoy de acuerdo porque "el texto menciona claramente" que los datos son confiables, aunque también debemos considerar las limitaciones metodológicas que el autor no aborda completamente.';
    
    const basic = assessResponseQuality(basicResponse);
    const advanced = assessResponseQuality(advancedResponse);
    
    expect(basic.level).toBe('basica');
    expect(advanced.level).toBe('avanzada');
    expect(advanced.score).toBeGreaterThan(basic.score);
  });
});