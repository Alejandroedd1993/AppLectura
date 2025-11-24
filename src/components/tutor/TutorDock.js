import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import styled from 'styled-components';
import TutorCore from './TutorCore';
import useTutorPersistence from '../../hooks/useTutorPersistence';
import useFollowUpQuestion from '../../hooks/useFollowUpQuestion';
import useReaderActions from '../../hooks/useReaderActions';
import { AppContext } from '../../context/AppContext';
import { generateTextHash } from '../../utils/cache';

/**
 * Función simple para convertir markdown básico a HTML
 * Soporta: **negrita**, *cursiva*, `código`, listas, links
 */
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // Escapar HTML peligroso primero
  html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');
  
  // **negrita**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // *cursiva*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // `código`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Listas numeradas (1. Item)
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');
  
  // Listas con viñetas (- Item o * Item)
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    // Solo convertir a <ul> si no está ya dentro de <ol>
    return match.includes('<ol>') ? match : `<ul>${match}</ul>`;
  });
  
  // Links [texto](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Párrafos (doble salto de línea)
  html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');
  
  return html;
}

const DockWrapper = styled.div`
  position: fixed;
  right: ${p => p.$expanded ? '0' : '1.25rem'};
  bottom: ${p => p.$expanded ? 'auto' : '1.25rem'};
  top: ${p => p.$expanded ? '0' : 'auto'};
  width: ${p => p.$width ? `${p.$width}px` : (p.$expanded ? '420px' : '320px')};
  min-width: 320px;
  max-width: ${p => p.$expanded ? '800px' : '420px'};
  height: ${p => p.$expanded ? '100vh' : 'auto'};
  max-height: ${p => p.$expanded ? 'none' : '420px'};
  display: flex;
  flex-direction: column;
  background: ${p => p.theme?.surface || '#fff'};
  border: 1px solid ${p => p.theme?.border || '#ccc'};
  border-radius: ${p => p.$expanded ? '12px 0 0 12px' : '14px'};
  box-shadow: 0 10px 28px rgba(0,0,0,.18);
  font-size: .85rem;
  overflow: hidden;
  z-index: 1600;
  transition: ${p => p.$isResizing ? 'none' : 'width 0.2s ease'};
`;

const ResizeHandle = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s ease;
  z-index: 10;
  
  &:hover {
    background: ${p => p.theme?.primary || '#2563eb'}40;
  }
  
  &::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 40px;
    background: ${p => p.theme?.primary || '#2563eb'};
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover::after {
    opacity: 0.6;
  }
`;

const DockHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .5rem .75rem;
  background: linear-gradient(90deg, ${p => p.theme?.primary || '#2563eb'} 0%, ${p => p.theme?.accent || '#1d4ed8'} 100%);
  color: #fff;
  font-weight: 600;
  font-size: .8rem;
  gap: .4rem;
  flex-wrap: wrap;
  transition: max-height .3s ease, padding .3s ease, opacity .25s ease;
  max-height: ${p => p.$hidden ? '0' : '300px'}; /* Aumentado de 200px a 300px para más espacio */
  padding: ${p => p.$hidden ? '0 .75rem' : '.5rem .75rem'};
  opacity: ${p => p.$hidden ? 0 : 1};
  overflow: ${p => p.$hidden ? 'hidden' : 'visible'}; /* Cambio clave: visible cuando no está oculto */
`;

const Messages = styled.div`
  flex: 1;
  padding: .65rem .85rem .9rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: .6rem;
  background: ${p => p.theme?.background || '#f8f9fb'};
`;

