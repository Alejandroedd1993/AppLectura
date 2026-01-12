import { Router } from 'express';
import { createChatCompletion } from '../controllers/chat.completion.controller.js';
import { chatLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Protección anti-loop/abuso
router.post('/completion', chatLimiter, createChatCompletion);

export default router;
