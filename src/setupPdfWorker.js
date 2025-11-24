import { pdfjs } from 'react-pdf';

// Configurar worker de PDF.js desde archivo local (evita problemas de CORS y CDN)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
