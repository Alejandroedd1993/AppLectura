/**
 * Servicio de Literacidad Crítica
 * Integra búsqueda web con análisis de IA para desarrollar pensamiento crítico
 */

import webSearchService from './webSearchService';

class CriticalLiteracyService {
  constructor() {
    this.analysisTypes = {
      'contexto-social': {
        name: 'Contexto Social y Cultural',
        description: 'Analiza el texto en su contexto social, cultural e histórico',
        searchFocus: 'contexto social histórico cultural'
      },
      'perspectiva-critica': {
        name: 'Perspectiva Crítica',
        description: 'Busca diferentes puntos de vista y análisis críticos',
        searchFocus: 'análisis crítico debate controversias'
      },
      'fuentes-contraste': {
        name: 'Fuentes de Contraste',
        description: 'Encuentra fuentes académicas y evidencia que contraste o complemente',
        searchFocus: 'investigación académica evidencia científica'
      },
      'analisis-integral': {
        name: 'Análisis Integral',
        description: 'Examina dimensiones políticas, económicas y éticas',
        searchFocus: 'político económico ético implicaciones'
      }
    };
  }

  /**
   * Genera preguntas por etapas (literal → inferencial → crítico → literacidad)
   * usando el texto y (opcionalmente) el contexto crítico web ya generado.
   */
  generateStageQuestions(texto, context = {}) {
    // Pequeño helper para adaptar ejemplos al contenido
    const firstSentence = (texto || '').split(/[.!?]+/).map(s => s.trim()).find(Boolean) || '';
    const snippet = (texto || '').slice(0, 240);
    const fuentes = context?.webContext?.fuentes || [];

    const literal = [
      '¿Qué tema central aborda el texto?',
      `Cita una idea explícita del texto y explícalo con tus palabras (ej.: "${firstSentence.slice(0, 120)}...")`,
      '¿Cómo se relacionan dos ideas clave presentadas en el texto?',
      'Identifica una palabra o expresión relevante y explica su significado en este contexto.'
    ];

    const inferencial = [
      '¿Qué presuposiciones o inferencias pueden hacerse a partir de las ideas del texto?',
      'Identifica un posible doble sentido, ironía o mensaje implícito presente en el texto.',
      '¿Qué conexiones puedes establecer con tus conocimientos o experiencias previas?',
      '¿Qué consecuencias o implicaciones se desprenden de las ideas del texto?'
    ];

    const critico = [
      'Evalúa la solidez de un argumento del texto: ¿es claro, coherente y bien sustentado?',
      'Distingue entre hechos y opiniones en un fragmento del texto y justifica tu distinción.',
      'Contrasta un punto del texto con otra perspectiva: ¿encuentras inconsistencias o sesgos?',
      'Valora la fiabilidad de una idea apoyándote en criterios (fuentes, evidencia, consistencia)'
    ];

    const literacidad = [
      'Identifica voces presentes y posibles voces ausentes: ¿qué ideologías o valores se reflejan?',
      '¿Qué relaciones de poder emergen del discurso y a quién beneficia?',
      'Relaciona el texto con un problema social actual y toma postura argumentada.',
      'Propón una acción o micro-acción transformadora vinculada al tema (compromiso social)'
    ];

    // Ajuste dinámico con fuentes web si existen
    if (fuentes.length) {
      critico.unshift('A la luz de las fuentes externas halladas, ¿qué fortalezas o debilidades ves en el argumento principal?');
      literacidad.unshift('Integra una de las fuentes externas para ampliar o tensionar la lectura del texto original.');
    }

    return {
      etapas: [
        { id: 'literal', nombre: 'Comprensión literal', preguntas: literal },
        { id: 'inferencial', nombre: 'Comprensión inferencial', preguntas: inferencial },
        { id: 'critico', nombre: 'Análisis crítico–valorativo', preguntas: critico },
        { id: 'literacidad', nombre: 'Literacidad crítica', preguntas: literacidad }
      ],
      meta: {
        snippet,
        fuentesRecomendadas: fuentes.slice(0, 4)
      }
    };
  }

  /**
   * Analiza un texto y genera contexto crítico mediante búsqueda web
   */
  async generateCriticalContext(texto, config = {}) {
    try {
      console.log('🎯 Generando contexto crítico para literacidad');
      
      const {
        analysisType = 'contexto-social',
        provider = 'duckduckgo',
        maxResults = 6
      } = config;

      // 1. Extraer temas principales del texto
      const mainTopics = this.extractMainTopics(texto);
      
      // 2. Realizar búsqueda contextual
      const searchResults = await webSearchService.searchForCriticalContext(
        texto, 
        analysisType, 
        { provider, maxResults }
      );

      // 3. Procesar y estructurar resultados
      const criticalContext = this.processCriticalResults(searchResults, mainTopics, analysisType);

      return {
        success: true,
        analysisType,
        mainTopics,
        webContext: criticalContext,
        suggestions: this.generateCriticalQuestions(texto, criticalContext)
      };
    } catch (error) {
      console.error('❌ Error generando contexto crítico:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.generateOfflineContext(texto)
      };
    }
  }

  /**
   * Extrae los temas principales del texto para análisis crítico
   */
  extractMainTopics(texto) {
    const topics = {
      conceptosPrincipales: [],
      personajes: [],
      lugares: [],
      eventos: [],
      ideasClave: []
    };

    // Análisis básico de texto para identificar temas
    const sentences = texto.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const words = texto.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    // Encontrar palabras más frecuentes (conceptos clave)
    const wordFreq = {};
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Obtener top 5 conceptos más frecuentes
    topics.conceptosPrincipales = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    // Detectar posibles nombres propios (simplificado)
    const capitalizedWords = texto.match(/\b[A-Z][a-z]{3,}\b/g) || [];
    topics.personajes = [...new Set(capitalizedWords)].slice(0, 3);

    return topics;
  }

