// jest-dom adds custom jest matchers for asserting on DOM nodes.
// Allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// --- CONFIGURACIÓN DE TESTING LIBRARY ---
configure({
  asyncUtilTimeout: 5000, // Extiende el tiempo de espera para pruebas asíncronas
  testIdAttribute: 'data-testid',
});

// --- MOCKS GLOBALES ---
// Mock para localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock para sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock para fetch
global.fetch = jest.fn();

// Mock para react-pdf worker (sin sobrescribir React)
jest.mock('react-pdf', () => {
  const React = require('react');
  return {
    Document: ({ children }) => React.createElement('div', { 'data-testid': 'pdf-document' }, children),
    Page: () => React.createElement('div', { 'data-testid': 'pdf-page' }, 'PDF Page'),
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } }
  };
});

// Mock para window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suprimir warnings no críticos
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('ReactDOMTestUtils.act')) return;
  if (args[0]?.includes?.('Warning: Failed prop type')) return;
  originalConsoleError(...args);
};

// --- CONFIGURACIÓN DE JEST ---
jest.setTimeout(30000); // Establece un tiempo máximo para cada prueba
