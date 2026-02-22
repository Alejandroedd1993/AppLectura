/**
 * 🎓 ZDP Detector - Zona de Desarrollo Próximo (Vygotsky)
 * 
 * Detecta el nivel cognitivo actual del estudiante (taxonomía de Bloom adaptada)
 * y sugiere intervenciones en ZDP+1 para andamiaje progresivo.
 * 
 * Niveles:
 * 1. Recordar (Literal)
 * 2. Comprender (Inferencial básico)
 * 3. Aplicar (Conexión con realidad)
 * 4. Analizar (Estructura, supuestos)
 * 5. Evaluar (Crítico, ACD, ideología)
 * 6. Crear (Contra-argumentos, propuestas)
 * 
 * @module zdpDetector
 */

/**
 * Niveles de Bloom adaptados a Literacidad Crítica
 */
export const BLOOM_LEVELS = [
  {
    id: 1,
    name: 'Recordar',
    label: '📖 Literal',
    description: 'Identifica información explícita del texto',
    keywords: [
      'qué dice', 'qué es', 'quién', 'cuándo', 'dónde',
      'define', 'identifica', 'lista', 'nombra', 'menciona'
    ],
    color: '#10b981', // verde
    icon: '📖'
  },
  {
    id: 2,
    name: 'Comprender',
    label: '💡 Inferencial',
    description: 'Interpreta significados implícitos',
    keywords: [
      'significa', 'quiere decir', 'implica', 'sugiere',
      'explica', 'resume', 'parafrasea', 'interpreta', 'deduce'
    ],
    color: '#3b82f6', // azul
    icon: '💡'
  },
  {
    id: 3,
    name: 'Aplicar',
    label: '🌍 Aplicación',
    description: 'Conecta texto con realidad/experiencia',
    keywords: [
      'ejemplo', 'caso', 'situación', 'relaciona', 'compara con',
      'usa', 'aplica', 'demuestra', 'ilustra', 'contexto real'
    ],
    color: '#f59e0b', // amarillo
    icon: '🌍'
  },
  {
    id: 4,
    name: 'Analizar',
    label: '🔍 Análisis',
    description: 'Descompone estructura, identifica supuestos',
    keywords: [
      'estructura', 'argumento', 'supuesto', 'premisa', 'evidencia',
      'analiza', 'compara', 'contrasta', 'categoriza', 'diferencia',
      'por qué', 'cómo', 'relación entre'
    ],
    color: '#8b5cf6', // morado
    icon: '🔍'
  },
  {
    id: 5,
    name: 'Evaluar',
    label: '⚖️ Crítico (ACD)',
    description: 'Evalúa ideología, poder, marcos discursivos',
    keywords: [
      'ideología', 'poder', 'hegemonía', 'discurso', 'marco',
      'critica', 'evalúa', 'juzga', 'posición', 'interés',
      'naturaliza', 'silencia', 'reproduce', 'legitima',
      'sesgo', 'perspectiva', 'quién gana', 'quién pierde'
    ],
    color: '#ef4444', // rojo
    icon: '⚖️'
  },
  {
    id: 6,
    name: 'Crear',
    label: '✨ Propositivo',
    description: 'Crea contra-argumentos, propone alternativas',
    keywords: [
      'alternativa', 'propuesta', 'contra-argumento', 'reescribe',
      'diseña', 'construye', 'planea', 'imagina', 'propone',
      'diferente', 'cambiaría', 'mejoraría', 'transformaría'
    ],
    color: '#ec4899', // rosa
    icon: '✨'
  }
];

/**
 * Clase principal del detector ZDP
 */
export class ZDPDetector {
  constructor() {
    this.levels = BLOOM_LEVELS;
    this.history = []; // Historial de detecciones para progresión
  }

