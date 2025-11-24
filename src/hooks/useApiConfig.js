import { useState, useEffect, useCallback, useMemo } from 'react';
import { AI_PROVIDERS, DEFAULT_PROVIDER, getProvider, getAvailableProviders } from '../config/aiProviders';

/**
 * Hook centralizado para la configuración de APIs de IA
 * Maneja proveedores, fallbacks, límites de uso y persistencia
 */
export const useApiConfig = () => {
  // Estado principal
  const [currentProvider, setCurrentProvider] = useState(() => {
    // Limpiar localStorage si hay configuración de OpenAI previa
    const savedProvider = localStorage.getItem('ai_provider');
    if (savedProvider === 'openai') {
      // Limpiar configuración anterior y establecer DeepSeek por defecto
      localStorage.removeItem('openai_api_key');
      localStorage.setItem('ai_provider', DEFAULT_PROVIDER);
      return DEFAULT_PROVIDER;
    }
    return savedProvider || DEFAULT_PROVIDER;
  });
  
  const [apiKeys, setApiKeys] = useState(() => ({
    openai: localStorage.getItem('openai_api_key') || '',
    gemini: localStorage.getItem('gemini_api_key') || '',
    deepseek: localStorage.getItem('deepseek_api_key') || '' // Por si en el futuro requiere key
  }));

  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem('api_usage');
    return saved ? JSON.parse(saved) : {
      deepseek: { count: 0, date: new Date().toDateString() },
      openai: { count: 0, date: new Date().toDateString() },
      gemini: { count: 0, date: new Date().toDateString() }
    };
  });

  const [isAvailable, setIsAvailable] = useState({});

  // Resetear contadores diarios
  useEffect(() => {
    const today = new Date().toDateString();
    const needsReset = Object.entries(usage).some(([, data]) => data.date !== today);
    
    if (needsReset) {
      const resetUsage = Object.keys(usage).reduce((acc, provider) => ({
        ...acc,
        [provider]: { count: 0, date: today }
      }), {});
      
      setUsage(resetUsage);
      localStorage.setItem('api_usage', JSON.stringify(resetUsage));
    }
  }, []);

  // Persistir configuración
  useEffect(() => {
    localStorage.setItem('ai_provider', currentProvider);
  }, [currentProvider]);

  useEffect(() => {
    Object.entries(apiKeys).forEach(([provider, key]) => {
      if (key) {
        localStorage.setItem(`${provider}_api_key`, key);
      } else {
        localStorage.removeItem(`${provider}_api_key`);
      }
    });
  }, [apiKeys]);

  // Verificar disponibilidad de proveedores
  const checkProviderAvailability = useCallback((providerId) => {
    const provider = getProvider(providerId);
    if (!provider) return false;

    // DeepSeek siempre disponible (tiene API key predeterminada)
    if (providerId === 'deepseek') return true;

    // Otros proveedores requieren API key del usuario
    if (provider.apiKeyRequired && !apiKeys[providerId]) return false;

    // Verificar límite diario
    const todayUsage = usage[providerId]?.count || 0;
    const dailyLimit = provider.dailyLimit || Infinity;
    
    return todayUsage < dailyLimit;
  }, [apiKeys, usage]);

  // Actualizar disponibilidad
  useEffect(() => {
    const availability = Object.keys(AI_PROVIDERS).reduce((acc, providerId) => ({
      ...acc,
      [providerId]: checkProviderAvailability(providerId)
    }), {});
    
    setIsAvailable(availability);
    
    // Auto-configuración: cambiar a proveedor disponible si el actual no lo está
    if (!availability[currentProvider]) {
      console.log(`⚠️ Proveedor actual '${currentProvider}' no disponible, buscando alternativa...`);
      
      // Orden de preferencia: DeepSeek primero (gratuito)
      const fallbackOrder = ['deepseek', 'openai', 'gemini'];
      
      for (const providerId of fallbackOrder) {
        if (availability[providerId]) {
          console.log(`🔄 Auto-configurando proveedor: ${providerId}`);
          setCurrentProvider(providerId);
          break;
        }
      }
    }
  }, [checkProviderAvailability, currentProvider]);

  // Obtener proveedor actual con configuración completa
  const activeProvider = useMemo(() => {
    const provider = getProvider(currentProvider);
    if (!provider) return getProvider(DEFAULT_PROVIDER);
    
    return {
      ...provider,
      apiKey: apiKeys[currentProvider],
      isAvailable: isAvailable[currentProvider],
      usage: usage[currentProvider]
    };
  }, [currentProvider, apiKeys, isAvailable, usage]);

  // Cambiar proveedor con validación
  const switchProvider = useCallback((providerId) => {
    const provider = getProvider(providerId);
    if (!provider) {
      console.warn(`Proveedor ${providerId} no existe`);
      return false;
    }

    if (!checkProviderAvailability(providerId)) {
      console.warn(`Proveedor ${providerId} no disponible`);
      return false;
    }

    console.log(`🔄 Cambiando proveedor a: ${providerId}`);
    setCurrentProvider(providerId);
    return true;
  }, [checkProviderAvailability]);

  // Configurar API key
  const setApiKey = useCallback((providerId, key) => {
    setApiKeys(prev => ({
      ...prev,
      [providerId]: key
    }));
  }, []);

  // Incrementar uso
  const incrementUsage = useCallback((providerId = currentProvider) => {
    const today = new Date().toDateString();
    setUsage(prev => {
      const updated = {
        ...prev,
        [providerId]: {
          count: (prev[providerId]?.count || 0) + 1,
          date: today
        }
      };
      localStorage.setItem('api_usage', JSON.stringify(updated));
      return updated;
    });
  }, [currentProvider]);

  // Fallback automático
  const getAvailableProvider = useCallback(() => {
    // Primero intentar el proveedor actual
    if (checkProviderAvailability(currentProvider)) {
      return currentProvider;
    }

    // Buscar alternativa disponible
    const fallbackOrder = ['deepseek', 'openai', 'gemini'];
    for (const providerId of fallbackOrder) {
      if (checkProviderAvailability(providerId)) {
        console.log(`Fallback a proveedor: ${providerId}`);
        setCurrentProvider(providerId);
        return providerId;
      }
    }

    console.error('No hay proveedores disponibles');
    return null;
  }, [currentProvider, checkProviderAvailability]);

  // Stats para dashboard
  const stats = useMemo(() => {
    const providers = getAvailableProviders();
    const available = providers.filter(p => isAvailable[p.id]).length;
    const totalUsage = Object.values(usage).reduce((sum, data) => sum + (data.count || 0), 0);
    
    // Calcular si está configurado correctamente
    let isConfigured = false;
    
    if (currentProvider === 'deepseek') {
      // DeepSeek siempre está configurado (tiene API key predeterminada)
      isConfigured = true;
    } else if (activeProvider?.apiKeyRequired) {
      // Otros proveedores requieren API key del usuario
      isConfigured = !!activeProvider.apiKey;
    } else {
      // Proveedores sin API key requerida están siempre configurados
      isConfigured = true;
    }
    
    console.log('🔧 useApiConfig - Stats calculados:', {
      currentProvider,
      activeProvider: activeProvider?.name,
      apiKeyRequired: activeProvider?.apiKeyRequired,
      hasApiKey: !!activeProvider?.apiKey,
      isConfigured,
      available,
      providersCount: providers.length,
      isDeepSeek: currentProvider === 'deepseek'
    });
    
    return {
      providersCount: providers.length,
      availableCount: available,
      dailyUsage: totalUsage,
      currentProvider: activeProvider?.name || currentProvider,
      isConfigured
    };
  }, [isAvailable, usage, activeProvider, currentProvider]);

  return {
    // Estado actual
    currentProvider,
    activeProvider,
    apiKeys,
    usage,
    isAvailable,
    stats,
    
    // Acciones
    switchProvider,
    setApiKey,
    incrementUsage,
    getAvailableProvider,
    
    // Utilidades
    providers: getAvailableProviders(),
    checkAvailability: checkProviderAvailability
  };
};
