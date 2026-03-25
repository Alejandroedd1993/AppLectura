import express from 'express';
import { evaluateAnswer, evaluateComprehensive, bulkEvaluate } from '../controllers/assessment.controller.js';
import { assessmentLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  assessmentBulkRequestSchema,
  assessmentComprehensiveRequestSchema,
  assessmentEvaluateRequestSchema
} from '../validators/requestSchemas.js';

const router = express.Router();

function buildAssessmentValidationPayload(details) {
  const firstDetail = details[0] || {};
  const field = firstDetail.path || 'texto';

  if (field === 'respuesta') {
    return {
      error: 'Respuesta es requerida y debe tener una longitud valida',
      mensaje: firstDetail.message || 'Incluye una respuesta suficiente para poder evaluarla.',
      codigo: 'INVALID_ASSESSMENT_RESPONSE',
      field,
      details
    };
  }

  if (field === 'dimension') {
    return {
      error: 'Dimension es requerida',
      mensaje: firstDetail.message || 'Debes indicar la dimension que deseas evaluar.',
      codigo: 'MISSING_ASSESSMENT_DIMENSION',
      field,
      details
    };
  }

  return {
    error: 'Texto es requerido y debe tener una longitud valida',
    mensaje: firstDetail.message || 'Incluye un texto base suficiente para poder evaluar la respuesta.',
    codigo: 'INVALID_ASSESSMENT_TEXT',
    field: 'texto',
    details
  };
}

// CORRECCIÓN: Middleware de validación específico para assessment
export const validateAssessmentInput = validateRequest(assessmentEvaluateRequestSchema, {
  buildErrorPayload: ({ details }) => buildAssessmentValidationPayload(details)
});


// Middleware de validación para evaluación comprehensiva
export const validateComprehensiveInput = validateRequest(assessmentComprehensiveRequestSchema, {
  buildErrorPayload: ({ details }) => {
    const firstDetail = details[0] || {};
    const field = firstDetail.path || 'texto';

    if (field === 'respuesta') {
      return {
        error: 'Para evaluacion comprehensiva, respuesta debe tener longitud valida',
        mensaje: firstDetail.message || 'Incluye una respuesta mas desarrollada para la evaluacion comprehensiva.',
        codigo: 'INVALID_COMPREHENSIVE_RESPONSE',
        field,
        details
      };
    }

    return {
      error: 'Para evaluacion comprehensiva, texto debe tener longitud valida',
      mensaje: firstDetail.message || 'Incluye un texto mas extenso para la evaluacion comprehensiva.',
      codigo: 'INVALID_COMPREHENSIVE_TEXT',
      field: 'texto',
      details
    };
  }
});

export const validateBulkAssessmentInput = validateRequest(assessmentBulkRequestSchema, {
  buildErrorPayload: ({ details }) => ({
    error: 'Solicitud de evaluacion en lote invalida',
    mensaje: details[0]?.message || 'Revisa los items enviados antes de reintentar.',
    codigo: 'INVALID_BULK_ASSESSMENT_REQUEST',
    ...(details[0]?.path ? { field: details[0].path } : {}),
    details
  })
});

// Rutas
router.use(requireFirebaseAuth);

router.post('/evaluate', assessmentLimiter, validateAssessmentInput, evaluateAnswer);
router.post('/evaluate-comprehensive', assessmentLimiter, validateComprehensiveInput, evaluateComprehensive);
router.post('/bulk-evaluate', assessmentLimiter, validateBulkAssessmentInput, bulkEvaluate);

export default router;
