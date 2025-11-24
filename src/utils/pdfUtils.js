export async function generatePDF({ content, fileName = 'reporte.pdf', texto, analisis } = {}) {
  // Implementación mínima: generar un PDF simple usando Blob de texto; en real se puede usar pdf-lib/jsPDF
  let body = '';
  if (content) body = String(content);
  else if (analisis) {
    body = `Resultados del análisis\n\nResumen:\n${analisis.resumen || ''}\n\nTemas:\n${(analisis.temas || []).map(t => `- ${t}`).join('\n')}\n`;
  }
  if (texto) {
    body += `\nTexto analizado:\n${texto.slice(0, 1000)}...`;
  }
  const blob = new Blob([body || 'Reporte'], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

export default { generatePDF };