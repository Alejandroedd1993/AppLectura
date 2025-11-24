/**
 * @file Punto de entrada para todos los componentes de notas de estudio
 * @module index
 * @version 2.0.0
 */

// Componente principal
export { default as NotasEstudio } from './NotasEstudioRefactorizado';

// Componentes individuales
export { default as NotasContenido } from './NotasContenido';
export { default as CronogramaRepaso } from './CronogramaRepaso';
export { default as ConfiguracionPanel } from './ConfiguracionPanel';

// Componentes de UI
export * from './NotasUI';

// Hook personalizado (usar entrypoint correcto que apunta al hook estable)
export { default as useNotasEstudio } from '../../hooks/notes';

// Servicio de OpenAI
export { default as OpenAINotesService } from '../../services/notes/OpenAINotesService';
