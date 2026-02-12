import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AI_PROVIDERS, DEFAULT_PROVIDER, getProvider, getAvailableProviders } from '../config/aiProviders';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

// ── Storage key helpers (scoped by userId) ──────────────────────────
const API_KEY_NAMES = ['openai', 'gemini', 'deepseek'];

/** Returns the localStorage key for a given base key, optionally scoped to a user */
function scopedKey(base, uid) {
  return uid ? `${base}:${uid}` : base;
}

/**
 * Migrates a legacy (un-scoped) localStorage key to a scoped one.
 * Only migrates if the scoped key doesn't exist yet AND the legacy key does.
 */
function migrateLegacyKey(base, uid) {
  if (!uid) return;
  const scoped = scopedKey(base, uid);
  try {
    if (!localStorage.getItem(scoped) && localStorage.getItem(base)) {
      localStorage.setItem(scoped, localStorage.getItem(base));
      localStorage.removeItem(base);
      logger.log(`[useApiConfig] Migrada clave legacy ${base} → ${scoped}`);
    }
  } catch (e) {
    logger.warn('[useApiConfig] Error migrando clave legacy:', e);
  }
}

/**
 * Hook centralizado para la configuración de APIs de IA
 * Maneja proveedores, fallbacks, límites de uso y persistencia.
 * Las claves se scopean por userId para aislar configuraciones entre usuarios.
 */
export const useApiConfig = () => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || null;
  const prevUidRef = useRef(uid);

  // ── Migrate legacy keys on first mount / user change ──────────
  useEffect(() => {
    if (!uid) return;
    migrateLegacyKey('ai_provider', uid);
    API_KEY_NAMES.forEach(p => migrateLegacyKey(`${p}_api_key`, uid));
    migrateLegacyKey('api_usage', uid);
  }, [uid]);

  // Estado principal
  const [currentProvider, setCurrentProvider] = useState(() => {
    const savedProvider = localStorage.getItem(scopedKey('ai_provider', uid));
    if (savedProvider === 'openai') {
      localStorage.removeItem(scopedKey('openai_api_key', uid));
      localStorage.setItem(scopedKey('ai_provider', uid), DEFAULT_PROVIDER);
      return DEFAULT_PROVIDER;
    }
    return savedProvider || DEFAULT_PROVIDER;
  });
  
  const [apiKeys, setApiKeys] = useState(() => ({
    openai: localStorage.getItem(scopedKey('openai_api_key', uid)) || '',
    gemini: localStorage.getItem(scopedKey('gemini_api_key', uid)) || '',
    deepseek: localStorage.getItem(scopedKey('deepseek_api_key', uid)) || ''
  }));

  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem(scopedKey('api_usage', uid));
    return saved ? JSON.parse(saved) : {
      deepseek: { count: 0, date: new Date().toDateString() },
      openai: { count: 0, date: new Date().toDateString() },
      gemini: { count: 0, date: new Date().toDateString() }
    };
  });

  // ── Re-hydrate state when uid changes (user login/switch) ──────
  useEffect(() => {
    if (uid === prevUidRef.current) return;
    prevUidRef.current = uid;

    const savedProvider = localStorage.getItem(scopedKey('ai_provider', uid)) || DEFAULT_PROVIDER;
    setCurrentProvider(savedProvider);

    setApiKeys({
      openai: localStorage.getItem(scopedKey('openai_api_key', uid)) || '',
      gemini: localStorage.getItem(scopedKey('gemini_api_key', uid)) || '',
      deepseek: localStorage.getItem(scopedKey('deepseek_api_key', uid)) || ''
    });

    const savedUsage = localStorage.getItem(scopedKey('api_usage', uid));
    setUsage(savedUsage ? JSON.parse(savedUsage) : {
      deepseek: { count: 0, date: new Date().toDateString() },
      openai: { count: 0, date: new Date().toDateString() },
      gemini: { count: 0, date: new Date().toDateString() }
    });
  }, [uid]);

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
      localStorage.setItem(scopedKey('api_usage', uid), JSON.stringify(resetUsage));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistir proveedor actual (scoped)
  useEffect(() => {
    localStorage.setItem(scopedKey('ai_provider', uid), currentProvider);
  }, [currentProvider, uid]);

  // Persistir API keys (scoped)
  useEffect(() => {
    Object.entries(apiKeys).forEach(([provider, key]) => {
      const k = scopedKey(`${provider}_api_key`, uid);
      if (key) {
        localStorage.setItem(k, key);
      } else {
        localStorage.removeItem(k);
      }
    });
  }, [apiKeys, uid]);

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
      logger.log(`⚠️ Proveedor actual '${currentProvider}' no disponible, buscando alternativa...`);
      
      // Orden de preferencia: DeepSeek primero (gratuito)
      const fallbackOrder = ['deepseek', 'openai', 'gemini'];
      
      for (const providerId of fallbackOrder) {
        if (availability[providerId]) {
          logger.log(`🔄 Auto-configurando proveedor: ${providerId}`);
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
      logger.warn(`Proveedor ${providerId} no existe`);
      return false;
    }

    if (!checkProviderAvailability(providerId)) {
      logger.warn(`Proveedor ${providerId} no disponible`);
      return false;
    }

    logger.log(`🔄 Cambiando proveedor a: ${providerId}`);
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
      localStorage.setItem(scopedKey('api_usage', uid), JSON.stringify(updated));
      return updated;
    });
  }, [currentProvider, uid]);

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
        logger.log(`Fallback a proveedor: ${providerId}`);
        setCurrentProvider(providerId);
        return providerId;
      }
    }

    logger.error('No hay proveedores disponibles');
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
    
    logger.log('🔧 useApiConfig - Stats calculados:', {
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
