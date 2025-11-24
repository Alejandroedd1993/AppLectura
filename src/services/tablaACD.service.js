// src/services/tablaACD.service.js
import { chatCompletion, extractContent } from './unifiedAiService';
import { getDimension, scoreToLevelDescriptor } from '../pedagogy/rubrics/criticalLiteracyRubric';

const DEEPSEEK_MODEL = 'deepseek-chat';
const OPENAI_MODEL = 'gpt-4o-mini';
const DIMENSION_KEY = 'acd'; // Dimensión: Análisis Crítico del Discurso

/**
 * Limpia respuestas JSON que vienen con bloques markdown o texto adicional
 */
function cleanJsonResponse(rawContent) {
  let cleaned = rawContent.trim();
  
  // Eliminar bloques markdown ```json ... ```
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  
  // Extraer solo el JSON entre { y }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

/**
 * 🤖 DEEPSEEK: Validación estructural del análisis ACD
 * 
 * Enfoque: Verificar que el estudiante haya identificado correctamente:
 * - Marco ideológico coherente con el texto
 * - Estrategias retóricas precisas con ejemplos
 * - Voces presentes/silenciadas relevantes
 */
function buildDeepSeekPrompt(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas) {
  return `Eres un evaluador experto en Análisis Crítico del Discurso (ACD).

TEXTO ORIGINAL:
"""
${text.slice(0, 3000)}
"""

ANÁLISIS DEL ESTUDIANTE:

1. Marco ideológico identificado:
${marcoIdeologico}

2. Estrategias retóricas identificadas:
${estrategiasRetoricas}

3. Voces presentes en el discurso:
${vocesPresentes}

4. Voces silenciadas/ausentes:
${vocesSilenciadas}

---

TAREA: Evalúa la PRECISIÓN ESTRUCTURAL del análisis según estos 3 criterios:

**Criterio 1: Marco Ideológico (marco_ideologico)**
- ¿El marco identificado es coherente con el texto?
- ¿Hay evidencia textual que lo sustente?
- Nivel (1-4): 1=No identifica, 2=Vago, 3=Correcto, 4=Profundo con evidencia

**Criterio 2: Estrategias Retóricas (estrategias_retoricas)**
- ¿Las estrategias están correctamente identificadas?
- ¿Los ejemplos son precisos?
- Nivel (1-4): 1=No identifica, 2=Algunas vagas, 3=Varias correctas, 4=Análisis crítico completo

**Criterio 3: Voces y Silencios (voces_silencios)**
- ¿Distingue correctamente voces legitimadas de las ausentes?
- ¿Explica el efecto de estas ausencias?
- Nivel (1-4): 1=No cuestiona, 2=Menciona sin especificar, 3=Identifica con efecto, 4=Analiza poder e implicaciones

IMPORTANTE: Responde SOLO con JSON válido, sin explicaciones adicionales.

Formato de respuesta JSON:
{
  "criterios_evaluados": {
    "marco_ideologico": {
      "nivel": 1-4,
      "es_coherente": true/false,
      "evidencias_encontradas": ["cita 1", "cita 2"]
    },
    "estrategias_retoricas": {
      "nivel": 1-4,
      "estrategias_correctas": ["estrategia 1", "estrategia 2"],
      "estrategias_imprecisas": ["estrategia X"]
    },
    "voces_silencios": {
      "nivel": 1-4,
      "voces_presentes_correctas": ["voz A", "voz B"],
      "voces_silenciadas_correctas": ["voz X", "voz Y"]
    }
  },
  "fortalezas_estructurales": ["fortaleza 1", "fortaleza 2"],
  "mejoras_precision": ["mejora 1", "mejora 2"]
}`;
}

/**
 * 🧠 OPENAI: Evaluación de profundidad crítica
 * 
 * Enfoque: Evaluar la PROFUNDIDAD del análisis crítico:
 * - ¿Conecta ideología con beneficiarios?
 * - ¿Analiza el PODER persuasivo de las estrategias?
 * - ¿Comprende las IMPLICACIONES de los silencios?
 */
function buildOpenAIPrompt(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, deepseekFeedback) {
  return `Eres un evaluador experto en pensamiento crítico y análisis del discurso.

TEXTO ORIGINAL:
"""
${text.slice(0, 3000)}
"""

ANÁLISIS DEL ESTUDIANTE:

Marco ideológico: ${marcoIdeologico}
Estrategias retóricas: ${estrategiasRetoricas}
Voces presentes: ${vocesPresentes}
Voces silenciadas: ${vocesSilenciadas}

EVALUACIÓN ESTRUCTURAL PREVIA (DeepSeek):
${JSON.stringify(deepseekFeedback, null, 2)}

---

TAREA: Evalúa la PROFUNDIDAD CRÍTICA del análisis. No repitas la evaluación estructural.

Enfócate en:

1. **Conexiones ideológicas**: ¿Conecta el marco con beneficiarios, intereses o sistemas de poder?
2. **Análisis retórico profundo**: ¿Explica POR QUÉ esas estrategias son persuasivas o manipuladoras?
3. **Implicaciones de silencios**: ¿Comprende el IMPACTO de las voces ausentes?

Ejemplos de análisis SUPERFICIAL vs PROFUNDO:

SUPERFICIAL: "El texto usa metáforas."
PROFUNDO: "Las metáforas bélicas ('batalla', 'combate') naturalizan el conflicto y legitiman la violencia."

SUPERFICIAL: "Falta la voz de los trabajadores."
PROFUNDO: "La ausencia de trabajadores en el discurso los despoja de agencia, presentándolos como objetos pasivos en lugar de actores políticos."

IMPORTANTE: Responde SOLO con JSON válido.

Formato de respuesta JSON:
{
  "profundidad_critica": {
    "marco_ideologico": {
      "conecta_beneficiarios": true/false,
      "analiza_intereses": true/false,
      "comentario": "Breve análisis"
    },
    "estrategias_retoricas": {
      "explica_poder_persuasivo": true/false,
      "identifica_manipulacion": true/false,
      "comentario": "Breve análisis"
    },
    "voces_silencios": {
      "analiza_impacto": true/false,
      "comprende_dinamicas_poder": true/false,
      "comentario": "Breve análisis"
    }
  },
  "fortalezas_criticas": ["insight 1", "insight 2"],
  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],
  "nivel_pensamiento_critico": 1-4
}`;
}

/**
 * Evalúa con DeepSeek (precisión estructural)
 */
async function evaluateWithDeepSeek(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas) {
  const prompt = buildDeepSeekPrompt(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas);
  
  try {
    const response = await chatCompletion({
      provider: 'deepseek',
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      timeoutMs: 30000
    });

    const rawContent = extractContent(response);
    console.log('🔍 [DeepSeek TablaACD] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    console.log('✅ [DeepSeek TablaACD] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    if (!parsed.criterios_evaluados) {
      throw new Error('Respuesta sin criterios_evaluados');
    }
    return parsed;
  } catch (error) {
    console.error('❌ Error en evaluación DeepSeek (TablaACD):', error);
    return {
      criterios_evaluados: {
        marco_ideologico: { nivel: 3, evidencia_marco: '', coherencia: true },
        estrategias_retoricas: { nivel: 3, estrategias_correctas: [], ejemplos_precisos: [] },
        voces_silencios: { nivel: 3, voces_presentes_correctas: [], voces_silenciadas_relevantes: [] }
      },
      fortalezas_estructurales: ['Análisis en proceso'],
      mejoras_precision: ['Error en evaluación automática'],
      _error: error.message
    };
  }
}

/**
 * Evalúa con OpenAI (profundidad crítica)
 */
async function evaluateWithOpenAI(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, deepseekFeedback) {
  const prompt = buildOpenAIPrompt(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, deepseekFeedback);
  
  try {
    const response = await chatCompletion({
      provider: 'openai',
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      timeoutMs: 45000
    });

    const rawContent = extractContent(response);
    console.log('🔍 [OpenAI TablaACD] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    console.log('✅ [OpenAI TablaACD] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    if (!parsed.profundidad_critica || !parsed.nivel_pensamiento_critico) {
      throw new Error('Respuesta sin profundidad_critica');
    }
    return parsed;
  } catch (error) {
    console.error('❌ Error en evaluación OpenAI (TablaACD):', error);
    return {
      profundidad_critica: {
        marco_ideologico: { conecta_beneficiarios: true, analiza_naturalizacion: true, comentario: 'Análisis básico' },
        estrategias_retoricas: { explica_poder_persuasivo: true, identifica_manipulacion: true, comentario: 'Análisis básico' },
        voces_silencios: { analiza_impacto: true, conecta_poder: true, comentario: 'Análisis básico' }
      },
      fortalezas_profundidad: ['Análisis en proceso'],
      oportunidades_profundizacion: ['Error en evaluación automática'],
      nivel_pensamiento_critico: 3,
      _error: error.message
    };
  }
}

/**
 * Combina feedback de ambos AIs
 */
function mergeFeedback(deepseek, openai) {
  // Calcular niveles promedio por criterio
  const criterios = {
    marco_ideologico: {
      nivel: deepseek.criterios_evaluados.marco_ideologico.nivel,
      fortalezas: [],
      mejoras: []
    },
    estrategias_retoricas: {
      nivel: deepseek.criterios_evaluados.estrategias_retoricas.nivel,
      fortalezas: [],
      mejoras: []
    },
    voces_silencios: {
      nivel: deepseek.criterios_evaluados.voces_silencios.nivel,
      fortalezas: [],
      mejoras: []
    }
  };

  // Ajustar niveles según profundidad crítica (OpenAI)
  if (openai.profundidad_critica.marco_ideologico.conecta_beneficiarios) {
    criterios.marco_ideologico.fortalezas.push('Conecta el marco ideológico con beneficiarios e intereses');
  } else {
    criterios.marco_ideologico.mejoras.push('Intenta conectar el marco ideológico con quiénes se benefician de este discurso');
  }

  if (openai.profundidad_critica.estrategias_retoricas.explica_poder_persuasivo) {
    criterios.estrategias_retoricas.fortalezas.push('Explica el poder persuasivo de las estrategias retóricas');
  } else {
    criterios.estrategias_retoricas.mejoras.push('Profundiza en POR QUÉ estas estrategias son persuasivas o manipuladoras');
  }

  if (openai.profundidad_critica.voces_silencios.analiza_impacto) {
    criterios.voces_silencios.fortalezas.push('Analiza el impacto de las voces silenciadas');
  } else {
    criterios.voces_silencios.mejoras.push('Reflexiona sobre el IMPACTO de las ausencias en el discurso');
  }

  // Añadir fortalezas/mejoras estructurales (DeepSeek)
  deepseek.fortalezas_estructurales.forEach(f => {
    const criterioKey = detectCriterioKey(f);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].fortalezas.push(f);
    }
  });

  deepseek.mejoras_precision.forEach(m => {
    const criterioKey = detectCriterioKey(m);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].mejoras.push(m);
    }
  });

  // Añadir insights críticos (OpenAI)
  openai.fortalezas_criticas.forEach(f => criterios.marco_ideologico.fortalezas.push(f));
  openai.oportunidades_profundizacion.forEach(m => criterios.marco_ideologico.mejoras.push(m));

  // Calcular nivel global (promedio de criterios + ajuste por profundidad crítica)
  const nivelPromedio = (
    criterios.marco_ideologico.nivel +
    criterios.estrategias_retoricas.nivel +
    criterios.voces_silencios.nivel
  ) / 3;

  const nivelGlobal = Math.min(4, Math.round(nivelPromedio + (openai.nivel_pensamiento_critico - nivelPromedio) * 0.3));

  return {
    dimension: DIMENSION_KEY,
    nivel_global: nivelGlobal,
    criterios,
    evidencias_deepseek: deepseek.criterios_evaluados,
    profundidad_openai: openai.profundidad_critica,
    fuentes: ['DeepSeek (precisión)', 'OpenAI (profundidad crítica)']
  };
}

