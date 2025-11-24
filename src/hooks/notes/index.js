/**
 * @file Índice de hooks para notas de estudio
 * @module NotesHooks
 * @version 1.0.0
 * @description Exportaciones centralizadas de todos los hooks
 */

// Hook principal
export { default as useNotasEstudio } from './useNotasEstudioHook';

// Re-exportar como default para facilitar importación
import useNotasEstudio from './useNotasEstudioHook';
export default useNotasEstudio;