  /**
   * Detecta el nivel cognitivo de una pregunta/mensaje del estudiante
   * @param {string} text - Pregunta o mensaje del estudiante
   * @returns {Object} { current, zdp, shouldScaffold, confidence, matchedKeywords }
   */
  detectLevel(text) {
    if (!text || typeof text !== 'string') {
      return this._createResponse(this.levels[0], this.levels[1], true, 0, []);
    }

    const lowerText = text.toLowerCase().trim();
    
    // Buscar coincidencias en cada nivel (de mayor a menor)
    const matches = this.levels.map(level => {
      const matchedKeywords = level.keywords.filter(kw => 
        lowerText.includes(kw.toLowerCase())
      );
      
      return {
        level,
        score: matchedKeywords.length,
        matchedKeywords
      };
    });

    // Ordenar por score descendente
    matches.sort((a, b) => b.score - a.score);

    // Si no hay coincidencias, asumir nivel 1 (recordar)
    if (matches[0].score === 0) {
      return this._createResponse(this.levels[0], this.levels[1], true, 0.3, []);
    }

    // Nivel actual es el de mayor score
    const currentMatch = matches[0];
    const currentLevel = currentMatch.level;
    
    // ZDP es el siguiente nivel (si existe)
    const currentIndex = this.levels.findIndex(l => l.id === currentLevel.id);
    const zdpLevel = this.levels[Math.min(currentIndex + 1, this.levels.length - 1)];
    
    // Calcular confianza (0-1)
    const confidence = Math.min(currentMatch.score / 3, 1); // Máximo 3 keywords = 100% confianza

    // Registrar en historial (H8 FIX: limitar a 200 entradas para evitar crecimiento ilimitado)
    this.history.push({
      text,
      level: currentLevel.id,
      timestamp: Date.now()
    });
    if (this.history.length > 200) {
      this.history = this.history.slice(-200);
    }

    return this._createResponse(
      currentLevel,
      zdpLevel,
      currentIndex < this.levels.length - 1, // shouldScaffold si no está en nivel máximo
      confidence,
      currentMatch.matchedKeywords
    );
  }

  /**
   * Genera pregunta socrática para empujar hacia ZDP
   * @param {Object} detection - Resultado de detectLevel()
   * @param {string} originalQuestion - Pregunta original del estudiante
   * @returns {string} Pregunta socrática
   */
  generateZDPQuestion(detection, originalQuestion) {
    const { current: _current, zdp, shouldScaffold } = detection;

    if (!shouldScaffold) {
      // Ya está en nivel máximo
      return this._generateMaxLevelResponse(originalQuestion);
    }

    // Plantillas por nivel ZDP objetivo
    const templates = {
      1: [ // De nada → Recordar
        `Comencemos identificando: ¿Qué dice EXPLÍCITAMENTE el texto sobre este tema?`,
        `¿Puedes señalar las PARTES ESPECÍFICAS del texto donde se menciona esto?`
      ],
      2: [ // De Recordar → Comprender
        `Has identificado lo que el texto dice. Ahora, ¿puedes explicar con tus propias palabras QUÉ SIGNIFICA esto?`,
        `Entiendo que el texto menciona "{fragment}". Pero, ¿qué IMPLICA realmente esta afirmación? ¿Qué nos quiere decir el autor?`,
        `¿Por qué crees que el autor eligió expresarlo de ESA manera específica?`
      ],
      3: [ // De Comprender → Aplicar
        `Entiendes el significado. Ahora, ¿puedes dar un EJEMPLO CONCRETO de tu realidad donde esto se manifieste?`,
        `¿Cómo se RELACIONA esta idea con situaciones que hayas vivido o presenciado?`,
        `Si tuvieras que explicar esto a alguien de tu comunidad, ¿qué ejemplo usarías?`
      ],
      4: [ // De Aplicar → Analizar
        `Has conectado con ejemplos reales. Ahora profundicemos: ¿Cuál es la ESTRUCTURA del argumento del autor?`,
        `¿Qué SUPUESTOS IMPLÍCITOS sostienen este razonamiento? ¿Qué da por sentado el autor?`,
        `¿Qué EVIDENCIAS presenta? ¿Son suficientes y confiables?`,
        `Compara este argumento con otros sobre el mismo tema. ¿En qué DIFIEREN y por qué?`
      ],
      5: [ // De Analizar → Evaluar (ACD)
        `Has analizado la estructura. Ahora evaluemos CRÍTICAMENTE: ¿Qué MARCOS IDEOLÓGICOS están operando aquí?`,
        `¿Qué RELACIONES DE PODER se reproducen o desafían en este discurso?`,
        `¿Qué voces están PRESENTES en este texto y cuáles están SILENCIADAS?`,
        `¿Qué se NATURALIZA como "normal" o "inevitable"? ¿Qué alternativas quedan fuera del marco?`,
        `¿A QUIÉN BENEFICIA esta forma de presentar el tema? ¿Quién tiene interés en este discurso?`
      ],
      6: [ // De Evaluar → Crear
        `Has evaluado críticamente. Ahora, ¿puedes PROPONER una perspectiva alternativa?`,
        `¿Cómo REESCRIBIRÍAS este argumento desde una posición contra-hegemónica?`,
        `¿Qué CONTRA-ARGUMENTOS podrían plantearse? Construye uno sólido.`,
        `Imagina que eres un activista que desafía este discurso. ¿Qué PROPUESTA harías?`
      ]
    };

    const options = templates[zdp.id] || templates[2];
    const selected = options[Math.floor(Math.random() * options.length)];

    return selected.replace('{fragment}', originalQuestion.slice(0, 100));
  }

