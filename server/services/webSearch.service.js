import { parseBool } from '../utils/envUtils.js';

export const clampWebResultCount = (value, { min = 1, max = 10, fallback = 5 } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

export const sanitizeWebQuery = (query, maxLen = 500) => {
  const q = String(query ?? '').trim();
  if (!q) return '';
  return q.slice(0, maxLen);
};

export const isWebSearchEnabled = () => parseBool(process.env.ENABLE_WEB_SEARCH);

/**
 * Helper reutilizable: obtiene fuentes web con la misma prioridad de proveedores
 * (Tavily -> Serper -> Bing -> Simulada) y normaliza al formato que consume PreLectura.
 *
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array<{title: string, url: string, snippet: string, score: number}>>}
 */
export async function searchWebSources(query, maxResults = 5) {
  const enabled = isWebSearchEnabled();
  const q = sanitizeWebQuery(query);
  if (!q) return [];

  const max = clampWebResultCount(maxResults, { min: 1, max: 10, fallback: 5 });

  let resultados;
  if (enabled && process.env.TAVILY_API_KEY) {
    resultados = await buscarConTavily(q, max);
  } else if (enabled && process.env.SERPER_API_KEY) {
    resultados = await buscarConSerper(q, max);
  } else if (enabled && process.env.BING_SEARCH_API_KEY) {
    resultados = await buscarConBing(q, max);
  } else {
    resultados = await busquedaSimulada(q);
  }

  const normalized = (Array.isArray(resultados) ? resultados : [])
    .filter(Boolean)
    .map((item) => {
      const title = String(item.titulo ?? item.title ?? '').trim();
      const url = String(item.url ?? item.link ?? '').trim();
      const snippet = String(item.resumen ?? item.snippet ?? item.content ?? '').trim();

      let score = 0.4;
      if (typeof item.score === 'number' && Number.isFinite(item.score)) {
        score = item.score;
      } else if (typeof item.posicion === 'number' && Number.isFinite(item.posicion) && item.posicion > 0) {
        score = 1 / item.posicion;
      }

      return {
        title: title || url,
        url,
        snippet,
        score
      };
    })
    .filter((source) => source.url);

  return normalized.slice(0, max);
}

async function buscarConTavily(query, maxResults) {
  try {
    console.log('🌐 Usando Tavily AI Search');

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_content: true,
        max_results: Math.min(maxResults, 5),
        include_domains: [],
        exclude_domains: [],
        language: 'es'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavily API error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    const resultados = data.results?.map(item => ({
      titulo: item.title,
      resumen: item.content?.substring(0, 300) || item.snippet || '',
      url: item.url,
      fuente: extraerDominio(item.url),
      fecha: item.published_date || null,
      score: item.score || 0,
      contenidoCompleto: item.content || null
    })) || [];

    if (data.answer) {
      console.log('✅ Tavily proporcionó respuesta automática');
      resultados.tavilyAnswer = data.answer;
    }

    return resultados;
  } catch (error) {
    console.error('❌ Error Tavily API:', error.message);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      throw new Error('API key de Tavily inválida o no configurada. Verifica TAVILY_API_KEY en .env');
    }

    if (error.message.includes('429') || error.message.includes('rate limit')) {
      throw new Error('Límite de búsquedas Tavily excedido. Considera upgrade de plan o espera unos minutos.');
    }

    throw error;
  }
}

async function buscarConSerper(query, maxResults) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
        hl: 'es',
        gl: 'ec'
      })
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();

    return data.organic?.map(item => ({
      titulo: item.title,
      resumen: item.snippet,
      url: item.link,
      fuente: extraerDominio(item.link),
      fecha: item.date || null,
      posicion: item.position
    })) || [];
  } catch (error) {
    console.error('Error Serper API:', error);
    throw error;
  }
}

async function buscarConBing(query, maxResults) {
  try {
    const endpoint = 'https://api.bing.microsoft.com/v7.0/search';
    const params = new URLSearchParams({
      q: query,
      count: maxResults,
      mkt: 'es-EC',
      safeSearch: 'Moderate'
    });

    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status}`);
    }

    const data = await response.json();

    return data.webPages?.value?.map(item => ({
      titulo: item.name,
      resumen: item.snippet,
      url: item.url,
      fuente: extraerDominio(item.url),
      fecha: item.dateLastCrawled || null
    })) || [];
  } catch (error) {
    console.error('Error Bing API:', error);
    throw error;
  }
}

async function busquedaSimulada(query) {
  console.log('🔄 Usando búsqueda simulada (sin API keys configuradas)');

  const datosSimulados = {
    'pobreza ecuador': [
      {
        titulo: 'Pobreza en Ecuador alcanza 25.2% según INEC 2024',
        resumen: 'El Instituto Nacional de Estadística reporta que la pobreza por ingresos afecta a 1 de cada 4 ecuatorianos. La pobreza extrema se ubicó en 8.2%.',
        url: 'https://www.ecuadorencifras.gob.ec/pobreza-2024',
        fuente: 'INEC Ecuador',
        fecha: '2024-09-01'
      },
      {
        titulo: 'Principales causas de pobreza en Ecuador según BM',
        resumen: 'El Banco Mundial identifica desempleo juvenil, falta de acceso a educación de calidad y migración como factores clave de la pobreza ecuatoriana.',
        url: 'https://www.bancomundial.org/ecuador-pobreza',
        fuente: 'Banco Mundial',
        fecha: '2024-08-15'
      }
    ],
    'educación ecuador estadísticas': [
      {
        titulo: 'Sistema educativo ecuatoriano: avances y desafíos 2024',
        resumen: 'Ministerio de Educación reporta 95% de cobertura en educación básica, pero persisten brechas en áreas rurales y calidad educativa.',
        url: 'https://educacion.gob.ec/estadisticas-2024',
        fuente: 'MinEduc Ecuador',
        fecha: '2024-07-20'
      }
    ],
    'medio ambiente ecuador': [
      {
        titulo: 'Ecuador aprueba nueva ley de cambio climático',
        resumen: 'La Asamblea Nacional aprobó normativa para reducir emisiones 50% al 2030. Incluye incentivos para energías renovables.',
        url: 'https://www.ambiente.gob.ec/ley-climatica-2024',
        fuente: 'Ministerio del Ambiente',
        fecha: '2024-09-10'
      }
    ]
  };

  const queryLower = query.toLowerCase();
  let resultadosEncontrados = [];

  Object.entries(datosSimulados).forEach(([clave, datos]) => {
    if (queryLower.includes(clave.split(' ')[0]) || clave.includes(queryLower.split(' ')[0])) {
      resultadosEncontrados.push(...datos);
    }
  });

  if (resultadosEncontrados.length === 0) {
    resultadosEncontrados = [
      {
        titulo: `Información sobre "${query}" - Búsqueda contextual`,
        resumen: `Se encontraron referencias relacionadas con ${query}. Para obtener datos específicos y actualizados, considera consultar fuentes oficiales locales.`,
        url: '#busqueda-contextual',
        fuente: 'Búsqueda contextual',
        fecha: new Date().toISOString().split('T')[0]
      }
    ];
  }

  return resultadosEncontrados;
}

function extraerDominio(url) {
  try {
    const dominio = new URL(url).hostname;
    return dominio.replace('www.', '');
  } catch {
    return 'Fuente desconocida';
  }
}