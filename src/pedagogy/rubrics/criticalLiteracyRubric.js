// CORRECCIÓN: Migrar a ES6 modules para consistencia
export const RUBRIC = {
  dimensiones: {
    comprensionAnalitica: {
      nombre: 'Comprensión analítica',
      descripcion: 'Reconstruye el significado literal e inferencial del texto con evidencia explícita',
      criterios: [
        'Identifica tesis central con citas precisas',
        'Distingue hechos de opiniones con ejemplos textuales',
        'Parafrasea manteniendo fidelidad conceptual',
        'Analiza estructura argumentativa y jerarquía de ideas',
        'Fundamenta deducciones en evidencia textual explícita'
      ],
      niveles: {
        1: 'Insuficiente: Repite información superficial sin evidencia. No identifica tesis ni distingue tipos de información.',
        2: 'Básico: Identifica ideas principales pero con evidencia escasa o imprecisa. Paráfrasis literal sin análisis.',
        3: 'Adecuado: Parafrasea con fidelidad, distingue información central/secundaria, usa evidencia textual apropiada.',
        4: 'Avanzado: Reconstruye tesis con precisión, analiza estructura argumentativa completa, fundamenta con citas estratégicas.'
      },
      preguntasGuia: [
        '¿Cuál es la tesis central y qué evidencias la sustentan?',
        '¿Qué afirmaciones son hechos verificables y cuáles opiniones del autor?',
        '¿Cómo organizó el autor sus argumentos? ¿Qué información es central vs secundaria?'
      ]
    },
    acd: {
      nombre: 'Análisis ideológico-discursivo (ACD)',
      descripcion: 'Desvela ideologías, sesgos y estrategias retóricas que subyacen al discurso',
      criterios: [
        'Identifica perspectiva ideológica y posicionamiento del autor',
        'Analiza estrategias retóricas y elecciones léxicas intencionadas',
        'Detecta voces autorizadas vs silenciadas o marginadas',
        'Determina intereses, beneficiarios y marcos interpretativos',
        'Examina metáforas, eufemismos y carga valorativa del lenguaje'
      ],
      niveles: {
        1: 'Insuficiente: No reconoce perspectiva ni sesgos. Acepta el texto como neutral u objetivo.',
        2: 'Básico: Identifica algunas estrategias retóricas evidentes pero sin conectar con ideología subyacente.',
        3: 'Adecuado: Analiza marcos interpretativos y voces, identifica algunos sesgos con ejemplos textuales.',
        4: 'Avanzado: Desvela sistemáticamente ideología, intereses y silencios. Analiza estrategias retóricas complejas.'
      },
      preguntasGuia: [
        '¿Desde qué perspectiva ideológica se escribe este texto? ¿Qué sesgos detectas?',
        '¿Qué voces tienen autoridad y cuáles están ausentes o silenciadas?',
        '¿A quién beneficia esta interpretación y qué intereses podrían estar en juego?',
        '¿Qué estrategias retóricas usa el autor para persuadir o manipular?'
      ]
    },
    contextualizacion: {
      nombre: 'Contextualización socio-histórica',
      descripcion: 'Sitúa el texto en su entorno de producción y analiza sus implicaciones sociales',
      criterios: [
        'Identifica actores sociales y políticos relevantes',
        'Conecta con eventos históricos y procesos sociales específicos',
        'Analiza impacto y consecuencias en grupos/comunidades concretas',
        'Ubica en debates públicos y tensiones sociales actuales',
        'Reconoce el texto como intervención en diálogos sociales amplios'
      ],
      niveles: {
        1: 'Insuficiente: Trata el texto como objeto aislado, sin conexión con su contexto social o histórico.',
        2: 'Básico: Menciona contexto general pero sin conexiones específicas con procesos o consecuencias.',
        3: 'Adecuado: Conecta con procesos sociales y actores específicos, identifica algunas implicaciones.',
        4: 'Avanzado: Sitúa sistemáticamente en debates públicos, analiza consecuencias concretas y dinámicas de poder.'
      },
      preguntasGuia: [
        '¿En qué contexto socio-político se produce este texto y qué eventos lo influenciaron?',
        '¿Qué actores sociales están involucrados y cómo los afecta?',
        '¿Qué consecuencias reales ha tenido o busca tener este discurso?',
        '¿En qué debates públicos actuales se inscribe esta discusión?'
      ]
    },
    argumentacion: {
      nombre: 'Argumentación y contraargumento',
      descripcion: 'Construye posturas propias y maneja objeciones con pensamiento dialógico',
      criterios: [
        'Formula postura propia clara y fundamentada',
        'Articula razones lógicas respaldadas por evidencia textual',
        'Anticipa objeciones legítimas y las aborda sistemáticamente',
        'Integra perspectivas alternativas sin debilitar la argumentación',
        'Demuestra pensamiento dialógico y manejo de la complejidad'
      ],
      niveles: {
        1: 'Insuficiente: Expresa opinión personal sin razones ni evidencia. Ignora perspectivas alternativas.',
        2: 'Básico: Ofrece razones generales con evidencia limitada. Reconoce otras perspectivas superficialmente.',
        3: 'Adecuado: Postura fundamentada con evidencia textual, anticipa algunas objeciones principales.',
        4: 'Avanzado: Argumentación robusta, refuta objeciones con rigor, integra complejidad sin simplificar.'
      },
      preguntasGuia: [
        '¿Cuál es tu postura fundamentada sobre este tema y qué evidencias del texto la sustentan?',
        '¿Qué objeciones válidas podrían hacer a tu argumento y cómo las responderías?',
        '¿Cómo integras perspectivas alternativas sin debilitar tu posición?',
        '¿Qué limitaciones reconoces en tu propio argumento?'
      ]
    }
  },
  escala: { min: 1, max: 10 }
};

