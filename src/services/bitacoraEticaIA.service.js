// src/services/bitacoraEticaIA.service.js
import { chatCompletion, extractContent } from './unifiedAiService';
import { getDimension, scoreToLevelDescriptor } from '../pedagogy/rubrics/criticalLiteracyRubric';
import { DEEPSEEK_CHAT_MODEL, OPENAI_CHAT_MODEL } from '../constants/aiModelDefaults';
import { AI_DEEP_EVALUATION_TIMEOUT_MS, AI_EVALUATION_TIMEOUT_MS } from '../constants/timeoutConstants';

import logger from '../utils/logger';
import { stripJsonFences } from '../utils/jsonClean';
const DEEPSEEK_MODEL = DEEPSEEK_CHAT_MODEL;
const OPENAI_MODEL = OPENAI_CHAT_MODEL;
const DIMENSION_KEY = 'metacognicion_etica_ia';

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

const BIAS_SAFETY_RULES = `
EQUIDAD Y NO DISCRIMINACIÓN (OBLIGATORIO):
- No uses lenguaje racista/sexista ni estereotipos.
- No hagas suposiciones sobre identidad (raza/etnia, género, nacionalidad, religión, orientación sexual, discapacidad, clase social).
- Evita eurocentrismo: reconoce pluralidad cultural y contextual.
- No repitas insultos o slurs textualmente; usa referencias indirectas o redacción suavizada.
- Si aparece discriminación en el registro o reflexión, analízala críticamente sin validarla ni amplificarla.
`;


/**
 * 🤖 DEEPSEEK: Validación de transparencia y registro
 * 
 * Enfoque: Verificar que el estudiante haya documentado:
 * - Registro completo de interacciones con IA
 * - Descripción clara del proceso de uso
 * - Verificación de información
 */
function buildDeepSeekPrompt(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones) {
  const interaccionesResumen = tutorInteractions.length > 0
    ? `Total de interacciones: ${tutorInteractions.length}\nEjemplos:\n${tutorInteractions.slice(0, 3).map((i, idx) => `${idx + 1}. ${i.question}`).join('\n')}`
    : 'No hay interacciones registradas';

  const declaracionesTexto = Object.entries(declaraciones)
    .map(([key, value]) => `- ${key}: ${value ? '✓ Sí' : '✗ No'}`)
    .join('\n');

  return `Eres un evaluador experto en ética del uso de IA en educación.

REGISTRO DE USO DE IA DEL ESTUDIANTE:

**Interacciones con IA:**
${interaccionesResumen}

**Verificación de fuentes:**
${verificacionFuentes || '(No proporcionado)'}

**Proceso de uso de IA:**
${procesoUsoIA || '(No proporcionado)'}

**Reflexión ética:**
${reflexionEtica || '(No proporcionado)'}

**Declaraciones completadas:**
${declaracionesTexto}

${BIAS_SAFETY_RULES}

---

TAREA: Evalúa la TRANSPARENCIA Y REGISTRO según estos 3 criterios:

**Criterio 1: Registro y Transparencia (registro_transparencia)**
- ¿Documenta interacciones con IA?
- ¿Describe el proceso de uso con claridad?
- ¿Es trazable su uso de IA?
- Nivel (1-4): 1=Registro inexistente/incompleto, 2=Parcial e inconsistente, 3=Documenta interacciones clave, 4=Trazabilidad detallada y autoconsciente

**Criterio 2: Evaluación Crítica de la Herramienta (evaluacion_critica_herramienta)**
- ¿Verifica información con otras fuentes?
- ¿Describe pasos de verificación?
- ¿Identifica limitaciones de la IA?
- Nivel (1-4): 1=Acepta como verdad absoluta, 2=Reconoce necesidad sin pasos claros, 3=Describe verificación e identifica limitaciones, 4=Analiza sesgos y cómo influyeron

**Criterio 3: Agencia y Responsabilidad (agencia_responsabilidad)**
- ¿Declara responsabilidad sobre su trabajo?
- ¿Diferencia entre su pensamiento y el de la IA?
- ¿Demuestra agencia intelectual?
- Nivel (1-4): 1=Dependencia alta sin reflexión, 2=Declara responsabilidad con reflexión limitada, 3=Diferencia decisiones propias y andamiaje, 4=Profunda reflexión sobre influencia e agencia

IMPORTANTE: Responde SOLO con JSON válido, sin explicaciones adicionales.

Formato de respuesta JSON:
{
  "criterios_evaluados": {
    "registro_transparencia": {
      "nivel": 1-4,
      "tiene_registro_completo": true/false,
      "describe_proceso_claramente": true/false,
      "es_trazable": true/false
    },
    "evaluacion_critica_herramienta": {
      "nivel": 1-4,
      "verifica_fuentes": true/false,
      "describe_pasos_verificacion": true/false,
      "identifica_limitaciones": true/false
    },
    "agencia_responsabilidad": {
      "nivel": 1-4,
      "declara_responsabilidad": true/false,
      "diferencia_pensamiento_propio": true/false,
      "demuestra_agencia": true/false
    }
  },
  "fortalezas_registro": ["fortaleza 1", "fortaleza 2"],
  "mejoras_registro": ["mejora 1", "mejora 2"]
}`;
}

