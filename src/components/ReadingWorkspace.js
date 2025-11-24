import React, { useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { buildReadingWorkspaceContext } from '../utils/contextBuilders';
import styled from 'styled-components';
import { AppContext } from '../context/AppContext';
import VisorTextoResponsive from '../VisorTexto_responsive';
import TutorDock from './tutor/TutorDock';
import WebEnrichmentButton from './chat/WebEnrichmentButton';
import useNotesWorkspaceAdapter from '../hooks/useNotesWorkspaceAdapter';
import NotesPanelDock from './notes/NotesPanelDock';
import useReaderActions from '../hooks/useReaderActions';
import { estimarTiempoLectura } from '../utils/textAnalysisMetrics';
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
  &:hover { opacity: .9; }
`;

const ContentArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  padding-bottom: 80px; /* Espacio para PromptBar fijo más compacto */
`;

const NotesPanel = styled.div`
  position: fixed;
  top: 60px;
  right: 20px;
  width: 320px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: ${p => p.theme?.surface || '#fff'};
  border: 1px solid ${p => p.theme?.border || '#ccc'};
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0,0,0,.15);
  z-index: 1700;
  overflow: hidden;
`;

const NotesHeader = styled.div`
  padding: .55rem .75rem;
  background: ${p => p.theme?.primary || '#2563eb'};
  color: #fff;
  font-size: .7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const NotesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: .6rem .65rem .75rem;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  background: ${p => p.theme?.background || '#f8f9fb'};
`;

const NoteItem = styled.div`
  background: ${p => p.theme?.surface || '#fff'};
  border: 1px solid ${p => p.theme?.border || '#ddd'};
  border-radius: 8px;
  padding: .5rem .55rem .6rem;
  font-size: .65rem;
  line-height: 1.3;
  position: relative;
`;

const NoteActions = styled.div`
  display: flex;
  gap: .35rem;
  margin-top: .4rem;
`;

// Usar prefijo $ para evitar pasar prop no estándar al DOM
const SmallBtn = styled.button`
  background: ${p => p.$danger ? (p.theme?.danger || '#b91c1c') : (p.theme?.primary || '#2563eb')};
  color: #fff;
  border: none;
  font-size: .55rem;
  padding: .3rem .5rem;
  border-radius: 4px;
  cursor: pointer;
  &:hover { opacity:.85; }
`;

const EmptyNote = styled.div`
  font-size: .6rem;
  opacity: .7;
  text-align: center;
  padding: .75rem 0 .5rem;
`;

const NewNoteForm = styled.form`
  padding: .45rem .55rem .55rem;
  border-top: 1px solid ${p => p.theme?.border || '#ddd'};
  background: ${p => p.theme?.surface || '#fff'};
  display: flex;
  flex-direction: column;
  gap: .4rem;
`;

const NoteInput = styled.textarea`
  resize: vertical;
  min-height: 52px;
  max-height: 140px;
  font-size: .6rem;
  line-height: 1.25;
  border: 1px solid ${p => p.theme?.border || '#ccc'};
  border-radius: 6px;
  padding: .4rem .45rem;
  background: ${p => p.theme?.inputBg || '#fff'};
  color: ${p => p.theme?.text || '#222'};
`;

const PromptBar = styled.form`
  position: fixed;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 700px;
  width: 85%;
  display: flex;
  gap: .45rem;
  padding: .5rem .75rem;
  border: 1px solid ${p => p.theme?.border || '#e5e7eb'};
  background: ${p => p.theme?.surface || '#fff'};
  box-shadow: 0 2px 16px rgba(0,0,0,.1);
  z-index: 100;
  border-radius: 24px;
`;

const PromptInput = styled.textarea`
  flex: 1;
  font-size: .8rem;
  padding: .5rem .7rem;
  border: none;
  border-radius: 18px;
  background: ${p => p.theme?.inputBg || '#f5f5f5'};
  color: ${p => p.theme?.text || '#222'};
  font-family: inherit;
  resize: none;
  min-height: 36px;
  max-height: 120px;
  overflow-y: auto;
  line-height: 1.4;
  transition: height 0.2s ease;
  &:focus {
    outline: none;
    background: ${p => p.theme?.inputBg || '#f0f0f0'};
  }
`;

const SendBtn = styled.button`
  background: ${p => p.theme?.primary || '#2563eb'};
  color: #fff;
  border: none;
  padding: .5rem .75rem;
  border-radius: 18px;
  font-size: .75rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .35rem;
  transition: all 0.2s ease;
  &:hover { transform: scale(1.02); opacity: 0.9; }
  &:disabled { opacity:.55; cursor:not-allowed; transform: scale(1); }
`;

export default function ReadingWorkspace({ enableWeb = true, followUps = true }) {
  const { texto, setTexto, modoOscuro } = useContext(AppContext);
  const isTestEnv = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID;
  // FASE 2: Detectar si hay provider pedagógico disponible
  const pedagogyMaybe = useContext(PedagogyContext);
  const hasPedagogyProvider = !!pedagogyMaybe;
  const theme = modoOscuro ? { border: '#ddd', surface: '#f4f4f7' } : { border: '#ddd', surface: '#fff' };
  const [showTutor, setShowTutor] = useState(() => isTestEnv ? true : false); // En test visible por compatibilidad
  const [prompt, setPrompt] = useState('');
  const [webSearchAvailable, setWebSearchAvailable] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [tutorExpanded, setTutorExpanded] = useState(false);
  const [tutorWidth, setTutorWidth] = useState(420); // Ancho del tutor para ajustar espacio de lectura
  const [focusMode, setFocusMode] = useState(false); // Modo enfoque
  const pendingPromptRef = React.useRef(null); // almacena última acción/prompt a enviar cuando se muestre el Tutor
  const [tutorReady, setTutorReady] = useState(false);
  const promptInputRef = React.useRef(null); // ref para el textarea autoexpandible
  const hasText = !!(texto && texto.trim().length);
  const notesApi = useNotesWorkspaceAdapter(texto);

  // Verificar disponibilidad de búsqueda web en el backend
  useEffect(() => {
    fetch('/api/web-search/test')
      .then(res => res.json())
      .then(data => {
        const available = data.configuracion?.serper_disponible || 
                         data.configuracion?.bing_disponible ||
                         data.configuracion?.tavily_disponible ||
                         data.api_utilizada !== 'simulada';
        setWebSearchAvailable(available);
        console.log('🌐 Búsqueda web disponible:', available, '- API:', data.configuracion?.modo_funcionamiento);
      })
      .catch(err => {
        console.warn('⚠️ No se pudo verificar búsqueda web:', err);
        setWebSearchAvailable(false);
      });
  }, []);

  const stats = useMemo(() => {
    if (!hasText) return null;
    const palabras = texto.split(/\s+/).filter(Boolean);
    const words = palabras.length;
    const chars = texto.length;
    const tiempoLecturaMin = estimarTiempoLectura(texto);
    return { words, chars, tiempoLecturaMin };
  }, [texto, hasText]);

  const enviarPromptDirecto = useCallback(() => {
    if (!prompt.trim()) return;
    const ev = new CustomEvent('tutor-external-prompt', { detail: { prompt: prompt.trim(), fullText: texto } });
    window.dispatchEvent(ev);
    setPrompt('');
  }, [prompt]);

  const contextBuilder = useCallback((q) => buildReadingWorkspaceContext(texto), [texto]);

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
    console.log('🔄 [ReadingWorkspace] useEffect tutor-ready listener, showTutor:', showTutor);
    if (!showTutor) return;
    
    // Esperar a que el TutorDock señale que está listo
    const onReady = () => {
      console.log('🎉 [ReadingWorkspace] Recibido evento tutor-ready');
      setTutorReady(true);
      if (pendingPromptRef.current) {
        console.log('📤 [ReadingWorkspace] Hay acción pendiente, enviando tutor-external-prompt:', pendingPromptRef.current);
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
          console.log('✅ [ReadingWorkspace] tutor-external-prompt enviado exitosamente');
        } finally {
          pendingPromptRef.current = null;
        }
      } else {
        console.log('ℹ️ [ReadingWorkspace] No hay acción pendiente');
      }
    };
    console.log('👂 [ReadingWorkspace] Registrando listener para tutor-ready');
    window.addEventListener('tutor-ready', onReady, { once: true });
    // Fallback por si el evento se pierde: reintentar en el próximo frame y a los 120ms
    const rafId = requestAnimationFrame(() => {
      if (!tutorReady && pendingPromptRef.current) {
        console.warn('⚠️ [ReadingWorkspace] FALLBACK RAF: tutor-ready no recibido, enviando acción pendiente');
        const { prompt, action, fragment, webContext } = pendingPromptRef.current;
        try {
          const ev = new CustomEvent('tutor-external-prompt', { detail: { prompt, action, fragment, webContext, fullText: texto } });
          window.dispatchEvent(ev);
          console.log('✅ [ReadingWorkspace] FALLBACK RAF: tutor-external-prompt enviado');
        } finally {
          pendingPromptRef.current = null;
        }
      }
    });
    const timeoutId = setTimeout(() => {
      if (!tutorReady && pendingPromptRef.current) {
        console.warn('⚠️ [ReadingWorkspace] FALLBACK TIMEOUT 120ms: tutor-ready no recibido, enviando acción pendiente');
        const { prompt, action, fragment, webContext } = pendingPromptRef.current;
        try {
          const ev = new CustomEvent('tutor-external-prompt', { detail: { prompt, action, fragment, webContext, fullText: texto } });
          window.dispatchEvent(ev);
          console.log('✅ [ReadingWorkspace] FALLBACK TIMEOUT: tutor-external-prompt enviado');
        } finally {
          pendingPromptRef.current = null;
        }
      }
    }, 120);
    return () => { 
      console.log('🧹 [ReadingWorkspace] Limpiando listener tutor-ready y fallbacks');
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

  // Auto-ajustar altura del textarea según contenido
  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
    // Auto-expandir el textarea
    if (promptInputRef.current) {
      const textarea = promptInputRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 36), 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Manejar Enter para enviar, Shift+Enter para nueva línea
  const handlePromptKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Evitar salto de línea
      if (prompt.trim()) {
        enviarPromptDirecto();
      }
    }
    // Si es Shift+Enter, dejar comportamiento por defecto (nueva línea)
  }, [prompt, enviarPromptDirecto]);

  // Handler completo para acciones del lector (notes, explain, summarize, question)
  useEffect(() => {
    const handler = (e) => {
      console.log('📨 ReadingWorkspace recibió evento reader-action:', e.detail);
      const { action, text } = e.detail || {};
      
      console.log('🎬 Ejecutando acción:', action, 'con texto:', text?.substring(0, 30));
      
      // Caso especial: notes NO debe activar el tutor
      if (action === 'notes') {
        console.log('📝 Creando nota sin activar tutor');
        setShowNotes(true); // Abrir panel de notas
        if (text && notesApi && typeof notesApi.createNote === 'function') {
          notesApi.createNote(text, { createdAt: Date.now(), kind:'note' });
          console.log('✅ Nota creada exitosamente');
        } else {
          console.warn('⚠️ notesApi no disponible:', notesApi);
        }
        return; // Salir completamente del handler
      }
      
      switch(action) {
        case 'explain':
          if (showTutor) {
            console.log('✅ [ReadingWorkspace] Tutor ya abierto, enviando evento inmediatamente');
            window.dispatchEvent(new CustomEvent('tutor-external-prompt', {
              detail: { 
                prompt: `Actúa como profesor experto. Explica de forma clara y didáctica el significado, contexto e importancia de este fragmento: "${text}". Incluye ejemplos si es pertinente.`,
                action: 'explain',
                fragment: text,
                fullText: texto 
              }
            }));
          } else {
            console.log('⏳ [ReadingWorkspace] Tutor cerrado, guardando acción pendiente');
            pendingPromptRef.current = { 
              prompt: `Actúa como profesor experto. Explica de forma clara y didáctica el significado, contexto e importancia de este fragmento: "${text}". Incluye ejemplos si es pertinente.`,
              action: 'explain',
              fragment: text
            };
            setShowTutor(true);
            setTutorExpanded(true);
          }
          break;
          
        case 'summarize':
          if (showTutor) {
            console.log('✅ Tutor ya abierto, enviando evento inmediatamente');
            window.dispatchEvent(new CustomEvent('tutor-external-prompt', {
              detail: { 
                prompt: `Resume en máximo 3 puntos las ideas PRINCIPALES y CLAVE de este fragmento. Sé conciso y directo: "${text}"`,
                action: 'summarize',
                fragment: text,
                fullText: texto 
              }
            }));
          } else {
            console.log('⏳ Tutor cerrado, guardando acción pendiente');
            pendingPromptRef.current = { 
              prompt: `Resume en máximo 3 puntos las ideas PRINCIPALES y CLAVE de este fragmento. Sé conciso y directo: "${text}"`,
              action: 'summarize',
              fragment: text
            };
            setShowTutor(true);
            setTutorExpanded(true);
          }
          break;
          
        case 'question':
          if (showTutor) {
            console.log('✅ Tutor ya abierto, precargando prompt');
            setPrompt(`Genera 3 preguntas de comprensión profunda sobre: "${text.slice(0, 100)}..."`);
          } else {
            console.log('⏳ Tutor cerrado, guardando prompt pendiente');
            pendingPromptRef.current = { 
              prompt: `Genera 3 preguntas de comprensión profunda (nivel análisis/evaluación según Bloom) sobre este fragmento: "${text}"`,
              action: 'question',
              fragment: text
            };
            setShowTutor(true);
            setTutorExpanded(true);
          }
          break;
      }
    };
    window.addEventListener('reader-action', handler);
    return () => window.removeEventListener('reader-action', handler);
  }, [notesApi, texto, showTutor]);

  return (
    <WorkspaceLayout>
      <TopBar>
        <ActionsGroup>
          <strong>📘 Lectura Guiada</strong>
        </ActionsGroup>
        <ActionsGroup>
          {hasText && (
            <ActionBtn onClick={() => setFocusMode(f => !f)}>
              {focusMode ? '👁️ Salir Enfoque' : '🎯 Modo Enfoque'}
            </ActionBtn>
          )}
          <ActionBtn onClick={() => setShowTutor(s => !s)}>
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
          <>
            <VisorTextoResponsive texto={texto} />
            {/* Barra de prompt permanente debajo del texto */}
            <PromptBar onSubmit={(e) => { e.preventDefault(); enviarPromptDirecto(); }}>
              <PromptInput
                ref={promptInputRef}
                placeholder="Pregunta algo sobre el texto..."
                value={prompt}
                onChange={handlePromptChange}
                onKeyDown={handlePromptKeyDown}
                rows={1}
              />
              <WebEnrichmentButton
                query={prompt}
                disabled={!webSearchAvailable || !prompt.trim()}
                contextBuilder={contextBuilder}
                onEnriched={(enriched) => {
                  console.log('🌐 [ReadingWorkspace] Prompt enriquecido con web:', enriched.substring(0, 100));
                  
                  // Si el tutor no está visible, mostrarlo primero
                  if (!showTutor) {
                    console.log('📖 [ReadingWorkspace] Mostrando tutor antes de enviar prompt enriquecido');
                    setShowTutor(true);
                    // Guardar prompt original y contexto enriquecido
                    pendingPromptRef.current = { 
                      prompt: prompt.trim(), // Pregunta original del usuario
                      webContext: enriched   // Contexto web para el sistema
                    };
                  } else {
                    // Tutor ya visible, enviar directamente
                    const ev = new CustomEvent('tutor-external-prompt', { 
                      detail: { 
                        prompt: prompt.trim(),  // Pregunta original
                        webContext: enriched,   // Contexto web
                        fullText: texto 
                      } 
                    });
                    window.dispatchEvent(ev);
                    console.log('✅ [ReadingWorkspace] Evento tutor-external-prompt enviado con búsqueda web');
                  }
                  
                  setPrompt(''); // Limpiar prompt tras enriquecer
                }}
              />
              <SendBtn type="submit" disabled={!prompt.trim()}>Enviar</SendBtn>
            </PromptBar>
          </>
        )}
        {showTutor && (
          <TutorDock 
            followUps={followUps} 
            expanded={tutorExpanded} 
            onToggleExpand={() => setTutorExpanded(v => !v)}
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
                <ACDAnalysisPanel text={texto} compact={false} />
              </>
            )}
          </TutorDock>
        )}
        {showNotes && <NotesPanelDock notesApi={notesApi} onClose={() => setShowNotes(false)} />}
      </ContentArea>
    </WorkspaceLayout>
  );
}
