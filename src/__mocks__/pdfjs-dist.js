
// src/__mocks__/pdfjs-dist.js
export const getDocument = jest.fn(() => ({
  promise: Promise.resolve({
    numPages: 1,
    getPage: jest.fn(() => Promise.resolve({
      getTextContent: jest.fn(() => Promise.resolve({ items: [{ str: 'mock pdf text' }] }))
    }))
  })
}));
