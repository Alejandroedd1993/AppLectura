import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalisisTexto from '../../../src/components/AnalisisTexto';

describe('AnalisisTexto', () => {
  describe('Renderizado inicial', () => {
    test('debe renderizar el componente mock correctamente', () => {
      render(<AnalisisTexto />);
      expect(screen.getByTestId('mock-analisis')).toBeInTheDocument();
      expect(screen.getByText('Análisis Texto Mock')).toBeInTheDocument();
    });
  });
});