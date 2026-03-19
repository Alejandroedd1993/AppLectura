import { ocrImageBuffer } from '../services/ocr.service.js';
import { sendError } from '../utils/responseHelpers.js';
import { sendValidationError } from '../utils/validationError.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function ocrImageUpload(req, res) {
  try {
    if (!req.file) {
      return sendValidationError(res, {
        error: 'No se recibio imagen.',
        mensaje: 'Debes adjuntar una imagen antes de ejecutar OCR.',
        codigo: 'MISSING_OCR_IMAGE'
      });
    }
    const buffer = req.file.buffer;
    const result = await ocrImageBuffer(buffer, { lang: 'spa' });
    return sendSuccess(res, {
      text: result.text || '',
      confidence: result.confidence
    });
  } catch (err) {
    console.error('Error en OCR de imagen:', err);
    return sendError(res, 500, {
      error: 'Error realizando OCR.',
      mensaje: 'No se pudo procesar la imagen con OCR en este momento.',
      codigo: 'OCR_PROCESSING_ERROR'
    });
  }
}
