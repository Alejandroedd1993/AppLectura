/**
 * @deprecated SERVICIO LEGACY - NO USAR EN CÓDIGO NUEVO
 * 
 * Este servicio está DEPRECADO y será eliminado en una futura versión.
 * Usar en su lugar: textAnalysisOrchestrator.js → performFullAnalysis()
 * 
 * Razón de deprecación:
 * - Funcionalidad duplicada con textAnalysisOrchestrator.js (~70% overlap)
 * - No se usa actualmente en ningún componente activo
 * - Mantenimiento duplicado y riesgo de inconsistencias
 * 
 * Migración:
 * ANTES: analizarTextoCompletoProfundo(texto, opciones)
 * AHORA:  performFullAnalysis(texto, opciones)
 * 
 * @see textAnalysisOrchestrator.js
 */

/**
 * Servicio de Análisis Profundo de Texto para Literacidad Crítica
 * Realiza comprensión completa del texto antes de generar preguntas contextualizadas
 */

import { detectarContextoTexto, generarPreguntasContextualizadas } from './criticalQuestionGenerator.js';
import { buscarContextoWeb, generarPreguntasConContextoWeb } from './webContextService.js';
import { generarPromptLiteracidadCritica } from './criticalPromptService.js';
import { fetchWithTimeout } from '../utils/netUtils';
import { chatCompletion, extractContent } from './unifiedAiService';

import logger from '../utils/logger';
/**
 * @deprecated Usar performFullAnalysis() de textAnalysisOrchestrator.js
 * 
 * Realiza análisis completo y profundo del texto
 * Incluye: comprensión IA + contexto crítico + búsqueda web + preguntas contextualizadas
 */
export async function analizarTextoCompletoProfundo(texto, opciones = {}) {
  const {
    incluirBusquedaWeb = true,
    maxPreguntasPorDimension = 2,
    provider = 'deepseek',
    apiKey
  } = opciones;

  logger.log('🧠 Iniciando análisis profundo del texto completo...');
  // Declarar fuera del try para poder usarlo en el catch sin errores de alcance
  let contextoBasico;

  try {
    // FASE 1: Análisis estructural y contextual básico
    logger.log('📊 Fase 1: Detección de contexto crítico...');
    contextoBasico = detectarContextoTexto(texto);
    
    // FASE 2: Comprensión profunda con IA
    logger.log('🤖 Fase 2: Análisis profundo con IA...');
  const analisisIA = await realizarAnalisisProfundoIA(texto, contextoBasico, provider, apiKey);
    
    // FASE 3: Búsqueda web contextual (si está habilitada)
    let contextoWeb = null;
    if (incluirBusquedaWeb) {
      logger.log('🌐 Fase 3: Búsqueda web contextual...');
      try {
        contextoWeb = await buscarContextoWeb(
          texto, 
          contextoBasico, 
          analisisIA?.temas_identificados || contextoBasico.temasPrincipales
        );
      } catch (error) {
        logger.warn('⚠️ Búsqueda web no disponible:', error.message);
        contextoWeb = { modo_offline: true };
      }
    }
    
    // FASE 4: Generación de preguntas ultra-contextualizadas
    logger.log('💭 Fase 4: Generación de preguntas contextualizadas...');
    const preguntasBase = generarPreguntasContextualizadas(contextoBasico, maxPreguntasPorDimension);
    
    // Enriquecer preguntas con IA y contexto web
    const preguntasEnriquecidas = await enriquecerPreguntasConAnalisisIA(
      preguntasBase, 
      analisisIA, 
      contextoWeb, 
      texto
    );
    
    // FASE 5: Compilación del análisis completo
    const analisisCompleto = compilarAnalisisCompleto({
      texto,
      contextoBasico,
      analisisIA,
      contextoWeb,
      preguntasEnriquecidas
    });
    
    logger.log('✅ Análisis profundo completado');
    return analisisCompleto;
    
  } catch (error) {
    logger.error('❌ Error en análisis profundo:', error);
    // Fallback a análisis básico sin fallar completamente
    // Si contextoBasico no se calculó antes del fallo, intente derivarlo ahora de forma segura
    const contextoSeguro = contextoBasico || detectarContextoTexto(texto);
    return await fallbackAnalisisBasico(texto, contextoSeguro);
  }
}

