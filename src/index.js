import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/darkModeOverrides.css';
import reportWebVitals from './reportWebVitals';
import { AppContextProvider } from './context/AppContext'; // Contexto global para la aplicación
import ErrorBoundary from './components/error/ErrorBoundary'; // Componente para manejar errores
import './setupPdfWorker'; // Configurar worker de PDF.js

// Lazy loading del componente principal
const App = React.lazy(() => import('./App'));

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppContextProvider>
        <Suspense fallback={<div>Cargando aplicación...</div>}>
          <App />
        </Suspense>
      </AppContextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Si deseas medir el rendimiento de tu aplicación, puedes usar reportWebVitals.
// Por ejemplo, envía los resultados a una herramienta de análisis o simplemente usa console.log.
reportWebVitals(console.log);
