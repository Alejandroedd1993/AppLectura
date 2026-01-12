
import { Router } from 'express';
import { analizarTexto } from '../controllers/analisis.controller.js';
import { analyzePreLecture } from '../controllers/preLectura.controller.js';
import { generateGlossary } from '../controllers/glossary.controller.js';
import { analysisLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Endpoint unificado para análisis de texto por API: { texto, api: 'deepseek' | 'openai' | 'gemini' }
router.post('/text', analysisLimiter, analizarTexto);
// Alias de compatibilidad con implementaciones previas
router.post('/analisis-estilistico', analysisLimiter, analizarTexto);

// NUEVO: Análisis de Pre-lectura con enriquecimiento web opcional (actualmente deshabilitado por flag)
router.post('/prelecture', analysisLimiter, analyzePreLecture);

// NUEVO: Generación de glosario dinámico
router.post('/glossary', analysisLimiter, generateGlossary);

export default router;
