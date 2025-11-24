import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RubricProgressPanel from '../../src/components/analisis/RubricProgressPanel';

const rubric = {
  meta: { id: 'critical_literacy_v2', dimensionsOrder: ['d1'] },
  dimensions: [
    {
      id: 'd1',
      label: 'Dim 1',
      criteria: [
        { id: 'c1', label: 'Crit 1' },
        { id: 'c2', label: 'Crit 2' }
      ]
    }
  ]
};

const feedbacks = {
  '0:d1:c1': { nivel: 'competente', ts: 1710000000000, justificacion: 'Bien', sugerencia: 'Seguir' }
};

describe('RubricProgressPanel - export CSV', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('exports CSV when clicking the CSV export button', () => {
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} />);
    const btn = screen.getByTestId('export-rubric-progress-csv');
    fireEvent.click(btn);
    expect(appendSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
