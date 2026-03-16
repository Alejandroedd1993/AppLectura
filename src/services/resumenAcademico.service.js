/**
 * Servicio de evaluación para Resumen Académico (Rúbrica 1)
 * 
 * Estrategia Dual:
 * - DeepSeek: Análisis rápido de estructura, precisión y claridad
 * - OpenAI: Evaluación profunda de calidad de citas e inferencias
 * - Combina ambos resultados para evaluación criterial completa
 */

import { chatCompletion, extractContent } from './unifiedAiService';

import logger from '../utils/logger';

function wrapServiceError(error, prefix) {
  const source = error instanceof Error ? error : new Error(String(error || 'Error desconocido'));
  const wrapped = new Error(`${prefix}: ${source.message}`);

  if (source.status != null) wrapped.status = source.status;
  if (source.httpStatus != null) wrapped.httpStatus = source.httpStatus;
  if (source.code != null) wrapped.code = source.code;
  if (source.backendError != null) wrapped.backendError = source.backendError;
  if (source.requestId != null) wrapped.requestId = source.requestId;
  if (source.payload != null) wrapped.payload = source.payload;

  return wrapped;
}
/**
 * Valida que el resumen cumpla requisitos mínimos antes de evaluar
 * @param {string} resumen - Texto del resumen
 * @param {string} textoOriginal - Texto fuente
 * @returns {{valid: boolean, errors: string[], citasEncontradas: number}}
 */
