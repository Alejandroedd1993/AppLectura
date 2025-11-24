/**
 * @file Servicio de OpenAI para generación de notas de estudio
 * @module OpenAINotesService
 * @version 1.0.0
 * @description Servicio especializado para generar notas de estudio usando OpenAI API
 */

import { OpenAI } from 'openai';

/**
 * Servicio de OpenAI para notas de estudio
 * Maneja la comunicación con la API, caché y generación de contenido
 */
class OpenAINotesService {
  constructor() {
    // Cache interno para respuestas de la API
    this.cache = new Map();
    
    // Configuración de reintentos
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 segundos
    
    // Límites de tokens
    this.maxTokensInput = 4000;
    this.maxTokensOutput = 1000;
  }

  /**
   * Obtiene el cliente de OpenAI configurado
   * @returns {OpenAI} Cliente de OpenAI
   * @throws {Error} Si no se encuentra la API key
   */
  getClient() {
    try {
      const key = process.env.REACT_APP_OPENAI_API_KEY || 
                  localStorage.getItem('user_openai_api_key');
      
      if (!key) {
        throw new Error('No se encontró una clave API de OpenAI. Por favor, configura tu API key.');
      }

      return new OpenAI({
        apiKey: key,
        dangerouslyAllowBrowser: true
      });
    } catch (error) {
      console.error('Error al inicializar OpenAI:', error);
      throw new Error(`Error de configuración: ${error.message}`);
    }
  }

  /**
   * Genera una clave de caché basada en el contenido y tipo
   * @param {string} prefix - Prefijo para el tipo de operación
   * @param {string} content - Contenido a procesar
   * @returns {string} Clave de caché
   */
  generateCacheKey(prefix, content) {
    if (!content) return '';
    
    // Crear hash simple del contenido
    let hash = 0;
    const sample = content.substring(0, 200); // Usar muestra del contenido
    
    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }
    