  /**
   * Genera prompt completo para el sistema de IA
   * @param {Object} detection - Resultado de detectLevel()
   * @param {string} userQuestion - Pregunta del estudiante
   * @param {string} textContext - Fragmento del texto relevante
   * @returns {string} Prompt para IA
   */
  buildTutorPrompt(detection, userQuestion, textContext) {
    const { current, zdp, shouldScaffold, confidence } = detection;

    return `# CONTEXTO PEDAGÓGICO (ZDP - Vygotsky)

**Nivel actual del estudiante**: ${current.name} (${current.label})
- Descripción: ${current.description}
- Confianza: ${Math.round(confidence * 100)}%

**Zona de Desarrollo Próximo (ZDP)**: ${zdp.name} (${zdp.label})
- Objetivo: ${zdp.description}

**Texto en análisis**:
"${textContext.slice(0, 500)}..."

**Pregunta del estudiante**:
"${userQuestion}"

---

## TU ROL COMO TUTOR SOCRÁTICO

**IMPORTANTE**: NO des respuestas directas. Tu objetivo es **andamiar** (scaffold) hacia el nivel ZDP.

**Estrategia**:
1. ${shouldScaffold ? 'Reconoce brevemente su nivel actual (máx 1 frase)' : 'Felicita por alcanzar nivel crítico'}
2. ${shouldScaffold ? 'Haz 1-2 preguntas que empujen hacia ' + zdp.label : 'Desafía a pensar propositivamente'}
3. ${shouldScaffold ? 'Señala aspectos del texto que ayuden a alcanzar ' + zdp.name : 'Pide alternativas o contra-argumentos'}
4. Usa lenguaje cercano pero académico
5. Máximo 120 palabras

**Ejemplo de respuesta** (${shouldScaffold ? 'para empujar de ' + current.name + ' a ' + zdp.name : 'nivel máximo'}):
${this.generateZDPQuestion(detection, userQuestion)}

**Responde AHORA en español:**`;
  }

