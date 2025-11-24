/**
 * Utilidades para renderizar texto con formato markdown simple
 * Convierte **negrita**, *cursiva* y otros formatos básicos a JSX
 */

import React from 'react';

/**
 * Convierte markdown simple a elementos React
 * Soporta: **negrita**, *cursiva*, `código`, [enlaces](url)
 * @param {string} text - Texto con formato markdown
 * @returns {React.ReactNode} - Elementos JSX
 */
export const renderMarkdown = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  const parts = [];
  let currentIndex = 0;
  let keyCounter = 0;

  // Regex para detectar **negrita**, *cursiva*, `código`
  const markdownRegex = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)/g;
  
  let match;
  while ((match = markdownRegex.exec(text)) !== null) {
    // Agregar texto antes del match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    
    const matchedText = match[0];
    const innerText = matchedText.slice(
      matchedText.startsWith('**') ? 2 : 1,
      matchedText.endsWith('**') ? -2 : -1
    );
    
    // Determinar el tipo de formato
    if (matchedText.startsWith('**')) {
      // Negrita
      parts.push(<strong key={`bold-${keyCounter++}`}>{innerText}</strong>);
    } else if (matchedText.startsWith('*')) {
      // Cursiva
      parts.push(<em key={`italic-${keyCounter++}`}>{innerText}</em>);
    } else if (matchedText.startsWith('`')) {
      // Código inline
      parts.push(
        <code 
          key={`code-${keyCounter++}`}
          style={{ 
            background: '#f5f5f5', 
            padding: '2px 6px', 
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }}
        >
          {innerText}
        </code>
      );
    }
    
    currentIndex = match.index + matchedText.length;
  }
  
  // Agregar texto restante
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  return parts.length > 0 ? <>{parts}</> : text;
};

/**
 * Renderiza un array de strings con formato markdown
 * @param {string[]} items - Array de strings
 * @returns {React.ReactNode[]} - Array de elementos JSX
 */
export const renderMarkdownList = (items) => {
  if (!Array.isArray(items)) return items;
  return items.map((item, index) => (
    <React.Fragment key={index}>
      {renderMarkdown(item)}
    </React.Fragment>
  ));
};

/**
 * Convierte saltos de línea en <br /> tags
 * @param {string} text - Texto con \n
 * @returns {React.ReactNode} - Elementos JSX
 */
export const renderWithLineBreaks = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  return text.split('\n').map((line, index, array) => (
    <React.Fragment key={index}>
      {renderMarkdown(line)}
      {index < array.length - 1 && <br />}
    </React.Fragment>
  ));
};