  /**
   * Procesa los resultados de búsqueda para crear contexto crítico
   */
  processCriticalResults(searchResults, mainTopics, analysisType) {
    const context = {
      tipo: this.analysisTypes[analysisType]?.name || analysisType,
      descripcion: this.analysisTypes[analysisType]?.description || '',
      fuentes: [],
      perspectivas: [],
      datosRelevantes: []
    };

    if (!searchResults.resultados) {
      return context;
    }

    searchResults.resultados.forEach(queryResult => {
      queryResult.results.forEach(result => {
        // Clasificar información según el tipo de análisis
        const info = {
          titulo: result.title,
          url: result.url,
          resumen: result.snippet,
          relevancia: result.relevanceScore || 0,
          fuente: result.source,
          categoria: this.categorizarResultado(result, analysisType)
        };

        context.fuentes.push(info);

        // Extraer perspectivas diferentes
        if (result.snippet) {
          const perspective = this.extractPerspective(result.snippet, analysisType);
          if (perspective) {
            context.perspectivas.push(perspective);
          }
        }
      });
    });

    // Limitar y ordenar por relevancia
    context.fuentes = context.fuentes
      .sort((a, b) => b.relevancia - a.relevancia)
      .slice(0, 6);

    return context;
  }

  /**
   * Categoriza un resultado según el tipo de análisis crítico
   */
  categorizarResultado(result, analysisType) {
    const snippet = result.snippet?.toLowerCase() || '';
    const title = result.title?.toLowerCase() || '';
    const text = `${title} ${snippet}`;

    const categories = {
      'contexto-social': {
        'historico': ['historia', 'histórico', 'siglo', 'época', 'periodo'],
        'cultural': ['cultura', 'cultural', 'sociedad', 'tradición'],
        'social': ['social', 'comunidad', 'grupo', 'clase']
      },
      'perspectiva-critica': {
        'academico': ['estudio', 'investigación', 'análisis', 'universidad'],
        'debate': ['debate', 'controversia', 'discusión', 'argumento'],
        'opinion': ['opinión', 'perspectiva', 'punto de vista', 'critica']
      },
      'fuentes-contraste': {
        'academico': ['revista', 'paper', 'estudio', 'investigación'],
        'oficial': ['gobierno', 'oficial', 'institución', 'organización'],
        'alternativo': ['alternativo', 'independiente', 'blog', 'opinión']
      }
    };

    const typeCategories = categories[analysisType] || {};
    
    for (const [category, keywords] of Object.entries(typeCategories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Extrae perspectivas del contenido
   */
  extractPerspective(snippet, analysisType) {
    if (!snippet || snippet.length < 50) return null;

    // Buscar indicadores de perspectiva
    const perspectiveIndicators = [
      'según', 'de acuerdo', 'argumenta', 'sostiene', 'considera',
      'critica', 'defiende', 'propone', 'sugiere', 'concluye'
    ];

    const hasIndicator = perspectiveIndicators.some(indicator => 
      snippet.toLowerCase().includes(indicator)
    );

    if (hasIndicator) {
      return {
        texto: snippet.substring(0, 200) + '...',
        tipo: analysisType,
        indicadores: perspectiveIndicators.filter(ind => 
          snippet.toLowerCase().includes(ind)
        )
      };
    }

    return null;
  }

  /**
   * Genera preguntas críticas basadas en el contexto encontrado
   */
  generateCriticalQuestions(texto, context) {
    const questions = [];
    
    if (context.fuentes.length > 0) {
      questions.push("¿Cómo se relaciona este texto con el contexto actual que encontramos en las fuentes web?");
      questions.push("¿Qué perspectivas adicionales aportan las fuentes externas a tu comprensión del texto?");
    }

    if (context.perspectivas.length > 0) {
      questions.push("¿Encuentras contradicciones o puntos de vista diferentes entre el texto y las fuentes externas?");
      questions.push("¿Cómo evalúas la credibilidad de las diferentes perspectivas encontradas?");
    }

    questions.push("¿Qué sesgos o limitaciones podrías identificar tanto en el texto original como en las fuentes web?");
    questions.push("¿Cómo influye el contexto histórico y social en la interpretación de este texto?");

    return questions;
  }

  /**
   * Genera contexto offline cuando no hay búsqueda web disponible
   */
  generateOfflineContext(texto) {
    return {
      tipo: 'Análisis Básico (Sin conexión web)',
      sugerencias: [
        "Considera el contexto histórico en el que fue escrito este texto",
        "Piensa en diferentes perspectivas que podrían tener otros lectores",
        "Reflexiona sobre los sesgos que podría contener el texto",
        "Evalúa la credibilidad de las afirmaciones presentadas"
      ]
    };
  }

  /**
   * Verifica si una palabra es de parada (stop word)
   */
  isStopWord(word) {
    const stopWords = new Set([
      'que', 'de', 'la', 'el', 'en', 'y', 'a', 'es', 'se', 'no', 'te', 'lo', 'le',
      'da', 'su', 'por', 'son', 'con', 'para', 'como', 'pero', 'sus', 'muy', 'más',
      'este', 'esta', 'uno', 'una', 'del', 'los', 'las', 'todo', 'está', 'ser',
      'son', 'fue', 'han', 'puede', 'sobre', 'sin', 'hasta', 'hay', 'donde'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }
}

// Instancia singleton
const criticalLiteracyService = new CriticalLiteracyService();

export default criticalLiteracyService;
export { CriticalLiteracyService };
