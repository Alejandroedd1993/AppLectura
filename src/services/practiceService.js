// src/services/practiceService.js

/**
 * Sistema de práctica guiada con progresión de dificultad
 * Gestiona niveles, hints, y feedback adaptativo
 */

/**
 * Niveles de dificultad
 */
export const DIFFICULTY_LEVELS = {
  EASY: {
    id: 'easy',
    label: '🟢 Fácil',
    description: 'Preguntas introductorias con apoyo completo',
    scoreThreshold: 0,
    hintsAvailable: 3,
    timeGuide: '5-7 minutos',
    characteristics: [
      'Conceptos básicos',
      'Texto guiado paso a paso',
      'Múltiples hints disponibles',
      'Feedback detallado'
    ]
  },
  MEDIUM: {
    id: 'medium',
    label: '🟡 Intermedio',
    description: 'Preguntas de aplicación con apoyo moderado',
    scoreThreshold: 6.0,
    hintsAvailable: 2,
    timeGuide: '8-12 minutos',
    characteristics: [
      'Aplicación de conceptos',
      'Análisis más profundo',
      'Hints limitados',
      'Feedback enfocado'
    ]
  },
  HARD: {
    id: 'hard',
    label: '🔴 Difícil',
    description: 'Preguntas de análisis crítico con apoyo mínimo',
    scoreThreshold: 8.0,
    hintsAvailable: 1,
    timeGuide: '12-20 minutos',
    characteristics: [
      'Pensamiento crítico avanzado',
      'Análisis multidimensional',
      'Hints estratégicos únicos',
      'Feedback experto'
    ]
  }
};

/**
 * Prompts adaptados por nivel de dificultad
 */
export const DIFFICULTY_PROMPTS = {
  easy: {
    questionPrefix: 'Para empezar de manera sencilla',
    evaluationFocus: 'conceptos básicos y comprensión inicial',
    feedbackStyle: 'detallado y alentador, enfocado en reforzar lo positivo',
    scoreAdjustment: 0.5 // Más generoso en evaluación
  },
  medium: {
    questionPrefix: 'Ahora apliquemos estos conceptos',
    evaluationFocus: 'aplicación práctica y conexiones entre ideas',
    feedbackStyle: 'equilibrado entre fortalezas y áreas de mejora',
    scoreAdjustment: 0
  },
  hard: {
    questionPrefix: 'Para un análisis crítico avanzado',
    evaluationFocus: 'pensamiento crítico, argumentación y síntesis',
    feedbackStyle: 'experto y exigente, con expectativas elevadas',
    scoreAdjustment: -0.3 // Más estricto en evaluación
  }
};

/**
 * Sistema de hints por dimensión y nivel
 */
export const HINTS_LIBRARY = {
  // Dimensión 1: Comprensión Literal
  'rubrica1': {
    easy: [
      '💡 Busca las ideas principales en los primeros párrafos del texto',
      '📝 Identifica las palabras clave que se repiten',
      '🎯 ¿Qué información responde a quién, qué, cuándo, dónde?'
    ],
    medium: [
      '💡 Relaciona las ideas principales con los ejemplos específicos',
      '🎯 Identifica la estructura del texto: ¿cómo organiza el autor las ideas?'
    ],
    hard: [
      '💡 Analiza cómo las conexiones implícitas entre párrafos construyen el argumento'
    ]
  },
  
  // Dimensión 2: Inferencia y Deducción
  'rubrica2': {
    easy: [
      '💡 ¿Qué información NO está explícita pero se puede deducir?',
      '🔍 Busca pistas en el contexto de las palabras',
      '🎯 Piensa: ¿qué supondría el autor que ya sabemos?'
    ],
    medium: [
      '💡 Conecta información de diferentes partes del texto',
      '🎯 ¿Qué consecuencias lógicas surgen de las premisas presentadas?'
    ],
    hard: [
      '💡 Identifica las asunciones culturales o teóricas subyacentes'
    ]
  },
  
  // Dimensión 3: Pensamiento Crítico
  'rubrica3': {
    easy: [
      '💡 ¿Estás de acuerdo con el autor? ¿Por qué sí o por qué no?',
      '🤔 ¿El autor presenta evidencia para sus afirmaciones?',
      '🎯 Identifica al menos una fortaleza y una debilidad del argumento'
    ],
    medium: [
      '💡 Evalúa la calidad de las fuentes y evidencias presentadas',
      '🎯 ¿Qué perspectivas alternativas no están representadas?'
    ],
    hard: [
      '💡 Analiza cómo los sesgos del autor influyen en la presentación del argumento'
    ]
  },
  
  // Dimensión 4: Contexto Sociocultural
  'rubrica4': {
    easy: [
      '💡 ¿En qué época o lugar se escribió este texto?',
      '🌍 ¿A qué audiencia se dirige el autor?',
      '🎯 ¿Qué valores culturales se reflejan en el texto?'
    ],
    medium: [
      '💡 ¿Cómo influye el contexto histórico en el mensaje del texto?',
      '🎯 Compara este texto con perspectivas de otras culturas'
    ],
    hard: [
      '💡 Analiza las dinámicas de poder y hegemonía presentes en el discurso'
    ]
  },
  
  // Dimensión 5: Metacognición
  'rubrica5': {
    easy: [
      '💡 ¿Qué estrategias usaste para leer este texto?',
      '🧠 ¿Qué partes te resultaron más difíciles de entender?',
      '🎯 ¿Qué harías diferente en una segunda lectura?'
    ],
    medium: [
      '💡 Evalúa tu propio proceso de comprensión: ¿dónde tuviste dudas?',
      '🎯 ¿Cómo monitoreaste tu entendimiento mientras leías?'
    ],
    hard: [
      '💡 Reflexiona sobre cómo tus propios sesgos afectan tu interpretación'
    ]
  }
};

