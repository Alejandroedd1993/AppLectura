import React from 'react';
import useMediaQuery from '../hooks/useMediaQuery';

/**
 * Detección heurística de tablas en texto extraído.
 * Busca bloques con separadores verticales (|), CSV-like (;, ,) o múltiples espacios alineados.
 * Devuelve una lista de tablas con filas/columnas simples para render HTML.
 */
export function detectarTablasEnTexto(paragraphs) {
  const tablas = [];
  let buffer = [];

  const isRowLike = (s) => /\|/.test(s) || /;/.test(s) || /,\s+/.test(s) || /\s{2,}\S+/.test(s);
  const pushIfTable = () => {
    if (buffer.length >= 2) {
      const rows = buffer.map(l => l.trim());
      // Tokenizar por prioridad: |
      const parsed = rows.map(r => r.includes('|') ? r.split('|') : (r.includes(';') ? r.split(';') : r.split(/\s{2,}/)));
      const maxCols = Math.max(...parsed.map(cols => cols.length));
      // Normalizar columnas
      const norm = parsed.map(cols => {
        const out = Array.from({ length: maxCols }, (_, i) => (cols[i] || '').trim());
        return out;
      });
      tablas.push({ rows: norm });
    }
    buffer = [];
  };

  for (const p of paragraphs) {
    if (p.type === 'p') {
      const lines = p.content.split(/\n+/);
      for (const line of lines) {
        if (isRowLike(line)) {
          buffer.push(line);
        } else {
          pushIfTable();
        }
      }
      pushIfTable();
    }
  }
  return tablas;
}

/**
 * Renderiza una tabla simple como HTML table.
 */
export function TablaHTML({ table, theme }) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const rows = table.rows || [];
  const headerCandidate = rows[0] || [];
  const hasHeader = rows.length > 1 && headerCandidate.some(cell => {
    const trimmed = String(cell || '').trim();
    return trimmed.length > 0 && !/^\d+(?:\.\d+)?$/.test(trimmed);
  });
  const labels = hasHeader
    ? headerCandidate.map((cell, idx) => (String(cell || '').trim() || `Col ${idx + 1}`))
    : (headerCandidate.map((_cell, idx) => `Col ${idx + 1}`));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (isMobile) {
    return (
      <div style={{ display: 'grid', gap: '0.75rem', margin: '0.75rem 0' }}>
        {dataRows.map((row, rIdx) => (
          <div
            key={rIdx}
            style={{
              border: `1px solid ${theme?.border || '#ddd'}`,
              borderRadius: '10px',
              padding: '0.75rem',
              background: theme?.surface || '#fff'
            }}
          >
            {row.map((cell, cIdx) => (
              <div
                key={cIdx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.25rem 0',
                  borderBottom: cIdx === row.length - 1 ? 'none' : `1px dashed ${theme?.border || '#eee'}`,
                  fontSize: '0.9em'
                }}
              >
                <span style={{ opacity: 0.7, fontWeight: 600 }}>
                  {labels[cIdx] || `Col ${cIdx + 1}`}
                </span>
                <span style={{ textAlign: 'right' }}>{cell}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto', margin: '0.75rem 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '100%' }}>
        {hasHeader && (
          <thead>
            <tr>
              {labels.map((label, idx) => (
                <th
                  key={idx}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${theme?.border || '#ddd'}`,
                    padding: '6px 8px',
                    fontSize: '0.9em',
                    background: theme?.surfaceVariant || '#f9fafb'
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={{ border: `1px solid ${theme?.border || '#ddd'}`, padding: '6px 8px', fontSize: '0.9em' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
