
import { Router } from 'express';
import { processPdfUpload, detectPdfTables } from '../controllers/pdf.controller.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import {
  createSingleFileUploadMiddleware,
  requireUploadedFile
} from '../middleware/uploadValidation.js';

const router = Router();
const DEFAULT_PDF_MAX_BYTES = 20 * 1024 * 1024;
const pdfMaxBytesRaw = Number(process.env.PDF_UPLOAD_MAX_BYTES);
const pdfMaxBytes = Number.isFinite(pdfMaxBytesRaw) && pdfMaxBytesRaw > 0
  ? Math.floor(pdfMaxBytesRaw)
  : DEFAULT_PDF_MAX_BYTES;

const uploadPdfMiddleware = createSingleFileUploadMiddleware({
  fieldName: 'pdfFile',
  maxBytes: pdfMaxBytes,
  allowedMimeTypes: ['application/pdf'],
  tooLargeCode: 'PDF_TOO_LARGE',
  tooLargeError: `El archivo excede el limite de ${Math.floor(pdfMaxBytes / (1024 * 1024))} MB`,
  tooLargeMessage: `El archivo PDF supera el tamaño maximo permitido de ${Math.floor(pdfMaxBytes / (1024 * 1024))} MB.`,
  unsupportedCode: 'UNSUPPORTED_PDF_TYPE',
  unsupportedError: 'Formato de archivo no soportado.',
  unsupportedMessage: 'El tipo de archivo enviado no es compatible con procesamiento PDF.',
  uploadCode: 'PDF_UPLOAD_ERROR',
  uploadError: 'Error procesando upload de PDF',
  uploadMessage: 'No se pudo procesar la subida del archivo PDF.'
});

const requirePdfFile = requireUploadedFile({
  fieldName: 'pdfFile',
  missingCode: 'MISSING_PDF_FILE',
  missingError: 'No se ha subido ningun archivo PDF.',
  missingMessage: 'Debes adjuntar un archivo PDF antes de procesarlo.'
});

router.post('/process-pdf', requireFirebaseAuth, uploadLimiter, uploadPdfMiddleware, requirePdfFile, processPdfUpload);
router.post('/detect-tables', requireFirebaseAuth, uploadLimiter, uploadPdfMiddleware, requirePdfFile, detectPdfTables);

export default router;
