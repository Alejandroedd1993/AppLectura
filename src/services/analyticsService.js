// src/services/analyticsService.js

/**
 * Servicio de analíticas para tracking de métricas educativas
 */

/**
 * Calcula estadísticas detalladas de progreso
 */
export function calculateDetailedStats(rubricProgress) {
  const rubrics = Object.entries(rubricProgress);
  
  if (rubrics.length === 0) {
    return {
      summary: {
        totalRubrics: 0,
        evaluatedRubrics: 0,
        totalAttempts: 0,
        averageScore: 0,
        medianScore: 0,
        completionRate: 0,
      },
      performance: {
        strengths: [],
        weaknesses: [],
        improving: [],
        declining: [],
      },
      trends: {
        overallTrend: 'stable',
        consistencyScore: 0,
      },
      recommendations: [],
    };
  }

  // Resumen básico
  const evaluated = rubrics.filter(([_, data]) => data.scores?.length > 0);
  const allScores = rubrics.flatMap(([_, data]) => 
    (data.scores || []).map(s => typeof s === 'object' ? Number(s.score) : Number(s))
  );
  const totalAttempts = allScores.length;
  
  const averageScore = evaluated.length > 0
    ? evaluated.reduce((sum, [_, data]) => sum + Number(data.average || 0), 0) / evaluated.length
    : 0;
  
  // Mediana
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const mid = Math.floor(sortedScores.length / 2);
  const medianScore = sortedScores.length > 0
    ? (sortedScores.length % 2 === 0 
        ? (Number(sortedScores[mid - 1]) + Number(sortedScores[mid])) / 2 
        : Number(sortedScores[mid]))
    : 0;

  // Fortalezas y debilidades
  const strengths = evaluated
    .filter(([_, data]) => Number(data.average) >= 8.6)
    .map(([id, data]) => ({ rubricId: id, score: Number(data.average) }));
  
  const weaknesses = evaluated
    .filter(([_, data]) => Number(data.average) < 5.6)
    .map(([id, data]) => ({ rubricId: id, score: Number(data.average) }));

  // Tendencias (últimos 3 vs primeros 3 intentos)
  const improving = [];
  const declining = [];
  
  evaluated.forEach(([id, data]) => {
    if (data.scores.length >= 3) {
      const getScore = (s) => typeof s === 'object' ? Number(s.score) : Number(s);
      const first3 = data.scores.slice(0, 3).reduce((a, b) => a + getScore(b), 0) / 3;
      const last3 = data.scores.slice(-3).reduce((a, b) => a + getScore(b), 0) / 3;
      const change = last3 - first3;
      
      if (change > 1) improving.push({ rubricId: id, improvement: change });
      if (change < -1) declining.push({ rubricId: id, decline: Math.abs(change) });
    }
  });

  // Tendencia general
  let overallTrend = 'stable';
  if (improving.length > declining.length) overallTrend = 'improving';
  if (declining.length > improving.length) overallTrend = 'declining';

  // Consistencia (desviación estándar normalizada)
  const variance = allScores.reduce((sum, score) => 
    sum + Math.pow(score - averageScore, 2), 0) / allScores.length;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, 10 - stdDev); // 10 = muy consistente, 0 = muy inconsistente

  // Recomendaciones
  const recommendations = generateRecommendations({
    averageScore,
    strengths,
    weaknesses,
    improving,
    declining,
    totalAttempts,
    consistencyScore,
  });

  return {
    summary: {
      totalRubrics: rubrics.length,
      evaluatedRubrics: evaluated.length,
      totalAttempts,
      averageScore: parseFloat(averageScore.toFixed(2)),
      medianScore: parseFloat(medianScore.toFixed(2)),
      completionRate: (evaluated.length / rubrics.length) * 100,
    },
    performance: {
      strengths,
      weaknesses,
      improving,
      declining,
    },
    trends: {
      overallTrend,
      consistencyScore: parseFloat(consistencyScore.toFixed(2)),
    },
    recommendations,
  };
}

/**
 * Genera recomendaciones personalizadas
 */
