/**
 * Utilidades para hash y comparación de sesiones
 * Detecta cambios reales sin depender solo de timestamps
 */

/**
 * Genera hash simple pero consistente de un objeto
 * @param {any} obj - Objeto a hashear
 * @returns {string} - Hash hexadecimal
 */
export function simpleHash(obj) {
  if (!obj) return '0';

  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16);
}

/**
 * Calcula hash de contenido de sesión (excluyendo timestamps)
 * @param {object} session 
 * @returns {string}
 */
export function getSessionContentHash(session) {
  if (!session) return '0';

  // Extraer solo datos relevantes (sin timestamps)
  const contentData = {
    text: session.text?.content?.substring(0, 10000) || '', // Primeros 10KB
    analysisId: session.completeAnalysis?.metadata?.document_id || null,
    rubricScores: session.rubricProgress ?
      Object.keys(session.rubricProgress).reduce((acc, key) => {
        acc[key] = session.rubricProgress[key].scores?.length || 0;
        return acc;
      }, {}) : {},
    activitiesCompleted: session.activitiesProgress ?
      Object.keys(session.activitiesProgress).reduce((acc, docId) => {
        acc[docId] = session.activitiesProgress[docId].preparation?.completed || false;
        return acc;
      }, {}) : {},
    citationsCount: session.savedCitations ?
      Object.keys(session.savedCitations).reduce((acc, docId) => {
        acc[docId] = session.savedCitations[docId]?.length || 0;
        return acc;
      }, {}) : {}
  };

  return simpleHash(contentData);
}

/**
 * Compara dos sesiones para detectar diferencias significativas
 * @param {object} session1 
 * @param {object} session2 
 * @returns {object} - { isDifferent: boolean, differences: string[] }
 */
export function compareSessionContent(session1, session2) {
  const differences = [];

  // Comparar texto
  const text1 = session1.text?.content || '';
  const text2 = session2.text?.content || '';
  if (text1 !== text2) {
    differences.push('text_content');
  }

  // Comparar análisis
  const analysis1Id = session1.completeAnalysis?.metadata?.document_id;
  const analysis2Id = session2.completeAnalysis?.metadata?.document_id;
  if (analysis1Id !== analysis2Id) {
    differences.push('analysis');
  }

  // Comparar progreso de rúbricas
  const rubric1Keys = Object.keys(session1.rubricProgress || {}).sort();
  const rubric2Keys = Object.keys(session2.rubricProgress || {}).sort();
  if (JSON.stringify(rubric1Keys) !== JSON.stringify(rubric2Keys)) {
    differences.push('rubric_progress_keys');
  } else {
    // Comparar scores de cada rúbrica
    for (const key of rubric1Keys) {
      const scores1 = session1.rubricProgress[key]?.scores?.length || 0;
      const scores2 = session2.rubricProgress[key]?.scores?.length || 0;
      if (scores1 !== scores2) {
        differences.push(`rubric_${key}_scores`);
      }
    }
  }

  // Comparar actividades
  const act1Keys = Object.keys(session1.activitiesProgress || {}).sort();
  const act2Keys = Object.keys(session2.activitiesProgress || {}).sort();
  if (JSON.stringify(act1Keys) !== JSON.stringify(act2Keys)) {
    differences.push('activities_progress_keys');
  } else {
    for (const docId of act1Keys) {
      const completed1 = session1.activitiesProgress[docId]?.preparation?.completed;
      const completed2 = session2.activitiesProgress[docId]?.preparation?.completed;
      if (completed1 !== completed2) {
        differences.push(`activity_${docId}_completion`);
      }
    }
  }

  // Comparar citas
  const cit1Keys = Object.keys(session1.savedCitations || {}).sort();
  const cit2Keys = Object.keys(session2.savedCitations || {}).sort();
  if (JSON.stringify(cit1Keys) !== JSON.stringify(cit2Keys)) {
    differences.push('citations_keys');
  } else {
    for (const docId of cit1Keys) {
      const count1 = session1.savedCitations[docId]?.length || 0;
      const count2 = session2.savedCitations[docId]?.length || 0;
      if (count1 !== count2) {
        differences.push(`citations_${docId}_count`);
      }
    }
  }

  return {
    isDifferent: differences.length > 0,
    differences
  };
}

/**
 * Combina dos sesiones con estrategia de merge inteligente
 * @param {object} local - Sesión local
 * @param {object} cloud - Sesión cloud
 * @returns {object} - Sesión merged
 */
