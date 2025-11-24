/**
 * Servicio de Búsqueda Web Contextual para Literacidad Crítica
 * Permite contextualizar análisis de texto con información actual de Internet
 */

/**
 * Realiza búsquedas web contextuales basadas en el análisis del texto
 * @param {string} texto - Texto original a analizar
 * @param {Object} contexto - Contexto crítico detectado del texto
 * @param {Array} temasPrincipales - Temas identificados en el texto
 * @returns {Promise<Object>} Información contextual web encontrada
 */
export async function buscarContextoWeb(texto, contexto, temasPrincipales) {
  try {
    // 1. Generar términos de búsqueda contextual
    const terminosBusqueda = generarTerminosBusqueda(texto, contexto, temasPrincipales);
    
    // 2. Realizar búsquedas paralelas para diferentes tipos de información
    const busquedasPromises = terminosBusqueda.map(termino => 
      realizarBusquedaWeb(termino)
    );
    
    const resultadosBusquedas = await Promise.allSettled(busquedasPromises);
    
    // 3. Procesar y estructurar los resultados
    const contextoWeb = procesarResultadosWeb(resultadosBusquedas, terminosBusqueda);
    
    return {
      contexto_web_encontrado: contextoWeb,
      terminos_buscados: terminosBusqueda,
      fecha_busqueda: new Date().toISOString(),
      fuentes_consultadas: extraerFuentes(contextoWeb)
    };
    
  } catch (error) {
    console.warn('⚠️ Error en búsqueda web contextual:', error);
    return {
      contexto_web_encontrado: {},
      error: 'Búsqueda web no disponible',
      modo_offline: true
    };
  }
}

/**
 * Genera términos de búsqueda inteligentes basados en el contenido y contexto
 */
function generarTerminosBusqueda(texto, contexto, temasPrincipales) {
  const terminos = [];
  
  // Detectar ubicación geográfica mencionada en el texto
  const ubicaciones = detectarUbicaciones(texto);
  
  // Para cada tema principal, generar búsquedas contextuales
  temasPrincipales.forEach(tema => {
    ubicaciones.forEach(ubicacion => {
      // Búsquedas específicas por ubicación
      terminos.push({
        tipo: 'estadisticas_locales',
        query: `${tema} estadísticas ${ubicacion} 2024 2025`,
        proposito: `Obtener datos actuales sobre ${tema} en ${ubicacion}`
      });
      
      terminos.push({
        tipo: 'noticias_recientes',
        query: `${tema} ${ubicacion} noticias últimas semanas`,
        proposito: `Encontrar noticias recientes sobre ${tema} en ${ubicacion}`
      });
      
      terminos.push({
        tipo: 'politicas_publicas',
        query: `políticas públicas ${tema} ${ubicacion} gobierno actual`,
        proposito: `Identificar políticas actuales sobre ${tema} en ${ubicacion}`
      });
    });
    
    // Búsquedas generales del tema
    terminos.push({
      tipo: 'tendencias_globales',
      query: `${tema} tendencias mundiales 2024 2025 informe`,
      proposito: `Contextualizar ${tema} en tendencias globales actuales`
    });
    
    terminos.push({
      tipo: 'estudios_academicos',
      query: `${tema} estudios investigaciones recientes académicas`,
      proposito: `Encontrar investigación académica reciente sobre ${tema}`
    });
  });
  
  // Búsquedas específicas según género textual
  if (contexto.generoTextual) {
    terminos.push({
      tipo: 'genero_contextual',
      query: `${contexto.generoTextual} análisis crítico metodología`,
      proposito: `Obtener marcos de análisis para ${contexto.generoTextual}`
    });
  }
  
  // Limitar a las búsquedas más relevantes (máximo 8)
  return terminos.slice(0, 8);
}

/**
 * Detecta ubicaciones geográficas mencionadas en el texto
 */
function detectarUbicaciones(texto) {
  const ubicacionesComunes = {
    // Países Latinoamericanos
    'ecuador': ['Ecuador', 'ecuatoriano', 'Quito', 'Guayaquil'],
    'colombia': ['Colombia', 'colombiano', 'Bogotá', 'Medellín'],
    'perú': ['Perú', 'peruano', 'Lima', 'Cusco'],
    'chile': ['Chile', 'chileno', 'Santiago', 'Valparaíso'],
    'argentina': ['Argentina', 'argentino', 'Buenos Aires', 'Córdoba'],
    'méxico': ['México', 'mexicano', 'Ciudad de México', 'Guadalajara'],
    'brasil': ['Brasil', 'brasileño', 'São Paulo', 'Rio de Janeiro'],
    'venezuela': ['Venezuela', 'venezolano', 'Caracas', 'Maracaibo'],
    
    // Regiones
    'latinoamérica': ['Latinoamérica', 'América Latina', 'Sudamérica'],
    'europa': ['Europa', 'Unión Europea'],
    'asia': ['Asia', 'asiático'],
    'áfrica': ['África', 'africano']
  };
  
  const textoLower = texto.toLowerCase();
  const ubicacionesDetectadas = [];
  
  Object.entries(ubicacionesComunes).forEach(([pais, variaciones]) => {
    const encontrado = variaciones.some(variacion => 
      textoLower.includes(variacion.toLowerCase())
    );
    
    if (encontrado) {
      ubicacionesDetectadas.push(pais);
    }
  });
  
  // Si no se detecta ubicación específica, usar "mundial" como contexto general
  return ubicacionesDetectadas.length > 0 ? ubicacionesDetectadas : ['mundial'];
}

