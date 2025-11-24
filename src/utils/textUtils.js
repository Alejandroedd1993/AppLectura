/**
 * Utilidades avanzadas para análisis y procesamiento de textos
 * Proporciona herramientas para preparación de textos, análisis lingüístico,
 * procesamiento de respuestas de IA y evaluación de legibilidad.
 * 
 * @module textUtils
 * @version 2.0.0
 */

// Importaciones
import { generateTextHash, saveAnalysisToCache, getAnalysisFromCache } from './cache';

// ======================================================
// EXPORTACIONES Y COMPATIBILIDAD
// ======================================================

// Re-exportar funciones de caché para mantener compatibilidad
export { generateTextHash, saveAnalysisToCache, getAnalysisFromCache };

// Re-exportar funciones de los nuevos módulos para mantener una API unificada si es necesario
export * from './textTransformations';
export * from './apiResponseProcessing';
export * from './textAnalysisMetrics';