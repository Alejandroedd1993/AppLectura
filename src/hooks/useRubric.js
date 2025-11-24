import { useEffect, useState, useMemo } from 'react';

/**
 * Hook para cargar una rúbrica pedagógica (JSON estático por ahora)
 * Futuro: fetch remoto / versionado / i18n
 */
export default function useRubric(rubricId = 'critical_literacy_v1') {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Carga dinámica para permitir code-splitting
        const mod = await import('../pedagogy/rubrics/criticalLiteracy.rubric.json');
        if (!mounted) return;
        if (mod?.default?.meta?.id && mod.default.meta.id !== rubricId) {
          console.warn('[useRubric] ID solicitado no coincide con el archivo cargado');
        }
        setData(mod.default);
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [rubricId]);

  const dimensionsById = useMemo(() => {
    if (!data) return {};
    const map = {};
    data.dimensions.forEach(d => { map[d.id] = d; });
    return map;
  }, [data]);

  return { rubric: data, loading, error, dimensionsById };
}