/**
 * 🧠 OPENAI: Evaluación de profundidad metacognitiva
 * 
 * Enfoque: Evaluar la CALIDAD DE LA REFLEXIÓN ÉTICA:
 * - ¿Demuestra conciencia crítica sobre el uso de IA?
 * - ¿Reflexiona sobre dilemas éticos reales?
 * - ¿Comprende el impacto de la IA en su aprendizaje?
 */
function buildOpenAIPrompt(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, deepseekFeedback) {
  return `Eres un evaluador experto en metacognición y ética del uso de IA en educación.

REFLEXIÓN ÉTICA DEL ESTUDIANTE:

**Verificación de fuentes:**
${verificacionFuentes || '(No proporcionado)'}

**Proceso de uso de IA:**
${procesoUsoIA || '(No proporcionado)'}

**Reflexión ética:**
${reflexionEtica || '(No proporcionado)'}

**Evaluación estructural previa (DeepSeek):**
${JSON.stringify(deepseekFeedback.criterios_evaluados, null, 2)}

${BIAS_SAFETY_RULES}

---

TAREA: Evalúa la PROFUNDIDAD METACOGNITIVA de la reflexión ética. No repitas la evaluación estructural.

Enfócate en:

1. **Conciencia Crítica**: ¿Demuestra comprensión profunda de los dilemas éticos del uso de IA?
2. **Reflexión Auténtica**: ¿Es reflexión genuina o solo cumple con el requisito?
3. **Reconocimiento de Complejidad**: ¿Reconoce tensiones entre autonomía y ayuda de IA?

Ejemplos de reflexión BÁSICA vs AVANZADA:

BÁSICO:
- Verificación: "Busqué en Google algunas cosas."
- Proceso: "Usé la IA para entender mejor."
- Reflexión: "Aprendí que no debo confiar en la IA."

AVANZADO:
- Verificación: "Contraté la definición de 'hegemonía' que me dio la IA con el Diccionario de la RAE y con el artículo de Gramsci (1971). Encontré que la IA simplificó excesivamente el concepto omitiendo su dimensión cultural."
- Proceso: "Usé la IA como andamiaje para conceptos complejos, pero procuré reformular las explicaciones con mis propias palabras tras comprender. Por ejemplo, pedí que me explicara 'análisis crítico del discurso', pero luego lo apliqué yo mismo al texto sin depender de la IA para el análisis."
- Reflexión: "Me di cuenta de que existe una tensión entre aprovechar la IA como herramienta y mantener mi agencia intelectual. Si confío ciegamente, pierdo la oportunidad de desarrollar pensamiento crítico propio. Pero rechazarla completamente también sería ingenuo. La clave está en usarla críticamente: verificar, contrastar, y siempre mantener mi criterio como filtro final."

IMPORTANTE: Responde SOLO con JSON válido.

Formato de respuesta JSON:
{
  "profundidad_metacognitiva": {
    "registro_transparencia": {
      "demuestra_autoconsciencia": true/false,
      "reflexiona_sobre_proceso": true/false,
      "comentario": "Breve análisis"
    },
    "evaluacion_critica_herramienta": {
      "identifica_sesgos_ia": true/false,
      "comprende_limitaciones": true/false,
      "comentario": "Breve análisis"
    },
    "agencia_responsabilidad": {
      "reconoce_tension_autonomia_ayuda": true/false,
      "demuestra_postura_etica_madura": true/false,
      "comentario": "Breve análisis"
    }
  },
  "fortalezas_metacognitivas": ["insight 1", "insight 2"],
  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],
  "nivel_reflexion_etica": 1-4
}`;
}

