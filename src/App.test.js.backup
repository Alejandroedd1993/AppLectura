import React from 'react';
import { screen } from '@testing-library/react';
import { renderAsync } from '../tests/helpers/renderAsync';
import App from './App';

// Smoke test básico para asegurar que la aplicación monta sin crashear
jest.mock('./components/AnalisisTexto', () => () => <div data-testid="mock-analisis">Analisis Mock</div>);
jest.mock('./components/NotasEstudio', () => () => <div data-testid="mock-notas">Notas Mock</div>);
jest.mock('./components/LecturaInteractiva', () => () => <div data-testid="mock-lectura-int">Lectura Interactiva Mock</div>);
jest.mock('./VisorTexto', () => () => <div data-testid="mock-visor">Visor Mock</div>);
jest.mock('./components/SistemaEvaluacion', () => () => <div data-testid="mock-evaluacion">Evaluación Mock</div>);

test('renderiza el encabezado principal', async () => {
	await renderAsync(<App />);
	// El header debería mostrarse (no estamos en focusMode por defecto)
	const heading = await screen.findByText(/Asistente de Lectura y Comprensión con IA/i);
	expect(heading).toBeInTheDocument();
});

// Verifica que la pestaña por defecto ahora es Lectura Guiada
test('muestra la pestaña Lectura Guiada inicialmente', async () => {
	await renderAsync(<App />);
	const tab = await screen.findByRole('button', { name: /Lectura Guiada/i });
	expect(tab).toBeInTheDocument();
});

test('incluye la pestaña Actividades en la navegación', async () => {
  await renderAsync(<App />);
  const tab = await screen.findByText(/Actividades/i);
  expect(tab).toBeInTheDocument();
});

