import { Router } from 'express';
import { createChatCompletion, getChatCacheStats } from '../controllers/chat.completion.controller.js';
import { chatLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Protección anti-loop/abuso
router.post('/completion', chatLimiter, createChatCompletion);

router.get('/cache-stats', getChatCacheStats);

export default router;
