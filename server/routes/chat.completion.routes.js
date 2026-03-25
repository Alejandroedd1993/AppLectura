import { Router } from 'express';
import { createChatCompletion, getChatCacheStats } from '../controllers/chat.completion.controller.js';
import { chatLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { chatCompletionRequestSchema } from '../validators/requestSchemas.js';

const router = Router();
const validateChatCompletionInput = validateRequest(chatCompletionRequestSchema, {
  buildErrorPayload: ({ details }) => ({
    error: 'Solicitud de chat invalida',
    mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
    codigo: 'INVALID_CHAT_REQUEST',
    ...(details[0]?.path ? { field: details[0].path } : {}),
    details
  })
});

// Protección anti-loop/abuso
router.post('/completion', requireFirebaseAuth, chatLimiter, validateChatCompletionInput, createChatCompletion);

// Cache stats protegido: solo accesible en desarrollo
if (process.env.NODE_ENV !== 'production') {
  router.get('/cache-stats', getChatCacheStats);
}

export default router;
