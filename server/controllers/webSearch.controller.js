/**
 * Controlador para búsquedas web contextuales
 * Permite obtener información actual de Internet para contextualizar análisis crítico
 */

/**
 * Realiza búsqueda web contextual
 * @param {Object} req - Request con query, type, maxResults
 * @param {Object} res - Response con resultados estructurados
 */
const buscarWeb = async (req, res) => {
  try {
    const { query, type, maxResults = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query de búsqueda requerida',
        codigo: 'QUERY_REQUIRED'
      });
    }
    
    console.log(`🔍 Búsqueda web: ${query} (tipo: ${type})`);
    
    // Usar diferentes estrategias según disponibilidad de APIs
    let resultados;
    let apiUtilizada = 'simulada';
    
    if (process.env.TAVILY_API_KEY) {
      // Opción 1: Tavily AI (Recomendado - Optimizado para IA)
      resultados = await buscarConTavily(query, maxResults);
      apiUtilizada = 'tavily';
    } else if (process.env.SERPER_API_KEY) {
      // Opción 2: Serper API (Google Search)
      resultados = await buscarConSerper(query, maxResults);
      apiUtilizada = 'serper';
    } else if (process.env.BING_SEARCH_API_KEY) {
      // Opción 3: Bing Search API
      resultados = await buscarConBing(query, maxResults);
      apiUtilizada = 'bing';
    } else {
      // Opción 4: Búsqueda simulada con datos contextuales
      resultados = await busquedaSimulada(query, type);
      apiUtilizada = 'simulada';
    }
    
    // Filtrar y procesar resultados según el tipo de búsqueda
    const resultadosProcesados = procesarResultadosPorTipo(resultados, type, query);
    
    res.json({
      query,
      type,
      resultados: resultadosProcesados.slice(0, maxResults),
      resumen: generarResumenBusqueda(resultadosProcesados, type),
      fuentes: extraerFuentesPrincipales(resultadosProcesados),
      fecha: new Date().toISOString(),
      api_utilizada: apiUtilizada
    });
    
  } catch (error) {
    console.error('❌ Error en búsqueda web:', error);
    
    res.status(500).json({
      error: 'Error en búsqueda web',
      detalle: error.message,
      query: req.body.query,
      fallback_disponible: true
    });
  }
};

/**
 * Responde con IA basándose en resultados de búsqueda web
 * Body: { query: string, maxResults?: number, provider?: 'openai'|'deepseek'|'smart' }
 */
