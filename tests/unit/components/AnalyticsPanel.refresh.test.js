import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import AnalyticsPanel from '../../../src/components/evaluacion/AnalyticsPanel';
import { AppContext } from '../../../src/context/AppContext';
import { lightTheme } from '../../../src/styles/theme';
import { getAllSessionsMerged } from '../../../src/services/sessionManager';

jest.mock('../../../src/services/sessionManager', () => ({
  getAllSessionsMerged: jest.fn().mockResolvedValue([])
}));

describe('AnalyticsPanel session refresh', () => {
  test('recarga sesiones historicas cuando la app emite session-updated', async () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={{ currentTextoId: 'lectura-1', sourceCourseId: 'curso-1' }}>
          <AnalyticsPanel
            rubricProgress={{}}
            progressSnapshot={{ hasData: false }}
            theme={lightTheme}
          />
        </AppContext.Provider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getAllSessionsMerged).toHaveBeenCalledTimes(1);
    });

    window.dispatchEvent(new CustomEvent('session-updated'));

    await waitFor(() => {
      expect(getAllSessionsMerged).toHaveBeenCalledTimes(2);
    });
  });
});
