import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import styled from 'styled-components';

// Importar estilos de react-pdf (nueva ubicación)
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
    
    /* Reducir opacidad de la capa de texto para minimizar el efecto "fantasma" */
    opacity: 0.4;
    
    /* Color de selección más oscuro y visible */
    ::selection {
      background: rgba(37, 99, 235, 0.4);
    }
    
    ::-moz-selection {
      background: rgba(37, 99, 235, 0.4);
    }

    /* Resaltado de búsqueda en PDF */
    .pdf-search-highlight {
      background: rgba(255, 245, 157, 0.8) !important;
      border-radius: 2px;
      box-shadow: 0 0 0 1px rgba(255, 193, 7, 0.3);
      opacity: 1 !important;
    }

    /* Resultado actual resaltado con color más intenso */
    .pdf-search-current {
      background: rgba(255, 193, 7, 0.9) !important;
      box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.6) !important;
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

/**
 * Visor de PDF en modo scroll continuo.
 * Renderiza TODAS las páginas del documento en una columna vertical.
 * Permite scroll natural y selección de texto en cualquier página.
 */
function PDFViewer({
  file,
  pageNumber: _pageNumber = 1, // Ya no se usa para navegación, solo para scroll inicial
  scale = 1.2,
  onDocumentLoad,
  onLoadError,
  onSelection,
  searchQuery = '',
  onSearchNavigation,
  className,
}) {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = React.useState(null);
  const [searchApplied, setSearchApplied] = useState(false);
  const searchMatchesRef = useRef([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // 🆕 FIX: Generar key única para cada archivo para forzar remount del Document
  // Esto evita que react-pdf mantenga estado corrupto del PDF anterior
  const fileId = React.useMemo(() => {
    if (!file) return 'no-file';
    if (file instanceof File) return `file-${file.name}-${file.size}-${file.lastModified}`;
    if (typeof file === 'string') return `url-${file.substring(0, 100)}`;
    if (file instanceof Blob) return `blob-${file.size}-${Date.now()}`;
    return `unknown-${Date.now()}`;
  }, [file]);

  // 🆕 FIX: Reset numPages when file changes to prevent stale rendering
  useEffect(() => {
    console.log('📄 [PDFViewer] Archivo cambió, reseteando estado');
    setNumPages(null);
  }, [fileId]);

  const handleDocumentLoadSuccess = useCallback((doc) => {
    console.log('📄 PDF cargado:', doc.numPages, 'páginas (modo continuo)');
    setNumPages(doc.numPages);
    onDocumentLoad?.({ numPages: doc.numPages });
  }, [onDocumentLoad]);

  const handleDocumentLoadError = useCallback((error) => {
    console.error('❌ Error cargando PDF:', error);
    console.error('❌ Tipo de archivo recibido:', typeof file, file);
    onLoadError?.(error);
  }, [onLoadError, file]);

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

      // Determinar en qué página está la selección
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
      console.warn('⚠️ No se pudo obtener el rectángulo de selección:', err);
      onSelection({ text: selectedText, page: 1 });
    }
  }, [onSelection]);

  const handleMouseDown = useCallback(() => {
    onSelection?.(null);
  }, [onSelection]);

  useEffect(() => {
    // Resetear scroll solo cuando cambia el archivo o el zoom
    if (!containerRef.current) return;
    try {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    } catch {
      containerRef.current.scrollTop = 0;
    }
  }, [scale, file]);

  // Búsqueda en PDF: resaltar palabras completas (maneja palabras fragmentadas en múltiples spans)
  useEffect(() => {
    if (!searchQuery.trim() || !containerRef.current) {
      // Limpiar resaltado previo
      const highlights = containerRef.current?.querySelectorAll('.pdf-search-highlight, .pdf-search-current');
      highlights?.forEach(h => {
        h.classList.remove('pdf-search-highlight', 'pdf-search-current');
      });
      searchMatchesRef.current = [];
      setCurrentMatchIndex(-1);
      setSearchApplied(false);
      return;
    }

    // Dar tiempo a que se renderice el PDF
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      const textLayers = containerRef.current.querySelectorAll('.react-pdf__Page__textContent');
      const matchedSpanGroups = [];
      const query = searchQuery.trim();

      textLayers.forEach(layer => {
        const spans = Array.from(layer.querySelectorAll('span'));

        // Limpiar clases previas
        spans.forEach(span => {
          span.classList.remove('pdf-search-highlight', 'pdf-search-current');
        });

        // Reconstruir texto completo de la página manteniendo estructura
        let fullText = '';
        const spanMap = []; // Mapeo de posición en fullText a span

        spans.forEach(span => {
          const text = span.textContent || '';
          const start = fullText.length;
          fullText += text;
          const end = fullText.length;
          spanMap.push({ start, end, span, text });
        });

        // Buscar en el texto completo (con espacios)
        const queryLower = query.toLowerCase();

        // Buscar todas las ocurrencias usando split para palabras completas
        const words = fullText.split(/\b/);
        let currentPos = 0;

        words.forEach(word => {
          const wordLower = word.toLowerCase();

          // Verificar coincidencia exacta (ignorando mayúsculas)
          if (wordLower === queryLower) {
            const matchStart = currentPos;
            const matchEnd = currentPos + word.length;
            const affectedSpans = [];

            for (const spanInfo of spanMap) {
              // Si el span intersecta con el rango de la coincidencia
              if (spanInfo.end > matchStart && spanInfo.start < matchEnd) {
                affectedSpans.push(spanInfo.span);
              }
            }

            if (affectedSpans.length > 0) {
              affectedSpans.forEach(span => span.classList.add('pdf-search-highlight'));
              matchedSpanGroups.push(affectedSpans[0]); // Primer span para scroll
            }
          }

          currentPos += word.length;
        });
      });

      searchMatchesRef.current = matchedSpanGroups;

      console.log('🔍 [PDF Search]', {
        query: searchQuery,
        matches: matchedSpanGroups.length,
        textLayers: textLayers.length
      });

      // Resaltar y hacer scroll al primer resultado
      if (matchedSpanGroups.length > 0) {
        setCurrentMatchIndex(0);
        matchedSpanGroups[0].classList.add('pdf-search-current');
        matchedSpanGroups[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setSearchApplied(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, numPages]);

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
      current: currentMatchIndex + 1
    });
  }, [currentMatchIndex, onSearchNavigation, searchApplied]);

  if (!file) {
    return (
      <LoadingMessage>
        📄 Carga un archivo PDF para visualizarlo
      </LoadingMessage>
    );
  }

  console.log('📄 [PDFViewer] Renderizando con file:', file instanceof File ? 'File object' : typeof file, file);
  console.log('📄 [PDFViewer] Modo continuo -', numPages ? `${numPages} páginas` : 'Cargando...');

  return (
    <ViewerContainer
      ref={containerRef}
      className={className}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      <Document
        key={`doc-${fileId}-${scale.toFixed(2)}`}
        file={file}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={<LoadingMessage>⏳ Cargando PDF...</LoadingMessage>}
        error={<ErrorMessage>❌ Error al cargar el PDF. Verifica que el archivo sea válido.</ErrorMessage>}
      >
        {numPages && Array.from({ length: numPages }, (_, index) => (
          <PageContainer key={`page-${index + 1}`} data-page-number={index + 1}>
            <Page
              pageNumber={index + 1}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<LoadingMessage>Cargando página {index + 1}...</LoadingMessage>}
            />
          </PageContainer>
        ))}
      </Document>
    </ViewerContainer>
  );
}

export default PDFViewer;
