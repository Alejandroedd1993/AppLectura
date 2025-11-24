import { ocrImageBuffer } from '../services/ocr.service.js';

export async function ocrImageUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió imagen.' });
    }
    const buffer = req.file.buffer;
    const result = await ocrImageBuffer(buffer, { lang: 'spa' });
    res.json({ text: result.text || '', confidence: result.confidence });
  } catch (err) {
    console.error('Error en OCR de imagen:', err);
    res.status(500).json({ error: err.message || 'Error realizando OCR.' });
  }
}
