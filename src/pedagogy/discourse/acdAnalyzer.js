/**
 * 🔍 ACD Analyzer - Análisis Crítico del Discurso
 * 
 * Basado en van Dijk, Fairclough, Wodak
 * 
 * Detecta:
 * - Marcos ideológicos (liberalismo, neoliberalismo, feminismo, etc.)
 * - Estrategias retóricas (eufemismo, nominalización, pasiva, etc.)
 * - Relaciones de poder implícitas
 * - Voces presentes y silenciadas
 * 
 * @module acdAnalyzer
 */

/**
 * Marcos ideológicos con sus marcadores léxicos
 */
export const IDEOLOGICAL_FRAMES = {
  liberalism: {
    name: 'Liberalismo Clásico',
    markers: ['libertad', 'individuo', 'derechos', 'autonomía', 'elección', 'voluntad', 'ciudadano'],
    color: '#3b82f6',
    questions: [
      '¿Qué concepción de "libertad" se asume aquí?',
      '¿Se ignoran condiciones estructurales que limitan esa libertad individual?'
    ]
  },
  neoliberalism: {
    name: 'Neoliberalismo',
    markers: ['mercado', 'competencia', 'eficiencia', 'productividad', 'emprendedor', 'innovación', 'flexibilidad', 'desregulación', 'privatización'],
    color: '#f59e0b',
    questions: [
      '¿Qué se naturaliza como "eficiente" sin cuestionar para quién?',
      '¿Qué valores humanos quedan subordinados a la lógica del mercado?'
    ]
  },
  conservatism: {
    name: 'Conservadurismo',
    markers: ['tradición', 'orden', 'familia', 'valores', 'estabilidad', 'autoridad', 'moral', 'deber'],
    color: '#8b5cf6',
    questions: [
      '¿Qué tradiciones se defienden y cuáles se omiten?',
      '¿Quién define los "valores" como universales?'
    ]
  },
  socialism: {
    name: 'Socialismo/Izquierda',
    markers: ['igualdad', 'colectivo', 'clase', 'trabajador', 'explotación', 'solidaridad', 'justicia social', 'redistribución'],
    color: '#ef4444',
    questions: [
      '¿Se visibiliza el conflicto de clases o se oculta?',
      '¿Qué modelo de igualdad se propone?'
    ]
  },
  feminism: {
    name: 'Feminismo',
    markers: ['género', 'patriarcado', 'machismo', 'opresión', 'empoderamiento', 'sororidad', 'cuidado', 'feminista'],
    color: '#ec4899',
    questions: [
      '¿Qué roles de género se reproducen o desafían?',
      '¿Se visibiliza el trabajo reproductivo y de cuidados?'
    ]
  },
  postcolonialism: {
    name: 'Poscolonialismo',
    markers: ['colonialismo', 'imperialismo', 'hegemonía', 'occidente', 'subalterno', 'descolonial', 'eurocentrismo', 'racismo'],
    color: '#10b981',
    questions: [
      '¿Qué perspectiva geopolítica se centra y cuál se margina?',
      '¿Se reproduce una mirada eurocéntrica?'
    ]
  },
  environmentalism: {
    name: 'Ecologismo',
    markers: ['naturaleza', 'sostenible', 'ecología', 'medio ambiente', 'cambio climático', 'recursos naturales', 'biodiversidad'],
    color: '#22c55e',
    questions: [
      '¿Se trata la naturaleza como recurso o como valor intrínseco?',
      '¿Quién paga los costos ambientales?'
    ]
  }
};

/**
 * Estrategias retóricas comunes
 */
