import { Router } from 'express';
import { generarNotas } from '../controllers/notes.controller.js';
import { notesLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Generar notas de estudio a partir de un texto
router.post('/generate', notesLimiter, generarNotas);

export default router;
