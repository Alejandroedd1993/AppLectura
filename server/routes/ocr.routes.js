import { Router } from 'express';
import { ocrImageUpload } from '../controllers/ocr.controller.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import {
  createSingleFileUploadMiddleware,
  requireUploadedFile
} from '../middleware/uploadValidation.js';

const router = Router();
const DEFAULT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const imageMaxBytesRaw = Number(process.env.OCR_IMAGE_MAX_BYTES);
const imageMaxBytes = Number.isFinite(imageMaxBytesRaw) && imageMaxBytesRaw > 0
  ? Math.floor(imageMaxBytesRaw)
  : DEFAULT_IMAGE_MAX_BYTES;

const allowedImageMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/bmp'
]);

const uploadImageMiddleware = createSingleFileUploadMiddleware({
  fieldName: 'image',
  maxBytes: imageMaxBytes,
  allowedMimeTypes: Array.from(allowedImageMimeTypes),
  tooLargeCode: 'IMAGE_TOO_LARGE',
  tooLargeError: `La imagen excede el limite de ${Math.floor(imageMaxBytes / (1024 * 1024))} MB`,
  tooLargeMessage: `El archivo de imagen supera el tamaño maximo permitido de ${Math.floor(imageMaxBytes / (1024 * 1024))} MB.`,
  unsupportedCode: 'UNSUPPORTED_IMAGE_TYPE',
  unsupportedError: 'Formato de imagen no soportado.',
  unsupportedMessage: 'El tipo de archivo enviado no es compatible con OCR de imagen.',
  uploadCode: 'IMAGE_UPLOAD_ERROR',
  uploadError: 'Error procesando upload de imagen',
  uploadMessage: 'No se pudo procesar la subida de la imagen.'
});

const requireImageFile = requireUploadedFile({
  fieldName: 'image',
  missingCode: 'MISSING_OCR_IMAGE',
  missingError: 'No se recibio imagen.',
  missingMessage: 'Debes adjuntar una imagen antes de ejecutar OCR.'
});

router.post('/ocr-image', requireFirebaseAuth, uploadLimiter, uploadImageMiddleware, requireImageFile, ocrImageUpload);

export default router;
