// Servicio de exportación XLSX para progreso rubricado
// Intenta utilizar la librería 'xlsx' (SheetJS) vía import dinámico.
// Si no está disponible, rechaza con un error para que el caller pueda informar o tomar un fallback.

const buildLastByCriterion = (criterionFeedbacks = {}) => {
  const last = {};
  Object.entries(criterionFeedbacks).forEach(([key, data]) => {
    const parts = key.split(':');
    if (parts.length !== 3) return;
    const [, dimId, critId] = parts;
    const k = `${dimId}:${critId}`;
    const existing = last[k];
    if (!existing || (data?.ts || 0) > (existing?.ts || 0)) last[k] = data;
  });
  return last;
};

const toSummaryAoA = (rubric, lastByCriterion, dimOrder) => {
  const headers = ['Dimensión', 'Evaluados', 'Total', 'Porcentaje'];
  const rows = [headers];
  const dimsById = Object.fromEntries((rubric.dimensions || []).map(d => [d.id, d]));
  dimOrder.forEach(dimId => {
    const dim = dimsById[dimId];
    if (!dim) return;
    const total = (dim.criteria || []).length;
    const evaluated = (dim.criteria || []).reduce((acc, c) => acc + (lastByCriterion[`${dim.id}:${c.id}`]?.nivel ? 1 : 0), 0);
    const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    rows.push([dim.label, evaluated, total, `${percent}%`]);
  });
  return rows;
};

const toDetailAoA = (rubric, lastByCriterion, dimOrder) => {
  const headers = ['Dimensión', 'Criterio', 'Nivel', 'Timestamp', 'ISO Date', 'Justificación', 'Sugerencia'];
  const rows = [headers];
  const dimsById = Object.fromEntries((rubric.dimensions || []).map(d => [d.id, d]));
  dimOrder.forEach(dimId => {
    const dim = dimsById[dimId];
    if (!dim) return;
    (dim.criteria || []).forEach(c => {
      const entry = lastByCriterion[`${dim.id}:${c.id}`] || {};
      const ts = entry.ts || '';
      const iso = ts ? new Date(ts).toISOString() : '';
      rows.push([
        dim.label,
        c.label,
        entry.nivel || '',
        ts,
        iso,
        entry.justificacion || '',
        entry.sugerencia || ''
      ]);
    });
  });
  return rows;
};

export async function exportRubricProgressXLSX({ rubric, criterionFeedbacks = {}, onlyDimensionId = null, fileName = 'progreso_rubrica.xlsx', metadata = {} } = {}) {
  if (!rubric) throw new Error('Rubrica requerida');
  const dimOrder = rubric?.meta?.dimensionsOrder || rubric?.dimensions?.map(d => d.id) || [];
  const filteredOrder = onlyDimensionId ? dimOrder.filter(id => id === onlyDimensionId) : dimOrder;
  const last = buildLastByCriterion(criterionFeedbacks);

  let XLSX;
  try {
    // import dinámico para no romper en entornos sin dependencia instalada
    XLSX = (await import('xlsx')).default || (await import('xlsx'));
  } catch (e) {
    throw new Error('Dependencia XLSX no disponible');
  }

  const wb = XLSX.utils.book_new();

  // Metadatos
  const includedDims = (rubric.dimensions || []).filter(d => filteredOrder.includes(d.id));
  const dimsById = Object.fromEntries(includedDims.map(d => [d.id, d]));
  const totalDims = includedDims.length;
  const totalCriteria = includedDims.reduce((acc, d) => acc + (d.criteria?.length || 0), 0);
  const evaluatedCriteria = includedDims.reduce((acc, d) => acc + (d.criteria || []).reduce((a, c) => a + (last[`${d.id}:${c.id}`]?.nivel ? 1 : 0), 0), 0);
  const metaAoA = [
    ['Clave', 'Valor'],
    ['Rubric ID', rubric?.meta?.id || ''],
    ['Generado', new Date().toISOString()],
    ['Dimensión filtrada', onlyDimensionId || 'Todas'],
    ['Dimensiones incluidas', totalDims],
    ['Criterios incluidos', totalCriteria],
    ['Criterios evaluados', evaluatedCriteria],
  ];
  if (metadata?.sessionKey) metaAoA.push(['Session Key', metadata.sessionKey]);
  const wsMeta = XLSX.utils.aoa_to_sheet(metaAoA);
  wsMeta['!cols'] = [{ wch: 24 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Metadatos');

  // Resumen
  const summaryAoA = toSummaryAoA({ ...rubric, dimensions: (rubric.dimensions || []).filter(d => filteredOrder.includes(d.id)) }, last, filteredOrder);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoA);
  wsSummary['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: summaryAoA.length - 1, c: summaryAoA[0].length - 1 } }) };
  wsSummary['!cols'] = summaryAoA[0].map(h => ({ wch: Math.max(12, String(h).length + 2) }));
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // Detalle
  const detailAoA = toDetailAoA({ ...rubric, dimensions: (rubric.dimensions || []).filter(d => filteredOrder.includes(d.id)) }, last, filteredOrder);
  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoA);
  wsDetail['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: detailAoA.length - 1, c: detailAoA[0].length - 1 } }) };
  wsDetail['!cols'] = detailAoA[0].map(h => ({ wch: Math.max(14, String(h).length + 2) }));
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);

  return true;
}

export default { exportRubricProgressXLSX };
