const mockOcrImageBuffer = jest.fn();

jest.mock('../../../server/services/ocr.service.js', () => ({
  __esModule: true,
  default: {},
  ocrImageBuffer: (...args) => mockOcrImageBuffer(...args)
}));

import { ocrImageUpload } from '../../../server/controllers/ocr.controller.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('ocr.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ocrImageUpload responde success envelope', async () => {
    mockOcrImageBuffer.mockResolvedValue({
      text: 'Texto OCR',
      confidence: 0.88
    });
    const req = { file: { buffer: Buffer.from('img') } };
    const res = makeRes();

    await ocrImageUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: {
        text: 'Texto OCR',
        confidence: 0.88
      }
    });
  });
});