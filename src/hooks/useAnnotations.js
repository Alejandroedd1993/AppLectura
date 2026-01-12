import { useEffect, useMemo, useState, useCallback } from 'react';
import { AnnotationsService } from '../services/annotations.service';
import { useRewards } from '../context/PedagogyContext';

/**
 * useAnnotations
 * Hook React que expone anotaciones (resaltados + notas) asociadas al texto completo actual.
 * Shadow mode opcional: permite seguir usando el estado local antiguo mientras se valida el servicio.
 *
 * @param {string} texto Texto completo actual
 * @param {object} options
 *  - shadow (bool): si true, no modifica callbacks pasados, solo provee API adicional
 *  - onChange (fn): callback cuando cambia conjunto de anotaciones
 */
export function useAnnotations(texto, options = {}) {
  const { shadow = true, onChange } = options;
  const storageKey = useMemo(() => AnnotationsService.computeKeyFromText(texto || ''), [texto]);
  const [annotations, setAnnotations] = useState([]);
  const rewards = useRewards();

  useEffect(() => {
    if (!storageKey) return;
    const unsub = AnnotationsService.subscribe(storageKey, (next) => {
      setAnnotations(next);
      if (onChange) onChange(next);
    });
    return unsub;
  }, [storageKey, onChange]);

  const highlights = useMemo(() => annotations.filter(a => a.kind === 'highlight'), [annotations]);
  const notes = useMemo(() => annotations.filter(a => a.kind === 'note'), [annotations]);

  const isHighlighted = useCallback((paragraphIndex) => highlights.some(h => h.paragraphIndex === paragraphIndex), [highlights]);

  const toggleHighlight = useCallback((paragraphIndex, source = 'manual') => {
    if (!storageKey) return { active: false };
    const result = AnnotationsService.toggleHighlight(storageKey, paragraphIndex, source);

    // 🎮 Registrar recompensa si se activó resaltado
    if (result.active && rewards) {
      rewards.recordEvent('ANNOTATION_CREATED', {
        paragraphIndex,
        resourceId: storageKey
      });
    }

    return result;
  }, [storageKey, rewards]);

  const addNote = useCallback((note) => {
    if (!storageKey) return null;
    const result = AnnotationsService.addNote(storageKey, note);

    // 🎮 Registrar recompensa
    if (result && rewards) {
      rewards.recordEvent('NOTE_CREATED', {
        noteId: result.id,
        resourceId: storageKey
      });
    }

    return result;
  }, [storageKey, rewards]);

  const updateAnnotation = useCallback((id, patch) => {
    if (!storageKey) return null;
    return AnnotationsService.updateAnnotation(storageKey, id, patch);
  }, [storageKey]);

  const removeAnnotation = useCallback((id) => {
    if (!storageKey) return false;
    return AnnotationsService.removeAnnotation(storageKey, id);
  }, [storageKey]);

  return {
    storageKey,
    annotations,
    highlights,
    notes,
    isHighlighted,
    toggleHighlight,
    addNote,
    updateAnnotation,
    removeAnnotation,
    shadow
  };
}

export default useAnnotations;
