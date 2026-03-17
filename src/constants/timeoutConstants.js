import logger from '../utils/logger';

/**
 * 🆕 A5 FIX: Constantes de timeout unificadas para toda la aplicación
 * Centraliza los tiempos de espera para mantener consistencia
 * 
 * @module timeoutConstants
 */

// Timeout para análisis de texto completo (incluye RAG + DeepSeek)
export const ANALYSIS_TIMEOUT_MS = 180000; // 3 minutos

// Timeout para llamadas de chat simples
export const CHAT_TIMEOUT_MS = 60000; // 1 minuto

// Timeout para operaciones de red genéricas
export const NETWORK_TIMEOUT_MS = 30000; // 30 segundos

// Timeout para operaciones IA rápidas o de una sola etapa
export const AI_EVALUATION_TIMEOUT_MS = 30000; // 30 segundos

// Timeout para operaciones IA profundas o segundas etapas de evaluación
export const AI_DEEP_EVALUATION_TIMEOUT_MS = 45000; // 45 segundos

// Timeout para definición puntual de términos en glosario
export const GLOSSARY_TERM_TIMEOUT_MS = 20000; // 20 segundos

// Timeout para enriquecimiento web del tutor
export const WEB_SEARCH_TIMEOUT_MS = 5000; // 5 segundos

// Timeout para análisis prelecture en background
export const PRELECTURE_ANALYSIS_TIMEOUT_MS = 300000; // 5 minutos

// Timeout específico para evaluación de ensayos (más largo que chat normal)
export const ESSAY_EVALUATION_TIMEOUT_MS = Math.max(CHAT_TIMEOUT_MS, 90000); // mínimo 90s

// Delay inicial para retry automático
export const RETRY_DELAY_MS = 3000; // 3 segundos

// Número de reintentos automáticos para errores de red
export const MAX_RETRIES = 1;

// Timeout para operaciones de Firebase
export const FIREBASE_TIMEOUT_MS = 15000; // 15 segundos

// Logs para debugging
logger.log('⏱️ [Timeouts] Configuración cargada:', {
    ANALYSIS_TIMEOUT_MS,
    CHAT_TIMEOUT_MS,
    NETWORK_TIMEOUT_MS,
    AI_EVALUATION_TIMEOUT_MS,
    AI_DEEP_EVALUATION_TIMEOUT_MS,
    GLOSSARY_TERM_TIMEOUT_MS,
    WEB_SEARCH_TIMEOUT_MS,
    PRELECTURE_ANALYSIS_TIMEOUT_MS,
    ESSAY_EVALUATION_TIMEOUT_MS,
    RETRY_DELAY_MS,
    MAX_RETRIES
});

export default {
    ANALYSIS_TIMEOUT_MS,
    CHAT_TIMEOUT_MS,
    NETWORK_TIMEOUT_MS,
    AI_EVALUATION_TIMEOUT_MS,
    AI_DEEP_EVALUATION_TIMEOUT_MS,
    GLOSSARY_TERM_TIMEOUT_MS,
    WEB_SEARCH_TIMEOUT_MS,
    PRELECTURE_ANALYSIS_TIMEOUT_MS,
    ESSAY_EVALUATION_TIMEOUT_MS,
    RETRY_DELAY_MS,
    MAX_RETRIES,
    FIREBASE_TIMEOUT_MS
};
