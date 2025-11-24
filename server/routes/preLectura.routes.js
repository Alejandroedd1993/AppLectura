/**
 * Rutas para análisis de Pre-lectura con RAG
 */

import { Router } from 'express';
import { analyzePreLecture } from '../controllers/preLectura.controller.js';

const router = Router();

// POST /api/analysis/prelecture
// Body: { text: string, metadata?: object }
// Realiza análisis académico completo con RAG
router.post('/prelecture', analyzePreLecture);

export default router;
