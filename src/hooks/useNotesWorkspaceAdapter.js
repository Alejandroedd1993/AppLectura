import { useCallback, useMemo } from 'react';
import useAnnotations from './useAnnotations';

/**
 * useNotesWorkspaceAdapter
 * Adaptador ligero para exponer una API estable de notas en el nuevo ReadingWorkspace
 * desacoplando detalles del servicio de anotaciones subyacente.
 */
export default function useNotesWorkspaceAdapter(texto) {
  const { notes, addNote, removeAnnotation, updateAnnotation, storageKey } = useAnnotations(texto, { shadow: false });

  const sorted = useMemo(() => {
    return [...(notes||[])].sort((a,b) => (b.meta?.createdAt||0) - (a.meta?.createdAt||0));
  }, [notes]);

  const createNote = useCallback((text, meta={}) => {
    return addNote({ text, meta });
  }, [addNote]);

  const removeNote = useCallback((id) => removeAnnotation(id), [removeAnnotation]);

  const updateNote = useCallback((id, patch) => updateAnnotation(id, patch), [updateAnnotation]);

  const exportNotes = useCallback(() => {
    if (!sorted.length) return null;
    const contenido = sorted.map(n => {
      const fecha = new Date(n.meta?.createdAt || Date.now()).toLocaleString();
      return `Fecha: ${fecha}\nTexto: ${n.text || ''}\nKind: ${n.kind || 'note'}\n---\n`;
    }).join('\n');
    return contenido;
  }, [sorted]);

  return { notes: sorted, createNote, removeNote, updateNote, exportNotes, storageKey };
}