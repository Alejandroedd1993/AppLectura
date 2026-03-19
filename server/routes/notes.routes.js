import { Router } from 'express';
import { generarNotas } from '../controllers/notes.controller.js';
import { notesLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';

const router = Router();

// Generar notas de estudio a partir de un texto
router.post('/generate', requireFirebaseAuth, notesLimiter, generarNotas);

export default router;
