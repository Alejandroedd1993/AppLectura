import { renderHook, act } from '@testing-library/react';
import useNotesWorkspaceAdapter from '../../../src/hooks/useNotesWorkspaceAdapter';

// Mock interno de useAnnotations para aislar lógica de orden y export
jest.mock('../../../src/hooks/useAnnotations', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => {
      const [notes, setNotes] = React.useState([]);
      return {
        notes,
        addNote: (note) => {
          note.id = 'n' + (notes.length + 1);
            setNotes(prev => [...prev, note]);
            return note;
        },
        removeAnnotation: (id) => { setNotes(prev => prev.filter(n => n.id !== id)); return true; },
        updateAnnotation: () => {},
        storageKey: 'mock-key'
      };
    }
  };
});

describe('useNotesWorkspaceAdapter', () => {
  test('crea y exporta notas en orden descendente', () => {
    const { result } = renderHook(() => useNotesWorkspaceAdapter('Texto ejemplo'));
    act(() => { result.current.createNote('Primera', { createdAt: 1000, kind:'note' }); });
    act(() => { result.current.createNote('Segunda', { createdAt: 2000, kind:'note' }); });
    expect(result.current.notes[0].text).toBe('Segunda');
    const exported = result.current.exportNotes();
    expect(exported).toMatch(/Segunda/);
    expect(exported.indexOf('Segunda')).toBeLessThan(exported.indexOf('Primera'));
  });
});