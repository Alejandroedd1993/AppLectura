/**
 * @deprecated COMPONENTE MODULAR NO USADO - NO INTEGRAR EN CÓDIGO NUEVO
 * 
 * Panel de progreso de rúbrica que nunca se integró en el sistema activo.
 * NO está en uso por ningún componente.
 * 
 * NOTA: La funcionalidad de progreso pedagógico ahora está en:
 * - CriticalProgressionPanel.js (progreso de dimensiones críticas)
 * - SistemaEvaluacion.js (feedback evaluativo con rúbrica)
 * 
 * Si necesitas visualización de progreso de rúbrica:
 * - CriticalProgressionPanel ya implementa progreso por dimensiones
 * - Considera integrar funcionalidad útil de este componente allí
 * 
 * @see CriticalProgressionPanel.js (componente activo de progreso)
 * @see SistemaEvaluacion.js (evaluación con rúbrica)
 */

import React from 'react';

function levelColor(level) {
  switch (level) {
    case 'novato': return '#6b7280';
    case 'aprendiz': return '#3b82f6';
    case 'competente': return '#10b981';
    case 'experto': return '#8b5cf6';
    default: return '#9ca3af';
  }
}

// criterionFeedbacks: { `${qIdx}:${dimensionId}:${criterionId}`: { nivel, ts?, ... } }
export default function RubricProgressPanel({ rubric, criterionFeedbacks = {}, theme, selectedDimensionId, sessionKey }) {
  if (!rubric) return null;
  const dimOrder = rubric?.meta?.dimensionsOrder || rubric?.dimensions?.map(d => d.id) || [];
  const dimsById = Object.fromEntries((rubric.dimensions || []).map(d => [d.id, d]));
  const [useSemicolon, setUseSemicolon] = React.useState(false);

  // Reducir a último estado por criterio (si hay múltiples entradas, usamos el más reciente por ts)
  const lastByCriterion = {};
  Object.entries(criterionFeedbacks).forEach(([key, data]) => {
    const parts = key.split(':');
    if (parts.length !== 3) return;
    const [, dimId, critId] = parts;
    const existing = lastByCriterion[`${dimId}:${critId}`];
    if (!existing || (data?.ts || 0) > (existing?.ts || 0)) {
      lastByCriterion[`${dimId}:${critId}`] = data;
    }
  });

  const panelStyle = {
    border: `1px solid ${theme?.border || '#e5e7eb'}`,
    background: theme?.surface || '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16
  };

  const dimHeaderStyle = { color: theme?.text || '#111827', margin: '8px 0 6px 0', fontWeight: 600 };
  const critRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: theme?.background || '#f9fafb', marginBottom: 6 };
  const badge = (lvl) => ({ backgroundColor: levelColor(lvl), color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 12, textTransform: 'capitalize' });
  const fmt = (ts) => {
    if (!ts) return 'N/D';
    try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
  };
  const trunc = (str, n=120) => (typeof str === 'string' && str.length > n) ? `${str.slice(0, n)}…` : (str || '');

  const getDimSummary = (dim) => {
    const total = (dim.criteria || []).length;
    let evaluated = 0;
    (dim.criteria || []).forEach(c => {
      const entry = lastByCriterion[`${dim.id}:${c.id}`];
      if (entry?.nivel) evaluated += 1;
    });
    const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    return { total, evaluated, percent };
  };

  const buildExportData = (onlyDimId) => ({
    meta: {
      rubricId: rubric?.meta?.id,
      generatedAt: new Date().toISOString()
    },
    dimensions: dimOrder
      .filter(dimId => !onlyDimId || dimId === onlyDimId)
      .map(dimId => {
      const dim = dimsById[dimId];
      return {
        id: dim.id,
        label: dim.label,
        criteria: (dim.criteria || []).map(c => {
          const entry = lastByCriterion[`${dim.id}:${c.id}`] || {};
          return {
            id: c.id,
            label: c.label,
            nivel: entry.nivel || null,
            ts: entry.ts || null,
            justificacion: entry.justificacion || null,
            sugerencia: entry.sugerencia || null
          };
        })
      };
    })
  });

  const csvEscape = (val, delimiter=',') => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    const needsQuotes = new RegExp(`["${delimiter}\\n\\r]`).test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const buildCSVData = (onlyDimId) => {
    const rubricId = rubric?.meta?.id || '';
    const delimiter = useSemicolon ? ';' : ',';
    const headers = ['rubricId','dimensionId','dimensionLabel','criterionId','criterionLabel','nivel','ts','isoDate','justificacion','sugerencia'];
    const rows = [headers.join(delimiter)];
    dimOrder
      .filter(dimId => !onlyDimId || dimId === onlyDimId)
      .forEach(dimId => {
      const dim = dimsById[dimId];
      if (!dim) return;
      (dim.criteria || []).forEach(c => {
        const entry = lastByCriterion[`${dim.id}:${c.id}`] || {};
        const ts = entry.ts || '';
        const iso = ts ? new Date(ts).toISOString() : '';
        const row = [
          rubricId,
          dim.id,
          dim.label,
          c.id,
          c.label,
          entry.nivel || '',
          ts,
          iso,
          entry.justificacion || '',
          entry.sugerencia || ''
        ].map(v => csvEscape(v, delimiter)).join(delimiter);
        rows.push(row);
      });
    });
    return rows.join('\n');
  };

  const handleExport = () => {
    try {
      const data = buildExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'progreso_rubrica.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    } catch (e) {
      // noop
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = buildCSVData();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'progreso_rubrica.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    } catch (e) {
      // noop
    }
  };

  const handleExportSelected = () => {
    if (!selectedDimensionId) return;
    try {
      const data = buildExportData(selectedDimensionId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progreso_rubrica_${selectedDimensionId}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    } catch (e) {}
  };

  const handleExportSelectedCSV = () => {
    if (!selectedDimensionId) return;
    try {
      const csv = buildCSVData(selectedDimensionId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progreso_rubrica_${selectedDimensionId}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    } catch (e) {}
  };

  const handleExportXLSX = async () => {
    try {
      const svc = await import('src/services/xlsxExportService');
      await svc.exportRubricProgressXLSX({ rubric, criterionFeedbacks, metadata: { sessionKey } });
    } catch (e) {
      // noop: si falta dependencia, no romper la UI
    }
  };

  const handleExportSelectedXLSX = async () => {
    if (!selectedDimensionId) return;
    try {
      const svc = await import('src/services/xlsxExportService');
      await svc.exportRubricProgressXLSX({ rubric, criterionFeedbacks, onlyDimensionId: selectedDimensionId, fileName: `progreso_rubrica_${selectedDimensionId}.xlsx`, metadata: { sessionKey } });
    } catch (e) {}
  };

  const buildSummaryText = () => {
    const lines = [];
    dimOrder.forEach(dimId => {
      const dim = dimsById[dimId];
      if (!dim) return;
      const { total, evaluated, percent } = getDimSummary(dim);
      lines.push(`${dim.label} — ${evaluated}/${total} (${percent}%)`);
    });
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    const text = buildSummaryText();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch (e) {}
  };

  return (
    <div data-testid="rubric-progress" style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📈</span>
        <strong style={{ color: theme?.text || '#111827' }}>Progreso por rúbrica</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme?.text || '#111827' }}>
            <input data-testid="csv-delimiter-semicolon" type="checkbox" checked={useSemicolon} onChange={e => setUseSemicolon(e.target.checked)} />
            Usar ; en CSV
          </label>
          <button data-testid="copy-rubric-progress" onClick={handleCopySummary} style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, background: theme?.background || '#f9fafb', color: theme?.text || '#111827', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Copiar resumen</button>
          <button data-testid="export-rubric-progress" onClick={handleExport} style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, background: theme?.background || '#f9fafb', color: theme?.text || '#111827', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Exportar progreso (JSON)</button>
          <button data-testid="export-rubric-progress-csv" onClick={handleExportCSV} style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, background: theme?.background || '#f9fafb', color: theme?.text || '#111827', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Exportar progreso (CSV)</button>
          <button data-testid="export-rubric-progress-xlsx" onClick={handleExportXLSX} style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, background: theme?.background || '#f9fafb', color: theme?.text || '#111827', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Exportar (XLSX)</button>
          {selectedDimensionId && (
            <>
              <button data-testid="export-rubric-progress-dim" onClick={handleExportSelected} style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, background: theme?.background || '#f9fafb', color: theme?.text || '#111827', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Exportar dimensión (JSON)</button>
              <button data-testid="export-rubric-progress-csv-dim" onClick={handleExportSelectedCSV} style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, background: theme?.background || '#f9fafb', color: theme?.text || '#111827', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Exportar dimensión (CSV)</button>
              <button data-testid="export-rubric-progress-xlsx-dim" onClick={handleExportSelectedXLSX} style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, background: theme?.background || '#f9fafb', color: theme?.text || '#111827', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Exportar dimensión (XLSX)</button>
            </>
          )}
        </div>
      </div>
      {dimOrder.map(dimId => {
        const dim = dimsById[dimId];
        if (!dim) return null;
        const summary = getDimSummary(dim);
        return (
          <div key={dim.id} style={{ marginBottom: 10 }}>
            <div data-testid={`dim-summary-${dim.id}`} style={dimHeaderStyle}>{dim.label} — {summary.evaluated}/{summary.total} ({summary.percent}%)</div>
            <div>
              {(dim.criteria || []).map(c => {
                const entry = lastByCriterion[`${dim.id}:${c.id}`];
                const lvl = entry?.nivel;
                const title = lvl ? `Fecha: ${fmt(entry?.ts)}\nJustificación: ${trunc(entry?.justificacion)}${entry?.sugerencia ? `\nSugerencia: ${trunc(entry.sugerencia)}` : ''}` : '';
                return (
                  <div key={c.id} style={critRowStyle}>
                    <div style={{ color: theme?.text || '#111827', fontSize: 14 }}>{c.label}</div>
                    <div>
                      {lvl ? (
                        <span style={badge(lvl)} title={title}>{lvl}</span>
                      ) : (
                        <span style={{ color: theme?.textMuted || '#6b7280', fontSize: 12 }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
