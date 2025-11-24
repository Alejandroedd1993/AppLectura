import React, { useState, useContext, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider } from 'styled-components';

// Estilos globales de accesibilidad
import './styles/a11y.css';

// Componentes de UI
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation_responsive';
import LoadingOverlay from './components/ui/LoadingOverlay';
import ErrorBoundary from './components/error/ErrorBoundary';
import RewardsHeader from './components/rewards/RewardsHeader';
import AIDisclaimer from './components/AIDisclaimer';
import SessionConflictModal from './components/SessionConflictModal';

// Importaciones básicas que siempre se cargan
import CargaTexto from './components/CargaTexto_responsive';
import { AppContext, AppContextProvider } from './context/AppContext';

// CORRECCIÓN: Integrar PedagogyProvider para módulos pedagógicos centralizados
import { PedagogyProvider } from './context/PedagogyContext';

// Firebase Authentication Context
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';

import { lightTheme, darkTheme } from './styles/theme';

// Sistema de performance optimizado
import { usePerformanceMonitor } from './utils/performanceMonitor';
import PerformanceDashboard from './components/debug/PerformanceDashboard';

// Cargar componentes de forma perezosa para mejorar rendimiento inicial

const NotasEstudio = lazy(() => 
  import('./components/NotasEstudio').then(module => ({
    default: React.memo(module.default)
  }))
);

// ELIMINADO: LecturaInteractiva deprecada en favor de ReadingWorkspace (Lectura Guiada)

const ReadingWorkspace = lazy(() => 
  import('./components/ReadingWorkspace').then(module => ({
    default: React.memo(module.default)
  }))
);

// Usar el wrapper `VisorTexto` (que a su vez importa la versión responsive) para
// evitar problemas de resolución si el archivo responsive se recrea o renombra.
const VisorTexto = lazy(() => 
  import('./VisorTexto').then(module => ({
    default: React.memo(module.default)
  }))
);

const SistemaEvaluacion = lazy(() => 
  import('./components/SistemaEvaluacion').then(module => ({
    default: React.memo(module.default)
  }))
);

const Actividades = lazy(() =>
  import('./components/Actividades').then(module => ({
    default: React.memo(module.default)
  }))
);

// NUEVO: Pre-lectura con análisis académico estructurado (Fase 3)
const PreLectura = lazy(() =>
  import('./components/PreLectura').then(module => ({
    default: React.memo(module.default)
  }))
);

// Estilos mejorados para una mejor experiencia de lectura
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: all 0.3s ease;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
  position: relative;
  
  /* Responsive breakpoints */
  @media (min-width: 768px) {
    flex-direction: row;
    max-width: 1400px;
    padding: 0 1rem;
  }
  
  @media (min-width: 1200px) {
    max-width: 1600px;
    padding: 0 2rem;
  }
`;

const SidebarContainer = styled(motion.aside)`
  width: 100%;
  background: ${props => props.theme.surface};
  border-right: 1px solid ${props => props.theme.border};
  display: flex;
  flex-direction: column;
  
  @media (min-width: 768px) {
    width: ${props => props.$collapsed ? '60px' : '320px'};
    min-width: ${props => props.$collapsed ? '60px' : '320px'};
    max-height: calc(100vh - 80px);
    position: sticky;
    top: 80px;
    transition: width 0.3s ease;
  }
  
  @media (min-width: 1200px) {
    width: ${props => props.$collapsed ? '60px' : '380px'};
    min-width: ${props => props.$collapsed ? '60px' : '380px'};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  
  @media (min-width: 768px) {
    min-height: calc(100vh - 80px);
    margin-left: 1rem;
  }
`;

const ReadingContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.cardBg};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  
  /* Modo lectura enfocada */
  ${props => props.$focusMode && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    margin: 0;
    border-radius: 0;
    background: ${props.theme.background};
  `}
