import { useCallback, useState } from 'react';
import { chatCompletion, extractContent } from '../services/unifiedAiService';
import { buildCriterionFeedbackPrompt } from '../utils/analysisAdapters';

/**
 * Provee una función para evaluar formativamente una respuesta según una dimensión/criterio
 * Retorna { evaluate, loading, error, lastResult }
 */
export default function useFormativeEvaluator({ providerId, apiKey }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const evaluate = useCallback(async ({ dimension, criterion, answer, question, textSlice }) => {
    setLoading(true);
    setError(null);
    try {
      const prompt = buildCriterionFeedbackPrompt({ dimension, criterion, answer, question, textSlice });
      const data = await chatCompletion({
        provider: providerId || 'deepseek',
        model: (providerId === 'deepseek') ? 'deepseek-chat' : undefined,
        apiKey,
        messages: [ { role: 'user', content: prompt } ],
        temperature: 0.1,
        max_tokens: 400,
        timeoutMs: 18000
      });
      const content = extractContent(data);
      let parsed;
      try {
        const cleaned = (content || '')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '');
        parsed = JSON.parse(cleaned);
        const allowed = ['novato','aprendiz','competente','experto'];
        if (!allowed.includes(parsed.nivel)) parsed.nivel = 'aprendiz';
        if (!Array.isArray(parsed.fortalezas)) parsed.fortalezas = [];
        if (typeof parsed.sugerencia !== 'string') parsed.sugerencia = '';
        if (typeof parsed.justificacion !== 'string') parsed.justificacion = '';
        if (typeof parsed.pregunta_extension !== 'string') parsed.pregunta_extension = '';
      } catch (_) {
        parsed = {
          dimension: dimension?.id,
          criterio: criterion?.id,
          nivel: 'aprendiz',
          justificacion: 'No se pudo parsear JSON, usando fallback.',
          fortalezas: [],
          sugerencia: (content || '').slice(0, 160),
          pregunta_extension: ''
        };
      }
      setLastResult(parsed);
      return parsed;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [apiKey, providerId]);

  return { evaluate, loading, error, lastResult };
}