    return `${prefix}_${Math.abs(hash)}_${content.length}`;
  }

  /**
   * Limita el texto para no exceder los límites de tokens
   * @param {string} text - Texto a limitar
   * @returns {string} Texto limitado
   */
  limitTextForAPI(text) {
    if (!text) return '';
    
    // Estimación aproximada: 1 token ≈ 4 caracteres
    const maxChars = this.maxTokensInput * 4;
    
    if (text.length <= maxChars) {
      return text;
    }
    
    return text.substring(0, maxChars) + '...';
  }

  /**
   * Realiza una llamada a la API con manejo de reintentos
   * @param {Function} apiCall - Función que realiza la llamada a la API
   * @param {string} operation - Nombre de la operación para logging
   * @returns {Promise<any>} Respuesta de la API
   */
  async callWithRetry(apiCall, operation = 'API call') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[OpenAI] ${operation} - Intento ${attempt}/${this.maxRetries}`);
        return await apiCall();
        
      } catch (error) {
        lastError = error;
        console.warn(`[OpenAI] ${operation} falló en intento ${attempt}:`, error.message);
        
        // Si es el último intento, no esperar
        if (attempt === this.maxRetries) {
          break;
        }
        
        // Esperar antes del siguiente intento, con backoff exponencial
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`[OpenAI] Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`${operation} falló después de ${this.maxRetries} intentos: ${lastError.message}`);
  }

  /**
   * Detecta automáticamente el tipo de texto
   * @param {string} texto - Texto a analizar
   * @returns {Promise<string>} Tipo de texto detectado
   */
  async detectarTipoTexto(texto) {
    if (!texto || texto.trim().length === 0) {
      throw new Error('No hay texto para analizar');
    }

    // Verificar caché
    const cacheKey = this.generateCacheKey('tipo', texto);
    if (this.cache.has(cacheKey)) {
      console.log('[OpenAI] Usando tipo de texto desde caché');
      return this.cache.get(cacheKey);
    }

    const prompt = `Analiza el siguiente texto y determina si es principalmente narrativo, poético, filosófico o ensayo.

INSTRUCCIONES:
- Responde SOLO con una de estas palabras exactas: "narrativo", "poetico", "filosofico", "ensayo"
- No agregues explicaciones ni comentarios adicionales
- Considera las características principales del texto

TEXTO A ANALIZAR:
${this.limitTextForAPI(texto)}`;

    try {
      const result = await this.callWithRetry(async () => {
        const openai = this.getClient();
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 50
        });
        
        return response.choices[0].message.content;
      }, 'Detección de tipo de texto');

      const tipoDetectado = result.toLowerCase().trim();
      
      // Validar que sea uno de los tipos esperados
      const tiposValidos = ['narrativo', 'poetico', 'filosofico', 'ensayo'];
      if (tiposValidos.includes(tipoDetectado)) {
        // Guardar en caché
        this.cache.set(cacheKey, tipoDetectado);
        console.log(`[OpenAI] Tipo detectado: ${tipoDetectado}`);
        return tipoDetectado;
      } else {
        console.warn(`[OpenAI] Tipo no reconocido: "${tipoDetectado}", usando "narrativo" por defecto`);
        return 'narrativo';
      }
      
    } catch (error) {
      console.error('[OpenAI] Error en detección de tipo:', error);
      throw new Error(`No se pudo detectar el tipo de texto: ${error.message}`);
    }
  }

  /**
   * Genera el prompt específico para cada tipo de texto
   * @param {string} tipo - Tipo de texto
   * @returns {string} Prompt específico
   */
  getPromptForTextType(tipo) {
    const prompts = {
      narrativo: `Crea notas de estudio concisas para aprendizaje espaciado sobre este texto narrativo.

ESTRUCTURA REQUERIDA (JSON):
{
  "tipoTexto": "narrativo",
  "titulo": "Título del texto o obra",
  "personajes": [{"nombre": "Nombre", "descripcion": "Características esenciales"}],
  "espacioTiempo": "Ubicación y época de la narrativa",
  "vozNarrativa": "Tipo de narrador (primera persona, tercera persona, etc.)",
  "temas": ["Tema principal", "Subtemas importantes"],
  "estructura": {
    "inicio": "Situación inicial y presentación",
    "desarrollo": "Conflicto y complicaciones",
    "desenlace": "Resolución y final"
  },
  "simbolos": [{"simbolo": "Elemento simbólico", "significado": "Interpretación"}],
  "conceptosClave": ["Concepto 1", "Concepto 2", "Concepto 3"]
}`,

      poetico: `Crea notas de estudio concisas para aprendizaje espaciado sobre este texto poético.

ESTRUCTURA REQUERIDA (JSON):
{
  "tipoTexto": "poetico",
  "titulo": "Título del poema o composición",
  "objetoPoetico": "Tema central o motivo lírico",
  "recursosLiterarios": [{"recurso": "Tipo de recurso", "ejemplo": "Ejemplo del texto", "efecto": "Efecto producido"}],
  "metricaRima": "Descripción técnica de métrica y rima",
  "tonoAtmosfera": "Tono emotivo y atmósfera del poema",
  "interpretacion": "Interpretación general del significado",
  "conceptosClave": ["Concepto 1", "Concepto 2", "Concepto 3"]
}`,

      filosofico: `Crea notas de estudio concisas para aprendizaje espaciado sobre este texto filosófico.

ESTRUCTURA REQUERIDA (JSON):
{
  "tipoTexto": "filosofico",
  "titulo": "Título o tema principal del texto",
  "ideasFundamentales": ["Ideas centrales del autor"],
  "preguntasClave": ["Preguntas filosóficas que plantea"],
  "argumentos": [{"premisa": "Premisa del argumento", "conclusion": "Conclusión lógica"}],
  "corrienteFilosofica": "Escuela o corriente filosófica",
  "conceptosEsenciales": [{"concepto": "Término filosófico", "definicion": "Definición clara"}],
  "conceptosClave": ["Concepto 1", "Concepto 2", "Concepto 3"]
}`,

      ensayo: `Crea notas de estudio concisas para aprendizaje espaciado sobre este ensayo.

ESTRUCTURA REQUERIDA (JSON):
{
  "tipoTexto": "ensayo",
  "titulo": "Título del ensayo",
  "tesisPrincipal": "Enunciado claro de la tesis",
  "ideasSecundarias": ["Ideas que apoyan la tesis"],
  "evidencia": [{"tipo": "Tipo de evidencia", "descripcion": "Descripción de la evidencia"}],
  "estructuraLogica": ["Secuencia lógica de argumentos"],
  "conclusiones": ["Conclusiones principales"],
  "conceptosClave": ["Concepto 1", "Concepto 2", "Concepto 3"]
}`
    };

    return prompts[tipo] || prompts.ensayo;
  }

  /**
   * Genera notas de estudio según el tipo de texto
   * @param {string} texto - Texto a analizar
   * @param {string} tipo - Tipo de texto
   * @returns {Promise<Object>} Notas estructuradas
   */
  async generarNotasSegunTipo(texto, tipo) {
    if (!texto || texto.trim().length === 0) {
      throw new Error('No hay texto para analizar');
    }

    // Verificar caché
    const cacheKey = this.generateCacheKey(`notas_${tipo}`, texto);
    if (this.cache.has(cacheKey)) {
      console.log('[OpenAI] Usando notas desde caché');
      return this.cache.get(cacheKey);
    }

    const promptInstrucciones = this.getPromptForTextType(tipo);
    const textoLimitado = this.limitTextForAPI(texto);

    const prompt = `${promptInstrucciones}

INSTRUCCIONES IMPORTANTES:
- Responde ÚNICAMENTE con el JSON solicitado
- No agregues comentarios, explicaciones o texto adicional
- Asegúrate de que el JSON sea válido
- Sé conciso pero informativo en cada campo

TEXTO A ANALIZAR:
${textoLimitado}`;

    try {
      const respuesta = await this.callWithRetry(async () => {
        const openai = this.getClient();
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: this.maxTokensOutput
        });
        
        return response.choices[0].message.content;
      }, `Generación de notas (${tipo})`);

      // Procesar y validar la respuesta
      const notasGeneradas = this.parseNotasResponse(respuesta, tipo);
      
      // Guardar en caché
      this.cache.set(cacheKey, notasGeneradas);
      
      console.log(`[OpenAI] Notas generadas exitosamente para tipo: ${tipo}`);
      return notasGeneradas;

    } catch (error) {
      console.error('[OpenAI] Error al generar notas:', error);
      throw new Error(`Error al generar notas de estudio: ${error.message}`);
    }
  }

  /**
   * Procesa y valida la respuesta de OpenAI
   * @param {string} respuesta - Respuesta cruda de OpenAI
   * @param {string} tipo - Tipo de texto esperado
   * @returns {Object} Notas estructuradas y validadas
   */
  parseNotasResponse(respuesta, tipo) {
    try {
      // Buscar el JSON en la respuesta
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : respuesta;
      
      const notas = JSON.parse(jsonString);
      
      // Validar estructura básica
      if (!notas.tipoTexto) {
        notas.tipoTexto = tipo;
      }
      
      if (!notas.titulo) {
        notas.titulo = 'Análisis de texto';
      }
      
      if (!notas.conceptosClave || !Array.isArray(notas.conceptosClave)) {
        notas.conceptosClave = [];
      }
      
      return notas;
      
    } catch (jsonError) {
      console.error('[OpenAI] Error al parsear JSON:', jsonError);
      console.log('[OpenAI] Respuesta recibida:', respuesta);
      
      // Crear estructura básica de respaldo
      return {
        tipoTexto: tipo,
        titulo: 'Error al procesar notas',
        error: 'No se pudo procesar la respuesta en formato JSON',
        respuestaOriginal: respuesta,
        conceptosClave: []
      };
    }
  }

  /**
   * Limpia el caché de respuestas
   * @param {string} prefix - Prefijo específico a limpiar (opcional)
   */
  clearCache(prefix = null) {
    if (prefix) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix));
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`[OpenAI] Cache limpiado para prefijo: ${prefix}`);
    } else {
      this.cache.clear();
      console.log('[OpenAI] Cache completamente limpiado');
    }
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Object} Estadísticas del caché
   */
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.keys()).reduce((acc, key) => {
        const type = key.split('_')[0];
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
    
    return stats;
  }
}

// Instancia singleton del servicio
const openAINotesService = new OpenAINotesService();

export default openAINotesService;
