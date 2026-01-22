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
import { createActiveSession } from './firebase/sessionManager';

import { lightTheme, darkTheme } from './styles/theme';

// 🆕 Funciones de diagnóstico para localStorage
import {
  clearLegacyActivities,
  diagnoseStoredActivities,
  clearAllActivities
} from './hooks/useActivityPersistence';

// 🆕 Función para limpiar borradores de artefactos en sessionStorage
const clearArtifactDrafts = () => {
  const keysToRemove = [
    // Borradores de artefactos
    'resumenAcademico_draft',
    'tablaACD_marcoIdeologico', 'tablaACD_estrategiasRetoricas',
    'tablaACD_vocesPresentes', 'tablaACD_vocesSilenciadas',
    'mapaActores_actores', 'mapaActores_contextoHistorico',
    'mapaActores_conexiones', 'mapaActores_consecuencias',
    'bitacoraEtica_reflexion', 'respuestaArgumentativa_draft',
    // CourseIds asociados
    'resumenAcademico_courseId', 'tablaACD_courseId',
    'mapaActores_courseId', 'bitacoraEtica_courseId',
    'respuestaArgumentativa_courseId'
  ];
  let cleared = 0;
  keysToRemove.forEach(key => {
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      cleared++;
    }
  });
  console.log(`🧹 [App] Borradores de artefactos limpiados: ${cleared}`);
  return cleared;
};

// 🆕 Exponer funciones de diagnóstico en window para debugging
if (typeof window !== 'undefined') {
  window.appDiagnostics = {
    diagnoseStoredActivities,
    clearLegacyActivities,
    clearAllActivities,
    clearArtifactDrafts,
    help: () => console.log(`
🔧 AppLectura - Funciones de Diagnóstico

📊 diagnoseStoredActivities()
   Muestra información sobre datos almacenados en localStorage
   
🧹 clearLegacyActivities()
   Elimina datos antiguos sin courseId (resuelve problemas de persistencia entre cursos)
   
🗑️ clearAllActivities()
   Elimina TODOS los datos de actividades (usar con precaución)

📝 clearArtifactDrafts()
   Elimina borradores de artefactos en sessionStorage

Uso: window.appDiagnostics.diagnoseStoredActivities()
    `)
  };
  console.log('🔧 Funciones de diagnóstico disponibles: window.appDiagnostics.help()');
}


// Sistema de performance optimizado
import { usePerformanceMonitor } from './utils/performanceMonitor';
import PerformanceDashboard from './components/debug/PerformanceDashboard';

// Iconos personalizados (nuevos con fondo transparente)
import lecturaGuiadaIcon from './assets/icons/lectura_guiada_new.png';
import analisisIcon from './assets/icons/analisis_new.png';
import actividadesIcon from './assets/icons/actividades_new.png';
import notasIcon from './assets/icons/notas_new.png';
import evaluacionIcon from './assets/icons/evaluacion_new.png';


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

const TeacherDashboard = lazy(() =>
  import('./components/teacher/TeacherDashboard').then(module => ({
    default: React.memo(module.default)
  }))
);

const TextoSelector = lazy(() =>
  import('./components/estudiante/TextoSelector').then(module => ({
    default: React.memo(module.default)
  }))
);