/**
 * Realiza búsqueda web usando la API del backend
 */
import { fetchWithTimeout } from '../utils/netUtils';
async function realizarBusquedaWeb(terminoBusqueda) {
  try {
      const response = await fetchWithTimeout('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: terminoBusqueda.query,
        type: terminoBusqueda.tipo,
        maxResults: 5
      })
    }, 20000);
    
    if (!response.ok) {
      throw new Error(`Búsqueda web falló: ${response.status}`);
    }
    
    const datos = await response.json();
    
    return {
      termino: terminoBusqueda,
      resultados: datos.resultados || [],
      resumen: datos.resumen || '',
      fuentes: datos.fuentes || []
    };
    
  } catch (error) {
    console.warn(`Error buscando: ${terminoBusqueda.query}`, error);
    return {
      termino: terminoBusqueda,
      resultados: [],
      error: error.message
    };
  }
}

/**
 * Procesa y estructura los resultados de las búsquedas web
 */
function procesarResultadosWeb(resultadosBusquedas, terminosBusqueda) {
  const contextoWeb = {
    estadisticas_locales: {},
    noticias_recientes: [],
    politicas_publicas: [],
    tendencias_globales: [],
    estudios_academicos: [],
    genero_contextual: []
  };
  
  resultadosBusquedas.forEach((resultado, index) => {
    if (resultado.status === 'fulfilled' && resultado.value.resultados) {
      const datos = resultado.value;
      const tipo = datos.termino.tipo;
      
      if (contextoWeb[tipo]) {
        if (Array.isArray(contextoWeb[tipo])) {
          contextoWeb[tipo].push(...datos.resultados);
        } else {
          // Para estadísticas locales, usar estructura de objeto
          const ubicacion = extraerUbicacion(datos.termino.query);
          contextoWeb[tipo][ubicacion] = datos.resultados;
        }
      }
    }
  });
  
  return contextoWeb;
}

/**
 * Extrae ubicación de una query de búsqueda
 */
function extraerUbicacion(query) {
  const ubicaciones = ['ecuador', 'colombia', 'perú', 'chile', 'argentina', 'méxico', 'brasil', 'venezuela'];
  const ubicacionEncontrada = ubicaciones.find(ub => 
    query.toLowerCase().includes(ub)
  );
  return ubicacionEncontrada || 'global';
}

/**
 * Extrae las fuentes consultadas de los resultados
 */
function extraerFuentes(contextoWeb) {
  const fuentes = new Set();
  
  Object.values(contextoWeb).forEach(categoria => {
    if (Array.isArray(categoria)) {
      categoria.forEach(item => {
        if (item.fuente || item.url) {
          fuentes.add(item.fuente || item.url);
        }
      });
    } else if (typeof categoria === 'object') {
      Object.values(categoria).forEach(subcategoria => {
        if (Array.isArray(subcategoria)) {
          subcategoria.forEach(item => {
            if (item.fuente || item.url) {
              fuentes.add(item.fuente || item.url);
            }
          });
        }
      });
    }
  });
  
  return Array.from(fuentes);
}

/**
 * Genera preguntas críticas contextualizadas con información web
 */
