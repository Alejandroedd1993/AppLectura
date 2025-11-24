// Adaptadores y utilidades puras para el flujo de análisis crítico formativo.
// No dependen de React. Facilitan test unitario aislado.

export function adaptDeepAnalysis(raw) {
  if (!raw || typeof raw !== 'object') return { analysis: null, questions: [] };
  
  // NUEVO: Soporte para estructura dual (v2.0-intelligent-dual)
  const isDualAnalysis = raw?.metadata?.version?.includes('dual') || raw?.analisis_profundo;
  
  if (isDualAnalysis) {
    // Estructura del análisis inteligente dual (DeepSeek + OpenAI)
    const totalPreguntas = raw?.preguntas?.length || 0;
    const metadata = raw?.metadata || {};
    
    const analysis = {
      resumen: raw?.resumen || 'Análisis completado',
      temas_principales: raw?.temas_principales || [],
      tipo_texto: raw?.tipo_texto || 'general',
      nivel_complejidad: raw?.nivel_complejidad || 'intermedio',
      palabras_clave: raw?.palabras_clave || [],
      
      // Análisis profundo de OpenAI
      analisis_profundo: raw?.analisis_profundo || null,
      
      contexto_critico: {
        genero_textual: raw?.tipo_texto || 'texto general',
        complejidad_critica: raw?.nivel_complejidad || 'intermedia',
        contexto_web: raw?.contexto_web || null,
        proveedores_usados: metadata.proveedores_usados || ['deepseek', 'openai'],
        tiempo_analisis_ms: metadata.tiempo_total_ms || 0
      }
    };

    const questions = [];
    const preguntasArray = Array.isArray(raw?.preguntas) ? raw.preguntas : [];
    
    preguntasArray.forEach(p => {
      questions.push({
        etapa: p.etapa || mapDimensionToStage(p.dimension) || 'critico',
        pregunta: p.pregunta,
        categoria: p.categoria || p.tipo || 'critica_contextualizada',
        nivel_critico: p.nivel_critico ?? p.nivel_bloom_numerico ?? 3,
        dimension_critica: p.dimension || p.dimension_critica || 'analisis_critico',
        justificacion: p.justificacion,
        elementos_clave: p.elementos_clave,
        pistas: p.pistas || [],
        origen: p.origen || 'dual-analysis'
      });
    });

    questions.sort((a,b) => (a.nivel_critico||3) - (b.nivel_critico||3));
    return { analysis, questions };
  }
  
  // LEGACY: Estructura antigua (deepAnalysisService)
  const totalPreguntas = raw?.resumen_ejecutivo?.total_preguntas || (raw?.preguntas_contextualizadas?.length || 0);
  const analysis = {
    resumen: `Análisis completado con comprensión profunda de IA y contextualización web. Se generaron ${totalPreguntas} preguntas críticas contextualizadas.`,
    temas_principales: raw?.analisis_critico_consolidado?.temas_principales || [],
    contexto_critico: {
      genero_textual: raw?.texto_analizado?.genero_detectado || 'texto general',
      voces_representadas: raw?.comprension_ia?.mapeo_voces?.voces_presentes || [],
      voces_silenciadas: raw?.comprension_ia?.mapeo_voces?.voces_ausentes || [],
      complejidad_critica: raw?.texto_analizado?.complejidad_critica || 'intermedia',
      marcadores_criticos: raw?.analisis_critico_consolidado?.marcadores_criticos_detectados || [],
      contexto_web: raw?.contexto_web || null,
      comprension_ia: raw?.comprension_ia || null
    }
  };

  const questions = [];
  (raw?.preguntas_contextualizadas || []).forEach(p => {
    questions.push({
      etapa: p.etapa || mapDimensionToStage(p.dimension_critica) || 'critico',
      pregunta: p.pregunta,
      categoria: p.categoria || 'critica_contextualizada',
      nivel_critico: (p.nivel_critico ?? p.nivelCritico ?? 3),
      dimension_critica: p.dimension_critica || 'analisis_critico',
      justificacion: p.justificacion,
      elementos_clave: p.elementos_clave,
      contexto_web: p.contexto_web,
      comprension_ia: p.comprension_ia
    });
  });

  questions.sort((a,b) => (a.nivel_critico||3) - (b.nivel_critico||3));
  return { analysis, questions };
}