export const RHETORICAL_STRATEGIES = [
  {
    name: 'Hipérbole/Generalización',
    pattern: /\b(siempre|nunca|todos|nadie|absolutamente|totalmente|completamente|jamás|ningún|cualquier)\b/gi,
    function: 'Exagera para dramatizar o simplificar',
    criticalQuestion: '¿Esta generalización absoluta es precisa? ¿Qué casos excepcionales se ignoran?',
    color: '#ef4444'
  },
  {
    name: 'Eufemismo',
    examples: [
      { harsh: 'despido', soft: 'ajuste de personal' },
      { harsh: 'invasión', soft: 'intervención' },
      { harsh: 'bombardeo', soft: 'ataque quirúrgico' },
      { harsh: 'tortura', soft: 'técnicas de interrogatorio mejoradas' },
      { harsh: 'pobreza', soft: 'vulnerabilidad' }
    ],
    function: 'Suaviza realidades negativas',
    criticalQuestion: '¿Qué realidad dura se oculta con este lenguaje edulcorado?',
    color: '#3b82f6'
  },
  {
    name: 'Nominalización',
    pattern: /\b\w+(ción|miento|dad|ismo|eza|ancia|encia)\b/gi,
    function: 'Convierte acciones en sustantivos, ocultando agentes',
    criticalQuestion: '¿QUIÉN realizó esta acción? ¿Quién tiene responsabilidad aquí?',
    example: '"La explotación continúa" → ¿Quién explota a quién?',
    color: '#8b5cf6'
  },
  {
    name: 'Voz Pasiva',
    pattern: /\b(fue|será|es|son|fueron|serán)\s+\w+(ado|ada|idos|idas|ido|ida)\b/gi,
    function: 'Oculta el agente responsable',
    criticalQuestion: '¿Quién HIZO esto? ¿Por qué se oculta la responsabilidad?',
    example: '"Se tomaron medidas" → ¿Quién las tomó?',
    color: '#f59e0b'
  },
  {
    name: 'Presuposición',
    markers: ['obviamente', 'claramente', 'naturalmente', 'es evidente', 'como todos sabemos', 'sin duda'],
    function: 'Presenta algo controvertido como obvio',
    criticalQuestion: '¿Esta asunción es compartida por TODOS? ¿Qué se da por sentado sin argumentar?',
    color: '#06b6d4'
  },
  {
    name: 'Legitimación por Autoridad',
    pattern: /\b(expertos?|científicos?|estudios?|investigaciones?|datos|estadísticas|instituciones?)\b/gi,
    function: 'Apela a autoridad para validar',
    criticalQuestion: '¿Qué expertos? ¿Financiados por quién? ¿Qué otros expertos discrepan?',
    color: '#10b981'
  },
  {
    name: 'Falsa Dicotomía',
    pattern: /\b(o\s+\w+|entre\s+\w+\s+y\s+\w+|solo\s+(dos|ambos)|elegir\s+entre)\b/gi,
    function: 'Reduce opciones a solo dos alternativas',
    criticalQuestion: '¿Realmente solo hay estas dos opciones? ¿Qué alternativas se excluyen del marco?',
    color: '#ec4899'
  }
];

/**
 * Clase principal del analizador ACD
 */
export class ACDAnalyzer {
  constructor() {
    this.frames = IDEOLOGICAL_FRAMES;
    this.strategies = RHETORICAL_STRATEGIES;
  }

  /**
   * Análisis completo de un texto
   * @param {string} text - Texto a analizar
   * @returns {Object} Análisis completo
   */
  analyze(text) {
    if (!text || typeof text !== 'string') {
      return this._emptyAnalysis();
    }

    const ideologicalFrames = this.detectIdeologicalFrames(text);
    const rhetoricalStrategies = this.detectRhetoricalStrategies(text);
    const powerRelations = this.analyzePowerRelations(text);
    const voiceAnalysis = this.analyzeVoices(text);

    return {
      ideologicalFrames,
      rhetoricalStrategies,
      powerRelations,
      voiceAnalysis,
      summary: this._generateSummary(ideologicalFrames, rhetoricalStrategies, powerRelations),
      timestamp: Date.now()
    };
  }

  /**
   * Detecta marcos ideológicos presentes en el texto
   * @param {string} text - Texto a analizar
   * @returns {Array} Marcos detectados ordenados por relevancia
   */
  detectIdeologicalFrames(text) {
    const _lowerText = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    const detected = Object.entries(this.frames).map(([key, frame]) => {
      const matches = frame.markers.reduce((acc, marker) => {
        const regex = new RegExp(`\\b${marker}\\w*\\b`, 'gi');
        const found = text.match(regex) || [];
        return acc.concat(found);
      }, []);

      const density = matches.length / wordCount;

      return {
        id: key,
        name: frame.name,
        color: frame.color,
        count: matches.length,
        density: Math.round(density * 10000) / 100, // Porcentaje con 2 decimales
        examples: [...new Set(matches)].slice(0, 5), // Máximo 5 ejemplos únicos
        criticalQuestions: frame.questions,
        markers: frame.markers.filter(m => 
          new RegExp(`\\b${m}`, 'i').test(text)
        )
      };
    }).filter(f => f.count > 0);

    // Ordenar por densidad descendente
    detected.sort((a, b) => b.density - a.density);

    return detected.slice(0, 3); // Top 3 más relevantes
  }

