import express from 'express';
import { evaluateAnswer, evaluateComprehensive, bulkEvaluate } from '../controllers/assessment.controller.js';
import { assessmentLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// CORRECCIÓN: Middleware de validación específico para assessment
const validateAssessmentInput = (req, res, next) => {
  const { texto, respuesta, dimension } = req.body;
  
  if (!texto || typeof texto !== 'string' || texto.trim().length < 50) {
    return res.status(400).json({ 
      error: 'Texto es requerido y debe tener al menos 50 caracteres',
      field: 'texto'
    });
  }
  
  if (!respuesta || typeof respuesta !== 'string' || respuesta.trim().length < 20) {
    return res.status(400).json({ 
      error: 'Respuesta es requerida y debe tener al menos 20 caracteres',
      field: 'respuesta'
    });
  }
  
  if (!dimension || typeof dimension !== 'string') {
    return res.status(400).json({ 
      error: 'Dimensión es requerida',
      field: 'dimension'
    });
  }
  
  // Sanitizar inputs
  req.body.texto = texto.slice(0, 10000); // Limitar tamaño
  req.body.respuesta = respuesta.slice(0, 5000);
  req.body.dimension = dimension.toLowerCase().trim();
  
  next();
};


// Middleware de validación para evaluación comprehensiva
const validateComprehensiveInput = (req, res, next) => {
  const { texto, respuesta } = req.body;
  
  if (!texto || typeof texto !== 'string' || texto.trim().length < 200) {
    return res.status(400).json({ 
      error: 'Para evaluación comprehensiva, texto debe tener al menos 200 caracteres',
      field: 'texto'
    });
  }
  
  if (!respuesta || typeof respuesta !== 'string' || respuesta.trim().length < 100) {
    return res.status(400).json({ 
      error: 'Para evaluación comprehensiva, respuesta debe tener al menos 100 caracteres',
      field: 'respuesta'
    });
  }
  
  // Sanitizar inputs
  req.body.texto = texto.slice(0, 15000); // Límite mayor para comprehensivo
  req.body.respuesta = respuesta.slice(0, 8000);
  
  next();
};

// Rutas
router.post('/evaluate', assessmentLimiter, validateAssessmentInput, evaluateAnswer);
router.post('/evaluate-comprehensive', assessmentLimiter, validateComprehensiveInput, evaluateComprehensive);
router.post('/bulk-evaluate', assessmentLimiter, bulkEvaluate);

export default router;
