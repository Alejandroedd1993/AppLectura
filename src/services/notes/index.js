/**
 * @file Índice de servicios para notas de estudio
 * @module NotesServices
 * @version 1.0.0
 * @description Exportaciones centralizadas de todos los servicios
 */

// Servicios principales
export { default as OpenAINotesService } from './OpenAINotesService';
export { default as CronogramaService } from './CronogramaService';
export { default as StorageService } from './StorageService';

// Re-exportar como objeto para uso directo
import OpenAINotesService from './OpenAINotesService';
import CronogramaService from './CronogramaService';
import StorageService from './StorageService';

/**
 * Objeto con todos los servicios de notas
 * @type {Object}
 */
export const NotesServices = {
  OpenAI: OpenAINotesService,
  Cronograma: CronogramaService,
  Storage: StorageService
};

/**
 * Función para inicializar todos los servicios
 * @returns {Object} Servicios inicializados
 */
export const initializeNotesServices = () => {
  console.log('[NotesServices] Inicializando servicios de notas...');
  
  // Limpiar cache antiguo al inicializar
  StorageService.cleanOldCache();
  
  return NotesServices;
};

export default NotesServices;
