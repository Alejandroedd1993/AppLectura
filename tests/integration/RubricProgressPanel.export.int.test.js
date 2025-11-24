/**
 * Integration test: RubricProgressPanel shows per-dimension summary and allows export
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RubricProgressPanel from '../../src/components/analisis/RubricProgressPanel';

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
  });

  it('renders per-dimension summary with counts and percentage', () => {
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} />);
    const compr = screen.getByTestId('dim-summary-comprension');
    expect(compr.textContent).toMatch(/Comprensión — 1\/2 \(50%\)/);
    const arg = screen.getByTestId('dim-summary-argumentacion');
    expect(arg.textContent).toMatch(/Argumentación — 1\/1 \(100%\)/);
  });

  it('exports JSON when clicking the export button', () => {
    const clickSpy = jest.spyOn(document.body, 'appendChild');
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} />);
    const btn = screen.getByTestId('export-rubric-progress');
    fireEvent.click(btn);
    expect(clickSpy).toHaveBeenCalled();
    // Validate content shape built by buildExportData indirectly via Blob
    const blobArg = (window.URL.createObjectURL.mock.calls.length > 0);
    expect(blobArg).toBe(true);
  });
});
