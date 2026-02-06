/**
 * @file Módulo con utilidades para exportar datos.
 * @module exportUtils
 * @version 1.2.0
 */

/**
 * Construye y exporta los resultados de un análisis a un archivo JSON.
 *
 * @param {object} analisis - El objeto principal del análisis.
 * @param {object} metadata - Metadatos adicionales para incluir en la exportación.
 * @returns {{success: boolean, message?: string, error?: string}} Un objeto indicando el resultado.
 */
export const exportarResultados = (analisis, metadata = {}) => {
  // Compatibilidad: redirige a exportación PDF
  exportarResultadosPDF(analisis, metadata);
  return { success: true, message: 'Exportación PDF iniciada.' };
};

/**
 * Construye y exporta los resultados de un análisis a un archivo PDF.
 *
 * @param {object} analisis - El objeto principal del análisis.
 * @param {object} metadata - Metadatos adicionales para incluir en la exportación.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>} Un objeto indicando el resultado.
 */
export const exportarResultadosPDF = async (analisis, metadata = {}) => {
  if (!analisis) {
    return { success: false, error: 'No hay datos de análisis para exportar.' };
  }

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    const addPageIfNeeded = (needed = 8) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addTitle = (text) => {
      addPageIfNeeded(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(text, margin, y);
      y += 8;
    };

    const addSubtitle = (text) => {
      addPageIfNeeded(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(text, margin, y);
      y += 6;
    };

    const addParagraph = (text) => {
      if (!text) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(String(text), pageWidth - margin * 2);
      lines.forEach((line) => {
        addPageIfNeeded(6);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 2;
    };

    const addKeyValues = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      Object.entries(obj).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        let printable = value;
        if (Array.isArray(value)) {
          printable = value.filter(Boolean).join(', ');
        } else if (typeof value === 'object') {
          printable = JSON.stringify(value);
        }
        addParagraph(`${key}: ${printable}`);
      });
    };

    const prelecture = analisis.prelecture || analisis;
    const { metadata: meta = {}, argumentation = {}, linguistics = {}, web_summary, web_sources } = prelecture || {};
    const acdData = analisis.critical?.contexto_critico || {};

    addTitle('Análisis Académico - Prelectura');
    addParagraph(`Fecha de exportación: ${new Date().toLocaleString('es-ES')}`);
    addParagraph(`Tipo: ${metadata.tipo || 'prelectura'}`);
    y += 2;

    addSubtitle('Fase I: Contextualización');
    addKeyValues(meta);

    addSubtitle('Fase II: Contenido y Argumentación');
    addKeyValues(argumentation);

    addSubtitle('Fase III: Análisis Formal y Lingüístico');
    addKeyValues(linguistics);

    if (acdData && Object.keys(acdData).length > 0) {
      addSubtitle('Fase IV: Análisis Ideológico-Discursivo (ACD)');
      addKeyValues(acdData);
    }

    if (web_summary || (web_sources && web_sources.length > 0)) {
      addSubtitle('Fuentes Web Consultadas');
      if (web_summary) {
        addParagraph(Array.isArray(web_summary) ? web_summary.filter(Boolean).join(' ') : web_summary);
      }
      if (Array.isArray(web_sources)) {
        web_sources.forEach((source, idx) => {
          addParagraph(`${idx + 1}. ${source.title || 'Fuente'}${source.url ? ` - ${source.url}` : ''}`);
        });
      }
    }

    const fileName = `analisis_prelectura_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    return { success: true, message: 'Exportación PDF iniciada.' };
  } catch (error) {
    console.error('Error al exportar análisis como PDF:', error);
    return { success: false, error: 'No se pudo generar el PDF.' };
  }
};