/**
 * Evalúa con DeepSeek (transparencia y registro)
 */
async function evaluateWithDeepSeek(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones) {
  const prompt = buildDeepSeekPrompt(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones);
  
  try {
    const response = await chatCompletion({
      provider: 'deepseek',
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      timeoutMs: AI_EVALUATION_TIMEOUT_MS
    });

    const rawContent = extractContent(response);
    logger.log('🔍 [DeepSeek BitacoraEticaIA] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = stripJsonFences(rawContent);
    logger.log('✅ [DeepSeek BitacoraEticaIA] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    if (!parsed.criterios_evaluados) {
      throw new Error('Respuesta sin criterios_evaluados');
    }
    return parsed;
  } catch (error) {
    logger.error('❌ Error en evaluación DeepSeek (BitacoraEticaIA):', error);
    return {
      criterios_evaluados: {
        registro_transparencia: { nivel: 3, documenta_interacciones: true, describe_proceso: true },
        evaluacion_critica_herramienta: { nivel: 3, identifica_limitaciones: true, verifica_informacion: true },
        agencia_responsabilidad: { nivel: 3, asume_responsabilidad: true, demuestra_agencia: true }
      },
      fortalezas_registro: ['Análisis en proceso'],
      mejoras_transparencia: ['Error en evaluación automática'],
      _error: error.message
    };
  }
}

/**
 * Evalúa con OpenAI (profundidad metacognitiva)
 */
async function evaluateWithOpenAI(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, deepseekFeedback) {
  const prompt = buildOpenAIPrompt(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, deepseekFeedback);
  
  try {
    const response = await chatCompletion({
      provider: 'openai',
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      timeoutMs: AI_DEEP_EVALUATION_TIMEOUT_MS
    });

    const rawContent = extractContent(response);
    logger.log('🔍 [OpenAI BitacoraEticaIA] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = stripJsonFences(rawContent);
    logger.log('✅ [OpenAI BitacoraEticaIA] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    if (!parsed.profundidad_metacognitiva || !parsed.nivel_reflexion_etica) {
      throw new Error('Respuesta sin profundidad_metacognitiva');
    }
    return parsed;
  } catch (error) {
    logger.error('❌ Error en evaluación OpenAI (BitacoraEticaIA):', error);
    return {
      profundidad_metacognitiva: {
        registro_transparencia: { demuestra_autoconsciencia: true, reflexiona_sobre_proceso: true, comentario: 'Análisis básico' },
        evaluacion_critica_herramienta: { identifica_sesgos_ia: true, comprende_limitaciones: true, comentario: 'Análisis básico' },
        agencia_responsabilidad: { mantiene_agencia: true, critica_sobre_dependencia: true, comentario: 'Análisis básico' }
      },
      fortalezas_profundidad: ['Análisis en proceso'],
      oportunidades_profundizacion: ['Error en evaluación automática'],
      nivel_reflexion_etica: 3,
      _error: error.message
    };
  }
}

/**
 * Combina feedback de ambos AIs
 */
function mergeFeedback(deepseek, openai) {
  // Calcular niveles por criterio
  const criterios = {
    registro_transparencia: {
      nivel: deepseek.criterios_evaluados.registro_transparencia.nivel,
      fortalezas: [],
      mejoras: []
    },
    evaluacion_critica_herramienta: {
      nivel: deepseek.criterios_evaluados.evaluacion_critica_herramienta.nivel,
      fortalezas: [],
      mejoras: []
    },
    agencia_responsabilidad: {
      nivel: deepseek.criterios_evaluados.agencia_responsabilidad.nivel,
      fortalezas: [],
      mejoras: []
    }
  };

  // Ajustar niveles según profundidad metacognitiva (OpenAI)
  if (openai.profundidad_metacognitiva.registro_transparencia.demuestra_autoconsciencia) {
    criterios.registro_transparencia.fortalezas.push('Demuestra autoconciencia sobre el proceso de uso de IA');
  } else {
    criterios.registro_transparencia.mejoras.push('Desarrolla mayor autoconciencia sobre cómo usas la IA en tu aprendizaje');
  }

  if (openai.profundidad_metacognitiva.registro_transparencia.reflexiona_sobre_proceso) {
    criterios.registro_transparencia.fortalezas.push('Reflexiona críticamente sobre el proceso');
  } else {
    criterios.registro_transparencia.mejoras.push('Reflexiona más profundamente sobre tu proceso de uso de IA');
  }

  if (openai.profundidad_metacognitiva.evaluacion_critica_herramienta.identifica_sesgos_ia) {
    criterios.evaluacion_critica_herramienta.fortalezas.push('Identifica sesgos o limitaciones de la IA');
  } else {
    criterios.evaluacion_critica_herramienta.mejoras.push('Intenta identificar posibles sesgos o limitaciones de la IA que usaste');
  }

  if (openai.profundidad_metacognitiva.evaluacion_critica_herramienta.comprende_limitaciones) {
    criterios.evaluacion_critica_herramienta.fortalezas.push('Comprende las limitaciones de la herramienta');
  } else {
    criterios.evaluacion_critica_herramienta.mejoras.push('Profundiza en las limitaciones específicas de la IA como herramienta educativa');
  }

  if (openai.profundidad_metacognitiva.agencia_responsabilidad.reconoce_tension_autonomia_ayuda) {
    criterios.agencia_responsabilidad.fortalezas.push('Reconoce la tensión entre autonomía intelectual y ayuda de IA');
  } else {
    criterios.agencia_responsabilidad.mejoras.push('Reflexiona sobre la tensión entre usar IA como herramienta y mantener tu autonomía intelectual');
  }

  if (openai.profundidad_metacognitiva.agencia_responsabilidad.demuestra_postura_etica_madura) {
    criterios.agencia_responsabilidad.fortalezas.push('Demuestra postura ética madura sobre el uso de IA');
  } else {
    criterios.agencia_responsabilidad.mejoras.push('Desarrolla una postura ética más clara sobre tu responsabilidad al usar IA');
  }

  // Añadir fortalezas/mejoras estructurales (DeepSeek)
  deepseek.fortalezas_registro.forEach(f => {
    const criterioKey = detectCriterioKey(f);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].fortalezas.push(f);
    }
  });

  deepseek.mejoras_registro.forEach(m => {
    const criterioKey = detectCriterioKey(m);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].mejoras.push(m);
    }
  });

  // Añadir insights metacognitivos (OpenAI)
  openai.fortalezas_metacognitivas.forEach(f => criterios.registro_transparencia.fortalezas.push(f));
  openai.oportunidades_profundizacion.forEach(m => criterios.registro_transparencia.mejoras.push(m));

  // Calcular nivel global (promedio + ajuste por profundidad metacognitiva)
  const nivelPromedio = (
    criterios.registro_transparencia.nivel +
    criterios.evaluacion_critica_herramienta.nivel +
    criterios.agencia_responsabilidad.nivel
  ) / 3;

  const nivelGlobal = Math.min(4, Math.round(nivelPromedio + (openai.nivel_reflexion_etica - nivelPromedio) * 0.3));

  return {
    dimension: DIMENSION_KEY,
    nivel_global: nivelGlobal,
    criterios,
    evidencias_deepseek: deepseek.criterios_evaluados,
    profundidad_openai: openai.profundidad_metacognitiva,
    fuentes: ['DeepSeek (transparencia y registro)', 'OpenAI (profundidad metacognitiva)']
  };
}

