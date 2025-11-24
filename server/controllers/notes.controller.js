import { generarNotasConOpenAI, generarNotasConDeepSeek, generarNotasConGemini } from '../services/notes.service.js';
import { notesSchema } from '../validators/schemas.js';

/**
 * POST /api/notes/generate
 * body: { 
 *   texto: string, 
 *   api?: 'openai'|'deepseek'|'gemini',
 *   contexto?: Object, // Contexto enriquecido del análisis académico
 *   nivelAcademico?: 'secundaria'|'pregrado'|'posgrado'|'doctorado' // FASE 3
 * }
 */
export async function generarNotas(req, res) {
  const { texto, api = 'openai', contexto = null, nivelAcademico = 'pregrado' } = req.body || {};

  if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
    return res.status(400).json({ error: 'Texto vacío', mensaje: 'Proporciona texto para generar notas' });
  }

  // Log del contexto enriquecido y nivel académico
  if (contexto || nivelAcademico !== 'pregrado') {
    console.log('[notes.controller] Recibido contexto enriquecido:', {
      genero: contexto?.genero,
      tiene_tesis: !!contexto?.tesis_central,
      tiene_conceptos: !!contexto?.conceptos_clave,
      tiene_resumen: !!contexto?.resumen_previo,
      nivelAcademico // 🆕 FASE 3
    });
  }

  // Validación por proveedor
  if (api === 'openai' && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API no configurada', mensaje: 'OPENAI_API_KEY no está configurada en el servidor' });
  }
  if (api === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'API no configurada', mensaje: 'DEEPSEEK_API_KEY no está configurada en el servidor' });
  }
  if (api === 'gemini' && !process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API no configurada', mensaje: 'GEMINI_API_KEY no está configurada en el servidor' });
  }

  try {
    let result;
    switch (api) {
      case 'openai':
        result = await generarNotasConOpenAI(texto, contexto, nivelAcademico); // 🆕 Pasar nivel
        break;
      case 'deepseek':
        result = await generarNotasConDeepSeek(texto, contexto, nivelAcademico); // 🆕 Pasar nivel
        break;
      case 'gemini':
        result = await generarNotasConGemini(texto, contexto, nivelAcademico); // 🆕 Pasar nivel
        break;
      default:
        return res.status(400).json({ error: 'API no soportada', mensaje: `Proveedor no soportado: ${api}` });
    }
    const parsed = notesSchema.safeParse(result);
    if (!parsed.success) {
      return res.status(502).json({ error: 'Formato inválido', detalle: parsed.error.flatten() });
    }
    return res.json(parsed.data);
  } catch (error) {
    console.error('Error en generarNotas:', error);
    const msg = error?.message || 'Error interno';
    if (msg.includes('Timeout')) {
      return res.status(504).json({ error: 'Timeout', mensaje: msg });
    }
    if (msg.includes('Rate limit')) {
      return res.status(429).json({ error: 'Rate limit', mensaje: msg });
    }
    return res.status(500).json({ error: 'Error generando notas', mensaje: msg });
  }
}

export default { generarNotas };

