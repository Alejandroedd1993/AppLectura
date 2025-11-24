/**
 * Validador de esquema de sesiones
 * Evita guardar datos corruptos que puedan romper la persistencia
 */

/**
 * Valida que un valor sea un objeto (no null, no array)
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Valida estructura de texto
 */
function validateText(text) {
  if (!text) return { valid: true }; // Texto opcional
  
  if (!isObject(text)) {
    return { valid: false, error: 'text debe ser objeto' };
  }
  
  if (text.content && typeof text.content !== 'string') {
    return { valid: false, error: 'text.content debe ser string' };
  }
  
  if (text.content && text.content.length > 10000000) { // 10MB
    return { valid: false, error: 'text.content excede 10MB' };
  }
  
  return { valid: true };
}

/**
 * Valida estructura de análisis completo
 */
function validateCompleteAnalysis(analysis) {
  if (!analysis) return { valid: true }; // Opcional
  
  if (!isObject(analysis)) {
    return { valid: false, error: 'completeAnalysis debe ser objeto' };
  }
  
  // Validar que tenga al menos metadata
  if (!analysis.metadata || !isObject(analysis.metadata)) {
    return { valid: false, error: 'completeAnalysis.metadata es requerido' };
  }
  
  return { valid: true };
}

/**
 * Valida progreso de rúbricas
 */
function validateRubricProgress(progress) {
  if (!progress) return { valid: true }; // Opcional
  
  if (!isObject(progress)) {
    return { valid: false, error: 'rubricProgress debe ser objeto' };
  }
  
  // Validar estructura de cada rúbrica
  const rubricKeys = Object.keys(progress);
  for (const key of rubricKeys) {
    const rubric = progress[key];
    
    if (!isObject(rubric)) {
      return { valid: false, error: `rubricProgress.${key} debe ser objeto` };
    }
    
    if (rubric.scores && !Array.isArray(rubric.scores)) {
      return { valid: false, error: `rubricProgress.${key}.scores debe ser array` };
    }
    
    if (rubric.average && typeof rubric.average !== 'number') {
      return { valid: false, error: `rubricProgress.${key}.average debe ser número` };
    }
  }
  
  return { valid: true };
}

/**
 * Valida progreso de actividades
 */
