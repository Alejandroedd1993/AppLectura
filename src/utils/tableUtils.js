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
  return (
    <div style={{ overflowX: 'auto', margin: '0.75rem 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '100%' }}>
        <tbody>
          {table.rows.map((row, rIdx) => (
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
