import React, { useMemo, useCallback, useEffect, useState, useRef, useContext } from 'react';
import styled from 'styled-components';
import { Virtuoso } from 'react-virtuoso';
import { getSegmentedCached } from './services/segmentTextService';
import { estimarTiempoLectura } from './utils/textAnalysisMetrics';
import { AppContext } from './context/AppContext';
import { applyStructureToText } from './services/textStructureService';
import PDFViewer from './components/PDFViewer';
import { useReadingTimeTracker } from './hooks/useReadingTimeTracker';
import './setupPdfWorker';
// Eliminado sistema de anotaciones persistentes (resaltado)

/**
 * VisorTexto_responsive (versión restaurada mínima)
 * -------------------------------------------------
 * Este archivo fue recreado tras haberse eliminado accidentalmente.
 * Implementa un visor de texto simplificado con:
 *  - División básica en párrafos (doble salto de línea) o líneas si no hay dobles saltos
 *  - Virtualización opcional cuando el número de párrafos supera un umbral
 *  - Metadatos superiores (contador de párrafos y palabras, tiempo estimado)
 *  - Selección contextual con acciones (Explicar, Guardar Cita, Notas, Copiar)
 *  - Eventos de modo enfoque (enviar customEvent "visor-focus-mode") para integrarse con App
 *  - API de props: { texto, onParagraphClick? }
 *  - Emite CustomEvents 'reader-action' para integrarse con módulos (Tutor / Notas) sin acoplar
 *
 * Si se necesita la versión completa (resaltados, tutor, notas, etc.) se puede
 * reconstruir a partir de un commit anterior o documentación histórica.
 */

const VIRTUALIZATION_THRESHOLD = 400; // umbral para virtualización
const LARGE_TEXT_THRESHOLD = 800; // umbral para desactivar animaciones/hover costosos
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 22;
const DEFAULT_FONT_SIZE = 16;

function _dividirParrafos(texto) {
  if (!texto) return [];
  // Normalizar saltos Windows/Unix
  const norm = texto.replace(/\r\n?/g, '\n').trim();
  // Intentar separar por bloques dobles primero
  let bloques = norm.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  if (bloques.length <= 1) {
    // Fallback: separar por línea simple si no hubo bloques
    bloques = norm.split(/\n/).map(l => l.trim()).filter(Boolean);
  }
  return bloques;
}

const VisorWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.25rem clamp(1rem, 2vw, 2rem);
  background: ${p => p.theme?.background || '#ffffff'};
  color: ${p => p.theme?.text || '#222'};
  /* El tamaño base se sobrescribe con style={{ fontSize }} */
  font-size: clamp(15px, 1rem, 18px);
  line-height: 1.55;
  overscroll-behavior: contain;
`;

const MetaBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  align-items: center;
  margin-bottom: 1rem;
  font-size: .8rem;
  color: ${p => p.theme?.textSecondary || '#555'};
  > span { background: ${p => p.theme?.surface || '#f4f4f6'}; padding: 4px 8px; border-radius: 6px; }
`;

