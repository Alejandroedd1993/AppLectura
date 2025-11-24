import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RubricProgressPanel from '../../src/components/analisis/RubricProgressPanel';

jest.mock('src/services/xlsxExportService', () => ({
  __esModule: true,
  exportRubricProgressXLSX: jest.fn().mockResolvedValue(true)
}));

describe('RubricProgressPanel - XLSX export', () => {
  const rubric = {
    meta: { id: 'critical_literacy_v2', dimensionsOrder: ['d1'] },
    dimensions: [{ id: 'd1', label: 'Dim 1', criteria: [{ id: 'c1', label: 'Crit 1' }] }]
  };
  const feedbacks = { '0:d1:c1': { nivel: 'competente', ts: 1710000000000 } };

  beforeEach(async () => {
    const svc = await import('src/services/xlsxExportService');
    svc.exportRubricProgressXLSX.mockClear();
  });

  it('calls XLSX export service for full export and forwards sessionKey metadata', async () => {
    const svc = await import('src/services/xlsxExportService');
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} sessionKey="sess-full-123" />);
    fireEvent.click(screen.getByTestId('export-rubric-progress-xlsx'));
    await waitFor(() => expect(svc.exportRubricProgressXLSX).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ sessionKey: 'sess-full-123' })
    })));
  });

  it('calls XLSX export service for selected dimension export and forwards sessionKey metadata', async () => {
    const svc = await import('src/services/xlsxExportService');
    render(<RubricProgressPanel rubric={rubric} criterionFeedbacks={feedbacks} theme={{}} selectedDimensionId="d1" sessionKey="sess-dim-456" />);
    fireEvent.click(screen.getByTestId('export-rubric-progress-xlsx-dim'));
    await waitFor(() => expect(svc.exportRubricProgressXLSX).toHaveBeenCalledWith(expect.objectContaining({
      onlyDimensionId: 'd1',
      metadata: expect.objectContaining({ sessionKey: 'sess-dim-456' })
    })));
  });
});
