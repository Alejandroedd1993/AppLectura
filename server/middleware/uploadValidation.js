import multer from 'multer';
import { sendError } from '../utils/responseHelpers.js';
import { sendValidationError } from '../utils/validationError.js';

function formatMaxMb(maxBytes) {
  return Math.floor(maxBytes / (1024 * 1024));
}

export function handleSingleFileUploadError(res, err, config) {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 413, {
      error: config.tooLargeError || `El archivo excede el limite de ${formatMaxMb(config.maxBytes)} MB`,
      mensaje: config.tooLargeMessage || `El archivo supera el tamaño maximo permitido de ${formatMaxMb(config.maxBytes)} MB.`,
      codigo: config.tooLargeCode,
      field: config.fieldName,
      details: {
        maxBytes: config.maxBytes,
        field: config.fieldName
      }
    });
  }

  if (err?.code === 'UNSUPPORTED_MEDIA_TYPE') {
    return sendError(res, 415, {
      error: config.unsupportedError,
      mensaje: config.unsupportedMessage,
      codigo: config.unsupportedCode,
      field: config.fieldName,
      details: {
        allowedMimeTypes: config.allowedMimeTypes,
        field: config.fieldName
      }
    });
  }

  return sendError(res, 400, {
    error: config.uploadError,
    mensaje: config.uploadMessage,
    codigo: config.uploadCode,
    field: config.fieldName
  });
}

export function createSingleFileUploadMiddleware(config) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxBytes,
      files: 1
    },
    fileFilter: (req, file, cb) => {
      if (!config.allowedMimeTypes.includes(file.mimetype)) {
        const error = new Error(config.unsupportedError);
        error.code = 'UNSUPPORTED_MEDIA_TYPE';
        return cb(error);
      }
      return cb(null, true);
    }
  });

  return (req, res, next) => {
    upload.single(config.fieldName)(req, res, (err) => {
      if (!err) return next();
      return handleSingleFileUploadError(res, err, config);
    });
  };
}

export function requireUploadedFile(config) {
  return (req, res, next) => {
    if (req.file) return next();

    return sendValidationError(res, {
      error: config.missingError,
      mensaje: config.missingMessage,
      codigo: config.missingCode,
      field: config.fieldName
    });
  };
}

export default {
  createSingleFileUploadMiddleware,
  handleSingleFileUploadError,
  requireUploadedFile
};