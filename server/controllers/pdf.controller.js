
import PdfService from '../services/pdf.service.js';
import OCRService, { ocrPdfBuffer } from '../services/ocr.service.js';
import TableDetectService, { detectTablesAndThumbnails } from '../services/tableDetect.service.js';
import { sendError } from '../utils/responseHelpers.js';
import { sendValidationError } from '../utils/validationError.js';

/**
 * Controlador para manejar la subida y procesamiento de archivos PDF.
 * @param {import('express').Request} req - El objeto de solicitud de Express.
 * @param {import('express').Response} res - El objeto de respuesta de Express.
 */
export async function processPdfUpload(req, res) {
  if (!req.file) {
    return sendValidationError(res, {
      error: 'No se ha subido ningun archivo PDF.',
      mensaje: 'Debes adjuntar un archivo PDF antes de procesarlo.',
      codigo: 'MISSING_PDF_FILE'
    });
  }

  const pdfBuffer = req.file.buffer;

  try {
    // 1) Intento rápido: pdf-parse
    const extractedText = await PdfService.extractTextFromPdf(pdfBuffer);

    // Si el texto es escaso, intentar OCR como mejora
    if (!extractedText || extractedText.trim().length < 300) {
      try {
        const ocr = await ocrPdfBuffer(pdfBuffer, { lang: 'spa', maxPages: 3 });
        if (ocr?.text && ocr.text.trim().length > (extractedText?.trim().length || 0)) {
          return res.json({ text: ocr.text, meta: { ocr: true, confidence: ocr.confidence, pagesProcessed: ocr.pagesProcessed, totalPages: ocr.totalPages } });
        }
      } catch (ocrErr) {
        console.warn('OCR no disponible o falló, devolviendo texto de pdf-parse:', ocrErr.message);
      }
    }

    res.json({ text: extractedText, meta: { ocr: false } });
  } catch (error) {
    console.error('Error en el controlador de procesamiento de PDF:', error);
    return sendError(res, 500, {
      error: 'Error interno del servidor al procesar el PDF.',
      mensaje: 'No se pudo procesar el archivo PDF en este momento.',
      codigo: 'PDF_PROCESSING_ERROR'
    });
  }
}

/**
 * Detecta tablas y genera miniaturas desde un PDF.
 */
export async function detectPdfTables(req, res) {
  if (!req.file) {
    return sendValidationError(res, {
      error: 'No se ha subido ningun archivo PDF.',
      mensaje: 'Debes adjuntar un archivo PDF antes de detectar tablas.',
      codigo: 'MISSING_PDF_FILE'
    });
  }
  const pdfBuffer = req.file.buffer;
  try {
    const data = await detectTablesAndThumbnails(pdfBuffer, { maxPages: 5, scale: 1.8 });
    res.json(data);
  } catch (error) {
    console.error('Error en detección de tablas:', error);
    return sendError(res, 500, {
      error: 'No se pudo detectar tablas.',
      mensaje: 'La deteccion de tablas del PDF no pudo completarse.',
      codigo: 'PDF_TABLE_DETECTION_ERROR'
    });
  }
}
