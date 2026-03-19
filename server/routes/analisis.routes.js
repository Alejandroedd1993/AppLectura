
import { Router } from 'express';
import { analizarTexto } from '../controllers/analisis.controller.js';
import { analyzePreLecture } from '../controllers/preLectura.controller.js';
import { generateGlossary } from '../controllers/glossary.controller.js';
import { analysisLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';

const router = Router();

// Endpoint unificado para análisis de texto por API: { texto, api: 'deepseek' | 'openai' | 'gemini' }
router.post('/text', requireFirebaseAuth, analysisLimiter, analizarTexto);
// Alias de compatibilidad con implementaciones previas
router.post('/analisis-estilistico', requireFirebaseAuth, analysisLimiter, analizarTexto);

// NUEVO: Análisis de Pre-lectura con enriquecimiento web opcional (actualmente deshabilitado por flag)
router.post('/prelecture', requireFirebaseAuth, analysisLimiter, analyzePreLecture);

// NUEVO: Generación de glosario dinámico
router.post('/glossary', requireFirebaseAuth, analysisLimiter, generateGlossary);

export default router;