function generateRecommendations(data) {
  const recommendations = [];
  
  // Recomendación por promedio bajo
  if (data.averageScore < 5.6) {
    recommendations.push({
      type: 'improvement',
      priority: 'high',
      title: 'Refuerza conceptos fundamentales',
      description: 'Tu promedio actual sugiere que necesitas fortalecer las bases. Revisa los artefactos de las dimensiones con menor puntaje.',
      action: 'Visita el tab de Análisis para revisar el texto'
    });
  }

  // Recomendación por debilidades
  if (data.weaknesses.length > 0) {
    recommendations.push({
      type: 'focus',
      priority: 'high',
      title: `Enfócate en ${data.weaknesses.length} dimensión(es) débil(es)`,
      description: 'Has identificado áreas de mejora específicas. Trabaja en ellas sistemáticamente.',
      action: 'Practica más en las dimensiones con puntaje bajo'
    });
  }

  // Recomendación por mejora
  if (data.improving.length > 0) {
    recommendations.push({
      type: 'motivation',
      priority: 'medium',
      title: '¡Estás mejorando!',
      description: `Has mostrado progreso en ${data.improving.length} dimensión(es). Mantén el ritmo.`,
      action: 'Continúa practicando con constancia'
    });
  }

  // Recomendación por inconsistencia
  if (data.consistencyScore < 6) {
    recommendations.push({
      type: 'strategy',
      priority: 'medium',
      title: 'Mejora tu consistencia',
      description: 'Tus puntajes varían mucho. Desarrolla una estrategia de respuesta más sistemática.',
      action: 'Revisa los feedbacks para identificar patrones'
    });
  }

  // Recomendación por declive
  if (data.declining.length > 0) {
    recommendations.push({
      type: 'alert',
      priority: 'high',
      title: '⚠️ Atención: declive detectado',
      description: `${data.declining.length} dimensión(es) muestran declive. Puede ser fatiga o falta de práctica.`,
      action: 'Toma un descanso y retoma con enfoque renovado'
    });
  }

  // Recomendación por pocos intentos
  if (data.totalAttempts < 5) {
    recommendations.push({
      type: 'engagement',
      priority: 'low',
      title: 'Aumenta tu práctica',
      description: 'Más evaluaciones te darán mejor feedback sobre tu progreso.',
      action: 'Intenta responder al menos 2 preguntas por dimensión'
    });
  }

  // Recomendación por excelencia
  if (data.averageScore >= 8.6) {
    recommendations.push({
      type: 'challenge',
      priority: 'low',
      title: '🌟 ¡Excelente desempeño!',
      description: 'Has demostrado dominio. Considera desafíos más complejos.',
      action: 'Explora textos más avanzados o géneros diferentes'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Genera datos para gráfico de evolución temporal
 */
export function generateTimeSeriesData(rubricProgress) {
  const timeSeries = {};

  Object.entries(rubricProgress).forEach(([rubricId, data]) => {
    if (data.scores && data.scores.length > 0) {
      timeSeries[rubricId] = data.scores.map((scoreEntry, index) => {
        const score = typeof scoreEntry === 'object' ? Number(scoreEntry.score) : Number(scoreEntry);
        const timestamp = typeof scoreEntry === 'object' ? scoreEntry.timestamp : null;
        
        return {
          attempt: index + 1,
          score: score,
          timestamp: timestamp,
        };
      });
    }
  });

  return timeSeries;
}

/**
 * Calcula métricas de engagement
 */
export function calculateEngagementMetrics(activityData) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

  // Actividad reciente
  const recentActivity = activityData?.filter(a => a.timestamp > oneDayAgo).length || 0;
  const weekActivity = activityData?.filter(a => a.timestamp > oneWeekAgo).length || 0;

  // Tiempo promedio por sesión
  const avgSessionTime = activityData && activityData.length > 0
    ? activityData.reduce((sum, a) => sum + (a.duration || 0), 0) / activityData.length
    : 0;

  return {
    dailyActivity: recentActivity,
    weeklyActivity: weekActivity,
    avgSessionTime: Math.round(avgSessionTime / 60), // convertir a minutos
    totalSessions: activityData?.length || 0,
  };
}

/**
 * Exporta datos a CSV
 */
export function exportToCSV(rubricProgress) {
  const rubricNames = {
    rubrica1: 'Resumen Académico',
    rubrica2: 'Tabla ACD',
    rubrica3: 'Mapa de Actores',
    rubrica4: 'Respuesta Argumentativa',
    rubrica5: 'Bitácora Ética IA'
  };
  
  const nivelDescripcion = {
    1: 'Inicial',
    2: 'Básico',
    3: 'Competente',
    4: 'Avanzado'
  };
  
  const headers = [
    'Artefacto',
    'Promedio sobre 10',
    'Nivel Alcanzado',
    'Descripción del Nivel',
    'Número de Intentos',
    'Mejor Puntuación',
    'Última Puntuación',
    'ID Técnico'
  ];
  
  const rows = Object.entries(rubricProgress).map(([id, data]) => {
    const scores = (data.scores || []).map(s => typeof s === 'object' ? Number(s.score) : Number(s));
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lastScore = scores.length > 0 ? scores[scores.length - 1] : 0;
    const averageScore = Number(data.average || 0);
    const nivel = Math.ceil(averageScore / 2.5);
    
    return [
      rubricNames[id] || id,
      averageScore.toFixed(2),
      nivel,
      nivelDescripcion[nivel] || 'Sin clasificar',
      scores.length,
      bestScore.toFixed(2),
      lastScore.toFixed(2),
      id
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Agregar BOM UTF-8 para correcta visualización en Excel
  return '\uFEFF' + csvContent;
}

/**
 * Exporta datos a JSON
 */
export function exportToJSON(rubricProgress, stats) {
  const rubricNames = {
    rubrica1: 'Resumen Académico',
    rubrica2: 'Tabla ACD',
    rubrica3: 'Mapa de Actores',
    rubrica4: 'Respuesta Argumentativa',
    rubrica5: 'Bitácora Ética IA'
  };
  
  const nivelDescripcion = {
    1: 'Inicial - Requiere desarrollo',
    2: 'Básico - En progreso',
    3: 'Competente - Satisfactorio',
    4: 'Avanzado - Excelente'
  };
  
  const enrichedRubrics = {};
  Object.entries(rubricProgress).forEach(([id, data]) => {
    const averageScore = Number(data.average || 0);
    const nivel = Math.ceil(averageScore / 2.5);
    
    enrichedRubrics[id] = {
      nombre: rubricNames[id] || id,
      nivelAlcanzado: nivel,
      descripcionNivel: nivelDescripcion[nivel] || 'Sin clasificar',
      ...data
    };
  });
  
  return JSON.stringify({
    metadata: {
      fechaExportacion: new Date().toLocaleString('es-ES'),
      version: '1.0'
    },
    resumen: {
      rubricasEvaluadas: stats.summary.evaluatedRubrics,
      totalIntentos: stats.summary.totalAttempts,
      promedioGeneral: stats.summary.averageScore.toFixed(2),
      mediana: stats.summary.medianScore.toFixed(2),
      tasaCompletitud: stats.summary.completionRate.toFixed(1) + '%'
    },
    estadisticas: stats,
    rubricas: enrichedRubrics,
  }, null, 2);
}