/**
 * Realiza análisis profundo usando IA con prompt especializado
 */
async function realizarAnalisisProfundoIA(texto, contextoBasico, provider, apiKey) {
  try {
    const promptProfundo = generarPromptAnalisisProfundo(texto, contextoBasico);
    
    const data = await chatCompletion({
      provider,
      model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
      apiKey,
      messages: [
        { role: 'system', content: promptProfundo }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      timeoutMs: 30000
    });

    const content = extractContent(data);
    
    if (!content) {
      throw new Error('Respuesta vacía de IA');
    }

    try {
      // Saneado por si la IA devuelve code fences
      const cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '');
      return JSON.parse(cleaned);
    } catch (parseError) {
      // Si no es JSON válido, parsear manualmente
      return parsearAnalisisManual(content);
    }
    
  } catch (error) {
    logger.warn('⚠️ Análisis IA no disponible:', error.message);
    return null;
  }
}

/**
 * Genera prompt especializado para análisis profundo
 */
function generarPromptAnalisisProfundo(texto, contextoBasico) {
  return `Eres un especialista en análisis textual y pedagogía crítica. Tu tarea es realizar una comprensión COMPLETA y PROFUNDA del siguiente texto.

TEXTO A ANALIZAR:
"""
${texto}
"""

CONTEXTO DETECTADO:
- Género textual: ${contextoBasico.generoTextual}
- Temas principales: ${contextoBasico.temasPrincipales?.join(', ')}
- Complejidad: ${contextoBasico.complejidadCritica}

INSTRUCCIONES PARA EL ANÁLISIS PROFUNDO:

1. LEE Y COMPRENDE COMPLETAMENTE EL TEXTO
   - Identifica la idea central y argumentos principales
   - Reconoce la estructura argumentativa o narrativa
   - Detecta el tono, estilo y registro utilizado

2. ANALIZA EL CONTEXTO Y POSICIONAMIENTO
   - ¿Desde qué posición social/cultural/ideológica escribe el autor?
   - ¿Qué audiencia está siendo interpelada?
   - ¿Qué presuposiciones subyacen al texto?

3. IDENTIFICA VOCES Y PERSPECTIVAS
   - ¿Qué voces están presentes y representadas?
   - ¿Qué voces están ausentes o silenciadas?
   - ¿Cómo se construye la autoridad discursiva?

4. DETECTA ELEMENTOS CRÍTICOS
   - ¿Qué relaciones de poder se evidencian?
   - ¿Qué ideologías o valores se transmiten?
   - ¿Qué contradicciones o tensiones emergen?

5. CONTEXTUALIZA SOCIAL Y TEMPORALMENTE
   - ¿Cómo se relaciona con el contexto sociopolítico actual?
   - ¿Qué referencias culturales o históricas contiene?
   - ¿Qué conexiones con la realidad local se pueden establecer?

FORMATO DE RESPUESTA (JSON):
{
  "comprension_completa": {
    "idea_central": "síntesis de la idea principal del texto",
    "argumentos_principales": ["argumento1", "argumento2", "argumento3"],
    "estructura_textual": "descripción de cómo está organizado el texto",
    "tono_y_registro": "análisis del tono y registro discursivo"
  },
  "analisis_posicionamiento": {
    "posicion_autor": "desde qué lugar social/cultural/ideológico escribe",
    "audiencia_interpelada": "a quién se dirige el texto",
    "presuposiciones": ["presuposición1", "presuposición2"],
    "intencionalidad": "propósito comunicativo del texto"
  },
  "mapeo_voces": {
    "voces_presentes": ["voz1", "voz2", "voz3"],
    "voces_ausentes": ["voz ausente1", "voz ausente2"],
    "construccion_autoridad": "cómo se legitima el discurso"
  },
  "elementos_criticos": {
    "relaciones_poder": ["relación1", "relación2"],
    "ideologias_valores": ["ideología1", "valor1", "valor2"],
    "contradicciones": ["contradicción1", "contradicción2"],
    "sesgos_detectados": ["sesgo1", "sesgo2"]
  },
  "contextualizacion": {
    "conexion_actualidad": "cómo se relaciona con el contexto actual",
    "referencias_culturales": ["referencia1", "referencia2"],
    "implicaciones_locales": ["implicación1", "implicación2"],
    "relevancia_social": "importancia del tema para la sociedad actual"
  },
  "temas_identificados": ["tema específico 1", "tema específico 2", "tema específico 3"],
  "palabras_clave": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"]
}

Asegúrate de que tu análisis sea PROFUNDO, ESPECÍFICO al texto proporcionado y CRÍTICO desde una perspectiva pedagógica freireana.`;
}

