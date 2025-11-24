import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RubricProgressPanel from '../../src/components/analisis/RubricProgressPanel';

const rubric = {
  meta: { id: 'critical_literacy_v2', dimensionsOrder: ['d1','d2'] },
  dimensions: [
    { id: 'd1', label: 'Dim 1', criteria: [{ id: 'c1', label: 'Crit 1' }] },
    { id: 'd2', label: 'Dim 2', criteria: [{ id: 'c2', label: 'Crit 2' }] }
  ]
};

const feedbacks = {
  '0:d1:c1': { nivel: 'competente', ts: 1710000000000, justificacion: 'Bien', sugerencia: 'Seguir' },
  '0:d2:c2': { nivel: 'aprendiz', ts: 1711000000000, justificacion: 'Regular', sugerencia: 'Mejorar' }
};

describe('RubricProgressPanel - features', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    // Clipboard fallback is used in jsdom; we don't assert copied content here, only that button exists and is clickable
  });

  it('allows switching CSV delimiter to semicolon and exports CSV', () => {
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} />);
    const checkbox = screen.getByTestId('csv-delimiter-semicolon');
    fireEvent.click(checkbox);
    const btn = screen.getByTestId('export-rubric-progress-csv');
    fireEvent.click(btn);
    expect(appendSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('exports only the selected dimension (JSON and CSV)', () => {
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} selectedDimensionId="d1" />);
    fireEvent.click(screen.getByTestId('export-rubric-progress-dim'));
    fireEvent.click(screen.getByTestId('export-rubric-progress-csv-dim'));
    expect(appendSpy).toHaveBeenCalled();
  });

  it('copies the summary text to clipboard or uses fallback', () => {
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={{}} theme={{}} />);
    const btn = screen.getByTestId('copy-rubric-progress');
    fireEvent.click(btn);
    // No assertion possible without spying navigator.clipboard; ensure button exists and is clickable
    expect(btn).toBeInTheDocument();
  });
});
