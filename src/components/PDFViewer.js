import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import styled from 'styled-components';

// Importar estilos de react-pdf (nueva ubicación)
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import logger from '../utils/logger';

// ─── Constantes de virtualización ───
const PAGE_BUFFER = 3;          // nº de páginas fuera del viewport que se mantienen renderizadas
const PLACEHOLDER_HEIGHT = 800; // px – alto estimado mientras la página real no se ha montado

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: ${props => props.theme?.background || '#f5f5f5'};
  padding: 2rem clamp(0.5rem, 2vw, 2rem);

  /* Mejorar la selección de texto en PDFs */
  .react-pdf__Page__textContent {
    user-select: text;
    
    /* Capa de texto semi-transparente: suficiente para selección y búsqueda */
    opacity: 0.2;
    
    /* Color de selección más oscuro y visible */
    ::selection {
      background: rgba(37, 99, 235, 0.4);
    }
    
    ::-moz-selection {
      background: rgba(37, 99, 235, 0.4);
    }

    /* Resaltado de búsqueda en PDF */
    .pdf-search-highlight {
      background: rgba(255, 245, 157, 0.95) !important;
      border-radius: 2px;
      box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.5);
      opacity: 1 !important;
      mix-blend-mode: multiply;
    }

    /* Resultado actual resaltado con color más intenso */
    .pdf-search-current {
      background: rgba(255, 152, 0, 0.95) !important;
      box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.7) !important;
      mix-blend-mode: multiply;
    }
  }
  
  /* La capa de anotaciones debe estar por encima */
  .react-pdf__Page__annotations {
    z-index: 2;
  }
`;

const PageContainer = styled.div`
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
  background: white;
  position: relative;

  /* Indicador de número de página */
  &::before {
    content: 'Página ' attr(data-page-number);
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    z-index: 10;
    pointer-events: none;
    opacity: 0.7;
  }

  canvas {
    display: block;
    max-width: 100%;
    height: auto !important;
  }
