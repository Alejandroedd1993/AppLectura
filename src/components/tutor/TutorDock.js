import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import styled from 'styled-components';
import TutorCore from './TutorCore';
import useTutorPersistence from '../../hooks/useTutorPersistence';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import useFollowUpQuestion from '../../hooks/useFollowUpQuestion';
import useReaderActions from '../../hooks/useReaderActions';
import { AppContext, BACKEND_URL } from '../../context/AppContext';
import { generateTextHash } from '../../utils/cache';
import { updateCurrentSession } from '../../services/sessionManager';
import { useAuth } from '../../context/AuthContext';

/**
 * Función simple para convertir markdown básico a HTML
 * Soporta: **negrita**, *cursiva*, `código`, listas, links
 */
function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHref(url) {
  try {
    const raw = String(url || '').trim();
    if (!raw) return null;
    // Quitar entidades típicas si vinieron de un escape previo
    const normalized = raw.replace(/&amp;/g, '&');
    const parsed = new URL(normalized, window.location.origin);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function renderPlainText(text) {
  return escapeHtml(text).replace(/\n/g, '<br/>');
}

function parseMarkdown(text) {
  if (!text) return '';

  // Escapar HTML peligroso primero
  let html = escapeHtml(text);

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

  // Links [texto](url) - sanitizar protocolo y escapar href
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, linkText, linkUrl) => {
    const href = sanitizeHref(linkUrl);
    if (!href) return `${linkText} (${linkUrl})`;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  });

  // Párrafos (doble salto de línea)
  html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');

  return html;
}

function TutorDockEffects({
  api,
  texto,
  currentTextoId,
  lengthMode,
  temperature,
  userId,
  textHash,
  initialMessages,
  messagesRef,
  setIsSaving,
  setPendingExternal,
  followUpsEnabled,
}) {
  // api cambia de identidad con frecuencia (se construye en TutorCore).
  // Guardamos una referencia estable para usarla dentro de effects sin depender de `api`.
  const apiRef = React.useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  // 🆕 Sincronización automática con SessionManager (Global Session)
  // Esto asegura que el historial actual se guarde en la sesión global y en Firestore
  useEffect(() => {
    const timer = setTimeout(() => {
      if (api.messages && api.messages.length > 0) {
        setIsSaving(true);
        // Solo actualizar si hay mensajes (evitar sobrescribir con vacío al inicio)
        const compact = (Array.isArray(api.messages) ? api.messages : [])
          .map(m => ({ r: m?.role, c: m?.content }))
          .filter(m => m?.c)
          .slice(-40);
        updateCurrentSession({ tutorHistory: compact });

        // Resetear indicador después de 1s
        setTimeout(() => setIsSaving(false), 1000);
      }
    }, 3000); // Debounce de 3s para no saturar
    return () => clearTimeout(timer);
  }, [api.messages, setIsSaving]);

    // Establecer contexto base con el texto completo y lectureId cuando cambie
    useEffect(() => {
      const lectureIdToSet = currentTextoId || 'global';
      try {
        api.setContext({
          fullText: texto || '',
          lengthMode,
          temperature,
          lectureId: lectureIdToSet
        });
      } catch { /* noop */ }
    }, [texto, lengthMode, temperature, currentTextoId, api]);

  // Reiniciar/rehidratar historial al cambiar de texto
  useEffect(() => {
    try {
      const currentApi = apiRef.current;
      // Invalida peticiones del texto anterior sin sobrescribir historial del nuevo texto.
      try { currentApi.cancelPending?.(); } catch { /* noop */ }

      if (Array.isArray(initialMessages) && initialMessages.length > 0) {
        currentApi.loadMessages(initialMessages);
        return;
      }

      // Si no hay historial para este texto, limpiar mensajes
      currentApi.clear();
    } catch { /* noop */ }
  }, [textHash, userId, initialMessages]);

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
          if (fullText) { try { api.setContext({ fullText }); } catch { } }
          // Si hay webContext, agregarlo al contexto del sistema antes de enviar
          if (webContext) {
            console.log('🌐 [TutorDock] Agregando contexto web al sistema');
            try {
              api.setContext({ webEnrichment: webContext });
            } catch (err) {
              console.warn('⚠️ [TutorDock] Error agregando webContext:', err);
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
  }, [api.loading, api.messages.length, messagesRef]);

  // Señalizar que el dock está listo (listeners activos).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('tutor-ready'));
      } catch { /* noop */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Reservado para futuras dependencias (por ejemplo, seguimiento)
  void followUpsEnabled;

  return null;
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

const SettingsPanel = styled.div`
  background: ${p => p.theme?.surface || '#fff'};
  border-bottom: 1px solid ${p => p.theme?.border || '#ccc'};
  padding: .5rem .75rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  font-size: .75rem;
  color: ${p => p.theme?.text || '#222'};
  animation: slideDown 0.2s ease-out;
  
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  label {
    display: flex;
    align-items: center;
    gap: .3rem;
    cursor: pointer;
  }

  select {
    padding: .2rem .4rem;
    border-radius: 4px;
    border: 1px solid ${p => p.theme?.border || '#ccc'};
    background: ${p => p.theme?.inputBg || '#fff'};
    color: ${p => p.theme?.text || '#222'};
    font-size: .75rem;
  }
`;

const SettingsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
`;

const SettingsDivider = styled.hr`
  border: none;
  border-top: 1px solid ${p => p.theme?.border || '#e5e7eb'};
  margin: .1rem 0;
  width: 100%;
`;

const ActionButton = styled.button`
  border: none;
  border-radius: 5px;
  padding: .3rem .55rem;
  cursor: pointer;
  font-size: .7rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  transition: opacity 0.15s, filter 0.15s;
  &:disabled { opacity: .45; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.1); }
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

