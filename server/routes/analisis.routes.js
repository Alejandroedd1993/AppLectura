
import { Router } from 'express';
import { analizarTexto } from '../controllers/analisis.controller.js';
import { analyzePreLecture } from '../controllers/preLectura.controller.js';
import { generateGlossary } from '../controllers/glossary.controller.js';

const router = Router();

// Endpoint unificado para análisis de texto por API: { texto, api: 'deepseek' | 'openai' | 'gemini' }
router.post('/text', analizarTexto);
// Alias de compatibilidad con implementaciones previas
router.post('/analisis-estilistico', analizarTexto);

// NUEVO: Análisis de Pre-lectura con RAG
router.post('/prelecture', analyzePreLecture);

// NUEVO: Generación de glosario dinámico
router.post('/glossary', generateGlossary);

export default router;