  /**
   * Detecta estrategias retóricas
   * @param {string} text - Texto a analizar
   * @returns {Array} Estrategias detectadas
   */
  detectRhetoricalStrategies(text) {
    const found = [];

    this.strategies.forEach(strategy => {
      if (strategy.pattern) {
        const matches = text.match(strategy.pattern);
        if (matches) {
          found.push({
            name: strategy.name,
            color: strategy.color,
            function: strategy.function,
            occurrences: matches.length,
            examples: [...new Set(matches.map(m => m.trim()))].slice(0, 3),
            criticalQuestion: strategy.criticalQuestion,
            exampleExplanation: strategy.example
          });
        }
      } else if (strategy.markers) {
        // Para estrategias basadas en marcadores (como presuposición)
        const matches = strategy.markers.filter(marker => 
          new RegExp(marker, 'i').test(text)
        );
        if (matches.length > 0) {
          found.push({
            name: strategy.name,
            color: strategy.color,
            function: strategy.function,
            occurrences: matches.length,
            examples: matches,
            criticalQuestion: strategy.criticalQuestion
          });
        }
      } else if (strategy.examples) {
        // Para eufemismos, buscar palabras suaves
        const foundEuphemisms = strategy.examples.filter(pair => 
          new RegExp(`\\b${pair.soft}\\b`, 'i').test(text)
        );
        if (foundEuphemisms.length > 0) {
          found.push({
            name: strategy.name,
            color: strategy.color,
            function: strategy.function,
            occurrences: foundEuphemisms.length,
            examples: foundEuphemisms.map(e => `"${e.soft}" (oculta: "${e.harsh}")`),
            criticalQuestion: strategy.criticalQuestion
          });
        }
      }
    });

    return found;
  }

  /**
   * Analiza relaciones de poder implícitas
   * @param {string} text - Texto a analizar
   * @returns {Object} Análisis de poder
   */
  analyzePowerRelations(text) {
    const powerMarkers = {
      dominance: ['controla', 'domina', 'impone', 'ordena', 'manda', 'dirige', 'gobierna'],
      resistance: ['resiste', 'opone', 'desafía', 'lucha', 'confronta', 'rebelde'],
      legitimation: ['legal', 'legítimo', 'autorizado', 'oficial', 'institucional'],
      marginalization: ['excluye', 'margina', 'invisibiliza', 'silencia', 'ignora']
    };

    const analysis = {};
    Object.entries(powerMarkers).forEach(([type, markers]) => {
      const found = markers.filter(m => 
        new RegExp(`\\b${m}\\w*\\b`, 'i').test(text)
      );
      if (found.length > 0) {
        analysis[type] = {
          count: found.length,
          examples: found
        };
      }
    });

    return {
      detected: analysis,
      summary: this._summarizePowerRelations(analysis),
      criticalQuestion: '¿Quién tiene PODER en este discurso? ¿Quién está subordinado? ¿Cómo se legitima esta jerarquía?'
    };
  }

  /**
   * Analiza voces presentes y ausentes
   * @param {string} text - Texto a analizar
   * @returns {Object} Análisis de voces
   */
  analyzeVoices(text) {
    // Detectar citas directas e indirectas
    const directQuotes = text.match(/"[^"]+"/g) || [];
    const indirectReferences = text.match(/\b(según|para|de acuerdo a|en palabras de)\s+\w+/gi) || [];

    // Detectar si menciona grupos sociales
    const socialGroups = {
      power: ['gobierno', 'empresa', 'corporación', 'autoridad', 'élite', 'líder'],
      subordinate: ['trabajador', 'ciudadano', 'pueblo', 'comunidad', 'víctima', 'minoría']
    };

    const presentVoices = {};
    Object.entries(socialGroups).forEach(([category, groups]) => {
      const found = groups.filter(g => 
        new RegExp(`\\b${g}\\w*\\b`, 'i').test(text)
      );
      if (found.length > 0) {
        presentVoices[category] = found;
      }
    });

    return {
      directQuotes: directQuotes.length,
      indirectReferences: indirectReferences.length,
      socialGroupsMentioned: presentVoices,
      criticalQuestions: [
        '¿Qué voces hablan DIRECTAMENTE en este texto?',
        '¿Qué grupos sociales están REPRESENTADOS?',
        '¿Qué perspectivas están AUSENTES o SILENCIADAS?',
        '¿Quién tiene el PRIVILEGIO de hablar y quién solo es hablado?'
      ]
    };
  }

