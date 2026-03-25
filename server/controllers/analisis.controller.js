
import { analizarTexto as analizarTextoService } from '../services/analisis.service.js';
import { analizarTextoBasico } from '../services/basic.service.js';
import { sendError } from '../utils/responseHelpers.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { analysisSchema } from '../validators/schemas.js';
import { truncateText } from '../utils/textLimits.js';

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
  // Validación de texto y api ya cubierta por Zod en la ruta
  const { texto, api = 'smart' } = req.body || {};

  try {
    console.log(`Procesando solicitud de análisis con API: ${api}`);
    const textoTruncado = truncateText(texto, 4000);

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
      return sendSuccess(res, fallbackAnalysis);
    }
    console.log("✅ La respuesta de la IA ha sido validada exitosamente.");
    return sendSuccess(res, validationResult.data);

  } catch (error) {
    console.error(`Error en análisis con ${api}:`, error.message);

    // Degradación controlada: si se solicita Gemini pero no hay API key, devolver análisis básico
    // (evita 500 y mantiene la UX funcional)
    if (api === 'gemini' && String(error?.message || '').toLowerCase().includes('api key de gemini no configurada')) {
      try {
        const textoTruncado = truncateText(texto, 4000);
        const fallback = analizarTextoBasico(textoTruncado);
        return sendSuccess(res, fallback);
      } catch (fallbackErr) {
        // si incluso el fallback falla, continuar con la ruta estándar de error
      }
    }

    if (error.message.includes('Timeout')) {
      return sendError(res, 504, {
        error: 'Timeout',
        mensaje: 'La solicitud tardó demasiado tiempo en completarse',
        codigo: 'AI_TIMEOUT'
      });
    }

    if (error.message.includes('Rate limit')) {
      return sendError(res, 429, {
        error: 'Límite de tasa excedido',
        mensaje: 'Has excedido el límite de solicitudes a la API',
        codigo: 'RATE_LIMITED'
      });
    }

    return sendError(res, 500, {
      error: `Error al comunicarse con ${api}`,
      mensaje: 'Ocurrió un error al procesar tu solicitud',
      codigo: 'ANALYSIS_PROVIDER_ERROR'
    });
  }
}