/**
 * Determina el nivel apropiado basado en el historial del usuario
 */
export const determineDifficultyLevel = (rubricProgress, dimensionId) => {
  // dimensionId puede ser 1-5 o comprension_analitica, acd, etc.
  // Mapear a rubrica1-5
  const dimensionMap = {
    '1': 'rubrica1',
    '2': 'rubrica2',
    '3': 'rubrica3',
    '4': 'rubrica4',
    '5': 'rubrica5',
    'comprension_analitica': 'rubrica1',
    'acd': 'rubrica2',
    'contextualizacion': 'rubrica3',
    'argumentacion': 'rubrica4',
    'metacognicion_etica_ia': 'rubrica5'
  };
  
  const rubricId = dimensionMap[dimensionId] || dimensionId;
  const rubricData = rubricProgress[rubricId];
  
  if (!rubricData || !rubricData.scores || rubricData.scores.length === 0) {
    return DIFFICULTY_LEVELS.EASY;
  }
  
  const avgScore = rubricData.average || 0;
  
  if (avgScore >= DIFFICULTY_LEVELS.HARD.scoreThreshold) {
    return DIFFICULTY_LEVELS.HARD;
  } else if (avgScore >= DIFFICULTY_LEVELS.MEDIUM.scoreThreshold) {
    return DIFFICULTY_LEVELS.MEDIUM;
  } else {
    return DIFFICULTY_LEVELS.EASY;
  }
};

/**
 * Obtiene hints para una dimensión y nivel específicos
 */
export const getHintsForDimension = (dimensionId, difficulty) => {
  const dimensionMap = {
    '1': 'rubrica1',
    '2': 'rubrica2',
    '3': 'rubrica3',
    '4': 'rubrica4',
    '5': 'rubrica5',
    'comprension_analitica': 'rubrica1',
    'acd': 'rubrica2',
    'contextualizacion': 'rubrica3',
    'argumentacion': 'rubrica4',
    'metacognicion_etica_ia': 'rubrica5'
  };
  
  const rubricId = dimensionMap[dimensionId] || dimensionId;
  const hints = HINTS_LIBRARY[rubricId];
  
  if (!hints || !hints[difficulty]) {
    return [];
  }
  
  return hints[difficulty];
};

/**
 * Genera un prompt de pregunta adaptado al nivel de dificultad
 */
export const generateDifficultyAdaptedPrompt = (basePrompt, difficulty, dimension) => {
  const difficultyConfig = DIFFICULTY_PROMPTS[difficulty];
  
  return `
${difficultyConfig.questionPrefix}, responde a la siguiente pregunta sobre ${dimension}:

${basePrompt}

Nivel de dificultad: ${DIFFICULTY_LEVELS[difficulty.toUpperCase()].label}
Enfócate en: ${difficultyConfig.evaluationFocus}

Tiempo sugerido: ${DIFFICULTY_LEVELS[difficulty.toUpperCase()].timeGuide}
`.trim();
};

/**
 * Adapta el feedback según el nivel de dificultad
 */
export const adaptFeedbackToDifficulty = (feedback, difficulty, score) => {
  const difficultyConfig = DIFFICULTY_PROMPTS[difficulty];
  const level = DIFFICULTY_LEVELS[difficulty.toUpperCase()];
  
  let adaptedFeedback = `**Nivel ${level.label}** - ${difficultyConfig.feedbackStyle}\n\n`;
  adaptedFeedback += feedback;
  
  // Sugerencias de progresión
  if (difficulty === 'easy' && score >= 7.0) {
    adaptedFeedback += '\n\n🎯 **¡Excelente!** Estás listo para intentar el nivel Intermedio.';
  } else if (difficulty === 'medium' && score >= 8.5) {
    adaptedFeedback += '\n\n🚀 **¡Impresionante!** Considera probar el nivel Difícil para desafiarte más.';
  } else if (difficulty === 'hard' && score >= 9.0) {
    adaptedFeedback += '\n\n⭐ **¡Excepcional!** Has demostrado dominio experto en esta dimensión.';
  } else if (score < 5.0 && difficulty !== 'easy') {
    adaptedFeedback += '\n\n💪 **Sugerencia:** Practica más en el nivel anterior para fortalecer los fundamentos.';
  }
  
  return adaptedFeedback;
};