  /**
   * Genera prompt para IA basado en análisis ACD
   * @param {Object} analysis - Resultado de analyze()
   * @param {string} userQuestion - Pregunta del estudiante
   * @param {string} textFragment - Fragmento del texto
   * @returns {string} Prompt para tutor IA
   */
  buildACDPrompt(analysis, userQuestion, textFragment) {
    const { ideologicalFrames, rhetoricalStrategies } = analysis;

    const topFrame = ideologicalFrames[0];
    const topStrategy = rhetoricalStrategies[0];

    return `# ANÁLISIS CRÍTICO DEL DISCURSO (ACD)

**Texto analizado**:
"${textFragment.slice(0, 300)}..."

**Pregunta del estudiante**:
"${userQuestion}"

---

## HALLAZGOS AUTOMÁTICOS

### 🎭 Marcos Ideológicos Detectados:
${ideologicalFrames.map(f => 
  `**${f.name}** (${f.density}% del texto)
   - Marcadores: ${f.examples.slice(0, 3).join(', ')}
   - Preguntas críticas: ${f.criticalQuestions[0]}`
).join('\n\n')}

### 🗣️ Estrategias Retóricas:
${rhetoricalStrategies.slice(0, 3).map(s =>
  `**${s.name}** (${s.occurrences} veces)
   - Ejemplos: ${s.examples.slice(0, 2).join(', ')}
   - Función: ${s.function}
   - Pregunta crítica: ${s.criticalQuestion}`
).join('\n\n')}

---

## TU TAREA COMO TUTOR SOCRÁTICO (ACD)

**IMPORTANTE**: NO des análisis completo. Haz preguntas que guíen al descubrimiento.

**Estrategia**:
1. Señala UN hallazgo relevante del análisis (ej: "${topFrame?.name || 'marco ideológico'} presente")
2. Conecta con la pregunta del estudiante
3. Haz 2-3 preguntas socráticas que empujen a descubrir:
   - ¿Qué INTERESES representa este discurso?
   - ¿Qué se NATURALIZA como inevitable o normal?
   - ¿Qué ALTERNATIVAS quedan fuera del marco?
4. Si detectaste ${topStrategy?.name || 'estrategia retórica'}, pregunta qué FUNCIÓN cumple

**Tono**: Socrático, no sentencioso. Preguntas > afirmaciones.
**Extensión**: Máximo 120 palabras.

**Responde en español:**`;
  }

  /**
   * Genera puntos de gamificación según análisis
   * @param {Object} analysis - Resultado de analyze()
   * @returns {Object} { points, reason, level }
   */
  calculateACDPoints(analysis) {
    const { ideologicalFrames, rhetoricalStrategies } = analysis;

    let points = 0;
    const reasons = [];

    // Puntos por identificar marcos ideológicos
    if (ideologicalFrames.length > 0) {
      points += 30 * ideologicalFrames.length;
      reasons.push(`Marcos ideológicos identificados: ${ideologicalFrames.map(f => f.name).join(', ')}`);
    }

    // Puntos por identificar estrategias retóricas
    if (rhetoricalStrategies.length > 0) {
      points += 20 * rhetoricalStrategies.length;
      reasons.push(`Estrategias retóricas detectadas: ${rhetoricalStrategies.length}`);
    }

    return {
      points,
      reasons,
      level: 'ACD Expert',
      message: points > 0 
        ? `🎯 ¡Análisis crítico del discurso! +${points} pts`
        : 'Continúa analizando para desbloquear puntos ACD'
    };
  }

  /**
   * Genera resumen ejecutivo del análisis
   */
  _generateSummary(frames, strategies, _power) {
    if (frames.length === 0 && strategies.length === 0) {
      return 'No se detectaron marcadores ideológicos o retóricos significativos en este fragmento.';
    }

    const frameSummary = frames.length > 0 
      ? `Marco dominante: ${frames[0].name} (${frames[0].density}%).`
      : '';
    
    const strategySummary = strategies.length > 0
      ? ` Estrategias: ${strategies.map(s => s.name).join(', ')}.`
      : '';

    return `${frameSummary}${strategySummary} Análisis crítico recomendado: cuestionar supuestos, identificar intereses, buscar voces silenciadas.`;
  }

  /**
   * Resumen de relaciones de poder
   */
  _summarizePowerRelations(analysis) {
    const types = Object.keys(analysis);
    if (types.length === 0) return 'No se detectaron marcadores de poder explícitos.';
    
    return `Marcadores de poder detectados: ${types.join(', ')}. Cuestiona: ¿quién ejerce poder y cómo se legitima?`;
  }

  /**
   * Análisis vacío por defecto
   */
  _emptyAnalysis() {
    return {
      ideologicalFrames: [],
      rhetoricalStrategies: [],
      powerRelations: { detected: {}, summary: '', criticalQuestion: '' },
      voiceAnalysis: { directQuotes: 0, indirectReferences: 0, socialGroupsMentioned: {}, criticalQuestions: [] },
      summary: 'Texto insuficiente para análisis.',
      timestamp: Date.now()
    };
  }

  /**
   * Exporta marcos y estrategias (para documentación)
   */
  exportFramework() {
    return {
      ideologicalFrames: Object.entries(this.frames).map(([key, frame]) => ({
        id: key,
        name: frame.name,
        markers: frame.markers
      })),
      rhetoricalStrategies: this.strategies.map(s => ({
        name: s.name,
        function: s.function,
        criticalQuestion: s.criticalQuestion
      })),
      version: '1.0.0',
      theoreticalBasis: 'Van Dijk, Fairclough, Wodak'
    };
  }
}

const exported = {
  ACDAnalyzer,
  IDEOLOGICAL_FRAMES,
  RHETORICAL_STRATEGIES
};

export default exported;

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.ACDAnalyzer = ACDAnalyzer;
}
