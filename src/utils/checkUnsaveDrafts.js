/**
 * Utilidad para detectar borradores sin evaluar en artefactos
 */

/**
 * Verifica si hay borradores sin evaluar en los artefactos
 * @returns {object} - { hasDrafts: boolean, details: array }
 */
export function checkUnsaveDrafts() {
  const details = [];
  let hasDrafts = false;

  // Obtener rubricProgress para verificar evaluaciones
  let rubricProgress = {};
  try {
    const saved = localStorage.getItem('rubricProgress');
    if (saved) {
      rubricProgress = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error leyendo rubricProgress:', e);
  }

  // Helper: Verificar si una rúbrica tiene evaluación reciente (últimos 5 minutos)
  const hasRecentEvaluation = (rubricId) => {
    const rubrica = rubricProgress[rubricId];
    if (!rubrica || !rubrica.scores || rubrica.scores.length === 0) return false;
    
    const lastEvaluation = rubrica.scores[rubrica.scores.length - 1];
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    return lastEvaluation.timestamp && lastEvaluation.timestamp > fiveMinutesAgo;
  };

  // Resumen Académico
  const resumenDraft = sessionStorage.getItem('resumenAcademico_draft');
  if (resumenDraft && resumenDraft.trim().length > 0 && !hasRecentEvaluation('rubrica1')) {
    hasDrafts = true;
    details.push({
      artefacto: 'Resumen Académico con Citas',
      estado: 'Borrador sin evaluar',
      ubicacion: 'Actividades > Resumen Académico'
    });
  }

  // Tabla ACD
  const tablaACD = {
    marco: sessionStorage.getItem('tablaACD_marcoIdeologico'),
    estrategias: sessionStorage.getItem('tablaACD_estrategiasRetoricas'),
    presentes: sessionStorage.getItem('tablaACD_vocesPresentes'),
    silenciadas: sessionStorage.getItem('tablaACD_vocesSilenciadas')
  };
  if ((tablaACD.marco || tablaACD.estrategias || tablaACD.presentes || tablaACD.silenciadas) && !hasRecentEvaluation('rubrica2')) {
    const hasContent = Object.values(tablaACD).some(v => v && v.trim().length > 0);
    if (hasContent) {
      hasDrafts = true;
      details.push({
        artefacto: 'Tabla de Análisis Crítico del Discurso (ACD)',
        estado: 'Borrador sin evaluar',
        ubicacion: 'Actividades > Tabla ACD'
      });
    }
  }

  // Mapa de Actores
  const mapaActores = {
    actores: sessionStorage.getItem('mapaActores_actores'),
    contexto: sessionStorage.getItem('mapaActores_contextoHistorico'),
    conexiones: sessionStorage.getItem('mapaActores_conexiones'),
    consecuencias: sessionStorage.getItem('mapaActores_consecuencias')
  };
  if ((mapaActores.actores || mapaActores.contexto || mapaActores.conexiones || mapaActores.consecuencias) && !hasRecentEvaluation('rubrica3')) {
    const hasContent = Object.values(mapaActores).some(v => v && v.trim().length > 0);
    if (hasContent) {
      hasDrafts = true;
      details.push({
        artefacto: 'Mapa de Actores Sociales',
        estado: 'Borrador sin evaluar',
        ubicacion: 'Actividades > Mapa de Actores'
      });
    }
  }

  // Respuesta Argumentativa
  const respuestaArg = {
    tesis: sessionStorage.getItem('respuestaArgumentativa_tesis'),
    evidencias: sessionStorage.getItem('respuestaArgumentativa_evidencias'),
    contra: sessionStorage.getItem('respuestaArgumentativa_contraargumento'),
    refutacion: sessionStorage.getItem('respuestaArgumentativa_refutacion')
  };
  if ((respuestaArg.tesis || respuestaArg.evidencias || respuestaArg.contra || respuestaArg.refutacion) && !hasRecentEvaluation('rubrica4')) {
    const hasContent = Object.values(respuestaArg).some(v => v && v.trim().length > 0);
    if (hasContent) {
      hasDrafts = true;
      details.push({
        artefacto: 'Respuesta Argumentativa',
        estado: 'Borrador sin evaluar',
        ubicacion: 'Actividades > Respuesta Argumentativa'
      });
    }
  }

  return { hasDrafts, details };
}

/**
 * Obtiene un mensaje de advertencia formateado
 */
export function getWarningMessage() {
  const { hasDrafts, details } = checkUnsaveDrafts();
  
  if (!hasDrafts) return null;

  const artefactosList = details.map(d => `• ${d.artefacto}`).join('\n');
  
  return `⚠️ ADVERTENCIA: Cambio de Sesión

Tienes borradores sin evaluar en los siguientes artefactos:

${artefactosList}

⚠️ Si cambias de sesión o cargas un nuevo documento, estos borradores se perderán permanentemente.

💡 Recomendación: Evalúa estos artefactos antes de cambiar de sesión para guardar tu progreso.

¿Deseas continuar de todas formas?`;
}