// VERSION MARKER: v3.0.1-performance-fix-jan26
export default function TutorDock({ followUps, expanded = false, onToggleExpand, onClose }) {
  const appCtx = useContext(AppContext) || {};
  const { texto, currentTextoId } = appCtx;
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'guest';
  const [open, setOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  // 🚀 PERF: headerHidden nunca cambia (siempre false), usar constante
  const headerHidden = false;
  // 🚀 PERF: _pendingExternal solo se escribe, nunca se lee para render → usar ref
  const pendingExternalRef = React.useRef(null);
  const setPendingExternal = useCallback((v) => { pendingExternalRef.current = v; }, []);
  const [isSaving, setIsSaving] = useState(false);

  // Estado de redimensionamiento
  const [width, setWidth] = useLocalStorageState(`tutorDockWidth:${userId}`, 420, {
    serialize: (v) => String(v),
    deserialize: (raw) => {
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : 420;
    },
    legacyKeys: ['tutorDockWidth']
  });
  const [isResizing, setIsResizing] = useState(false);
  // Historial por texto: clave depende del hash del texto actual
  const textHash = useMemo(() => {
    try { return texto ? generateTextHash(texto, 'tutor') : 'tutor_empty'; } catch { return 'tutor_empty'; }
  }, [texto]);

  const { initialMessages, handleMessagesChange, clearHistory } = useTutorPersistence({ storageKey: `tutorHistorial:${userId}:${textHash}`, max: 40 });
  // Preferencia de follow-ups: si no viene prop, leer de localStorage (apagado por defecto - user scoped)
  const [followUpsEnabled, setFollowUpsEnabled] = useLocalStorageState(`tutorFollowUpsEnabled:${userId}`, false, {
    legacyKeys: ['tutorFollowUpsEnabled']
  });
  useEffect(() => {
    if (typeof followUps === 'boolean') {
      setFollowUpsEnabled(followUps);
    }
  }, [followUps]);
  const { onAssistantMessage } = useFollowUpQuestion({ enabled: followUpsEnabled });
  const [lengthMode, setLengthMode] = useLocalStorageState(`tutorLengthMode:${userId}`, 'auto', {
    serialize: (v) => String(v),
    deserialize: (raw) => raw || 'auto',
    legacyKeys: ['tutorLengthMode']
  });
  const [temperature, setTemperature] = useLocalStorageState(`tutorTemperature:${userId}`, 0.7, {
    serialize: (v) => String(v),
    deserialize: (raw) => {
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0.7;
    },
    legacyKeys: ['tutorTemperature']
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
    let rafId = null;
    let latestWidth = startWidth;

    const handleMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX; // Invertido porque el borde está a la izquierda
      latestWidth = Math.max(320, Math.min(800, startWidth + deltaX));
      // 🚀 PERF: Throttle con rAF — solo 1 setState por frame (60fps)
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          setWidth(latestWidth);
          rafId = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      // Aplicar ancho final
      setWidth(latestWidth);
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [expanded, width]);

  // 🚀 PERF: Debounce la notificación de cambio de ancho al workspace
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => {
      const event = new CustomEvent('tutor-width-change', { detail: { width } });
      window.dispatchEvent(event);
    }, 100);
    return () => clearTimeout(timer);
  }, [width, expanded]);

  return (
    <TutorCore
      onBusyChange={() => { }}
      initialMessages={initialMessages}
      onMessagesChange={handleMessagesChange}
      onAssistantMessage={onAssistantMessage}
      backendUrl={BACKEND_URL}
    >
      {(api) => {
        const exportPdf = () => {
          try {
            const msgs = api.messages;
            if (!msgs || !msgs.length) return;

            const rows = msgs.map((m, idx) => {
              const role = m.role === 'user' ? 'Estudiante' : 'Tutor';
              return `<div class="msg">
  <div class="meta">${idx + 1}. ${role}</div>
  <div class="content">${escapeHtml(m.content).replace(/\n/g, '<br/>')}</div>
</div>`;
            }).join('\n');

            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Conversación Tutor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 16px 0; font-size: 18px; }
    .meta { font-weight: 600; margin-bottom: 4px; }
    .msg { margin-bottom: 14px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
    .content { line-height: 1.5; }
  </style>
</head>
<body>
  <h1>Conversación con Tutor Inteligente</h1>
  <div style="margin-bottom: 10px; font-size: 12px; color: #555;">Exportado: ${new Date().toLocaleString('es-ES')}</div>
  ${rows}
</body>
</html>`;

            const w = window.open('', '_blank', 'width=900,height=1200');
            if (!w) return;
            w.document.open();
            w.document.write(html);
            w.document.close();
            w.focus();
            w.print();
          } catch (err) {
            console.error('[TutorDock] Error al exportar PDF:', err);
          }
        };
        return (
          <>
            <TutorDockEffects
              api={api}
              texto={texto}
              currentTextoId={currentTextoId}
              lengthMode={lengthMode}
              temperature={temperature}
              userId={userId}
              textHash={textHash}
              initialMessages={initialMessages}
              messagesRef={messagesRef}
              setIsSaving={setIsSaving}
              setPendingExternal={setPendingExternal}
              followUpsEnabled={followUpsEnabled}
            />
            {!open && !expanded && (
              <ToggleFab onClick={handleToggle} title="Mostrar tutor">
                🧑‍🏫
              </ToggleFab>
            )}
            {open && (
              <DockWrapper $expanded={expanded} $width={expanded ? width : null} $isResizing={isResizing}>
                {expanded && <ResizeHandle onMouseDown={handleMouseDown} title="Arrastra para redimensionar" />}
                <DockHeader $hidden={headerHidden}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span>🧑‍🏫 Tutor Inteligente</span>
                    {isSaving && (
                      <span style={{ fontSize: '.7rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ☁️
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '.3rem', alignItems: 'center' }}>
                    {/* Botón de Configuración */}
                    <HeaderButton
                      onClick={() => setShowSettings(!showSettings)}
                      title="Configuración del tutor (longitud, creatividad, historial)"
                      style={{ background: showSettings ? 'rgba(255,255,255,0.4)' : undefined }}
                    >
                      ⚙️ Opciones
                    </HeaderButton>

                    {/* Botón de expandir/contraer */}
                    {onToggleExpand && (
                      <HeaderButton
                        onClick={onToggleExpand || (() => { })}
                        title={expanded ? 'Contraer' : 'Expandir'}
                      >
                        {expanded ? '⬅️' : '➡️'}
                      </HeaderButton>
                    )}

                    {/* Botón de cerrar */}
                    <HeaderButton
                      onClick={() => {
                        handleToggle();
                        if (onClose) onClose();
                      }}
                      style={{ background: 'transparent', border: 'none', fontSize: '1rem', padding: '.2rem .4rem' }}
                      title="Cerrar el tutor"
                    >
                      ✖
                    </HeaderButton>
                  </div>
                </DockHeader>

                {/* Panel de Configuración Desplegable */}
                {showSettings && (
                  <SettingsPanel>
                    {/* ── Fila 1: Ajustes de respuesta ── */}
                    <SettingsRow>
                      <label title="Controla qué tan extensas son las respuestas">
                        📏 Longitud:
                        <select
                          value={lengthMode}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLengthMode(v);
                            try { api.setContext({ lengthMode: v }); } catch { }
                          }}
                        >
                          <option value="auto">Auto</option>
                          <option value="breve">Breve</option>
                          <option value="media">Media</option>
                          <option value="detallada">Detallada</option>
                        </select>
                      </label>
                      <label title={`Creatividad: ${temperature}`}>
                        💡 Creatividad:
                        <select
                          value={temperature}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setTemperature(v);
                            try { api.setContext({ temperature: v }); } catch { }
                          }}
                        >
                          <option value="0.3">Baja</option>
                          <option value="0.7">Media</option>
                          <option value="1.0">Alta</option>
                        </select>
                      </label>
                      <label title="Sugerir preguntas relacionadas automáticamente">
                        <input
                          type="checkbox"
                          checked={followUpsEnabled}
                          onChange={() => setFollowUpsEnabled(!followUpsEnabled)}
                        />
                        Seguimiento
                      </label>
                    </SettingsRow>

                    <SettingsDivider />

                    {/* ── Fila 2: Acciones de conversación ── */}
                    <SettingsRow>
                      <ActionButton
                        onClick={() => {
                          try { api.generateSessionSummary(); } catch (err) {
                            console.error('[TutorDock] Error resumen:', err);
                          }
                        }}
                        disabled={api.loading || !api.messages || api.messages.length < 2}
                        style={{ background: '#8b5cf6', color: 'white' }}
                        title="Genera un resumen de lo aprendido en esta sesión"
                      >
                        📊 Resumen de sesión
                      </ActionButton>

                      <ActionButton
                        onClick={() => {
                          try { api.regenerateLastResponse(); } catch (err) {
                            console.error('[TutorDock] Error regenerar:', err);
                          }
                        }}
                        disabled={api.loading || !api.messages || api.messages.length < 2}
                        style={{ background: '#0891b2', color: 'white' }}
                        title="Regenera la última respuesta con un enfoque diferente"
                      >
                        🔄 Regenerar respuesta
                      </ActionButton>
                    </SettingsRow>

                    <SettingsDivider />

                    {/* ── Fila 3: Exportar y gestión ── */}
                    <SettingsRow>
                      <ActionButton
                        onClick={exportPdf}
                        disabled={!api.messages || api.messages.length === 0}
                        style={{ background: '#0f766e', color: 'white' }}
                        title="Exportar conversación como PDF (vista imprimible)"
                      >
                        🖨️ Exportar PDF
                      </ActionButton>

                      <ActionButton
                        onClick={() => {
                          try {
                            const msgs = api.messages;
                            if (!msgs || msgs.length === 0) return;
                            const header = `=== Conversación con Tutor Inteligente ===\nFecha: ${new Date().toLocaleString('es-ES')}\nMensajes: ${msgs.length}\n${'='.repeat(44)}\n\n`;
                            const body = msgs.map(m => {
                              const role = m.role === 'user' ? '🧑 Estudiante' : '🧑‍🏫 Tutor';
                              return `${role}:\n${m.content}\n`;
                            }).join('\n---\n\n');
                            const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `tutor_conversacion_${new Date().toISOString().slice(0,10)}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('[TutorDock] Error al guardar:', err);
                          }
                        }}
                        disabled={!api.messages || api.messages.length === 0}
                        style={{ background: '#2563eb', color: 'white' }}
                        title="Descargar conversación como archivo de texto"
                      >
                        💾 Guardar
                      </ActionButton>

                      <ActionButton
                        onClick={async () => {
                          try {
                            const msgs = api.messages;
                            if (!msgs || msgs.length === 0) return;
                            const text = msgs.map(m => {
                              const role = m.role === 'user' ? 'Estudiante' : 'Tutor';
                              return `${role}: ${m.content}`;
                            }).join('\n\n');
                            await navigator.clipboard.writeText(text);
                            const btn = document.activeElement;
                            const orig = btn.textContent;
                            btn.textContent = '✅ Copiado';
                            setTimeout(() => { btn.textContent = orig; }, 1500);
                          } catch (err) {
                            console.error('[TutorDock] Error al copiar:', err);
                          }
                        }}
                        disabled={!api.messages || api.messages.length === 0}
                        style={{ background: '#6b7280', color: 'white' }}
                        title="Copiar conversación al portapapeles"
                      >
                        📋 Copiar
                      </ActionButton>

                      <div style={{ flex: 1 }} />

                      <ActionButton
                        onClick={() => {
                          if (window.confirm('¿Seguro que quieres borrar todo el historial?')) {
                            try { api.clear(); clearHistory(); } catch { }
                          }
                        }}
                        style={{ background: '#ef4444', color: 'white' }}
                        title="Borrar historial"
                      >
                        🧹 Limpiar
                      </ActionButton>
                    </SettingsRow>
                  </SettingsPanel>
                )}

                <Messages ref={messagesRef}>
                  {api.messages.length === 0 && (
                    <Msg $user={false}>Selecciona texto y usa la toolbar (Explicar, Resumir, etc.) o escribe una pregunta.</Msg>
                  )}
                  {api.messages.map(m => (
                    <Msg
                      key={m.id}
                      $user={m.role === 'user'}
                      dangerouslySetInnerHTML={{
                        __html: m.role === 'user' ? renderPlainText(m.content) : parseMarkdown(m.content)
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
                  input.value = '';
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const value = e.target.value?.trim();
                        if (value && !api.loading) {
                          api.sendPrompt(value);
                          e.target.value = '';
                          // Resetear altura
                          if (chatInputRef.current) {
                            chatInputRef.current.style.height = '32px';
                          }
                        }
                      }
                      // Shift+Enter permite nueva línea (comportamiento por defecto)
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
