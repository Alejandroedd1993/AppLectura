import { RUBRIC_PROGRESS_META } from './progressSnapshot';

function toNumericScore(entry) {
  if (typeof entry === 'object' && entry !== null) return Number(entry.score);
  return Number(entry);
}

function getRubricLabel(rubricId) {
  return RUBRIC_PROGRESS_META[rubricId]?.name || rubricId;
}

function toTimestamp(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000;
  }
  return 0;
}

function getArtifactScores(scores = []) {
  if (!Array.isArray(scores)) return [];
  return scores
    .filter((entry) => !(typeof entry === 'object' && entry?.artefacto === 'PracticaGuiada'))
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const timeDiff = toTimestamp(a.entry?.timestamp) - toTimestamp(b.entry?.timestamp);
      return timeDiff !== 0 ? timeDiff : a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function getSnapshotEvaluated(progressSnapshot) {
  if (!Array.isArray(progressSnapshot?.rubrics)) return [];
  return progressSnapshot.rubrics.filter((rubric) => Number(rubric?.effectiveScore || 0) > 0);
}

function getSnapshotMetricScores(progressSnapshot, snapshotEvaluated) {
  if (!Array.isArray(progressSnapshot?.rubrics)) return [];

  const scoredFormativesByRubric = progressSnapshot.rubrics.map((rubric) => ({
    rubricId: rubric?.rubricId,
    scores: getArtifactScores(rubric?.formativeScores || [])
      .map(toNumericScore)
      .filter((score) => Number.isFinite(score) && score > 0)
  }));

  const formativeScores = scoredFormativesByRubric.flatMap((rubric) => rubric.scores);
  const rubricsWithFormativeScores = new Set(
    scoredFormativesByRubric
      .filter((rubric) => rubric.scores.length > 0)
      .map((rubric) => rubric.rubricId)
  );
  const snapshotOnlyScores = snapshotEvaluated
    .filter((rubric) => !rubricsWithFormativeScores.has(rubric?.rubricId))
    .map((rubric) => Number(rubric?.effectiveScore || 0))
    .filter((score) => Number.isFinite(score) && score > 0);

  const combinedScores = [...formativeScores, ...snapshotOnlyScores];
  if (combinedScores.length > 0) return combinedScores;

  return snapshotEvaluated
    .map((rubric) => Number(rubric?.effectiveScore || 0))
    .filter((score) => Number.isFinite(score) && score > 0);
}

function calculateMedian(scores = []) {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sortedScores.length / 2);

  return sortedScores.length % 2 === 0
    ? (Number(sortedScores[mid - 1]) + Number(sortedScores[mid])) / 2
    : Number(sortedScores[mid]);
}