const Msg = styled.div`
  align-self: ${p => p.$user ? 'flex-end' : 'flex-start'};
  background: ${p => p.$user ? (p.theme?.primary || '#2563eb') : (p.theme?.surface || '#fff')};
  color: ${p => p.$user ? '#fff' : (p.theme?.text || '#222')};
  padding: .6rem .75rem;
  border-radius: 14px;
  max-width: 88%;
  line-height: 1.45;
  font-size: .78rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.08);
  border: ${p => p.$user ? 'none' : `1px solid ${p.theme?.border || '#e5e7eb'}`};
  white-space: pre-wrap;
  
  /* Soporte para markdown renderizado */
  strong { font-weight: 700; }
  em { font-style: italic; }
  code { 
    background: ${p => p.$user ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'};
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  ul, ol {
    margin: 4px 0;
    padding-left: 20px;
  }
  li {
    margin: 2px 0;
    line-height: 1.5;
  }
  p {
    margin: 4px 0;
    line-height: 1.5;
    &:first-child { margin-top: 0; }
    &:last-child { margin-bottom: 0; }
  }
  h1, h2, h3, h4 {
    font-weight: 600;
    margin: 6px 0 3px 0;
    line-height: 1.4;
    &:first-child { margin-top: 0; }
  }
  h1 { font-size: 1.1em; }
  h2 { font-size: 1.05em; }
  h3 { font-size: 1em; }
  a {
    color: ${p => p.$user ? '#fff' : (p.theme?.primary || '#2563eb')};
    text-decoration: underline;
  }
`;

const LoadingIndicator = styled(Msg)`
  animation: pulse 1.5s ease-in-out infinite;
  opacity: 0.85;
  background: ${p => p.theme?.primary || '#2563eb'}15;
  border: 1px dashed ${p => p.theme?.primary || '#2563eb'}40;
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.85;
    }
    50% {
      opacity: 1;
    }
  }
`;

const Footer = styled.form`
  padding: .4rem .55rem .55rem;
  border-top: 1px solid ${p => p.theme?.border || '#ddd'};
  background: ${p => p.theme?.surface || '#fff'};
  display: flex;
  gap: .4rem;
`;

const CompactBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 10px;
  background: transparent;
`;

const MiniHandle = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,.25);
  color: #fff;
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 999px;
  font-size: .7rem;
  padding: .15rem .4rem;
  cursor: pointer;
  display: ${p => p.$visible ? 'inline-flex' : 'none'};
  align-items: center;
  gap: .3rem;
  backdrop-filter: blur(2px);
`;

const Input = styled.textarea`
  flex: 1;
  font-size: .7rem;
  border: 1px solid ${p => p.theme?.border || '#ccc'};
  padding: .4rem .5rem;
  border-radius: 6px;
  background: ${p => p.theme?.inputBg || '#fff'};
  color: ${p => p.theme?.text || '#222'};
  font-family: inherit;
  resize: none;
  min-height: 32px;
  max-height: 120px;
  overflow-y: auto;
  line-height: 1.4;
  transition: height 0.2s ease;
`;

const Btn = styled.button`
  font-size: .7rem;
  background: ${p => p.theme?.accent || p.theme?.primary || '#2563eb'};
  color: #fff;
  border: none;
  padding: .4rem .6rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .25rem;
  &:disabled { opacity: .5; cursor: not-allowed; }
`;

const HeaderSelect = styled.select`
  font-size: .73rem;
  padding: .25rem .4rem;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.4);
  background: rgba(255,255,255,.25);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  
  option {
    background: ${p => p.theme?.surface || '#fff'};
    color: ${p => p.theme?.text || '#222'};
    font-weight: 500;
  }
  
  &:hover {
    background: rgba(255,255,255,.35);
  }
`;

const HeaderButton = styled.button`
  background: rgba(255,255,255,.25);
  color: #fff;
  border: 1px solid rgba(255,255,255,.4);
  cursor: pointer;
  font-size: .73rem;
  border-radius: 6px;
  padding: .25rem .5rem;
  font-weight: 500;
  
  &:hover {
    background: rgba(255,255,255,.35);
  }
  
  &.danger {
    background: rgba(255,100,100,.4);
    &:hover {
      background: rgba(255,100,100,.5);
    }
  }
`;

