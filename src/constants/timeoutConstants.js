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

// Delay inicial para retry automático
export const RETRY_DELAY_MS = 3000; // 3 segundos

// Número de reintentos automáticos para errores de red
export const MAX_RETRIES = 1;

// Timeout para operaciones de Firebase
export const FIREBASE_TIMEOUT_MS = 15000; // 15 segundos

// Logs para debugging
console.log('⏱️ [Timeouts] Configuración cargada:', {
    ANALYSIS_TIMEOUT_MS,
    CHAT_TIMEOUT_MS,
    NETWORK_TIMEOUT_MS,
    RETRY_DELAY_MS,
    MAX_RETRIES
});

export default {
    ANALYSIS_TIMEOUT_MS,
    CHAT_TIMEOUT_MS,
    NETWORK_TIMEOUT_MS,
    RETRY_DELAY_MS,
    MAX_RETRIES,
    FIREBASE_TIMEOUT_MS
};
