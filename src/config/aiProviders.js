/**
 * Configuración centralizada de proveedores de IA
 * Incluye DeepSeek como opción gratuita por defecto
 */

export const AI_PROVIDERS = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'API gratuita con límite diario',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    free: true,
    dailyLimit: 50,
    costPer1M: 0.14,
    apiKeyRequired: false,
    icon: '🔥',
    status: 'active',
    features: {
      chat: true,
      analysis: true,
      evaluation: true,
      webSearch: true
    }
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o Mini - Alta calidad',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    free: false,
    apiKeyRequired: true,
    costPer1M: 2.00,
    icon: '🤖',
    status: 'active',
    features: {
      chat: true,
      analysis: true,
      evaluation: true,
      webSearch: true
    }
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 1.5 Flash - Rápido y eficiente',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-flash',
    free: false,
    apiKeyRequired: true,
    costPer1M: 1.50,
    icon: '💎',
    status: 'active',
    features: {
      chat: true,
      analysis: true,
      evaluation: true,
      webSearch: false
    }
  }
};

export const DEFAULT_PROVIDER = 'deepseek';

export const PROVIDER_SETTINGS = {
  fallback: {
    enabled: true,
    order: ['deepseek', 'openai', 'gemini']
  },
  usage: {
    trackingEnabled: true,
    dailyLimits: {
      deepseek: 50,
      openai: 1000000, // Prácticamente ilimitado
      gemini: 1000000
    }
  },
  performance: {
    timeout: 30000, // 30 segundos
    retries: 3,
    retryDelay: 1000
  }
};

/**
 * Obtiene la configuración de un proveedor específico
 * @param {string} providerId - ID del proveedor
 * @returns {Object|null} Configuración del proveedor o null si no existe
 */
export const getProvider = (providerId) => {
  return AI_PROVIDERS[providerId] || null;
};

/**
 * Obtiene la lista de proveedores disponibles
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Lista de proveedores
 */
export const getAvailableProviders = (filters = {}) => {
  const providers = Object.values(AI_PROVIDERS);
  
  if (filters.free !== undefined) {
    return providers.filter(p => p.free === filters.free);
  }
  
  if (filters.feature) {
    return providers.filter(p => p.features[filters.feature]);
  }
  
  return providers;
};

/**
 * Obtiene el proveedor por defecto
 * @returns {Object} Configuración del proveedor por defecto
 */
export const getDefaultProvider = () => {
  return AI_PROVIDERS[DEFAULT_PROVIDER];
};
