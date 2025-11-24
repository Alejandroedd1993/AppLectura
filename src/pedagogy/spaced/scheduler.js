// Validación común de quality
function validateQuality(quality) {
  if (typeof quality !== 'number' || Number.isNaN(quality) || quality < 0 || quality > 5) {
    throw new Error('Quality debe estar entre 0-5');
  }
}

function nextIntervalDays({ interval = 0, repetition = 0, ef = 2.5 }, quality) {
  validateQuality(quality);
  // quality: 0-5 (0=olvido total, 5=perfecto)
  let newEf = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEf < 1.3) newEf = 1.3;

  let newRepetition = quality < 3 ? 0 : repetition + 1;
  let newInterval;
  if (quality < 3) newInterval = 1;
  else if (newRepetition === 1) newInterval = 1;
  else if (newRepetition === 2) newInterval = 6;
  else newInterval = Math.round(interval * newEf);

  return { interval: newInterval, repetition: newRepetition, ef: newEf };
}

function scheduleNext(review, quality) {
  validateQuality(quality);
  const { interval, repetition, ef } = nextIntervalDays(review, quality);
  const now = new Date();
  const dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return { ...review, interval, repetition, ef, dueDate: dueDate.toISOString(), quality };
}

// ---- Funciones adicionales requeridas por los tests ----

let _idCounter = 0;
function createStudyItem({ content = '', dimension = 'comprensionAnalitica', anchor = null } = {}) {
  const now = new Date();
  return {
    itemId: 'itm_' + (++_idCounter).toString(36),
    content,
    dimension,
    anchor,
    interval: 0,
    repetition: 0,
    ef: 2.5,
    dueDate: now.toISOString(),
    isActive: true,
    reviewCount: 0,
    averageQuality: 0,
    lastQuality: null
  };
}

function getDueItems(items = [], referenceDate = new Date()) {
  const ref = new Date(referenceDate).getTime();
  return items.filter(i => i.isActive !== false && i.dueDate && new Date(i.dueDate).getTime() <= ref);
}

function updateStudyItem(item, quality, extra = {}) {
  validateQuality(quality);
  const reviewCount = (item.reviewCount || 0) + 1;
  const averageQuality = ((item.averageQuality || 0) * (reviewCount - 1) + quality) / reviewCount;
  return {
    ...item,
    reviewCount,
    averageQuality,
    lastQuality: quality,
    ...extra
  };
}

module.exports = { scheduleNext, nextIntervalDays, createStudyItem, getDueItems, updateStudyItem, validateQuality };