// Estilos mejorados para una mejor experiencia de lectura
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom);
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
    max-height: calc(100dvh - 80px);
    position: sticky;
    top: 80px;
    transition: width 0.3s ease;
    overflow-y: auto;
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
  min-height: 100dvh;
  
  @media (min-width: 768px) {
    min-height: calc(100dvh - 80px);
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

const _FocusModeButton = styled.button`
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

const TeacherModeSwitch = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
`;

const TeacherModeButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: ${props => props.$active ? '#fff' : props.theme.text};
  background: ${props => props.$active ? props.theme.primary : 'transparent'};
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TeacherViewWrapper = styled.div`
  flex: 1;
  width: 100%;
  margin: 0 auto;
  max-width: 1600px;
  padding: 1rem;
`;

const StudentDashboardWrapper = styled.div`
  flex: 1;
  width: 100%;
  background: ${props => props.theme.background};
`;

function AppContent() {
  const {
    texto,
    setTexto, // Necesitamos setTexto
    setCurrentTextoId: _setCurrentTextoId, // 🆕
    setSourceCourseId: _setSourceCourseId, // 🆕 CRÍTICO: Para establecer ID del curso
    switchLecture, // 🆕 CAMBIO ATÓMICO
    updateCurrentSessionFromState, // 🆕 Flush de sesión antes de volver a cursos
    modoOscuro,
    toggleModoOscuro,
    loading,
    error,
    sessionConflict,
    conflictingSessionInfo,
    setArchivoActual,
    analyzeDocument // Para análisis automático al seleccionar texto
  } = useContext(AppContext);

  // Firebase Authentication
  const { currentUser, loading: authLoading, signOut, isDocente } = useAuth();

  // Hook de monitoreo de performance
  const performanceMonitor = usePerformanceMonitor();
  const storedAppMode = React.useRef(null);
  const [appMode, setAppMode] = useState(() => {
    try {
      if (typeof window === 'undefined') return 'student';
      const saved = window.localStorage.getItem('appMode');
      storedAppMode.current = saved;
      return saved || 'student';
    } catch {
      storedAppMode.current = null;
      return 'student';
    }
  });

  const [vistaActiva, setVistaActiva] = useState('lectura-guiada');

  // Cargar vista guardada cuando el usuario está disponible
  React.useEffect(() => {
    if (currentUser?.uid) {
      try {
        const saved = localStorage.getItem(`appActiveTab_${currentUser.uid}`);
        if (saved) {
          setVistaActiva(saved === 'lectura' ? 'lectura-guiada' : saved);
        }
      } catch { }
    }
  }, [currentUser]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showStudentDashboard, setShowStudentDashboard] = useState(!texto); // Mostrar dashboard si no hay texto

  // Auto-colapsar sidebar cuando hay texto cargado y cambia la pestaña a lectura
  React.useEffect(() => {
    if (texto) {
      setShowStudentDashboard(false);
    } else {
      setShowStudentDashboard(true);
    }
  }, [texto]);

  // 🆕 FORZAR: Estudiante siempre inicia en Menú de Cursos al iniciar sesión
  React.useEffect(() => {
    if (currentUser && !isDocente) {
      setShowStudentDashboard(true);
    }
  }, [currentUser, isDocente]);

  React.useEffect(() => {
    if (texto && vistaActiva === 'lectura-guiada') {
      // Colapsar automáticamente el sidebar al cambiar a vista de lectura con contenido
      const timer = setTimeout(() => {
        setSidebarCollapsed(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [texto, vistaActiva]);

  React.useEffect(() => {
    if (!isDocente && appMode !== 'student') {
      setAppMode('student');
    }
  }, [isDocente, appMode]);

  // 🆕 FORZAR: Docente siempre inicia en 'teacher' (Perfil Docente)
  React.useEffect(() => {
    if (isDocente) {
      setAppMode('teacher');
    }
  }, [isDocente]);

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('appMode', appMode);
      }
      storedAppMode.current = appMode;
    } catch {
      // Ignorar errores de almacenamiento (modo incógnito, etc.)
    }
  }, [appMode]);

  React.useEffect(() => {
    if (appMode === 'teacher' && focusMode) {
      setFocusMode(false);
    }
  }, [appMode, focusMode]);

  // OPTIMIZADO: useCallback para evitar re-renders innecesarios
  const cambiarVista = useCallback((vista) => {
    performanceMonitor.markStart(`tab-change-${vista}`);
    const normalized = vista === 'lectura' ? 'lectura-guiada' : vista;
    setVistaActiva(normalized);
    if (currentUser?.uid) {
      try { localStorage.setItem(`appActiveTab_${currentUser.uid}`, normalized); } catch { }
    }
    performanceMonitor.markEnd(`tab-change-${vista}`);
  }, [performanceMonitor, currentUser]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const _toggleFocusMode = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  const handleSelectText = useCallback((content, textoData) => {
    // 🆕 CAMBIO ATÓMICO: Usar switchLecture para actualizar todos los estados juntos
    const targetId = textoData?.textoId || textoData?.id;
    const courseId = textoData?.sourceCourseId;

    console.log('📖 [App] handleSelectText con switchLecture atómico');
    console.log('📎 textoId:', targetId);
    console.log('📎 courseId:', courseId);

    // 🆕 Un solo llamado que actualiza TODO atómicamente
    switchLecture({
      id: targetId || null,
      courseId: courseId || null,
      content: content || '',
      fileName: textoData?.fileName || textoData?.titulo || null,
      fileType: textoData?.fileType || null,
      fileURL: textoData?.fileURL || null
    });

    // Archivo actual (para visor PDF) - se maneja por separado
    if (textoData?.archivoInfo) {
      setArchivoActual(textoData.archivoInfo);
    } else if (textoData?.fileURL) {
      setArchivoActual({
        name: textoData.fileName || textoData.titulo || 'Texto asignado',
        type: textoData.fileType || 'application/octet-stream',
        size: textoData.fileSize || 0,
        objectUrl: textoData.fileURL,
        fileURL: textoData.fileURL,
        source: 'storage'
      });
    } else {
      setArchivoActual(null);
    }

    // 🆕 Limpiar borradores de artefactos al cambiar de curso
    if (courseId) {
      console.log('✅ [App] Limpiando borradores al cambiar de curso');
      clearArtifactDrafts();
    }

    cambiarVista('lectura-guiada');
    setShowStudentDashboard(false);

    // 🆕 Disparar análisis automáticamente DESPUÉS del cambio atómico
    if (content && content.trim().length >= 100) {
      console.log('🚀 [App] Disparando análisis automático...');
      // Pequeño delay para permitir que React procese el estado atómico
      setTimeout(() => {
        analyzeDocument(content, targetId);
      }, 50);
    }
  }, [switchLecture, setArchivoActual, cambiarVista, analyzeDocument]);

  const handleBackToCourses = useCallback(() => {
    // 🛡️ CRÍTICO: Antes de limpiar el texto, guardar la sesión actual.
    // Si no lo hacemos, Smart Resume puede restaurar rubricProgress obsoleto
    // y “borrar” la evaluación al reabrir la lectura desde Mis Cursos.
    try {
      if (typeof updateCurrentSessionFromState === 'function') {
        updateCurrentSessionFromState();
      }
    } catch {
      // Ignorar errores: volver a cursos no debe bloquearse
    }

    setTexto('');
    setArchivoActual(null);
    setShowStudentDashboard(true);
    // Opcional: Limpiar otros estados si es necesario
  }, [setTexto, setArchivoActual, updateCurrentSessionFromState]);

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

  const _pestanas = [];
  // ORDEN PEDAGÓGICO CORRECTO:
  // 1. Lectura Guiada (interacción con texto + tutor IA)
  // 2. Análisis del Texto (análisis académico contextual)
  // 3. Actividades (práctica con artefactos evaluables, incluye Bitácora Ética IA - Rúbrica 5)
  // 4. Notas de Estudio (síntesis)
  // 5. Evaluación (validación final)

  const pestanasFixed = [
    {
      id: 'lectura-guiada',
      label: 'Lectura Guiada',
      icon: <img src={lecturaGuiadaIcon} alt="" style={{ width: '1.75rem', height: '1.75rem', objectFit: 'contain' }} />
    },
    {
      id: 'prelectura',
      label: 'Análisis del Texto',
      icon: <img src={analisisIcon} alt="" style={{ width: '1.75rem', height: '1.75rem', objectFit: 'contain' }} />
    },
    {
      id: 'actividades',
      label: 'Actividades',
      icon: <img src={actividadesIcon} alt="" style={{ width: '1.75rem', height: '1.75rem', objectFit: 'contain' }} />
    },
    {
      id: 'notas',
      label: 'Notas de Estudio',
      icon: <img src={notasIcon} alt="" style={{ width: '1.75rem', height: '1.75rem', objectFit: 'contain' }} />
    },
    {
      id: 'evaluacion',
      label: 'Evaluación',
      icon: <img src={evaluacionIcon} alt="" style={{ width: '1.75rem', height: '1.75rem', objectFit: 'contain' }} />
    }
  ];

  const textoDisponible = useMemo(() => Boolean(texto?.trim()), [texto]);
  const theme = useMemo(() => (modoOscuro ? darkTheme : lightTheme), [modoOscuro]);
  const showTeacherDashboard = isDocente && appMode === 'teacher';

  // Si es estudiante y debe mostrar dashboard
  const showStudentSelector = !isDocente && appMode === 'student' && showStudentDashboard;

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
        onReload={async () => {
          try {
            // Crear nueva sesión activa (esto automáticamente invalida la anterior)
            await createActiveSession(currentUser.uid);
            // Recargar la página para aplicar cambios
            window.location.reload();
          } catch (error) {
            console.error('Error al tomar control de la sesión:', error);
            // Si falla, al menos recargar
            window.location.reload();
          }
        }}
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
              onBack={handleBackToCourses}
              showBackButton={!showTeacherDashboard && !showStudentSelector}
            >
              <>
                {isDocente && (
                  <TeacherModeSwitch role="group" aria-label="Cambiar vista">
                    <TeacherModeButton
                      type="button"
                      $active={appMode === 'teacher'}
                      onClick={() => setAppMode('teacher')}
                    >
                      Perfil docente
                    </TeacherModeButton>
                    <TeacherModeButton
                      type="button"
                      $active={appMode === 'student'}
                      onClick={() => setAppMode('student')}
                    >
                      Vista estudiante
                    </TeacherModeButton>
                  </TeacherModeSwitch>
                )}
                <RewardsHeader onClickDetails={() => console.log('TODO: Abrir panel de detalles')} />
              </>
            </Header>
          )}

          {showTeacherDashboard ? (
            <TeacherViewWrapper>
              <ErrorBoundary>
                <Suspense fallback={<LoadingOverlay />}>
                  <TeacherDashboard />
                </Suspense>
              </ErrorBoundary>
            </TeacherViewWrapper>
          ) : showStudentSelector ? (
            <StudentDashboardWrapper>
              <TextoSelector
                onSelectText={handleSelectText}
                onFreeAnalysis={() => setShowStudentDashboard(false)}
              />
            </StudentDashboardWrapper>
          ) : (
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
                        {loading && vistaActiva !== 'prelectura' && <LoadingOverlay />}
                        {error && <div>Error: {error}</div>}
                        {(!loading || vistaActiva === 'prelectura') && !error && renderVistaContent()}
                      </AnimatePresence>
                    </ErrorBoundary>
                  </ViewContent>
                </ReadingContainer>
              </ContentArea>
            </MainContent>
          )}

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
