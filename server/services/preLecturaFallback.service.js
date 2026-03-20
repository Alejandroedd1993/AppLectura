function buildWebDecisionMetadata(searchDecision) {
  if (!searchDecision || typeof searchDecision !== 'object') {
    return {
      web_decision_needs_web: false,
      web_decision_confidence: 0,
      web_decision_reasons: [],
      web_decision_threshold: null,
      web_decision_classroom_mode: false,
      web_decision_min_indicators: null,
      web_decision_only_weak_signal: null,
      web_decision_indicators_matched: 0
    };
  }

  return {
    web_decision_needs_web: !!searchDecision.needsWeb,
    web_decision_confidence:
      typeof searchDecision.confidence === 'number' && Number.isFinite(searchDecision.confidence)
        ? searchDecision.confidence
        : 0,
    web_decision_reasons: Array.isArray(searchDecision.reasons) ? searchDecision.reasons : [],
    web_decision_threshold:
      typeof searchDecision.threshold === 'number' && Number.isFinite(searchDecision.threshold)
        ? searchDecision.threshold
        : null,
    web_decision_classroom_mode: !!searchDecision.classroomMode,
    web_decision_min_indicators:
      typeof searchDecision.minIndicators === 'number' && Number.isFinite(searchDecision.minIndicators)
        ? searchDecision.minIndicators
        : null,
    web_decision_only_weak_signal:
      typeof searchDecision.onlyWeakSignal === 'boolean' ? searchDecision.onlyWeakSignal : null,
    web_decision_indicators_matched:
      typeof searchDecision.matches === 'number' && Number.isFinite(searchDecision.matches)
        ? searchDecision.matches
        : (Array.isArray(searchDecision.reasons) ? searchDecision.reasons.length : 0)
  };
}

export function createFallbackAnalysis(text, processingTime, errorCode = null, searchDecision = null) {
  const resolvedErrorCode = errorCode || 'PRELECTURA_ANALYSIS_ERROR';

  return {
    prelecture: {
      metadata: {
        genero_textual: 'No identificado',
        proposito_comunicativo: 'No determinado',
        tipologia_textual: 'No identificado',
        autor: 'No identificado'
      },
      argumentation: {
        tesis_central: 'No disponible (error en análisis)',
        hipotesis_secundarias: [],
        argumentos_principales: [],
        tipo_argumentacion: 'No identificado',
        tipo_razonamiento: 'No identificado'
      },
      linguistics: {
        tipo_estructura: 'No identificado',
        registro_linguistico: 'No identificado',
        nivel_complejidad: 'Intermedio',
        coherencia_cohesion: 'No evaluado',
        figuras_retoricas: []
      },
      web_sources: [],
      web_summary: ''
    },
    critical: {
      resumen: 'Análisis no disponible temporalmente. Por favor, intenta de nuevo.',
      temas_principales: [],
      contexto_critico: {
        descripcion: 'Error en procesamiento',
        factores: [],
        voces_representadas: [],
        voces_silenciadas: [],
        ideologia_subyacente: null,
        marcadores_criticos: {},
        contraste_web: null
      },
      mcqQuestions: [],
      synthesisQuestions: []
    },
    metadata: {
      document_id: `doc_fallback_${Date.now()}`,
      analysis_timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      web_enriched: false,
      web_sources_count: 0,
      ...buildWebDecisionMetadata(searchDecision),
      provider: 'fallback',
      version: '3.0-fallback',
      error: true,
      errorCode: resolvedErrorCode,
      errorMessage: 'Analisis fallback generado por un error interno controlado.'
    },
    _isFallback: true,
    _errorCode: resolvedErrorCode,
    _errorMessage: 'Analisis fallback generado por un error interno controlado.'
  };
}