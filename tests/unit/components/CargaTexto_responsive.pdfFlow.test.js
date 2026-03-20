import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import CargaTexto from '../../../src/components/CargaTexto_responsive';
import { AppContext } from '../../../src/context/AppContext';
import { lightTheme } from '../../../src/styles/theme';

const mockProcessPdfWithBackend = jest.fn();
const mockUploadSessionPdfFile = jest.fn();
const mockAnalyzeDocument = jest.fn();
const mockSwitchLecture = jest.fn();
const mockSetArchivoActual = jest.fn();
const mockSetError = jest.fn();
const mockSetLoading = jest.fn();

jest.mock('framer-motion', () => {
  const React = require('react');
  const stripMotionProps = ({ whileHover, whileTap, animate, initial, exit, transition, ...props }) => props;
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }, ref) => <div ref={ref} {...stripMotionProps(props)}>{children}</div>),
      button: React.forwardRef(({ children, ...props }, ref) => <button ref={ref} {...stripMotionProps(props)}>{children}</button>)
    },
    AnimatePresence: ({ children }) => <>{children}</>
  };
});

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    isDocente: false
  })
}));

jest.mock('../../../src/utils/backendUtils', () => ({
  processPdfWithBackend: (...args) => mockProcessPdfWithBackend(...args)
}));

jest.mock('../../../src/firebase/firestore', () => ({
  uploadSessionPdfFile: (...args) => mockUploadSessionPdfFile(...args)
}));

jest.mock('../../../src/utils/checkUnsaveDrafts', () => ({
  checkUnsaveDrafts: () => ({ hasDrafts: false }),
  getWarningMessage: () => 'warning'
}));

jest.mock('../../../src/utils/netUtils', () => ({
  hashText: (value) => `hash_${String(value || '').length}`
}));

jest.mock('../../../src/utils/runtimeEnv', () => ({
  isNonProductionEnvironment: true,
  isDevelopmentEnvironment: true
}));

jest.mock('../../../src/components/AlertMessage', () => ({
  __esModule: true,
  default: ({ message }) => <div>{message}</div>
}));

jest.mock('../../../src/components/common/SessionsHistory', () => ({
  __esModule: true,
  default: () => <div data-testid="sessions-history" />
}));

function createPdfFile() {
  return new File(['fake pdf bytes'], 'lectura.pdf', { type: 'application/pdf' });
}

function renderComponent(overrides = {}) {
  const contextValue = {
    setTexto: jest.fn(),
    texto: '',
    loading: false,
    setLoading: mockSetLoading,
    error: '',
    setError: mockSetError,
    modoOscuro: false,
    archivoActual: null,
    setArchivoActual: mockSetArchivoActual,
    setTextStructure: jest.fn(),
    analyzeDocument: mockAnalyzeDocument,
    setCompleteAnalysis: jest.fn(),
    createSession: jest.fn(),
    currentTextoId: 'texto-previo',
    rubricProgress: {},
    activitiesProgress: {},
    switchLecture: mockSwitchLecture,
    currentUser: { uid: 'user-123' },
    sourceCourseId: null,
    ...overrides
  };

  return render(
    <ThemeProvider theme={lightTheme}>
      <AppContext.Provider value={contextValue}>
        <CargaTexto />
      </AppContext.Provider>
    </ThemeProvider>
  );
}

describe('CargaTexto_responsive - flujo PDF autenticado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessPdfWithBackend.mockResolvedValue('Texto real del PDF para analizar');
    mockUploadSessionPdfFile.mockResolvedValue('https://storage.test/lectura.pdf');
    mockAnalyzeDocument.mockResolvedValue(undefined);
    mockSwitchLecture.mockReturnValue(undefined);
    window.confirm = jest.fn(() => true);
    global.URL.createObjectURL = jest.fn(() => 'blob:pdf');
    global.URL.revokeObjectURL = jest.fn();
  });

  test('procesa PDF, muestra telemetría de desarrollo y dispara el análisis con el texto extraído', async () => {
    const { container } = renderComponent();

    const input = container.querySelector('input[type="file"]');
    const pdfFile = createPdfFile();

    fireEvent.change(input, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(mockProcessPdfWithBackend).toHaveBeenCalledWith(pdfFile);
    });

    expect((await screen.findAllByText(/lectura.pdf/i)).length).toBeGreaterThan(0);
    const diagnosticsPanel = screen.getByTestId('pdf-extraction-diagnostics');
    expect(diagnosticsPanel).toBeInTheDocument();
    expect(within(diagnosticsPanel).getByText('pdf-backend')).toBeInTheDocument();
    expect(within(diagnosticsPanel).getByText(/Placeholder sospechoso:/i)).toBeInTheDocument();
    expect(within(diagnosticsPanel).getByText('no')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /analizar contenido/i }));

    await waitFor(() => {
      expect(mockAnalyzeDocument).toHaveBeenCalledTimes(1);
    });

    expect(mockAnalyzeDocument).toHaveBeenCalledWith(
      'Texto real del PDF para analizar',
      expect.stringMatching(/^texto_hash_\d+_\d+$/)
    );
    expect(mockSwitchLecture).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Texto real del PDF para analizar',
      fileName: 'lectura.pdf',
      fileType: 'application/pdf',
      fileURL: 'https://storage.test/lectura.pdf'
    }));
    expect(mockUploadSessionPdfFile).toHaveBeenCalledWith(expect.objectContaining({
      file: pdfFile,
      userId: 'user-123'
    }));
    expect(mockSetArchivoActual).toHaveBeenCalledWith(expect.objectContaining({
      name: 'lectura.pdf',
      type: 'application/pdf',
      fileURL: 'https://storage.test/lectura.pdf',
      objectUrl: 'blob:pdf'
    }));
  });
});