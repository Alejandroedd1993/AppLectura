const RUBRIC_ORDER = ['rubrica1', 'rubrica2', 'rubrica3', 'rubrica4', 'rubrica5'];

export const RUBRIC_PROGRESS_META = {
  rubrica1: {
    rubricId: 'rubrica1',
    name: 'Comprension Analitica',
    shortName: 'Comprension',
    icon: '📚',
    color: '#7C3AED',
    artifactName: 'Resumen Academico',
    artifactKey: 'resumenAcademico'
  },
  rubrica2: {
    rubricId: 'rubrica2',
    name: 'Analisis Ideologico-Discursivo',
    shortName: 'Analisis',
    icon: '🔎',
    color: '#14B8A6',
    artifactName: 'Tabla ACD',
    artifactKey: 'tablaACD'
  },
  rubrica3: {
    rubricId: 'rubrica3',
    name: 'Contextualizacion Socio-Historica',
    shortName: 'Contextualizacion',
    icon: '🗺️',
    color: '#F59E0B',
    artifactName: 'Mapa de Actores',
    artifactKey: 'mapaActores'
  },
  rubrica4: {
    rubricId: 'rubrica4',
    name: 'Argumentacion y Contraargumento',
    shortName: 'Argumentacion',
    icon: '💭',
    color: '#EC4899',
    artifactName: 'Respuesta Argumentativa',
    artifactKey: 'respuestaArgumentativa'
  },
  rubrica5: {
    rubricId: 'rubrica5',
    name: 'Metacognicion Etica del Uso de IA',
    shortName: 'Metacognicion IA',
    icon: '🤖',
    color: '#9333EA',
    artifactName: 'Bitacora Etica IA',
    artifactKey: 'bitacoraEticaIA'
  }
};

export const PERFORMANCE_BANDS = [
  { min: 8.6, rank: 4, label: 'Experto', tone: 'excellent', color: '#7C3AED' },
  { min: 5.6, rank: 3, label: 'Competente', tone: 'good', color: '#16A34A' },
  { min: 2.6, rank: 2, label: 'Aprendiz', tone: 'developing', color: '#F59E0B' },
  { min: 0.01, rank: 1, label: 'Novato', tone: 'starting', color: '#64748B' }
];

