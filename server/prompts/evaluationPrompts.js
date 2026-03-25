import { truncateText } from '../utils/textLimits.js';

/**
 * ⭐ PROMPTS DE EVALUACIÓN CRITERIAL - Sistema de Literacidad Crítica
 * 
 * Este módulo contiene los prompts especializados para evaluar las 5 dimensiones
 * de literacidad crítica con feedback estructurado por criterio.
 * 
 * Alineado con: Affordance #3 - Feedback Criterial
 */

import { RUBRIC } from '../../src/pedagogy/rubrics/criticalLiteracyRubric.js';

/**
 * Genera schema JSON para evaluación criterial de UNA dimensión
 * Retorna evaluación estructurada por criterio individual
 */
export function getCriterialEvaluationSchema(dimensionKey) {
  const dimension = RUBRIC.dimensiones[dimensionKey];
  if (!dimension) {
    throw new Error(`Dimensión inválida: ${dimensionKey}`);
  }

  return {
    type: 'object',
    properties: {
      dimension: {
        type: 'string',
        enum: [dimensionKey],
        description: `Dimensión evaluada: ${dimension.nombre}`
      },
      scoreGlobal: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Puntuación global de la dimensión (1-10)'
      },
      nivel: {
        type: 'number',
        minimum: 1,
        maximum: 4,
        description: 'Nivel alcanzado: 1=Insuficiente, 2=Básico, 3=Adecuado, 4=Avanzado'
      },
      criteriosEvaluados: {
        type: 'array',
        description: 'Evaluación detallada de cada criterio',
        minItems: dimension.criterios.length,
        maxItems: dimension.criterios.length,
        items: {
          type: 'object',
          properties: {
            criterio: {
              type: 'string',
              description: 'Enunciado del criterio evaluado'
            },
            nivel: {
              type: 'number',
              minimum: 1,
              maximum: 4,
              description: 'Nivel alcanzado en este criterio específico'
            },
            evidencia: {
              type: 'array',
              description: 'Fragmentos textuales que demuestran cumplimiento o deficiencia',
              items: { type: 'string', maxLength: 300 },
              minItems: 1,
              maxItems: 3
            },
            fortalezas: {
              type: 'array',
              description: 'Aspectos positivos específicos de este criterio',
              items: { type: 'string', maxLength: 200 },
              minItems: 0,
              maxItems: 3
            },
            mejoras: {
              type: 'array',
              description: 'Sugerencias de mejora específicas y accionables',
              items: { type: 'string', maxLength: 200 },
              minItems: 1,
              maxItems: 3
            }
          },
          required: ['criterio', 'nivel', 'evidencia', 'fortalezas', 'mejoras']
        }
      },
      resumenDimension: {
        type: 'string',
        maxLength: 500,
        description: 'Síntesis del desempeño en esta dimensión'
      },
      siguientesPasos: {
        type: 'array',
        description: 'Recomendaciones prioritarias para mejorar',
        items: { type: 'string', maxLength: 150 },
        minItems: 2,
        maxItems: 4
      }
    },
    required: ['dimension', 'scoreGlobal', 'nivel', 'criteriosEvaluados', 'resumenDimension', 'siguientesPasos']
  };
}

/**
 * Construye prompt para evaluación criterial de UNA dimensión específica
 */
