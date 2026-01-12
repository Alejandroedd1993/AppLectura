import React from 'react';
import { render, screen } from '@testing-library/react';
import ReadingWorkspace from '../../src/components/ReadingWorkspace';
import { AppContext } from '../../src/context/AppContext';
import { AuthProvider } from '../../src/context/AuthContext';
import fetchMock from 'jest-fetch-mock';

function Wrapper({ children, texto }) {
  const value = { texto, setTexto: () => {} };
  return (
    <AuthProvider>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </AuthProvider>
  );
}

beforeEach(() => {
  fetchMock.mockResponse(JSON.stringify({ configuracion: {} }));
});

describe('ReadingWorkspace métricas', () => {
  test('muestra palabras, caracteres y tiempo estimado', () => {
    const texto = 'Uno dos tres cuatro cinco seis siete ocho nueve diez once doce.'; // 12 palabras
    render(<ReadingWorkspace followUps={false} />, { wrapper: ({ children }) => <Wrapper texto={texto}>{children}</Wrapper> });
    const stats = screen.getByTestId('rw-stats');
    expect(stats.textContent).toMatch(/12 palabras/);
    expect(stats.textContent).toMatch(/caracteres/);
    expect(stats.textContent).toMatch(/min/);
  });
});
