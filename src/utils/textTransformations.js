/**
 * Módulo para funciones de procesamiento y transformación de texto.
 */

import { LIMITE_TEXTO_COMPLETO, LIMITE_TEXTO_MEDIO, LIMITE_TEXTO_GRANDE } from './constants';

/**
 * Trunca el texto respetando límites de párrafos para mantener coherencia
 * @param {string} texto - Texto a truncar
 * @param {number} limite - Límite de caracteres
 * @returns {string} Texto truncado
 */
export const truncarTextoEnParrafos = (texto, limite) => {
  if (!texto || texto.length <= limite) return texto;
  
  // Dividir en párrafos
  const parrafos = texto.split(/\n+/);
  let resultado = '';
  let longitudActual = 0;
  
  // Añadir párrafos completos hasta alcanzar el límite
  for (const parrafo of parrafos) {
    if (longitudActual + parrafo.length + 1 <= limite) {
      resultado += parrafo + '\n';
      longitudActual += parrafo.length + 1;
    } else {
      break;
    }
  }
  
  // Si no hay suficientes párrafos, truncar en frases
  if (longitudActual < limite / 2) {
    const frases = texto.split(/[.!?]+/);
    resultado = '';
    longitudActual = 0;
    
    for (const frase of frases) {
      if (longitudActual + frase.length + 1 <= limite) {
        resultado += frase + '. ';
        longitudActual += frase.length + 2;
      } else {
        break;
      }
    }
  }
  
  return resultado.trim();
};

/**
 * Prepara texto largo para análisis manteniendo su contexto semántico
 * Realiza muestreo inteligente para textos extensos
 * 
 * @param {string} texto - Texto completo a preparar
 * @returns {object} Objeto con texto procesado y longitud original
 */
export const prepararTextoParaAnalisis = (texto) => {
  if (!texto) return { texto: '', longitud: 0 };
  
  const longitudOriginal = texto.length;
  
  // Si el texto es corto, devolverlo completo
  if (longitudOriginal <= LIMITE_TEXTO_COMPLETO) {
    return { texto, longitud: longitudOriginal };
  }
  
  // Dividir el texto en párrafos
  const parrafos = texto.split(/\n+/).filter(p => p.trim().length > 0);
  
  // Si hay pocos párrafos, usar un enfoque simple
  if (parrafos.length <= 5) {
    return { 
      texto: truncarTextoEnParrafos(texto, LIMITE_TEXTO_COMPLETO), 
      longitud: longitudOriginal 
    };
  }
  
  // Para textos de tamaño medio
  if (longitudOriginal <= LIMITE_TEXTO_MEDIO) {
    // 1. Inicio del documento (primeros párrafos)
    const inicio = parrafos.slice(0, 2).join('\n\n');
    
    // 2. Secciones del medio (muestreo de párrafos)
    let medio = '';
    const paso = Math.max(1, Math.floor(parrafos.length / 5));
    for (let i = paso; i < parrafos.length - paso; i += paso) {
      medio += parrafos[i] + '\n\n';
    }
    
    // 3. Final del documento (últimos párrafos)
    const final = parrafos.slice(-2).join('\n\n');
    
    // Combinar las secciones con marcadores
    let textoAnalisis = `[INICIO DEL DOCUMENTO]\n${inicio}\n\n[SECCIONES INTERMEDIAS]\n${medio}\n\n[FINAL DEL DOCUMENTO]\n${final}`;
    
    // Asegurar que no exceda el límite de tokens
    if (textoAnalisis.length > LIMITE_TEXTO_COMPLETO) {
      textoAnalisis = truncarTextoEnParrafos(textoAnalisis, LIMITE_TEXTO_COMPLETO);
    }
    
    return { 
      texto: textoAnalisis, 
      longitud: longitudOriginal 
    };
  }
  
  // Para textos grandes
  if (longitudOriginal <= LIMITE_TEXTO_GRANDE) {
    // Extraer secciones más representativas
    const numSeccionesMuestreo = 10;
    const seccionSize = Math.floor(parrafos.length / numSeccionesMuestreo);
    
    let textoMuestreado = '[RESUMEN DE DOCUMENTO EXTENSO]\n\n';
    
    // Añadir introducción (primeros 3 párrafos)
    textoMuestreado += '[INTRODUCCIÓN]\n' + parrafos.slice(0, 3).join('\n\n') + '\n\n';
    
    // Muestrear secciones a lo largo del documento
    for (let i = 1; i < numSeccionesMuestreo - 1; i++) {
      const startIdx = i * seccionSize;
      if (startIdx < parrafos.length) {
        textoMuestreado += `[SECCIÓN ${i}]\n` + parrafos[startIdx] + '\n\n';
      }
    }
    
    // Añadir conclusión (últimos 3 párrafos)
    textoMuestreado += '[CONCLUSIÓN]\n' + parrafos.slice(-3).join('\n\n');
    
    // Asegurar que no exceda el límite
    if (textoMuestreado.length > LIMITE_TEXTO_COMPLETO) {
      textoMuestreado = truncarTextoEnParrafos(textoMuestreado, LIMITE_TEXTO_COMPLETO);
    }
    
    return {
      texto: textoMuestreado,
      longitud: longitudOriginal
    };
  }
  
  // Para textos extremadamente grandes
  let textoReducido = '[DOCUMENTO MUY EXTENSO - ANÁLISIS PARCIAL]\n\n';
  
  // Primeros párrafos (introducción)
  textoReducido += '[INTRODUCCIÓN]\n' + parrafos.slice(0, 2).join('\n\n') + '\n\n';
  
  // Muestreo muy espaciado (cada 10% del documento)
  const intervalos = [0.1, 0.3, 0.5, 0.7, 0.9];
  intervalos.forEach((porcentaje, idx) => {
    const indice = Math.floor(parrafos.length * porcentaje);
    if (indice < parrafos.length) {
      textoReducido += `[EXTRACTO ${idx + 1}]\n` + parrafos[indice] + '\n\n';
    }
  });
  
  // Últimos párrafos (conclusión)
  textoReducido += '[CONCLUSIÓN]\n' + parrafos.slice(-2).join('\n\n');
  
  // Asegurar que no exceda el límite
  if (textoReducido.length > LIMITE_TEXTO_COMPLETO) {
    textoReducido = truncarTextoEnParrafos(textoReducido, LIMITE_TEXTO_COMPLETO);
  }
  
  return {
    texto: textoReducido,
    longitud: longitudOriginal
  };
};