export function buildCriterialEvaluationPrompt({ respuesta, texto, dimensionKey, idioma = 'es' }) {
  // Validaciones
  if (!respuesta || typeof respuesta !== 'string' || respuesta.length < 20) {
    throw new Error('Respuesta del estudiante debe tener al menos 20 caracteres');
  }

  if (!texto || typeof texto !== 'string' || texto.length < 50) {
    throw new Error('Texto de referencia debe tener al menos 50 caracteres');
  }

  const dimension = RUBRIC.dimensiones[dimensionKey];
  if (!dimension) {
    throw new Error(`Dimensión inválida: ${dimensionKey}`);
  }

  // Construir lista de criterios con numeración
  const criteriosList = dimension.criterios
    .map((c, idx) => `${idx + 1}. ${c}`)
    .join('\n');

  // Construir descriptores de nivel
  const nivelesDescriptores = Object.entries(dimension.niveles)
    .map(([nivel, descriptor]) => `**Nivel ${nivel}**: ${descriptor}`)
    .join('\n\n');

  // Preguntas guía específicas
  const preguntasGuia = dimension.preguntasGuia
    ? dimension.preguntasGuia.map((p, idx) => `${idx + 1}. ${p}`).join('\n')
    : '';

  return `Eres un evaluador experto en literacidad crítica (${idioma}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TAREA: EVALUACIÓN CRITERIAL ESTRUCTURADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIMENSIÓN A EVALUAR: **${dimension.nombre}**
Descripción: ${dimension.descripcion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 CRITERIOS DE EVALUACIÓN (evalúa CADA UNO por separado)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${criteriosList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DESCRIPTORES DE NIVEL (1-4)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${nivelesDescriptores}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PREGUNTAS GUÍA PARA ORIENTAR LA EVALUACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${preguntasGuia}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 INSTRUCCIONES ESPECÍFICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Evalúa criterio por criterio** (no hagas evaluación global primero):
   - Para CADA criterio (hay ${dimension.criterios.length}), asigna nivel 1-4
   - Cita fragmentos EXACTOS de la respuesta del estudiante como evidencia
   - Identifica 1-3 fortalezas específicas del criterio
   - Proporciona 1-3 mejoras concretas y accionables

2. **En "evidencia"**:
   ✅ CORRECTO: "El estudiante cita: 'la economía está en crisis' (párrafo 2)"
   ❌ INCORRECTO: "El estudiante usó citas" (demasiado vago)

3. **En "fortalezas"**:
   ✅ CORRECTO: "Distingue claramente entre hecho ('PIB cayó 3%') y opinión ('economía en crisis')"
   ❌ INCORRECTO: "Bien hecho" (sin especificidad)

4. **En "mejoras"**:
   ✅ CORRECTO: "Intenta identificar la tesis central en el primer párrafo antes de analizar argumentos secundarios"
   ❌ INCORRECTO: "Debes mejorar tu comprensión" (sin orientación)

5. **Calcula scoreGlobal (1-10)**:
   - Promedia los niveles individuales de criterios
   - Mapea resultado a escala 1-10
   - Redondea al entero más cercano

6. **Determina nivel global (1-4)**:
   - score 1-4 → nivel 1 (Insuficiente)
   - score 5-6 → nivel 2 (Básico)
   - score 7-8 → nivel 3 (Adecuado)
   - score 9-10 → nivel 4 (Avanzado)

7. **En "siguientesPasos"**:
   - Prioriza 2-4 acciones concretas para mejorar
   - Ordena de más a menos urgente
   - Deben ser específicas y alcanzables

8. **FORMATO DE RESPUESTA**:
   - Responde ÚNICAMENTE con JSON válido
   - Usa las claves EXACTAS del schema
   - NO agregues comentarios fuera del JSON
   - NO uses markdown ni código de bloque

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 RESPUESTA DEL ESTUDIANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${truncateText(respuesta, 3000, { suffix: '' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 TEXTO DE REFERENCIA (para verificar citas y contexto)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${truncateText(texto, 4000, { suffix: '' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ahora evalúa la respuesta según los ${dimension.criterios.length} criterios especificados.
Responde SOLO con el JSON estructurado.`;
}

/**
 * Genera schema para evaluación COMPLETA de las 5 dimensiones
 */
