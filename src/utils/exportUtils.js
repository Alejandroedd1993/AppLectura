/**
 * @file Módulo con utilidades para exportar datos en PDF.
 * @module exportUtils
 * @version 2.0.0
 */

/**
 * Compatibilidad: redirige a exportación PDF.
 */
export const exportarResultados = (analisis, metadata = {}) => {
  exportarResultadosPDF(analisis, metadata);
  return { success: true, message: 'Exportación PDF iniciada.' };
};

/**
 * Helper genérico para exportar cualquier dato estructurado como PDF.
 *
 * @param {object} config
 * @param {string} config.title - Título principal del PDF.
 * @param {Array}  config.sections - Array de secciones: { heading?, text?, keyValues?, list?, table? }
 * @param {string} [config.fileName='export.pdf'] - Nombre del archivo.
 * @returns {Promise<{success: boolean, error?: string}>}
 *
 * Ejemplo de sección:
 *   { heading: 'Datos', keyValues: { Nombre: 'Ana', Puntaje: 8 } }
 *   { heading: 'Resumen', text: 'Lorem ipsum...' }
 *   { list: ['Elemento 1', 'Elemento 2'] }
 *   { table: { headers: ['Col1','Col2'], rows: [['a','b'],['c','d']] } }
 */
export const exportGenericPDF = async ({ title, sections = [], fileName = 'export.pdf' }) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const addPageIfNeeded = (needed = 8) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const writeLine = (text, opts = {}) => {
      const { bold = false, size = 10, indent = 0 } = opts;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const maxW = contentWidth - indent;
      const lines = doc.splitTextToSize(String(text ?? ''), maxW);
      lines.forEach((line) => {
        addPageIfNeeded(size * 0.5 + 1);
        doc.text(line, margin + indent, y);
        y += size * 0.45 + 0.5;
      });
    };

    // Título
    writeLine(title, { bold: true, size: 16 });
    y += 2;
    writeLine(`Fecha: ${new Date().toLocaleString('es-ES')}`, { size: 9 });
    y += 4;

    for (const sec of sections) {
      if (sec.heading) {
        y += 2;
        writeLine(sec.heading, { bold: true, size: 12 });
        y += 1;
      }

      if (sec.text) {
        writeLine(sec.text);
        y += 2;
      }

      if (sec.keyValues && typeof sec.keyValues === 'object') {
        Object.entries(sec.keyValues).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') return;
          let printable = value;
          if (Array.isArray(value)) printable = value.filter(Boolean).join(', ');
          else if (typeof value === 'object') printable = JSON.stringify(value);
          writeLine(`${key}: ${printable}`, { indent: 2 });
        });
        y += 2;
      }

      if (sec.list && Array.isArray(sec.list)) {
        sec.list.forEach((item, idx) => {
          writeLine(`${idx + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`, { indent: 4 });
        });
        y += 2;
      }

      if (sec.table) {
        const { headers = [], rows = [] } = sec.table;
        const colW = contentWidth / Math.max(headers.length, 1);
        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        addPageIfNeeded(8);
        headers.forEach((h, i) => {
          doc.text(String(h).slice(0, 30), margin + i * colW, y);
        });
        y += 5;
        // Rows
        doc.setFont('helvetica', 'normal');
        rows.forEach((row) => {
          addPageIfNeeded(6);
          row.forEach((cell, i) => {
            doc.text(String(cell ?? '').slice(0, 35), margin + i * colW, y);
          });
          y += 4.5;
        });
        y += 3;
      }
    }

    doc.save(fileName);
    return { success: true };
  } catch (error) {
    console.error('Error generando PDF:', error);
    return { success: false, error: error.message };
  }
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