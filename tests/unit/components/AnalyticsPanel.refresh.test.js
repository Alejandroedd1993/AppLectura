import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import AnalyticsPanel from '../../../src/components/evaluacion/AnalyticsPanel';
import { AppContext } from '../../../src/context/AppContext';
import { buildProgressSnapshot } from '../../../src/services/progressSnapshot';
import { lightTheme } from '../../../src/styles/theme';
import { getAllSessionsMerged } from '../../../src/services/sessionManager';

jest.mock('../../../src/services/sessionManager', () => ({
  getAllSessionsMerged: jest.fn().mockResolvedValue([])
}));

describe('AnalyticsPanel session refresh', () => {
  beforeEach(() => {
    getAllSessionsMerged.mockClear();
  });

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

  test('aclara cuando hay nota legacy sin historial real de intentos', async () => {
    const rubricProgress = {
      rubrica3: {
        average: 6.5,
        artefactos: ['MapaActores']
      }
    };
    const progressSnapshot = buildProgressSnapshot({
      lectureId: 'lectura-legacy',
      rubricProgress,
      activitiesProgress: {}
    });

    render(
      <ThemeProvider theme={lightTheme}>
        <AppContext.Provider value={{ currentTextoId: 'lectura-legacy', sourceCourseId: 'curso-1' }}>
          <AnalyticsPanel
            rubricProgress={rubricProgress}
            progressSnapshot={progressSnapshot}
            theme={lightTheme}
          />
        </AppContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getAllByText(/nota legacy sin historial detallado/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(getAllSessionsMerged).toHaveBeenCalled();
    });
  });
});
