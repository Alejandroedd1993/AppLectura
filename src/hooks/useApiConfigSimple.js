import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Hook simplificado para testing de la configuración de API
 * Garantiza que DeepSeek esté siempre disponible como fallback
 */
export const useApiConfigSimple = () => {
  // Estado básico con DeepSeek como default
  const [currentProvider, setCurrentProvider] = useState('deepseek');

  // Configuración básica de DeepSeek (siempre disponible)
  const activeProvider = useMemo(() => ({
    id: 'deepseek',
    name: 'DeepSeek',
    model: 'deepseek-chat',
    apiKey: null, // No requiere API key
    apiKeyRequired: false,
    isAvailable: true,
    baseURL: 'https://api.deepseek.com/v1'
  }), []);

  // Stats simplificados
  const stats = useMemo(() => ({
    currentProvider: 'DeepSeek',
    isConfigured: true, // DeepSeek siempre está configurado
    availableCount: 1,
    providersCount: 1,
    dailyUsage: 0
  }), []);

  // Funciones básicas
  const switchProvider = useCallback((providerId) => {
    setCurrentProvider(providerId);
    return true;
  }, []);

  const setApiKey = useCallback((providerId, key) => {
    console.log(`Setting API key for ${providerId}`);
  }, []);

  const incrementUsage = useCallback(() => {
    console.log('Usage incremented');
  }, []);

  const getAvailableProvider = useCallback(() => {
    return 'deepseek';
  }, []);

  return {
    currentProvider,
    activeProvider,
    stats,
    switchProvider,
    setApiKey,
    incrementUsage,
    getAvailableProvider,
    providers: [activeProvider],
    checkAvailability: () => true
  };
};