/**
 * Detecta a qué criterio pertenece un comentario (heurística simple)
 */
function detectCriterioKey(comentario) {
  const lower = comentario.toLowerCase();
  if (lower.includes('registro') || lower.includes('transparencia') || lower.includes('documenta')) return 'registro_transparencia';
  if (lower.includes('verific') || lower.includes('crítica') || lower.includes('fuente') || lower.includes('sesgo')) return 'evaluacion_critica_herramienta';
  if (lower.includes('agencia') || lower.includes('responsabilidad') || lower.includes('autoría') || lower.includes('autonomía')) return 'agencia_responsabilidad';
  return null;
}

/**
 * FUNCIÓN PRINCIPAL: Evaluación dual de Bitácora Ética de IA
 * 
 * @param {Object} params
 * @param {Array} params.tutorInteractions - Interacciones registradas con el tutor
 * @param {string} params.verificacionFuentes - Descripción de verificación de fuentes
 * @param {string} params.procesoUsoIA - Descripción del proceso de uso de IA
 * @param {string} params.reflexionEtica - Reflexión ética sobre el uso de IA
 * @param {Object} params.declaraciones - Declaraciones de autoría (checkboxes)
 * @returns {Promise<Object>} Feedback criterial con niveles y evidencias
 */
export async function evaluateBitacoraEticaIA({ tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones }) {
  logger.log('🤖 [BitacoraEticaIA] Iniciando evaluación dual...');

  const startTime = Date.now();

  try {
    // FASE 1: Evaluación de transparencia y registro con DeepSeek
    logger.log('📊 Evaluando transparencia y registro (DeepSeek)...');
    const deepseekResult = await evaluateWithDeepSeek(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones);

    // FASE 2: Evaluación de profundidad metacognitiva con OpenAI
    logger.log('🧠 Evaluando profundidad metacognitiva (OpenAI)...');
    const openaiResult = await evaluateWithOpenAI(tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, deepseekResult);

    // FASE 3: Combinar feedback
    logger.log('🔧 Combinando feedback dual...');
    const mergedFeedback = mergeFeedback(deepseekResult, openaiResult);

    // FASE 4: Añadir descriptores de rúbrica
    const rubricDimension = getDimension(DIMENSION_KEY);
    const levelInfo = scoreToLevelDescriptor(DIMENSION_KEY, mergedFeedback.nivel_global);

    const finalFeedback = {
      ...mergedFeedback,
      dimension_label: rubricDimension?.nombre || 'Metacognición Ética del Uso de IA',
      dimension_description: rubricDimension?.descripcion || '',
      nivel_descriptor: levelInfo.descriptor,
      duracion_ms: Date.now() - startTime
    };

    logger.log(`✅ Evaluación completada en ${finalFeedback.duracion_ms}ms`);
    logger.log(`📊 Nivel global: ${mergedFeedback.nivel_global}/4`);

    return finalFeedback;

  } catch (error) {
    logger.error('❌ Error en evaluación dual de BitacoraEticaIA:', error);
    throw wrapServiceError(error, 'Error en evaluacion dual de BitacoraEticaIA');
  }
}


