import { RUBRIC_PROGRESS_META } from './progressSnapshot';

export const ANALYTICS_RUBRIC_IDS = Object.keys(RUBRIC_PROGRESS_META);

function toNumericScore(entry) {
  const rawValue = typeof entry === 'object' && entry !== null ? entry.score : entry;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(scores = []) {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
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

function getMeta(rubricId) {
  return RUBRIC_PROGRESS_META[rubricId] || {
    rubricId,
    name: rubricId,
    shortName: rubricId,
    color: '#3B82F6'
  };
}

function getRecordedAttemptCount(rubric = {}) {
  const totalAttempts = Number(rubric?.totalAttempts || 0);
  return totalAttempts > 0 ? totalAttempts : 0;
}

function getSnapshotRubrics(progressSnapshot) {
  return Array.isArray(progressSnapshot?.rubrics) ? progressSnapshot.rubrics : [];
}

function sortEntriesByTimestamp(entries = []) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const timeDiff = toTimestamp(a.entry?.timestamp) - toTimestamp(b.entry?.timestamp);
      return timeDiff !== 0 ? timeDiff : a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function getLegacyFormativeScores(rubricData = {}) {
  if (!Array.isArray(rubricData?.scores)) return [];
  return sortEntriesByTimestamp(
    rubricData.scores.filter((entry) => entry?.artefacto !== 'PracticaGuiada')
  );
}

function getSnapshotFormativeScores(rubric = {}) {
  return Array.isArray(rubric?.formativeScores) ? sortEntriesByTimestamp(rubric.formativeScores) : [];
}

function sortByRubricId(items = [], key = 'rubricId') {
  return [...items].sort((a, b) => String(a?.[key] || '').localeCompare(String(b?.[key] || '')));
}

function buildLegacyProgressChartModel(rubricProgress = {}) {
  const rubrics = Object.entries(rubricProgress)
    .filter(([rubricId, rubricData]) => rubricId.startsWith('rubrica') && getLegacyFormativeScores(rubricData).length > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (rubrics.length === 0) {
    return { chartData: [], stats: null, activeRubrics: [] };
  }

  const totalAttempts = rubrics.reduce((sum, [_, data]) => sum + getLegacyFormativeScores(data).length, 0);
  const maxAttempts = Math.max(...rubrics.map(([_, data]) => getLegacyFormativeScores(data).length));
  const rubricsWithMultiple = rubrics.filter(([_, data]) => getLegacyFormativeScores(data).length >= 2).length;
  const chartData = [];

  for (let index = 0; index < maxAttempts; index += 1) {
    const point = { attempt: index + 1 };
    rubrics.forEach(([rubricId, rubricData]) => {
      const entry = getLegacyFormativeScores(rubricData)[index];
      if (entry !== undefined) {
        point[rubricId] = toNumericScore(entry);
      }
    });
    chartData.push(point);
  }

  return {
    chartData,
    activeRubrics: rubrics.map(([rubricId]) => rubricId),
    stats: {
      totalAttempts,
      maxAttempts,
      avgAttemptsPerRubric: (totalAttempts / rubrics.length).toFixed(1),
      rubricsWithMultiple,
      totalRubrics: rubrics.length,
      needsMoreData: maxAttempts < 2
    }
  };
}

export function buildProgressChartModel({ rubricProgress = {}, progressSnapshot = null } = {}) {
  const snapshotRubrics = sortByRubricId(
    getSnapshotRubrics(progressSnapshot).filter((rubric) => getSnapshotFormativeScores(rubric).length > 0)
  );

  if (snapshotRubrics.length === 0) {
    return buildLegacyProgressChartModel(rubricProgress);
  }

  const totalAttempts = snapshotRubrics.reduce((sum, rubric) => sum + getSnapshotFormativeScores(rubric).length, 0);
  const maxAttempts = Math.max(...snapshotRubrics.map((rubric) => getSnapshotFormativeScores(rubric).length));
  const rubricsWithMultiple = snapshotRubrics.filter((rubric) => getSnapshotFormativeScores(rubric).length >= 2).length;
  const chartData = [];

  for (let index = 0; index < maxAttempts; index += 1) {
    const point = { attempt: index + 1 };
    snapshotRubrics.forEach((rubric) => {
      const entry = getSnapshotFormativeScores(rubric)[index];
      if (entry !== undefined) {
        point[rubric.rubricId] = toNumericScore(entry);
      }
    });
    chartData.push(point);
  }

  return {
    chartData,
    activeRubrics: snapshotRubrics.map((rubric) => rubric.rubricId),
    stats: {
      totalAttempts,
      maxAttempts,
      avgAttemptsPerRubric: (totalAttempts / snapshotRubrics.length).toFixed(1),
      rubricsWithMultiple,
      totalRubrics: snapshotRubrics.length,
      needsMoreData: maxAttempts < 2
    }
  };
}

export function buildRadarChartData({ rubricProgress = {}, progressSnapshot = null } = {}) {
  const snapshotRubrics = sortByRubricId(
    getSnapshotRubrics(progressSnapshot).filter((rubric) => Number(rubric?.effectiveScore || 0) > 0)
  );

  if (snapshotRubrics.length > 0) {
    return snapshotRubrics.map((rubric) => {
      const meta = getMeta(rubric.rubricId);
      return {
        rubric: rubric.rubricId,
        name: meta.shortName || rubric.shortName || rubric.rubricId,
        fullName: meta.name || rubric.name || rubric.rubricId,
        score: Number(rubric.effectiveScore || 0)
      };
    });
  }

  return Object.entries(rubricProgress)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([rubricId, rubricData]) => rubricId.startsWith('rubrica') && rubricData?.average !== undefined)
    .map(([rubricId, rubricData]) => {
      const meta = getMeta(rubricId);
      return {
        rubric: rubricId,
        name: meta.shortName || rubricId,
        fullName: meta.name || rubricId,
        score: Number(rubricData.average || 0)
      };
    });
}

function buildLegacyDistributionChartData(rubricProgress = {}) {
  return Object.entries(rubricProgress)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([rubricId, rubricData]) => rubricId.startsWith('rubrica') && Array.isArray(rubricData?.scores) && rubricData.scores.length > 0)
    .map(([rubricId, rubricData]) => {
      const scores = rubricData.scores.map((score) => toNumericScore(score));
      const meta = getMeta(rubricId);

      return {
        rubric: rubricId,
        name: meta.shortName || rubricId,
        fullName: meta.name || rubricId,
        attempts: scores.length,
        average: Number(rubricData.average || 0),
        best: Math.max(...scores),
        last: scores[scores.length - 1],
        color: meta.color
      };
    });
}

export function buildDistributionChartData({ rubricProgress = {}, progressSnapshot = null } = {}) {
  const snapshotRubrics = sortByRubricId(
    getSnapshotRubrics(progressSnapshot).filter((rubric) => Number(rubric?.totalAttempts || 0) > 0 || Number(rubric?.effectiveScore || 0) > 0)
  );

  if (snapshotRubrics.length === 0) {
    return buildLegacyDistributionChartData(rubricProgress);
  }

  return snapshotRubrics.map((rubric) => {
    const meta = getMeta(rubric.rubricId);
    const formativeScores = getSnapshotFormativeScores(rubric).map((entry) => toNumericScore(entry));
    const effectiveScore = Number(rubric.effectiveScore);
    const bestRecordedScore = Number(rubric.bestRecordedScore);
    const metricScores = formativeScores.length > 0
      ? formativeScores
      : (Number.isFinite(effectiveScore) && effectiveScore > 0 ? [effectiveScore] : []);
    const lastFormativeScore = formativeScores.length > 0 ? formativeScores[formativeScores.length - 1] : null;
    const hasScoreData = metricScores.length > 0;
    const bestScore = hasScoreData
      ? (Number.isFinite(bestRecordedScore) && bestRecordedScore > 0 ? bestRecordedScore : Math.max(...metricScores))
      : null;
    const lastScore = hasScoreData
      ? ((Number.isFinite(effectiveScore) && effectiveScore > 0) ? effectiveScore : lastFormativeScore)
      : null;
    const attempts = getRecordedAttemptCount(rubric);

    return {
      rubric: rubric.rubricId,
      name: meta.shortName || rubric.rubricId,
      fullName: meta.name || rubric.rubricId,
      attempts,
      hasRecordedAttempts: attempts > 0,
      average: hasScoreData ? average(metricScores) : null,
      best: bestScore,
      last: lastScore,
      hasScoreData,
      hasLegacyScoreOnlyEvidence: Boolean(rubric.hasLegacyScoreOnlyEvidence),
      statusLabel: rubric.currentStatusLabel || null,
      color: rubric.color || meta.color
    };
  });
}

export function buildDistributionInsights(chartData = []) {
  if (!Array.isArray(chartData) || chartData.length === 0) return [];

  const insights = [];
  const practiceComparableItems = chartData.filter((item) => !item.hasLegacyScoreOnlyEvidence);
  const practicedItems = practiceComparableItems.filter((item) => Number(item.attempts || 0) > 0);
  const totalAttempts = practiceComparableItems.reduce((sum, item) => sum + Number(item.attempts || 0), 0);
  const avgAttemptsPerRubric = practiceComparableItems.length > 0 ? totalAttempts / practiceComparableItems.length : 0;
  const byAttemptsDesc = [...practicedItems].sort((a, b) => {
    const diff = Number(b.attempts || 0) - Number(a.attempts || 0);
    return diff !== 0 ? diff : String(a.name || '').localeCompare(String(b.name || ''));
  });
  const mostPracticed = byAttemptsDesc[0];
  const leastPracticed = [...practiceComparableItems].sort((a, b) => {
    const diff = Number(a.attempts || 0) - Number(b.attempts || 0);
    return diff !== 0 ? diff : String(a.name || '').localeCompare(String(b.name || ''));
  })[0];

  if (mostPracticed && avgAttemptsPerRubric > 0 && mostPracticed.attempts > avgAttemptsPerRubric * 1.5) {
    insights.push(`${mostPracticed.name} es tu dimension mas practicada (${mostPracticed.attempts} intentos)`);
  }

  if (leastPracticed && avgAttemptsPerRubric > 0 && leastPracticed.attempts < avgAttemptsPerRubric * 0.5) {
    insights.push(`Considera practicar mas ${leastPracticed.name} (solo ${leastPracticed.attempts} intento${leastPracticed.attempts === 1 ? '' : 's'})`);
  }

  const improvements = chartData.filter((item) => (
    Number.isFinite(item?.last) &&
    Number.isFinite(item?.average) &&
    Number(item.last) > Number(item.average)
  ));
  if (improvements.length > 0) {
    const biggest = [...improvements].sort((a, b) => (
      (Number(b.last || 0) - Number(b.average || 0)) - (Number(a.last || 0) - Number(a.average || 0))
    ))[0];
    insights.push(`Tu ultimo intento en ${biggest.name} supero tu promedio (${Number(biggest.last || 0).toFixed(1)} vs ${Number(biggest.average || 0).toFixed(1)})`);
  }

  if (mostPracticed && leastPracticed && Number(mostPracticed.attempts || 0) - Number(leastPracticed.attempts || 0) > 5) {
    insights.push('Tu practica esta desbalanceada. Intenta distribuir intentos mas equitativamente');
  }

  return insights;
}

export function getSessionTimestamp(session) {
  return Math.max(
    toTimestamp(session?.timestamp),
    toTimestamp(session?.createdAt),
    toTimestamp(session?.lastModified)
  );
}

export function compareSessionsByTimestamp(a, b) {
  const aTimestamp = getSessionTimestamp(a);
  const bTimestamp = getSessionTimestamp(b);
  if (!aTimestamp && !bTimestamp) return 0;
  if (!aTimestamp) return 1;
  if (!bTimestamp) return -1;
  return aTimestamp - bTimestamp;
}

export function getSessionRubricScore(session, rubricId) {
  const snapshotScore = Number(session?.progressSnapshot?.rubricsById?.[rubricId]?.effectiveScore || 0);
  if (snapshotScore > 0) return snapshotScore;
  return Number(session?.rubricProgress?.[rubricId]?.average || 0);
}

export function getSessionAttemptCount(session, rubricIds = ANALYTICS_RUBRIC_IDS) {
  const scopedRubricIds = Array.isArray(rubricIds) && rubricIds.length > 0 ? rubricIds : ANALYTICS_RUBRIC_IDS;
  const isFullScope = scopedRubricIds.length === ANALYTICS_RUBRIC_IDS.length;
  const snapshotAttempts = Number(session?.progressSnapshot?.summary?.totalAttempts || 0);
  if (isFullScope && snapshotAttempts > 0) return snapshotAttempts;

  const snapshotScopedAttempts = scopedRubricIds.reduce((acc, rubricId) => {
    const rubricFromMap = session?.progressSnapshot?.rubricsById?.[rubricId];
    const rubricFromList = Array.isArray(session?.progressSnapshot?.rubrics)
      ? session.progressSnapshot.rubrics.find((rubric) => rubric?.rubricId === rubricId)
      : null;
    const rubric = rubricFromMap || rubricFromList;
    return acc + getRecordedAttemptCount(rubric);
  }, 0);
  if (snapshotScopedAttempts > 0) return snapshotScopedAttempts;

  const progress = session?.rubricProgress || {};
  return scopedRubricIds.reduce((acc, rubricId) => acc + (progress[rubricId]?.scores?.length || 0), 0);
}

export function hasSessionScoreForRubrics(session, rubricIds = ANALYTICS_RUBRIC_IDS) {
  const scopedRubricIds = Array.isArray(rubricIds) && rubricIds.length > 0 ? rubricIds : ANALYTICS_RUBRIC_IDS;
  const snapshotScores = scopedRubricIds
    .map((rubricId) => Number(session?.progressSnapshot?.rubricsById?.[rubricId]?.effectiveScore || 0))
    .filter((score) => score > 0);
  if (snapshotScores.length > 0) return true;

  const legacyScores = scopedRubricIds
    .map((rubricId) => Number(session?.rubricProgress?.[rubricId]?.average || 0))
    .filter((score) => score > 0);
  return legacyScores.length > 0;
}

export function getSessionAverageForRubrics(session, rubricIds = ANALYTICS_RUBRIC_IDS) {
  const scopedRubricIds = Array.isArray(rubricIds) && rubricIds.length > 0 ? rubricIds : ANALYTICS_RUBRIC_IDS;

  if (scopedRubricIds.length === ANALYTICS_RUBRIC_IDS.length) {
    const snapshotAverage = Number(session?.progressSnapshot?.summary?.averageEvaluatedScore || 0);
    if (snapshotAverage > 0) return snapshotAverage;
  }

  const snapshotScores = scopedRubricIds
    .map((rubricId) => Number(session?.progressSnapshot?.rubricsById?.[rubricId]?.effectiveScore || 0))
    .filter((score) => score > 0);
  if (snapshotScores.length > 0) return average(snapshotScores);

  const legacyScores = scopedRubricIds
    .map((rubricId) => Number(session?.rubricProgress?.[rubricId]?.average || 0))
    .filter((score) => score > 0);
  return legacyScores.length > 0 ? average(legacyScores) : 0;
}
