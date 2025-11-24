import { Router } from 'express';
import { createChatCompletion } from '../controllers/chat.completion.controller.js';

const router = Router();

router.post('/completion', createChatCompletion);

export default router;