const ToggleFab = styled.button`
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  background: ${p => p.theme?.primary || '#2563eb'};
  color: #fff;
  border: none;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  font-size: 1.1rem;
  box-shadow: 0 6px 18px rgba(0,0,0,.25);
  cursor: pointer;
  z-index: 1580;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default function TutorDock({ followUps, expanded = false, onToggleExpand }) {
  const appCtx = useContext(AppContext) || {};
  const { texto } = appCtx;
  const [open, setOpen] = useState(true);
  const [compact, setCompact] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tutorCompactMode') || 'false'); } catch { return false; }
  });
  const [headerHidden, setHeaderHidden] = useState(false);
  const [pendingExternal, setPendingExternal] = useState(null); // último prompt accionado por selección
  
  // Estado de redimensionamiento
  const [width, setWidth] = useState(() => {
    try { 
      const saved = localStorage.getItem('tutorDockWidth');
      return saved ? parseInt(saved, 10) : 420;
    } catch { 
      return 420; 
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  // Historial por texto: clave depende del hash del texto actual
  const textHash = useMemo(() => {
    try { return texto ? generateTextHash(texto, 'tutor') : 'tutor_empty'; } catch { return 'tutor_empty'; }
  }, [texto]);

  const { initialMessages, handleMessagesChange } = useTutorPersistence({ storageKey: `tutorHistorial:${textHash}`, max: 40 });
  // Preferencia de follow-ups: si no viene prop, leer de localStorage (apagado por defecto)
  const [followUpsEnabled, setFollowUpsEnabled] = useState(() => {
    if (typeof followUps === 'boolean') return followUps;
    try { const s = localStorage.getItem('tutorFollowUpsEnabled'); return s ? JSON.parse(s) : false; } catch { return false; }
  });
  useEffect(() => {
    if (typeof followUps === 'boolean') {
      setFollowUpsEnabled(followUps);
    }
  }, [followUps]);
  const { onAssistantMessage } = useFollowUpQuestion({ enabled: followUpsEnabled });
  const { currentUser } = useContext(AppContext); // 🆕 Usar currentUser del contexto
  const [convos, setConvos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tutorConvos') || '[]'); } catch { return []; }
  });
  const [selectedConvo, setSelectedConvo] = useState('');
  
  // 🆕 RESTAURAR conversaciones guardadas desde Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      console.log('📚 [Tutor] Sin usuario autenticado, no se cargan conversaciones');
      return;
    }
    
    console.log(`📚 [Tutor] Cargando conversaciones guardadas para usuario: ${currentUser.uid}`);
    
    let unsubscribe = null;
    
    const loadSavedConversations = async () => {
      try {
        const { subscribeToStudentProgress } = await import('../../firebase/firestore');
        
        unsubscribe = subscribeToStudentProgress(
          currentUser.uid, 
          'tutor_conversations',
          (data) => {
            console.log('📚 [Tutor] Datos recibidos de Firestore:', data);
            
            if (data?.conversations && Array.isArray(data.conversations)) {
              const remoteConvos = data.conversations;
              const localConvos = JSON.parse(localStorage.getItem('tutorConvos') || '[]');
              
              console.log(`📚 [Tutor] Comparando: ${remoteConvos.length} remotas vs ${localConvos.length} locales`);
              
              // Merge: priorizar remoto si tiene más conversaciones
              const merged = remoteConvos.length >= localConvos.length ? remoteConvos : localConvos;
              
              setConvos(merged);
              localStorage.setItem('tutorConvos', JSON.stringify(merged));
              console.log(`✅ [Tutor] ${merged.length} conversaciones restauradas desde Firestore`);
            } else {
              console.log('📚 [Tutor] No hay conversaciones guardadas en Firestore aún');
            }
          }
        );
      } catch (error) {
        console.warn('⚠️ [Tutor] Error cargando conversaciones desde Firestore:', error);
      }
    };
    
    loadSavedConversations();
    
    return () => {
      if (unsubscribe) {
        console.log('🔌 [Tutor] Desconectando listener de conversaciones');
        unsubscribe();
      }
    };
  }, [currentUser]);
  const [lengthMode, setLengthMode] = useState(() => {
    try { return localStorage.getItem('tutorLengthMode') || 'auto'; } catch { return 'auto'; }
  });
  const [temperature, setTemperature] = useState(() => {
    try { 
      const saved = localStorage.getItem('tutorTemperature');
      return saved ? parseFloat(saved) : 0.7;
    } catch { 
      return 0.7; 
    }
  });

  // Ref para el textarea autoexpandible del chat
  const chatInputRef = React.useRef(null);
  // Ref para el contenedor de mensajes (para auto-scroll)
  const messagesRef = React.useRef(null);

  const handleToggle = () => setOpen(o => !o);

  // Redimensionamiento con mouse
  const handleMouseDown = useCallback((e) => {
    if (!expanded) return; // Solo redimensionar cuando está expandido
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX; // Invertido porque el borde está a la izquierda
      const newWidth = Math.max(320, Math.min(800, startWidth + deltaX));
      setWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('tutorDockWidth', width.toString());
      } catch (e) {
        console.warn('No se pudo guardar el ancho del tutor:', e);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [expanded, width]);

  // Notificar cambios de ancho al workspace para ajustar espacio de lectura
  useEffect(() => {
    if (expanded) {
      const event = new CustomEvent('tutor-width-change', { detail: { width } });
      window.dispatchEvent(event);
    }
  }, [width, expanded]);

  // Auto-ocultar header al hacer scroll cuando compact === true
  const onScroll = useCallback((e) => {
    if (!compact) {
      setHeaderHidden(false);
      return;
    }
    const el = e.currentTarget;
    const y = el.scrollTop;
    // Ocultar header cuando scroll > 30px para evitar parpadeo
    setHeaderHidden(y > 30);
  }, [compact]);

  return (
    <TutorCore 
      onBusyChange={() => {}} 
      initialMessages={initialMessages}
      onMessagesChange={handleMessagesChange}
      onAssistantMessage={onAssistantMessage}
    >
      {(api) => {
        // Establecer contexto base con el texto completo cuando cambie
        useEffect(() => {
          try { api.setContext({ fullText: texto || '', lengthMode, temperature }); } catch { /* noop */ }
        }, [texto, lengthMode, temperature, api]);

        // Reiniciar/rehidratar historial al cambiar de texto
        useEffect(() => {
          try {
            // Intentar rehidratar historial del hash actual
            const raw = localStorage.getItem(`tutorHistorial:${textHash}`);
            if (raw) {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr)) {
                const restored = arr.map(o => ({ role: o.r || o.role, content: o.c || o.content })).filter(m => m.content);
                api.loadMessages(restored);
                return;
              }
            }
            // Si no hay historial para este texto, limpiar mensajes
            api.clear();
          } catch { /* noop */ }
  // eslint-disable-next-line
        }, [textHash]);
        // Suscribir acciones del visor SOLO cuando está montado el dock
        useReaderActions({
          onPrompt: ({ prompt, action, fragment }) => {
            setPendingExternal(action);
            if (action && fragment) {
              // Ajustar lengthMode recomendado por acción
              try {
                if (action === 'summarize') api.setContext({ lengthMode: 'breve' });
                else if (action === 'explain') api.setContext({ lengthMode: 'media' });
                else if (action === 'deep') api.setContext({ lengthMode: 'detallada' });
                else if (action === 'question') api.setContext({ lengthMode: 'breve' });
              } catch { /* noop */ }
              api.sendAction(action, fragment, {});
            } else if (prompt) {
              api.sendPrompt(prompt);
            }
          }
        });

        // Escuchar prompts externos (ej: enriquecimiento web en ReadingWorkspace)
        useEffect(() => {
          const handler = (e) => {
            try {
              const detail = e?.detail || {};
              const { action, fragment, fullText, prompt, webContext } = detail;
              if (action && fragment) {
                // Ajustar lengthMode por acción antes de enviar
                try {
                  if (action === 'summarize') api.setContext({ lengthMode: 'breve' });
                  else if (action === 'explain') api.setContext({ lengthMode: 'media' });
                  else if (action === 'deep') api.setContext({ lengthMode: 'detallada' });
                  else if (action === 'question') api.setContext({ lengthMode: 'breve' });
                } catch { /* noop */ }
                api.sendAction(action, fragment, { fullText });
              } else if (prompt && typeof prompt === 'string') {
                if (fullText) { try { api.setContext({ fullText }); } catch {} }
                // Si hay webContext, agregarlo al contexto del sistema antes de enviar
                if (webContext) {
                  console.log('🌐 [TutorDock] Agregando contexto web al sistema');
                  try { 
                    api.setContext({ webEnrichment: webContext }); 
                  } catch (e) {
                    console.warn('⚠️ [TutorDock] Error agregando webContext:', e);
                  }
                }
                api.sendPrompt(prompt);
              }
            } catch { /* noop */ }
          };
          window.addEventListener('tutor-external-prompt', handler);
          return () => window.removeEventListener('tutor-external-prompt', handler);
        }, [api]);

        // Auto-scroll cuando aparece el indicador de loading o nuevos mensajes
        useEffect(() => {
          if (messagesRef.current) {
            // Scroll al final cuando cambia el estado de loading o cuando hay nuevos mensajes
            const timer = setTimeout(() => {
              if (messagesRef.current) {
                messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
              }
            }, 100);
            return () => clearTimeout(timer);
          }
        }, [api.loading, api.messages.length]);

        // Señalizar que el dock está listo (listeners activos). Pequeño retraso para asegurar que
        // los effects internos y del hook useReaderActions estén suscritos antes de notificar.
        useEffect(() => {
          console.log('🎯 [TutorDock] useEffect montaje ejecutado, programando tutor-ready');
          const t = setTimeout(() => {
            console.log('🎯 [TutorDock] Disparando evento tutor-ready');
            try { 
              window.dispatchEvent(new CustomEvent('tutor-ready')); 
              console.log('✅ [TutorDock] Evento tutor-ready disparado exitosamente');
            } catch (err) {
              console.error('❌ [TutorDock] Error disparando tutor-ready:', err);
            }
          }, 0);
          return () => {
            console.log('🎯 [TutorDock] Limpiando timeout de tutor-ready');
            clearTimeout(t);
          };
        }, []);

        return (
          <>
            {!open && !expanded && (
              <ToggleFab onClick={handleToggle} title="Mostrar tutor">
                🧑‍🏫
              </ToggleFab>
            )}
            {open && (
              <DockWrapper $expanded={expanded} $width={expanded ? width : null} $isResizing={isResizing}>
                {expanded && <ResizeHandle onMouseDown={handleMouseDown} title="Arrastra para redimensionar" />}
                <DockHeader $hidden={headerHidden}>
                  <span>🧑‍🏫 Tutor Inteligente</span>
                  <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', alignItems:'center' }}>
                    {/* Selector de extensión de respuestas */}
                    <HeaderSelect 
                      value={lengthMode} 
                      onChange={(e) => { const v = e.target.value; setLengthMode(v); try { localStorage.setItem('tutorLengthMode', v); } catch {} }} 
                      title="Controla qué tan extensas son las respuestas del tutor"
                    >
                      <option value="auto">📏 Automático</option>
                      <option value="breve">⚡ Breve</option>
                      <option value="media">📝 Media</option>
                      <option value="detallada">📖 Detallada</option>
                    </HeaderSelect>

                    {/* Selector de temperatura (creatividad) */}
                    <HeaderSelect 
                      value={temperature} 
                      onChange={(e) => { 
                        const v = parseFloat(e.target.value); 
                        setTemperature(v); 
                        try { 
                          localStorage.setItem('tutorTemperature', v.toString());
                          // Actualizar contexto inmediatamente
                          try { api.setContext({ temperature: v }); } catch {}
                        } catch {} 
                      }} 
                      title={`Controla la creatividad de las respuestas (${temperature}). Más bajo = más determinista, más alto = más creativo`}
                    >
                      <option value="0.3">🎯 Determinista (0.3)</option>
                      <option value="0.5">⚖️ Equilibrado (0.5)</option>
                      <option value="0.7">💡 Creativo (0.7)</option>
                      <option value="0.9">✨ Muy Creativo (0.9)</option>
                      <option value="1.0">🚀 Máximo (1.0)</option>
                    </HeaderSelect>

                    {/* Botón de guardar conversación */}
                    <HeaderButton 
                      onClick={async () => {
                        try {
                          console.log('💾 [Tutor] Guardando conversación...');
                          
                          const now = new Date();
                          const compactMsgs = (msgs) => msgs.map(m => ({ r: m.role, c: m.content }));
                          const current = compactMsgs(api.messages || []);
                          const item = { name: now.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }), data: current, textHash };
                          const next = [...(Array.isArray(convos)?convos:[]), item];
                          
                          localStorage.setItem('tutorConvos', JSON.stringify(next));
                          setConvos(next);
                          console.log(`💾 [Tutor] Guardado en localStorage: ${next.length} conversaciones`);
                          
                          // 🆕 SINCRONIZAR con Firestore si hay usuario autenticado
                          if (currentUser?.uid) {
                            console.log(`💾 [Tutor] Sincronizando con Firestore para usuario: ${currentUser.uid}`);
                            try {
                              const { saveStudentProgress } = await import('../../firebase/firestore');
                              await saveStudentProgress(currentUser.uid, 'tutor_conversations', {
                                conversations: next,
                                lastSync: new Date().toISOString()
                              });
                              console.log('✅ [Tutor] Conversaciones sincronizadas con Firestore');
                            } catch (error) {
                              console.error('❌ [Tutor] Error sincronizando con Firestore:', error);
                            }
                          } else {
                            console.warn('⚠️ [Tutor] No hay usuario autenticado, solo guardado local');
                          }
                          
                          alert('✅ Conversación guardada exitosamente');
                        } catch (error) {
                          console.error('❌ [Tutor] Error guardando conversación:', error);
                          alert('❌ Error al guardar conversación');
                        }
                      }} 
                      title="💾 Guardar esta conversación para revisar después"
                    >
                      💾 Guardar
                    </HeaderButton>

                    {/* Selector y botón de cargar conversaciones guardadas */}
                    {convos.length > 0 && (
                      <>
                        <HeaderSelect 
                          value={selectedConvo} 
                          onChange={(e) => setSelectedConvo(e.target.value)} 
                          style={{ maxWidth: '150px' }} 
                          title="Selecciona una conversación guardada"
                        >
                          <option value="">📚 Guardadas ({convos.length})</option>
                          {Array.isArray(convos) && convos.map((c, idx) => (
                            <option key={idx} value={idx}>{c.name || `Conversación ${idx+1}`}</option>
                          ))}
                        </HeaderSelect>
                        {selectedConvo !== '' && (
                          <HeaderButton 
                            onClick={() => {
                              try {
                                const idx = parseInt(selectedConvo, 10);
                                const item = Array.isArray(convos) ? convos[idx] : null;
                                if (item && Array.isArray(item.data)) {
                                  const restored = item.data.map(o => ({ role:o.r, content:o.c }));
                                  api.loadMessages(restored);
                                  alert('✅ Conversación cargada');
                                }
                              } catch {}
                            }} 
                            title="📂 Cargar la conversación seleccionada"
                          >
                            📂 Cargar
                          </HeaderButton>
                        )}
                      </>
                    )}

                    {/* Botón de limpiar historial */}
                    <HeaderButton 
                      className="danger"
                      onClick={() => {
                        if (window.confirm('¿Seguro que quieres borrar todo el historial de esta conversación?')) {
                          try { api.clear(); localStorage.setItem('tutorHistorial', '[]'); } catch {}
                        }
                      }} 
                      title="🧹 Borrar todo el historial de la conversación actual"
                    >
                      🧹 Limpiar
                    </HeaderButton>

                    {/* Botón de expandir/contraer */}
                    {onToggleExpand && (
                      <HeaderButton 
                        onClick={onToggleExpand || (()=>{})} 
                        title={expanded ? 'Contraer el tutor a tamaño pequeño' : 'Expandir el tutor a pantalla completa lateral'}
                      >
                        {expanded ? '⬅️ Contraer' : '➡️ Expandir'}
                      </HeaderButton>
                    )}

                    {/* Modo compacto (auto-oculta cabecera al hacer scroll) */}
                    <label 
                      style={{ display:'flex', alignItems:'center', gap:'.4rem', fontSize:'.73rem', background:'rgba(255,255,255,.25)', padding:'.25rem .5rem', borderRadius:'6px', cursor: 'pointer', fontWeight: '500', border: '1px solid rgba(255,255,255,.4)' }} 
                      title="📐 Modo compacto: oculta esta barra automáticamente cuando haces scroll hacia abajo en la conversación. Ideal para ver más mensajes. Desliza hacia arriba para que reaparezca."
                    >
                      <input 
                        type="checkbox" 
                        checked={compact} 
                        onChange={() => { const next = !compact; setCompact(next); try { localStorage.setItem('tutorCompactMode', JSON.stringify(next)); } catch {} }} 
                      /> 
                      📐 Compacto
                    </label>

                    {/* Preguntas de seguimiento automáticas */}
                    <label 
                      style={{ display:'flex', alignItems:'center', gap:'.4rem', fontSize:'.73rem', background:'rgba(255,255,255,.25)', padding:'.25rem .5rem', borderRadius:'6px', cursor: 'pointer', fontWeight: '500', border: '1px solid rgba(255,255,255,.4)' }} 
                      title="💡 Preguntas de seguimiento: el tutor sugiere automáticamente preguntas relacionadas después de cada respuesta"
                    >
                      <input 
                        type="checkbox" 
                        checked={followUpsEnabled} 
                        onChange={() => {
                          const next = !followUpsEnabled; setFollowUpsEnabled(next); try { localStorage.setItem('tutorFollowUpsEnabled', JSON.stringify(next)); } catch {}
                        }} 
                      /> 
                      💡 Seguimiento
                    </label>

                    {/* Botón de cerrar */}
                    <HeaderButton 
                      onClick={handleToggle} 
                      style={{ background:'transparent', border:'none', fontSize:'1rem', padding: '.2rem .4rem' }}
                      title="Cerrar el tutor"
                    >
                      ✖
                    </HeaderButton>
                  </div>
                </DockHeader>
                <MiniHandle $visible={compact && headerHidden} onClick={() => setHeaderHidden(false)} title={expanded ? 'Mostrar cabecera' : 'Mostrar cabecera'}>
                  ☰ Opciones
                </MiniHandle>
                <Messages ref={messagesRef} onScroll={onScroll}>
                  {api.messages.length === 0 && (
                    <Msg $user={false}>Selecciona texto y usa la toolbar (Explicar, Resumir, etc.) o escribe una pregunta.</Msg>
                  )}
                  {api.messages.map(m => (
                    <Msg 
                      key={m.id} 
                      $user={m.role === 'user'}
                      dangerouslySetInnerHTML={{ 
                        __html: m.role === 'user' ? m.content : parseMarkdown(m.content) 
                      }}
                    />
                  ))}
                  {api.loading && (
                    <LoadingIndicator $user={false}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          border: '2px solid',
                          borderColor: 'transparent',
                          borderTopColor: 'currentColor',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                        Pensando...
                      </span>
                      <style>{`
                        @keyframes spin {
                          to { transform: rotate(360deg); }
                        }
                      `}</style>
                    </LoadingIndicator>
                  )}
                </Messages>
                <Footer onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('tutorUserInput');
                  const value = input.value.trim();
                  if (!value) return;
                  api.sendPrompt(value);
                  input.value='';
                  // Resetear altura del textarea después de enviar
                  if (chatInputRef.current) {
                    chatInputRef.current.style.height = '32px';
                  }
                }}>
                  <Input 
                    ref={chatInputRef}
                    name="tutorUserInput" 
                    placeholder="Haz una pregunta..." 
                    autoComplete="off"
                    rows={1}
                    onChange={(e) => {
                      const textarea = e.target;
                      // Auto-expandir textarea entre 32px y 120px
                      textarea.style.height = 'auto';
                      const newHeight = Math.min(Math.max(textarea.scrollHeight, 32), 120);
                      textarea.style.height = `${newHeight}px`;
                    }}
                  />
                  <Btn type="submit" disabled={api.loading}>
                    {api.loading ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          border: '2px solid rgba(255,255,255,0.5)',
                          borderTopColor: 'rgba(255,255,255,1)',
                          borderRadius: '50%',
                          animation: 'spin 0.6s linear infinite'
                        }} />
                        Enviando...
                      </span>
                    ) : 'Enviar'}
                  </Btn>
                </Footer>
              </DockWrapper>
            )}
          </>
        );
      }}
    </TutorCore>
  );
}
