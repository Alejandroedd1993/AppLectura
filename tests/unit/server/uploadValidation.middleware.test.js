import multer from 'multer';
import {
  handleSingleFileUploadError,
  requireUploadedFile
} from '../../../server/middleware/uploadValidation.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const pdfConfig = {
  fieldName: 'pdfFile',
  maxBytes: 20 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf'],
  tooLargeCode: 'PDF_TOO_LARGE',
  tooLargeError: 'PDF demasiado grande',
  tooLargeMessage: 'El PDF supera el limite.',
  unsupportedCode: 'UNSUPPORTED_PDF_TYPE',
  unsupportedError: 'Formato de archivo no soportado.',
  unsupportedMessage: 'El tipo de archivo enviado no es compatible con procesamiento PDF.',
  uploadCode: 'PDF_UPLOAD_ERROR',
  uploadError: 'Error procesando upload de PDF',
  uploadMessage: 'No se pudo procesar la subida del archivo PDF.'
};

describe('uploadValidation middleware helpers', () => {
  test('handleSingleFileUploadError responde 413 para LIMIT_FILE_SIZE', () => {
    const res = makeRes();

    handleSingleFileUploadError(res, new multer.MulterError('LIMIT_FILE_SIZE'), pdfConfig);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'PDF_TOO_LARGE',
      field: 'pdfFile'
    }));
  });

  test('handleSingleFileUploadError responde 415 para media type no soportado', () => {
    const res = makeRes();
    const err = new Error('bad');
    err.code = 'UNSUPPORTED_MEDIA_TYPE';

    handleSingleFileUploadError(res, err, pdfConfig);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'UNSUPPORTED_PDF_TYPE',
      field: 'pdfFile'
    }));
  });

  test('requireUploadedFile responde 400 cuando falta req.file', () => {
    const middleware = requireUploadedFile({
      fieldName: 'image',
      missingCode: 'MISSING_OCR_IMAGE',
      missingError: 'No se recibio imagen.',
      missingMessage: 'Debes adjuntar una imagen antes de ejecutar OCR.'
    });
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'MISSING_OCR_IMAGE',
      field: 'image'
    }));
  });
});