function calculateConsistency(scores = []) {
  if (!Array.isArray(scores) || scores.length < 2) {
    return { score: 0, hasData: false };
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return {
    score: Math.max(0, 10 - stdDev),
    hasData: true
  };
}

export function calculateDetailedStats(rubricProgress, progressSnapshot = null) {
  const rubrics = Object.entries(rubricProgress || {});
  const snapshotEvaluated = getSnapshotEvaluated(progressSnapshot);
  const hasSnapshot = Array.isArray(progressSnapshot?.rubrics) && progressSnapshot.rubrics.length > 0;
  const totalRubrics = hasSnapshot
    ? Number(progressSnapshot?.summary?.totalRubrics || progressSnapshot.rubrics.length || 0)
    : rubrics.length;

  if (totalRubrics === 0) {
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
        hasSufficientData: false,
      },
      recommendations: [],
    };
  }

  const evaluated = hasSnapshot
    ? snapshotEvaluated.map((rubric) => [rubric.rubricId, rubric])
    : rubrics.filter(([_, data]) => getArtifactScores(data?.scores).length > 0);
  const allScores = hasSnapshot
    ? getSnapshotMetricScores(progressSnapshot, snapshotEvaluated)
    : rubrics.flatMap(([_, data]) => getArtifactScores(data?.scores || []).map(toNumericScore));
  const totalAttempts = hasSnapshot
    ? Number(progressSnapshot?.summary?.totalAttempts || 0)
    : allScores.length;

  const averageScore = evaluated.length > 0
    ? (hasSnapshot
      ? Number(progressSnapshot?.summary?.averageEvaluatedScore || 0)
      : evaluated.reduce((sum, [_, data]) => sum + Number(data?.average || 0), 0) / evaluated.length)
    : 0;

  const medianScore = calculateMedian(allScores);
  const { score: consistencyScore, hasData: hasConsistencyData } = calculateConsistency(allScores);

  const strengths = evaluated
    .filter(([_, data]) => Number(hasSnapshot ? data?.effectiveScore : data?.average || 0) >= 8.6)
    .map(([id, data]) => ({
      rubricId: id,
      rubricLabel: getRubricLabel(id),
      score: Number(hasSnapshot ? data?.effectiveScore : data?.average || 0)
    }));

  const weaknesses = evaluated
    .filter(([_, data]) => Number(hasSnapshot ? data?.effectiveScore : data?.average || 0) < 5.6)
    .map(([id, data]) => ({
      rubricId: id,
      rubricLabel: getRubricLabel(id),
      score: Number(hasSnapshot ? data?.effectiveScore : data?.average || 0)
    }));

  const improving = [];
  const declining = [];
  let rubricsWithTrendData = 0;

  evaluated.forEach(([id, data]) => {
    const artifactScores = hasSnapshot
      ? getArtifactScores(data?.formativeScores || [])
      : getArtifactScores(data?.scores || []);
    if (artifactScores.length >= 3) {
      rubricsWithTrendData += 1;
      const first3 = artifactScores.slice(0, 3).reduce((sum, entry) => sum + toNumericScore(entry), 0) / 3;
      const last3 = artifactScores.slice(-3).reduce((sum, entry) => sum + toNumericScore(entry), 0) / 3;
      const change = last3 - first3;

      if (change > 1) improving.push({ rubricId: id, rubricLabel: getRubricLabel(id), improvement: change });
      if (change < -1) declining.push({ rubricId: id, rubricLabel: getRubricLabel(id), decline: Math.abs(change) });
    }
  });

  let overallTrend = 'stable';
  if (rubricsWithTrendData > 0) {
    if (improving.length > declining.length) overallTrend = 'improving';
    if (declining.length > improving.length) overallTrend = 'declining';
  }

  const recommendations = generateRecommendations({
    averageScore,
    strengths,
    weaknesses,
    improving,
    declining,
    totalAttempts,
    consistencyScore,
    hasConsistencyData,
    evaluatedRubrics: evaluated.length,
    totalRubrics,
  });

  return {
    summary: {
      totalRubrics,
      evaluatedRubrics: evaluated.length,
      totalAttempts,
      averageScore: parseFloat(averageScore.toFixed(2)),
      medianScore: parseFloat(medianScore.toFixed(2)),
      hasMedianData: allScores.length > 0,
      completionRate: totalRubrics > 0 ? (evaluated.length / totalRubrics) * 100 : 0,
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
      hasConsistencyData,
      hasSufficientData: rubricsWithTrendData > 0,
    },
    recommendations,
  };
}