// Prefijo $ para evitar pasar props custom al DOM
// Nota: 'as' prop permite renderizar como h1, h2, h3 o p dinámicamente
const Parrafo = styled.p`
  margin: 0 0 1.25rem 0;
  padding: .75rem 1rem;
  border-radius: 8px;
  transition: ${p => p.$compact ? 'none' : 'background .2s ease'};
  position: relative;
  background: ${p => p.$selected ? (p.theme?.surface || '#f0f2f5') : 'transparent'};
  &:hover { background: ${p => p.$compact ? 'transparent' : (p.theme?.surface || '#f0f2f5')}; }
  /* Eliminamos contorno por párrafo al buscar; ahora se resaltan solo las coincidencias */
  outline: none;
  box-shadow: none;
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
  /* Resalta con más intensidad las coincidencias del párrafo activo en navegación */
  ${p => p.$currentHit ? `
    mark { background: #ffd54f; box-shadow: 0 0 0 1px rgba(99,102,241,.35) inset; }
  ` : ''}
  
  /* Estilos para títulos cuando se renderiza como h1, h2, h3 */
  ${p => p.as === 'h1' ? `
    font-size: 1.8em;
    font-weight: 700;
    color: ${p.theme?.academicSection || p.theme?.accent || '#6366f1'};
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    line-height: 1.2;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  ` : ''}
  
  ${p => p.as === 'h2' ? `
    font-size: 1.5em;
    font-weight: 700;
    color: ${p.theme?.academicSubtitle || p.theme?.primary || '#8b5cf6'};
    margin-top: 1.25rem;
    margin-bottom: 0.85rem;
    line-height: 1.3;
    border-left: 4px solid ${p.theme?.academicSubtitle || p.theme?.primary || '#8b5cf6'};
    padding-left: 1rem;
    background: ${p.theme?.name === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)'};
  ` : ''}
  
  ${p => p.as === 'h3' ? `
    font-size: 1.25em;
    font-weight: 600;
    color: ${p.theme?.text || '#222'};
    margin-top: 1rem;
    margin-bottom: 0.65rem;
    line-height: 1.4;
    border-bottom: 2px solid ${p.theme?.border || '#e5e7eb'};
    padding-bottom: 0.25rem;
  ` : ''}
  
  /* Párrafos normales con indentación opcional */
  ${p => p.as === 'p' || !p.as ? `
    text-align: justify;
    text-indent: 1.5em;
    line-height: 1.65;
    
    /* Quitar indentación si es el primer párrafo después de un título */
    &:first-of-type { text-indent: 0; }
  ` : ''}
  @media (max-width: 640px) {
    padding: .6rem .75rem;
    text-indent: 0;
    text-align: left;
  }
`;

// Componente para listas con viñetas o numeradas
const ListItem = styled.li`
  margin: 0.5rem 0;
  padding: 0.5rem 1rem 0.5rem ${p => p.$bullet ? '2.5rem' : '3rem'};
  position: relative;
  line-height: 1.6;
  background: ${p => p.$selected ? (p.theme?.surface || '#f0f2f5') : 'transparent'};
  border-radius: 8px;
  transition: background 0.2s ease;
  list-style: none;
  
  &:hover {
    background: ${p => p.theme?.surface || '#f0f2f5'};
  }
  
  /* Viñeta o número posicionado absolutamente */
  &::before {
    content: ${p => p.$marker ? `"${p.$marker}"` : '"•"'};
    position: absolute;
    left: 1rem;
    color: ${p => p.theme?.primary || '#2563eb'};
    font-weight: 600;
    font-size: ${p => p.$bullet ? '1.2em' : '0.9em'};
  }
  
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
  ${p => p.$currentHit ? `mark { background: #ffd54f; }` : ''}
`;

// Componente para citas o bloques indentados
const BlockQuote = styled.blockquote`
  margin: 1rem 0;
  padding: 1rem 1.5rem;
  border-left: 4px solid ${p => p.theme?.academicQuote || p.theme?.accent || '#6b7280'};
  background: ${p => p.theme?.name === 'dark' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(107, 114, 128, 0.05)'};
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: ${p => p.theme?.textSecondary || '#64748b'};
  line-height: 1.6;
  position: relative;
  
  &:hover {
    background: ${p => p.theme?.name === 'dark' ? 'rgba(107, 114, 128, 0.15)' : 'rgba(107, 114, 128, 0.08)'};
  }
  
  &::before {
    content: '"';
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    font-size: 3em;
    color: ${p => p.theme?.academicQuote || '#6b7280'};
    opacity: 0.2;
    font-family: Georgia, serif;
    line-height: 1;
  }
  
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
`;

// Componente para notas al pie
const Footnote = styled.div`
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  font-size: 0.85em;
  color: ${p => p.theme?.academicFootnote || p.theme?.textSecondary || '#9ca3af'};
  background: ${p => p.theme?.name === 'dark' ? 'rgba(156, 163, 175, 0.08)' : 'rgba(156, 163, 175, 0.05)'};
  border-left: 2px solid ${p => p.theme?.academicFootnote || p.theme?.border || '#9ca3af'};
  border-radius: 4px;
  line-height: 1.5;
  font-style: italic;
  
  &:hover {
    background: ${p => p.theme?.name === 'dark' ? 'rgba(156, 163, 175, 0.12)' : 'rgba(156, 163, 175, 0.08)'};
  }
  
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
`;

const SelectionToolbar = styled.div`
  position: fixed;
  top: ${p => p.y}px;
  left: ${p => Math.max(16, Math.min(p.x, typeof window !== 'undefined' ? window.innerWidth - 320 : p.x))}px;
  transform: translateX(-50%) translateY(-120%);
  /* Glassmorphism con colores del tema (azul/teal, sin púrpura) */
  background: ${p => p.theme?.name === 'dark'
    ? 'rgba(27, 34, 48, 0.92)'
    : 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${p => p.theme?.name === 'dark'
    ? 'rgba(91, 165, 253, 0.3)'
    : 'rgba(49, 144, 252, 0.25)'};
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: calc(100vw - 24px);
  box-shadow: ${p => p.theme?.name === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(91, 165, 253, 0.15) inset'
    : '0 8px 32px rgba(49, 144, 252, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)'};
  z-index: 10000;
  animation: toolbarSlideIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  button {
    background: ${p => p.theme?.primary || '#3190FC'};
    color: #fff;
    border: none;
    padding: 8px 12px;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 36px;
    touch-action: manipulation;
    transition: all 0.15s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    &:hover {
      background: ${p => p.theme?.primaryDark || '#1F7EEB'};
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    /* Botón de cerrar con estilo especial */
    &:last-child {
      background: ${p => p.theme?.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
      color: ${p => p.theme?.textMuted || '#607D8B'};
      padding: 8px;
      min-width: auto;

      &:hover {
        background: ${p => p.theme?.error || '#d93025'};
        color: #fff;
      }
    }
  }

  @media (max-width: 640px) {
    left: 50%;
    transform: translateX(-50%) translateY(-120%);
    padding: 6px 8px;
    max-width: 92vw;

    button {
      padding: 6px 8px;
      font-size: 0.75rem;
      min-height: 32px;
    }
  }

  @keyframes toolbarSlideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(calc(-120% - 8px)) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(-120%) scale(1);
    }
  }
`;


const CopyToast = styled.div`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: ${p => p.theme?.surface || '#111827'};
  color: ${p => p.theme?.text || '#fff'};
  border: 1px solid ${p => p.theme?.border || '#374151'};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: .8rem;
  box-shadow: 0 6px 16px rgba(0,0,0,.2);
  z-index: 2000;
`;

// 🆕 Componente para feedback de cita guardada
const SaveSuccessToast = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${p => p.theme?.accent || '#10b981'};
  color: white;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: .9rem;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
  z-index: 2000;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    left: 12px;
    right: 12px;
    top: 12px;
    text-align: center;
  }
`;

const AnnotationForm = styled.div`
  position: fixed;
  top: ${p => Math.min(p.y, typeof window !== 'undefined' ? window.innerHeight - 320 : p.y)}px;
  left: ${p => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    return Math.max(172, Math.min(p.x, w - 172));
  }}px;
  transform: translateX(-50%) translateY(-110%);
  background: ${p => p.theme?.name === 'dark' ? 'rgba(27, 34, 48, 0.96)' : 'rgba(255, 255, 255, 0.98)'};
  backdrop-filter: blur(16px);
  border: 1px solid ${p => p.theme?.name === 'dark' ? 'rgba(91, 165, 253, 0.3)' : 'rgba(49, 144, 252, 0.25)'};
  border-radius: 12px;
  padding: 12px;
  box-sizing: border-box;
  width: 320px;
  max-width: calc(100vw - 24px);
  z-index: 10001;
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
  animation: toolbarSlideIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 80px;
    padding: 8px;
    border: 1px solid ${p => p.theme?.border || '#ddd'};
    border-radius: 8px;
    background: ${p => p.theme?.background || '#fff'};
    color: ${p => p.theme?.text || '#000'};
    font-size: 0.85rem;
    line-height: 1.4;
    resize: vertical;
    font-family: inherit;
    margin-top: 8px;
    &:focus { outline: none; border-color: ${p => p.theme?.primary || '#3190FC'}; }
  }

  .annotation-header {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${p => p.theme?.text || '#000'};
    margin-bottom: 4px;
  }

  .annotation-quote {
    font-size: 0.75rem;
    color: ${p => p.theme?.textMuted || '#607D8B'};
    font-style: italic;
    line-height: 1.3;
    max-height: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 6px;
  }

  .annotation-types {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }

  .annotation-type-btn {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid ${p => p.theme?.border || '#ddd'};
    background: transparent;
    color: ${p => p.theme?.textMuted || '#607D8B'};
    cursor: pointer;
    transition: all 0.15s;
    &:hover { border-color: ${p => p.theme?.primary || '#3190FC'}; color: ${p => p.theme?.primary || '#3190FC'}; }
    &.active {
      background: ${p => p.theme?.primary || '#3190FC'};
      color: #fff;
      border-color: ${p => p.theme?.primary || '#3190FC'};
    }
  }

  .annotation-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }

  .annotation-actions button {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }

  .annotation-cancel {
    background: ${p => p.theme?.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
    color: ${p => p.theme?.textMuted || '#607D8B'};
  }

  .annotation-save {
    background: ${p => p.theme?.primary || '#3190FC'};
    color: #fff;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  @media (max-width: 640px) {
    width: calc(100vw - 24px);
    left: 50%;
  }
`;

const ToolsBar = styled.div`
  position: sticky;
  top: 6px; /* debajo de la barra de progreso sticky */
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
  margin-bottom: .5rem;
  background: ${p => p.theme?.background || '#ffffff'};
  padding: 6px 6px;
  border-radius: 8px;
  box-shadow: 0 1px 0 rgba(0,0,0,.03);
  > input[type="search"] {
    padding: 6px 8px;
    border:1px solid ${p => p.theme?.border || '#cbd5e1'};
    border-radius: 6px;
    min-width: 200px;
    flex: 1 1 200px;
  }
  > button {
    background: ${p => p.theme?.surface || '#eef2ff'};
    border:1px solid ${p => p.theme?.border || '#cbd5e1'};
    color:${p => p.theme?.text || '#1f2937'};
    padding:6px 10px;
    border-radius:6px;
    cursor:pointer;
    font-size:.8rem;
    min-height: 36px;
    touch-action: manipulation;
  }

  @media (max-width: 640px) {
    > input[type="search"] {
      min-width: 140px;
      flex: 1 1 140px;
    }
    > button {
      min-height: 40px;
    }
  }
`;

const ProgressBar = styled.div`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${p => p.theme?.surface || '#eef2ff'};
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: .5rem;
  &:before { content: ''; display: block; height: 100%; width: ${p => Math.max(0, Math.min(100, p.$percent || 0))}%; background: ${p => p.theme?.accent || '#6366f1'}; transition: width .12s linear; }
`;

function VisorTextoResponsive({ texto, onParagraphClick }) {
  const { textStructure, archivoActual, saveCitation, completeAnalysis, currentTextoId, currentUser, userData } = useContext(AppContext);

  // 🆕 Bug 6 FIX: Medir tiempo real de lectura (solo estudiantes con texto activo)
  const isStudent = userData?.role === 'estudiante';
  useReadingTimeTracker({
    textoId: currentTextoId,
    userId: currentUser?.uid,
    isActive: isStudent && !!texto && !!currentTextoId
  });

  const [_enfoque, setEnfoque] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState(null); // {x,y,text}
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); // 🆕 Feedback visual al guardar cita
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('💾 ¡Cita guardada!');
  const [annotationMode, setAnnotationMode] = useState(null); // null | { text, x, y, tipo, nota }
  const _lockRef = useRef(false);
  const virtuosoRef = useRef(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [progress, setProgress] = useState(0); // 0..1
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState([]); // índices de párrafos
  const [currentHit, setCurrentHit] = useState(-1); // posición en searchHits
  const [copied, setCopied] = useState(false);
  // Eliminado color de resaltado persistente
  const [activeIndex, setActiveIndex] = useState(-1);
  const isVirtualizedRef = useRef(false);
  const paraRefs = useRef([]); // sólo cuando no hay virtualización
  const _lastPointerTypeRef = useRef('mouse');
  const selectionInfoRef = useRef(null);

  // 🆕 Estados para modo PDF (scroll continuo)
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfSource, setPdfSource] = useState(null);

  // 🆕 Detectar si el contenido actual es un PDF
  const isPDF = useMemo(() => {
    return archivoActual && (
      archivoActual.type === 'application/pdf' ||
      archivoActual.name?.toLowerCase().endsWith('.pdf')
    );
  }, [archivoActual]);

  // 🆕 Preparar fuente del PDF cuando sea necesario
  useEffect(() => {
    // 🆕 FIX: Resetear numPages al cambiar de archivo
    setPdfNumPages(null);

    if (!isPDF || !archivoActual) {
      setPdfSource(null);
      return;
    }

    console.log('📄 [VisorTexto] Preparando nuevo PDF:', archivoActual.name);

    // Si es un File object, usarlo directamente
    if (archivoActual.file instanceof File) {
      console.log('📄 [VisorTexto] Usando File object');
      setPdfSource(archivoActual.file);
      return;
    }

    // Si tiene objectUrl, usarlo
    if (archivoActual.objectUrl) {
      console.log('📄 [VisorTexto] Usando objectUrl');
      setPdfSource(archivoActual.objectUrl);
      return;
    }

    console.warn('⚠️ [VisorTexto] No se encontró fuente válida para PDF');
    setPdfSource(null);
  }, [isPDF, archivoActual]);

  useEffect(() => { selectionInfoRef.current = selectionInfo; }, [selectionInfo]);

  // Eliminado hook de anotaciones persistentes

  // Limpieza de claves legacy (one-shot)
  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return;
      if (!localStorage.getItem('annotations_migrated_v1')) {
        const toDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith('visor_highlights_') || k === 'notasLectura') {
            toDelete.push(k);
          }
        }
        toDelete.forEach(k => localStorage.removeItem(k));
        localStorage.setItem('annotations_migrated_v1', '1');
      }
    } catch { }
  }, []);

  const parrafos = useMemo(() => {
    if (!texto || !texto.trim()) return [];

    console.log('📐 [VisorTexto] Procesando texto, estructura IA disponible:', !!textStructure);

    // 🆕 PRIORIDAD 1: Si hay estructura detectada por IA, usarla
    if (textStructure && textStructure.sections && textStructure.elements) {
      console.log('✨ Usando estructura detectada por IA:', textStructure);
      const segments = applyStructureToText(texto, textStructure);
      return segments.map(seg => ({
        text: seg.text,
        type: seg.type,
        metadata: seg.metadata
      }));
    }

    console.log('🔧 [VisorTexto] Usando segmentación manual/heurística');

    // 🔧 PRIORIDAD 2: Respetar estructura original del texto (doble salto de línea)
    if (/\n\n/.test(texto)) {
      const manual = texto.split(/\n\n+/).map(t => t.trim()).filter(Boolean);
      // Solo usar split manual si produce al menos 2 párrafos razonables
      if (manual.length >= 2 && manual.some(p => p.length > 20)) {
        console.log(`📄 [VisorTexto] Usando ${manual.length} párrafos por \\n\\n`);
        return manual.map(text => ({ text, type: 'paragraph', metadata: {} }));
      }
    }

    // 🔧 PRIORIDAD 3: Fallback - servicio de segmentación inteligente
    const seg = getSegmentedCached(texto, { minParagraphLen: 10 }).map(p => p.content);
    console.log(`🤖 [VisorTexto] Usando ${seg.length} párrafos por segmentación algorítmica`);
    return seg.map(text => ({ text, type: 'paragraph', metadata: {} }));
  }, [texto, textStructure]);
  const bigText = parrafos.length > LARGE_TEXT_THRESHOLD;
  const totalPalabras = useMemo(() => (texto ? texto.split(/\s+/).filter(Boolean).length : 0), [texto]);
  const tiempoLectura = useMemo(() => estimarTiempoLectura(texto || ''), [texto]);

  // Sin resaltado persistente

  const _toggleEnfoque = useCallback(() => {
    setEnfoque(prev => {
      const next = !prev;
      try {
        window.dispatchEvent(new CustomEvent('visor-focus-mode', { detail: { active: next } }));
      } catch { }
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e) => { if (typeof e?.detail?.active === 'boolean') setEnfoque(e.detail.active); };
    window.addEventListener('visor-focus-mode-external', handler);
    return () => window.removeEventListener('visor-focus-mode-external', handler);
  }, []);

  const handleParagraphClick = useCallback((idx, contenido) => { if (onParagraphClick) onParagraphClick(idx, contenido); }, [onParagraphClick]);

  // Helper para resolver documentId
  const resolveDocumentId = useCallback(() => {
    return currentTextoId || completeAnalysis?.metadata?.document_id ||
      (texto ? `doc_${texto.substring(0, 50).replace(/\s+/g, '_')}` : 'documento_sin_id');
  }, [currentTextoId, completeAnalysis, texto]);

  // Guardar una cita textual directa (selección rápida)
  const handleSaveCitation = useCallback(() => {
    if (!selectionInfo?.text || selectionInfo.text.trim().length < 10) {
      console.warn('⚠️ [VisorTexto] Cita muy corta (mínimo 10 caracteres)');
      return;
    }

    const success = saveCitation({
      documentId: resolveDocumentId(),
      texto: selectionInfo.text.trim(),
      nota: '',
      tipo: 'cita'
    });

    if (success !== false) {
      setSaveSuccessMsg('📌 ¡Cita textual guardada!');
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    }

    setTimeout(() => { setSelectionInfo(null); }, 100);
  }, [selectionInfo, saveCitation, resolveDocumentId]);

  // Abrir formulario de anotación (reflexión/comentario/pregunta)
  const handleOpenAnnotation = useCallback(() => {
    if (!selectionInfo?.text || selectionInfo.text.trim().length < 3) return;
    setAnnotationMode({
      text: selectionInfo.text.trim(),
      x: selectionInfo.x,
      y: selectionInfo.y,
      tipo: 'reflexion',
      nota: ''
    });
    setSelectionInfo(null);
  }, [selectionInfo]);

  // Guardar anotación (reflexión, comentario o pregunta)
  const handleSaveAnnotation = useCallback(() => {
    if (!annotationMode?.nota?.trim()) return;

    const success = saveCitation({
      documentId: resolveDocumentId(),
      texto: annotationMode.nota.trim(),
      nota: annotationMode.text, // El fragmento original queda como referencia
      tipo: annotationMode.tipo
    });

    if (success !== false) {
      const labels = { reflexion: '💭 ¡Reflexión guardada!', comentario: '📝 ¡Comentario guardado!', pregunta: '❓ ¡Pregunta guardada!' };
      setSaveSuccessMsg(labels[annotationMode.tipo] || '✅ ¡Guardado!');
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    }

    setAnnotationMode(null);
  }, [annotationMode, saveCitation, resolveDocumentId]);

  // Función para emitir acciones desde SelectionToolbar
  const dispatchAction = useCallback((action) => {
    if (!selectionInfo?.text) return;

    const customEvent = new CustomEvent('reader-action', {
      detail: {
        action,
        text: selectionInfo.text,
        fragment: selectionInfo.text,
        fullText: texto
      },
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(customEvent);

    // Cerrar toolbar después de la acción (excepto para copiar que tiene su propia lógica)
    if (action !== 'copy') {
      setTimeout(() => {
        setSelectionInfo(null);
      }, 100);
    }
  }, [selectionInfo, texto]);

  // Función para limpiar la selección
  const clearSelection = useCallback((clearTextSelection = false) => {
    setSelectionInfo(null);
    if (clearTextSelection) {
      try {
        window.getSelection()?.removeAllRanges();
      } catch { }
    }
  }, []);


  // 🆕 Ref para limitar detección de selección SOLO al visor
  const visorContainerRef = useRef(null);

  // Listener para selección de texto (mouseup) - muestra SelectionToolbar
  // 🆕 FIX: Ahora solo se activa si la selección está DENTRO del visor
  useEffect(() => {
    const handleMouseUp = (e) => {
      // Evitar abrir toolbar si se hizo click en un botón de acción
      if (e.target.closest('button')) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionInfo(null);
        return;
      }

      // 🆕 FIX CRÍTICO: Verificar que la selección está DENTRO del visor
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      const visorEl = visorContainerRef.current;

      if (!visorEl) {
        setSelectionInfo(null);
        return;
      }

      // Verificar que tanto el inicio como el final de la selección están en el visor
      const anchorInVisor = anchorNode && visorEl.contains(anchorNode);
      const focusInVisor = focusNode && visorEl.contains(focusNode);

      if (!anchorInVisor || !focusInVisor) {
        // La selección está fuera del visor (ej: chat del tutor, sidebar)
        setSelectionInfo(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 3) {
        setSelectionInfo(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calcular posición centrada sobre la selección
      const x = rect.left + (rect.width / 2) + window.scrollX;
      const y = rect.top + window.scrollY;

      setSelectionInfo({
        text: selectedText,
        x,
        y
      });
    };

    // Escuchamos en document pero filtramos por contenedor
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Búsqueda: recompute hits al cambiar query
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchHits([]); setCurrentHit(-1); return; }
    const lc = q.toLowerCase();
    const hits = [];
    for (let i = 0; i < parrafos.length; i++) {
      const content = typeof parrafos[i] === 'string' ? parrafos[i] : (parrafos[i].text || '');
      if (content.toLowerCase().includes(lc)) {
        hits.push(i);
      }
    }
    setSearchHits(hits);
    setCurrentHit(hits.length ? 0 : -1);
  }, [searchQuery, parrafos]);

  // Auto-scroll al primer resultado cuando cambia currentHit
  useEffect(() => {
    if (currentHit >= 0 && searchHits.length > 0) {
      const idx = searchHits[currentHit];
      if (idx >= 0 && idx < parrafos.length) {
        // Pequeño delay para que se renderice el highlight
        setTimeout(() => {
          if (isVirtualizedRef.current && virtuosoRef.current && typeof virtuosoRef.current.scrollToIndex === 'function') {
            virtuosoRef.current.scrollToIndex({ index: idx, align: 'center', behavior: 'smooth' });
          } else {
            const el = paraRefs.current[idx];
            if (el && typeof el.scrollIntoView === 'function') {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 100);
      }
    }
  }, [currentHit, searchHits, parrafos.length]);

  const scrollToPara = useCallback((idx) => {
    if (idx < 0 || idx >= parrafos.length) return;
    if (isVirtualizedRef.current && virtuosoRef.current && typeof virtuosoRef.current.scrollToIndex === 'function') {
      virtuosoRef.current.scrollToIndex({ index: idx, align: 'start', behavior: 'smooth' });
    } else {
      const el = paraRefs.current[idx];
      if (el && typeof el.scrollIntoView === 'function') {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }, [parrafos.length]);

  const goNextHit = useCallback(() => {
    if (!searchHits.length) return;
    setCurrentHit(prev => {
      const next = (prev + 1) % searchHits.length;
      const idx = searchHits[next];
      scrollToPara(idx);
      return next;
    });
  }, [searchHits, scrollToPara]);

  const goPrevHit = useCallback(() => {
    if (!searchHits.length) return;
    setCurrentHit(prev => {
      const next = (prev - 1 + searchHits.length) % searchHits.length;
      const idx = searchHits[next];
      scrollToPara(idx);
      return next;
    });
  }, [searchHits, scrollToPara]);

  // 🆕 Handlers para zoom en PDF (scroll continuo)
  const handlePdfZoomIn = useCallback(() => {
    setPdfScale(prev => Math.min(prev + 0.2, 3.0));
    clearSelection(true);
  }, []);

  const handlePdfZoomOut = useCallback(() => {
    setPdfScale(prev => Math.max(prev - 0.2, 0.5));
    clearSelection(true);
  }, []);

  const handlePdfZoomReset = useCallback(() => {
    setPdfScale(1.0);
    clearSelection(true);
  }, []);

  // 🆕 Estado para navegación de búsqueda en PDF
  const [pdfSearchNav, setPdfSearchNav] = useState({ next: null, prev: null, total: 0, current: 0 });

  const handlePdfSearchNavigation = useCallback((navFunctions) => {
    setPdfSearchNav(navFunctions);
  }, []);

  const handlePdfSelection = useCallback((selectionData) => {
    if (!selectionData?.text) return;

    setSelectionInfo({
      text: selectionData.text,
      x: selectionData.x,
      y: selectionData.y,
      page: selectionData.page
    });
  }, []);

  // Progreso: con virtualización usamos rangeChanged; sin virtualización, IntersectionObserver
  useEffect(() => {
    if (isVirtualizedRef.current) return; // manejado por rangeChanged
    if (!parrafos.length) { setProgress(0); return; }
    const options = { root: null, rootMargin: '0px', threshold: 0.2 };
    const seen = new Set();
    const observer = new IntersectionObserver((entries) => {
      let maxIdx = -1;
      entries.forEach(e => {
        const idx = Number(e.target.getAttribute('data-parrafo'));
        if (e.isIntersecting) seen.add(idx); else seen.delete(idx);
        if (e.isIntersecting) {
          if (idx > maxIdx) maxIdx = idx;
        }
      });
      const highest = seen.size ? Math.max(...Array.from(seen)) : Math.max(maxIdx, 0);
      setProgress(((highest + 1) / parrafos.length) * 100);
    }, options);
    paraRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [parrafos.length]);

  const _copyToClipboard = useCallback(async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      // Opcional: mostrar notificación de éxito
      console.log('✅ Texto copiado al portapapeles');
    } catch (err) {
      console.error('❌ Error copiando al portapapeles:', err);
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('✅ Texto copiado (método fallback)');
      } catch (e) {
        console.error('❌ Error en fallback:', e);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  // Función mejorada para detectar tipo de elemento textual
  const detectParagraphType = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return 'p';

    // 🆕 0. SECCIONES ACADÉMICAS ESPECÍFICAS (prioridad máxima)
    const academicSections = /^(resumen|abstract|introducción|introduction|objetivos|objectives|metodología|methodology|resultados|results|conclusiones|conclusions|referencias|references|bibliografía|bibliography|anexos|appendix|agradecimientos|acknowledgments|marco teórico|theoretical framework|discusión|discussion|análisis|analysis)/i;
    if (academicSections.test(trimmed) && trimmed.length < 100) {
      return {
        type: 'section-header',
        level: 1,
        category: trimmed.toLowerCase().replace(/\s+/g, '_').split(/[:-]/)[0]
      };
    }

    // 1. LISTAS CON VIÑETAS: -, *, •, ◦, ▪, ‣
    const bulletPattern = /^[-*•◦▪‣]\s+/;
    if (bulletPattern.test(trimmed)) {
      return { type: 'list-item', bullet: true };
    }

    // 2. LISTAS NUMERADAS (con captura del número): 1., 1), a), a., i., etc.
    const numberedListPattern = /^([\d]+|[a-z]|[ivxlcdm]+)[.)]\s+/i;
    if (numberedListPattern.test(trimmed)) {
      return { type: 'list-item', bullet: false, marker: trimmed.match(numberedListPattern)[0] };
    }

    // 3. CITAS O BLOQUES INDENTADOS: empieza con > o tiene indentación notable
    if (trimmed.startsWith('>') || /^\s{4,}/.test(text)) {
      return { type: 'blockquote' };
    }

    // 4. NOTAS AL PIE O REFERENCIAS: [1], (1), *1, †
    const footnotePattern = /^(?:\[|\()?\d+(?:\]|\))?\s*[:-]?\s+/;
    if (footnotePattern.test(trimmed) && trimmed.length < 200) {
      return { type: 'footnote' };
    }

    // 5. TÍTULOS CON FORMATO ESPECIAL
    const isShort = trimmed.length < 120;
    const noPeriod = !trimmed.endsWith('.');
    const startsWithNumber = /^[\d]+[.)]\s+[A-ZÁÉÍÓÚÑ]/.test(trimmed); // Requiere mayúscula después
    const startsWithRoman = /^[IVX]+[.)]\s+/.test(trimmed);
    const hasChapter = /^(capítulo|cap\.|chapter|sección|parte|anexo|apéndice)/i.test(trimmed);
    const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(trimmed) && trimmed.length > 3 && trimmed.length < 100;
    const isFirstLineShort = trimmed.split('\n')[0].length < 80;

    // Detectar títulos con mayor precisión
    if (isAllCaps && isShort) {
      return { type: 'h1' }; // Títulos en mayúsculas = H1
    }

    if (hasChapter || startsWithRoman) {
      return { type: 'h2' }; // Capítulos o numeración romana = H2
    }

    if (startsWithNumber && isShort && noPeriod) {
      return { type: 'h3' }; // Numerados cortos sin punto final = H3
    }

    if (isShort && noPeriod && isFirstLineShort && !bulletPattern.test(trimmed) && /^[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
      // Líneas cortas que empiezan con mayúscula, sin punto final = probablemente título
      return { type: 'h3' };
    }

    // 6. PÁRRAFO NORMAL
    return { type: 'p' };
  }, []);

  const renderParrafo = useCallback((parrafoData, index) => {
    // Manejar tanto formato antiguo (string) como nuevo (objeto con text/type/metadata)
    const content = typeof parrafoData === 'string' ? parrafoData : parrafoData.text;
    const aiType = typeof parrafoData === 'object' ? parrafoData.type : null;
    const metadata = typeof parrafoData === 'object' ? parrafoData.metadata : {};

    const isSearchHit = searchHits.includes(index);
    const isCurrent = currentHit >= 0 && searchHits[currentHit] === index;

    // Determinar tipo de elemento
    let elementType = aiType; // Priorizar tipo de IA si existe
    let detection = null;

    // Si no hay tipo de IA o es 'paragraph', usar detección heurística
    if (!elementType || elementType === 'paragraph') {
      detection = detectParagraphType(content);
      elementType = typeof detection === 'string' ? detection : detection.type;

      // Debug: mostrar detecciones especiales
      if (elementType === 'section-header') {
        console.log('🎯 [VisorTexto] Sección detectada:', {
          index,
          preview: content.substring(0, 50),
          type: elementType,
          category: detection.category
        });
      }
    }

    const renderWithHighlights = (text, query) => {
      const q = (query || '').trim();
      if (!q) return text;
      try {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => {
          if (part.toLowerCase() === q.toLowerCase()) {
            return <mark key={`m-${index}-${i}`}>{part}</mark>;
          }
          return <React.Fragment key={`t-${index}-${i}`}>{part}</React.Fragment>;
        });
      } catch {
        return text;
      }
    };

    // Preparar contenido (quitar viñetas/marcadores del texto si no vienen de IA)
    let displayContent = content;
    if (!aiType) {
      // Solo limpiar si estamos usando detección heurística
      if (elementType === 'list-item') {
        displayContent = content.replace(/^[-*•◦▪‣]\s+/, '').replace(/^([\d]+|[a-z]|[ivxlcdm]+)[.)]\s+/i, '');
      } else if (elementType === 'blockquote') {
        displayContent = content.replace(/^>\s*/, '').replace(/^\s{4,}/, '');
      }
    }

    const renderedContent = searchQuery ? renderWithHighlights(displayContent, searchQuery) : displayContent;

    // 🆕 Renderizar elementos académicos especiales detectados por IA o heurística
    if (elementType === 'section-header') {
      const _level = metadata.level || 1;
      const category = metadata.category || '';

      // Determinar si viene de heurística o IA
      const detection = !aiType ? detectParagraphType(content) : null;
      const actualCategory = category || (detection?.category) || '';

      return (
        <Parrafo
          key={index}
          as="h1"
          data-parrafo={index}
          data-section-category={actualCategory}
          ref={el => { if (!isVirtualizedRef.current) paraRefs.current[index] = el; }}
          $compact={false}
          $selected={activeIndex === index}
          $searchHit={isSearchHit}
          $currentHit={isCurrent}
          style={{
            color: actualCategory.includes('resumen') || actualCategory.includes('abstract')
              ? '#6366f1'
              : actualCategory.includes('introduc') || actualCategory.includes('introduction')
                ? '#8b5cf6'
                : actualCategory.includes('metodolog') || actualCategory.includes('methodology')
                  ? '#3b82f6'
                  : actualCategory.includes('resultado') || actualCategory.includes('results')
                    ? '#10b981'
                    : actualCategory.includes('conclus') || actualCategory.includes('conclusion')
                      ? '#f59e0b'
                      : '#6366f1',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: 'center',
            borderBottom: '3px solid currentColor',
            paddingBottom: '0.5rem',
            marginTop: '2rem',
            marginBottom: '1.5rem'
          }}
          onClick={(_e) => {
            handleParagraphClick(index, content);
            setActiveIndex(index);
          }}
        >
          {renderedContent}
        </Parrafo>
      );
    }

    if (elementType === 'emphasis') {
      return (
        <Parrafo
          key={index}
          data-parrafo={index}
          ref={el => { if (!isVirtualizedRef.current) paraRefs.current[index] = el; }}
          $compact={bigText}
          $selected={activeIndex === index}
          $searchHit={isSearchHit}
          $currentHit={isCurrent}
          style={{
            backgroundColor: 'rgba(255, 235, 59, 0.15)',
            borderLeft: '3px solid #fbc02d',
            fontWeight: 500
          }}
          onClick={(_e) => {
            handleParagraphClick(index, content);
            setActiveIndex(index);
          }}
        >
          {renderedContent}
        </Parrafo>
      );
    }

    // Renderizar según el tipo detectado (heurístico o IA)
    if (elementType === 'list-item') {
      const detection = detectParagraphType(content);
      return (
        <ListItem
          key={index}
          data-parrafo={index}
          $bullet={typeof detection === 'object' ? detection.bullet !== false : true}
          $marker={typeof detection === 'object' ? detection.marker : null}
          $selected={activeIndex === index}
          $searchHit={isSearchHit}
          $currentHit={isCurrent}
          onClick={(_e) => {
            handleParagraphClick(index, content);
            setActiveIndex(index);
          }}
        >
          {renderedContent}
        </ListItem>
      );
    }

    if (elementType === 'blockquote') {
      return (
        <BlockQuote
          key={index}
          data-parrafo={index}
          onClick={(_e) => {
            handleParagraphClick(index, content);
            setActiveIndex(index);
          }}
        >
          {renderedContent}
        </BlockQuote>
      );
    }

    if (elementType === 'footnote') {
      return (
        <Footnote
          key={index}
          data-parrafo={index}
          onClick={(_e) => {
            handleParagraphClick(index, content);
            setActiveIndex(index);
          }}
        >
          {renderedContent}
        </Footnote>
      );
    }

    // Renderizado por defecto para títulos y párrafos
    return (
      <Parrafo
        key={index}
        as={elementType}
        data-parrafo={index}
        ref={el => { if (!isVirtualizedRef.current) paraRefs.current[index] = el; }}
        $compact={bigText}
        $selected={activeIndex === index}
        $searchHit={isSearchHit}
        $currentHit={isCurrent}
        onClick={(_e) => {
          handleParagraphClick(index, content);
          setActiveIndex(index);
        }}
      >
        {renderedContent}
      </Parrafo>
    );
  }, [handleParagraphClick, searchHits, currentHit, bigText, activeIndex, searchQuery, detectParagraphType]);


  const isVirtualized = parrafos.length > VIRTUALIZATION_THRESHOLD;
  isVirtualizedRef.current = isVirtualized;

  // 🆕 Header chrome para modo PDF (scroll continuo)
  const pdfHeaderChrome = isPDF && pdfNumPages ? (
    <>
      <ToolsBar aria-label="herramientas-pdf">
        <button aria-label="zoom-out" onClick={handlePdfZoomOut}>🔍−</button>
        <span style={{ fontSize: '.85rem', fontWeight: '600', minWidth: '55px', textAlign: 'center' }}>{Math.round(pdfScale * 100)}%</span>
        <button aria-label="zoom-in" onClick={handlePdfZoomIn}>🔍+</button>
        <button aria-label="reset-zoom" onClick={handlePdfZoomReset}>Reset</button>
        <input
          type="search"
          placeholder="Buscar en el PDF..."
          aria-label="buscar-pdf"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ minWidth: '200px' }}
        />
        <button aria-label="anterior-coincidencia" disabled={pdfSearchNav.total === 0} onClick={() => pdfSearchNav.prev?.()}>◀</button>
        <button aria-label="siguiente-coincidencia" disabled={pdfSearchNav.total === 0} onClick={() => pdfSearchNav.next?.()}>▶</button>
        <span aria-live="polite" style={{ fontSize: '.8rem' }}>{pdfSearchNav.total > 0 ? `${pdfSearchNav.current} / ${pdfSearchNav.total}` : '0 / 0'}</span>
        <button aria-label="abrir-notas" onClick={() => window.dispatchEvent(new CustomEvent('reader-action', { detail: { action: 'notes' } }))}>📝 Notas</button>
      </ToolsBar>
      <MetaBar>
        <span>📄 {archivoActual?.name || 'Documento PDF'}</span>
        <span>{pdfNumPages} páginas • Lectura continua</span>
      </MetaBar>
    </>
  ) : null;

  // Header chrome para modo texto
  const headerChrome = !isPDF ? (
    <>
      <ProgressBar aria-label="progreso-lectura" $percent={progress} />
      <ToolsBar aria-label="herramientas-lectura">
        <button aria-label="disminuir-tamano" onClick={() => setFontSize(f => Math.max(MIN_FONT_SIZE, f - 1))}>A−</button>
        <button aria-label="aumentar-tamano" onClick={() => setFontSize(f => Math.min(MAX_FONT_SIZE, f + 1))}>A+</button>
        <button aria-label="reset-visor" onClick={() => { setFontSize(DEFAULT_FONT_SIZE); setSearchQuery(''); setSearchHits([]); setCurrentHit(-1); setEnfoque(false); }}>Reset</button>
        <input
          type="search"
          placeholder="Buscar en el texto..."
          aria-label="buscar-texto"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button aria-label="anterior-coincidencia" disabled={!searchHits.length} onClick={goPrevHit}>◀</button>
        <button aria-label="siguiente-coincidencia" disabled={!searchHits.length} onClick={goNextHit}>▶</button>
        <span aria-live="polite" style={{ fontSize: '.8rem' }}>{searchHits.length ? `${(currentHit + 1)} / ${searchHits.length}` : '0 / 0'}</span>
        <button aria-label="abrir-notas" onClick={() => window.dispatchEvent(new CustomEvent('reader-action', { detail: { action: 'notes' } }))}>📝 Notas</button>
      </ToolsBar>
      <MetaBar data-testid="rw-stats">
        <span>{parrafos.length} párrafos</span>
        <span>{totalPalabras} palabras</span>
        <span>{texto.length} caracteres</span>
        <span>~{tiempoLectura} min</span>
        {parrafos.length > VIRTUALIZATION_THRESHOLD && <span>Virtualizado</span>}
      </MetaBar>
    </>
  ) : null;

  // 🆕 Renderizado dual: PDF (scroll continuo) vs Texto
  const body = isPDF && pdfSource ? (
    <>
      {pdfHeaderChrome}
      <PDFViewer
        key={`pdf-${archivoActual?.name || 'none'}-${archivoActual?.size || 0}-${pdfScale.toFixed(2)}`}
        file={pdfSource}
        scale={pdfScale}
        searchQuery={searchQuery}
        onSearchNavigation={handlePdfSearchNavigation}
        onDocumentLoad={({ numPages }) => setPdfNumPages(numPages)}
        onSelection={handlePdfSelection}
      />
    </>
  ) : isVirtualized ? (
    <Virtuoso
      style={{ height: '100%' }}
      ref={virtuosoRef}
      totalCount={parrafos.length}
      components={{ Header: () => headerChrome }}
      itemContent={(i) => renderParrafo(parrafos[i], i)}
      rangeChanged={(range) => {
        // range: { startIndex, endIndex }
        const pct = ((range.endIndex + 1) / parrafos.length) * 100;
        setProgress(pct);
      }}
    />
  ) : (
    <>
      {headerChrome}
      {parrafos.map(renderParrafo)}
    </>
  );

  return (
    <VisorWrapper style={isPDF ? undefined : { fontSize: `${fontSize}px` }}>
      <div ref={visorContainerRef} role="document" aria-label="contenido-lectura">{body}</div>
      {selectionInfo && !annotationMode && (
        <SelectionToolbar x={selectionInfo.x} y={selectionInfo.y} role="toolbar" aria-label="seleccion-herramientas">
          <button aria-label="explicar-seleccion" onClick={() => dispatchAction('explain')}>💡 Explicar</button>
          <button aria-label="guardar-cita-seleccion" onClick={handleSaveCitation}>📌 Cita</button>
          <button aria-label="anotar-seleccion" onClick={handleOpenAnnotation}>📓 Anotar</button>
          <button aria-label="copiar-seleccion" onClick={() => {
            try {
              navigator.clipboard.writeText(selectionInfo.text || '');
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch { }
            clearSelection(true);
          }}>📋 Copiar</button>
          <button aria-label="cerrar-toolbar" onClick={() => clearSelection(true)}>✖</button>
        </SelectionToolbar>
      )}
      {annotationMode && (
        <AnnotationForm x={annotationMode.x} y={annotationMode.y} role="dialog" aria-label="formulario-anotacion">
          <div className="annotation-header">📓 Anotar sobre selección</div>
          <div className="annotation-quote">«{annotationMode.text.length > 80 ? annotationMode.text.substring(0, 80) + '…' : annotationMode.text}»</div>
          <div className="annotation-types">
            {[{ key: 'reflexion', label: '💭 Reflexión' }, { key: 'comentario', label: '📝 Comentario' }, { key: 'pregunta', label: '❓ Pregunta' }].map(t => (
              <button key={t.key} type="button"
                className={`annotation-type-btn ${annotationMode.tipo === t.key ? 'active' : ''}`}
                onClick={() => setAnnotationMode(prev => ({ ...prev, tipo: t.key }))}
              >{t.label}</button>
            ))}
          </div>
          <textarea
            placeholder={annotationMode.tipo === 'reflexion' ? '¿Qué te hace pensar este fragmento?'
              : annotationMode.tipo === 'pregunta' ? '¿Qué pregunta te surge?'
              : 'Escribe tu comentario sobre este fragmento…'}
            value={annotationMode.nota}
            onChange={e => setAnnotationMode(prev => ({ ...prev, nota: e.target.value }))}
            onPaste={e => e.preventDefault()}
            autoFocus
          />
          <div className="annotation-actions">
            <button type="button" className="annotation-cancel" onClick={() => setAnnotationMode(null)}>Cancelar</button>
            <button type="button" className="annotation-save" onClick={handleSaveAnnotation}
              disabled={!annotationMode.nota?.trim()}
            >Guardar</button>
          </div>
        </AnnotationForm>
      )}
      {copied && (
        <CopyToast role="status" aria-live="polite">✅ Copiado</CopyToast>
      )}
      {showSaveSuccess && (
        <SaveSuccessToast role="status" aria-live="polite">{saveSuccessMsg}</SaveSuccessToast>
      )}
    </VisorWrapper>
  );
}

export default React.memo(VisorTextoResponsive);
