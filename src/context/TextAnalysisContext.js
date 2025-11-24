import React, { createContext } from 'react';

// Contexto mínimo para satisfacer los tests que envuelven el componente
export const TextAnalysisContext = createContext({});

export const TextAnalysisProvider = ({ children, value }) => (
  <TextAnalysisContext.Provider value={value || {}}>
    {children}
  </TextAnalysisContext.Provider>
);