/**
 * Divide un texto en bloques semánticos para análisis segmentado
 * @param {string} texto - Texto completo
 * @param {number} maxCharsPorBloque - Máximo de caracteres por bloque
 * @returns {string[]} Array de bloques de texto
 */
export const dividirEnBloquesSemanticos = (texto, maxCharsPorBloque = 3000) => {
  if (!texto || texto.length <= maxCharsPorBloque) {
    return [texto];
  }
  
  // Intentar dividir por capítulos o secciones principales
  const patronesSeccion = [
    /\n\s*CAPÍTULO\s+\w+/gi,
    /\n\s*CAPITULO\s+\w+/gi,
    /\n\s*Capítulo\s+\w+/g,
    /\n\s*[IVX]+\.\s+/g,  // Números romanos seguidos de punto
    /\n\s*\d+\.\s+/g,     // Números arábigos seguidos de punto
    /\n\s*[-—–]\s*\w+/g   // Guiones seguidos de palabra (posibles títulos)
  ];
  
  // Buscar posibles puntos de división
  let puntosDivision = [];
  
  // Aplicar cada patrón
  for (const patron of patronesSeccion) {
    const matches = [...texto.matchAll(new RegExp(patron.source, 'g'))];
    matches.forEach(match => {
      puntosDivision.push(match.index);
    });
  }
  
  // Si no se encontraron secciones, usar párrafos como división
  if (puntosDivision.length < 2) {
    const parrafos = texto.split(/\n\s*\n/);
    const bloques = [];
    let bloqueActual = '';
    
    for (const parrafo of parrafos) {
      if (bloqueActual.length + parrafo.length > maxCharsPorBloque) {
        bloques.push(bloqueActual);
        bloqueActual = parrafo;
      } else {
        bloqueActual += (bloqueActual ? '\n\n' : '') + parrafo;
      }
    }
    
    if (bloqueActual) {
      bloques.push(bloqueActual);
    }
    
    return bloques;
  }
  
  // Ordenar puntos de división
  puntosDivision.sort((a, b) => a - b);
  
  // Crear bloques usando los puntos de división identificados
  const bloques = [];
  let inicioActual = 0;
  
  for (let i = 0; i < puntosDivision.length; i++) {
    const punto = puntosDivision[i];
    // Si el bloque sería muy grande, buscar un punto anterior
    if (punto - inicioActual > maxCharsPorBloque && i > 0) {
      bloques.push(texto.substring(inicioActual, puntosDivision[i-1]));
      inicioActual = puntosDivision[i-1];
    }
  }
  
  // Añadir el último bloque
  bloques.push(texto.substring(inicioActual));
  
  // Si algún bloque sigue siendo demasiado grande, subdividirlo
  const resultado = [];
  for (const bloque of bloques) {
    if (bloque.length > maxCharsPorBloque) {
      resultado.push(...dividirBloquePorParrafos(bloque, maxCharsPorBloque));
    } else {
      resultado.push(bloque);
    }
  }
  
  return resultado;
};

/**
 * Función auxiliar para dividir un bloque por párrafos
 * @private
 */
const dividirBloquePorParrafos = (texto, maxChars) => {
  const parrafos = texto.split(/\n\s*\n/);
  const bloques = [];
  let bloqueActual = '';
  
  for (const parrafo of parrafos) {
    if (bloqueActual.length + parrafo.length > maxChars && bloqueActual) {
      bloques.push(bloqueActual);
      bloqueActual = parrafo;
    } else {
      bloqueActual += (bloqueActual ? '\n\n' : '') + parrafo;
    }
  }
  
  if (bloqueActual) {
    bloques.push(bloqueActual);
  }
  
  return bloques;
};