/**
 * Parsea análisis manual cuando no es JSON válido
 */
function parsearAnalisisManual(content) {
  return {
    comprension_completa: {
      idea_central: "Análisis disponible en modo texto",
      argumentos_principales: ["Análisis realizado"],
      estructura_textual: "Estructura analizada",
      tono_y_registro: "Tono identificado"
    },
    temas_identificados: ["análisis", "texto", "contenido"],
    modo_parseo: "manual",
    contenido_original: content.slice(0, 500)
  };
}

/**
 * Enriquece preguntas base con análisis IA y contexto web
 */
async function enriquecerPreguntasConAnalisisIA(preguntasBase, analisisIA, contextoWeb, texto) {
  let preguntasEnriquecidas = [...preguntasBase];
  
  // 1. Enriquecer con análisis IA si está disponible
  if (analisisIA) {
    preguntasEnriquecidas = agregarPreguntasEspecificasIA(preguntasEnriquecidas, analisisIA);
  }
  
  // 2. Enriquecer con contexto web si está disponible
  if (contextoWeb && !contextoWeb.modo_offline) {
    preguntasEnriquecidas = generarPreguntasConContextoWeb(
      preguntasEnriquecidas,
      contextoWeb.contexto_web_encontrado || {},
      { temasPrincipales: analisisIA?.temas_identificados || [] },
      analisisIA?.temas_identificados || []
    );
  }
  
  // 3. Agregar metadatos de enriquecimiento
  preguntasEnriquecidas = preguntasEnriquecidas.map(pregunta => ({
    ...pregunta,
    enriquecimiento: {
      con_analisis_ia: !!analisisIA,
      con_contexto_web: !!(contextoWeb && !contextoWeb.modo_offline),
      nivel_contextualizacion: calcularNivelContextualizacion(pregunta, analisisIA, contextoWeb)
    }
  }));
  
  return preguntasEnriquecidas;
}

/**
 * Agrega preguntas específicas basadas en el análisis IA profundo
 */
function agregarPreguntasEspecificasIA(preguntasBase, analisisIA) {
  const preguntasEspecificas = [];
  
  // Preguntas sobre voces y perspectivas
  if (analisisIA.mapeo_voces?.voces_ausentes?.length > 0) {
    preguntasEspecificas.push({
      etapa: 'critico',
      pregunta: `El análisis detecta que faltan las voces de: ${analisisIA.mapeo_voces.voces_ausentes.join(', ')}. ¿Por qué crees que estas perspectivas están ausentes? ¿Cómo cambiaría el mensaje si estuvieran incluidas?`,
      categoria: 'voces_silenciadas',
      nivel_critico: 5,
      dimension_critica: 'análisis_voces',
      justificacion: 'Desarrolla conciencia sobre las exclusiones discursivas',
      origen_ia: true
    });
  }
  
  // Preguntas sobre relaciones de poder
  if (analisisIA.elementos_criticos?.relaciones_poder?.length > 0) {
    preguntasEspecificas.push({
      etapa: 'critico',
      pregunta: `Se identificaron estas relaciones de poder: ${analisisIA.elementos_criticos.relaciones_poder.join(', ')}. ¿Cómo se benefician algunos grupos de estas dinámicas? ¿Qué alternativas podrían existir?`,
      categoria: 'relaciones_poder',
      nivel_critico: 5,
      dimension_critica: 'análisis_poder',
      justificacion: 'Examina las dinámicas de poder implícitas en el texto',
      origen_ia: true
    });
  }
  
  // Preguntas sobre contextualización actual
  if (analisisIA.contextualizacion?.implicaciones_locales?.length > 0) {
    preguntasEspecificas.push({
      etapa: 'praxis',
      pregunta: `Considerando las implicaciones locales identificadas (${analisisIA.contextualizacion.implicaciones_locales.join(', ')}), ¿qué acciones concretas podrías emprender en tu comunidad relacionadas con este tema?`,
      categoria: 'praxis_local',
      nivel_critico: 5,
      dimension_critica: 'acción_transformadora',
      justificacion: 'Conecta el análisis crítico con posibilidades de acción local',
      origen_ia: true
    });
  }
  
  return [...preguntasBase, ...preguntasEspecificas];
}

