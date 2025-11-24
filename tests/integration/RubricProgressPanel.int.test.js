import React from 'react';
import { render, screen } from '@testing-library/react';
import RubricProgressPanel from '../../src/components/analisis/RubricProgressPanel';

const rubric = {
  meta: { dimensionsOrder: ['dim1'] },
  dimensions: [
    { id: 'dim1', label: 'Dimensión 1', criteria: [
      { id: 'c1', label: 'Criterio A' },
      { id: 'c2', label: 'Criterio B' },
    ]}
  ]
};

describe('RubricProgressPanel', () => {
  test('muestra niveles por criterio cuando hay feedback', () => {
    const criterionFeedbacks = {
      '0:dim1:c1': { nivel: 'aprendiz', ts: 1 },
      '1:dim1:c1': { nivel: 'competente', ts: 2 },
      '0:dim1:c2': { nivel: 'novato', ts: 5 }
    };
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={criterionFeedbacks} theme={{}} />);
    const panel = screen.getByTestId('rubric-progress');
    expect(panel).toBeInTheDocument();
  const dimHeader = screen.getByTestId('dim-summary-dim1');
  expect(dimHeader).toBeInTheDocument();
  expect(dimHeader.textContent).toMatch(/Dimensión 1/);
    expect(screen.getByText('Criterio A')).toBeInTheDocument();
    expect(screen.getByText('competente')).toBeInTheDocument();
    expect(screen.getByText('Criterio B')).toBeInTheDocument();
    expect(screen.getByText('novato')).toBeInTheDocument();
  });

  test('badge incluye title con fecha y justificación', () => {
    const ts = Date.now();
    const criterionFeedbacks = {
      '0:dim1:c1': { nivel: 'competente', ts, justificacion: 'Uso adecuado de fuentes', sugerencia: 'Profundiza en el análisis' }
    };
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={criterionFeedbacks} theme={{}} />);
    const badge = screen.getByText('competente');
    expect(badge).toHaveAttribute('title');
    expect(badge.getAttribute('title')).toMatch(/Justificación: Uso adecuado de fuentes/);
  });
});