function parseScore(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').replace('/10', '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMillis(value) {
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

function getPerformanceBand(score) {
  const numericScore = parseScore(score);
  return PERFORMANCE_BANDS.find((band) => numericScore >= band.min) || null;
}

export function hasSummativeAttempt(summative) {
  if (!summative || typeof summative !== 'object') return false;
  const status = String(summative.status || '').toLowerCase();
  const attemptsUsed = Number(summative.attemptsUsed || 0);
  return (
    attemptsUsed > 0 ||
    status === 'submitted' ||
    status === 'graded' ||
    toMillis(summative.submittedAt) > 0 ||
    toMillis(summative.gradedAt) > 0
  );
}

export function getSummativeScore(summative) {
  if (String(summative?.status || '').toLowerCase() !== 'graded') return 0;
  const override = parseScore(summative?.teacherOverrideScore);
  if (override > 0) return override;
  const score = parseScore(summative?.score);
  return score > 0 ? score : 0;
}

function hasScopedArtifacts(activitiesProgress) {
  if (!activitiesProgress || typeof activitiesProgress !== 'object') return false;
  return Object.keys(activitiesProgress).some((key) => key !== 'artifacts' && activitiesProgress?.[key]?.artifacts);
}

function getArtifactCandidates(activitiesProgress, lectureId, artifactKey) {
  if (!activitiesProgress || typeof activitiesProgress !== 'object' || !artifactKey) return [];

  const candidates = [];
  const scopedArtifactsExist = hasScopedArtifacts(activitiesProgress);

  if (lectureId && activitiesProgress?.[lectureId]?.artifacts?.[artifactKey]) {
    candidates.push(activitiesProgress[lectureId].artifacts[artifactKey]);
  }

  const canUseLegacyRoot = !lectureId || !scopedArtifactsExist;
  if (canUseLegacyRoot && activitiesProgress?.artifacts?.[artifactKey]) {
    candidates.push(activitiesProgress.artifacts[artifactKey]);
  }

  return candidates;
}

function pickArtifactData(activitiesProgress, lectureId, artifactKey) {
  const candidates = getArtifactCandidates(activitiesProgress, lectureId, artifactKey);
  if (candidates.length === 0) return null;

  const scoreCandidate = (candidate) => {
    const submittedWeight = candidate?.submitted ? 1000000 : 0;
    const overrideWeight = parseScore(candidate?.teacherOverrideScore) > 0 ? 100000 : 0;
    const scoreWeight = parseScore(candidate?.score) > 0 ? 10000 : 0;
    const lastScoreWeight = parseScore(candidate?.lastScore) > 0 ? 5000 : 0;
    const attemptWeight = Math.max(
      Number(candidate?.attempts || 0),
      Array.isArray(candidate?.history) ? candidate.history.length : 0
    );
    const timeWeight = Math.max(
      toMillis(candidate?.submittedAt),
      toMillis(candidate?.lastEvaluatedAt),
      toMillis(candidate?.updatedAt),
      toMillis(candidate?.timestamp)
    );

    return submittedWeight + overrideWeight + scoreWeight + lastScoreWeight + attemptWeight + timeWeight;
  };

  return [...candidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
}

function getFormativeScores(rubricData) {
  if (!Array.isArray(rubricData?.scores)) return [];
  return rubricData.scores
    .filter((entry) => entry?.artefacto !== 'PracticaGuiada')
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const timeDiff = toMillis(a.entry?.timestamp) - toMillis(b.entry?.timestamp);
      return timeDiff !== 0 ? timeDiff : a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function createRubricSnapshot(rubricId, rubricData, activitiesProgress, lectureId) {
  const meta = RUBRIC_PROGRESS_META[rubricId];
  const formativeScores = getFormativeScores(rubricData);
  const lastFormative = formativeScores[formativeScores.length - 1] || null;
  const bestFormativeScore = formativeScores.length > 0
    ? Math.max(...formativeScores.map((entry) => parseScore(entry?.score)))
    : 0;

  const artifactData = pickArtifactData(activitiesProgress, lectureId, meta?.artifactKey);
  const artifactAttempts = Math.max(
    Number(artifactData?.attempts || 0),
    Array.isArray(artifactData?.history) ? artifactData.history.length : 0,
    artifactData?.submitted ? 1 : 0
  );

  const summative = rubricData?.summative || null;
  const summativeAttempted = hasSummativeAttempt(summative);
  const summativeScore = getSummativeScore(summative);
  const summativeAttempts = summativeAttempted
    ? Math.max(1, Number(summative?.attemptsUsed || 1))
    : 0;
  const legacyAverageScore = parseScore(rubricData?.average);

  const artifactOverrideScore = parseScore(artifactData?.teacherOverrideScore);
  const artifactScore = parseScore(artifactData?.score) || parseScore(artifactData?.lastScore);
  const formativeScore = parseScore(lastFormative?.score) || legacyAverageScore;

  const effectiveScore = artifactOverrideScore || summativeScore || artifactScore || formativeScore || 0;
  const bestRecordedScore = Math.max(bestFormativeScore, effectiveScore);
  const scoreBand = getPerformanceBand(effectiveScore);
  const hasLegacyScoreOnlyEvidence = (
    legacyAverageScore > 0 &&
    formativeScores.length === 0 &&
    artifactAttempts === 0 &&
    !summativeAttempted
  );

  const hasPendingSummative = summativeAttempted && summativeScore <= 0 &&
    String(summative?.status || '').toLowerCase() === 'submitted';
  const hasPendingArtifactReview = Boolean(artifactData?.submitted) && artifactScore <= 0 && artifactOverrideScore <= 0;
  const hasAnyEvidence = (
    formativeScores.length > 0 ||
    artifactAttempts > 0 ||
    summativeAttempted ||
    Boolean(artifactData?.submitted) ||
    legacyAverageScore > 0
  );
  const isPendingReview = hasPendingSummative || hasPendingArtifactReview;

  const lastActivityAt = Math.max(
    toMillis(lastFormative?.timestamp),
    toMillis(artifactData?.submittedAt),
    toMillis(artifactData?.lastEvaluatedAt),
    toMillis(artifactData?.updatedAt),
    toMillis(summative?.gradedAt),
    toMillis(summative?.submittedAt),
    toMillis(summative?.timestamp)
  ) || null;

  const totalAttempts = Math.max(formativeScores.length, artifactAttempts) + summativeAttempts;
  const started = hasAnyEvidence;
  const evaluated = effectiveScore > 0;

  return {
    ...meta,
    rubricId,
    artifactData,
    rubricData,
    formativeScores,
    formativeAttempts: formativeScores.length,
    bestFormativeScore,
    lastFormative,
    summative,
    summativeAttempted,
    summativeScore,
    summativeAttempts,
    effectiveScore,
    bestRecordedScore,
    scoreBand,
    totalAttempts,
    hasLegacyScoreOnlyEvidence,
    started,
    evaluated,
    isPendingReview,
    lastActivityAt,
    badgeLabel: !started ? 'Sin iniciar' : isPendingReview ? 'Pendiente' : (scoreBand?.label || 'En progreso'),
    badgeTone: !started ? 'idle' : isPendingReview ? 'warning' : (scoreBand?.tone || 'info'),
    badgeColor: !started ? '#94A3B8' : isPendingReview ? '#F59E0B' : (scoreBand?.color || meta.color),
    currentStatusLabel: !started
      ? 'Sin iniciar'
      : isPendingReview
        ? 'Pendiente de revision'
        : evaluated
          ? scoreBand?.label || 'Evaluado'
          : 'En progreso'
  };
}

function pickMostRecentRubric(rubrics = []) {
  return [...rubrics].sort((a, b) => (toMillis(b.lastActivityAt) - toMillis(a.lastActivityAt)))[0] || null;
}

function buildStageSummary(summary) {
  if (summary.coverageCount === 0) {
    return {
      id: 'empty',
      label: 'Sin iniciar',
      tone: 'idle',
      description: 'Todavia no hay evidencia registrada en esta lectura.'
    };
  }

  if (summary.pendingCount > 0) {
    return {
      id: 'pending',
      label: 'Pendiente de revision',
      tone: 'warning',
      description: 'Hay entregas enviadas o ensayos sumativos esperando retroalimentacion.'
    };
  }

  if (summary.coverageCount === 1 && summary.totalAttempts <= 1) {
    return {
      id: 'starting',
      label: 'Primeros pasos',
      tone: 'info',
      description: 'Ya existe una dimension activa, pero todavia falta mas evidencia para ver patrones confiables.'
    };
  }

  if (summary.coverageCount < summary.totalRubrics) {
    return {
      id: 'expanding',
      label: 'Ampliando cobertura',
      tone: 'info',
      description: 'El progreso ya se ve mejor. Ahora conviene abrir mas dimensiones para equilibrar el mapa completo.'
    };
  }

  if (summary.weakCount > 0) {
    return {
      id: 'balanced-focus',
      label: 'Cobertura completa con foco de mejora',
      tone: 'success',
      description: 'Ya abriste todo el mapa. Ahora conviene reforzar las dimensiones con menor puntaje para equilibrar el desempeno general.'
    };
  }

  if (summary.strongCount >= 4) {
    return {
      id: 'solid',
      label: 'Desempeno consolidado',
      tone: 'success',
      description: 'Ya hay cobertura completa y varias dimensiones muestran un nivel fuerte o competente.'
    };
  }

  return {
    id: 'developing',
    label: 'Consolidando resultados',
    tone: 'primary',
    description: 'La cobertura ya esta activa; el siguiente paso es estabilizar las dimensiones mas debiles.'
  };
}

function buildNextAction(rubrics, summary) {
  const pendingRubric = pickMostRecentRubric(rubrics.filter((rubric) => rubric.isPendingReview));
  if (pendingRubric) {
    return {
      type: 'pending-review',
      tone: 'warning',
      icon: '⏳',
      rubricId: pendingRubric.rubricId,
      title: `Revisa ${pendingRubric.artifactName}`,
      description: 'Ya hay una entrega pendiente de revision. Puedes volver a la dimension para revisar el artefacto o afinarlo antes del feedback.',
      ctaLabel: 'Abrir dimension pendiente'
    };
  }

  const inProgressRubric = pickMostRecentRubric(
    rubrics.filter((rubric) => rubric.started && !rubric.evaluated && !rubric.isPendingReview)
  );
  if (inProgressRubric) {
    return {
      type: 'finish-current',
      tone: 'primary',
      icon: '✍️',
      rubricId: inProgressRubric.rubricId,
      title: `Cierra ${inProgressRubric.artifactName}`,
      description: 'Ya empezaste esta dimension. Terminarla te dara una senal mas util que abrir varias a la vez.',
      ctaLabel: 'Continuar dimension'
    };
  }

  const unstartedRubric = rubrics.find((rubric) => !rubric.started) || null;
  if (unstartedRubric) {
    return {
      type: 'expand-coverage',
      tone: 'info',
      icon: '🧭',
      rubricId: unstartedRubric.rubricId,
      title: `Activa ${unstartedRubric.name}`,
      description: `Solo llevas ${summary.coverageCount}/${summary.totalRubrics} dimensiones activas. Abrir una nueva ampliará la cobertura del texto.`,
      ctaLabel: 'Abrir nueva dimension'
    };
  }

  const weakestRubric = [...rubrics]
    .filter((rubric) => rubric.evaluated)
    .sort((a, b) => a.effectiveScore - b.effectiveScore)[0] || null;
  if (weakestRubric) {
    return {
      type: 'improve-balance',
      tone: 'success',
      icon: '🎯',
      rubricId: weakestRubric.rubricId,
      title: `Refuerza ${weakestRubric.name}`,
      description: 'Es la dimension con menor puntaje vigente. Trabajarla ahora mejora el balance general de la lectura.',
      ctaLabel: 'Mejorar esta dimension'
    };
  }

  const recentRubric = pickMostRecentRubric(rubrics.filter((rubric) => rubric.started));
  return recentRubric
    ? {
        type: 'review-progress',
        tone: 'neutral',
        icon: '🔎',
        rubricId: recentRubric.rubricId,
        title: `Vuelve a ${recentRubric.name}`,
        description: 'Esta es la dimension con actividad mas reciente. Puedes revisarla si quieres continuar tu trabajo.',
        ctaLabel: 'Abrir ultima dimension'
      }
    : null;
}

export function buildProgressSnapshot({
  rubricProgress = {},
  activitiesProgress = {},
  lectureId = null
} = {}) {
  const rubrics = RUBRIC_ORDER.map((rubricId) =>
    createRubricSnapshot(rubricId, rubricProgress?.[rubricId] || {}, activitiesProgress, lectureId)
  );

  const coverageCount = rubrics.filter((rubric) => rubric.started).length;
  const evaluatedCount = rubrics.filter((rubric) => rubric.evaluated).length;
  const pendingCount = rubrics.filter((rubric) => rubric.isPendingReview).length;
  const averageEvaluatedScore = evaluatedCount > 0
    ? rubrics.filter((rubric) => rubric.evaluated)
      .reduce((sum, rubric) => sum + rubric.effectiveScore, 0) / evaluatedCount
    : 0;
  const bestScore = rubrics.reduce((best, rubric) => Math.max(best, rubric.bestRecordedScore || 0), 0);
  const totalAttempts = rubrics.reduce((sum, rubric) => sum + rubric.totalAttempts, 0);
  const legacyEvidenceCount = rubrics.filter((rubric) => rubric.hasLegacyScoreOnlyEvidence).length;
  const coveragePercent = Math.round((coverageCount / RUBRIC_ORDER.length) * 100);
  const strongCount = rubrics.filter((rubric) => (rubric.scoreBand?.rank || 0) >= 3).length;
  const weakCount = rubrics.filter((rubric) => rubric.evaluated && (rubric.scoreBand?.rank || 0) > 0 && (rubric.scoreBand?.rank || 0) < 3).length;
  const hasMeaningfulTimeSeries = rubrics.some((rubric) => rubric.formativeAttempts >= 2);
  const stage = buildStageSummary({
    totalRubrics: RUBRIC_ORDER.length,
    coverageCount,
    evaluatedCount,
    pendingCount,
    strongCount,
    weakCount,
    totalAttempts
  });
  const nextAction = buildNextAction(rubrics, {
    totalRubrics: RUBRIC_ORDER.length,
    coverageCount,
    evaluatedCount,
    pendingCount,
    strongCount,
    weakCount,
    totalAttempts
  });
  const focusRubricId = nextAction?.rubricId || null;

  return {
    rubrics,
    rubricsById: Object.fromEntries(rubrics.map((rubric) => [rubric.rubricId, rubric])),
    summary: {
      totalRubrics: RUBRIC_ORDER.length,
      coverageCount,
      evaluatedCount,
      pendingCount,
      strongCount,
      weakCount,
      totalAttempts,
      legacyEvidenceCount,
      bestScore,
      averageEvaluatedScore,
      coveragePercent
    },
    stage,
    nextAction,
    focusRubricId,
    lists: {
      started: rubrics.filter((rubric) => rubric.started),
      unstarted: rubrics.filter((rubric) => !rubric.started),
      pending: rubrics.filter((rubric) => rubric.isPendingReview),
      evaluated: rubrics.filter((rubric) => rubric.evaluated)
    },
    hasData: coverageCount > 0,
    hasMeaningfulTimeSeries,
    canRenderRadar: evaluatedCount >= 2,
    canRenderDistribution: totalAttempts >= 2
  };
}

export function formatSnapshotDate(timestamp, locale = 'es-ES') {
  const time = toMillis(timestamp);
  if (!time) return 'Sin actividad';
  return new Date(time).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRubricAttemptDisplay(rubric, {
  emptyLabel = '0',
  legacyLabel = 'Sin registro legacy'
} = {}) {
  const totalAttempts = Number(rubric?.totalAttempts || 0);
  if (totalAttempts > 0) return String(totalAttempts);
  if (rubric?.hasLegacyScoreOnlyEvidence) return legacyLabel;
  return emptyLabel;
}