export function validarResumenAcademico(resumen, textoOriginal) {
  const errors = [];
  
  // Validar longitud mínima
  if (!resumen || resumen.trim().length < 100) {
    errors.push('El resumen debe tener al menos 100 caracteres');
  }
  
  // Detectar citas textuales (entre comillas "" o '')
  const citasPattern = /["']([^"']{10,})["']/g;
  const citasMatches = resumen.match(citasPattern) || [];
  const citasEncontradas = citasMatches.length;
  
  // Validar número mínimo de citas (≥2 según Rúbrica 1)
  if (citasEncontradas < 2) {
    errors.push(`Se requieren al menos 2 citas textuales. Encontradas: ${citasEncontradas}`);
  }
  
  // Validar que las citas existan en el texto original
  let citasInvalidas = 0;
  citasMatches.forEach(citaConComillas => {
    const cita = citaConComillas.replace(/["']/g, '').trim();
    if (cita.length > 10 && !textoOriginal.includes(cita)) {
      citasInvalidas++;
    }
  });
  
  if (citasInvalidas > 0) {
    errors.push(`${citasInvalidas} cita(s) no se encuentran en el texto original`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    citasEncontradas
  };
}

/**
 * Extrae citas textuales del resumen con sus posiciones
 * @param {string} resumen
 * @returns {Array<{cita: string, inicio: number, fin: number}>}
 */
function extraerCitas(resumen) {
  const citasPattern = /["']([^"']{10,})["']/g;
  const citas = [];
  let match;
  
  while ((match = citasPattern.exec(resumen)) !== null) {
    citas.push({
      cita: match[1],
      inicio: match.index,
      fin: match.index + match[0].length
    });
  }
  
  return citas;
}

/**
 * Evalúa el resumen usando DeepSeek (análisis rápido estructural)
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function evaluarConDeepSeek({ resumen, textoOriginal, citas }) {
  const prompt = `Evalúa este RESUMEN ACADÉMICO según los criterios de Comprensión Analítica.

**TEXTO ORIGINAL:**
${textoOriginal.substring(0, 2000)}...

**RESUMEN DEL ESTUDIANTE:**
${resumen}

**CITAS DETECTADAS (${citas.length}):**
${citas.map((c, i) => `${i + 1}. "${c.cita}"`).join('\n')}

---

**EVALÚA SEGÚN ESTOS 3 CRITERIOS:**

1. **Precisión y Claridad del Resumen** (1-4):
   - ¿Resume la tesis y argumentos principales con fidelidad?
   - ¿Usa sus propias palabras o solo copia fragmentos?
   - ¿Captura matices y tono del autor?

2. **Selección y Uso de Citas** (1-4):
   - ¿Las citas son pertinentes y representativas?
   - ¿Se integran coherentemente en el resumen?
   - ¿Apoyan las ideas clave?

3. **Estructura y Coherencia** (1-4):
   - ¿El resumen tiene una estructura lógica?
   - ¿Las ideas fluyen coherentemente?
   - ¿Se distingue información central de secundaria?

**NIVELES:**
1 = Insuficiente
2 = Básico
3 = Competente
4 = Avanzado

**RESPONDE EN JSON:**
{
  "precision_resumen": {
    "nivel": 1-4,
    "evidencia": "Cita específica del resumen",
    "fortaleza": "Lo que hizo bien",
    "mejora": "Qué puede mejorar"
  },
  "seleccion_citas": {
    "nivel": 1-4,
    "evidencia": "Ejemplo de cita bien/mal usada",
    "fortaleza": "...",
    "mejora": "..."
  },
  "estructura_coherencia": {
    "nivel": 1-4,
    "evidencia": "...",
    "fortaleza": "...",
    "mejora": "..."
  }
}`;

  try {
    const response = await chatCompletion({
      provider: 'deepseek',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
      timeoutMs: 30000
    });
    
    const rawContent = extractContent(response);
    logger.log('🔍 [DeepSeek ResumenAcademico] Respuesta cruda:', rawContent.slice(0, 200));
    
    // Limpiar markdown
    let cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Extraer solo JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    logger.log('✅ [DeepSeek ResumenAcademico] Respuesta limpia:', cleaned.slice(0, 200));
    
    const parsed = JSON.parse(cleaned);
    if (!parsed.precision_resumen || !parsed.seleccion_citas || !parsed.estructura_coherencia) {
      throw new Error('Respuesta sin criterios esperados');
    }
    return parsed;
  } catch (error) {
    logger.error('[ResumenService] Error DeepSeek:', error);
    return {
      precision_resumen: { nivel: 3, evidencia: '', fortaleza: 'Análisis en proceso', mejora: 'Error en evaluación automática' },
      seleccion_citas: { nivel: 3, evidencia: '', fortaleza: 'Análisis en proceso', mejora: 'Error en evaluación automática' },
      estructura_coherencia: { nivel: 3, evidencia: '', fortaleza: 'Análisis en proceso', mejora: 'Error en evaluación automática' },
      _error: error.message
    };
  }
}

/**
 * Evalúa la calidad de inferencias usando OpenAI (análisis profundo)
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function evaluarConOpenAI({ resumen, textoOriginal, citas: _citas }) {
  const prompt = `Evalúa la CALIDAD DE INFERENCIAS en este resumen académico.

**TEXTO ORIGINAL:**
${textoOriginal.substring(0, 2000)}...

**RESUMEN DEL ESTUDIANTE:**
${resumen}

---

**CRITERIO CRÍTICO: Calidad de la Inferencia**

Analiza si el estudiante:
- Va más allá de lo literal para "leer entre líneas"
- Construye inferencias LÓGICAS basadas en evidencia textual
- Conecta patrones sutiles y connotaciones
- Revela significados que el autor NO declara explícitamente

**NIVELES:**
1 (Novato): Inferencias ausentes o basadas en opiniones sin sustento textual
2 (Aprendiz): Inferencias simples o literales sin profundidad  
3 (Competente): Inferencias lógicas y plausibles que leen entre líneas
4 (Experto): Inferencias profundas que revelan significado nuevo y perspicaz

**ADEMÁS, EVALÚA:**
- ¿Las citas apoyan las inferencias?
- ¿Distingue hechos de opiniones del autor?
- ¿Parafrasea o solo repite?

**RESPONDE EN JSON:**
{
  "calidad_inferencias": {
    "nivel": 1-4,
    "ejemplos_inferencias": ["Inferencia 1 detectada", "Inferencia 2..."],
    "inferencias_validas": ["Las que están bien fundamentadas"],
    "inferencias_debiles": ["Las que necesitan más evidencia"],
    "evidencia_textual": "Cita del resumen que muestra la inferencia",
    "fortaleza": "...",
    "mejora": "..."
  },
  "distincion_hecho_opinion": {
    "nivel": 1-4,
    "evidencia": "...",
    "fortaleza": "...",
    "mejora": "..."
  },
  "parafraseo_vs_copia": {
    "nivel": 1-4,
    "porcentaje_parafraseado": 0-100,
    "evidencia": "...",
    "fortaleza": "...",
    "mejora": "..."
  }
}`;

  try {
    const response = await chatCompletion({
      provider: 'openai',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
      timeoutMs: 45000
    });
    
    const content = extractContent(response);
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    logger.error('[ResumenService] Error OpenAI:', error);
    throw wrapServiceError(error, 'Error en analisis de inferencias');
  }
}

/**
 * Combina evaluaciones de DeepSeek y OpenAI en resultado final criterial
 * @param {Object} deepseekResult
 * @param {Object} openaiResult
 * @returns {Object} Evaluación criterial unificada
 */
function combinarEvaluaciones(deepseekResult, openaiResult) {
  const criteriosEvaluados = [];
  
  // Criterio 1: Selección y Uso de Citas (DeepSeek)
  if (deepseekResult.seleccion_citas) {
    criteriosEvaluados.push({
      id: 'seleccion_citas',
      criterio: 'Selección y Uso de Citas',
      nivel: deepseekResult.seleccion_citas.nivel,
      evidencia: [deepseekResult.seleccion_citas.evidencia],
      fortalezas: [deepseekResult.seleccion_citas.fortaleza],
      mejoras: [deepseekResult.seleccion_citas.mejora],
      fuente: 'DeepSeek'
    });
  }
  
  // Criterio 2: Calidad de Inferencias (OpenAI)
  if (openaiResult.calidad_inferencias) {
    criteriosEvaluados.push({
      id: 'calidad_inferencias',
      criterio: 'Calidad de la Inferencia',
      nivel: openaiResult.calidad_inferencias.nivel,
      evidencia: [
        openaiResult.calidad_inferencias.evidencia_textual,
        ...(openaiResult.calidad_inferencias.ejemplos_inferencias || [])
      ],
      fortalezas: [openaiResult.calidad_inferencias.fortaleza],
      mejoras: [openaiResult.calidad_inferencias.mejora],
      inferencias_validas: openaiResult.calidad_inferencias.inferencias_validas || [],
      inferencias_debiles: openaiResult.calidad_inferencias.inferencias_debiles || [],
      fuente: 'OpenAI'
    });
  }
  
  // Criterio 3: Precisión y Claridad del Resumen (DeepSeek)
  if (deepseekResult.precision_resumen) {
    criteriosEvaluados.push({
      id: 'precision_resumen',
      criterio: 'Precisión y Claridad del Resumen',
      nivel: deepseekResult.precision_resumen.nivel,
      evidencia: [deepseekResult.precision_resumen.evidencia],
      fortalezas: [deepseekResult.precision_resumen.fortaleza],
      mejoras: [deepseekResult.precision_resumen.mejora],
      fuente: 'DeepSeek'
    });
  }
  
  // Criterios adicionales de OpenAI
  if (openaiResult.distincion_hecho_opinion) {
    criteriosEvaluados.push({
      id: 'distincion_hecho_opinion',
      criterio: 'Distinción Hecho vs Opinión',
      nivel: openaiResult.distincion_hecho_opinion.nivel,
      evidencia: [openaiResult.distincion_hecho_opinion.evidencia],
      fortalezas: [openaiResult.distincion_hecho_opinion.fortaleza],
      mejoras: [openaiResult.distincion_hecho_opinion.mejora],
      fuente: 'OpenAI'
    });
  }
  
  if (openaiResult.parafraseo_vs_copia) {
    criteriosEvaluados.push({
      id: 'parafraseo',
      criterio: 'Paráfrasis vs Copia',
      nivel: openaiResult.parafraseo_vs_copia.nivel,
      evidencia: [openaiResult.parafraseo_vs_copia.evidencia],
      fortalezas: [openaiResult.parafraseo_vs_copia.fortaleza],
      mejoras: [openaiResult.parafraseo_vs_copia.mejora],
      porcentaje_parafraseado: openaiResult.parafraseo_vs_copia.porcentaje_parafraseado || 0,
      fuente: 'OpenAI'
    });
  }
  
  // Calcular score global (promedio ponderado)
  const niveles = criteriosEvaluados.map(c => c.nivel);
  const scoreGlobal = Math.round((niveles.reduce((a, b) => a + b, 0) / niveles.length) * 2.5); // Escala 1-10
  const nivelGlobal = Math.round(niveles.reduce((a, b) => a + b, 0) / niveles.length);
  
  return {
    dimension: 'comprension_analitica',
    scoreGlobal,
    nivel: nivelGlobal,
    criteriosEvaluados,
    resumenDimension: generarResumenDimension(criteriosEvaluados, nivelGlobal),
    siguientesPasos: generarSiguientesPasos(criteriosEvaluados),
    fuentes: {
      deepseek: deepseekResult,
      openai: openaiResult
    }
  };
}

/**
 * Genera resumen narrativo de la dimensión
 */
function generarResumenDimension(criterios, nivelGlobal) {
  const labels = {
    1: 'Insuficiente',
    2: 'Básico',
    3: 'Competente',
    4: 'Avanzado'
  };
  
  const nivelLabel = labels[nivelGlobal] || 'En desarrollo';
  const fortalezasGlobales = criterios.filter(c => c.nivel >= 3).map(c => c.criterio);
  const areasMejora = criterios.filter(c => c.nivel < 3).map(c => c.criterio);
  
  let resumen = `Tu resumen demuestra un nivel **${nivelLabel}** de Comprensión Analítica. `;
  
  if (fortalezasGlobales.length > 0) {
    resumen += `Destacas en: ${fortalezasGlobales.join(', ')}. `;
  }
  
  if (areasMejora.length > 0) {
    resumen += `Áreas de oportunidad: ${areasMejora.join(', ')}.`;
  }
  
  return resumen;
}

/**
 * Genera lista priorizada de acciones para mejorar
 */
function generarSiguientesPasos(criterios) {
  const pasos = [];
  
  // Priorizar criterios con nivel más bajo
  const criteriosOrdenados = [...criterios].sort((a, b) => a.nivel - b.nivel);
  
  criteriosOrdenados.slice(0, 3).forEach(c => {
    if (c.mejoras && c.mejoras[0]) {
      pasos.push(c.mejoras[0]);
    }
  });
  
  return pasos;
}

/**
 * Evalúa un resumen académico usando estrategia dual (DeepSeek + OpenAI)
 * @param {Object} params
 * @param {string} params.resumen - Resumen del estudiante
 * @param {string} params.textoOriginal - Texto fuente completo
 * @returns {Promise<Object>} Evaluación criterial completa
 */
export async function evaluarResumenAcademico({ resumen, textoOriginal }) {
  logger.log('📝 [ResumenService] Iniciando evaluación dual...');
  
  // Paso 1: Validación previa
  const validacion = validarResumenAcademico(resumen, textoOriginal);
  if (!validacion.valid) {
    throw new Error(`Validación fallida: ${validacion.errors.join('; ')}`);
  }
  
  logger.log(`✅ [ResumenService] Validación pasada. Citas encontradas: ${validacion.citasEncontradas}`);
  
  // Paso 2: Extraer citas
  const citas = extraerCitas(resumen);
  
  // Paso 3: Ejecutar evaluaciones en paralelo
  let deepseekFailure = null;
  let openaiFailure = null;

  const [deepseekResult, openaiResult] = await Promise.all([
    evaluarConDeepSeek({ resumen, textoOriginal, citas }).catch(err => {
      deepseekFailure = err;
      logger.warn('[ResumenService] DeepSeek falló, continuando solo con OpenAI:', err.message);
      return null;
    }),
    evaluarConOpenAI({ resumen, textoOriginal, citas }).catch(err => {
      openaiFailure = err;
      logger.warn('[ResumenService] OpenAI falló, continuando solo con DeepSeek:', err.message);
      return null;
    })
  ]);
  
  // Paso 4: Validar que al menos uno haya funcionado
  if (!deepseekResult && !openaiResult) {
    const rootFailure = openaiFailure || deepseekFailure;
    if (rootFailure) {
      throw wrapServiceError(rootFailure, 'Ambas IAs fallaron');
    }

    throw new Error('Ambas IAs fallaron. Intenta de nuevo.');
  }
  
  // Paso 5: Combinar resultados
  logger.log('🔀 [ResumenService] Combinando evaluaciones...');
  const evaluacionFinal = combinarEvaluaciones(
    deepseekResult || {},
    openaiResult || {}
  );
  
  logger.log(`✅ [ResumenService] Evaluación completada. Nivel global: ${evaluacionFinal.nivel}/4`);
  
  return evaluacionFinal;
}


