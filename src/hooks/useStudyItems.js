import { useEffect, useMemo, useState, useCallback } from 'react';
import { StudyItemsService } from '../services/studyItems.service';
import { AnnotationsService } from '../services/annotations.service';
import { scopeKey } from '../utils/storageKeys';

/**
 * useStudyItems
 * Gestiona items de estudio (spaced repetition) derivados del feedback.
 * Clave de persistencia:
 * - Preferido (FASE 5): por textoId con scope de curso (aislado por lectura + curso)
 * - Fallback legacy: hash del texto (reutiliza cálculo de AnnotationsService para consistencia).
 */
export function useStudyItems(texto, textoId = null, courseId = null) {
  const legacyStorageKey = useMemo(() => {
    if (!texto || !texto.trim()) return null;
    const key = AnnotationsService.computeKeyFromText(texto);
    if (!key) return null;
    const hashPart = key.split(':')[1]; // annotations:<hash>:v1
    return `studyitems:${hashPart}:v1`;
  }, [texto]);

  const storageKey = useMemo(() => {
    if (textoId) return `studyitems:${scopeKey(courseId, textoId)}:v1`;
    return legacyStorageKey;
  }, [textoId, courseId, legacyStorageKey]);

  const [items, setItems] = useState([]);

  // 🧩 FASE 5: migración ligera (solo localStorage) de la key legacy basada en hash a la key por textoId
  useEffect(() => {
    if (!textoId || !legacyStorageKey) return;
    const scopedTextoKey = scopeKey(courseId, textoId) || textoId;
    const newKey = `studyitems:${scopedTextoKey}:v1`;
    if (newKey === legacyStorageKey) return;
    try {
      if (typeof localStorage === 'undefined') return;
      const existingNew = localStorage.getItem(newKey);
      const existingLegacy = localStorage.getItem(legacyStorageKey);
      if (!existingNew && existingLegacy) {
        localStorage.setItem(newKey, existingLegacy);
      }
    } catch {
      // no-op
    }
  }, [textoId, courseId, legacyStorageKey]);

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
