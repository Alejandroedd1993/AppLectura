import { RUBRIC } from '../rubrics/criticalLiteracyRubric.js';

/**
 * CORRECCIÓN: Plantillas centralizadas para evitar duplicación entre Tutor/Evaluador
 * Anclaje forzoso al texto y validación de entrada
 */

export function buildTutorPrompt({ pregunta, texto, anchors = [], dimension = null, idioma = 'es' }) {
  // CORRECCIÓN: Validar entradas y sanitizar
  if (!pregunta || typeof pregunta !== 'string') {
    throw new Error('Pregunta es requerida y debe ser string');
  }
  
  if (!texto || typeof texto !== 'string') {
    throw new Error('Texto es requerido y debe ser string');
  }

  // Limitar anchors y crear citas seguras
  const safeCitas = Array.isArray(anchors) 
    ? anchors.slice(0, 5).map((a, i) => {
        const cita = String(a.cita || '').slice(0, 200);
        const parrafo = Number(a.parrafo) || i + 1;
        return `• "${cita}" (párrafo ${parrafo})`;
      }).join('\n')
    : '';

  const foco = dimension && RUBRIC.dimensiones[dimension]
    ? `Enfoca tu guía en la dimensión: ${RUBRIC.dimensiones[dimension].nombre}.`
    : 'Enfócate en comprensión y clarificación progresiva.';

  return [
    `Actúa como tutor amigable en ${idioma}.`,
    'IMPORTANTE: No evalúes ni puntúes. Evita juicio; guía con preguntas socráticas.',
    foco,
    'Ancla tus preguntas al texto mediante citas breves y referencia de párrafo.',
    safeCitas ? `Evidencias ancla sugeridas:\n${safeCitas}` : '',
    `Pregunta del estudiante: ${pregunta.slice(0, 1000)}`,
    'Texto de referencia (fragmento):',
    texto.slice(0, 3000)
  ].filter(Boolean).join('\n\n');
}

export function getEvaluationSchema() {
  return {
    type: 'object',
    properties: {
      dimension: { 
        type: 'string',
        enum: Object.keys(RUBRIC.dimensiones)
      },
      score: { 
        type: 'number', 
        minimum: RUBRIC.escala.min, 
        maximum: RUBRIC.escala.max 
      },
      strengths: { 
        type: 'array', 
        items: { type: 'string', maxLength: 200 },
        maxItems: 10
      },
      improvements: { 
        type: 'array', 
        items: { type: 'string', maxLength: 200 },
        maxItems: 10
      },
      evidence: { 
        type: 'array', 
        items: { type: 'string', maxLength: 300 },
        maxItems: 10,
        minItems: 1
      },
      summary: { 
        type: 'string',
        maxLength: 1000
      }
    },
    required: ['dimension', 'score', 'strengths', 'improvements', 'evidence', 'summary']
  };
}

export function buildEvaluatorPrompt({ respuesta, texto, dimension, idioma = 'es' }) {
  // CORRECCIÓN: Validación estricta de entrada
  if (!respuesta || typeof respuesta !== 'string') {
    throw new Error('Respuesta del estudiante es requerida');
  }
  
  if (!texto || typeof texto !== 'string') {
    throw new Error('Texto de referencia es requerido');
  }

  if (!dimension || !RUBRIC.dimensiones[dimension]) {
    throw new Error(`Dimensión inválida: ${dimension}`);
  }

  const dim = RUBRIC.dimensiones[dimension];
  const criterios = dim.criterios.map(c => `- ${c}`).join('\n');
  const niveles = Object.entries(dim.niveles)
    .map(([k, v]) => `Nivel ${k}: ${v}`)
    .join('\n');

  return [
    `Eres un evaluador académico especializado en literacidad crítica (${idioma}).`,
    'TAREA: Evalúa la respuesta del estudiante usando la rúbrica específica.',
    'FORMATO: Responde ÚNICAMENTE con un JSON válido con las claves exactas del schema.',
    '',
    `DIMENSIÓN A EVALUAR: ${dim.nombre}`,
    '',
    'CRITERIOS DE EVALUACIÓN:',
    criterios,
    '',
    'DESCRIPTORES DE NIVEL:',
    niveles,
    '',
    'INSTRUCCIONES ESPECÍFICAS:',
    '- Asigna score entre 1-10 basado en los descriptores',
    '- En evidence[], cita fragmentos EXACTOS del texto como evidencia',
    '- En strengths[], destaca lo bien logrado según criterios',
    '- En improvements[], da feedback específico y accionable',
    '- summary debe ser conciso pero completo',
    '',
    'RESPUESTA DEL ESTUDIANTE:',
    respuesta.slice(0, 3000),
    '',
    'TEXTO DE REFERENCIA:',
    texto.slice(0, 4000)
  ].join('\n');
}

// CORRECCIÓN: Funciones de validación para prompts
export function validateTutorInput({ pregunta, texto, anchors, dimension }) {
  const errors = [];
  
  if (!pregunta || pregunta.trim().length < 5) {
    errors.push('Pregunta debe tener al menos 5 caracteres');
  }
  
  if (!texto || texto.trim().length < 50) {
    errors.push('Texto debe tener al menos 50 caracteres');
  }
  
  if (dimension && !RUBRIC.dimensiones[dimension]) {
    errors.push(`Dimensión inválida: ${dimension}`);
  }
  
  if (anchors && !Array.isArray(anchors)) {
    errors.push('Anchors debe ser un array');
  }
  
  return errors;
}

export function validateEvaluatorInput({ respuesta, texto, dimension }) {
  const errors = [];
  
  if (!respuesta || respuesta.trim().length < 20) {
    errors.push('Respuesta debe tener al menos 20 caracteres');
  }
  
  if (!texto || texto.trim().length < 50) {
    errors.push('Texto debe tener al menos 50 caracteres');
  }
  
  if (!dimension || !RUBRIC.dimensiones[dimension]) {
    errors.push(`Dimensión requerida y válida: ${dimension}`);
  }
  
  return errors;
}

// CORRECCIÓN: Timeout y abort controller para requests largos
export function createPromptWithTimeout(promptBuilder, params, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout después de ${timeoutMs}ms`));
    }, timeoutMs);
    
    try {
      const prompt = promptBuilder(params);
      clearTimeout(timeout);
      resolve({ prompt, controller });
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

export default {
  buildTutorPrompt,
  buildEvaluatorPrompt,
  getEvaluationSchema,
  validateTutorInput,
  validateEvaluatorInput,
  createPromptWithTimeout
};