function generateRecommendations(data) {
  const recommendations = [];

  if (data.averageScore < 5.6) {
    recommendations.push({
      type: 'improvement',
      priority: 'high',
      title: 'Refuerza conceptos fundamentales',
      description: 'Tu promedio actual sugiere que necesitas fortalecer las bases. Revisa primero las dimensiones con menor puntaje.',
      action: 'Vuelve a una dimension debil y responde un nuevo artefacto'
    });
  }

  if (data.weaknesses.length > 0) {
    recommendations.push({
      type: 'focus',
      priority: 'high',
      title: `Enfocate en ${data.weaknesses.length} dimension(es) debil(es)`,
      description: 'Ya hay areas claras de mejora. Trabaja una por una para subir cobertura y consistencia.',
      action: 'Prioriza las dimensiones con menor puntaje'
    });
  }

  if (data.improving.length > 0) {
    recommendations.push({
      type: 'motivation',
      priority: 'medium',
      title: 'Estas mejorando',
      description: `Se detecta progreso en ${data.improving.length} dimension(es). Mantener continuidad ahora vale mas que cambiar de estrategia.`,
      action: 'Sigue practicando la misma rutina que te dio mejores resultados'
    });
  }

  if (data.hasConsistencyData && data.consistencyScore < 6 && data.totalAttempts >= 3) {
    recommendations.push({
      type: 'strategy',
      priority: 'medium',
      title: 'Mejora tu consistencia',
      description: 'Tus puntajes varian bastante. Conviene revisar el feedback para identificar que se repite cuando obtienes mejores notas.',
      action: 'Compara tus respuestas fuertes con las mas debiles'
    });
  }

  if (data.declining.length > 0) {
    recommendations.push({
      type: 'alert',
      priority: 'high',
      title: 'Atencion: hay una caida reciente',
      description: `${data.declining.length} dimension(es) muestran una baja respecto a intentos anteriores.`,
      action: 'Haz una pausa corta y vuelve a evaluar la dimension mas inestable'
    });
  }

  if (data.averageScore >= 8.6 && data.evaluatedRubrics < data.totalRubrics) {
    recommendations.push({
      type: 'coverage',
      priority: 'medium',
      title: 'Amplia tu cobertura',
      description: 'Tu desempeno en lo evaluado es fuerte. Ahora conviene activar mas dimensiones para tener un panorama completo.',
      action: 'Elige una dimension sin nota y trabaja un nuevo artefacto'
    });
  } else if (data.totalAttempts < 5) {
    recommendations.push({
      type: 'engagement',
      priority: 'low',
      title: 'Aumenta tu practica',
      description: 'Con mas evaluaciones el feedback sera mas estable y util para ver tendencias reales.',
      action: 'Intenta responder al menos 2 preguntas o artefactos mas'
    });
  }

  if (data.averageScore >= 8.6) {
    recommendations.push({
      type: 'challenge',
      priority: 'low',
      title: 'Excelente desempeno en lo evaluado',
      description: 'Ya hay señales de dominio en las dimensiones con nota.',
      action: data.evaluatedRubrics < data.totalRubrics
        ? 'Conserva el nivel mientras abres nuevas dimensiones'
        : 'Explora textos mas avanzados o generos diferentes'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function generateTimeSeriesData(rubricProgress) {
  const timeSeries = {};

  Object.entries(rubricProgress || {}).forEach(([rubricId, data]) => {
    if (data?.scores && data.scores.length > 0) {
      timeSeries[rubricId] = data.scores.map((scoreEntry, index) => {
        const score = typeof scoreEntry === 'object' ? Number(scoreEntry.score) : Number(scoreEntry);
        const timestamp = typeof scoreEntry === 'object' ? scoreEntry.timestamp : null;

        return {
          attempt: index + 1,
          score,
          timestamp,
        };
      });
    }
  });

  return timeSeries;
}

export function calculateEngagementMetrics(activityData) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

  const recentActivity = activityData?.filter(a => a.timestamp > oneDayAgo).length || 0;
  const weekActivity = activityData?.filter(a => a.timestamp > oneWeekAgo).length || 0;
  const avgSessionTime = activityData && activityData.length > 0
    ? activityData.reduce((sum, a) => sum + (a.duration || 0), 0) / activityData.length
    : 0;

  return {
    dailyActivity: recentActivity,
    weeklyActivity: weekActivity,
    avgSessionTime: Math.round(avgSessionTime / 60),
    totalSessions: activityData?.length || 0,
  };
}

export function exportToCSV(rubricProgress) {
  const rubricNames = {
    rubrica1: 'Resumen Academico',
    rubrica2: 'Tabla ACD',
    rubrica3: 'Mapa de Actores',
    rubrica4: 'Respuesta Argumentativa',
    rubrica5: 'Bitacora Etica IA'
  };

  const nivelDescripcion = {
    1: 'Inicial',
    2: 'Basico',
    3: 'Competente',
    4: 'Avanzado'
  };

  const headers = [
    'Artefacto',
    'Promedio (sobre 10)',
    'Nivel Alcanzado (1-4)',
    'Descripcion del Nivel',
    'Numero de Intentos',
    'Mejor Puntuacion',
    'Ultima Puntuacion'
  ];

  const rows = Object.entries(rubricProgress || {}).map(([id, data]) => {
    const scores = (data?.scores || []).map(s => typeof s === 'object' ? Number(s.score) : Number(s));
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lastScore = scores.length > 0 ? scores[scores.length - 1] : 0;
    const averageScore = Number(data?.average || 0);
    const nivel = Math.ceil(averageScore / 2.5);

    return [
      rubricNames[id] || id,
      averageScore.toFixed(2),
      nivel,
      nivelDescripcion[nivel] || 'Sin clasificar',
      scores.length,
      bestScore.toFixed(2),
      lastScore.toFixed(2)
    ];
  });

  const dateRow = `"Evaluacion de Rubricas - Exportado: ${new Date().toLocaleString('es-ES')}"`;
  const csvContent = [
    dateRow,
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function exportToJSON(rubricProgress, stats) {
  const rubricNames = {
    rubrica1: 'Resumen Academico',
    rubrica2: 'Tabla ACD',
    rubrica3: 'Mapa de Actores',
    rubrica4: 'Respuesta Argumentativa',
    rubrica5: 'Bitacora Etica IA'
  };

  const nivelDescripcion = {
    1: 'Inicial - Requiere desarrollo',
    2: 'Basico - En progreso',
    3: 'Competente - Satisfactorio',
    4: 'Avanzado - Excelente'
  };

  const enrichedRubrics = {};
  Object.entries(rubricProgress || {}).forEach(([id, data]) => {
    const averageScore = Number(data?.average || 0);
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
      version: '1.1'
    },
    resumen: {
      rubricasEvaluadas: stats.summary.evaluatedRubrics,
      totalIntentos: stats.summary.totalAttempts,
      promedioGeneral: stats.summary.averageScore.toFixed(2),
      mediana: stats.summary.medianScore.toFixed(2),
      tasaCompletitud: `${stats.summary.completionRate.toFixed(1)}%`
    },
    estadisticas: stats,
    rubricas: enrichedRubrics,
  }, null, 2);
}
