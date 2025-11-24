/**
 * Servicio de OCR
 * - OCR de imágenes con tesseract.js (local, sin claves)
 * - OCR de PDF renderizando páginas con pdfjs-dist + canvas
 *
 * NOTA: Para OCR en PDF se requieren dependencias nativas (canvas) y pdfjs-dist en el backend.
 * Si faltan, el servicio lanza un error con una guía para instalarlas.
 */

import path from 'path';

// OCR de buffer de imagen (PNG/JPG)
export async function ocrImageBuffer(buffer, options = {}) {
  const { lang = 'spa', logger = null } = options;

  // Carga perezosa de tesseract.js
  let Tesseract;
  try {
    ({ default: Tesseract } = await import('tesseract.js'));
  } catch (err) {
    throw new Error('Dependencia faltante: tesseract.js. Instálala con: npm install tesseract.js');
  }

  const result = await Tesseract.recognize(buffer, lang, { logger });
  const text = result?.data?.text || '';
  const confidence = typeof result?.data?.confidence === 'number' ? (result.data.confidence / 100) : undefined;

  return { text, confidence };
}

// OCR de PDF: rasteriza N páginas y corre OCR por página
export async function ocrPdfBuffer(pdfBuffer, options = {}) {
  const { lang = 'spa', maxPages = 3, scale = 2.0, logger = null } = options;

  // Importar pdfjs-dist (legacy para facilitar API estable) y canvas
  let pdfjsLib;
  let createCanvas;
  try {
    ({ default: pdfjsLib } = await import('pdfjs-dist/legacy/build/pdf.js'));
  } catch (e) {
    throw new Error('Dependencia faltante: pdfjs-dist. Instálala con: npm install pdfjs-dist');
  }
  try {
    ({ createCanvas } = await import('@napi-rs/canvas'));
  } catch (e) {
    throw new Error('Dependencia faltante: @napi-rs/canvas. Instálala con: npm install @napi-rs/canvas');
  }

  // En entorno Node no usamos worker
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pagesToProcess = Math.min(totalPages, Math.max(1, maxPages));

  let fullText = '';
  const confidences = [];

  for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    // Renderizar la página a canvas
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convertir a PNG buffer
    const imgBuffer = canvas.toBuffer('image/png');

    // Reconocer texto de la imagen
    const { text, confidence } = await ocrImageBuffer(imgBuffer, { lang, logger });
    if (text) {
      fullText += (fullText ? '\n\n' : '') + text.trim();
    }
    if (typeof confidence === 'number') confidences.push(confidence);
  }

  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : undefined;

  return { text: fullText, confidence: avgConfidence, pagesProcessed: pagesToProcess, totalPages };
}

export default { ocrImageBuffer, ocrPdfBuffer };