export function buildFallbackQuestions() {
  return [
    { etapa: 'literal', pregunta: '¿Qué información específica presenta el texto y qué datos podrían estar siendo omitidos?', categoria: 'comprension', nivel_critico: 1 },
    { etapa: 'inferencial', pregunta: '¿Qué presuposiciones o valores implícitos puedes identificar en el texto?', categoria: 'analisis', nivel_critico: 2 },
    { etapa: 'critico', pregunta: '¿Desde qué posición social o cultural parece escribir el autor y qué perspectivas podrían estar ausentes?', categoria: 'critica', nivel_critico: 3 },
    { etapa: 'evaluacion', pregunta: '¿Cómo podrías verificar o contrastar la información presentada con otras fuentes?', categoria: 'evaluacion', nivel_critico: 4 },
    { etapa: 'praxis', pregunta: '¿Qué acciones concretas podrías emprender basándote en este análisis para transformar tu realidad?', categoria: 'transformacion', nivel_critico: 5 }
  ];
}

export function buildFallbackAnalysis(contextoBasico) {
  return {
    resumen: `Análisis básico completado. El texto trata sobre: ${contextoBasico?.temasPrincipales?.join(', ') || 'temas no detectados'}. Se generaron preguntas de literacidad crítica para desarrollar pensamiento crítico.`,
    temas_principales: contextoBasico?.temasPrincipales || ['contenido textual'],
    contexto_critico: {
      genero_textual: contextoBasico?.generoTextual,
      complejidad_critica: contextoBasico?.complejidadCritica,
      modo_analisis: 'básico_respaldo'
    }
  };
}

function mapDimensionToStage(dimension) {
  const mapping = {
    'literal': 'literal',
    'inferencial': 'inferencial',
    'critica': 'critico',
    'evaluacion': 'evaluacion',
    'praxis': 'praxis',
    'digital': 'critico',
    'metacognicion': 'evaluacion'
  };
  return mapping[dimension] || 'critico';
}

export function buildFormativeFeedbackPrompt({ dimensionId, dimensionDef, question, answer, textSlice }) {
  const levels = (dimensionDef?.levels || []).map(l => `${l.id}: ${l.descriptor}`).join('\n');
  return `Evalúa formativamente la respuesta del estudiante SOLO para la dimensión: ${dimensionDef?.label} (${dimensionId}).
Devuelve JSON válido con campos:
{
  "dimension": "${dimensionId}",
  "nivel": "incipiente|en_desarrollo|consistente|transferente",
  "justificacion": "...",
  "fuerzas": ["..."],
  "sugerencia": "...",
  "pregunta_extension": "..."
}
No añadas texto fuera del JSON.
Definiciones de niveles:\n${levels}\n---
Texto (fragmento): "${textSlice}"
Pregunta: ${question}
Respuesta estudiante: "${answer}"`;
}

// Nuevo: construcción de prompt formativo a nivel de criterio (rúbrica v2)
// Parámetros esperados:
//  - dimension: objeto dimensión completo { id, label, criteria: [...] }
//  - criterion: objeto criterio { id, label, levels: { novato: string, ... } }
//  - answer: respuesta del estudiante
//  - question: pregunta original que respondió
//  - textSlice: fragmento del texto fuente
// Genera instrucción estricta para obtener SOLO JSON válido.
export function buildCriterionFeedbackPrompt({ dimension, criterion, answer, question, textSlice }) {
  if (!dimension || !criterion) return '';
  const levelScale = ['novato','aprendiz','competente','experto'];
  const levelDefs = levelScale
    .map(lvl => `${lvl}: ${criterion.levels?.[lvl] || ''}`)
    .join('\n');
  return `Actúa como evaluador pedagógico formativo. Analiza la respuesta SOLO para el criterio "${criterion.label}" de la dimensión "${dimension.label}".
Devuelve EXCLUSIVAMENTE un JSON válido con este esquema exacto:
{
  "dimension": "${dimension.id}",
  "criterio": "${criterion.id}",
  "nivel": "novato|aprendiz|competente|experto",
  "justificacion": "...",
  "fortalezas": ["..."],
  "sugerencia": "...",
  "pregunta_extension": "..."
}
No agregues texto fuera del JSON.
Definiciones de niveles para este criterio:\n${levelDefs}\n---
Fragmento del texto: "${textSlice}"
Pregunta original: ${question}
Respuesta del estudiante: "${answer}"`;
}
