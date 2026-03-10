import express from 'express';
import { evaluateAnswer, evaluateComprehensive, bulkEvaluate } from '../controllers/assessment.controller.js';
import { assessmentLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { sendValidationError } from '../utils/validationError.js';

const router = express.Router();

// CORRECCIÓN: Middleware de validación específico para assessment
export const validateAssessmentInput = (req, res, next) => {
  const { texto, respuesta, dimension } = req.body || {};
  
  if (!texto || typeof texto !== 'string' || texto.trim().length < 50) {
    return sendValidationError(res, {
      error: 'Texto es requerido y debe tener al menos 50 caracteres',
      mensaje: 'Incluye un texto base suficiente para poder evaluar la respuesta.',
      codigo: 'INVALID_ASSESSMENT_TEXT',
      field: 'texto'
    });
  }
  
  if (!respuesta || typeof respuesta !== 'string' || respuesta.trim().length < 20) {
    return sendValidationError(res, {
      error: 'Respuesta es requerida y debe tener al menos 20 caracteres',
      mensaje: 'Incluye una respuesta suficiente para poder evaluarla.',
      codigo: 'INVALID_ASSESSMENT_RESPONSE',
      field: 'respuesta'
    });
  }
  
  if (!dimension || typeof dimension !== 'string') {
    return sendValidationError(res, {
      error: 'Dimension es requerida',
      mensaje: 'Debes indicar la dimension que deseas evaluar.',
      codigo: 'MISSING_ASSESSMENT_DIMENSION',
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
export const validateComprehensiveInput = (req, res, next) => {
  const { texto, respuesta } = req.body || {};
  
  if (!texto || typeof texto !== 'string' || texto.trim().length < 200) {
    return sendValidationError(res, {
      error: 'Para evaluacion comprehensiva, texto debe tener al menos 200 caracteres',
      mensaje: 'Incluye un texto mas extenso para la evaluacion comprehensiva.',
      codigo: 'INVALID_COMPREHENSIVE_TEXT',
      field: 'texto'
    });
  }
  
  if (!respuesta || typeof respuesta !== 'string' || respuesta.trim().length < 100) {
    return sendValidationError(res, {
      error: 'Para evaluacion comprehensiva, respuesta debe tener al menos 100 caracteres',
      mensaje: 'Incluye una respuesta mas desarrollada para la evaluacion comprehensiva.',
      codigo: 'INVALID_COMPREHENSIVE_RESPONSE',
      field: 'respuesta'
    });
  }
  
  // Sanitizar inputs
  req.body.texto = texto.slice(0, 15000); // Límite mayor para comprehensivo
  req.body.respuesta = respuesta.slice(0, 8000);
  
  next();
};

// Rutas
router.use(requireFirebaseAuth);

router.post('/evaluate', assessmentLimiter, validateAssessmentInput, evaluateAnswer);
router.post('/evaluate-comprehensive', assessmentLimiter, validateComprehensiveInput, evaluateComprehensive);
router.post('/bulk-evaluate', assessmentLimiter, bulkEvaluate);

export default router;
