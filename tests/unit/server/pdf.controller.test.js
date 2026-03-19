const mockExtractTextFromPdf = jest.fn();
const mockOcrPdfBuffer = jest.fn();
const mockDetectTablesAndThumbnails = jest.fn();

jest.mock('../../../server/services/pdf.service.js', () => ({
  __esModule: true,
  default: {
    extractTextFromPdf: (...args) => mockExtractTextFromPdf(...args)
  }
}));

jest.mock('../../../server/services/ocr.service.js', () => ({
  __esModule: true,
  default: {},
  ocrPdfBuffer: (...args) => mockOcrPdfBuffer(...args)
}));

jest.mock('../../../server/services/tableDetect.service.js', () => ({
  __esModule: true,
  default: {},
  detectTablesAndThumbnails: (...args) => mockDetectTablesAndThumbnails(...args)
}));

import { detectPdfTables, processPdfUpload } from '../../../server/controllers/pdf.controller.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('pdf.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('processPdfUpload responde success envelope con texto extraído', async () => {
    mockExtractTextFromPdf.mockResolvedValue('Texto suficientemente largo para evitar OCR. '.repeat(10));
    const req = { file: { buffer: Buffer.from('pdf') } };
    const res = makeRes();

    await processPdfUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: {
        text: expect.stringContaining('Texto suficientemente largo'),
        meta: { ocr: false }
      }
    });
  });

  test('processPdfUpload responde success envelope con mejora OCR', async () => {
    mockExtractTextFromPdf.mockResolvedValue('breve');
    mockOcrPdfBuffer.mockResolvedValue({
      text: 'Texto OCR mucho más largo y útil',
      confidence: 0.93,
      pagesProcessed: 2,
      totalPages: 3
    });
    const req = { file: { buffer: Buffer.from('pdf') } };
    const res = makeRes();

    await processPdfUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: {
        text: 'Texto OCR mucho más largo y útil',
        meta: {
          ocr: true,
          confidence: 0.93,
          pagesProcessed: 2,
          totalPages: 3
        }
      }
    });
  });

  test('detectPdfTables responde success envelope', async () => {
    mockDetectTablesAndThumbnails.mockResolvedValue({
      tables: [{ page: 1, index: 0 }],
      thumbnails: []
    });
    const req = { file: { buffer: Buffer.from('pdf') } };
    const res = makeRes();

    await detectPdfTables(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: {
        tables: [{ page: 1, index: 0 }],
        thumbnails: []
      }
    });
  });
});