/**
 * Calcula estadísticas de progreso por dificultad
 */
export const calculateProgressionStats = (rubricProgress) => {
  const stats = {
    easy: { completed: 0, avgScore: 0, total: 0 },
    medium: { completed: 0, avgScore: 0, total: 0 },
    hard: { completed: 0, avgScore: 0, total: 0 }
  };
  
  if (!rubricProgress || typeof rubricProgress !== 'object') {
    return stats;
  }
  
  Object.entries(rubricProgress).forEach(([rubricId, data]) => {
    // Extraer el número de dimensión de rubricaX
    const dimensionNum = rubricId.replace('rubrica', '');
    const level = determineDifficultyLevel(rubricProgress, dimensionNum);
    const difficulty = level.id;
    
    if (data.scores && data.scores.length > 0) {
      stats[difficulty].completed++;
      stats[difficulty].avgScore += Number(data.average || 0);
      stats[difficulty].total++;
    }
  });
  
  // Calcular promedios
  Object.keys(stats).forEach(difficulty => {
    if (stats[difficulty].total > 0) {
      stats[difficulty].avgScore = stats[difficulty].avgScore / stats[difficulty].total;
    }
  });
  
  return stats;
};

/**
 * Recomienda el próximo nivel de práctica
 */
export const recommendNextPractice = (rubricProgress) => {
  const progressionStats = calculateProgressionStats(rubricProgress);
  
  // Si no hay práctica previa, recomendar nivel fácil
  if (progressionStats.easy.total === 0) {
    return {
      level: DIFFICULTY_LEVELS.EASY,
      reason: 'Comienza con el nivel básico para familiarizarte con el sistema',
      dimensions: [1, 2, 3, 4, 5]
    };
  }
  
  // Si domina el nivel fácil, recomendar intermedio
  if (progressionStats.easy.avgScore >= 7.0 && progressionStats.medium.total < 3) {
    return {
      level: DIFFICULTY_LEVELS.MEDIUM,
      reason: '¡Buen progreso! Es hora de desafiarte con el nivel intermedio',
      dimensions: findWeakestDimensions(rubricProgress, 'medium')
    };
  }
  
  // Si domina el nivel intermedio, recomendar difícil
  if (progressionStats.medium.avgScore >= 8.0 && progressionStats.hard.total < 3) {
    return {
      level: DIFFICULTY_LEVELS.HARD,
      reason: '¡Excelente trabajo! Estás listo para el nivel avanzado',
      dimensions: findWeakestDimensions(rubricProgress, 'hard')
    };
  }
  
  // Por defecto, reforzar el nivel actual
  return {
    level: DIFFICULTY_LEVELS.MEDIUM,
    reason: 'Continúa practicando para consolidar tu aprendizaje',
    dimensions: findWeakestDimensions(rubricProgress, 'medium')
  };
};

/**
 * Encuentra las dimensiones más débiles para un nivel
 */
const findWeakestDimensions = (rubricProgress, _targetDifficulty) => {
  const dimensionScores = [];
  
  for (let i = 1; i <= 5; i++) {
    const rubricId = `rubrica${i}`;
    const data = rubricProgress[rubricId];
    
    if (data && data.scores && data.scores.length > 0) {
      dimensionScores.push({ id: i, score: Number(data.average || 0) });
    } else {
      dimensionScores.push({ id: i, score: 0 });
    }
  }
  
  // Ordenar por puntaje ascendente y tomar las 3 más débiles
  return dimensionScores
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(d => d.id);
};

/**
 * Genera un plan de práctica personalizado
 */
export const generatePracticePlan = (rubricProgress) => {
  const recommendation = recommendNextPractice(rubricProgress);
  const progressionStats = calculateProgressionStats(rubricProgress);
  
  return {
    currentLevel: recommendation.level,
    suggestedDimensions: recommendation.dimensions,
    reason: recommendation.reason,
    statistics: progressionStats,
    estimatedTime: `${recommendation.dimensions.length * 10}-${recommendation.dimensions.length * 15} minutos`,
    steps: [
      {
        step: 1,
        title: 'Selecciona una dimensión',
        description: `Te recomendamos: ${recommendation.dimensions.map(d => `Dimensión ${d}`).join(', ')}`
      },
      {
        step: 2,
        title: 'Lee el texto cuidadosamente',
        description: 'Tómate tu tiempo, puedes usar los hints si necesitas ayuda'
      },
      {
        step: 3,
        title: 'Responde con profundidad',
        description: `Para el nivel ${recommendation.level.label}, desarrolla tus ideas completamente`
      },
      {
        step: 4,
        title: 'Revisa el feedback',
        description: 'Presta atención a las sugerencias para mejorar'
      }
    ]
  };
};

export default {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PROMPTS,
  HINTS_LIBRARY,
  determineDifficultyLevel,
  getHintsForDimension,
  generateDifficultyAdaptedPrompt,
  adaptFeedbackToDifficulty,
  calculateProgressionStats,
  recommendNextPractice,
  generatePracticePlan
};
