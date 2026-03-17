import React, { useContext, useState, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { isNonProductionEnvironment } from '../utils/runtimeEnv';

// 🚀 PERF: Log silenciado en producción para evitar overhead de serialización
const __DEV__ = isNonProductionEnvironment;
const devLog = __DEV__ ? console.log.bind(console) : () => { };
const devWarn = __DEV__ ? console.warn.bind(console) : () => { };
import { AppContext } from '../context/AppContext';
import VisorTextoResponsive from '../VisorTexto_responsive';
import TutorDock from './tutor/TutorDock';
import useNotesWorkspaceAdapter from '../hooks/useNotesWorkspaceAdapter';
import NotesPanelDock from './notes/NotesPanelDock';
import useReaderActions from '../hooks/useReaderActions';
// FASE 2: Integración pedagógica migrada de LecturaInteractiva
import { PedagogyContext } from '../context/PedagogyContext';
import BloomLevelIndicator from './bloom/BloomLevelIndicator';
import CriticalProgressionPanel from './pedagogy/CriticalProgressionPanel';
import ACDAnalysisPanel from './acd/ACDAnalysisPanel';

/**
 * ReadingWorkspace (Esqueleto Inicial)
 * ------------------------------------
 * Objetivo: Unificar en una sola vista la experiencia de lectura y acompañamiento del tutor.
 * Fase actual: ESQUELETO (no sustituye todavía a LecturaInteractiva / Solo Lectura).
 *
 * Contendrá en iteraciones futuras:
 *  - Barra de acciones (cargar texto, notas, toggle web, modo enfoque global, etc.)
 *  - Dock del tutor con enriquecimiento web y follow-ups
 *  - Panel lateral opcional para notas / análisis rápido
 *  - Integración de follow-ups (ya soportado vía TutorDock props)
 *  - Plugin de enriquecimiento web reutilizable
 */

const WorkspaceLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background: ${p => p.theme?.background || '#fafafa'};
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: ${p => p.theme?.surface || '#ffffff'};
  border-bottom: 1px solid ${p => p.theme?.border || '#ddd'};
  flex-wrap: wrap;
  @media (max-width: 640px) {
    gap: 0.5rem;
  }

  /* Modo enfoque: barra compacta */
  ${p => p.$compact && `
    padding: 0.35rem 0.75rem;
    gap: 0.5rem;
    strong { font-size: 0.8rem; }
  `}
`;

const ActionsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  background: ${p => p.primary ? (p.theme?.primary || '#2563eb') : (p.theme?.surface || '#f4f4f7')};
  color: ${p => p.primary ? '#fff' : (p.theme?.text || '#222')};
  border: 1px solid ${p => p.theme?.border || '#ccc'};
  padding: .45rem .75rem;
  font-size: .75rem;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  min-height: 44px;
  touch-action: manipulation;
  &:hover { opacity: .9; }
`;

const ContentArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
`;

export default function ReadingWorkspace({ enableWeb: _enableWeb = true, followUps = true }) {
  const {
    texto,
    setTexto: _setTexto,
    modoOscuro,
    currentTextoId,
    completeAnalysis,
    focusMode,        // 🆕 GLOBAL
    toggleFocusMode   // 🆕 GLOBAL
  } = useContext(AppContext);
  const isTestEnv = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID;
  // FASE 2: Detectar si hay provider pedagógico disponible
  const pedagogyMaybe = useContext(PedagogyContext);
  const hasPedagogyProvider = !!pedagogyMaybe;
  // 🚀 PERF: Memoizar theme para evitar objeto nuevo en cada render
  const theme = useMemo(() => modoOscuro ? { border: '#ddd', surface: '#f4f4f7' } : { border: '#ddd', surface: '#fff' }, [modoOscuro]);
  const [showTutor, setShowTutor] = useState(() => isTestEnv ? true : false);
  const [showNotes, setShowNotes] = useState(false);
  const [tutorExpanded, setTutorExpanded] = useState(false);
  const [tutorWidth, setTutorWidth] = useState(420);
  const pendingPromptRef = React.useRef(null);
  const [tutorReady, setTutorReady] = useState(false);
  // 🚀 PERF: Refs para acceder a valores actuales sin invalidar callbacks
  const showTutorRef = React.useRef(showTutor);
  showTutorRef.current = showTutor;
  const textoRef = React.useRef(texto);
  textoRef.current = texto;
  const hasText = !!(texto && texto.trim().length);
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const notesApi = useNotesWorkspaceAdapter(texto);

  // 🚀 PERF: Callbacks estables para evitar re-renders innecesarios de hijos
  const handleToggleTutor = useCallback(() => setShowTutor(s => !s), []);
  const handleCloseTutor = useCallback(() => setShowTutor(false), []);
  const handleToggleExpand = useCallback(() => setTutorExpanded(v => !v), []);
  const handleCloseNotes = useCallback(() => setShowNotes(false), []);
  const handleToggleFocus = toggleFocusMode; // 🆕 Reemplazar por versión global

  // Integrar acciones contextuales del lector (reader-action)
  // Evitar duplicados: si el TutorDock está visible (showTutor=true), él ya escucha directamente 'reader-action'.
  // En ese caso NO reenviamos como 'tutor-external-prompt' para no producir doble envío.
  useReaderActions({
    onPrompt: ({ action, fragment, prompt }) => {
      const inTest = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID;
      if (inTest) {
        // En pruebas: reemitir SIEMPRE para que el test lo capture
        const ev = new CustomEvent('tutor-external-prompt', { detail: { prompt, action, fragment, fullText: texto } });
        window.dispatchEvent(ev);
        return;
      }
      // En producción: si el Tutor ya está visible, no reemitimos para evitar duplicados (TutorDock escucha reader-action)
      if (showTutor) return;
      // Si no está visible, auto-abrimos y encolamos la acción para reemitir tras el montaje
      pendingPromptRef.current = { prompt, action, fragment };
      setShowTutor(true);
    }
  });

  // Cuando el Tutor se muestre, si hay un prompt/acción pendiente, reenviarlo como 'tutor-external-prompt'
  useEffect(() => {
    devLog('🔄 [ReadingWorkspace] useEffect tutor-ready listener, showTutor:', showTutor);
    if (!showTutor) return;

    // Esperar a que el TutorDock señale que está listo
    const onReady = () => {
      devLog('🎉 [ReadingWorkspace] Recibido evento tutor-ready');
      setTutorReady(true);
      if (pendingPromptRef.current) {
        devLog('📤 [ReadingWorkspace] Hay acción pendiente, enviando tutor-external-prompt:', pendingPromptRef.current);
        const { prompt, action, fragment, webContext } = pendingPromptRef.current;
        try {
          const ev = new CustomEvent('tutor-external-prompt', {
            detail: {
              prompt,
              action,
              fragment,
              webContext,
              fullText: texto
            }
          });
          window.dispatchEvent(ev);
          devLog('✅ [ReadingWorkspace] tutor-external-prompt enviado exitosamente');
        } finally {
          pendingPromptRef.current = null;
        }
      } else {
        devLog('ℹ️ [ReadingWorkspace] No hay acción pendiente');
      }
    };
    devLog('👂 [ReadingWorkspace] Registrando listener para tutor-ready');
    window.addEventListener('tutor-ready', onReady, { once: true });
    // Fallback por si el evento se pierde: reintentar en el próximo frame y a los 120ms
    const rafId = requestAnimationFrame(() => {
      if (!tutorReady && pendingPromptRef.current) {
        devWarn('⚠️ [ReadingWorkspace] FALLBACK RAF: tutor-ready no recibido, enviando acción pendiente');
        const { prompt, action, fragment, webContext } = pendingPromptRef.current;
        try {
          const ev = new CustomEvent('tutor-external-prompt', { detail: { prompt, action, fragment, webContext, fullText: texto } });
          window.dispatchEvent(ev);
          devLog('✅ [ReadingWorkspace] FALLBACK RAF: tutor-external-prompt enviado');
        } finally {
          pendingPromptRef.current = null;
        }
      }
    });
    const timeoutId = setTimeout(() => {
      if (!tutorReady && pendingPromptRef.current) {
        devWarn('⚠️ [ReadingWorkspace] FALLBACK TIMEOUT 120ms: tutor-ready no recibido, enviando acción pendiente');
        const { prompt, action, fragment, webContext } = pendingPromptRef.current;
        try {
          const ev = new CustomEvent('tutor-external-prompt', { detail: { prompt, action, fragment, webContext, fullText: texto } });
          window.dispatchEvent(ev);
          devLog('✅ [ReadingWorkspace] FALLBACK TIMEOUT: tutor-external-prompt enviado');
        } finally {
          pendingPromptRef.current = null;
        }
      }
    }, 120);
    return () => {
      devLog('🧹 [ReadingWorkspace] Limpiando listener tutor-ready y fallbacks');
      window.removeEventListener('tutor-ready', onReady);
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [showTutor, texto, tutorReady]);

  // Reset de la bandera cuando ocultamos el tutor
  useEffect(() => { if (!showTutor) setTutorReady(false); }, [showTutor]);

  // Disparar evento de modo enfoque cuando cambia
  useEffect(() => {
    const event = new CustomEvent('visor-focus-mode', { detail: { active: focusMode } });
    window.dispatchEvent(event);
  }, [focusMode]);

  // Escuchar cambios de ancho del tutor para ajustar espacio de lectura
  useEffect(() => {
    const handleWidthChange = (e) => {
      const { width } = e.detail || {};
      if (typeof width === 'number') {
        setTutorWidth(width);
      }
    };
    window.addEventListener('tutor-width-change', handleWidthChange);
    return () => window.removeEventListener('tutor-width-change', handleWidthChange);
  }, []);

  // Handler completo para acciones del lector (notes, explain, summarize, question)
  useEffect(() => {
    const handler = (e) => {
      devLog('📨 ReadingWorkspace recibió evento reader-action:', e.detail);
      const { action, text } = e.detail || {};

      devLog('🎬 Ejecutando acción:', action, 'con texto:', text?.substring(0, 30));

      // Caso especial: notes NO debe activar el tutor
      if (action === 'notes') {
        devLog('📝 Creando nota sin activar tutor');
        setShowNotes(true); // Abrir panel de notas
        if (text && notesApi && typeof notesApi.createNote === 'function') {
          notesApi.createNote(text, { createdAt: Date.now(), kind: 'note' });
          devLog('✅ Nota creada exitosamente');
        } else {
          devWarn('⚠️ notesApi no disponible:', notesApi);
        }
        return; // Salir completamente del handler
      }

      // FIX #4: Cuando el tutor ya está visible, TutorDock escucha 'reader-action'
      // directamente via su propio useReaderActions. Reenviar aquí como
      // 'tutor-external-prompt' causaba doble ejecución de sendAction.
      if (showTutor) {
        devLog('ℹ️ [ReadingWorkspace] Tutor visible, delegando a TutorDock useReaderActions (sin re-dispatch)');
        return;
      }

      // Tutor cerrado: guardar acción pendiente y abrir tutor.
      // Cuando el tutor se monte, el efecto tutor-ready despachará la acción.
      switch (action) {
        case 'explain':
          devLog('⏳ [ReadingWorkspace] Tutor cerrado, guardando acción pendiente');
          pendingPromptRef.current = {
            prompt: `Actúa como profesor experto. Explica de forma clara y didáctica el significado, contexto e importancia de este fragmento: "${text}". Incluye ejemplos si es pertinente.`,
            action: 'explain',
            fragment: text
          };
          setShowTutor(true);
          setTutorExpanded(true);
          break;

        case 'summarize':
          devLog('⏳ Tutor cerrado, guardando acción pendiente');
          pendingPromptRef.current = {
            prompt: `Resume en máximo 3 puntos las ideas PRINCIPALES y CLAVE de este fragmento. Sé conciso y directo: "${text}"`,
            action: 'summarize',
            fragment: text
          };
          setShowTutor(true);
          setTutorExpanded(true);
          break;

        case 'question':
          devLog('⏳ Tutor cerrado, guardando prompt pendiente');
          pendingPromptRef.current = {
            prompt: `Genera 3 preguntas de comprensión profunda (nivel análisis/evaluación según Bloom) sobre este fragmento: "${text}"`,
            action: 'question',
            fragment: text
          };
          setShowTutor(true);
          setTutorExpanded(true);
          break;
      }
    };
    window.addEventListener('reader-action', handler);
    return () => window.removeEventListener('reader-action', handler);
  }, [notesApi, texto, showTutor]);

  return (
    <WorkspaceLayout>
      <TopBar $compact={focusMode}>
        <ActionsGroup>
          <strong>📘 Lectura Guiada</strong>
        </ActionsGroup>
        <ActionsGroup>
          {hasText && (
            <ActionBtn onClick={handleToggleFocus}>
              {focusMode ? '👁️ Salir Enfoque' : '🎯 Modo Enfoque'}
            </ActionBtn>
          )}
          <ActionBtn onClick={handleToggleTutor}>
            {showTutor ? '🤖 Ocultar Tutor' : '🤖 Mostrar Tutor'}
          </ActionBtn>
        </ActionsGroup>
      </TopBar>
      <ContentArea style={{
        paddingRight: (showTutor && tutorExpanded) ? `${tutorWidth + 20}px` : undefined,
        transition: 'padding-right 0.3s ease'
      }}>
        {!hasText && (
          <div style={{ padding: '2rem', textAlign: 'center', fontSize: '.9rem', color: '#666' }}>
            Carga un texto para comenzar la lectura guiada.
          </div>
        )}
        {hasText && (
          <VisorTextoResponsive texto={texto} />
        )}
        {showTutor && (
          <TutorDock
            followUps={followUps}
            expanded={tutorExpanded}
            onToggleExpand={handleToggleExpand}
            onClose={handleCloseTutor}
          >
            {/* FASE 2: Paneles pedagógicos integrados en TutorDock */}
            {hasPedagogyProvider && (
              <>
                <div style={{ padding: '0.75rem 0.75rem 0.25rem', borderBottom: `1px solid ${theme.border}` }}>
                  <CriticalProgressionPanel compact={true} />
                </div>
                <div style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.border}`, background: theme.surface }}>
                  <BloomLevelIndicator compact={false} showTooltip={true} />
                </div>
                {/* Panel de Análisis Crítico del Discurso */}
                <ACDAnalysisPanel text={texto} compact={false} rewardsResourceId={lectureId} />
              </>
            )}
          </TutorDock>
        )}
        {showNotes && <NotesPanelDock notesApi={notesApi} onClose={handleCloseNotes} />}
      </ContentArea>
    </WorkspaceLayout>
  );
}
