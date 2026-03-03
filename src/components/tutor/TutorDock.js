import React, { useState, useCallback, useEffect, useContext, useMemo, useRef } from 'react'; // eslint-disable-line no-unused-vars -- React needed for JSX; used in <TutorCore> render-prop
import styled, { keyframes } from 'styled-components';
import TutorCore from './TutorCore'; // eslint-disable-line no-unused-vars -- used in JSX: <TutorCore>
import useTutorPersistence from '../../hooks/useTutorPersistence';
import useTutorThreads from '../../hooks/useTutorThreads';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import useFollowUpQuestion from '../../hooks/useFollowUpQuestion';
import useReaderActions from '../../hooks/useReaderActions';
import { AppContext, BACKEND_URL } from '../../context/AppContext';
import { generateTextHash } from '../../utils/cache';
import { useAuth } from '../../context/AuthContext';

import logger from '../../utils/logger';

// P2 FIX: Constante estable fuera del componente — evita invalidar callbacks de TutorCore
const NOOP_CB = () => {};

// P6 FIX: Regex precompiladas para parseMarkdown — evitan recompilación en cada llamada
const RE_BOLD = /\*\*(.+?)\*\*/g;
const RE_ITALIC = /\*(.+?)\*/g;
const RE_CODE = /`([^`]+)`/g;
const RE_LISTS = /((?:^\d+\.\s+.+$\n?)+|(?:^[-*]\s+.+$\n?)+)/gm;
const RE_OL_ITEMS = /^\d+\.\s+(.+)$/gm;
const RE_UL_ITEMS = /^[-*]\s+(.+)$/gm;
const RE_LINKS = /\[([^\]]+)\]\(([^)]+)\)/g;
const RE_SOCRATIC = /((?:¿|[A-ZÁÉÍÓÚÑ])(?:[^.!?]|(?:\.\.\.))*\?)(<\/p>)?\s*$/;

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
  html = html.replace(RE_BOLD, '<strong>$1</strong>');

  // *cursiva*
  html = html.replace(RE_ITALIC, '<em>$1</em>');

  // `código`
  html = html.replace(RE_CODE, '<code>$1</code>');

  // H9 FIX: Procesar listas en una sola pasada para evitar doble-envolvimiento
  html = html.replace(RE_LISTS, (block) => {
    const isOrdered = /^\d+\./.test(block);
    const tag = isOrdered ? 'ol' : 'ul';
    const items = block.replace(
      isOrdered ? RE_OL_ITEMS : RE_UL_ITEMS,
      '<li>$1</li>'
    );
    return `<${tag}>${items}</${tag}>`;
  });

  // Links [texto](url) - sanitizar protocolo y escapar href
  html = html.replace(RE_LINKS, (_m, linkText, linkUrl) => {
    const href = sanitizeHref(linkUrl);
    if (!href) return `${linkText} (${linkUrl})`;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  });

  // Párrafos (doble salto de línea)
  // F4+H4 FIX: No envolver bloques que contienen elementos de bloque en cualquier posición
  // (no solo al inicio). Detectar <ol|ul|div|blockquote|li|table> en cualquier parte.
  html = html.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (/<(?:ol|ul|div|blockquote|li|table)[\s>]/i.test(trimmed)) return trimmed;
    return `<p>${trimmed}</p>`;
  }).join('\n');

  // 📝 ALTERNATIVA A2 (Socrática): Identificar y resaltar preguntas al final del mensaje
  // Buscamos si el final del mensaje (o el último párrafo) contiene una pregunta.
  // Seleccionamos desde el inicio de la oración socrática hasta el cierre ?.
  // Modificado: Buscamos por final de texto o final de <p>
  if (RE_SOCRATIC.test(html)) {
    html = html.replace(RE_SOCRATIC, (match, pregunta, cierreP) => {
      // Envolver la pregunta en un div con una clase específica para estilizarla
      const box = `<div class="socratic-question" style="background: rgba(37, 99, 235, 0.1); border-left: 3px solid #2563eb; padding: 0.5rem 0.75rem; margin-top: 0.5rem; border-radius: 4px; font-style: italic;">
        💡 <strong>Tu turno:</strong><br/>${pregunta}
      </div>`;
      return cierreP ? `${box}</p>` : box;
    });
  }

  return html;
}

function readLegacyTutorMessages(storageKey, max = 40) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => ({
        role: entry?.r || entry?.role,
        content: entry?.c || entry?.content
      }))
      .filter((m) => m.content)
      .slice(-max);
  } catch {
    return [];
  }
}

// eslint-disable-next-line no-unused-vars -- used in render-prop JSX: <TutorDockEffects />
function TutorDockEffects({
  api,
  texto,
  currentTextoId,
  sourceCourseId,
  lengthMode,
  temperature,
  webEnrichmentEnabled,
  userId: _userId,
  textHash: _textHash,
  activeThreadId: _activeThreadId,
  historyScopeKey,
  initialMessages,
  messagesRef,
  setPendingExternal,
  followUpsEnabled,
  persistenceHydrating,
}) {
    const initialMessagesRef = useRef(initialMessages);

  // api cambia de identidad con frecuencia (se construye en TutorCore).
  // Guardamos una referencia estable para usarla dentro de effects sin depender de `api`.
  const apiRef = useRef(api);

  // B5 FIX: Rastrear el scope y la firma del último loadMessages para detectar
  // mensajes remotos (Firestore) que llegan de forma asíncrona en un render posterior.
  const lastLoadedScopeRef = useRef(null);
  const lastLoadedSignatureRef = useRef(null);

  // Q3 FIX: Consolidar sincronización de refs de TutorDockEffects en 1 efecto
  useEffect(() => {
    initialMessagesRef.current = initialMessages;
    apiRef.current = api;
  }, [initialMessages, api]);

  // Establecer contexto base con el texto completo y lectureId cuando cambie
  // H3 FIX: Usar apiRef.current dentro del effect en lugar de api en deps
  useEffect(() => {
    const lectureIdToSet = currentTextoId || 'global';
    try {
      apiRef.current.setContext({
        fullText: texto || '',
        lengthMode,
        temperature,
        webEnrichmentEnabled,
        lectureId: lectureIdToSet,
        sourceCourseId: sourceCourseId || null
      });
    } catch { /* noop */ }
  }, [texto, lengthMode, temperature, webEnrichmentEnabled, currentTextoId, sourceCourseId]);

  // Reiniciar/rehidratar historial SOLO cuando cambia el scope lógico
  // (texto/usuario/hilo). Evita cancelar streaming por snapshots remotos.
  useEffect(() => {
    try {
      const currentApi = apiRef.current;
      // Invalida peticiones del texto anterior sin sobrescribir historial del nuevo texto.
      try { currentApi.cancelPending?.(); } catch { /* noop */ }

      const scopedMessages = initialMessagesRef.current;
      const sig = JSON.stringify(scopedMessages || []);
      lastLoadedScopeRef.current = historyScopeKey;
      lastLoadedSignatureRef.current = sig;

      if (Array.isArray(scopedMessages) && scopedMessages.length > 0) {
        currentApi.loadMessages(scopedMessages);
        return;
      }

      // Evitar limpiar mientras el hilo remoto aún se está hidratando.
      // Si limpiamos aquí, onMessagesChange puede persistir [] y pisar el hilo en Firestore.
      if (persistenceHydrating) return;

      // Si no hay historial para este texto, limpiar mensajes
      currentApi.clear();
    } catch { /* noop */ }
  }, [historyScopeKey, persistenceHydrating]);

  // B5 FIX: Cuando los mensajes remotos llegan de forma asíncrona (Firestore getDoc/onSnapshot
  // respondiendo después del cambio de scope), cargarlos en TutorCore si:
  //   1. El scope actual sigue siendo el mismo (no hubo otro cambio de hilo/texto)
  //   2. El contenido realmente cambió (evitar bucles)
  useEffect(() => {
    if (!Array.isArray(initialMessages) || !initialMessages.length) return;
    if (lastLoadedScopeRef.current !== historyScopeKey) return;
    const sig = JSON.stringify(initialMessages);
    if (sig === lastLoadedSignatureRef.current) return;

    // No interrumpir un stream activo: esperar a que termine para hidratar.
    if (api.loading) return;

    lastLoadedSignatureRef.current = sig;
    try {
      apiRef.current?.loadMessages?.(initialMessages);
    } catch { /* noop */ }
  // FIX: api.loading NO debe ser dependencia. Si lo es, al pasar de true→false
  // el efecto se re-ejecuta con initialMessages obsoletos (eco mid-stream de
  // Firestore) y sobreescribe los mensajes completos del stream recién terminado.
  // Sin loading en deps, el efecto sólo re-corre cuando initialMessages cambia,
  // momento en que api.loading ya refleja el valor correcto vía closure.
  }, [initialMessages, historyScopeKey]);

  // Suscribir acciones del visor SOLO cuando está montado el dock
  useReaderActions({
    onPrompt: ({ prompt, action, fragment }) => {
      setPendingExternal(action);
      if (action && fragment) {
        // Ajustar lengthMode recomendado por acción
        try {
          if (action === 'summarize') apiRef.current.setContext({ lengthMode: 'breve' });
          else if (action === 'explain') apiRef.current.setContext({ lengthMode: 'media' });
          else if (action === 'deep') apiRef.current.setContext({ lengthMode: 'detallada' });
          else if (action === 'question') apiRef.current.setContext({ lengthMode: 'breve' });
        } catch { /* noop */ }
        apiRef.current.sendAction(action, fragment, {});
      } else if (prompt) {
        apiRef.current.sendPrompt(prompt);
      }
    }
  });

  // Escuchar prompts externos (ej: enriquecimiento web en ReadingWorkspace)
  // H3 FIX: Usar apiRef.current dentro del handler, sin api en deps
  useEffect(() => {
    const handler = (e) => {
      try {
        const detail = e?.detail || {};
        const { action, fragment, fullText, prompt, webContext } = detail;
        if (action && fragment) {
          // Ajustar lengthMode por acción antes de enviar
          try {
            if (action === 'summarize') apiRef.current.setContext({ lengthMode: 'breve' });
            else if (action === 'explain') apiRef.current.setContext({ lengthMode: 'media' });
            else if (action === 'deep') apiRef.current.setContext({ lengthMode: 'detallada' });
            else if (action === 'question') apiRef.current.setContext({ lengthMode: 'breve' });
          } catch { /* noop */ }
          apiRef.current.sendAction(action, fragment, { fullText });
        } else if (prompt && typeof prompt === 'string') {
          if (fullText) { try { apiRef.current.setContext({ fullText }); } catch { } }
          // Si hay webContext, agregarlo al contexto del sistema antes de enviar
          if (webContext) {
            logger.log('🌐 [TutorDock] Agregando contexto web al sistema');
            try {
              apiRef.current.setContext({ webEnrichment: webContext });
            } catch (err) {
              logger.warn('⚠️ [TutorDock] Error agregando webContext:', err);
            }
          }
          apiRef.current.sendPrompt(prompt);
        }
      } catch { /* noop */ }
    };
    window.addEventListener('tutor-external-prompt', handler);
    return () => window.removeEventListener('tutor-external-prompt', handler);
  }, []); // Estable: usa apiRef.current

  // Auto-scroll cuando aparece el indicador de loading o nuevos mensajes
  // H3 FIX: Usar apiRef.current para acceder a loading/messages.length
  const msgCount = api.messages.length;
  const isLoading = api.loading;
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
  }, [isLoading, msgCount, messagesRef]);

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

/* eslint-disable no-unused-vars -- styled-components used in render-prop JSX below; ESLint can't trace render-prop usage */
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

// P6 FIX: Animación de spinner como keyframes de styled-components (evita inyectar <style> en cada render)
const spinAnim = keyframes`
  to { transform: rotate(360deg); }