`;

const PagePlaceholder = styled.div`
  width: 100%;
  height: ${p => p.$height || PLACEHOLDER_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
  background: ${p => p.theme?.surface || '#f8f8fa'};
`;

const LoadingMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #666;
  font-size: 1.1em;
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #d32f2f;
  font-size: 1.1em;
  background: #ffebee;
  border-radius: 8px;
  margin: 2rem;
`;

// ─── Helpers ───

/** Programa trabajo no crítico en idle frames; fallback a setTimeout(cb, 50) */
const scheduleIdle = typeof requestIdleCallback === 'function'
  ? (cb) => requestIdleCallback(cb, { timeout: 300 })
  : (cb) => setTimeout(cb, 50);

const cancelIdle = typeof cancelIdleCallback === 'function'
  ? (id) => cancelIdleCallback(id)
  : (id) => clearTimeout(id);

// ─── Componente de página individual (lazy con IntersectionObserver) ───
const LazyPage = React.memo(function LazyPage({ pageNumber, scale, isVisible, measuredHeight }) {
  if (!isVisible) {
    return (
      <PagePlaceholder
        data-page-number={pageNumber}
        $height={measuredHeight || PLACEHOLDER_HEIGHT}
      >
        Página {pageNumber}
      </PagePlaceholder>
    );
  }

  return (
    <PageContainer data-page-number={pageNumber}>
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        loading={<LoadingMessage>Cargando página {pageNumber}...</LoadingMessage>}
      />
    </PageContainer>
  );
});

/**
 * Visor de PDF virtualizado en modo scroll continuo.
 * Solo renderiza las páginas cercanas al viewport (±PAGE_BUFFER) usando
 * IntersectionObserver. Las demás se reemplazan por placeholders livianos,
 * evitando montar cientos de <canvas> simultáneamente.
 */
function PDFViewer({
  file,
  pageNumber: _pageNumber = 1,
  scale = 1.2,
  onDocumentLoad,
  onLoadError,
  onSelection,
  searchQuery = '',
  onSearchNavigation,
  className,
}) {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [searchApplied, setSearchApplied] = useState(false);
  const searchMatchesRef = useRef([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Virtualización: set de páginas visibles
  const [visiblePages, setVisiblePages] = useState(new Set([1, 2, 3]));
  const pageHeightsRef = useRef({});      // cache de alturas reales medidas
  const pageRefsMap = useRef({});          // ref a cada wrapper de página
  const ioRef = useRef(null);              // IntersectionObserver

  // Key única por archivo (sin incluir scale para evitar reparse al hacer zoom)
  const fileId = useMemo(() => {
    if (!file) return 'no-file';
    if (file instanceof File) return `file-${file.name}-${file.size}-${file.lastModified}`;
    if (typeof file === 'string') return `url-${file.substring(0, 100)}`;
    if (file instanceof Blob) return `blob-${file.size}-${Date.now()}`;
    return `unknown-${Date.now()}`;
  }, [file]);

  // Reset al cambiar de archivo
  useEffect(() => {
    logger.log('📄 [PDFViewer] Archivo cambió, reseteando estado');
    setNumPages(null);
    setVisiblePages(new Set([1, 2, 3]));
    pageHeightsRef.current = {};
  }, [fileId]);

  const handleDocumentLoadSuccess = useCallback((doc) => {
    logger.log('📄 PDF cargado:', doc.numPages, 'páginas (virtualizado)');
    setNumPages(doc.numPages);
    onDocumentLoad?.({ numPages: doc.numPages });
  }, [onDocumentLoad]);

  const handleDocumentLoadError = useCallback((error) => {
    logger.error('❌ Error cargando PDF:', error);
    onLoadError?.(error);
  }, [onLoadError]);

  // ── IntersectionObserver para virtualización de páginas ──
  useEffect(() => {
    if (!numPages || !containerRef.current) return;

    const io = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const pageNum = Number(entry.target.getAttribute('data-page-idx'));
            if (!pageNum) return;

            if (entry.isIntersecting) {
              // Hacer visible esta página y ±PAGE_BUFFER vecinas
              for (let i = Math.max(1, pageNum - PAGE_BUFFER); i <= Math.min(numPages, pageNum + PAGE_BUFFER); i++) {
                next.add(i);
              }
            }
          });

          // Limpiar páginas demasiado lejos del viewport
          const visibleArr = entries.filter(e => e.isIntersecting).map(e => Number(e.target.getAttribute('data-page-idx'))).filter(Boolean);
          if (visibleArr.length > 0) {
            const minVisible = Math.min(...visibleArr);
            const maxVisible = Math.max(...visibleArr);
            for (const p of next) {
              if (p < minVisible - PAGE_BUFFER * 2 || p > maxVisible + PAGE_BUFFER * 2) {
                next.delete(p);
              }
            }
          }

          // Evitar setState innecesario si no cambió
          if (next.size === prev.size && [...next].every(p => prev.has(p))) return prev;
          return next;
        });
      },
      {
        root: containerRef.current,
        rootMargin: '600px 0px',   // pre-cargar las que están a ±600px del viewport
        threshold: 0,
      },
    );

    ioRef.current = io;

    // Observar los wrappers de cada página
    Object.values(pageRefsMap.current).forEach((el) => {
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, [numPages]);

  // Medir alturas reales de páginas renderizadas para mantener placeholders fidedignos
  useEffect(() => {
    if (!numPages) return;
    const timer = setTimeout(() => {
      Object.entries(pageRefsMap.current).forEach(([pageStr, el]) => {
        if (!el) return;
        const h = el.getBoundingClientRect().height;
        if (h > 50) pageHeightsRef.current[Number(pageStr)] = h;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [visiblePages, numPages, scale]);

  // Registrar ref y observar con IntersectionObserver
  const setPageRef = useCallback(
    (pageNum) => (el) => {
      pageRefsMap.current[pageNum] = el;
      if (el && ioRef.current) {
        ioRef.current.observe(el);
      }
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    if (!onSelection) return;
    const selection = window.getSelection && window.getSelection();
    if (!selection || selection.isCollapsed) {
      onSelection(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      onSelection(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      let selectedPage = 1;
      const pageElements = containerRef.current?.querySelectorAll('[data-page-number]');
      if (pageElements) {
        pageElements.forEach(pageEl => {
          const pageRect = pageEl.getBoundingClientRect();
          if (rect.top >= pageRect.top && rect.top <= pageRect.bottom) {
            selectedPage = parseInt(pageEl.getAttribute('data-page-number'), 10);
          }
        });
      }

      onSelection({
        text: selectedText,
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.top + window.scrollY - 12,
        page: selectedPage,
      });
    } catch (err) {
      logger.warn('⚠️ No se pudo obtener el rectángulo de selección:', err);
      onSelection({ text: selectedText, page: 1 });
    }
  }, [onSelection]);

  const handleMouseDown = useCallback(() => {
    onSelection?.(null);
  }, [onSelection]);

  // Reset de scroll al cambiar de archivo (no al cambiar zoom)
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    } catch {
      containerRef.current.scrollTop = 0;
    }
  }, [file]);

  // ── Búsqueda asíncrona en PDF (usa requestIdleCallback para no bloquear UI) ──
  useEffect(() => {
    if (!searchQuery.trim() || !containerRef.current) {
      // Limpiar resaltado previo
      const highlights = containerRef.current?.querySelectorAll('.pdf-search-highlight, .pdf-search-current');
      highlights?.forEach(h => h.classList.remove('pdf-search-highlight', 'pdf-search-current'));
      searchMatchesRef.current = [];
      setCurrentMatchIndex(-1);
      setSearchApplied(false);
      return;
    }

    // Debounce: esperar 350ms tras el último cambio de query
    const debounce = setTimeout(() => {
      if (!containerRef.current) return;

      const textLayers = Array.from(
        containerRef.current.querySelectorAll('.react-pdf__Page__textContent'),
      );

      const matchedSpanGroups = [];
      const matchKeys = new Set();
      const query = searchQuery.trim();
      const queryLower = query.toLowerCase();
      let layerIdx = 0;

      // Procesar capas de texto en batches vía requestIdleCallback
      const processNextBatch = () => {
        const BATCH = 5; // páginas por idle frame
        const end = Math.min(layerIdx + BATCH, textLayers.length);

        for (; layerIdx < end; layerIdx++) {
          const layer = textLayers[layerIdx];
          const pageNumber = Number(
            layer.closest('[data-page-number]')?.getAttribute('data-page-number') || 0,
          );
          const spans = Array.from(layer.querySelectorAll('span'));

          // Limpiar clases previas
          spans.forEach(span => span.classList.remove('pdf-search-highlight', 'pdf-search-current'));

          // Reconstruir texto completo de la página
          let fullText = '';
          const spanMap = [];
          spans.forEach(span => {
            const text = span.textContent || '';
            const start = fullText.length;
            fullText += text;
            spanMap.push({ start, end: fullText.length, span });
          });

          const fullTextLower = fullText.toLowerCase();
          let searchPos = 0;

          while (searchPos < fullTextLower.length) {
            const matchStart = fullTextLower.indexOf(queryLower, searchPos);
            if (matchStart === -1) break;
            const matchEnd = matchStart + queryLower.length;
            const matchKey = `${pageNumber}:${matchStart}:${matchEnd}`;

            if (!matchKeys.has(matchKey)) {
              const affectedSpans = [];
              for (const si of spanMap) {
                if (si.end > matchStart && si.start < matchEnd) affectedSpans.push(si.span);
              }
              if (affectedSpans.length > 0) {
                matchKeys.add(matchKey);
                affectedSpans.forEach(s => s.classList.add('pdf-search-highlight'));
                matchedSpanGroups.push(affectedSpans[0]);
              }
            }
            searchPos = matchStart + 1;
          }
        }

        if (layerIdx < textLayers.length) {
          // Quedan más capas — programar siguiente batch sin bloquear
          scheduleIdle(processNextBatch);
        } else {
          // Terminado
          searchMatchesRef.current = matchedSpanGroups;
          logger.log('🔍 [PDF Search]', { query, matches: matchedSpanGroups.length });
          if (matchedSpanGroups.length > 0) {
            setCurrentMatchIndex(0);
            matchedSpanGroups[0].classList.add('pdf-search-current');
            matchedSpanGroups[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setSearchApplied(true);
        }
      };

      const idleId = scheduleIdle(processNextBatch);
      // Guardar para cleanup
      return () => cancelIdle(idleId);
    }, 350);

    return () => clearTimeout(debounce);
  }, [searchQuery, numPages, visiblePages]);

  // Exponer funciones de navegación al componente padre
  useEffect(() => {
    if (!onSearchNavigation) return;

    const goToNextMatch = () => {
      const matches = searchMatchesRef.current;
      if (matches.length === 0) return;
      matches[currentMatchIndex]?.classList.remove('pdf-search-current');
      const nextIndex = (currentMatchIndex + 1) % matches.length;
      setCurrentMatchIndex(nextIndex);
      matches[nextIndex].classList.add('pdf-search-current');
      matches[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const goToPrevMatch = () => {
      const matches = searchMatchesRef.current;
      if (matches.length === 0) return;
      matches[currentMatchIndex]?.classList.remove('pdf-search-current');
      const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
      setCurrentMatchIndex(prevIndex);
      matches[prevIndex].classList.add('pdf-search-current');
      matches[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    onSearchNavigation({
      next: goToNextMatch,
      prev: goToPrevMatch,
      total: searchMatchesRef.current.length,
      current: currentMatchIndex + 1,
    });
  }, [currentMatchIndex, onSearchNavigation, searchApplied]);

  if (!file) {
    return (
      <LoadingMessage>
        📄 Carga un archivo PDF para visualizarlo
      </LoadingMessage>
    );
  }

  return (
    <ViewerContainer
      ref={containerRef}
      className={className}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      <Document
        key={`doc-${fileId}`}
        file={file}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={<LoadingMessage>⏳ Cargando PDF...</LoadingMessage>}
        error={<ErrorMessage>❌ Error al cargar el PDF. Verifica que el archivo sea válido.</ErrorMessage>}
      >
        {numPages && Array.from({ length: numPages }, (_, index) => {
          const pageNum = index + 1;
          return (
            <div
              key={`page-wrap-${pageNum}`}
              ref={setPageRef(pageNum)}
              data-page-idx={pageNum}
            >
              <LazyPage
                pageNumber={pageNum}
                scale={scale}
                isVisible={visiblePages.has(pageNum)}
                measuredHeight={pageHeightsRef.current[pageNum]}
              />
            </div>
          );
        })}
      </Document>
    </ViewerContainer>
  );
}

export default PDFViewer;