export function mergeSessionsWithConflictResolution(local, cloud) {
  const comparison = compareSessionContent(local, cloud);

  if (!comparison.isDifferent) {
    // Sin diferencias, usar la más reciente
    const localTime = new Date(local.lastModified || local.createdAt).getTime();
    const cloudTime = new Date(cloud.lastModified || cloud.createdAt).getTime();

    return localTime > cloudTime ? local : cloud;
  }

  // Hay diferencias, estrategia de merge campo por campo
  console.log('⚠️ [SessionHash] Conflicto detectado, mergeando:', comparison.differences);

  const merged = {
    ...cloud, // Base: versión cloud
    id: local.id,
    localSessionId: local.id,
    // 🆕 CRÍTICO: Preservar sourceCourseId si existe en cualquiera de las versiones
    sourceCourseId: local.sourceCourseId || cloud.sourceCourseId || null
  };

  // Preferir timestamps más recientes
  const localTime = new Date(local.lastModified || local.createdAt).getTime();
  const cloudTime = new Date(cloud.lastModified || cloud.createdAt).getTime();

  if (localTime > cloudTime) {
    merged.lastModified = local.lastModified;
  }

  // MERGE DE TEXTO: Preferir el más largo (asumiendo que es más completo)
  if (comparison.differences.includes('text_content')) {
    const localLen = local.text?.content?.length || 0;
    const cloudLen = cloud.text?.content?.length || 0;
    merged.text = localLen > cloudLen ? local.text : cloud.text;
  }

  // MERGE DE ANÁLISIS: Preferir el que existe
  if (comparison.differences.includes('analysis')) {
    merged.completeAnalysis = local.completeAnalysis || cloud.completeAnalysis;
  }

  // MERGE DE RÚBRICAS: Combinar scores (union)
  if (comparison.differences.some(d => d.startsWith('rubric'))) {
    merged.rubricProgress = {};
    const allRubricKeys = new Set([
      ...Object.keys(local.rubricProgress || {}),
      ...Object.keys(cloud.rubricProgress || {})
    ]);

    allRubricKeys.forEach(rubricId => {
      const localScores = local.rubricProgress?.[rubricId]?.scores || [];
      const cloudScores = cloud.rubricProgress?.[rubricId]?.scores || [];

      // Combinar scores por timestamp (deduplicar)
      const allScores = [...localScores, ...cloudScores];
      const uniqueScores = allScores.filter((score, index, self) =>
        index === self.findIndex(s => s.timestamp === score.timestamp)
      ).sort((a, b) => a.timestamp - b.timestamp);

      // Recalcular promedio
      const recentScores = uniqueScores.slice(-3);
      const average = recentScores.length > 0
        ? recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length
        : 0;

      merged.rubricProgress[rubricId] = {
        scores: uniqueScores,
        average: Math.round(average * 10) / 10,
        lastUpdate: Math.max(...uniqueScores.map(s => s.timestamp)),
        artefactos: [...new Set([
          ...(local.rubricProgress?.[rubricId]?.artefactos || []),
          ...(cloud.rubricProgress?.[rubricId]?.artefactos || [])
        ])]
      };
    });
  }

  // MERGE DE ACTIVIDADES: Preferir "completado" si alguna versión lo tiene
  if (comparison.differences.some(d => d.startsWith('activity'))) {
    merged.activitiesProgress = {};
    const allDocIds = new Set([
      ...Object.keys(local.activitiesProgress || {}),
      ...Object.keys(cloud.activitiesProgress || {})
    ]);

    allDocIds.forEach(docId => {
      const localPrep = local.activitiesProgress?.[docId]?.preparation;
      const cloudPrep = cloud.activitiesProgress?.[docId]?.preparation;

      merged.activitiesProgress[docId] = {
        preparation: {
          mcqPassed: localPrep?.mcqPassed || cloudPrep?.mcqPassed || false,
          mcqResults: localPrep?.mcqResults || cloudPrep?.mcqResults || null,
          completed: localPrep?.completed || cloudPrep?.completed || false,
          synthesisAnswers: localPrep?.synthesisAnswers || cloudPrep?.synthesisAnswers || null,
          updatedAt: Math.max(
            localPrep?.updatedAt || 0,
            cloudPrep?.updatedAt || 0
          )
        }
      };
    });
  }

  // MERGE DE CITAS: Union
  if (comparison.differences.some(d => d.startsWith('citations'))) {
    merged.savedCitations = {};
    const allCitDocIds = new Set([
      ...Object.keys(local.savedCitations || {}),
      ...Object.keys(cloud.savedCitations || {})
    ]);

    allCitDocIds.forEach(docId => {
      const localCits = local.savedCitations?.[docId] || [];
      const cloudCits = cloud.savedCitations?.[docId] || [];

      // Combinar y deduplicar por ID
      const allCits = [...localCits, ...cloudCits];
      const uniqueCits = allCits.filter((cit, index, self) =>
        index === self.findIndex(c => c.id === cit.id)
      );

      merged.savedCitations[docId] = uniqueCits;
    });
  }

  // 🆕 FASE 4: rewardsState NO se mergea a nivel de sesiones (es global)

  // Marcar como merged
  merged.syncStatus = 'merged';
  merged.mergedAt = Date.now();

  // 🆕 CRÍTICO: Asegurar que currentTextoId también se preserve
  merged.currentTextoId = local.currentTextoId || local.text?.metadata?.id ||
    cloud.currentTextoId || cloud.text?.metadata?.id || null;

  return merged;
}