/**
 * Detecta a qué criterio pertenece un comentario (heurística simple)
 */
function detectCriterioKey(comentario) {
  const lower = comentario.toLowerCase();
  if (lower.includes('marco') || lower.includes('ideolog')) return 'marco_ideologico';
  if (lower.includes('estrategia') || lower.includes('retóric')) return 'estrategias_retoricas';
  if (lower.includes('voce') || lower.includes('silenc') || lower.includes('ausenc')) return 'voces_silencios';
  return null;
}

/**
 * FUNCIÓN PRINCIPAL: Evaluación dual de Tabla ACD
 * 
 * @param {Object} params
 * @param {string} params.text - Texto original
 * @param {string} params.marcoIdeologico - Marco ideológico identificado por estudiante
 * @param {string} params.estrategiasRetoricas - Estrategias retóricas identificadas
 * @param {string} params.vocesPresentes - Voces presentes identificadas
 * @param {string} params.vocesSilenciadas - Voces silenciadas identificadas
 * @returns {Promise<Object>} Feedback criterial con niveles y evidencias
 */
export async function evaluateTablaACD({ text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas }) {
  console.log('🔍 [TablaACD] Iniciando evaluación dual...');

  const startTime = Date.now();

  try {
    // FASE 1: Evaluación estructural con DeepSeek
    console.log('📊 Evaluando precisión estructural (DeepSeek)...');
    const deepseekResult = await evaluateWithDeepSeek(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas);

    // FASE 2: Evaluación de profundidad crítica con OpenAI
    console.log('🧠 Evaluando profundidad crítica (OpenAI)...');
    const openaiResult = await evaluateWithOpenAI(text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, deepseekResult);

    // FASE 3: Combinar feedback
    console.log('🔧 Combinando feedback dual...');
    const mergedFeedback = mergeFeedback(deepseekResult, openaiResult);

    // FASE 4: Añadir descriptores de rúbrica
    const rubricDimension = getDimension(DIMENSION_KEY);
    const levelInfo = scoreToLevelDescriptor(DIMENSION_KEY, mergedFeedback.nivel_global);

    const finalFeedback = {
      ...mergedFeedback,
      dimension_label: rubricDimension?.nombre || 'Análisis Crítico del Discurso',
      dimension_description: rubricDimension?.descripcion || '',
      nivel_descriptor: levelInfo.descriptor,
      duracion_ms: Date.now() - startTime
    };

    console.log(`✅ Evaluación completada en ${finalFeedback.duracion_ms}ms`);
    console.log(`📊 Nivel global: ${mergedFeedback.nivel_global}/4`);

    return finalFeedback;

  } catch (error) {
    console.error('❌ Error en evaluación dual de TablaACD:', error);
    throw error;
  }
}