/**
 * Calcula el nivel de contextualización de una pregunta
 */
function calcularNivelContextualizacion(pregunta, analisisIA, contextoWeb) {
  let nivel = 1; // Base
  
  if (pregunta.contexto_web) nivel += 2;
  if (pregunta.origen_ia) nivel += 2;
  if (analisisIA && pregunta.categoria?.includes('critica')) nivel += 1;
  if (contextoWeb && !contextoWeb.modo_offline) nivel += 1;
  
  return Math.min(nivel, 5); // Máximo 5
}

/**
 * Compila el análisis completo en formato estructurado
 */
function compilarAnalisisCompleto({ texto, contextoBasico, analisisIA, contextoWeb, preguntasEnriquecidas }) {
  return {
    resumen_ejecutivo: {
      tipo_analisis: 'profundo_contextualizado',
      con_ia: !!analisisIA,
      con_busqueda_web: !!(contextoWeb && !contextoWeb.modo_offline),
      total_preguntas: preguntasEnriquecidas.length,
      fecha_analisis: new Date().toISOString()
    },
    
    texto_analizado: {
      longitud_caracteres: texto.length,
      longitud_palabras: texto.split(/\s+/).length,
      genero_detectado: contextoBasico.generoTextual,
      complejidad_critica: contextoBasico.complejidadCritica
    },
    
    comprension_ia: analisisIA || {
      disponible: false,
      motivo: 'IA no disponible o error en procesamiento'
    },
    
    contexto_web: contextoWeb || {
      disponible: false,
      motivo: 'Búsqueda web deshabilitada o no disponible'
    },
    
    preguntas_contextualizadas: preguntasEnriquecidas.map(pregunta => ({
      ...pregunta,
      metadata: {
        origen: pregunta.origen_ia ? 'ia_especializada' : 'framework_critico',
        nivel_contextualizacion: pregunta.enriquecimiento?.nivel_contextualizacion || 1,
        tiene_contexto_web: !!(pregunta.contexto_web),
        complejidad_pedagogica: pregunta.nivel_critico || 3
      }
    })),
    
    analisis_critico_consolidado: {
      temas_principales: analisisIA?.temas_identificados || contextoBasico.temasPrincipales,
      voces_identificadas: analisisIA?.mapeo_voces || { presentes: [], ausentes: [] },
      elementos_criticos: analisisIA?.elementos_criticos || {},
      contextualizacion_social: analisisIA?.contextualizacion || {},
      marcadores_criticos_detectados: contextoBasico.marcadoresCriticos
    }
  };
}

/**
 * Análisis básico de fallback cuando falla el análisis profundo
 */
async function fallbackAnalisisBasico(texto, contextoBasico) {
  logger.log('⚠️ Usando análisis básico de fallback');
  
  const preguntasBasicas = generarPreguntasContextualizadas(contextoBasico, 1);
  
  return {
    resumen_ejecutivo: {
      tipo_analisis: 'basico_fallback',
      con_ia: false,
      con_busqueda_web: false,
      total_preguntas: preguntasBasicas.length,
      fecha_analisis: new Date().toISOString()
    },
    
    texto_analizado: {
      longitud_caracteres: texto.length,
      longitud_palabras: texto.split(/\s+/).length,
      genero_detectado: contextoBasico.generoTextual,
      complejidad_critica: contextoBasico.complejidadCritica
    },
    
    preguntas_contextualizadas: preguntasBasicas,
    
    analisis_critico_consolidado: {
      temas_principales: contextoBasico.temasPrincipales,
      modo_analisis: 'basico_sin_ia'
    }
  };
}

export default {
  analizarTextoCompletoProfundo
};