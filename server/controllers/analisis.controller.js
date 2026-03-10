
import { analizarTexto as analizarTextoService } from '../services/analisis.service.js';
import { analizarTextoBasico } from '../services/basic.service.js';
import { analysisSchema } from '../validators/schemas.js';
import { sendValidationError } from '../utils/validationError.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 */

/**
 * Controlador para manejar la solicitud de análisis de texto.
 * @param {Request} req - El objeto de solicitud de Express.
 * @param {Response} res - El objeto de respuesta de Express.
 */
export async function analizarTexto(req, res) {
  // Ahora el backend soporta estrategias: 'deepseek', 'openai', 'smart', 'alternate', 'debate'
  const { texto, api = 'smart' } = req.body || {};

  if (!texto || texto.trim().length === 0) {
    return sendValidationError(res, {
      error: 'Texto vacio',
      mensaje: 'Por favor proporciona un texto para analizar.',
      codigo: 'EMPTY_ANALYSIS_TEXT'
    });
  }

  const validApis = ['openai', 'gemini', 'deepseek', 'smart', 'alternate', 'debate'];
  if (!validApis.includes(api)) {
    return sendValidationError(res, {
      error: 'API no valida',
      mensaje: `API debe ser una de: ${validApis.join(', ')}`,
      codigo: 'INVALID_ANALYSIS_PROVIDER'
    });
  }

  try {
    console.log(`Procesando solicitud de análisis con API: ${api}`);
    const textoTruncado = texto.slice(0, 4000) + (texto.length > 4000 ? '...' : '');

    // Usamos el nuevo servicio unificado para todos los proveedores soportados
    const resultado = await analizarTextoService(textoTruncado, api);

    // Validar la respuesta de la IA con Zod antes de enviarla
    const validationResult = analysisSchema.safeParse(resultado);
    if (!validationResult.success) {
      console.error("⚠️ Error de validación de Zod:", JSON.stringify(validationResult.error.flatten(), null, 2));
      console.error("📄 Respuesta recibida:", JSON.stringify(resultado, null, 2));
      
      // Crear análisis básico de fallback con lo que tengamos
      const fallbackAnalysis = {
        resumen: resultado?.resumen || 'No se pudo generar el resumen',
        ideasPrincipales: Array.isArray(resultado?.ideasPrincipales) ? resultado.ideasPrincipales : [],
        analisisEstilistico: resultado?.analisisEstilistico || {
          tono: 'neutral',
          sentimiento: 'neutral',
          estilo: 'informativo',
          publicoObjetivo: 'general'
        },
        preguntasReflexion: Array.isArray(resultado?.preguntasReflexion) ? resultado.preguntasReflexion : [],
        vocabulario: Array.isArray(resultado?.vocabulario) ? resultado.vocabulario : [],
        complejidad: resultado?.complejidad || 'intermedio',
        temas: Array.isArray(resultado?.temas) ? resultado.temas : []
      };
      
      console.log("✅ Usando análisis básico de fallback");
      return res.json(fallbackAnalysis);
    }
    console.log("✅ La respuesta de la IA ha sido validada exitosamente.");
    return res.json(validationResult.data);

  } catch (error) {
    console.error(`Error en análisis con ${api}:`, error.message);

    // Degradación controlada: si se solicita Gemini pero no hay API key, devolver análisis básico
    // (evita 500 y mantiene la UX funcional)
    if (api === 'gemini' && String(error?.message || '').toLowerCase().includes('api key de gemini no configurada')) {
      try {
        const textoTruncado = texto.slice(0, 4000) + (texto.length > 4000 ? '...' : '');
        const fallback = analizarTextoBasico(textoTruncado);
        return res.json(fallback);
      } catch (fallbackErr) {
        // si incluso el fallback falla, continuar con la ruta estándar de error
      }
    }

    if (error.message.includes('Timeout')) {
      return res.status(504).json({
        error: 'Timeout',
        mensaje: 'La solicitud tardó demasiado tiempo en completarse',
        codigo: 'AI_TIMEOUT'
      });
    }

    if (error.message.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Límite de tasa excedido',
        mensaje: 'Has excedido el límite de solicitudes a la API',
        codigo: 'RATE_LIMITED'
      });
    }

    return res.status(500).json({
      error: `Error al comunicarse con ${api}`,
      mensaje: 'Ocurrió un error al procesar tu solicitud',
      codigo: 'ANALYSIS_PROVIDER_ERROR'
    });
  }
}
