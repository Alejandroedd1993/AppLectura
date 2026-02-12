/**
 * Servicio RAG (Retrieval Augmented Generation)
 * Enriquece análisis de texto con contexto web actualizado
 * 
 * @module ragEnrichmentService
 */

import webSearchService from './webSearchService';
import { shouldSearchWeb, generateSearchQueries, extractKeywords } from './webSearchDetector';

import logger from '../utils/logger';
/**
 * Enriquece el texto con contexto web relevante usando RAG
 * 
 * @param {string} texto - Texto original a analizar
 * @param {Object} metadata - Metadatos opcionales del texto
 * @returns {Promise<Object>} Contexto web enriquecido
 * 
 * @example
 * const enrichment = await enrichWithWebContext(texto, { genero_textual: 'noticia' });
 * if (enrichment.requires_web_search) {
 *   logger.log('Fuentes:', enrichment.web_context.sources);
 * }
 */
export async function enrichWithWebContext(texto, metadata = {}) {
  logger.log('🔍 RAG: Verificando necesidad de búsqueda web...');
  
  try {
    // ============================================================
    // 1. DETECTAR SI REQUIERE BÚSQUEDA WEB
    // ============================================================
    const searchDecision = shouldSearchWeb(texto, metadata);
    
    if (!searchDecision.needsWeb) {
      logger.log('✅ RAG: Búsqueda web no requerida');
      return {
        requires_web_search: false,
        search_decision: searchDecision,
        web_context: null,
        mode: 'offline'
      };
    }

    logger.log(`🌐 RAG: Búsqueda web ACTIVADA (confianza: ${(searchDecision.confidence * 100).toFixed(1)}%)`);
    logger.log('   Razones:', searchDecision.reasons);

    // ============================================================
    // 2. GENERAR QUERIES INTELIGENTES
    // ============================================================
    const queries = generateSearchQueries(texto, searchDecision);
    
    if (queries.length === 0) {
      logger.warn('⚠️ RAG: No se pudieron generar queries de búsqueda');
      return {
        requires_web_search: true,
        search_decision: searchDecision,
        web_context: null,
        error: 'No se generaron queries válidas'
      };
    }

    logger.log(`📝 RAG: Generadas ${queries.length} queries de búsqueda:`);
    queries.forEach(q => logger.log(`   - [${q.type}] ${q.text}`));

    // ============================================================
    // 3. EJECUTAR BÚSQUEDAS EN PARALELO
    // ============================================================
    logger.log('🔄 RAG: Ejecutando búsquedas web en paralelo...');
    
    const searchPromises = queries.map(async (query) => {
      try {
        const results = await webSearchService.searchWeb(query.text, 'tavily', {
          maxResults: 3,
          searchDepth: 'basic',
          includeContent: true,
          language: 'es'
        });
        
        return {
          query: query,
          results: results || [],
          success: true
        };
      } catch (error) {
        logger.warn(`⚠️ RAG: Búsqueda fallida para "${query.text}":`, error.message);
        return {
          query: query,
          results: [],
          success: false,
          error: error.message
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    
    // Filtrar búsquedas exitosas
    const successfulSearches = searchResults.filter(r => r.success && r.results.length > 0);
    
    if (successfulSearches.length === 0) {
      logger.warn('⚠️ RAG: Ninguna búsqueda retornó resultados');
      return {
        requires_web_search: true,
        search_decision: searchDecision,
        web_context: null,
        error: 'No se encontraron resultados web'
      };
    }

    logger.log(`✅ RAG: ${successfulSearches.length}/${queries.length} búsquedas exitosas`);

    // ============================================================
    // 4. PROCESAR Y ESTRUCTURAR CONTEXTO WEB
    // ============================================================
    const webContext = processWebResults(successfulSearches, texto);
    
    logger.log(`📊 RAG: Contexto web estructurado:`);
    logger.log(`   - ${webContext.sources.length} fuentes encontradas`);
    logger.log(`   - ${webContext.key_findings.length} hallazgos clave`);
    logger.log(`   - Categorías: ${webContext.categories.join(', ')}`);

    return {
      requires_web_search: true,
      search_decision: searchDecision,
      web_context: webContext,
      raw_results: searchResults,
      mode: 'enriched',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('❌ RAG: Error en enriquecimiento:', error);
    return {
      requires_web_search: true,
      web_context: null,
      error: error.message,
      mode: 'error'
    };
  }
}

/**
 * Procesa resultados de búsquedas web y extrae información relevante
 * 
 * @param {Array} searchResults - Resultados de búsquedas exitosas
 * @param {string} originalText - Texto original para contexto
 * @returns {Object} Contexto web estructurado
 */
function processWebResults(searchResults, originalText) {
  const webContext = {
    searches_performed: searchResults.length,
    total_results: 0,
    sources: [],
    key_findings: [],
    categories: [],
    summary: '',
    relevance_score: 0
  };

  // ============================================================
  // 1. EXTRAER FUENTES
  // ============================================================
  const allSources = [];
  
  searchResults.forEach(searchResult => {
    const { query, results } = searchResult;
    
    webContext.total_results += results.length;
    
    // Agregar categoría de búsqueda
    if (!webContext.categories.includes(query.type)) {
      webContext.categories.push(query.type);
    }

    results.forEach(result => {
      allSources.push({
        title: result.title || 'Sin título',
        url: result.url || '',
        snippet: result.snippet || result.content || '',
        query_type: query.type,
        query_purpose: query.purpose,
        score: result.score || 0,
        published_date: result.published_date || null
      });
    });
  });

  // Ordenar por relevancia (score) y tomar los mejores
  webContext.sources = allSources
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8);  // Máximo 8 fuentes

  // ============================================================
  // 2. EXTRAER HALLAZGOS CLAVE
  // ============================================================
  webContext.key_findings = extractKeyFindings(webContext.sources, originalText);

  // ============================================================
  // 3. GENERAR RESUMEN DEL CONTEXTO WEB
  // ============================================================
  webContext.summary = generateWebContextSummary(webContext);

  // ============================================================
  // 4. CALCULAR RELEVANCIA
  // ============================================================
  webContext.relevance_score = calculateRelevanceScore(webContext);

  return webContext;
}

/**
 * Extrae hallazgos clave de las fuentes web
 * 
 * @param {Array} sources - Fuentes web encontradas
 * @param {string} originalText - Texto original
 * @returns {Array<Object>} Hallazgos clave estructurados
 */
function extractKeyFindings(sources, originalText) {
  const findings = [];
  const keywords = extractKeywords(originalText, 5);

  sources.forEach((source, index) => {
    if (index >= 5) return;  // Máximo 5 hallazgos

    const snippet = source.snippet || '';
    
    // Verificar si el snippet contiene palabras clave del texto original
    const relevance = keywords.filter(kw => 
      snippet.toLowerCase().includes(kw.toLowerCase())
    ).length;

    if (relevance > 0 || index < 3) {  // Incluir al menos los 3 primeros
      findings.push({
        text: snippet.substring(0, 300),  // Limitar a 300 caracteres
        source: source.title,
        url: source.url,
        type: source.query_type,
        relevance: relevance,
        date: source.published_date
      });
    }
  });

  return findings.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Genera un resumen del contexto web encontrado
 * 
 * @param {Object} webContext - Contexto web estructurado
 * @returns {string} Resumen textual
 */
function generateWebContextSummary(webContext) {
  const { sources, categories, key_findings } = webContext;
  
  let summary = `Se encontraron ${sources.length} fuentes web relevantes `;
  
  if (categories.length > 0) {
    const categoryNames = {
      context: 'contexto general',
      statistics: 'datos estadísticos',
      news: 'noticias recientes',
      policies: 'políticas públicas'
    };
    
    const categoryList = categories.map(cat => categoryNames[cat] || cat).join(', ');
    summary += `sobre ${categoryList}. `;
  }
  
  if (key_findings.length > 0) {
    summary += `Se identificaron ${key_findings.length} hallazgos clave que contextualizan el análisis.`;
  }

  return summary;
}

/**
 * Calcula un score de relevancia del contexto web
 * 
 * @param {Object} webContext - Contexto web
 * @returns {number} Score entre 0 y 1
 */
function calculateRelevanceScore(webContext) {
  let score = 0;
  
  // Puntos por fuentes encontradas (máx 0.3)
  score += Math.min(webContext.sources.length / 10, 0.3);
  
  // Puntos por hallazgos relevantes (máx 0.4)
  score += Math.min(webContext.key_findings.length / 5, 0.4);
  
  // Puntos por diversidad de categorías (máx 0.3)
  score += Math.min(webContext.categories.length / 4, 0.3);

  return Math.min(score, 1.0);
}

/**
 * Construye un prompt enriquecido con contexto web para la IA
 * 
 * @param {string} originalText - Texto original a analizar
 * @param {Object} enrichment - Resultado de enrichWithWebContext
 * @param {string} basePrompt - Prompt base del análisis
 * @returns {string} Prompt enriquecido con contexto web
 */
export function buildEnrichedPrompt(originalText, enrichment, basePrompt = '') {
  let prompt = basePrompt || '';
  
  // Agregar texto original
  prompt += `\n\nTEXTO A ANALIZAR:\n`;
  prompt += `${originalText.substring(0, 3000)}${originalText.length > 3000 ? '...' : ''}\n`;

  // Si hay contexto web, agregarlo
  if (enrichment.requires_web_search && enrichment.web_context) {
    const { web_context } = enrichment;
    
    prompt += `\n${'='.repeat(60)}\n`;
    prompt += `CONTEXTO WEB ACTUALIZADO (obtenido de internet)\n`;
    prompt += `${'='.repeat(60)}\n\n`;
    
    prompt += `📊 Resumen del contexto: ${web_context.summary}\n\n`;

    // Agregar hallazgos clave
    if (web_context.key_findings && web_context.key_findings.length > 0) {
      prompt += `🔍 HALLAZGOS CLAVE DE FUENTES ACTUALES:\n\n`;
      
      web_context.key_findings.forEach((finding, index) => {
        prompt += `${index + 1}. ${finding.text}\n`;
        if (finding.date) {
          prompt += `   📅 Fecha: ${finding.date}\n`;
        }
        prompt += `   🔗 Fuente: ${finding.source}\n\n`;
      });
    }

    // Agregar lista de fuentes consultadas
    if (web_context.sources && web_context.sources.length > 0) {
      prompt += `\n📚 FUENTES WEB CONSULTADAS:\n`;
      
      web_context.sources.slice(0, 5).forEach((source, index) => {
        prompt += `${index + 1}. ${source.title}\n`;
        prompt += `   ${source.url}\n`;
        if (source.query_purpose) {
          prompt += `   Propósito: ${source.query_purpose}\n`;
        }
        prompt += `\n`;
      });
    }

    prompt += `${'='.repeat(60)}\n\n`;
    
    prompt += `INSTRUCCIONES PARA EL ANÁLISIS:\n`;
    prompt += `- Integra el contexto web actual en tu análisis cuando sea relevante\n`;
    prompt += `- Si el texto menciona datos o eventos, contrasta con la información web\n`;
    prompt += `- Cita las fuentes web cuando uses información de ellas\n`;
    prompt += `- Evalúa si el texto está actualizado según el contexto web\n\n`;
  }

  return prompt;
}

/**
 * Formatea el contexto web para presentación en UI
 * 
 * @param {Object} webContext - Contexto web estructurado
 * @returns {Object} Contexto formateado para UI
 */
export function formatWebContextForUI(webContext) {
  if (!webContext) return null;

  return {
    summary: webContext.summary,
    sourcesCount: webContext.sources.length,
    sources: webContext.sources.map(s => ({
      title: s.title,
      url: s.url,
      type: s.query_type,
      snippet: s.snippet.substring(0, 150) + '...'
    })),
    findings: webContext.key_findings.map(f => ({
      text: f.text,
      source: f.source,
      relevance: f.relevance
    })),
    categories: webContext.categories,
    relevanceScore: webContext.relevance_score,
    timestamp: new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

export default {
  enrichWithWebContext,
  buildEnrichedPrompt,
  formatWebContextForUI
};
