/**
 * useReadingProgress – Hook unificado de progreso de lectura.
 *
 * Antes el progreso se calculaba en dos sitios diferentes:
 *   • IntersectionObserver  (modo no-virtualizado,  < VIRTUALIZATION_THRESHOLD)
 *   • Virtuoso.rangeChanged (modo virtualizado,       ≥ VIRTUALIZATION_THRESHOLD)
 *
 * Este hook encapsula ambas estrategias tras una única interfaz y
 * elimina la duplicidad de fuentes de verdad.
 *
 * @param {Object}  opts
 * @param {boolean} opts.isVirtualized  – si el visor usa Virtuoso
 * @param {number}  opts.totalItems     – número total de párrafos/páginas
 * @param {React.MutableRefObject[]} opts.itemRefs – refs a los elementos DOM (solo modo no-virtualizado)
 * @returns {{ progress: number, onRangeChanged: (range: {startIndex: number, endIndex: number}) => void }}
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useReadingProgress({ isVirtualized, totalItems, itemRefs }) {
  const [progress, setProgress] = useState(0);
  const observerRef = useRef(null);

  // ── Estrategia A: Virtuoso rangeChanged ──
  const onRangeChanged = useCallback(
    (range) => {
      if (!isVirtualized || totalItems <= 0) return;
      const pct = ((range.endIndex + 1) / totalItems) * 100;
      setProgress(pct);
    },
    [isVirtualized, totalItems],
  );

  // ── Estrategia B: IntersectionObserver (no-virtualizado) ──
  useEffect(() => {
    if (isVirtualized) return;          // solo modo no-virtualizado
    if (!totalItems) { setProgress(0); return; }

    const refs = itemRefs?.current;
    if (!refs || refs.length === 0) return;

    const seen = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const idx = Number(e.target.getAttribute('data-parrafo'));
          if (Number.isNaN(idx)) return;
          if (e.isIntersecting) seen.add(idx);
          else seen.delete(idx);
        });
        if (seen.size === 0) return;
        const highest = Math.max(...Array.from(seen));
        setProgress(((highest + 1) / totalItems) * 100);
      },
      { root: null, rootMargin: '0px', threshold: 0.2 },
    );

    observerRef.current = observer;
    refs.forEach((el) => el && observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [isVirtualized, totalItems, itemRefs]);

  // Reset al cambiar totalItems drásticamente (nuevo documento)
  useEffect(() => { setProgress(0); }, [totalItems]);

  return { progress, onRangeChanged };
}