`;

const TabsContainer = styled.div`
  background: ${props => props.theme.surface};
  border-bottom: 1px solid ${props => props.theme.border};
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ViewContent = styled(motion.div)`
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 160px);
  
  @media (min-width: 768px) {
    max-height: calc(100vh - 200px);
  }
`;

const CollapseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: -15px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
  
  @media (min-width: 768px) {
    display: flex;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const FocusModeButton = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  min-height: 44px;
  
  &:hover {
    opacity: 0.9;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

function AppContent() {
  const {
    texto,
    modoOscuro,
    toggleModoOscuro,
    loading,
    error,
    sessionConflict,
    conflictingSessionInfo
  } = useContext(AppContext);
  
  // Firebase Authentication
  const { currentUser, loading: authLoading, signOut } = useAuth();
  
  // Hook de monitoreo de performance
  const performanceMonitor = usePerformanceMonitor();
  
  const [vistaActiva, setVistaActiva] = useState(() => {
    try {
      const saved = localStorage.getItem('appActiveTab');
      if (saved) {
        // Mapear ids legacy a la nueva vista
        return saved === 'lectura' ? 'lectura-guiada' : saved;
      }
    } catch {}
    return 'lectura-guiada';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Auto-colapsar sidebar cuando hay texto cargado y cambia la pestaña a lectura
  React.useEffect(() => {
    if (texto && vistaActiva === 'lectura-guiada') {
      // Colapsar automáticamente el sidebar al cambiar a vista de lectura con contenido
      const timer = setTimeout(() => {
        setSidebarCollapsed(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [texto, vistaActiva]);

  // OPTIMIZADO: useCallback para evitar re-renders innecesarios
  const cambiarVista = useCallback((vista) => {
    performanceMonitor.markStart(`tab-change-${vista}`);
    const normalized = vista === 'lectura' ? 'lectura-guiada' : vista;
    setVistaActiva(normalized);
    try { localStorage.setItem('appActiveTab', normalized); } catch {}
    performanceMonitor.markEnd(`tab-change-${vista}`);
  }, [performanceMonitor]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  // Sincronizar con eventos del visor de lectura
  React.useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.active === true) setFocusMode(true);
      if (e?.detail?.active === false) setFocusMode(false);
    };
    window.addEventListener('visor-focus-mode', handler);
    // Listener global para navegación entre pestañas desde componentes hijos (p.ej., Tutor → Análisis)
    const tabNavHandler = (e) => {
      const tabId = e?.detail?.tabId;
      if (!tabId) return;
      const allowed = ['lectura', 'lectura-interactiva', 'lectura-guiada', 'prelectura', 'analisis', 'evaluacion', 'actividades', 'notas'];
      if (allowed.includes(tabId)) {
        cambiarVista(tabId);
      }
    };
    window.addEventListener('app-change-tab', tabNavHandler);

    return () => {
      window.removeEventListener('visor-focus-mode', handler);
      window.removeEventListener('app-change-tab', tabNavHandler);
    };
  }, []);

  const pestanas = [];
  // ORDEN PEDAGÓGICO CORRECTO:
  // 1. Lectura Guiada (interacción con texto + tutor IA)
  // 2. Análisis del Texto (análisis académico contextual)
  // 3. Actividades (práctica con artefactos evaluables, incluye Bitácora Ética IA - Rúbrica 5)
  // 4. Notas de Estudio (síntesis)
  // 5. Evaluación (validación final)
  const pestanasFixed = [
    { id: 'lectura-guiada', label: 'Lectura Guiada', icon: '🧠' },
    { id: 'prelectura', label: 'Análisis del Texto', icon: '📖' },
    { id: 'actividades', label: 'Actividades', icon: '🎯' },
    { id: 'notas', label: 'Notas de Estudio', icon: '📝' },
    { id: 'evaluacion', label: 'Evaluación', icon: '✅' }
  ];

  const textoDisponible = useMemo(() => Boolean(texto?.trim()), [texto]);
  const theme = useMemo(() => (modoOscuro ? darkTheme : lightTheme), [modoOscuro]);

  const renderVistaContent = () => {
    // Los componentes ahora usan AppContext directamente
    // Solo pasar props necesarias específicas
    
    switch (vistaActiva) {
      case 'lectura-guiada':
        return (
          <Suspense fallback={<LoadingOverlay />}>
            <ReadingWorkspace />
          </Suspense>
        );
      case 'prelectura':
        return (
          <Suspense fallback={<LoadingOverlay />}>
            <PreLectura />
          </Suspense>
        );
      case 'evaluacion':
        return (
          <Suspense fallback={<LoadingOverlay />}>
            <SistemaEvaluacion />
          </Suspense>
        );
      case 'actividades':
        return (
          <Suspense fallback={<LoadingOverlay />}>
            <Actividades />
          </Suspense>
        );
      case 'notas':
        return (
          <Suspense fallback={<LoadingOverlay />}>
            <NotasEstudio />
          </Suspense>
        );
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      {/* Modal de conflicto de sesión */}
      <SessionConflictModal
        isOpen={sessionConflict}
        sessionInfo={conflictingSessionInfo}
        onReload={() => window.location.reload()}
        onLogout={async () => {
          await signOut();
          window.location.reload();
        }}
      />
      
      {/* Si está cargando la autenticación, mostrar loading */}
      {authLoading ? (
        <AppContainer>
          <LoadingOverlay />
        </AppContainer>
      ) : !currentUser ? (
        /* Si NO hay usuario autenticado, mostrar Login */
        <Login />
      ) : (
        /* Usuario autenticado: mostrar aplicación normal */
        <AppContainer>
          {!focusMode && (
            <Header 
              titulo="Asistente de Lectura y Comprensión con IA"
              modoOscuro={modoOscuro}
              onToggleModo={toggleModoOscuro}
            >
              <RewardsHeader onClickDetails={() => console.log('TODO: Abrir panel de detalles')} />
            </Header>
          )}
        
        <MainContent>
          {!focusMode && (
            <SidebarContainer
              $collapsed={sidebarCollapsed}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <CollapseButton onClick={toggleSidebar}>
                {sidebarCollapsed ? '→' : '←'}
              </CollapseButton>
              
              {!sidebarCollapsed && (
                <ErrorBoundary>
                  <CargaTexto />
                </ErrorBoundary>
              )}
            </SidebarContainer>
          )}

          <ContentArea>
            <ReadingContainer $focusMode={focusMode}>
              <TabsContainer>
                <TabNavigation 
                  tabs={pestanasFixed} 
                  activeTab={vistaActiva}
                  onTabChange={cambiarVista}
                  disabled={!textoDisponible && vistaActiva !== 'lectura-interactiva'}
                  compact={focusMode}
                />
                
                {/* El Modo Enfoque se controla ahora desde el visor de lectura para evitar duplicación de controles */}
              </TabsContainer>

              <ViewContent
                key={vistaActiva}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ErrorBoundary>
                  <AnimatePresence mode="wait">
                    {loading && <LoadingOverlay />}
                    {error && <div>Error: {error}</div>}
                    {!loading && !error && renderVistaContent()}
                  </AnimatePresence>
                </ErrorBoundary>
              </ViewContent>
            </ReadingContainer>
          </ContentArea>
        </MainContent>
        
        {/* Advertencia de IA - Visible en toda la aplicación */}
        <AIDisclaimer modoOscuro={modoOscuro} />
        
        {/* Dashboard de Performance (solo en desarrollo) */}
        <PerformanceDashboard theme={theme} />
      </AppContainer>
      )}
    </ThemeProvider>
  );
}

// Componente principal exportado
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContextProvider>
          <PedagogyProvider>
            <AppContent />
          </PedagogyProvider>
        </AppContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
