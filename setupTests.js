// Configuración global para Jest
import '@testing-library/jest-dom';
import fetchMock from 'jest-fetch-mock';

// Habilitar mocks de fetch
fetchMock.enableMocks();

// Mock global de fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock framer-motion antes de cualquier importación
jest.mock('framer-motion', () => {
  const React = require('react');
  
  const createMotionComponent = (tag) => {
    return React.forwardRef((props, ref) => {
      const { animate, initial, exit, transition, whileHover, whileTap, variants, ...otherProps } = props;
      return React.createElement(tag, { ...otherProps, ref });
    });
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'), 
      p: createMotionComponent('p'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      h3: createMotionComponent('h3'),
      button: createMotionComponent('button'),
      section: createMotionComponent('section'),
      article: createMotionComponent('article'),
      nav: createMotionComponent('nav'),
      header: createMotionComponent('header'),
      footer: createMotionComponent('footer'),
      aside: createMotionComponent('aside'),
      main: createMotionComponent('main'),
      ul: createMotionComponent('ul'),
      ol: createMotionComponent('ol'),
      li: createMotionComponent('li'),
      a: createMotionComponent('a'),
      img: createMotionComponent('img'),
      form: createMotionComponent('form'),
      input: createMotionComponent('input'),
      textarea: createMotionComponent('textarea'),
      select: createMotionComponent('select'),
      label: createMotionComponent('label'),
    },
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn(),
    }),
    useMotionValue: () => ({
      get: () => 0,
      set: jest.fn(),
    }),
  };
});

// Mock para ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock de IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock de matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de sessionStorage
global.sessionStorage = localStorageMock;

// Suprimir warnings de console en tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // Lista blanca de warnings a silenciar para mantener salida de test limpia
    const suppressed = [
      'Warning: `ReactDOMTestUtils.act` is deprecated',
      'Warning: A suspended resource finished loading inside a test',
      'Warning: An update to %s inside a test was not wrapped in act',
      'Warning: ReactDOM.render is deprecated',
    ];
    if (suppressed.some(w => msg.includes(w))) return;
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
