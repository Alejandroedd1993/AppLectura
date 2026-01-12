import useFormativeEvaluator from '../../src/hooks/useFormativeEvaluator';
import { renderHook, act } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';

describe('useFormativeEvaluator', () => {
  test('evalúa y parsea JSON válido', async () => {
    fetchMock.mockResponse(JSON.stringify({
      choices: [{
        message: {
          content: '{"dimension":"argumentacion_contraargumento","criterio":"uso_evidencia","nivel":"competente","justificacion":"Buen uso de evidencia.","fortalezas":["Citas pertinentes"],"sugerencia":"Explica mejor conexión.","pregunta_extension":"¿Qué evidencia alternativa agregarías?"}'
        }
      }]
    }));
    const { result } = renderHook(() => useFormativeEvaluator({ providerId: 'deepseek', apiKey: 'x' }));
    await act(async () => {
      const out = await result.current.evaluate({
        dimension: { id: 'argumentacion_contraargumento', label: 'Arg' },
        criterion: { id: 'uso_evidencia', label: 'Uso evidencia', levels: { novato: '', aprendiz: '', competente: '', experto: '' } },
        answer: 'Mi respuesta',
        question: '¿Cómo usas evidencia?',
        textSlice: 'Texto...'
      });
      console.log('Resultado evaluate:', JSON.stringify(out, null, 2));
      expect(out.nivel).toBe('competente');
      expect(out.criterio).toBe('uso_evidencia');
    });
  });
});
