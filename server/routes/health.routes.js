
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  const apiStatus = {
    openai: process.env.OPENAI_API_KEY ? "configurada" : "no configurada",
    gemini: process.env.GEMINI_API_KEY ? "configurada" : "no configurada"
  };
  
  res.json({ 
    status: 'ok', 
    apis: apiStatus,
    timestamp: new Date().toISOString() 
  });
});

export default router;
