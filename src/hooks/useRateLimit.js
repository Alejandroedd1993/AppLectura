import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook para rate limiting de operaciones
 * Previene abuse de APIs con cooldown y límite por hora
 * 
 * @param {string} key - Identificador único para la operación (ej: 'evaluate_resumen')
 * @param {Object} options - Configuración
 * @param {number} options.cooldownMs - Tiempo mínimo entre operaciones (default: 5000ms)
 * @param {number} options.maxPerHour - Máximo de operaciones por hora (default: 10)
 * @returns {Object} { canProceed, remaining, nextAvailableIn, attemptOperation, resetCooldown }
 */
function useRateLimit(key, options = {}) {
  const {
    cooldownMs = 5000, // 5 segundos por defecto
    maxPerHour = 10     // 10 operaciones/hora por defecto
  } = options;

  const [canProceed, setCanProceed] = useState(true);
  const [remaining, setRemaining] = useState(maxPerHour);
  const [nextAvailableIn, setNextAvailableIn] = useState(0);
  
  const lastOperationTime = useRef(0);
  const operationsHistory = useRef([]);
  const cooldownTimer = useRef(null);

  // Limpiar operaciones antiguas (más de 1 hora)
  const cleanOldOperations = useCallback(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    operationsHistory.current = operationsHistory.current.filter(
      timestamp => timestamp > oneHourAgo
    );
  }, []);

  // Calcular operaciones restantes
  const updateRemaining = useCallback(() => {
    cleanOldOperations();
    const currentRemaining = maxPerHour - operationsHistory.current.length;
    setRemaining(Math.max(0, currentRemaining));
    return currentRemaining;
  }, [cleanOldOperations, maxPerHour]);

  // Verificar cooldown
  const checkCooldown = useCallback(() => {
    const now = Date.now();
    const timeSinceLastOp = now - lastOperationTime.current;
    
    if (timeSinceLastOp < cooldownMs) {
      const waitTime = cooldownMs - timeSinceLastOp;
      setNextAvailableIn(Math.ceil(waitTime / 1000)); // en segundos
      setCanProceed(false);
      return false;
    }
    
    setNextAvailableIn(0);
    return true;
  }, [cooldownMs]);

  // Verificar límite por hora
  const checkHourlyLimit = useCallback(() => {
    const currentRemaining = updateRemaining();
    return currentRemaining > 0;
  }, [updateRemaining]);

  // Intentar ejecutar operación
  const attemptOperation = useCallback(() => {
    // Verificar cooldown
    if (!checkCooldown()) {
      return {
        allowed: false,
        reason: 'cooldown',
        message: `Espera ${nextAvailableIn} segundos antes de intentar nuevamente.`,
        waitSeconds: nextAvailableIn
      };
    }

    // Verificar límite por hora
    if (!checkHourlyLimit()) {
      return {
        allowed: false,
        reason: 'hourly_limit',
        message: `Has alcanzado el límite de ${maxPerHour} operaciones por hora. Intenta más tarde.`,
        waitSeconds: null
      };
    }

    // ✅ Permitir operación
    const now = Date.now();
    lastOperationTime.current = now;
    operationsHistory.current.push(now);
    
    // Actualizar estado
    updateRemaining();
    setCanProceed(false);
    
    // Programar reactivación después del cooldown
    if (cooldownTimer.current) {
      clearTimeout(cooldownTimer.current);
    }
    
    cooldownTimer.current = setTimeout(() => {
      setCanProceed(true);
      setNextAvailableIn(0);
    }, cooldownMs);

    // Persistir en localStorage
    try {
      localStorage.setItem(`ratelimit_${key}`, JSON.stringify({
        lastOperation: now,
        operations: operationsHistory.current
      }));
    } catch (e) {
      console.warn('No se pudo persistir rate limit:', e);
    }

    return {
      allowed: true,
      reason: null,
      message: 'Operación permitida',
      remaining: remaining - 1
    };
  }, [checkCooldown, checkHourlyLimit, cooldownMs, key, maxPerHour, nextAvailableIn, remaining, updateRemaining]);

  // Reset manual del cooldown (para casos especiales)
  const resetCooldown = useCallback(() => {
    if (cooldownTimer.current) {
      clearTimeout(cooldownTimer.current);
    }
    setCanProceed(true);
    setNextAvailableIn(0);
  }, []);

  // Reset completo (limpia todo el historial)
  const resetAll = useCallback(() => {
    operationsHistory.current = [];
    lastOperationTime.current = 0;
    setRemaining(maxPerHour);
    resetCooldown();
    
    try {
      localStorage.removeItem(`ratelimit_${key}`);
    } catch (e) {
      console.warn('No se pudo limpiar rate limit:', e);
    }
  }, [key, maxPerHour, resetCooldown]);

  // Restaurar estado desde localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ratelimit_${key}`);
      if (saved) {
        const { lastOperation, operations } = JSON.parse(saved);
        lastOperationTime.current = lastOperation;
        operationsHistory.current = operations || [];
        
        // Limpiar operaciones antiguas
        cleanOldOperations();
        updateRemaining();
        checkCooldown();
      }
    } catch (e) {
      console.warn('Error restaurando rate limit:', e);
    }
  }, [key, cleanOldOperations, updateRemaining, checkCooldown]);

  // Actualizar countdown cada segundo si hay cooldown activo
  useEffect(() => {
    if (!canProceed && nextAvailableIn > 0) {
      const interval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastOp = now - lastOperationTime.current;
        const waitTime = cooldownMs - timeSinceLastOp;
        
        if (waitTime <= 0) {
          setCanProceed(true);
          setNextAvailableIn(0);
          clearInterval(interval);
        } else {
          setNextAvailableIn(Math.ceil(waitTime / 1000));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [canProceed, nextAvailableIn, cooldownMs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    };
  }, []);

  return {
    canProceed: canProceed && remaining > 0,
    remaining,
    nextAvailableIn,
    attemptOperation,
    resetCooldown,
    resetAll,
    // Info adicional útil
    info: {
      cooldownMs,
      maxPerHour,
      operationsThisHour: operationsHistory.current.length
    }
  };
}

export default useRateLimit;
