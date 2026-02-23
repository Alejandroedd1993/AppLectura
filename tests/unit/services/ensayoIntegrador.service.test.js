jest.mock('../../../src/services/unifiedAiService', () => {
  return {
    chatCompletion: jest.fn(async ({ provider }) => {
      return { __provider: provider, usage: { total_tokens: 10 } };
    }),
    extractContent: (json) => {
      return JSON.stringify({
        score: 8.5,
        nivel: 4,
        fortalezas: ['Buena estructura'],
        debilidades: ['Podría profundizar'],
        feedback_estructura: 'OK',
        feedback_contenido: 'OK',
        recomendaciones: ['Mejorar conclusión']
      });
    },
    parseJSONFromContent: (content) => JSON.parse(content)
  };
});

import { evaluateEssayDual, combineDualEssayEvaluations } from '../../../src/services/ensayoIntegrador.service';
import { chatCompletion } from '../../../src/services/unifiedAiService';

// 🆕 Textos válidos para pasar la validación de producción
const VALID_TEXT = 'Este es un texto base de prueba suficientemente largo para pasar la validación del servicio de evaluación de ensayos integrador.';
const buildValidEssay = () => {
  const quoteA = '"Esta cita extensa evidencia un marco ideológico explícito en el discurso público analizado"';
  const quoteB = '"La construcción retórica del texto prioriza ciertas voces y silencia otras perspectivas relevantes"';
  const quoteC = '"El argumento central del autor cambia su sentido cuando se considera el contexto histórico y social"';
  const coreSentence = 'Relaciono el resumen, el análisis, el mapa y la respuesta para sostener una lectura crítica con evidencias textuales y contexto histórico.';

  const paragraphs = [
    `${quoteA} ${Array(8).fill(coreSentence).join(' ')}`,
    `${quoteB} ${Array(8).fill(coreSentence).join(' ')}`,
    `${quoteC} ${Array(8).fill(coreSentence).join(' ')}`,
    `${Array(8).fill(coreSentence).join(' ')}`,
    `${Array(8).fill(coreSentence).join(' ')}`
  ];

  return paragraphs.join('\n\n');
};

const VALID_ESSAY = buildValidEssay();

describe('ensayoIntegrador.service', () => {
  test('combineDualEssayEvaluations promedia y unifica listas', () => {
    const combined = combineDualEssayEvaluations(
      { score: 8.3, fortalezas: ['A'], debilidades: ['X'], recomendaciones: ['R1'] },
      { score: 8.7, fortalezas: ['A', 'B'], debilidades: ['Y'], recomendaciones: ['R2'] }
    );

    expect(combined.score).toBe(8.5);
    expect(combined.nivel).toBe(3); // round(8.5/2.5)=3
    expect(combined.fortalezas).toEqual(expect.arrayContaining(['A', 'B']));
    expect(combined.debilidades).toEqual(expect.arrayContaining(['X', 'Y']));
    expect(combined.recomendaciones).toEqual(expect.arrayContaining(['R1', 'R2']));
  });

  test('evaluateEssayDual retorna estructura esperada', async () => {
    const out = await evaluateEssayDual({
      texto: VALID_TEXT,
      essayText: VALID_ESSAY,
      dimension: 'argumentacion'
    });

    expect(out.dimension).toBe('argumentacion');
    expect(out.score).toBe(8.5);
    expect(out.evaluators.deepseek.provider).toBe('deepseek');
    expect(out.evaluators.openai.provider).toBe('openai');
  });

  test('evaluateEssayDual retorna resultado parcial si falla un proveedor', async () => {
    chatCompletion.mockImplementationOnce(async ({ provider }) => {
      expect(provider).toBe('deepseek');
      return { __provider: provider, usage: { total_tokens: 10 } };
    });

    chatCompletion.mockImplementationOnce(async ({ provider }) => {
      expect(provider).toBe('openai');
      throw new Error('OpenAI caído');
    });

    const out = await evaluateEssayDual({
      texto: VALID_TEXT,
      essayText: VALID_ESSAY,
      dimension: 'argumentacion'
    });

    expect(out.dimension).toBe('argumentacion');
    expect(out.partial).toBe(true);
    expect(Array.isArray(out.failedProviders)).toBe(true);
    expect(out.failedProviders[0].provider).toBe('openai');
    expect(out.evaluators.deepseek.provider).toBe('deepseek');
    expect(out.evaluators.openai).toBeNull();
    expect(out.score).toBe(8.5);
  });

  // 🆕 Hallazgo 3: Test de divergencia entre evaluadores
  test('combineDualEssayEvaluations promedia correctamente scores muy divergentes', () => {
    // Caso: DeepSeek da 9.0, OpenAI da 5.0 (diferencia de 4 puntos)
    const combined = combineDualEssayEvaluations(
      { score: 9.0, fortalezas: ['Excelente análisis'], debilidades: [], recomendaciones: [] },
      { score: 5.0, fortalezas: [], debilidades: ['Falta profundidad'], recomendaciones: ['Mejorar argumentos'] }
    );

    // Promedio: (9.0 + 5.0) / 2 = 7.0
    expect(combined.score).toBe(7);
    // Nivel: round(7.0 / 2.5) = round(2.8) = 3
    expect(combined.nivel).toBe(3);
    // Fortalezas y debilidades se unen
    expect(combined.fortalezas).toContain('Excelente análisis');
    expect(combined.debilidades).toContain('Falta profundidad');
    expect(combined.recomendaciones).toContain('Mejorar argumentos');
    // Ambos evaluadores presentes
    expect(combined.evaluators.deepseek.score).toBe(9.0);
    expect(combined.evaluators.openai.score).toBe(5.0);
  });

  test('combineDualEssayEvaluations maneja caso extremo (0 vs 10)', () => {
    const combined = combineDualEssayEvaluations(
      { score: 10, fortalezas: ['Perfecto'], debilidades: [], recomendaciones: [] },
      { score: 0, fortalezas: [], debilidades: ['Todo mal'], recomendaciones: ['Rehacer'] }
    );

    // Promedio: (10 + 0) / 2 = 5.0
    expect(combined.score).toBe(5);
    // Nivel: round(5.0 / 2.5) = 2
    expect(combined.nivel).toBe(2);
  });
});