// CORRECCIÓN: Añadir validación robusta de entrada
export function normalizarPuntaje10aNivel4(p) {
  const score = Number(p);
  if (Number.isNaN(score) || score < 1) return 1;
  if (score >= 9) return 4;
  if (score >= 7) return 3;
  if (score >= 5) return 2;
  return 1;
}

// Constantes de escala
const SCORE_SCALE = { min: 1, max: 10 };
const LEVEL4_SCALE = { min: 1, max: 4 };

// Utilidades internas
function clampScore(p) {
  if (Number.isNaN(p)) return SCORE_SCALE.min;
  return Math.max(SCORE_SCALE.min, Math.min(SCORE_SCALE.max, p));
}

function getDimensionKeys() {
  return Object.keys(RUBRIC.dimensiones);
}

export function getDimension(dimensionKey) {
  return RUBRIC.dimensiones[dimensionKey] || null;
}

function validateDimensionKey(dimensionKey, fallback = 'comprensionAnalitica') {
  return getDimensionKeys().includes(dimensionKey) ? dimensionKey : fallback;
}

function levelDescriptor(dimensionKey, level) {
  const dim = getDimension(validateDimensionKey(dimensionKey));
  return dim?.niveles?.[level] || '';
}

function scoreToLevel(score10) {
  // usa la normalización existente para mantener coherencia
  return normalizarPuntaje10aNivel4(clampScore(score10));
}

export function scoreToLevelDescriptor(dimensionKey, score10) {
  const level = scoreToLevel(score10);
  return { level, descriptor: levelDescriptor(dimensionKey, level) };
}

function getCriteriaByDimension(dimensionKey) {
  // CORRECCIÓN: Añadir cache para operaciones costosas
  const dimensionCache = new Map();

  if (dimensionCache.has(dimensionKey)) {
    return dimensionCache.get(dimensionKey);
  }
  
  const dim = getDimension(validateDimensionKey(dimensionKey));
  const criteria = dim?.criterios || [];
  dimensionCache.set(dimensionKey, criteria);
  return criteria;
}

function findDimensionKeyByName(nombre) {
  if (!nombre) return null;
  const target = String(nombre).toLowerCase();
  return getDimensionKeys().find(k => {
    const n = RUBRIC.dimensiones[k].nombre.toLowerCase();
    return n === target || n.includes(target);
  }) || null;
}

/**
 * Mapea nombres libres a claves canónicas de dimensión.
 * Acepta variantes con/ sin acentos y abreviaturas.
 */
const DIMENSION_ALIASES = {
  comprensionanalitica: 'comprensionAnalitica',
  'comprensiónanalítica': 'comprensionAnalitica',
  analisisideologicodiscursivo: 'acd',
  'análisisideológico-discursivo': 'acd',
  acd: 'acd',
  contextualizacion: 'contextualizacion',
  'contextualización': 'contextualizacion',
  argumentacion: 'argumentacion',
  'argumentación': 'argumentacion'
};

// CORRECCIÓN: Validación más estricta para entradas de usuario
export function normalizeDimensionInput(input, fallback = 'comprensionAnalitica') {
  if (!input || typeof input !== 'string') return fallback;
  
  // Sanitizar entrada
  const key = input.toLowerCase()
    .replace(/[^\w\sñáéíóúü-]/g, '') // Solo caracteres válidos
    .replace(/\s|_|-|\./g, '');
  
  const alias = DIMENSION_ALIASES[key];
  if (alias && validateDimensionKey(alias)) return alias;
  
  return validateDimensionKey(input, fallback);
}

