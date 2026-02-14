import { Router } from 'express';
import { createChatCompletion, getChatCacheStats } from '../controllers/chat.completion.controller.js';
import { chatLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';

const router = Router();

// Protección anti-loop/abuso
router.post('/completion', requireFirebaseAuth, chatLimiter, createChatCompletion);

// Cache stats protegido: solo accesible en desarrollo
if (process.env.NODE_ENV !== 'production') {
  router.get('/cache-stats', getChatCacheStats);
}

export default router;
