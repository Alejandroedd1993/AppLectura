import { Router } from 'express';
import { generarNotas } from '../controllers/notes.controller.js';

const router = Router();

// Generar notas de estudio a partir de un texto
router.post('/generate', generarNotas);

export default router;
