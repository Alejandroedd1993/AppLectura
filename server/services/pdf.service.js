
// Importar la implementación directa para evitar el modo debug de pdf-parse (index.js)
// que intenta leer un archivo de test cuando se carga desde ESM y rompe en producción.
import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * Servicio para el procesamiento de archivos PDF en el backend.
 * Se encarga de extraer texto de un buffer de PDF.
 */
class PdfService {
  /**
   * Extrae texto de un buffer de archivo PDF.
   * @param {Buffer} pdfBuffer - El buffer del archivo PDF.
   * @returns {Promise<string>} El texto extraído del PDF.
   * @throws {Error} Si ocurre un error durante la extracción del PDF.
   */
  static async extractTextFromPdf(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer, {
        // Opciones para mejor extracción de texto
        max: 0, // Sin límite de páginas
        version: 'v2.0.550' // Versión estable
      });
      
      let text = data.text || '';
      
      // Limpiar texto corrupto o mal formateado
      text = text
        .replace(/\0/g, '') // Remover caracteres nulos
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remover caracteres de control
        .replace(/�/g, '') // Remover caracteres de reemplazo
        .trim();
      
      // Si el texto está vacío o tiene caracteres extraños, intentar normalización
      if (!text || text.length < 50) {
        console.warn('⚠️ Texto extraído muy corto o vacío, puede requerir OCR');
      }
      
      // Normalizar espacios y saltos de línea
      text = text
        .replace(/\r\n/g, '\n') // Normalizar saltos Windows
        .replace(/\r/g, '\n') // Normalizar saltos Mac
        .replace(/[ \t]+/g, ' ') // Normalizar espacios
        .replace(/\n{3,}/g, '\n\n'); // Máximo 2 saltos consecutivos
      
      console.log(`✅ Texto extraído: ${text.length} caracteres`);
      return text;
    } catch (error) {
      console.error('Error al extraer texto del PDF en el backend:', error);
      throw new Error('No se pudo procesar el PDF. Asegúrate de que sea un archivo PDF válido y no esté corrupto o protegido.');
    }
  }
}

export default PdfService;
