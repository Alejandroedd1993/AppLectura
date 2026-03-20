jest.mock('../../../src/utils/backendUtils', () => ({
  checkBackendAvailability: jest.fn(),
  processPdfWithBackend: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

import { procesarArchivo } from '../../../src/utils/fileProcessor';
import { checkBackendAvailability, processPdfWithBackend } from '../../../src/utils/backendUtils';

describe('fileProcessor PDF flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('procesarArchivo retorna texto real del backend para PDFs', async () => {
    const file = new File(['dummy'], 'demo.pdf', { type: 'application/pdf' });
    checkBackendAvailability.mockResolvedValue(true);
    processPdfWithBackend.mockResolvedValue('texto real del PDF');

    await expect(procesarArchivo(file)).resolves.toBe('texto real del PDF');
  });

  test('procesarArchivo falla con error claro si el PDF no puede extraerse', async () => {
    const file = new File(['dummy'], 'demo.pdf', { type: 'application/pdf' });
    checkBackendAvailability.mockResolvedValue(true);
    processPdfWithBackend.mockRejectedValue(new Error('401 Unauthorized'));

    await expect(procesarArchivo(file)).rejects.toThrow(
      'No se pudo extraer el texto del PDF. Verifica tu sesión e intenta de nuevo. Si el problema continúa, usa TXT/DOCX temporalmente.'
    );
  });
});