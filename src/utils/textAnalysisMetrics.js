/**
 * Módulo para funciones de análisis de texto y cálculo de métricas.
 */

import { SPANISH_STOP_WORDS } from './constants';

/**
 * Función para contar sílabas en texto español (heurística).
 * Esta función utiliza una heurística basada en el conteo de vocales, diptongos e hiatos.
 * No es 100% precisa para todos los casos complejos del español, pero es suficiente para
 * métricas de legibilidad y es más robusta que reglas muy específicas.
 * @param {string} texto - El texto a analizar
 * @returns {number} - Número aproximado de sílabas
 */
const contarSilabas = (texto) => {
  if (!texto) return 0;

  const palabras = texto.toLowerCase()
    .replace(/[.,\/#!$%^&*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 0);

  let totalSilabas = 0;

  // Vocales fuertes (abiertas): a, e, o
  // Vocales débiles (cerradas): i, u
  const vocalesFuertes = /[aeoáéó]/gi;
  const vocalesDebiles = /[iuüíú]/gi;

  for (const palabra of palabras) {
    if (palabra.length === 0) continue;

    // Normalizar para quitar acentos y simplificar el conteo
    const palabraNormalizada = palabra
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let silabasEnPalabra = 0;
    let prevCharIsVowel = false;

    for (let i = 0; i < palabraNormalizada.length; i++) {
      const char = palabraNormalizada[i];
      const isVowel = /[aeiou]/i.test(char);

      if (isVowel) {
        if (!prevCharIsVowel) {
          silabasEnPalabra++;
        }
        prevCharIsVowel = true;
      } else {
        prevCharIsVowel = false;
      }
    }

    // Ajustes heurísticos para diptongos y hiatos comunes
    // Un diptongo (vocal débil + vocal fuerte, o vocal débil + vocal débil diferente) cuenta como una sílaba.
    // Un hiato (vocal fuerte + vocal fuerte, o vocal fuerte + vocal débil acentuada) cuenta como dos sílabas.

    // Reducir sílabas por diptongos (ej. "ai", "eu", "io", "ua", "ie", "ou", "ui", "uo")
    // Esto es una simplificación, ya que la lógica de diptongos/hiatos es compleja.
    // Se asume que cada grupo de vocales consecutivas forma al menos una sílaba.
    // Si hay dos vocales juntas, y no es un hiato obvio, se considera diptongo.
    const gruposVocales = palabraNormalizada.match(/[aeiouáéíóúü]+/gi);
    if (gruposVocales) {
      silabasEnPalabra = gruposVocales.length; // Cada grupo de vocales es al menos una sílaba
      // Ajustar por hiatos explícitos (vocal fuerte + vocal débil acentuada)
      if (/[aeo][íúü]|[íúü][aeo]/i.test(palabra)) {
        silabasEnPalabra++; // Considerar como sílaba adicional
      }
    }

    totalSilabas += Math.max(1, silabasEnPalabra); // Asegurar al menos una sílaba por palabra
  }

  return totalSilabas;
};

/**
 * Genera estadísticas básicas del texto
 * @param {string} texto - El texto a analizar
 * @returns {object} Objeto con estadísticas del texto
 */
export const obtenerEstadisticasTexto = (texto) => {
  if (!texto) return { caracteres: 0, palabras: 0, parrafos: 0, oraciones: 0 };
  
  const caracteres = texto.length;
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  const parrafos = texto.split(/\n+/).filter(Boolean).length;
  const oraciones = texto.split(/[.!?]+/).filter(Boolean).length;
  
  return { 
    caracteres, 
    palabras, 
    parrafos, 
    oraciones,
    tiempoLectura: estimarTiempoLectura(texto),
    longitudPromedioPalabra: palabras > 0 ? caracteres / palabras : 0,
    longitudPromedioOracion: oraciones > 0 ? palabras / oraciones : 0,
    densidadLexica: calcularDensidadLexica(texto)
  };
};

/**
 * Estima el tiempo de lectura del texto
 * @param {string} texto - El texto a analizar
 * @param {number} palabrasPorMinuto - Velocidad de lectura (por defecto 200)
 * @returns {number} Tiempo de lectura en minutos
 */
export const estimarTiempoLectura = (texto, palabrasPorMinuto = 200) => {
  if (!texto) return 0;
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  return Math.ceil(palabras / palabrasPorMinuto);
};

/**
 * Estima los tiempos de procesamiento para diferentes operaciones.
 * @param {object} opciones - Opciones para la estimación.
 * @param {string} [opciones.texto] - El texto a procesar.
 * @param {number} [opciones.tamañoArchivo] - El tamaño del archivo en bytes.
 * @param {string} [opciones.api] - El tipo de API a utilizar ('openai', 'gemini', 'basico').
 * @returns {object} Un objeto con las estimaciones de tiempo en segundos.
 */
export const estimarTiemposProcesamiento = (opciones = {}) => {
  const { texto, tamañoArchivo, api } = opciones;
  const estimaciones = {};

  // 1. Estimación basada en el tamaño del archivo (para carga y lectura inicial)
  if (tamañoArchivo) {
    const tamañoMB = tamañoArchivo / (1024 * 1024);
    // Estimación simple: 1 segundo por cada 5MB, con un mínimo de 1 segundo.
    estimaciones.archivo = Math.max(1, Math.ceil(tamañoMB / 5));
  }

  // 2. Estimación basada en la longitud del texto y la API (para análisis)
  if (texto) {
    const longitud = texto.length;
    let velocidad; // Caracteres por segundo

    switch (api) {
      case 'openai':
        velocidad = 20000; // 20k caracteres/seg
        break;
      case 'gemini':
        velocidad = 15000; // 15k caracteres/seg
        break;
      default: // Incluye 'basico'
        velocidad = 500000; // 500k caracteres/seg
        break;
    }
    estimaciones.analisis = Math.max(1, Math.ceil(longitud / velocidad));
  }

  return estimaciones;
};

/**
 * Identifica posibles conceptos clave en el texto
 * @param {string} texto - El texto a analizar
 * @returns {string[]} Lista de conceptos clave
 */
export const identificarConceptosClave = (texto) => {
  if (!texto || texto.length < 50) return [];
  
  // Usar palabras vacías desde constantes
  const palabrasVacias = SPANISH_STOP_WORDS;
  
  // Tokenizar el texto y eliminar signos de puntuación
  const palabras = texto.toLowerCase()
    .replace(/[.,\/#!$%^&*;:{}=\-_`~()]/g, '')
    .split(/\s+/);
  
  // Contar frecuencias de palabras que no sean vacías y tengan al menos 4 caracteres
  const frecuencias = {};
  palabras.forEach(palabra => {
    if (palabra.length > 3 && !palabrasVacias.has(palabra)) {
      frecuencias[palabra] = (frecuencias[palabra] || 0) + 1;
    }
  });
  
  // Calcular score que combine frecuencia y longitud de palabra
  const palabrasConScore = Object.entries(frecuencias).map(([palabra, frecuencia]) => {
    // Fórmula: frecuencia * (1 + longitud_palabra/10)
    // Da un poco más de peso a palabras más largas, que suelen ser más significativas
    const score = frecuencia * (1 + palabra.length/10);
    return { palabra, frecuencia, score };
  });
  
  // Ordenar por score y obtener los mejores conceptos
  return palabrasConScore
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(item => item.palabra);
};

/**
 * Analiza la legibilidad del texto usando el índice Fernández-Huerta (adaptación de Flesch para español)
 * @param {string} texto - El texto a analizar
 * @returns {object} - Objeto con índice y descripción
 */
export const analizarLegibilidad = (texto) => {
  if (!texto || texto.length < 50) {
    return { indice: 0, descripcion: 'Texto muy corto para analizar' };
  }
  
  // Obtener estadísticas
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  const oraciones = texto.split(/[.!?]+/).filter(Boolean).length;
  const silabas = contarSilabas(texto);
  
  // Calcular promedios
  const promPalabrasXOracion = palabras / oraciones;
  const promSilabasXPalabra = silabas / palabras;
  
  // Fórmula Fernández-Huerta
  const indice = 206.84 - (60 * promSilabasXPalabra) - (1.02 * promPalabrasXOracion);
  
  // Interpretar índice
  let descripcion;
  if (indice > 90) descripcion = 'Muy fácil';
  else if (indice > 80) descripcion = 'Fácil';
  else if (indice > 70) descripcion = 'Bastante fácil';
  else if (indice > 60) descripcion = 'Normal';
  else if (indice > 50) descripcion = 'Bastante difícil';
  else if (indice > 30) descripcion = 'Difícil';
  else descripcion = 'Muy difícil';
  
  return { 
    indice: Math.round(indice * 10) / 10, // Redondear a 1 decimal
    descripcion,
    promedioPalabrasOracion: Math.round(promPalabrasXOracion * 10) / 10,
    promedioSilabasPalabra: Math.round(promSilabasXPalabra * 10) / 10
  };
};

/**
 * Calcula la densidad léxica del texto (proporción de palabras con significado vs palabras funcionales)
 * @param {string} texto - El texto a analizar
 * @returns {number} - Densidad léxica (entre 0 y 1)
 */
export const calcularDensidadLexica = (texto) => {
  if (!texto || texto.length < 50) return 0;
  
  // Usar palabras funcionales desde constantes
  const palabrasFuncionales = SPANISH_STOP_WORDS;
  
  // Tokenizar y limpiar
  const palabras = texto.toLowerCase()
    .replace(/[.,\/#!$%^&*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 0);
  
  if (palabras.length === 0) return 0;
  
  // Contar palabras con significado
  const palabrasConSignificado = palabras.filter(p => !palabrasFuncionales.has(p));
  
  // Calcular densidad
  return palabrasConSignificado.length / palabras.length;
};
