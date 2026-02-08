/**
 * Integration test: RubricProgressPanel shows per-dimension summary and allows export
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RubricProgressPanel from '../../src/components/analisis/RubricProgressPanel';

const mockDoc = {
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297,
    }
  },
  addPage: () => {},
  setDrawColor: () => {},
  setLineWidth: () => {},
  line: () => {},
  setFont: () => {},
  setFontSize: () => {},
  setTextColor: () => {},
  text: () => {},
  splitTextToSize: (txt) => [String(txt)],
  getTextWidth: () => 40,
  save: () => {},
};

function mockJsPDF() {
  return mockDoc;
}

jest.mock('jspdf', () => ({ jsPDF: mockJsPDF }));

const rubric = {
  meta: { id: 'critical_literacy_v2', dimensionsOrder: ['comprension', 'argumentacion'] },
  dimensions: [
    {
      id: 'comprension',
      label: 'Comprensión',
      criteria: [
        { id: 'identificacion', label: 'Identificación de ideas' },
        { id: 'inferencias', label: 'Inferencias' }
      ]
    },
    {
      id: 'argumentacion',
      label: 'Argumentación',
      criteria: [
        { id: 'evidencia', label: 'Uso de evidencias' }
      ]
    }
  ]
};

const feedbacks = {
  '0:comprension:identificacion': { nivel: 'competente', ts: 1710000000000, justificacion: 'Ok', sugerencia: 'Profundiza' },
  '0:argumentacion:evidencia': { nivel: 'experto', ts: 1711000000000, justificacion: 'Excelente', sugerencia: 'Mantener' }
};

describe('RubricProgressPanel - summary and export', () => {
  beforeEach(() => {
    // Mock createObjectURL to avoid jsdom errors
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    // Con resetMocks=true, reinstanciamos el spy por test
    mockDoc.save = jest.fn();
  });

  it('renders per-dimension summary with counts and percentage', () => {
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} />);
    const compr = screen.getByTestId('dim-summary-comprension');
    expect(compr.textContent).toMatch(/Comprensión — 1\/2 \(50%\)/);
    const arg = screen.getByTestId('dim-summary-argumentacion');
    expect(arg.textContent).toMatch(/Argumentación — 1\/1 \(100%\)/);
  });

  it('exports PDF when clicking the export button', async () => {
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} />);
    const btn = screen.getByTestId('export-rubric-progress');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
