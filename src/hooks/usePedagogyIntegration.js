/**
 * Hook de integración pedagógica (ZDP Detector + Rewards).
 *
 * Encapsula la importación condicional de PedagogyContext para que
 * TutorCore (y cualquier otro componente) lo use como un hook estándar
 * sin monkey-patchear el objeto React.
 *
 * En entornos de test donde PedagogyContext no existe, retorna valores nulos.
 */
// Intentar importar los hooks reales; si no existen retornamos fallbacks.
let _useZDPDetector = null;
let _useRewards = null;
let _available = false;

try {
  const PedagogyContext = require('../context/PedagogyContext');
  if (PedagogyContext.useZDPDetector && PedagogyContext.useRewards) {
    _useZDPDetector = PedagogyContext.useZDPDetector;
    _useRewards = PedagogyContext.useRewards;
    _available = true;
  }
} catch {
  // PedagogyContext no disponible (entorno de test u otro)
}

const FALLBACK = Object.freeze({ zdp: null, rew: null });

/**
 * @returns {{ zdp: object|null, rew: object|null }}
 */
export default function usePedagogyIntegration() {
  if (!_available) return FALLBACK;

  try {
    const zdp = _useZDPDetector();
    const rew = _useRewards();
    return { zdp, rew };
  } catch {
    return FALLBACK;
  }
}
