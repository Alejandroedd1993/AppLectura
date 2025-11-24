/**
 * Servicio de búsqueda web para enriquecer el análisis de texto con IA
 * Soporte para múltiples proveedores de búsqueda
 */

import { fetchWithTimeout } from '../utils/netUtils';

class WebSearchService {
  constructor() {
    this.providers = {
      tavily: {
        baseUrl: 'https://api.tavily.com/search',
        requiresKey: true
      },
      serper: {
        baseUrl: 'https://google.serper.dev/search',
        requiresKey: true
      },
      duckduckgo: {
        baseUrl: 'https://api.duckduckgo.com/',
        requiresKey: false
      }
    };
    
    this.defaultProvider = 'tavily';
    this.maxResults = 5;
    this.timeout = 10000; // 10 segundos
  }

  /**
   * Busca información relevante en la web basada en el contexto del texto
   * @param {string} query - Consulta de búsqueda
   * @param {string} provider - Proveedor de búsqueda (opcional)
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Array>} Resultados de búsqueda formateados
   */
  async searchWeb(query, provider = this.defaultProvider, options = {}) {
    try {
      console.log(`🔍 Buscando en web vía backend: "${query}"`);
      
      const searchOptions = {
        maxResults: options.maxResults || this.maxResults,
        language: options.language || 'es',
        ...options
      };

      // ✅ USAR BACKEND en lugar de llamar APIs externas directamente
      const response = await fetchWithTimeout('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          type: options.analysisType || 'general',
          maxResults: searchOptions.maxResults
        })
      }, 60000); // 60 segundos timeout para búsquedas

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Backend search error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Formatear resultados del backend al formato esperado por el frontend
      return (data.resultados || []).map(r => ({
        title: r.titulo,
        url: r.url,
        snippet: r.resumen || '',
        source: r.fuente,
        relevanceScore: r.score || 0,
        publishedDate: r.fecha
      }));
      
    } catch (error) {
      console.error('❌ Error en búsqueda web:', error);
      throw new Error(`Error en búsqueda web: ${error.message}`);
    }
  }

  /**
   * DEPRECADO: Métodos antiguos removidos
   * La búsqueda web ahora se maneja completamente a través del backend /api/web-search
   * 
   * Estos métodos hacían llamadas directas a APIs externas causando errores CORS:
   * - searchWithTavily() → fetch('https://api.tavily.com/search')
   * - searchWithSerper() → fetch('https://google.serper.dev/search')
   * - searchWithDuckDuckGo() → fetch('https://api.duckduckgo.com/')
   * 
   * Ahora todo pasa por el backend que maneja las claves API de forma segura.
   */

  // ===============================================
  // MÉTODOS DE FORMATEO Y UTILIDADES
  // ===============================================

  /**
   * Genera consultas de búsqueda inteligentes para literacidad crítica
   * Enfocadas en contexto social, cultural y político
   */
  generateCriticalLiteracyQueries(texto, tipoAnalisis = 'contexto-social') {
    const queries = [];
    
    // Extraer conceptos clave del texto
    const palabrasClave = this.extractKeywords(texto);
    const conceptosPrincipales = palabrasClave.slice(0, 3).join(' ');
    
    switch (tipoAnalisis) {
      case 'contexto-social':
        queries.push(`${conceptosPrincipales} contexto social histórico`);
        queries.push(`${conceptosPrincipales} impacto social contemporáneo`);
        queries.push(`${conceptosPrincipales} perspectiva sociológica`);
        break;
      
      case 'perspectiva-critica':
        queries.push(`${conceptosPrincipales} análisis crítico debate`);
        queries.push(`${conceptosPrincipales} controversias opiniones`);
        queries.push(`${conceptosPrincipales} puntos de vista alternativos`);
        break;
      
      case 'fuentes-contraste':
        queries.push(`${conceptosPrincipales} investigación académica reciente`);
        queries.push(`${conceptosPrincipales} estudios científicos evidencia`);
        queries.push(`${conceptosPrincipales} fuentes primarias documentos`);
        break;
      
      case 'analisis-integral':
        queries.push(`${conceptosPrincipales} contexto político económico`);
        queries.push(`${conceptosPrincipales} dimensiones culturales`);
        queries.push(`${conceptosPrincipales} implicaciones éticas`);
        break;
      
      case 'academico':
        queries.push(`${palabrasClave.slice(0, 3).join(' ')} investigación académica`);
        queries.push(`${palabrasClave.slice(0, 2).join(' ')} estudios recientes`);
        break;
      
      case 'historico':
        queries.push(`${palabrasClave.slice(0, 3).join(' ')} contexto histórico`);
        queries.push(`${palabrasClave.slice(0, 2).join(' ')} antecedentes`);
        break;
      
      case 'cientifico':
        queries.push(`${palabrasClave.slice(0, 3).join(' ')} investigación científica`);
        queries.push(`${palabrasClave.slice(0, 2).join(' ')} estudios peer-reviewed`);
        break;
      
      default:
        queries.push(`${conceptosPrincipales} información actualizada`);
        queries.push(`${conceptosPrincipales} contexto`);
    }
    
    return queries;
  }

  /**
   * Busca información contextual para desarrollo de literacidad crítica
   */
  async searchForCriticalContext(texto, tipoAnalisis, options = {}) {
    try {
      console.log(`🔍 Iniciando búsqueda para literacidad crítica: ${tipoAnalisis}`);
      
      const queries = this.generateCriticalLiteracyQueries(texto, tipoAnalisis);
      const allResults = [];
      
      for (const query of queries) {
        try {
          const results = await this.searchWeb(query, options.provider, {
            maxResults: Math.ceil(options.maxResults / queries.length) || 2,
            includeContent: true,
            language: 'es'
          });
          
          allResults.push({
            query,
            results: results.slice(0, 2) // Máximo 2 resultados por consulta
          });
        } catch (error) {
          console.warn(`⚠️ Error en consulta "${query}":`, error.message);
        }
      }
      
      return {
        tipoAnalisis,
        totalQueries: queries.length,
        resultados: allResults,
        summary: this.generateSearchSummary(allResults, tipoAnalisis)
      };
    } catch (error) {
      console.error('❌ Error en búsqueda de literacidad crítica:', error);
      throw error;
    }
  }

  /**
   * Genera un resumen de los resultados de búsqueda para el contexto crítico
   */
  generateSearchSummary(allResults, tipoAnalisis) {
    const totalResults = allResults.reduce((sum, queryResult) => sum + queryResult.results.length, 0);
    
    const summary = {
      totalResultados: totalResults,
      consultasRealizadas: allResults.length,
      tipoAnalisis,
      fuentesEncontradas: [],
      temasRelevantes: []
    };

    // Extraer fuentes únicas y temas
    allResults.forEach(queryResult => {
      queryResult.results.forEach(result => {
        if (result.url && !summary.fuentesEncontradas.includes(result.url)) {
          summary.fuentesEncontradas.push(result.url);
        }
        
        // Extraer palabras clave del título para identificar temas
        const palabrasTitulo = result.title?.toLowerCase().split(' ').filter(w => w.length > 4) || [];
        summary.temasRelevantes.push(...palabrasTitulo);
      });
    });

    // Eliminar duplicados de temas
    summary.temasRelevantes = [...new Set(summary.temasRelevantes)];
    
    return summary;
  }

  /**
   * Extrae palabras clave del texto (implementación básica)
   */
  extractKeywords(texto, maxKeywords = 5) {
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
      'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como',
      'pero', 'sus', 'han', 'fue', 'ser', 'está', 'todo', 'más', 'muy', 'puede', 'sobre'
    ]);

    const palabras = texto
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(palabra => palabra.length > 3 && !stopWords.has(palabra));

    // Contar frecuencias
    const frecuencias = {};
    palabras.forEach(palabra => {
      frecuencias[palabra] = (frecuencias[palabra] || 0) + 1;
    });

    // Ordenar por frecuencia y tomar las más relevantes
    return Object.entries(frecuencias)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([palabra]) => palabra);
  }

  /**
   * Verificar disponibilidad de búsqueda web en el backend
   * Reemplaza getAvailableProviders() que verificaba claves frontend
   */
  async checkBackendAvailability() {
    try {
      const response = await fetchWithTimeout('/api/web-search/test', {
        method: 'GET'
      }, 5000);
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.configuracion?.modo_funcionamiento !== 'simulada';
    } catch (error) {
      console.warn('⚠️ No se pudo verificar disponibilidad de búsqueda web:', error);
      return false;
    }
  }
}

// Instancia singleton
const webSearchService = new WebSearchService();

export default webSearchService;
export { WebSearchService };
