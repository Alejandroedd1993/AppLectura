
import { Router } from 'express';
import { analizarTexto } from '../controllers/analisis.controller.js';
import { analyzePreLecture } from '../controllers/preLectura.controller.js';
import { generateGlossary } from '../controllers/glossary.controller.js';
import { analysisLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
	analysisTextRequestSchema,
	glossaryRequestSchema,
	preLectureRequestSchema
} from '../validators/requestSchemas.js';

const router = Router();
const validateAnalysisInput = validateRequest(analysisTextRequestSchema, {
	buildErrorPayload: ({ details }) => ({
		error: 'Solicitud de analisis invalida',
		mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
		codigo: 'INVALID_ANALYSIS_REQUEST',
		...(details[0]?.path ? { field: details[0].path } : {}),
		details
	})
});
export const validatePreLectureInput = validateRequest(preLectureRequestSchema, {
	buildErrorPayload: ({ details }) => ({
		error: 'Solicitud de prelectura invalida',
		mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
		codigo: 'INVALID_PRELECTURA_REQUEST',
		...(details[0]?.path ? { field: details[0].path } : {}),
		details
	})
});
export const validateGlossaryInput = validateRequest(glossaryRequestSchema, {
	buildErrorPayload: ({ details }) => ({
		error: 'Solicitud de glosario invalida',
		mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
		codigo: 'INVALID_GLOSSARY_REQUEST',
		...(details[0]?.path ? { field: details[0].path } : {}),
		details
	})
});

// Endpoint unificado para análisis de texto por API: { texto, api: 'deepseek' | 'openai' | 'gemini' }
router.post('/text', requireFirebaseAuth, analysisLimiter, validateAnalysisInput, analizarTexto);
// Alias de compatibilidad con implementaciones previas
router.post('/analisis-estilistico', requireFirebaseAuth, analysisLimiter, validateAnalysisInput, analizarTexto);

// NUEVO: Análisis de Pre-lectura con enriquecimiento web opcional (actualmente deshabilitado por flag)
router.post('/prelecture', requireFirebaseAuth, analysisLimiter, validatePreLectureInput, analyzePreLecture);

// NUEVO: Generación de glosario dinámico
router.post('/glossary', requireFirebaseAuth, analysisLimiter, validateGlossaryInput, generateGlossary);

export default router;
