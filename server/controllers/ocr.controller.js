import { ocrImageBuffer } from '../services/ocr.service.js';
import { sendError } from '../utils/responseHelpers.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function ocrImageUpload(req, res) {
  try {
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
