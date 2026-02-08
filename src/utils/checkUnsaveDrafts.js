/**
 * Utilidad para detectar borradores sin evaluar en artefactos
 */

import { getDraftKey } from '../services/sessionManager';

/**
 * Verifica si hay borradores sin evaluar en los artefactos
 * 🆕 FASE 1 FIX: Ahora usa claves namespaced por textoId
 * 🆕 FASE 3 FIX: Acepta rubricProgress como parámetro (desde React context)
 * 🆕 FASE 4 FIX: Ahora también verifica activitiesProgress para detectar artefactos ya entregados
 * @param {string|null} textoId - ID del texto para namespace de claves
 * @param {object} rubricProgress - Objeto con progreso de rúbricas (desde AppContext)
 * @param {object} activitiesProgress - Objeto con progreso de actividades (desde AppContext)
 * @returns {object} - { hasDrafts: boolean, details: array }
 */
export function checkUnsaveDrafts(textoId = null, rubricProgress = {}, activitiesProgress = {}) {
  const details = [];
  let hasDrafts = false;

  // 🆕 Helper para generar claves namespaced
  const key = (base) => getDraftKey(base, textoId);

  // 🆕 FASE 3 FIX: rubricProgress ahora viene como parámetro desde React context
  // Ya no leemos de localStorage (la clave 'rubricProgress' nunca existía allí)

  // Helper: Verificar si una rúbrica tiene evaluación reciente (últimos 5 minutos)
  const hasRecentEvaluation = (rubricId) => {
    const rubrica = rubricProgress?.[rubricId];
    if (!rubrica || !rubrica.scores || rubrica.scores.length === 0) return false;

    const lastEvaluation = rubrica.scores[rubrica.scores.length - 1];
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    return lastEvaluation.timestamp && lastEvaluation.timestamp > fiveMinutesAgo;
  };

  // 🆕 FASE 4 FIX: Helper para verificar si un artefacto ya fue entregado (submitted)
  const isArtifactSubmitted = (artifactName) => {
    // Buscar en activitiesProgress del texto actual
    const textProgress = textoId ? activitiesProgress?.[textoId] : null;
    if (textProgress?.artifacts?.[artifactName]?.submitted) {
      return true;
    }
    
    // También verificar en todas las entradas de activitiesProgress (por si el textoId no coincide exactamente)
    for (const docId of Object.keys(activitiesProgress || {})) {
      const docProgress = activitiesProgress[docId];
      if (docProgress?.artifacts?.[artifactName]?.submitted) {
        return true;
      }
    }
    
    return false;
  };

  // Resumen Académico - 🆕 Usa clave namespaced
  const resumenDraft = sessionStorage.getItem(key('resumenAcademico_draft'));
  // 🆕 FASE 4: También verificar si ya fue entregado
  if (resumenDraft && resumenDraft.trim().length > 0 && !hasRecentEvaluation('rubrica1') && !isArtifactSubmitted('resumenAcademico')) {
    hasDrafts = true;
    details.push({
      artefacto: 'Resumen Académico con Citas',
      estado: 'Borrador sin evaluar',
      ubicacion: 'Actividades > Resumen Académico'
    });
  }

  // Tabla ACD - 🆕 Usa claves namespaced
  const tablaACD = {
    marco: sessionStorage.getItem(key('tablaACD_marcoIdeologico')),
    estrategias: sessionStorage.getItem(key('tablaACD_estrategiasRetoricas')),
    presentes: sessionStorage.getItem(key('tablaACD_vocesPresentes')),
    silenciadas: sessionStorage.getItem(key('tablaACD_vocesSilenciadas'))
  };
  // 🆕 FASE 4: También verificar si ya fue entregado
  if ((tablaACD.marco || tablaACD.estrategias || tablaACD.presentes || tablaACD.silenciadas) && !hasRecentEvaluation('rubrica2') && !isArtifactSubmitted('tablaACD')) {
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

  // Mapa de Actores - 🆕 Usa claves namespaced
  const mapaActores = {
    actores: sessionStorage.getItem(key('mapaActores_actores')),
    contexto: sessionStorage.getItem(key('mapaActores_contextoHistorico')),
    conexiones: sessionStorage.getItem(key('mapaActores_conexiones')),
    consecuencias: sessionStorage.getItem(key('mapaActores_consecuencias'))
  };
  // 🆕 FASE 4: También verificar si ya fue entregado
  if ((mapaActores.actores || mapaActores.contexto || mapaActores.conexiones || mapaActores.consecuencias) && !hasRecentEvaluation('rubrica3') && !isArtifactSubmitted('mapaActores')) {
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

  // Respuesta Argumentativa - 🆕 Usa claves namespaced
  const respuestaArg = {
    tesis: sessionStorage.getItem(key('respuestaArgumentativa_tesis')),
    evidencias: sessionStorage.getItem(key('respuestaArgumentativa_evidencias')),
    contra: sessionStorage.getItem(key('respuestaArgumentativa_contraargumento')),
    refutacion: sessionStorage.getItem(key('respuestaArgumentativa_refutacion'))
  };
  // 🆕 FASE 4: También verificar si ya fue entregado
  if ((respuestaArg.tesis || respuestaArg.evidencias || respuestaArg.contra || respuestaArg.refutacion) && !hasRecentEvaluation('rubrica4') && !isArtifactSubmitted('respuestaArgumentativa')) {
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

  // 🆕 Ensayo Integrador - Detectar borrador en sessionStorage
  const ensayoDraft = sessionStorage.getItem(key('ensayoIntegrador_text'));
  if (ensayoDraft && ensayoDraft.trim().length > 0) {
    // Verificar si ya hay un ensayo calificado para alguna dimensión
    const dimensionDraft = sessionStorage.getItem(key('ensayoIntegrador_dimension'));
    const DIMENSION_TO_RUBRIC = {
      comprension_analitica: 'rubrica1',
      acd: 'rubrica2',
      contextualizacion: 'rubrica3',
      argumentacion: 'rubrica4'
    };
    const targetRubricId = dimensionDraft ? DIMENSION_TO_RUBRIC[dimensionDraft] : null;
    const isGraded = targetRubricId && rubricProgress?.[targetRubricId]?.summative?.status === 'graded';

    if (!isGraded) {
      hasDrafts = true;
      details.push({
        artefacto: 'Ensayo Integrador (Sumativo)',
        estado: 'Borrador sin enviar',
        ubicacion: 'Evaluación > Ensayo Integrador'
      });
    }
  }

  return { hasDrafts, details };
}

/**
 * Obtiene un mensaje de advertencia formateado
 * 🆕 FASE 3 FIX: Acepta rubricProgress como parámetro
 * 🆕 FASE 4 FIX: Acepta activitiesProgress como parámetro
 */
export function getWarningMessage(textoId = null, rubricProgress = {}, activitiesProgress = {}) {
  const { hasDrafts, details } = checkUnsaveDrafts(textoId, rubricProgress, activitiesProgress);

  if (!hasDrafts) return null;

  const artefactosList = details.map(d => `• ${d.artefacto}`).join('\n');

  return `⚠️ ADVERTENCIA: Cambio de Sesión

Tienes borradores sin evaluar en los siguientes artefactos:

${artefactosList}

⚠️ Si cambias de sesión o cargas un nuevo documento, estos borradores se perderán permanentemente.

💡 Recomendación: Evalúa estos artefactos antes de cambiar de sesión para guardar tu progreso.

¿Deseas continuar de todas formas?`;
}