export function generarPreguntasConContextoWeb(
  preguntasBase, 
  contextoWeb, 
  contextoTexto, 
  temasPrincipales
) {
  const preguntasEnriquecidas = [];
  
  preguntasBase.forEach(pregunta => {
    // Clonar pregunta base
    const preguntaEnriquecida = { ...pregunta };
    
    // Enriquecer según tipo de pregunta y contexto web disponible
    if (pregunta.categoria === 'critica' && contextoWeb.noticias_recientes?.length > 0) {
      preguntaEnriquecida.contexto_web = {
        noticias_relacionadas: contextoWeb.noticias_recientes.slice(0, 3),
        pregunta_ampliada: `${pregunta.pregunta} Considera también las noticias recientes: ${contextoWeb.noticias_recientes.slice(0, 2).map(n => n.titulo || n.resumen?.slice(0, 100)).join(', ')}`
      };
    }
    
    if (pregunta.categoria === 'evaluacion' && contextoWeb.estadisticas_locales) {
      const ubicacion = Object.keys(contextoWeb.estadisticas_locales)[0];
      if (ubicacion && contextoWeb.estadisticas_locales[ubicacion]?.length > 0) {
        preguntaEnriquecida.contexto_web = {
          datos_locales: contextoWeb.estadisticas_locales[ubicacion].slice(0, 2),
          pregunta_ampliada: `${pregunta.pregunta} Ten en cuenta los datos actuales de ${ubicacion}: ${contextoWeb.estadisticas_locales[ubicacion][0]?.resumen || 'datos disponibles'}`
        };
      }
    }
    
    if (pregunta.categoria === 'transformacion' && contextoWeb.politicas_publicas?.length > 0) {
      preguntaEnriquecida.contexto_web = {
        politicas_actuales: contextoWeb.politicas_publicas.slice(0, 2),
        pregunta_ampliada: `${pregunta.pregunta} Considera las políticas públicas actuales: ${contextoWeb.politicas_publicas[0]?.titulo || contextoWeb.politicas_publicas[0]?.resumen?.slice(0, 100)}`
      };
    }
    
    if (pregunta.categoria === 'analisis' && contextoWeb.tendencias_globales?.length > 0) {
      preguntaEnriquecida.contexto_web = {
        tendencias_mundiales: contextoWeb.tendencias_globales.slice(0, 2),
        pregunta_ampliada: `${pregunta.pregunta} Relaciona con las tendencias globales actuales: ${contextoWeb.tendencias_globales[0]?.titulo || contextoWeb.tendencias_globales[0]?.resumen?.slice(0, 100)}`
      };
    }
    
    preguntasEnriquecidas.push(preguntaEnriquecida);
  });
  
  // Agregar preguntas específicas basadas en contexto web
  if (contextoWeb.noticias_recientes?.length > 0) {
    preguntasEnriquecidas.push({
      etapa: 'critico',
      pregunta: `¿Cómo se relaciona lo que plantea el texto con las noticias recientes sobre ${temasPrincipales[0]}? ¿Qué similitudes o diferencias observas?`,
      categoria: 'critica_contextual',
      nivel_critico: 4,
      dimension_critica: 'contextualizacion_web',
      justificacion: 'Conecta el análisis textual con la realidad informativa actual',
      contexto_web: {
        noticias_base: contextoWeb.noticias_recientes.slice(0, 3)
      }
    });
  }
  
  if (contextoWeb.estadisticas_locales && Object.keys(contextoWeb.estadisticas_locales).length > 0) {
    const ubicacion = Object.keys(contextoWeb.estadisticas_locales)[0];
    preguntasEnriquecidas.push({
      etapa: 'evaluacion',
      pregunta: `Basándote en los datos actuales de ${ubicacion}, ¿consideras que el texto refleja la realidad local? ¿Qué aspectos coinciden o contrastan?`,
      categoria: 'evaluacion_local',
      nivel_critico: 4,
      dimension_critica: 'verificacion_local',
      justificacion: `Contrasta el contenido textual con datos locales de ${ubicacion}`,
      contexto_web: {
        datos_locales: contextoWeb.estadisticas_locales[ubicacion]
      }
    });
  }
  
  return preguntasEnriquecidas;
}

/**
 * Genera resumen del contexto web para mostrar al usuario
 */
export function generarResumenContextoWeb(contextoWeb) {
  const resumen = {
    tiene_datos: false,
    categorias_encontradas: [],
    fuentes_principales: [],
    datos_destacados: []
  };
  
  // Verificar qué categorías tienen datos
  Object.entries(contextoWeb).forEach(([categoria, datos]) => {
    if (Array.isArray(datos) && datos.length > 0) {
      resumen.tiene_datos = true;
      resumen.categorias_encontradas.push(categoria);
      
      // Extraer datos destacados
      datos.slice(0, 2).forEach(item => {
        if (item.titulo || item.resumen) {
          resumen.datos_destacados.push({
            categoria,
            titulo: item.titulo,
            resumen: item.resumen?.slice(0, 150) + '...',
            fuente: item.fuente
          });
        }
      });
    } else if (typeof datos === 'object' && Object.keys(datos).length > 0) {
      resumen.tiene_datos = true;
      resumen.categorias_encontradas.push(categoria);
      
      // Para estadísticas locales
      Object.entries(datos).forEach(([ubicacion, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          items.slice(0, 1).forEach(item => {
            resumen.datos_destacados.push({
              categoria: `${categoria}_${ubicacion}`,
              titulo: item.titulo,
              resumen: item.resumen?.slice(0, 150) + '...',
              fuente: item.fuente
            });
          });
        }
      });
    }
  });
  
  return resumen;
}

export default {
  buscarContextoWeb,
  generarPreguntasConContextoWeb,
  generarResumenContextoWeb
};