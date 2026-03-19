
import { Router } from 'express';
import multer from 'multer';
import { processPdfUpload, detectPdfTables } from '../controllers/pdf.controller.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { sendError } from '../utils/responseHelpers.js';

const router = Router();
const DEFAULT_PDF_MAX_BYTES = 20 * 1024 * 1024;
const pdfMaxBytesRaw = Number(process.env.PDF_UPLOAD_MAX_BYTES);
const pdfMaxBytes = Number.isFinite(pdfMaxBytesRaw) && pdfMaxBytesRaw > 0
  ? Math.floor(pdfMaxBytesRaw)
  : DEFAULT_PDF_MAX_BYTES;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: pdfMaxBytes,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      const err = new Error('Solo se permiten archivos PDF');
      err.code = 'UNSUPPORTED_MEDIA_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

const uploadPdfMiddleware = (req, res, next) => {
  upload.single('pdfFile')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 413, {
        error: `El archivo excede el limite de ${Math.floor(pdfMaxBytes / (1024 * 1024))} MB`,
        mensaje: `El archivo PDF supera el tamaño maximo permitido de ${Math.floor(pdfMaxBytes / (1024 * 1024))} MB.`,
        codigo: 'PDF_TOO_LARGE'
      });
    }

    if (err.code === 'UNSUPPORTED_MEDIA_TYPE') {
      return sendError(res, 415, {
        error: 'Formato de archivo no soportado.',
        mensaje: 'El tipo de archivo enviado no es compatible con procesamiento PDF.',
        codigo: 'UNSUPPORTED_PDF_TYPE'
      });
    }

    return sendError(res, 400, {
      error: 'Error procesando upload de PDF',
      mensaje: 'No se pudo procesar la subida del archivo PDF.',
      codigo: 'PDF_UPLOAD_ERROR'
    });
  });
};

router.post('/process-pdf', requireFirebaseAuth, uploadLimiter, uploadPdfMiddleware, processPdfUpload);
router.post('/detect-tables', requireFirebaseAuth, uploadLimiter, uploadPdfMiddleware, detectPdfTables);

export default router;