  /**
   * Analiza progresión del estudiante a lo largo de la sesión
   * @returns {Object} { avgLevel, trend, levelCounts, progression }
   */
  analyzeProgression() {
    if (this.history.length === 0) {
      return {
        avgLevel: 0,
        trend: 'neutral',
        levelCounts: {},
        progression: [],
        recommendation: 'Aún no hay interacciones suficientes para analizar progresión.'
      };
    }

    // Calcular promedio de nivel
    const avgLevel = this.history.reduce((acc, h) => acc + h.level, 0) / this.history.length;

    // Contar ocurrencias por nivel
    const levelCounts = this.history.reduce((acc, h) => {
      acc[h.level] = (acc[h.level] || 0) + 1;
      return acc;
    }, {});

    // Detectar tendencia (comparar primera mitad vs segunda mitad)
    const midpoint = Math.floor(this.history.length / 2);
    const firstHalfAvg = this.history.slice(0, midpoint).reduce((acc, h) => acc + h.level, 0) / midpoint;
    const secondHalfAvg = this.history.slice(midpoint).reduce((acc, h) => acc + h.level, 0) / (this.history.length - midpoint);
    
    let trend = 'neutral';
    if (secondHalfAvg > firstHalfAvg + 0.5) trend = 'ascending';
    else if (secondHalfAvg < firstHalfAvg - 0.5) trend = 'descending';

    // Mapear progresión temporal
    const progression = this.history.map(h => ({
      level: h.level,
      levelName: this.levels[h.level - 1].name,
      timestamp: h.timestamp
    }));

    // Recomendación
    let recommendation = '';
    const lastLevels = this.history.slice(-3).map(h => h.level);
    const maxRecentLevel = Math.max(...lastLevels);
    
    if (maxRecentLevel <= 2) {
      recommendation = '💡 Intenta hacer preguntas más profundas. No solo "qué dice", sino "qué significa" o "por qué".';
    } else if (maxRecentLevel === 3) {
      recommendation = '🎯 Buen progreso. Ahora busca analizar la estructura del argumento y los supuestos.';
    } else if (maxRecentLevel === 4) {
      recommendation = '🔥 Excelente análisis. Puedes dar el salto crítico: ¿qué ideologías operan aquí?';
    } else if (maxRecentLevel >= 5) {
      recommendation = '🌟 ¡Pensamiento crítico avanzado! Sigue cuestionando relaciones de poder.';
    }

    return {
      avgLevel: Math.round(avgLevel * 10) / 10,
      trend,
      levelCounts,
      progression,
      recommendation,
      totalInteractions: this.history.length
    };
  }

  /**
   * Calcula puntos de gamificación basados en nivel alcanzado
   * @param {number} levelId - ID del nivel (1-6)
   * @returns {number} Puntos ganados
   */
  calculatePoints(levelId) {
    // Puntos exponenciales: niveles altos valen mucho más
    const pointsMap = {
      1: 5,   // Recordar
      2: 10,  // Comprender
      3: 20,  // Aplicar
      4: 35,  // Analizar
      5: 60,  // Evaluar (ACD) ⭐
      6: 100  // Crear
    };

    return pointsMap[levelId] || 5;
  }

  /**
   * Resetea historial
   */
  reset() {
    this.history = [];
  }

  /**
   * Método auxiliar para crear respuesta estructurada
   */
  _createResponse(current, zdp, shouldScaffold, confidence, matchedKeywords) {
    return {
      current,
      zdp,
      shouldScaffold,
      confidence,
      matchedKeywords,
      points: this.calculatePoints(current.id)
    };
  }

  /**
   * Respuesta para estudiante en nivel máximo
   */
  _generateMaxLevelResponse(_question) {
    const responses = [
      `Excelente pregunta de nivel crítico. Continuemos profundizando en las implicaciones de poder.`,
      `Muy buen análisis. ¿Qué otras dimensiones de esta problemática podríamos explorar?`,
      `Interesante perspectiva crítica. ¿Cómo se conecta esto con otros textos o contextos que conozcas?`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Exporta configuración y niveles (para documentación/investigación)
   */
  exportLevels() {
    return {
      levels: this.levels.map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
        keywords: l.keywords
      })),
      framework: 'Bloom + Literacidad Crítica',
      version: '1.0.0'
    };
  }
}

const exported = { ZDPDetector, BLOOM_LEVELS };

export default exported;
