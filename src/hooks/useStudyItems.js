import { useEffect, useMemo, useState, useCallback } from 'react';
import { StudyItemsService } from '../services/studyItems.service';
import { AnnotationsService } from '../services/annotations.service';

/**
 * useStudyItems
 * Gestiona items de estudio (spaced repetition) derivados del feedback.
 * Clave de persistencia: hash del texto (reutiliza cálculo de AnnotationsService para consistencia).
 */
export function useStudyItems(texto) {
  const storageKey = useMemo(() => {
    if (!texto || !texto.trim()) return null;
    // Reusar hash de annotations para correlacionar datasets aunque tengan esquemas separados
    const key = AnnotationsService.computeKeyFromText(texto);
    if (!key) return null;
    const hashPart = key.split(':')[1]; // annotations:<hash>:v1
    return `studyitems:${hashPart}:v1`;
  }, [texto]);

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!storageKey) return;
    const unsub = StudyItemsService.subscribe(storageKey, setItems);
    return unsub;
  }, [storageKey]);

  const dueItems = useMemo(() => StudyItemsService.getDue(storageKey), [items, storageKey]);

  const addItems = useCallback((newItems) => {
    if (!storageKey) return [];
    return StudyItemsService.addItems(storageKey, newItems);
  }, [storageKey]);

  const reviewItem = useCallback((itemId, quality) => {
    if (!storageKey) return null;
    return StudyItemsService.updateItem(storageKey, itemId, quality);
  }, [storageKey]);

  return {
    storageKey,
    items,
    dueItems,
    addItems,
    reviewItem
  };
}

export default useStudyItems;