export function getComprehensiveEvaluationSchema() {
  return {
    type: 'object',
    properties: {
      evaluaciones: {
        type: 'array',
        description: 'Evaluaciones individuales de las 5 dimensiones',
        minItems: 4, // comprensionAnalitica, acd, contextualizacion, argumentacion
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            dimension: {
              type: 'string',
              enum: Object.keys(RUBRIC.dimensiones)
            },
            scoreGlobal: { type: 'number', minimum: 1, maximum: 10 },
            nivel: { type: 'number', minimum: 1, maximum: 4 },
            criteriosEvaluados: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  criterio: { type: 'string' },
                  nivel: { type: 'number', minimum: 1, maximum: 4 },
                  evidencia: { type: 'array', items: { type: 'string' } },
                  fortalezas: { type: 'array', items: { type: 'string' } },
                  mejoras: { type: 'array', items: { type: 'string' } }
                },
                required: ['criterio', 'nivel', 'evidencia', 'mejoras']
              }
            },
            resumenDimension: { type: 'string' }
          },
          required: ['dimension', 'scoreGlobal', 'nivel', 'criteriosEvaluados', 'resumenDimension']
        }
      },
      scoreTotal: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Promedio de scores de todas las dimensiones'
      },
      nivelGeneral: {
        type: 'number',
        minimum: 1,
        maximum: 4,
        description: 'Nivel general del estudiante'
      },
      fortalezasGenerales: {
        type: 'array',
        description: 'Top 3-5 fortalezas transversales',
        items: { type: 'string', maxLength: 200 },
        minItems: 3,
        maxItems: 5
      },
      areasDeDesarrollo: {
        type: 'array',
        description: 'Top 3-5 áreas prioritarias de mejora',
        items: { type: 'string', maxLength: 200 },
        minItems: 3,
        maxItems: 5
      },
      recomendacionGeneral: {
        type: 'string',
        maxLength: 600,
        description: 'Síntesis y orientación pedagógica general'
      }
    },
    required: ['evaluaciones', 'scoreTotal', 'nivelGeneral', 'fortalezasGenerales', 'areasDeDesarrollo', 'recomendacionGeneral']
  };
}

/**
 * Construye prompt para evaluación comprehensiva de TODAS las dimensiones
 * (Usado cuando se requiere evaluación completa del perfil del estudiante)
 */
export function buildComprehensiveEvaluationPrompt({ respuesta, texto, idioma = 'es' }) {
  if (!respuesta || typeof respuesta !== 'string' || respuesta.length < 100) {
    throw new Error('Para evaluación comprehensiva, la respuesta debe tener al menos 100 caracteres');
  }

  if (!texto || typeof texto !== 'string' || texto.length < 200) {
    throw new Error('Para evaluación comprehensiva, el texto debe tener al menos 200 caracteres');
  }

  const dimensionesInfo = Object.entries(RUBRIC.dimensiones)
    .map(([key, dim]) => {
      const criterios = dim.criterios.map((c, i) => `   ${i + 1}. ${c}`).join('\n');
      return `
🔹 **${dim.nombre}** (clave: ${key})
   ${dim.descripcion}
   
   Criterios:
${criterios}
`;
    })
    .join('\n');

  return `Eres un evaluador experto en literacidad crítica (${idioma}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TAREA: EVALUACIÓN COMPREHENSIVA DE LITERACIDAD CRÍTICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Evalúa la respuesta del estudiante en las 4 DIMENSIONES de literacidad crítica:

${dimensionesInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 INSTRUCCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Evalúa CADA dimensión por separado**:
   - Para cada dimensión, evalúa todos sus criterios (ver lista arriba)
   - Asigna nivel 1-4 por criterio
   - Proporciona evidencias textuales específicas
   - Identifica fortalezas y mejoras concretas

2. **Calcula scores**:
   - scoreGlobal por dimensión: promedio de niveles de criterios, en escala 1-10
   - scoreTotal: promedio de scores de todas las dimensiones
   - nivelGeneral: convierte scoreTotal a nivel 1-4

3. **Identifica patrones transversales**:
   - fortalezasGenerales: 3-5 aspectos positivos que cruzan dimensiones
   - areasDeDesarrollo: 3-5 prioridades de mejora más urgentes

4. **Formato de respuesta**:
   - JSON válido sin comentarios externos
   - Claves exactas del schema
   - Evidencias textuales citadas literalmente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 RESPUESTA DEL ESTUDIANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${truncateText(respuesta, 4000, { suffix: '' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 TEXTO DE REFERENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${truncateText(texto, 5000, { suffix: '' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ahora evalúa las 4 dimensiones. Responde SOLO con el JSON estructurado.`;
}

/**
 * Valida entrada para evaluación criterial
 */
export function validateCriterialEvaluationInput({ dimensionKey }) {
  const errors = [];

  if (!dimensionKey || !RUBRIC.dimensiones[dimensionKey]) {
    errors.push(`Dimensión inválida: ${dimensionKey}. Dimensiones válidas: ${Object.keys(RUBRIC.dimensiones).join(', ')}`);
  }

  return errors;
}

export default {
  getCriterialEvaluationSchema,
  buildCriterialEvaluationPrompt,
  getComprehensiveEvaluationSchema,
  buildComprehensiveEvaluationPrompt,
  validateCriterialEvaluationInput
};
