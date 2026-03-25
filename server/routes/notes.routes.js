import { Router } from 'express';
import { generarNotas } from '../controllers/notes.controller.js';
import { notesLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { notesGenerateRequestSchema } from '../validators/requestSchemas.js';

const router = Router();
const validateNotesInput = validateRequest(notesGenerateRequestSchema, {
	buildErrorPayload: ({ details }) => ({
		error: 'Solicitud de notas invalida',
		mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
		codigo: 'INVALID_NOTES_REQUEST',
		...(details[0]?.path ? { field: details[0].path } : {}),
		details
	})
});

// Generar notas de estudio a partir de un texto
router.post('/generate', requireFirebaseAuth, notesLimiter, validateNotesInput, generarNotas);

export default router;
