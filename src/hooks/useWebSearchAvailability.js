import { useState, useEffect } from 'react';
import { fetchWithTimeout } from '../utils/netUtils';
import { buildBackendEndpoint, getFirebaseAuthHeader } from '../utils/backendRequest';

// 🚀 PERF: Log silenciado en producción
const __DEV__ = process.env.NODE_ENV !== 'production';
const devLog = __DEV__ ? console.log.bind(console) : () => { };
const devWarn = __DEV__ ? console.warn.bind(console) : () => { };

/**
 * Hook para comprobar dinámicamente si los servicios de enriquecimiento web
 * (Serper, Tavily, etc.) están configurados y disponibles en el backend.
 */
export default function useWebSearchAvailability() {
    const [webSearchAvailable, setWebSearchAvailable] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const verifyWebSearchAvailability = async () => {
            try {
                const authHeader = await getFirebaseAuthHeader();
                const endpoint = buildBackendEndpoint('/api/web-search/test');

                const res = await fetchWithTimeout(endpoint, {
                    method: 'GET',
                    headers: authHeader
                }, 10000);

                if (res.status === 401 || res.status === 403) {
                    devWarn('[useWebSearchAvailable] Auth / rate limit requerida o bloqueada');
                    if (!cancelled) setWebSearchAvailable(false);
                    return;
                }

                if (res.status === 429) {
                    devWarn('[useWebSearchAvailable] Rate limited');
                    if (!cancelled) setWebSearchAvailable(false);
                    return;
                }

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();
                const config = data?.configuracion || {};
                const providerAvailable = Boolean(
                    config.serper_disponible ||
                    config.bing_disponible ||
                    config.tavily_disponible
                );
                // Disponible solo cuando hay provider real y la feature esta habilitada.
                const available = Boolean(config.enable_web_search && providerAvailable);

                if (!cancelled) {
                    setWebSearchAvailable(available);
                }
                devLog(
                    '🌐 Búsqueda web disponible:',
                    available,
                    '- mode:',
                    config.modo_funcionamiento,
                    '- enabled:',
                    Boolean(config.enable_web_search),
                    '- provider:',
                    providerAvailable
                );
            } catch (err) {
                devWarn('⚠️ No se pudo verificar búsqueda web:', err);
                if (!cancelled) {
                    setWebSearchAvailable(false);
                }
            }
        };

        verifyWebSearchAvailability();
        return () => { cancelled = true; };
    }, []);

    return webSearchAvailable;
}