function validateActivitiesProgress(progress) {
  if (!progress) return { valid: true }; // Opcional
  
  if (!isObject(progress)) {
    return { valid: false, error: 'activitiesProgress debe ser objeto' };
  }
  
  // Validar estructura de cada documento
  const docKeys = Object.keys(progress);
  for (const docId of docKeys) {
    const docProgress = progress[docId];
    
    if (!isObject(docProgress)) {
      return { valid: false, error: `activitiesProgress.${docId} debe ser objeto` };
    }
    
    // Validar preparación si existe
    if (docProgress.preparation) {
      const prep = docProgress.preparation;
      
      if (!isObject(prep)) {
        return { valid: false, error: `activitiesProgress.${docId}.preparation debe ser objeto` };
      }
      
      if (prep.completed !== undefined && typeof prep.completed !== 'boolean') {
        return { valid: false, error: `activitiesProgress.${docId}.preparation.completed debe ser boolean` };
      }
      
      if (prep.mcqPassed !== undefined && typeof prep.mcqPassed !== 'boolean') {
        return { valid: false, error: `activitiesProgress.${docId}.preparation.mcqPassed debe ser boolean` };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Valida estructura completa de sesión
 * @param {object} session - Datos de la sesión a validar
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateSession(session) {
  const errors = [];
  
  // Validaciones básicas
  if (!session) {
    return { valid: false, errors: ['Sesión es null o undefined'] };
  }
  
  if (!isObject(session)) {
    return { valid: false, errors: ['Sesión debe ser un objeto'] };
  }
  
  // ID requerido
  if (!session.id || typeof session.id !== 'string') {
    errors.push('session.id es requerido y debe ser string');
  }
  
  // Timestamps requeridos
  if (!session.createdAt) {
    errors.push('session.createdAt es requerido');
  }
  
  if (!session.lastModified) {
    errors.push('session.lastModified es requerido');
  }
  
  // Validar componentes opcionales
  const textValidation = validateText(session.text);
  if (!textValidation.valid) {
    errors.push(textValidation.error);
  }
  
  const analysisValidation = validateCompleteAnalysis(session.completeAnalysis);
  if (!analysisValidation.valid) {
    errors.push(analysisValidation.error);
  }
  
  const rubricValidation = validateRubricProgress(session.rubricProgress);
  if (!rubricValidation.valid) {
    errors.push(rubricValidation.error);
  }
  
  const activitiesValidation = validateActivitiesProgress(session.activitiesProgress);
  if (!activitiesValidation.valid) {
    errors.push(activitiesValidation.error);
  }
  
  // savedCitations debe ser objeto
  if (session.savedCitations && !isObject(session.savedCitations)) {
    errors.push('savedCitations debe ser objeto');
  }
  
  // artifactsDrafts debe ser objeto
  if (session.artifactsDrafts && !isObject(session.artifactsDrafts)) {
    errors.push('artifactsDrafts debe ser objeto');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitiza una sesión removiendo campos inválidos
 * @param {object} session - Sesión a sanitizar
 * @returns {object} - Sesión sanitizada
 */
export function sanitizeSession(session) {
  if (!session || !isObject(session)) {
    return null;
  }
  
  const sanitized = {
    id: session.id || `session_${Date.now()}`,
    title: typeof session.title === 'string' ? session.title : 'Sesión sin título',
    createdAt: session.createdAt || Date.now(),
    lastModified: session.lastModified || Date.now()
  };
  
  // Sanitizar campos opcionales
  if (session.text && isObject(session.text)) {
    sanitized.text = {
      content: typeof session.text.content === 'string' ? session.text.content : '',
      fileName: session.text.fileName || 'texto_manual',
      fileType: session.text.fileType || 'text/plain',
      metadata: isObject(session.text.metadata) ? session.text.metadata : {}
    };
  }
  
  if (session.completeAnalysis && isObject(session.completeAnalysis)) {
    sanitized.completeAnalysis = session.completeAnalysis;
  }
  
  if (session.rubricProgress && isObject(session.rubricProgress)) {
    sanitized.rubricProgress = session.rubricProgress;
  }
  
  if (session.activitiesProgress && isObject(session.activitiesProgress)) {
    sanitized.activitiesProgress = session.activitiesProgress;
  }
  
  if (session.savedCitations && isObject(session.savedCitations)) {
    sanitized.savedCitations = session.savedCitations;
  }
  
  if (session.artifactsDrafts && isObject(session.artifactsDrafts)) {
    sanitized.artifactsDrafts = session.artifactsDrafts;
  }
  
  if (session.settings && isObject(session.settings)) {
    sanitized.settings = session.settings;
  }
  
  return sanitized;
}

/**
 * Valida y sanitiza una sesión antes de guardar
 * @param {object} session 
 * @returns {object} - { valid: boolean, session: object|null, errors: string[] }
 */
export function validateAndSanitizeSession(session) {
  const validation = validateSession(session);
  
  if (validation.valid) {
    return {
      valid: true,
      session,
      errors: []
    };
  }
  
  // Intentar sanitizar
  console.warn('⚠️ [Validator] Sesión tiene errores, intentando sanitizar:', validation.errors);
  
  const sanitized = sanitizeSession(session);
  
  if (!sanitized) {
    return {
      valid: false,
      session: null,
      errors: ['No se pudo sanitizar la sesión']
    };
  }
  
  // Re-validar sesión sanitizada
  const revalidation = validateSession(sanitized);
  
  return {
    valid: revalidation.valid,
    session: sanitized,
    errors: revalidation.errors
  };
}