`;

const SpinnerIcon = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ${spinAnim} 0.8s linear infinite;
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

/* eslint-enable no-unused-vars */
// VERSION MARKER: v3.0.1-performance-fix-jan26
export default function TutorDock({ followUps, expanded = false, onToggleExpand, onClose }) {
  const appCtx = useContext(AppContext) || {};
  const { texto, currentTextoId, sourceCourseId } = appCtx;
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'guest';
  const hasCloudUser = Boolean(currentUser?.uid);
  const [open, setOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingCloudSync, setPendingCloudSync] = useState(false);
  const [cloudSyncBusy, setCloudSyncBusy] = useState(false);
  // 🚀 PERF: headerHidden nunca cambia (siempre false), usar constante
  const headerHidden = false;
  // 🚀 PERF: _pendingExternal solo se escribe, nunca se lee para render → usar ref
  const pendingExternalRef = useRef(null);
  const setPendingExternal = useCallback((v) => { pendingExternalRef.current = v; }, []);
  // isSaving eliminado: la persistencia única es useTutorPersistence (localStorage, sincrónico)

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
  // Historial por texto: clave depende del hash del texto actual + courseId para aislar cursos
  const textHash = useMemo(() => {
    try { return texto ? generateTextHash(texto, 'tutor') : 'tutor_empty'; } catch { return 'tutor_empty'; }
  }, [texto]);
  const courseScope = sourceCourseId || 'free';
  const baseStorageKey = `tutorHistorial:${userId}:${courseScope}:${textHash}`;
  const [cloudSyncEnabled, setCloudSyncEnabled] = useLocalStorageState(`tutorCloudSyncEnabled:${userId}`, false, {
    serialize: (v) => String(v === true),
    deserialize: (raw) => raw === 'true',
    legacyKeys: ['tutorCloudSyncEnabled']
  });

  // UX: para usuarios autenticados, activar sync nube por defecto si no existe preferencia guardada.
  useEffect(() => {
    if (!hasCloudUser) return;
    const prefKey = `tutorCloudSyncEnabled:${userId}`;
    try {
      const existing = localStorage.getItem(prefKey);
      if (existing == null) setCloudSyncEnabled(true);
    } catch { /* noop */ }
  }, [hasCloudUser, userId, setCloudSyncEnabled]);

  const canSyncThreads = hasCloudUser && cloudSyncEnabled;

  const {
    threads,
    activeThreadId,
    loading: threadsLoading,
    selectThread,
    createThread,
    deleteThread,
  } = useTutorThreads({
    userId,
    courseScope,
    textHash,
    enabled: canSyncThreads,
    maxThreads: 5,
  });

  const historyScopeKey = useMemo(() => `${userId}:${textHash}:${activeThreadId || 'no-thread'}`, [userId, textHash, activeThreadId]);
  const scopedStorageKey = useMemo(
    () => (canSyncThreads && activeThreadId ? `${baseStorageKey}:${activeThreadId}` : baseStorageKey),
    [canSyncThreads, activeThreadId, baseStorageKey]
  );

  const bootstrapThreadRef = useRef(false);
  const mountedRef = useRef(true);
  const syncRunIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runWithTimeout = useCallback(async (promiseFactory, timeoutMs = 12000) => {
    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('SYNC_TIMEOUT'));
        }, timeoutMs);
      });
      return await Promise.race([Promise.resolve().then(promiseFactory), timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    if (!canSyncThreads || threadsLoading) return;
    if (threads.length > 0) {
      bootstrapThreadRef.current = false;
    }
    if (threads.length > 0) {
      if (!activeThreadId) {
        try { selectThread(threads[0].id); } catch { /* noop */ }
      }
      return;
    }
    if (bootstrapThreadRef.current) return;
    bootstrapThreadRef.current = true;
    const legacyMessages = readLegacyTutorMessages(baseStorageKey, 40);
    createThread(legacyMessages).catch(() => { /* noop */ });
  }, [canSyncThreads, threadsLoading, threads, activeThreadId, selectThread, createThread, baseStorageKey]);

  const {
    initialMessages,
    handleMessagesChange,
    clearHistory,
    quotaExceeded,
    synced,
    conflictCount,
    flushNow,
    hydrating: persistenceHydrating,
  } = useTutorPersistence({
    storageKey: scopedStorageKey,
    max: 40,
    syncEnabled: canSyncThreads,
    userId,
    courseScope,
    textHash,
    threadId: canSyncThreads ? activeThreadId : null,
    debounceMs: 2000,
  });

  const createThreadRef = useRef(createThread);
  const flushNowRef = useRef(flushNow);
  const activeThreadIdRef = useRef(activeThreadId);

  // P5 FIX: Consolidar 3 efectos de sincronización de refs en 1
  useEffect(() => {
    createThreadRef.current = createThread;
    flushNowRef.current = flushNow;
    activeThreadIdRef.current = activeThreadId;
  }, [createThread, flushNow, activeThreadId]);

  useEffect(() => {
    if (!pendingCloudSync || !hasCloudUser || !cloudSyncEnabled) return;
    const runId = ++syncRunIdRef.current;

    const runSync = async () => {
      if (mountedRef.current) setCloudSyncBusy(true);
      try {
        if (!activeThreadIdRef.current) {
          const legacyMessages = readLegacyTutorMessages(baseStorageKey, 40);
          await runWithTimeout(() => createThreadRef.current(legacyMessages), 12000);
        }
        await runWithTimeout(() => Promise.resolve(flushNowRef.current?.()), 12000);
      } catch (err) {
        if (err?.message === 'SYNC_TIMEOUT') {
          logger.warn('[TutorDock] Timeout en sincronización manual');
        } else {
          logger.warn('[TutorDock] Error en sincronización manual:', err);
        }
      } finally {
        if (mountedRef.current && syncRunIdRef.current === runId) {
          setCloudSyncBusy(false);
          setPendingCloudSync(false);
        }
      }
    };

    runSync();
    return undefined;
  }, [pendingCloudSync, hasCloudUser, cloudSyncEnabled, baseStorageKey, runWithTimeout]);
  // Preferencia de follow-ups: si no viene prop, leer de localStorage (apagado por defecto - user scoped)
  const [followUpsEnabled, setFollowUpsEnabled] = useLocalStorageState(`tutorFollowUpsEnabled:${userId}`, false, {
    legacyKeys: ['tutorFollowUpsEnabled']
  });
  useEffect(() => {
    if (typeof followUps === 'boolean') {
      setFollowUpsEnabled(followUps);
    }
  }, [followUps, setFollowUpsEnabled]);
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
  const [webEnrichmentEnabled, setWebEnrichmentEnabled] = useLocalStorageState(`tutorWebSearch:${userId}`, false, {
    serialize: (v) => String(v === true),
    deserialize: (raw) => raw === 'true',
    legacyKeys: ['tutorWebSearch']
  });

  // Ref para el textarea autoexpandible del chat
  const chatInputRef = useRef(null);
  // Ref para el contenedor de mensajes (para auto-scroll)
  const messagesRef = useRef(null);

  const handleToggle = () => setOpen(o => !o);

  // P5 FIX: widthRef para que handleMouseDown no dependa de width (evita recrear en cada frame del drag)
  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  // P5 FIX: resizeCleanupRef para limpiar listeners si el componente se desmonta durante drag
  const resizeCleanupRef = useRef(null);
  useEffect(() => {
    return () => {
      if (resizeCleanupRef.current) resizeCleanupRef.current();
    };
  }, []);

  // Redimensionamiento con mouse
  const handleMouseDown = useCallback((e) => {
    if (!expanded) return; // Solo redimensionar cuando está expandido
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = widthRef.current;
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
      resizeCleanupRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    resizeCleanupRef.current = handleMouseUp;
  }, [expanded]);

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
      onBusyChange={NOOP_CB}
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
            logger.error('[TutorDock] Error al exportar PDF:', err);
          }
        };
        return (
          <>
            <TutorDockEffects
              api={api}
              texto={texto}
              currentTextoId={currentTextoId}
              sourceCourseId={sourceCourseId}
              lengthMode={lengthMode}
              temperature={temperature}
              webEnrichmentEnabled={webEnrichmentEnabled}
              userId={userId}
              textHash={textHash}
              activeThreadId={activeThreadId}
              historyScopeKey={historyScopeKey}
              initialMessages={initialMessages}
              messagesRef={messagesRef}
              setPendingExternal={setPendingExternal}
              followUpsEnabled={followUpsEnabled}
              persistenceHydrating={persistenceHydrating}
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
                      {hasCloudUser && (
                        <ActionButton
                          onClick={() => {
                            if (!cloudSyncEnabled) setCloudSyncEnabled(true);
                            setPendingCloudSync(true);
                          }}
                          disabled={cloudSyncBusy || api.loading}
                          style={{ background: '#1d4ed8', color: 'white' }}
                          title="Sincronizar conversación con la nube para recuperarla en otros dispositivos"
                        >
                          {cloudSyncBusy ? '⏳ Sincronizando...' : '☁️ Sincronizar'}
                        </ActionButton>
                      )}

                      {hasCloudUser && (
                        <span style={{ fontSize: '.75rem', opacity: .85 }}>
                          {cloudSyncEnabled ? (synced ? '☁️ Sincronizado' : '☁️ Modo nube activo') : '💾 Solo local'}
                        </span>
                      )}

                      {canSyncThreads && (
                        <>
                          <label title="Selecciona el hilo activo de esta lectura">
                            🧵 Hilo:
                            <select
                              value={activeThreadId || ''}
                              onChange={(e) => {
                                const nextId = e.target.value;
                                if (!nextId) return;
                                selectThread(nextId);
                              }}
                              disabled={threadsLoading || !threads.length}
                            >
                              {threads.map((thread, index) => (
                                <option key={thread.id} value={thread.id}>
                                  {`${index + 1}. ${thread.title || 'Nuevo hilo'}`}
                                </option>
                              ))}
                            </select>
                          </label>

                          <ActionButton
                            onClick={async () => {
                              try {
                                await createThread([]);
                              } catch (err) {
                                logger.error('[TutorDock] Error creando hilo:', err);
                              }
                            }}
                            disabled={threadsLoading || api.loading}
                            style={{ background: '#2563eb', color: 'white' }}
                            title="Crear un nuevo hilo de conversación"
                          >
                            ➕ Nuevo hilo
                          </ActionButton>

                          <ActionButton
                            onClick={async () => {
                              try {
                                if (!activeThreadId) return;
                                if (threads.length <= 1) {
                                  api.clear();
                                  clearHistory();
                                  return;
                                }
                                if (!window.confirm('¿Eliminar este hilo?')) return;
                                await deleteThread(activeThreadId);
                                // B16 FIX: NO eliminar baseStorageKey de localStorage.
                                // La clave de almacenamiento es compartida entre todos los
                                // hilos del mismo texto (no incluye threadId). Eliminarla
                                // borra el caché del hilo recién activado por deleteThread.
                                // El cambio de activeThreadId dispara useTutorPersistence
                                // que sobrescribirá el localStorage con los datos correctos
                                // del nuevo hilo activo (vía Firestore o caché existente).
                              } catch (err) {
                                logger.error('[TutorDock] Error eliminando hilo:', err);
                              }
                            }}
                            disabled={!activeThreadId || threadsLoading || api.loading}
                            style={{ background: '#dc2626', color: 'white' }}
                            title="Eliminar hilo activo"
                          >
                            🗑️ Eliminar hilo
                          </ActionButton>

                          <span style={{ fontSize: '.75rem', opacity: .85 }}>
                            {synced ? '☁️ Sincronizado' : '💾 Local'}{conflictCount > 0 ? ` · ⚠️ Conflictos: ${conflictCount}` : ''}
                          </span>
                        </>
                      )}

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
                      <label title="Enriquecer respuestas con fuentes web verificadas (modos explicar/profundizar)">
                        <input
                          type="checkbox"
                          checked={webEnrichmentEnabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setWebEnrichmentEnabled(enabled);
                            try { api.setContext({ webEnrichmentEnabled: enabled }); } catch { /* noop */ }
                          }}
                        />
                        Web verificada
                      </label>
                    </SettingsRow>

                    <SettingsDivider />

                    {/* ── Fila 2: Acciones de conversación ── */}
                    <SettingsRow>
                      <ActionButton
                        onClick={() => {
                          try { api.generateSessionSummary(); } catch (err) {
                            logger.error('[TutorDock] Error resumen:', err);
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
                            logger.error('[TutorDock] Error regenerar:', err);
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
                            logger.error('[TutorDock] Error al copiar:', err);
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
                          if (window.confirm('¿Seguro que quieres limpiar el hilo actual?')) {
                            try { api.clear(); clearHistory(); } catch { }
                          }
                        }}
                        style={{ background: '#ef4444', color: 'white' }}
                        title="Limpiar hilo activo"
                      >
                        🧹 Limpiar hilo
                      </ActionButton>
                    </SettingsRow>
                  </SettingsPanel>
                )}

                {quotaExceeded && (
                  <div style={{
                    margin: '0 .8rem .4rem',
                    padding: '.45rem .55rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#b91c1c',
                    fontSize: '.8rem'
                  }}>
                    ⚠️ No se pudo guardar en almacenamiento local. Libera espacio del navegador.
                  </div>
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
                        <SpinnerIcon />
                        Pensando...
                      </span>
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
                        <SpinnerIcon style={{ width: '10px', height: '10px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.5)', borderTopColor: 'rgba(255,255,255,1)' }} />
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