const responderBusquedaIA = async (req, res) => {
  try {
    const { query, maxResults = 5, provider = 'smart', type } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: 'Query requerida', codigo: 'QUERY_REQUIRED' });
    }

    // 1) Obtener resultados (usa las mismas estrategias existentes)
    // Intento 1: respetar "type" si lo envían; si no, no filtrar
    const maxInterno = Math.max(5, Math.min(12, maxResults * 2));
    const reqBusqueda = { body: { query, maxResults: maxInterno, type } };
    let payloadBusqueda;
    await buscarWeb(reqBusqueda, {
      status: () => ({ json: (data) => (payloadBusqueda = data) }),
      json: (data) => (payloadBusqueda = data)
    });

    let resultados = payloadBusqueda?.resultados || [];
    let fuentes = payloadBusqueda?.fuentes || [];

    // Intento 2: si no hay resultados (p. ej., por filtros de "type"), reintentar sin tipo
    if (!resultados.length) {
      const reqBusquedaAmplia = { body: { query, maxResults: maxInterno } };
      let payloadAmpliado;
      await buscarWeb(reqBusquedaAmplia, {
        status: () => ({ json: (data) => (payloadAmpliado = data) }),
        json: (data) => (payloadAmpliado = data)
      });
      resultados = payloadAmpliado?.resultados || resultados;
      fuentes = payloadAmpliado?.fuentes || fuentes;
      // Mantener api_utilizada de cualquiera de los dos intentos
      payloadBusqueda = payloadAmpliado || payloadBusqueda;
    }

    // 2) Armar prompt compacto con citas
    const contextLines = resultados.slice(0, maxResults).map((r, i) => (
      `(${i + 1}) ${r.titulo} — ${r.resumen} [${r.fuente}] <${r.url}>`
    ));

    const pregunta = `Responde de forma concisa y en español a la consulta del usuario usando SOLO la evidencia listada.
Enumera afirmaciones clave con viñetas y añade citas entre corchetes con el índice de la fuente (p. ej., [1], [2]).
Si algo no está en las fuentes, dilo explícitamente.
Consulta: ${query}
Fuentes:
${contextLines.join('\n')}`;

    // 3) Elegir proveedor
    const usarOpenAI = provider === 'openai' || (provider === 'smart' && !!process.env.OPENAI_API_KEY);
    const usarDeepseek = provider === 'deepseek' || (provider === 'smart' && !usarOpenAI);

    let respuestaIA = null;
    let proveedorUsado = usarOpenAI ? 'openai' : (usarDeepseek ? 'deepseek' : 'basico');

    if (usarOpenAI) {
      // Llamar al cliente OpenAI ya configurado
      const { openai } = await import('../config/apiClients.js');
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-1106',
        messages: [
          { role: 'system', content: 'Eres un asistente que sintetiza hallazgos con citas numeradas.' },
          { role: 'user', content: pregunta }
        ],
        temperature: 0.2,
        max_tokens: 500
      });
      respuestaIA = completion.choices?.[0]?.message?.content?.trim() || null;
    } else if (usarDeepseek) {
      // Fallback sencillo: usar fetch a DeepSeek si hay API key configurada
      if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY no configurada');
      }
      const resp = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Eres un asistente que sintetiza hallazgos con citas numeradas.' },
            { role: 'user', content: pregunta }
          ],
          temperature: 0.2,
          max_tokens: 500
        })
      });
      if (!resp.ok) throw new Error(`DeepSeek API error: ${resp.status}`);
      const data = await resp.json();
      respuestaIA = data.choices?.[0]?.message?.content?.trim() || null;
    }

    // 4) Fallback básico si no hay proveedor/clave
    if (!respuestaIA) {
      proveedorUsado = 'basico';
      respuestaIA = `Resumen de resultados para "${query}":\n` +
        resultados.map((r, i) => `- ${r.titulo} [${i + 1}] — ${r.resumen}`).join('\n') +
        `\n\nFuentes: ` + fuentes.map((f, i) => `[${i + 1}] ${f}`).join(', ');
    }

    return res.json({
      query,
      proveedor: proveedorUsado,
      respuesta: respuestaIA,
      citas: resultados.slice(0, maxResults).map((r, i) => ({ idx: i + 1, titulo: r.titulo, url: r.url, fuente: r.fuente })),
      fecha: new Date().toISOString(),
      api_busqueda: payloadBusqueda?.api_utilizada || 'desconocida'
    });
  } catch (error) {
    console.error('❌ Error en responderBusquedaIA:', error);
    return res.status(500).json({ error: 'Error en respuesta con IA', detalle: error.message });
  }
};

/**
 * Búsqueda usando Tavily AI (Recomendado)
 * API especializada para IA con extracción automática de contenido
 */
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
        query: query,
        search_depth: 'advanced',  // 'basic' o 'advanced'
        include_answer: true,       // Resumen automático
        include_content: true,      // Contenido completo de páginas
        max_results: Math.min(maxResults, 5),
        include_domains: [],        // Opcional: restringir a ciertos dominios
        exclude_domains: [],        // Opcional: excluir dominios
        language: 'es'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavily API error: ${response.status} - ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Formatear resultados al formato estándar
    const resultados = data.results?.map(item => ({
      titulo: item.title,
      resumen: item.content?.substring(0, 300) || item.snippet || '',
      url: item.url,
      fuente: extraerDominio(item.url),
      fecha: item.published_date || null,
      score: item.score || 0,
      contenidoCompleto: item.content || null  // Contenido completo para análisis profundo
    })) || [];
    
    // Si Tavily proporciona un answer automático, agregarlo como metadata
    if (data.answer) {
      console.log('✅ Tavily proporcionó respuesta automática');
      resultados.tavilyAnswer = data.answer;
    }
    
    return resultados;
    
  } catch (error) {
    console.error('❌ Error Tavily API:', error.message);
    
    // Si es error de API key, dar mensaje específico
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      throw new Error('API key de Tavily inválida o no configurada. Verifica TAVILY_API_KEY en .env');
    }
    
    // Si es error de rate limit
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      throw new Error('Límite de búsquedas Tavily excedido. Considera upgrade de plan o espera unos minutos.');
    }
    
    throw error;
  }
}

