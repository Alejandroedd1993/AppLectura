// Test utilities para la aplicación
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { AppContext } from '../src/context/AppContext';

// Mock del contexto con valores por defecto
const defaultContextValue = {
  texto: '',
  setTexto: jest.fn(),
  parrafos: [],
  setParrafos: jest.fn(),
  modoOscuro: false,
  setModoOscuro: jest.fn(),
  loading: false,
  setLoading: jest.fn(),
  error: null,
  setError: jest.fn(),
  configuracionAPI: {
    openai: '',
    gemini: ''
  },
  setConfiguracionAPI: jest.fn(),
  temaSeleccionado: 'claro',
  setTemaSeleccionado: jest.fn()
};

// Custom render que incluye el contexto
function render(ui, { contextValue = {}, ...renderOptions } = {}) {
  const mergedContextValue = { ...defaultContextValue, ...contextValue };
  
  function Wrapper({ children }) {
    return (
      <AppContext.Provider value={mergedContextValue}>
        {children}
      </AppContext.Provider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Función para crear mocks de OpenAI
export const createOpenAIMock = (responses = {}) => ({
  chat: {
    completions: {
      create: jest.fn().mockImplementation(async (params) => {
        const key = params.messages[0]?.content || 'default';
        const response = responses[key] || responses.default || {
          choices: [
            {
              message: {
                content: 'Mock response'
              }
            }
          ]
        };
        return Promise.resolve(response);
      })
    }
  }
});

// Función para crear texto de prueba
export const createTestText = (length = 'medium') => {
  const texts = {
    short: 'Este es un texto corto para pruebas.',
    medium: `Este es un texto de prueba de longitud media. 
    Contiene varios párrafos para poder probar diferentes funcionalidades. 
    Es útil para probar análisis de texto y otras características.`,
    long: `Este es un texto largo para pruebas extensas. `.repeat(100)
  };
  
  return texts[length] || texts.medium;
};

// Función para esperar a que los elementos async se carguen
export const waitForAsyncComponent = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Mock de archivos PDF
export const createMockPDFFile = (name = 'test.pdf') => {
  return new File(['Mock PDF content'], name, { type: 'application/pdf' });
};

// Mock de archivos de texto
export const createMockTextFile = (content = 'Mock text content', name = 'test.txt') => {
  return new File([content], name, { type: 'text/plain' });
};

// Configuración para tests que requieren APIs
export const mockApiResponse = (endpoint, response) => {
  global.fetch.mockImplementation((url) => {
    if (url.includes(endpoint)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response)
      });
    }
    return Promise.reject(new Error('Unexpected API call'));
  });
};

// Limpiar mocks después de cada test
export const cleanupMocks = () => {
  jest.clearAllMocks();
  global.fetch.mockClear();
  localStorage.clear();
  sessionStorage.clear();
};

// Re-export everything from RTL
export * from '@testing-library/react';

// Override render method
export { render };

// Export renderWithContext alias
export { render as renderWithContext };
