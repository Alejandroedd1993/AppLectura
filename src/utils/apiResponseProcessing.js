/**
 * Módulo para el procesamiento de respuestas de API, especialmente aquellas mal formadas.
 */

/**
 * Función auxiliar para extraer un valor de un texto usando una lista de patrones.
 * @private
 * @param {string} texto - El texto de entrada.
 * @param {RegExp[]} patrones - Array de expresiones regulares a probar.
 * @param {function} [procesador=(match) => match[1].trim()] - Función opcional para procesar el match.
 * @returns {string|string[]|object|null} El valor extraído o null si no se encuentra.
 */
const _extractValueFromText = (texto, patrones, procesador = (match) => match[1].trim()) => {
  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match && match[1]) {
      const processedValue = procesador(match);
      if (processedValue !== null && (Array.isArray(processedValue) ? processedValue.length > 0 : processedValue.length > 0)) {
        return processedValue;
      }
    }
  }
  return null;
};

/**
 * Intenta recuperar análisis de respuestas mal formadas de la API
 * @param {string} texto - Respuesta posiblemente mal formada
 * @returns {object|null} Objeto de análisis o null si no se puede recuperar
 */
export const recuperarAnalisisDeTextoMalFormado = (texto) => {
  if (!texto) return null;
  
  try {
    // Intentar extraer secciones clave del texto
    const resultado = {
      resumen: '',
      ideasPrincipales: [],
      vocabulario: [],
      complejidad: 'No determinado',
      temas: [],
      analisisEstilistico: {
        tono: 'No determinado',
        sentimiento: 'No determinado',
        estilo: 'No determinado',
        publicoObjetivo: 'No determinado'
      },
      preguntasReflexion: []
    };
    
    // Patrones para extraer información
    const patronesResumen = [
      /resumen["'\s:]+([^"]+)/i,
      /resumen["'\s:]+([^,]+)/i,
      /resumen["'\s:]+(.+?)(?=ideas|principales|vocabulario|complejidad|temas|$)/is
    ];
    resultado.resumen = _extractValueFromText(texto, patronesResumen) || '';
    
    const patronesIdeas = [
      /ideas\s*principales["'\s:]+\[(.*?)\]/is,
      /ideas\s*principales["'\s:]+(.+?)(?=vocabulario|complejidad|temas|$)/is
    ];
    resultado.ideasPrincipales = _extractValueFromText(texto, patronesIdeas, (match) => {
      const ideas = match[1].split(/[,;]/).map(idea => 
        idea.trim().replace(/^["'\s-]+|["'\s-]+$/g, '')
      ).filter(idea => idea.length > 0);
      return ideas.length > 0 ? ideas : null;
    }) || [];
    
    const patronesTono = [
      /tono["'\s:]+([^,"\n]+)/i,
      /tono\s*del\s*texto["'\s:]+([^,"\n]+)/i
    ];
    resultado.analisisEstilistico.tono = _extractValueFromText(texto, patronesTono) || 'No determinado';
    
    const patronesSentimiento = [
      /sentimiento["'\s:]+([^,"\n]+)/i,
      /sentimiento\s*del\s*texto["'\s:]+([^,"\n]+)/i
    ];
    resultado.analisisEstilistico.sentimiento = _extractValueFromText(texto, patronesSentimiento) || 'No determinado';
    
    const patronesEstilo = [
      /estilo["'\s:]+([^,"\n]+)/i,
      /estilo\s*del\s*texto["'\s:]+([^,"\n]+)/i
    ];
    resultado.analisisEstilistico.estilo = _extractValueFromText(texto, patronesEstilo) || 'No determinado';
    
    const patronesPublico = [
      /público\s*objetivo["'\s:]+([^,"\n]+)/i,
      /público\s*objetivo\s*del\s*texto["'\s:]+([^,"\n]+)/i
    ];
    resultado.analisisEstilistico.publicoObjetivo = _extractValueFromText(texto, patronesPublico) || 'No determinado';
    
    const patronesPreguntas = [
      /preguntas\s*de\s*reflexi[oó]n["'\s:]+\[(.*?)\]/is,
      /preguntas\s*para\s*reflexi[oó]n["'\s:]+(.+?)(?=vocabulario|complejidad|temas|$)/is
    ];
    resultado.preguntasReflexion = _extractValueFromText(texto, patronesPreguntas, (match) => {
      const preguntasPosibles = match[1].split(/[,;]/).map(p => p.trim());
      const preguntas = preguntasPosibles.filter(p => 
        p.includes('?') || p.includes('¿')
      );
      return preguntas.length > 0 ? preguntas : null;
    }) || [];
    
    const patronesVocabulario = [
      /vocabulario["'\s:]+\[(.*?)\]/is,
      /vocabulario\s*destacado["'\s:]+(.+?)(?=complejidad|temas|$)/is
    ];
    resultado.vocabulario = _extractValueFromText(texto, patronesVocabulario, (match) => {
      const vocabulario = match[1].split(/[,;]/).map(v => 
        v.trim().replace(/^["'\s-]+|["'\s-]+$/g, '')
      ).filter(v => v.length > 0);
      
      if (vocabulario.length > 0) {
        return vocabulario.map(item => {
          const partes = item.split(':');
          if (partes.length === 2) {
            return {
              palabra: partes[0].trim(),
              definicion: partes[1].trim()
            };
          }
          return item;
        });
      }
      return null;
    }) || [];
    
    const patronesComplejidad = [
      /complejidad["'\s:]+([^,"\n]+)/i,
      /nivel\s*de\s*complejidad["'\s:]+([^,"\n]+)/i
    ];
    resultado.complejidad = _extractValueFromText(texto, patronesComplejidad) || 'No determinado';
    
    const patronesTemas = [
      /temas["'\s:]+\[(.*?)\]/is,
      /temas\s*clave["'\s:]+(.+?)(?=preguntas|$)/is
    ];
    resultado.temas = _extractValueFromText(texto, patronesTemas, (match) => {
      const temas = match[1].split(/[,;]/).map(tema => 
        tema.trim().replace(/^["'\s-]+|["'\s-]+$/g, '')
      ).filter(tema => tema.length > 0);
      return temas.length > 0 ? temas : null;
    }) || [];
    
    // Si tenemos al menos 2 campos, consideramos que hemos recuperado información
    const camposExtraidos = Object.values(resultado).filter(v => 
      (Array.isArray(v) && v.length > 0) || 
      (typeof v === 'object' && v !== null && Object.values(v).some(val => val !== 'No determinado')) ||
      (!Array.isArray(v) && typeof v !== 'object' && v && v !== 'No determinado')
    ).length;
    
    if (camposExtraidos >= 2) {
      return resultado;
    }
    
    return null;
  } catch (error) {
    console.error('Error al recuperar análisis de texto mal formado:', error);
    return null;
  }
};

/**
 * Procesa la respuesta JSON de las APIs, estandarizando su estructura
 * @param {string|object} respuesta - Respuesta de API (texto JSON o objeto)
 * @returns {object} Objeto de análisis normalizado
 * @throws {Error} Si no se puede procesar la respuesta
 */
export const procesarRespuestaJSON = (respuesta) => {
  // Si ya es un objeto, lo usamos directamente
  const analisisData = typeof respuesta === 'string' ? (() => {
    try {
      // Intentar extraer el JSON de la respuesta
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : respuesta;
      return JSON.parse(jsonStr);
    } catch (error) {
      // Si falla el parseo, intentamos recuperar manualmente
      const recuperado = recuperarAnalisisDeTextoMalFormado(respuesta);
      if (recuperado) return recuperado;
      throw new Error('No se pudo procesar la respuesta: formato JSON inválido');
    }
  })() : respuesta;
  
  // Verificar estructura esperada
  const camposRequeridos = ['resumen', 'ideasPrincipales', 'vocabulario', 'complejidad', 'temas', 'analisisEstilistico', 'preguntasReflexion'];
  const camposFaltantes = camposRequeridos.filter(campo => !analisisData[campo]);
  
  if (camposFaltantes.length > 0) {
    console.warn('Respuesta incompleta:', camposFaltantes);
    
    // Completar campos faltantes
    camposFaltantes.forEach(campo => {
      if (campo === 'resumen') {
        analisisData.resumen = 'No se pudo generar un resumen del texto.';
      } else if (campo === 'ideasPrincipales') {
        analisisData.ideasPrincipales = ['No se pudieron identificar ideas principales.'];
      } else if (campo === 'vocabulario') {
        analisisData.vocabulario = [];
      } else if (campo === 'complejidad') {
        analisisData.complejidad = 'No determinado';
      } else if (campo === 'temas') {
        analisisData.temas = ['No se pudieron identificar temas.'];
      } else if (campo === 'analisisEstilistico') {
        analisisData.analisisEstilistico = {
          tono: 'No determinado',
          sentimiento: 'No determinado',
          estilo: 'No determinado',
          publicoObjetivo: 'No determinado'
        };
      } else if (campo === 'preguntasReflexion') {
        analisisData.preguntasReflexion = ['No se pudieron generar preguntas de reflexión.'];
      }
    });
  }
  
  // Validar tipos de datos
  if (!Array.isArray(analisisData.ideasPrincipales)) {
    analisisData.ideasPrincipales = [analisisData.ideasPrincipales].filter(Boolean);
  }
  
  if (analisisData.vocabulario && !Array.isArray(analisisData.vocabulario)) {
    analisisData.vocabulario = [];
  }
  
  if (!Array.isArray(analisisData.temas)) {
    analisisData.temas = [analisisData.temas].filter(Boolean);
  }
  
  if (!Array.isArray(analisisData.preguntasReflexion)) {
    analisisData.preguntasReflexion = [analisisData.preguntasReflexion].filter(Boolean);
  }
  
  // Validar el objeto de análisis estilístico
  if (!analisisData.analisisEstilistico || typeof analisisData.analisisEstilistico !== 'object') {
    analisisData.analisisEstilistico = {
      tono: 'No determinado',
      sentimiento: 'No determinado',
      estilo: 'No determinado',
      publicoObjetivo: 'No determinado'
    };
  }
  
  // Normalizar propiedades dentro del objeto estilístico
  const propEstilisticas = ['tono', 'sentimiento', 'estilo', 'publicoObjetivo'];
  propEstilisticas.forEach(prop => {
    if (!analisisData.analisisEstilistico[prop]) {
      analisisData.analisisEstilistico[prop] = 'No determinado';
    }
  });
  
  return analisisData;
};
