import { Router } from 'express';
import multer from 'multer';
import { ocrImageUpload } from '../controllers/ocr.controller.js';
import requireFirebaseAuth from '../middleware/firebaseAuth.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: imageMaxBytes,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      const err = new Error('Tipo de imagen no soportado para OCR');
      err.code = 'UNSUPPORTED_MEDIA_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

const uploadImageMiddleware = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `La imagen excede el limite de ${Math.floor(imageMaxBytes / (1024 * 1024))} MB`
      });
    }

    if (err.code === 'UNSUPPORTED_MEDIA_TYPE') {
      return res.status(415).json({ error: err.message });
    }

    return res.status(400).json({ error: 'Error procesando upload de imagen', details: err.message });
  });
};

router.post('/ocr-image', requireFirebaseAuth, uploadLimiter, uploadImageMiddleware, ocrImageUpload);

export default router;