/**
 * Orden recomendado para UI (tabs, secciones)
 */
const ORDERED_DIMENSIONS = [
  'comprensionAnalitica',
  'acd',
  'contextualizacion',
  'argumentacion'
];

function getOrderedDimensions() {
  const set = new Set(getDimensionKeys());
  return ORDERED_DIMENSIONS.filter(k => set.has(k));
}

/**
 * Inmutabilidad defensiva de la rúbrica (evita mutaciones accidentales).
 */
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach(name => {
    const value = obj[name];
    if (value && typeof value === 'object') deepFreeze(value);
  });
  return Object.freeze(obj);
}
// Congelar una sola vez (idempotente)
deepFreeze(RUBRIC);

/**
 * Cálculo opcional por criterios con ponderaciones.
 * weights: array de pesos (misma longitud que criterios) o número (peso uniforme).
 * criteriaScores: array de 1–4 (nivel por criterio). Devuelve score 1–10.
 */
function computeScoreFromCriteria({ dimensionKey, criteriaScores = [], weights = [] }) {
  const criterios = getCriteriaByDimension(dimensionKey);
  if (!criterios.length || !criteriaScores.length) return SCORE_SCALE.min;

  const n = criterios.length;
  const ws = Array.isArray(weights) && weights.length === n
    ? weights
    : Array(n).fill(1);

  const totalW = ws.reduce((a, b) => a + b, 0) || 1;
  // Promedio ponderado en escala 1–4
  const avgLevel = criteriaScores
    .slice(0, n)
    .reduce((acc, lvl, i) => acc + (Math.max(LEVEL4_SCALE.min, Math.min(LEVEL4_SCALE.max, lvl)) * ws[i]), 0) / totalW;

  // Mapear 1–4 a 1–10 linealmente
  const score10 = Math.round(((avgLevel - 1) / (LEVEL4_SCALE.max - 1)) * (SCORE_SCALE.max - SCORE_SCALE.min) + SCORE_SCALE.min);
  return clampScore(score10);
}

/**
 * Normaliza un JSON de evaluación del evaluador:
 * { dimension, score, strengths[], improvements[], evidence[], summary }
 * Retorna objeto enriquecido con { key, name, level, descriptor, criterios }.
 */
export function summarizeEvaluation(evaluation) {
  // CORRECCIÓN: Validación más robusta para evaluaciones
  if (!evaluation || typeof evaluation !== 'object') {
    return { error: 'Evaluación inválida', valid: false };
  }

  const key = normalizeDimensionInput(evaluation.dimension);
  const dim = getDimension(key);
  if (!dim) {
    return { error: `Dimensión desconocida: ${evaluation.dimension}`, valid: false };
  }

  // Validar score
  const rawScore = Number(evaluation.score);
  if (Number.isNaN(rawScore) || rawScore < SCORE_SCALE.min || rawScore > SCORE_SCALE.max) {
    return { error: `Score inválido: ${evaluation.score}`, valid: false };
  }

  const score = clampScore(rawScore);
  const { level, descriptor } = scoreToLevelDescriptor(key, score);

  // Sanitizar arrays
  const sanitizeArray = (arr, maxLength = 10) => 
    Array.isArray(arr) ? arr.slice(0, maxLength).filter(Boolean) : [];

  return {
    valid: true,
    key,
    name: dim.nombre,
    score,
    level,
    descriptor,
    criteria: dim.criterios.slice(),
    strengths: sanitizeArray(evaluation.strengths),
    improvements: sanitizeArray(evaluation.improvements),
    evidence: sanitizeArray(evaluation.evidence),
    summary: String(evaluation.summary || '').slice(0, 1000) // Limitar tamaño
  };
}

// CORRECCIÓN: Congelar después de todas las definiciones
Object.freeze(RUBRIC);
Object.freeze(DIMENSION_ALIASES);
Object.freeze(ORDERED_DIMENSIONS);

// CORRECCIÓN: Mantener compatibilidad con CommonJS para backend
export default {
  RUBRIC,
  normalizarPuntaje10aNivel4,
  SCORE_SCALE,
  LEVEL4_SCALE,
  clampScore,
  getDimensionKeys,
  getDimension,
  validateDimensionKey,
  levelDescriptor,
  scoreToLevel,
  scoreToLevelDescriptor,
  getCriteriaByDimension,
  findDimensionKeyByName,
  DIMENSION_ALIASES,
  normalizeDimensionInput,
  ORDERED_DIMENSIONS,
  getOrderedDimensions,
  computeScoreFromCriteria,
  summarizeEvaluation
};