/**
 * Búsqueda usando Serper API (Google Search)
 */
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
        gl: 'ec' // Geo-localización para Ecuador por defecto
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

/**
 * Búsqueda usando Bing Search API
 */
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

/**
 * Búsqueda simulada para modo offline o sin API keys
 */
async function busquedaSimulada(query, type) {
  console.log('🔄 Usando búsqueda simulada (sin API keys configuradas)');
  
  // Base de datos simulada contextual
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
  
  // Buscar coincidencias en la base simulada
  const queryLower = query.toLowerCase();
  let resultadosEncontrados = [];
  
  Object.entries(datosSimulados).forEach(([clave, datos]) => {
    if (queryLower.includes(clave.split(' ')[0]) || clave.includes(queryLower.split(' ')[0])) {
      resultadosEncontrados.push(...datos);
    }
  });
  
  // Si no hay coincidencias específicas, generar resultados contextuales genéricos
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

/**
 * Procesa resultados según el tipo de búsqueda
 */
function procesarResultadosPorTipo(resultados, type, query) {
  switch (type) {
    case 'estadisticas_locales':
      return resultados.filter(r => 
        r.titulo.toLowerCase().includes('estadística') ||
        r.titulo.toLowerCase().includes('dato') ||
        r.titulo.toLowerCase().includes('cifra') ||
        r.titulo.toLowerCase().includes('índice') ||
        r.fuente.toLowerCase().includes('inec') ||
        r.fuente.toLowerCase().includes('estadística')
      );
      
    case 'noticias_recientes':
      return resultados.filter(r => {
        const fechaReciente = new Date();
        fechaReciente.setMonth(fechaReciente.getMonth() - 3); // Últimos 3 meses
        
        return r.fecha && new Date(r.fecha) >= fechaReciente;
      }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
    case 'politicas_publicas':
      return resultados.filter(r =>
        r.titulo.toLowerCase().includes('política') ||
        r.titulo.toLowerCase().includes('ley') ||
        r.titulo.toLowerCase().includes('decreto') ||
        r.titulo.toLowerCase().includes('gobierno') ||
        r.titulo.toLowerCase().includes('ministerio')
      );
      
    case 'tendencias_globales':
      return resultados.filter(r =>
        r.titulo.toLowerCase().includes('mundial') ||
        r.titulo.toLowerCase().includes('global') ||
        r.titulo.toLowerCase().includes('internacional') ||
        r.titulo.toLowerCase().includes('tendencia') ||
        r.fuente.toLowerCase().includes('onu') ||
        r.fuente.toLowerCase().includes('banco mundial')
      );
      
    case 'estudios_academicos':
      return resultados.filter(r =>
        r.titulo.toLowerCase().includes('estudio') ||
        r.titulo.toLowerCase().includes('investigación') ||
        r.titulo.toLowerCase().includes('análisis') ||
        r.fuente.toLowerCase().includes('universidad') ||
        r.fuente.toLowerCase().includes('.edu')
      );
      
    default:
      return resultados;
  }
}

/**
 * Genera resumen de la búsqueda realizada
 */
function generarResumenBusqueda(resultados, type) {
  if (resultados.length === 0) {
    return `No se encontraron resultados específicos para búsqueda de tipo ${type}`;
  }
  
  const tiposResumen = {
    'estadisticas_locales': `Se encontraron ${resultados.length} fuentes con datos estadísticos locales`,
    'noticias_recientes': `Se identificaron ${resultados.length} noticias recientes sobre el tema`,
    'politicas_publicas': `Se hallaron ${resultados.length} referencias a políticas públicas relacionadas`,
    'tendencias_globales': `Se obtuvieron ${resultados.length} fuentes sobre tendencias globales`,
    'estudios_academicos': `Se encontraron ${resultados.length} estudios académicos relevantes`
  };
  
  return tiposResumen[type] || `Se encontraron ${resultados.length} resultados relacionados`;
}

/**
 * Extrae las fuentes principales de los resultados
 */
function extraerFuentesPrincipales(resultados) {
  const fuentes = [...new Set(resultados.map(r => r.fuente))];
  return fuentes.slice(0, 5);
}

/**
 * Extrae dominio de una URL
 */
function extraerDominio(url) {
  try {
    const dominio = new URL(url).hostname;
    return dominio.replace('www.', '');
  } catch {
    return 'Fuente desconocida';
  }
}

export default {
  buscarWeb,
  responderBusquedaIA
};