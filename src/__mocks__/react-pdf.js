const React = require('react');

module.exports = {
  Document: ({ children, onLoadSuccess, onLoadError, file }) => {
    // Simular carga exitosa
    React.useEffect(() => {
      if (onLoadSuccess) {
        onLoadSuccess({ numPages: 3 });
      }
    }, [onLoadSuccess]);
    
    return React.createElement('div', { 
      'data-testid': 'pdf-document',
      'data-file': file 
    }, children);
  },
  
  Page: ({ pageNumber, width, scale }) => {
    return React.createElement('div', {
      'data-testid': 'pdf-page',
      'data-page-number': pageNumber,
      'data-width': width,
      'data-scale': scale
    }, `Page ${pageNumber}`);
  },
  
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: ''
    },
    version: '2.16.105'
  }
};
