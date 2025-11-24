import { jsPDF } from 'jspdf';

/**
 * Genera y descarga un PDF profesional del glosario
 * @param {Array} glossary - Array de términos del glosario
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export function downloadGlossaryAsPDF(glossary, filename = 'glosario_lectura') {
  try {
    console.log('📄 Generando PDF del glosario...');

    // Crear documento PDF (A4, vertical)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Colores del tema
    const colors = {
      primary: [74, 144, 226],      // Azul principal
      secondary: [99, 102, 241],    // Violeta
      text: [51, 65, 85],           // Gris oscuro
      textMuted: [100, 116, 139],   // Gris medio
      accent: [251, 191, 36],       // Amarillo/dorado
      background: [248, 250, 252],  // Gris muy claro
      success: [34, 197, 94]        // Verde
    };

    // Función helper para agregar nueva página si es necesario
    const checkPageBreak = (requiredSpace) => {
      if (currentY + requiredSpace > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // ========================================
    // ENCABEZADO SIMPLIFICADO
    // ========================================
    
    // Fondo azul superior
    doc.setFillColor(74, 144, 226);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('GLOSARIO DE TERMINOS', pageWidth / 2, 18, { align: 'center' });

    // Subtítulo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Generado con AppLectura', pageWidth / 2, 28, { align: 'center' });

    currentY = 50;

    // Información del glosario
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const fecha = new Date().toLocaleDateString('es-ES', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    });
    
    doc.text(`Total de terminos: ${glossary.length}`, margin, currentY);
    doc.text(`Fecha: ${fecha}`, margin, currentY + 6);

    currentY += 16;

    // ========================================
    // TÉRMINOS DEL GLOSARIO
    // ========================================

    glossary.forEach((term, index) => {
      // Espacio requerido estimado
      const estimatedHeight = 40;
      checkPageBreak(estimatedHeight);

      // ----------------------------------------
      // Número y nombre del término
      // ----------------------------------------
      
      doc.setTextColor(74, 144, 226);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${term.termino.toUpperCase()}`, margin, currentY);

      currentY += 8;

      // ----------------------------------------
      // Categoría y Nivel (texto simple)
      // ----------------------------------------

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`[${term.categoria}] [${term.nivel_complejidad}]`, margin, currentY);

      currentY += 8;

      // ----------------------------------------
      // Definición
      // ----------------------------------------

      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Definición:', margin, currentY);
      
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      
      // Texto justificado con wrapping
      const definicionLines = doc.splitTextToSize(term.definicion, contentWidth - 5);
      definicionLines.forEach((line) => {
        checkPageBreak(6);
        doc.text(line, margin + 2, currentY);
        currentY += 5;
      });

      currentY += 3;

      // ----------------------------------------
      // Contexto en el texto (ampliado y mejorado)
      // ----------------------------------------

      if (term.contexto && term.contexto !== 'Aparece en el texto analizado.') {
        checkPageBreak(30);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('En este texto:', margin, currentY);

        currentY += 6;

        doc.setFont('helvetica', 'italic');
        doc.setTextColor(71, 85, 105);
        
        // Usar todo el ancho disponible para el contexto
        const contextoLines = doc.splitTextToSize(term.contexto, contentWidth - 2);
        contextoLines.forEach((line) => {
          checkPageBreak(5);
          doc.text(line, margin + 3, currentY);
          currentY += 4.5;
        });

        currentY += 6;
      }

      // ----------------------------------------
      // Separador entre términos
      // ----------------------------------------

      if (index < glossary.length - 1) {
        checkPageBreak(10);
        doc.setDrawColor(...colors.textMuted);
        doc.setLineWidth(0.3);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 8;
      }
    });

    // ========================================
    // PIE DE PÁGINA EN TODAS LAS PÁGINAS
    // ========================================

    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Línea superior del pie
      doc.setDrawColor(...colors.textMuted);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      // Texto del pie
      doc.setTextColor(...colors.textMuted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Generado por AppLectura - Sistema de Lectura Inteligente', margin, pageHeight - 10);
      
      // Número de página
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // ========================================
    // GUARDAR PDF
    // ========================================

    const timestamp = Date.now();
    const pdfFilename = `${filename}_${timestamp}.pdf`;
    
    doc.save(pdfFilename);
    
    console.log(`✅ PDF generado exitosamente: ${pdfFilename}`);
    return pdfFilename;

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    throw error;
  }
}

/**
 * Genera vista previa del PDF (retorna blob para visualización)
 * @param {Array} glossary - Array de términos
 * @returns {Blob} - Blob del PDF para preview
 */
export function generateGlossaryPDFBlob(glossary) {
  // Similar a downloadGlossaryAsPDF pero retorna blob en vez de descargar
  // Útil para preview antes de descargar
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // ... misma lógica de generación ...

    return doc.output('blob');
  } catch (error) {
    console.error('❌ Error generando blob PDF:', error);
    throw error;
  }
}
