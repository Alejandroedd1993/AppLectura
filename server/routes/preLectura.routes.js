/**
 * Rutas para análisis de Pre-lectura con RAG
 */

import { Router } from 'express';
import { analyzePreLecture } from '../controllers/preLectura.controller.js';
import { analysisLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// POST /api/analysis/prelecture
// Body: { text: string, metadata?: object }
// Realiza análisis académico completo con RAG
router.post('/prelecture', analysisLimiter, analyzePreLecture);

export default router;
