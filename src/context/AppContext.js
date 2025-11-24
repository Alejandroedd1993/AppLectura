import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import {
  createSessionFromState,
  restoreSessionToState,
  captureCurrentState,
  updateCurrentSession,
  setCurrentSession as setCurrentSessionId,
  getCurrentSessionId,
  clearArtifactsDrafts,
  captureArtifactsDrafts,
  setCurrentUser as setSessionManagerUser,
  syncAllSessionsToCloud,
  getAllSessionsMerged
} from '../services/sessionManager';
import { useAuth } from './AuthContext';
import {
  uploadTexto,
  saveEvaluacion,
  saveStudentProgress,
  subscribeToStudentProgress
} from '../firebase/firestore';
import {
  createActiveSession,
  closeActiveSession,
  listenToSessionConflicts,
  startSessionHeartbeat,
  getSessionInfo
} from '../firebase/sessionManager';

// 1. Crear el Contexto
export const AppContext = createContext();

/**
 * Este componente Provider encapsula la lógica del estado global
 * para que esté disponible en toda la aplicación.
 */
export const AppContextProvider = ({ children }) => {
  console.log('🚀 AppContext provider loaded'); // Log inmediato
  
  // Firebase Authentication - Usar try/catch para evitar errores si no está disponible
  let currentUser = null;
  let userData = null;
  
  try {
    const auth = useAuth();
    currentUser = auth.currentUser;
    userData = auth.userData;
  } catch (error) {
    console.warn('⚠️ [AppContext] AuthContext no disponible aún, continuando sin auth');
  }
  
  // Estado global de la aplicación
  const [texto, setTexto] = useState('');
  
  // Debug: interceptar cambios en el texto - OPTIMIZADO con useCallback
  const setTextoWithDebug = useCallback((nuevoTexto) => {
    console.log('🔄 AppContext - Estableciendo nuevo texto, longitud:', nuevoTexto?.length || 0);
    console.log('🔄 AppContext - Primeros 200 caracteres:', nuevoTexto?.substring(0, 200) || 'Vacío');
    setTexto(nuevoTexto);
  }, []);
  
  const [openAIApiKey, setOpenAIApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  
  // MEJORA: Inicializar modo oscuro desde localStorage o preferencia del sistema para persistencia.
  const [modoOscuro, setModoOscuro] = useState(() => {
    const guardado = localStorage.getItem('modoOscuro');
    if (guardado !== null) {
      return JSON.parse(guardado);
    }
    // Si no hay nada guardado, detectar preferencia del sistema.
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Archivo actual (para preservar PDF original y mostrarlo en visor)
  const [archivoActual, setArchivoActual] = useState(null);
  
  // NUEVO: Estructura del texto detectada por IA
  const [textStructure, setTextStructure] = useState(null);
  
  // NUEVO: Análisis completo unificado (Pre-lectura + Análisis Crítico)
  const [completeAnalysis, setCompleteAnalysis] = useState(null);

  // 🆕 PROGRESO POR RÚBRICAS: Sistema de tracking de evaluaciones de artefactos
  const [rubricProgress, setRubricProgress] = useState(() => {
    // Intentar cargar desde localStorage
    const saved = localStorage.getItem('rubricProgress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validar que el objeto tiene la estructura correcta
        const validatedProgress = {};
        const rubricIds = ['rubrica1', 'rubrica2', 'rubrica3', 'rubrica4', 'rubrica5'];
        
        rubricIds.forEach(rubricId => {
          if (parsed[rubricId] && typeof parsed[rubricId] === 'object') {
            validatedProgress[rubricId] = {
              scores: Array.isArray(parsed[rubricId].scores) ? parsed[rubricId].scores : [],
              average: typeof parsed[rubricId].average === 'number' ? parsed[rubricId].average : 0,
              lastUpdate: parsed[rubricId].lastUpdate || null,
              artefactos: Array.isArray(parsed[rubricId].artefactos) ? parsed[rubricId].artefactos : []
            };
          } else {
            // Inicializar con estructura por defecto
            validatedProgress[rubricId] = { scores: [], average: 0, lastUpdate: null, artefactos: [] };
          }
        });
        
        console.log('✅ [AppContext] rubricProgress cargado y validado desde localStorage');
        return validatedProgress;
      } catch (e) {
        console.warn('⚠️ Error cargando rubricProgress desde localStorage:', e);
      }
    }
    // Estado inicial si no hay datos guardados
    return {
      rubrica1: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica2: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica3: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica4: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica5: { scores: [], average: 0, lastUpdate: null, artefactos: [] }
    };
  });

  // Persistir rubricProgress en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('rubricProgress', JSON.stringify(rubricProgress));
  }, [rubricProgress]);

  // 🆕 CITAS GUARDADAS: Sistema de citas seleccionadas manualmente por el estudiante
  const [savedCitations, setSavedCitations] = useState(() => {
    const saved = localStorage.getItem('savedCitations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('⚠️ Error cargando savedCitations desde localStorage:', e);
      }
    }
    return {}; // Estructura: { [documentId]: [{ id, texto, timestamp, nota }] }
  });

  // Persistir citas guardadas cuando cambien
  useEffect(() => {
    localStorage.setItem('savedCitations', JSON.stringify(savedCitations));
  }, [savedCitations]);

  // 🆕 ACTIVIDADES: Progreso de preparación y artefactos por documento
  const [activitiesProgress, setActivitiesProgress] = useState(() => {
    const saved = localStorage.getItem('activitiesProgress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.warn('⚠️ Error cargando activitiesProgress desde localStorage:', error);
      }
    }
    return {};
  });

  // 🔐 SESIÓN ÚNICA: Control de sesiones activas por usuario
  const [sessionConflict, setSessionConflict] = useState(false);
  const [conflictingSessionInfo, setConflictingSessionInfo] = useState(null);

  // 🔄 Migración automática de datos antiguos (una sola vez)
  useEffect(() => {
    const migrationFlag = localStorage.getItem('activitiesProgress_migrated');
    if (!migrationFlag) {
      import('../utils/migrateActivityData').then(({ migrateActivityDataToContext }) => {
        const result = migrateActivityDataToContext();
        if (result.migrated > 0) {
          console.log(`✅ [Migration] ${result.migrated} documentos migrados a activitiesProgress`);
          setActivitiesProgress(result.data);
          localStorage.setItem('activitiesProgress_migrated', 'true');
        }
      }).catch(err => {
        console.warn('⚠️ [Migration] Error importando migración:', err);
      });
    }
  }, []); // Solo al montar

  useEffect(() => {
    localStorage.setItem('activitiesProgress', JSON.stringify(activitiesProgress));
  }, [activitiesProgress]);

  // OPTIMIZADO: Función para guardar la API key, envuelta en useCallback para estabilidad
  const handleApiKeyChange = useCallback((key) => {
    setOpenAIApiKey(key);
    if (key) {
      localStorage.setItem('openai_api_key', key);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  }, []);

  // OPTIMIZADO: Función para cambiar y persistir el modo oscuro.
  const toggleModoOscuro = useCallback(() => {
    setModoOscuro(prevModo => {
      const nuevoModo = !prevModo;
      localStorage.setItem('modoOscuro', JSON.stringify(nuevoModo));
      return nuevoModo;
    });
  }, []);

  // OPTIMIZADO: Funciones adicionales estables
  const setLoadingStable = useCallback((newLoading) => {
    setLoading(newLoading);
  }, []);

  const setErrorStable = useCallback((newError) => {
    setError(newError);
  }, []);

  // Setter estable para archivo actual
  const setArchivoActualStable = useCallback((archivo) => {
    setArchivoActual(archivo || null);
  }, []);

  // NUEVO: Setter estable para estructura del texto
  const setTextStructureStable = useCallback((structure) => {
    console.log('📐 AppContext - Estableciendo estructura del texto:', structure);
    setTextStructure(structure || null);
  }, []);

  // 🆕 FUNCIÓN PARA ACTUALIZAR PROGRESO DE RÚBRICAS
  const updateRubricScore = useCallback((rubricId, scoreData) => {
    console.log(`📊 [updateRubricScore] Actualizando ${rubricId}:`, scoreData);
    
    setRubricProgress(prev => {
      // Validar que la rúbrica existe, si no, crear estructura por defecto
      const rubrica = prev[rubricId] || { scores: [], average: 0, lastUpdate: null, artefactos: [] };
      
      // Agregar nuevo score con metadata
      const newScoreEntry = {
        score: scoreData.score || scoreData.scoreGlobal || scoreData.nivel || 0,
        nivel: scoreData.nivel || Math.round((scoreData.score || scoreData.scoreGlobal || 0) / 2.5),
        artefacto: scoreData.artefacto || scoreData.source || 'unknown',
        timestamp: Date.now(),
        criterios: scoreData.criterios || scoreData.criteriosEvaluados || null
      };
      
      const newScores = [...(rubrica.scores || []), newScoreEntry];
      
      // Calcular promedio (últimos 3 intentos o todos si son menos)
      const recentScores = newScores.slice(-3);
      const average = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
      
      // Registrar artefactos únicos
      const artefactosSet = new Set([...(rubrica.artefactos || []), newScoreEntry.artefacto]);
      
      const updatedRubrica = {
        scores: newScores,
        average: Math.round(average * 10) / 10,
        lastUpdate: Date.now(),
        artefactos: Array.from(artefactosSet)
      };
      
      console.log(`✅ [updateRubricScore] ${rubricId} actualizada. Promedio: ${updatedRubrica.average}/10`);
      
      // 🆕 DISPARAR EVENTO para sincronización optimizada
      window.dispatchEvent(new CustomEvent('artifact-evaluated', {
        detail: { 
          rubricId, 
          score: newScoreEntry.score,
          average: updatedRubrica.average,
          artefacto: newScoreEntry.artefacto
        }
      }));
      
      return {
        ...prev,
        [rubricId]: updatedRubrica
      };
    });
  }, []);

  // 🆕 FUNCIÓN PARA LIMPIAR PROGRESO DE UNA RÚBRICA
  const clearRubricProgress = useCallback((rubricId) => {
    console.log(`🗑️ [clearRubricProgress] Limpiando ${rubricId}`);
    setRubricProgress(prev => ({
      ...prev,
      [rubricId]: { scores: [], average: 0, lastUpdate: null, artefactos: [] }
    }));
  }, []);

  // 🆕 FUNCIÓN PARA RESETEAR TODO EL PROGRESO
  const resetAllProgress = useCallback(() => {
    console.log('🗑️ [resetAllProgress] Reseteando todo el progreso de rúbricas');
    const emptyProgress = {
      rubrica1: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica2: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica3: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica4: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
      rubrica5: { scores: [], average: 0, lastUpdate: null, artefactos: [] }
    };
    setRubricProgress(emptyProgress);
    localStorage.removeItem('rubricProgress');
  }, []);

  // 🆕 FUNCIÓN PARA GUARDAR UNA CITA (llamada desde Lectura Guiada)
  const saveCitation = useCallback((citation) => {
    console.log('💾 [saveCitation] Guardando cita:', citation);
    
    const { documentId, texto, nota = '' } = citation;
    
    if (!documentId || !texto || texto.trim().length < 10) {
      console.warn('⚠️ [saveCitation] Cita inválida (requiere documentId y texto >10 chars)');
      return false;
    }

    setSavedCitations(prev => {
      const docCitations = prev[documentId] || [];
      
      // Evitar duplicados (mismos primeros 50 caracteres)
      const isDuplicate = docCitations.some(
        c => c.texto.substring(0, 50) === texto.substring(0, 50)
      );
      
      if (isDuplicate) {
        console.warn('⚠️ [saveCitation] Cita duplicada, no se guardará');
        return prev;
      }

      const newCitation = {
        id: Date.now(),
        texto: texto.trim(),
        timestamp: Date.now(),
        nota: nota.trim()
      };

      const updated = {
        ...prev,
        [documentId]: [...docCitations, newCitation]
      };

      console.log(`✅ [saveCitation] Cita guardada. Total para documento: ${updated[documentId].length}`);
      return updated;
    });

    return true;
  }, []);

  // 🆕 FUNCIÓN PARA ELIMINAR UNA CITA
  const deleteCitation = useCallback((documentId, citationId) => {
    console.log(`🗑️ [deleteCitation] Eliminando cita ${citationId} del documento ${documentId}`);
    
    setSavedCitations(prev => {
      const docCitations = prev[documentId] || [];
      const filtered = docCitations.filter(c => c.id !== citationId);
      
      if (filtered.length === 0) {
        // Si no quedan citas, eliminar el documento del objeto
        const { [documentId]: removed, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [documentId]: filtered
      };
    });
  }, []);

  // 🆕 FUNCIÓN PARA OBTENER CITAS DE UN DOCUMENTO
  const getCitations = useCallback((documentId) => {
    if (!documentId) return [];
    return savedCitations[documentId] || [];
  }, [savedCitations]);

  // 🆕 FUNCIÓN PARA LIMPIAR TODAS LAS CITAS DE UN DOCUMENTO
  const clearDocumentCitations = useCallback((documentId) => {
    console.log(`🗑️ [clearDocumentCitations] Limpiando todas las citas del documento ${documentId}`);
    
    setSavedCitations(prev => {
      const { [documentId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // 🆕 FUNCIONES DE PROGRESO DE ACTIVIDADES
  const updateActivitiesProgress = useCallback((documentId, updater) => {
    if (!documentId) return;
    setActivitiesProgress(prev => {
      const previous = prev[documentId] || {};
      const nextDoc = typeof updater === 'function' ? updater(previous) : updater;
      return {
        ...prev,
        [documentId]: {
          ...previous,
          ...nextDoc
        }
      };
    });
  }, []);

  const markPreparationProgress = useCallback((documentId, payload) => {
    if (!documentId) return;
    updateActivitiesProgress(documentId, (previous = {}) => ({
      ...previous,
      preparation: {
        ...(previous.preparation || {}),
        ...payload,
        updatedAt: Date.now()
      }
    }));
  }, [updateActivitiesProgress]);

  const resetActivitiesProgress = useCallback((documentId) => {
    if (!documentId) return;
    setActivitiesProgress(prev => {
      const { [documentId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // ==================== SINCRONIZACIÓN CON FIRESTORE ====================

  /**
   * Guarda el texto actual en Firestore (NO implementado aún - requiere estructura docente/estudiante)
   * Por ahora solo muestra log
   */
  const saveCurrentTextToFirestore = useCallback(async () => {
    if (!currentUser || !texto || texto.length < 100) {
      console.log('⚠️ [Firestore] No se puede guardar: usuario no autenticado o texto muy corto');
      return null;
    }

    try {
      console.log('💾 [Firestore] Texto disponible para guardar (función pendiente de implementación completa)');
      console.log('📊 Longitud:', texto.length, 'palabras');
      
      // TODO: Implementar guardado con estructura docente → uploadTexto()
      // Por ahora solo registramos que está disponible
      
      return 'pending_implementation';
      
    } catch (error) {
      console.error('❌ [Firestore] Error:', error);
      return null;
    }
  }, [currentUser, texto]);

  /**
   * Sincroniza el progreso de rúbricas con Firestore
   * OPTIMIZADO: Solo llamar cuando se completa un artefacto
   */
  const syncRubricProgressToFirestore = useCallback(async (rubricId = null) => {
    if (!currentUser || !userData?.role) return;

    try {
      console.log('💾 [Firestore] Sincronizando progreso de rúbricas...', rubricId || 'todas');
      
      // Usar saveStudentProgress para estudiantes
      if (userData.role === 'estudiante') {
        // 🆕 INCLUIR rewardsState en la sincronización
        const currentRewardsState = window.__rewardsEngine ? window.__rewardsEngine.exportState() : null;
        
        const progressData = {
          rubricProgress: rubricId ? { [rubricId]: rubricProgress[rubricId] } : rubricProgress,
          rewardsState: currentRewardsState, // 🆕 CRÍTICO: Sincronizar puntos
          lastSync: new Date().toISOString(),
          userId: currentUser.uid,
          syncType: rubricId ? 'incremental' : 'full'
        };
        
        await saveStudentProgress(currentUser.uid, 'global_progress', progressData);
        
        console.log('✅ [Firestore] Progreso de estudiante sincronizado (incluye rewardsState)');
        return true;
      } else {
        console.log('ℹ️ [Firestore] Usuario docente - progreso no se sincroniza');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [Firestore] Error sincronizando progreso:', error);
      return false;
    }
  }, [currentUser, userData, rubricProgress]);

  /**
   * Guarda una evaluación completada en Firestore
   */
  const saveEvaluationToFirestore = useCallback(async (evaluationData) => {
    if (!currentUser) {
      console.log('⚠️ [Firestore] No se puede guardar evaluación: usuario no autenticado');
      return null;
    }

    try {
      console.log('💾 [Firestore] Guardando evaluación...');
      
      const evalData = {
        estudianteUid: currentUser.uid,
        estudianteNombre: userData?.nombre || currentUser.displayName || 'Usuario',
        textoId: evaluationData.textId || 'unknown',
        textoTitulo: evaluationData.textTitle || 'Sin título',
        respuestas: evaluationData.responses || [],
        puntajes: evaluationData.scores || {},
        puntajeTotal: evaluationData.totalScore || 0,
        rubricas: evaluationData.rubrics || [],
        feedback: evaluationData.feedback || '',
        timestamp: new Date()
      };
      
      const evalId = await saveEvaluacion(evalData);
      
      console.log('✅ [Firestore] Evaluación guardada con ID:', evalId);
      return evalId;
      
    } catch (error) {
      console.error('❌ [Firestore] Error guardando evaluación:', error);
      return null;
    }
  }, [currentUser, userData]);

  /**
   * Sincroniza citas guardadas con Firestore (pendiente de implementación)
   */
  const syncCitationsToFirestore = useCallback(async () => {
    if (!currentUser || Object.keys(savedCitations).length === 0) return;

    try {
      console.log('💾 [Firestore] Citas disponibles para sincronizar:', Object.keys(savedCitations).length);
      console.log('ℹ️ [Firestore] Sincronización de citas pendiente de implementación');
      
      // TODO: Implementar guardado de notas/citas cuando se agregue la función correspondiente
      
    } catch (error) {
      console.error('❌ [Firestore] Error sincronizando citas:', error);
    }
  }, [currentUser, savedCitations]);

  // 🆕 OPTIMIZADO: Sincronizar rúbricas solo cuando se dispara evento de evaluación completa
  useEffect(() => {
    const handleArtifactCompleted = async (event) => {
      const { rubricId, score } = event.detail || {};
      
      if (rubricId && currentUser) {
        console.log(`📊 [AppContext] Artefacto completado: ${rubricId}, score: ${score}`);
        
        // Sincronizar solo esta rúbrica específica INMEDIATAMENTE
        await syncRubricProgressToFirestore(rubricId);
      }
    };
    
    window.addEventListener('artifact-evaluated', handleArtifactCompleted);
    
    return () => window.removeEventListener('artifact-evaluated', handleArtifactCompleted);
  }, [currentUser, syncRubricProgressToFirestore]);

  // 🆕 SINCRONIZAR rewardsState cuando cambia (tutor, actividades, etc.)
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') return;
    
    let debounceTimer = null;
    
    const handleRewardsChanged = (event) => {
      const { totalPoints, availablePoints } = event.detail || {};
      
      console.log(`🎮 [AppContext] Puntos actualizados: ${totalPoints} pts (${availablePoints} disponibles)`);
      
      // Debounce de 3 segundos para evitar múltiples writes
      if (debounceTimer) clearTimeout(debounceTimer);
      
      debounceTimer = setTimeout(async () => {
        try {
          const currentRewardsState = window.__rewardsEngine?.exportState();
          if (!currentRewardsState) return;
          
          const progressData = {
            rewardsState: currentRewardsState,
            lastSync: new Date().toISOString(),
            userId: currentUser.uid,
            syncType: 'rewards_update'
          };
          
          await saveStudentProgress(currentUser.uid, 'global_progress', progressData);
          console.log('✅ [AppContext] rewardsState sincronizado a Firestore');
        } catch (error) {
          console.error('❌ [AppContext] Error sincronizando rewardsState:', error);
        }
      }, 3000);
    };
    
    window.addEventListener('rewards-state-changed', handleRewardsChanged);
    
    return () => {
      window.removeEventListener('rewards-state-changed', handleRewardsChanged);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [currentUser, userData]);
  
  // 🔄 SINCRONIZACIÓN INMEDIATA: Cuando cambia activitiesProgress, sincronizar a Firestore
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') return;
    
    // Evitar sincronizar en la carga inicial (solo cuando hay cambios reales)
    const hasActivities = Object.keys(activitiesProgress).length > 0;
    if (!hasActivities) return;
    
    // Debounce de 2 segundos para evitar múltiples writes
    const timeoutId = setTimeout(() => {
      console.log('💾 [AppContext] Sincronizando activitiesProgress a Firestore...');
      
      // 🆕 INCLUIR rewardsState también
      const currentRewardsState = window.__rewardsEngine ? window.__rewardsEngine.exportState() : null;
      
      const progressData = {
        activitiesProgress,
        rewardsState: currentRewardsState, // 🆕 SINCRONIZAR puntos también
        lastSync: new Date().toISOString(),
        userId: currentUser.uid,
        syncType: 'activities_update'
      };
      
      saveStudentProgress(currentUser.uid, 'global_progress', progressData)
        .then(() => {
          console.log('✅ [AppContext] activitiesProgress + rewardsState sincronizados');
        })
        .catch(error => {
          console.error('❌ [AppContext] Error sincronizando activitiesProgress:', error);
        });
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [activitiesProgress, currentUser, userData]);

  // 🔥 Establecer usuario actual en sessionManager cuando cambie
  useEffect(() => {
    if (currentUser?.uid) {
      setSessionManagerUser(currentUser.uid);
      console.log('👤 [AppContext] Usuario establecido en SessionManager:', currentUser.uid);
    } else {
      setSessionManagerUser(null);
      console.log('👤 [AppContext] Usuario removido de SessionManager');
    }
  }, [currentUser]);

  // ==================== FIN SINCRONIZACIÓN FIRESTORE ====================

  // 📚 FUNCIONES DE GESTIÓN DE SESIONES
  const createSession = useCallback(async () => {
    try {
      console.log('🔵 [AppContext.createSession] Iniciando creación de sesión...');
      console.log('🔵 [AppContext.createSession] Texto disponible:', !!texto, 'longitud:', texto?.length || 0);
      console.log('🔵 [AppContext.createSession] Archivo actual:', archivoActual?.name || 'sin archivo');
      console.log('🔵 [AppContext.createSession] currentUser:', currentUser?.email || 'null', 'uid:', currentUser?.uid || 'null');
      
      // 🔥 CRÍTICO: Asegurar que el usuario esté configurado en sessionManager
      if (currentUser?.uid) {
        console.log('👤 [AppContext.createSession] Configurando usuario en sessionManager:', currentUser.uid);
        setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);
      } else {
        console.warn('⚠️ [AppContext.createSession] Sin usuario autenticado, sesión solo local');
      }
      
      if (!texto || texto.length === 0) {
        console.warn('⚠️ [AppContext.createSession] No hay texto para guardar');
        return null;
      }
      
      const sessionData = {
        texto,
        archivoActual,
        completeAnalysis,
        rubricProgress,
        savedCitations,
        activitiesProgress,
        modoOscuro,
        // 🆕 Capturar estado de gamificación
        rewardsState: window.__rewardsEngine ? window.__rewardsEngine.exportState() : null
      };
      
      console.log('🔵 [AppContext.createSession] Llamando a createSessionFromState...');
      const session = createSessionFromState(sessionData);
      
      console.log('✅ [AppContext.createSession] Sesión creada:', session?.id);
      
      // Emitir evento para actualizar UI
      window.dispatchEvent(new CustomEvent('session-updated'));
      
      return session;
    } catch (error) {
      console.error('❌ [AppContext.createSession] Error:', error);
      console.error('❌ [AppContext.createSession] Stack:', error.stack);
      return null;
    }
  }, [texto, archivoActual, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro, currentUser, userData]);

  // 🆕 NUEVA FUNCIÓN: Actualizar sesión actual con cambios
  const updateCurrentSessionFromState = useCallback(async () => {
    try {
      console.log('💾 [AppContext.updateCurrentSession] Actualizando sesión actual...');
      
      // Verificar que hay una sesión activa
      const currentSessionId = getCurrentSessionId();
      if (!currentSessionId) {
        console.warn('⚠️ [AppContext.updateCurrentSession] No hay sesión activa para actualizar');
        return null;
      }
      
      // 🔥 CRÍTICO: Asegurar que el usuario esté configurado
      if (currentUser?.uid) {
        setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);
      }
      
      if (!texto || texto.length === 0) {
        console.warn('⚠️ [AppContext.updateCurrentSession] No hay texto para guardar');
        return null;
      }
      
      // Preparar datos actualizados
      const updates = {
        text: {
          content: texto,
          fileName: archivoActual?.name || 'texto_manual',
          fileType: archivoActual?.type || 'text/plain',
          metadata: {
            length: texto.length,
            words: texto.split(/\s+/).length
          }
        },
        completeAnalysis,
        rubricProgress,
        savedCitations,
        activitiesProgress,
        // 🆕 CRÍTICO: Capturar borradores de artefactos desde sessionStorage
        artifactsDrafts: captureArtifactsDrafts(),
        settings: {
          modoOscuro
        },
        // 🆕 Capturar estado de gamificación
        rewardsState: window.__rewardsEngine ? window.__rewardsEngine.exportState() : null
      };
      
      const success = updateCurrentSession(updates);
      
      if (success) {
        console.log('✅ [AppContext.updateCurrentSession] Sesión actualizada:', currentSessionId);
        // Emitir evento para actualizar UI
        window.dispatchEvent(new CustomEvent('session-updated'));
        return currentSessionId;
      } else {
        console.error('❌ [AppContext.updateCurrentSession] Error actualizando sesión');
        return null;
      }
    } catch (error) {
      console.error('❌ [AppContext.updateCurrentSession] Error:', error);
      return null;
    }
  }, [texto, archivoActual, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro, currentUser, userData]);

  const restoreSession = useCallback(async (session) => {
    try {
      // 🔒 Deshabilitar auto-guardado temporalmente durante restauración
      const currentId = getCurrentSessionId();
      if (currentId) {
        console.log('🔒 [AppContext] Deshabilitando auto-guardado durante restauración');
        localStorage.setItem('__restoring_session__', Date.now().toString());
      }
      
      const setters = {
        setTexto: setTextoWithDebug,
        setCompleteAnalysis,
        setRubricProgress: (data) => setRubricProgress(data),
        setSavedCitations: (data) => setSavedCitations(data),
        setActivitiesProgress: (data) => setActivitiesProgress(data)
      };
      
      const success = restoreSessionToState(session, setters);
      
      if (success) {
        // Restaurar archivo actual si está disponible
        if (session.text?.fileName && session.text?.fileType) {
          // Nota: No podemos recrear el archivo completo, pero guardamos la referencia
          setArchivoActualStable({
            name: session.text.fileName,
            type: session.text.fileType
          });
        }
        
        // 🆕 Restaurar estado de gamificación
        if (session.rewardsState && window.__rewardsEngine) {
          console.log('🎮 [AppContext] Restaurando puntos y gamificación...');
          window.__rewardsEngine.importState(session.rewardsState, false); // false = reemplazar completamente
        }
        
        console.log('✅ [AppContext] Sesión restaurada exitosamente');
        
        // Re-habilitar auto-guardado después de 3 segundos
        setTimeout(() => {
          localStorage.removeItem('__restoring_session__');
          console.log('🔓 [AppContext] Auto-guardado re-habilitado');
        }, 3000);
      } else {
        localStorage.removeItem('__restoring_session__');
      }
      
      return success;
    } catch (error) {
      console.error('❌ [AppContext] Error restaurando sesión:', error);
      localStorage.removeItem('__restoring_session__');
      return false;
    }
  }, [setTextoWithDebug, setCompleteAnalysis, setArchivoActualStable, setRubricProgress, setSavedCitations]);

  // 🧹 Cleanup de flag __restoring_session__ si quedó stuck (más de 30 segundos)
  useEffect(() => {
    const checkStuckFlag = () => {
      const flag = localStorage.getItem('__restoring_session__');
      if (flag) {
        const timestamp = parseInt(flag, 10);
        const now = Date.now();
        if (now - timestamp > 30000) { // 30 segundos
          console.warn('⚠️ [AppContext] Flag __restoring_session__ stuck, limpiando...');
          localStorage.removeItem('__restoring_session__');
        }
      }
    };
    
    // Verificar al montar y cada 10 segundos
    checkStuckFlag();
    const interval = setInterval(checkStuckFlag, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // 🆕 AUTO-CREAR sesión cuando se carga un texto nuevo
  // DESHABILITADO: Crear sesión manual al hacer clic "Analizar Contenido"
  /*
  useEffect(() => {
    const currentId = getCurrentSessionId();
    
    // Solo crear sesión si:
    // 1. Hay texto cargado
    // 2. NO hay una sesión actual activa
    if (texto && texto.length > 0 && !currentId) {
      console.log('🆕 [AppContext] Texto detectado sin sesión, creando automáticamente...');
      
      const timeoutId = setTimeout(() => {
        createSession().then(session => {
          if (session) {
            console.log('✅ [AppContext] Sesión auto-creada:', session.id);
            window.dispatchEvent(new CustomEvent('session-updated'));
          }
        }).catch(error => {
          console.error('❌ [AppContext] Error en auto-creación:', error);
        });
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [texto, createSession]);
  */

  // Guardar automáticamente cuando cambie el estado relevante
  useEffect(() => {
    // 🔒 No auto-guardar si estamos restaurando una sesión
    const flag = localStorage.getItem('__restoring_session__');
    if (flag) {
      const timestamp = parseInt(flag, 10);
      if (!isNaN(timestamp) && Date.now() - timestamp < 30000) {
        console.log('⏸️ [AppContext] Auto-guardado pausado (restauración en curso)');
        return;
      }
    }
    
    // Solo guardar si hay una sesión actual activa y hay texto cargado
    const currentId = getCurrentSessionId();
    if (currentId && texto) {
      console.log('🔄 [AppContext] Auto-guardado programado para sesión:', currentId);
      // Usar un debounce para no guardar en cada cambio
      const timeoutId = setTimeout(() => {
        console.log('💾 [AppContext] Ejecutando auto-guardado de sesión:', currentId);
        const sessionData = captureCurrentState({
          texto,
          archivoActual,
          completeAnalysis,
          rubricProgress,
          savedCitations,
          activitiesProgress,
          modoOscuro
        });
        
        // Actualizar sesión actual
        const updated = updateCurrentSession(sessionData);
        console.log('✅ [AppContext] Auto-guardado completado:', updated);
      }, 2000); // Guardar 2 segundos después del último cambio
      
      return () => clearTimeout(timeoutId);
    }
  }, [texto, archivoActual, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro]);

  // 🗑️ FUNCIÓN PARA ELIMINAR TODO EL HISTORIAL DE LA APLICACIÓN
  const clearAllHistory = useCallback(() => {
    console.log('🗑️ [clearAllHistory] Iniciando limpieza completa del historial...');
    
    try {
      // Lista de claves a preservar (configuraciones y preferencias)
      const keysToPreserve = [
        'modoOscuro',
        'openai_api_key',
        'tutorDockWidth',
        'tutorFollowUpsEnabled',
        'tutorCompactMode',
        'tutorLengthMode',
        'tutorTemperature'
      ];

      // Obtener todas las claves de localStorage
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
      }

      // Identificar claves a eliminar (patrones de historial)
      const patternsToRemove = [
        /^tutorHistorial/,           // Historial del tutor (tutorHistorial:hash)
        /^activity_results_/,       // Resultados de actividades
        /^analysis_cache_/,         // Caché de análisis
        /^visor_highlights_/,        // Resaltados del visor
        /^annotation_/,              // Anotaciones
        /^text_analysis_cache/,       // Caché de análisis de texto
      ];

      // Claves específicas a eliminar
      const specificKeysToRemove = [
        'notasLectura',
        'conversacionesGuardadas',
        'rubricProgress',
        'savedCitations',
        'tutorInteractionsLog',
        'ethicalReflections',
        'tutorConvos',
        'annotations_migrated_v1',
        'tutorHistorial', // Historial genérico
        'analysis_cache_stats',
        'analysis_cache_metrics'
      ];

      let removedCount = 0;

      // Eliminar claves que coinciden con patrones
      allKeys.forEach(key => {
        if (keysToPreserve.includes(key)) {
          return; // Preservar esta clave
        }

        // Verificar si coincide con algún patrón
        const matchesPattern = patternsToRemove.some(pattern => pattern.test(key));
        
        if (matchesPattern || specificKeysToRemove.includes(key)) {
          localStorage.removeItem(key);
          removedCount++;
          console.log(`  ✓ Eliminado: ${key}`);
        }
      });

      // Limpiar sessionStorage también
      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        sessionKeys.push(sessionStorage.key(i));
      }

      sessionKeys.forEach(key => {
        // Eliminar todas las claves de sessionStorage relacionadas con la app
        if (key.includes('resumenAcademico') || 
            key.includes('tablaACD') || 
            key.includes('mapaActores') || 
            key.includes('respuestaArgumentativa')) {
          sessionStorage.removeItem(key);
          removedCount++;
          console.log(`  ✓ Eliminado (session): ${key}`);
        }
      });

      // Resetear estados en el contexto
      setRubricProgress({
        rubrica1: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica2: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica3: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica4: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica5: { scores: [], average: 0, lastUpdate: null, artefactos: [] }
      });
      setSavedCitations({});
      setCompleteAnalysis(null);
      setTextStructure(null);

      console.log(`✅ [clearAllHistory] Limpieza completada. ${removedCount} elementos eliminados.`);
      
      // Emitir evento para que otros componentes se actualicen
      window.dispatchEvent(new CustomEvent('app-history-cleared'));
      
      return {
        success: true,
        removedCount,
        message: `Se eliminaron ${removedCount} elementos del historial`
      };
    } catch (error) {
      console.error('❌ [clearAllHistory] Error durante la limpieza:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al limpiar el historial'
      };
    }
  }, []);

  // NUEVO: Función para analizar documento con orquestador unificado
  const analyzeDocument = useCallback(async (text) => {
    console.log('🔵 [AppContext.analyzeDocument] LLAMADA RECIBIDA');
    console.log('🔍 [AppContext.analyzeDocument] Longitud texto:', text?.length || 0);
    
    if (!text || text.trim().length < 100) {
      console.warn('⚠️ [AppContext.analyzeDocument] Texto muy corto para análisis completo (mínimo 100 caracteres)');
      return;
    }

    console.log('📊 [AppContext.analyzeDocument] Iniciando análisis completo con backend RAG...');
    setLoading(true);
    setError('');
    
    try {
      console.log('🌐 [AppContext.analyzeDocument] Llamando al endpoint /api/analysis/prelecture...');
      
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      // Crear AbortController con timeout de 2 minutos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 segundos
      
      // Llamada al backend para análisis completo con RAG
      const response = await fetch(`${BACKEND_URL}/api/analysis/prelecture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          metadata: {} // Metadata adicional si es necesario
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      // PARSEAR LA RESPUESTA PRIMERO
      const fullAnalysis = await response.json();
      
      console.log('📥 [AppContext.analyzeDocument] Análisis recibido:', fullAnalysis);
      setCompleteAnalysis(fullAnalysis);
      console.log('✅ [AppContext.analyzeDocument] Análisis completo guardado en contexto');
      
      // 🆕 CREAR SESIÓN después del análisis exitoso
      console.log('💾 [AppContext.analyzeDocument] Creando sesión con análisis completo...');
      console.log('🔍 [AppContext.analyzeDocument] text param length:', text?.length || 0);
      console.log('🔍 [AppContext.analyzeDocument] texto state length:', texto?.length || 0);
      
      const currentId = getCurrentSessionId();
      // USAR EL PARÁMETRO 'text' EN LUGAR DEL ESTADO 'texto'
      if (!currentId && text && text.length > 0) {
        console.log('🆕 [AppContext.analyzeDocument] Creando nueva sesión con texto de parámetro...');
        try {
          // Crear sesión manualmente con el texto del parámetro
          const sessionData = {
            texto: text, // USAR PARÁMETRO
            archivoActual,
            completeAnalysis: fullAnalysis,
            rubricProgress,
            savedCitations,
            modoOscuro
          };
          
          const session = createSessionFromState(sessionData);
          if (session) {
            console.log('✅ [AppContext.analyzeDocument] Sesión creada:', session.id);
            window.dispatchEvent(new CustomEvent('session-updated'));
          }
        } catch (sessionError) {
          console.error('❌ [AppContext.analyzeDocument] Error creando sesión:', sessionError);
        }
      } else if (currentId) {
        console.log('ℹ️ [AppContext.analyzeDocument] Ya existe sesión activa:', currentId);
      } else {
        console.warn('⚠️ [AppContext.analyzeDocument] No hay texto para crear sesión (text length:', text?.length || 0, ')');
      }
      
    } catch (err) {
      console.error('❌ [AppContext.analyzeDocument] Error en análisis completo:', err);
      
      if (err.name === 'AbortError') {
        setError('El análisis tardó demasiado tiempo y fue cancelado');
        console.error('❌ [AppContext.analyzeDocument] Timeout después de 2 minutos');
      } else {
        console.error('❌ [AppContext.analyzeDocument] Stack:', err.stack);
        setError(`Error en análisis: ${err.message}`);
      }
      
      // Si hay un fallback en la respuesta de error, usarlo
      if (err.response?.data?.fallback) {
        setCompleteAnalysis(err.response.data.fallback);
      }
    } finally {
      setLoading(false);
      console.log('🏁 [AppContext.analyzeDocument] Proceso finalizado');
    }
  }, [texto, archivoActual, rubricProgress, savedCitations, modoOscuro, createSession]);

  // MEJORA: Añadir un efecto para actualizar la clase en el body y mejorar la consistencia del tema.
  useEffect(() => {
    const body = window.document.body;
    if (modoOscuro) {
      body.classList.add('modo-oscuro');
      body.setAttribute('data-theme', 'dark');
    } else {
      body.classList.remove('modo-oscuro');
      body.setAttribute('data-theme', 'light');
    }
  }, [modoOscuro]);

  // 🔥 SINCRONIZACIÓN FIREBASE: Cargar sesiones cuando el usuario hace login
  useEffect(() => {
    console.log('🔍 [AppContext] useEffect Firebase sync ejecutado, currentUser:', currentUser?.email || 'null', 'uid:', currentUser?.uid || 'null');
    
    if (currentUser?.uid) {
      console.log('🔄 [AppContext] Usuario autenticado detectado, sincronizando sesiones...');
      console.log('👤 [AppContext] UID:', currentUser.uid);
      console.log('👤 [AppContext] Email:', currentUser.email);
      console.log('👤 [AppContext] Nombre:', userData?.nombre || 'sin nombre');
      
      // Establecer usuario en sessionManager
      setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);
      
      // Sincronizar sesiones locales → Firebase
      syncAllSessionsToCloud()
        .then(result => {
          console.log(`✅ [AppContext] Sincronización completada: ${result.synced} sesiones subidas`);
          if (result.errors > 0) {
            console.warn(`⚠️ [AppContext] ${result.errors} errores en sincronización`);
          }
        })
        .catch(error => {
          console.error('❌ [AppContext] Error en sincronización inicial:', error);
        });

      // Nota: No necesitamos cargar sesiones aquí porque getAllSessionsMerged()
      // ya combina automáticamente localStorage + Firestore cuando se llama
      // desde el componente HistorialSesiones
      
    } else if (currentUser === null) {
      // Usuario deslogueado, limpiar referencia
      console.log('🔒 [AppContext] Usuario deslogueado, limpiando referencia');
      setSessionManagerUser(null, null);
    } else {
      console.log('⏳ [AppContext] currentUser es undefined, esperando...');
    }
  }, [currentUser, userData]);

  // 🔐 SESIÓN ÚNICA ACTIVA: Crear y monitorear sesión del usuario
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role) {
      console.log('🔐 [Session] Sin usuario autenticado, saltando sesión');
      return;
    }
    
    let unsubscribeSession = null;
    let stopHeartbeat = null;
    
    const initializeSession = async () => {
      try {
        console.log('🔐 [Session] ========================================');
        console.log('🔐 [Session] Creando sesión activa para usuario:', currentUser.uid);
        console.log('🔐 [Session] Email:', currentUser.email);
        console.log('🔐 [Session] Role:', userData.role);
        
        // Crear sesión activa (cierra automáticamente sesiones previas)
        const sessionId = await createActiveSession(currentUser.uid, {
          role: userData.role,
          email: currentUser.email,
          sessionInfo: getSessionInfo()
        });
        
        console.log('✅ [Session] Sesión creada con ID:', sessionId);
        console.log('🔐 [Session] ========================================');
        
        // Iniciar heartbeat para mantener sesión viva
        stopHeartbeat = startSessionHeartbeat(currentUser.uid);
        console.log('💓 [Session] Heartbeat iniciado (cada 30s)');
        
        // Escuchar conflictos de sesión (otra sesión toma control)
        unsubscribeSession = listenToSessionConflicts(currentUser.uid, (conflictData) => {
          console.error('⚠️⚠️⚠️ [Session] ========================================');
          console.error('⚠️ [Session] ¡CONFLICTO DETECTADO! Otra sesión activa:');
          console.error('⚠️ [Session] Session ID conflictiva:', conflictData.sessionId);
          console.error('⚠️ [Session] Browser:', conflictData.browser);
          console.error('⚠️ [Session] Creada:', conflictData.createdAt);
          console.error('⚠️⚠️⚠️ [Session] ========================================');
          
          // Diferir setState para evitar warning de React
          setTimeout(() => {
            setSessionConflict(true);
            setConflictingSessionInfo({
              browser: conflictData.browser,
              createdAt: conflictData.createdAt?.toDate?.() || new Date(conflictData.createdAt)
            });
          }, 0);
        });
        
        console.log('👂 [Session] Listener de conflictos activo');
        
      } catch (error) {
        console.error('❌ [Session] Error inicializando sesión:', error);
      }
    };
    
    initializeSession();
    
    // Cleanup al desmontar o cambiar usuario
    return () => {
      console.log('🔌 [Session] Limpiando sesión...');
      
      if (stopHeartbeat) {
        stopHeartbeat();
        console.log('💔 [Session] Heartbeat detenido');
      }
      
      if (unsubscribeSession) {
        unsubscribeSession();
        console.log('🔇 [Session] Listener de conflictos desconectado');
      }
      
      // Cerrar sesión activa al desmontar
      if (currentUser?.uid) {
        closeActiveSession(currentUser.uid)
          .then(() => console.log('✅ [Session] Sesión cerrada correctamente'))
          .catch(err => console.warn('⚠️ [Session] Error cerrando sesión:', err));
      }
    };
  }, [currentUser, userData]);

  // 🆕 LISTENER EN TIEMPO REAL: Sincronizar progreso desde Firestore
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role) return;
    
    // Solo para estudiantes (docentes no tienen progreso individual)
    if (userData.role !== 'estudiante') return;
    
    console.log('👂 [AppContext] Iniciando listener de progreso en tiempo real...');
    
    // Suscribirse a cambios en progreso global del estudiante
    const unsubscribe = subscribeToStudentProgress(
      currentUser.uid,
      'global_progress',
      async (progressData) => {
        if (!progressData) {
          console.log('ℹ️ [AppContext] No hay progreso remoto aún');
          return;
        }
        
        console.log('📥 [AppContext] Progreso recibido desde Firestore:', progressData);
        
        // 🔄 MERGE INTELIGENTE: Combinar datos remotos con locales
        // Prioridad: Lo más reciente gana (por timestamp)
        
        // Actualizar rubricProgress: PRIORIZAR SCORE MÁS ALTO + timestamp como desempate
        if (progressData.rubricProgress) {
          setRubricProgress(prevLocal => {
            const mergedRubrics = { ...prevLocal };
            let hasChanges = false;
            
            Object.keys(progressData.rubricProgress).forEach(rubricId => {
              const remoteRubric = progressData.rubricProgress[rubricId];
              const localRubric = prevLocal[rubricId];
              
              // Si no existe localmente, agregar directamente
              if (!localRubric || !localRubric.lastUpdate) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                console.log(`📊 [Sync] ${rubricId}: Datos remotos agregados (no existía local)`);
                return;
              }
              
              // ESTRATEGIA: Score más alto gana, timestamp como desempate
              const remoteScore = remoteRubric.totalScore || 0;
              const localScore = localRubric.totalScore || 0;
              const remoteTimestamp = remoteRubric.lastUpdate || 0;
              const localTimestamp = localRubric.lastUpdate || 0;
              
              if (remoteScore > localScore) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                console.log(`📊 [Sync] ${rubricId}: Remoto mejor (${remoteScore} > ${localScore})`);
              } else if (remoteScore === localScore && remoteTimestamp > localTimestamp) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                console.log(`📊 [Sync] ${rubricId}: Remoto más reciente (mismo score: ${remoteScore})`);
              } else {
                console.log(`📊 [Sync] ${rubricId}: Local mejor o igual (${localScore} >= ${remoteScore})`);
              }
            });
            
            if (hasChanges) {
              console.log('✅ [Sync] rubricProgress actualizado desde Firestore');
              // Emitir evento para que componentes UI se actualicen
              window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
                detail: { type: 'rubricProgress', timestamp: Date.now() }
              }));
              return mergedRubrics;
            }
            
            return prevLocal; // Sin cambios
          });
        }
        
        // Actualizar activitiesProgress: PRIORIZAR MÁS COMPLETA + timestamp
        if (progressData.activitiesProgress) {
          setActivitiesProgress(prevLocal => {
            const mergedActivities = { ...prevLocal };
            let hasChanges = false;
            
            Object.keys(progressData.activitiesProgress).forEach(docId => {
              const remoteDoc = progressData.activitiesProgress[docId];
              const localDoc = prevLocal[docId];
              
              // Si no existe localmente, agregar directamente
              if (!localDoc || !localDoc.preparation?.updatedAt) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                console.log(`🎯 [Sync] ${docId}: Actividad remota agregada (no existía local)`);
                return;
              }
              
              const remoteTimestamp = remoteDoc.preparation?.updatedAt || 0;
              const localTimestamp = localDoc.preparation?.updatedAt || 0;
              const remoteCompleteness = Object.keys(remoteDoc.preparation || {}).length;
              const localCompleteness = Object.keys(localDoc.preparation || {}).length;
              
              // ESTRATEGIA: Más completa gana, timestamp como desempate
              if (remoteCompleteness > localCompleteness) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                console.log(`🎯 [Sync] ${docId}: Remota más completa (${remoteCompleteness} campos > ${localCompleteness})`);
              } else if (remoteCompleteness === localCompleteness && remoteTimestamp > localTimestamp) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                console.log(`🎯 [Sync] ${docId}: Remota más reciente (${new Date(remoteTimestamp).toLocaleTimeString()})`);
              } else {
                console.log(`🎯 [Sync] ${docId}: Local más completa o igual, manteniendo`);
              }
            });
            
            if (hasChanges) {
              console.log('✅ [Sync] activitiesProgress actualizado desde Firestore');
              // Emitir evento para que componentes UI se actualicen
              window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
                detail: { type: 'activitiesProgress', timestamp: Date.now() }
              }));
              return mergedActivities;
            }
            
            return prevLocal; // Sin cambios
          });
        }
        
        // 🆕 MERGE INTELIGENTE rewardsState: priorizar puntuación más alta + timestamp
        if (progressData.rewardsState) {
          // Esperar a que rewardsEngine esté disponible
          if (!window.__rewardsEngine) {
            console.warn('⚠️ [Sync] rewardsEngine aún no inicializado, esperando...');
            // Reintentar después de 500ms
            setTimeout(() => {
              if (window.__rewardsEngine) {
                console.log('✅ [Sync] rewardsEngine ya disponible, importando estado remoto');
                window.__rewardsEngine.importState(progressData.rewardsState, false);
                
                window.dispatchEvent(new CustomEvent('rewards-state-changed', {
                  detail: { 
                    totalPoints: progressData.rewardsState.totalPoints,
                    availablePoints: progressData.rewardsState.availablePoints
                  }
                }));
              }
            }, 500);
            return;
          }
          
          try {
            const localRewardsState = window.__rewardsEngine.exportState();
            const remoteState = progressData.rewardsState;
            
            const remotePoints = remoteState.totalPoints || 0;
            const localPoints = localRewardsState.totalPoints || 0;
            const remoteTimestamp = remoteState.lastInteraction || 0;
            const localTimestamp = localRewardsState.lastInteraction || 0;
            
            // ESTRATEGIA: Puntuación más alta gana, timestamp como desempate
            if (remotePoints > localPoints) {
              console.log(`🎮 [Sync] Usando rewardsState remoto (${remotePoints} pts > ${localPoints} pts locales)`);
              window.__rewardsEngine.importState(remoteState, false);
              
              // Disparar evento para que UI se actualice INMEDIATAMENTE
              window.dispatchEvent(new CustomEvent('rewards-state-changed', {
                detail: { 
                  totalPoints: remoteState.totalPoints,
                  availablePoints: remoteState.availablePoints
                }
              }));
              
              window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
                detail: { type: 'rewardsState', timestamp: Date.now() }
              }));
            } else if (remotePoints === localPoints && remoteTimestamp > localTimestamp) {
              console.log(`🎮 [Sync] Usando rewardsState remoto (mismo pts, más reciente: ${new Date(remoteTimestamp).toLocaleString()})`);
              window.__rewardsEngine.importState(remoteState, false);
              
              // Disparar evento para que UI se actualice INMEDIATAMENTE
              window.dispatchEvent(new CustomEvent('rewards-state-changed', {
                detail: { 
                  totalPoints: remoteState.totalPoints,
                  availablePoints: remoteState.availablePoints
                }
              }));
              
              window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
                detail: { type: 'rewardsState', timestamp: Date.now() }
              }));
            } else if (localPoints > remotePoints) {
              console.log(`🎮 [Sync] Local tiene más puntos (${localPoints} > ${remotePoints}), subiendo a Firestore`);
              // Subir estado local a Firestore para sincronizar
              const currentRewardsState = window.__rewardsEngine.exportState();
              await saveStudentProgress(currentUser.uid, 'global_progress', {
                rewardsState: currentRewardsState,
                lastSync: new Date().toISOString(),
                syncType: 'local_higher_score'
              });
              console.log('📤 [Sync] Estado local con más puntos subido a Firestore');
            } else {
              console.log(`🎮 [Sync] Estados iguales (${localPoints} pts), manteniendo local`);
            }
          } catch (error) {
            console.error('❌ [Sync] Error en merge de rewardsState:', error);
          }
        }
      }
    );
    
    console.log('✅ [AppContext] Listener de tiempo real activo');
    
    // Cleanup al desmontar o cambiar usuario
    return () => {
      console.log('🔌 [AppContext] Desconectando listener de progreso');
      unsubscribe();
    };
  }, [currentUser, userData]);

  // 🆕 FASE 2: Auto-generación de notas cuando el análisis completo termina
  const [notasAutoGeneradas, setNotasAutoGeneradas] = useState(false);
  
  useEffect(() => {
    if (completeAnalysis && texto && !notasAutoGeneradas) {
      console.log('🎓 [AppContext] Análisis completo detectado, marcando para auto-generación de notas');
      // Marcamos que hay notas disponibles (el componente NotasEstudio las generará)
      setNotasAutoGeneradas(true);
      
      // Guardar flag en localStorage para notificación persistente
      const idTexto = texto.substring(0, 50).replace(/\s+/g, '_');
      localStorage.setItem(`notas_disponibles_${idTexto}`, 'true');
    }
  }, [completeAnalysis, texto, notasAutoGeneradas]);

  // Reset del flag cuando cambia el texto
  useEffect(() => {
    setNotasAutoGeneradas(false);
  }, [texto]);

  // 2. OPTIMIZADO: Crear el valor del contexto que se pasará a los consumidores
  // Separamos los valores estables de los que cambian frecuentemente
  const stableValues = useMemo(() => ({
    setTexto: setTextoWithDebug,
    setOpenAIApiKey: handleApiKeyChange,
    toggleModoOscuro,
    setLoading: setLoadingStable,
    setError: setErrorStable,
    setArchivoActual: setArchivoActualStable,
    setTextStructure: setTextStructureStable,
    // NUEVO: Funciones de análisis unificado
    analyzeDocument,
    setCompleteAnalysis,
    // 🆕 NUEVO: Funciones de progreso de rúbricas
    updateRubricScore,
    clearRubricProgress,
    resetAllProgress,
    // 🆕 NUEVO: Funciones de citas guardadas
    saveCitation,
    deleteCitation,
    getCitations,
    clearDocumentCitations,
    // 🆕 NUEVO: Funciones de progreso de actividades
    updateActivitiesProgress,
    markPreparationProgress,
    resetActivitiesProgress,
    // 🗑️ NUEVO: Función para limpiar todo el historial
    clearAllHistory,
    // 📚 NUEVO: Funciones de gestión de sesiones
    createSession,
    updateCurrentSessionFromState,
    restoreSession,
    // 🔥 NUEVO: Funciones de sincronización con Firestore
    saveCurrentTextToFirestore,
    syncRubricProgressToFirestore,
    saveEvaluationToFirestore,
    syncCitationsToFirestore
  }), [setTextoWithDebug, handleApiKeyChange, toggleModoOscuro, setLoadingStable, setErrorStable, setArchivoActualStable, setTextStructureStable, analyzeDocument, updateRubricScore, clearRubricProgress, resetAllProgress, saveCitation, deleteCitation, getCitations, clearDocumentCitations, updateActivitiesProgress, markPreparationProgress, resetActivitiesProgress, clearAllHistory, createSession, updateCurrentSessionFromState, restoreSession, saveCurrentTextToFirestore, syncRubricProgressToFirestore, saveEvaluationToFirestore, syncCitationsToFirestore]);

  const dynamicValues = useMemo(() => ({
    texto,
    openAIApiKey,
    modoOscuro,
    loading,
    error,
    archivoActual,
    textStructure,
    // NUEVO: Análisis completo
    completeAnalysis,
    // 🆕 NUEVO: Progreso de rúbricas
    rubricProgress,
    // 🆕 NUEVO: Citas guardadas
    savedCitations,
    // 🆕 FASE 2: Flag de notas auto-generadas
    notasAutoGeneradas,
    // 🔥 NUEVO: Usuario autenticado
    currentUser,
    userData,
    // 🆕 NUEVO: Progreso de actividades
    activitiesProgress,
    // 🔐 NUEVO: Estado de sesión única
    sessionConflict,
    conflictingSessionInfo
  }), [texto, openAIApiKey, modoOscuro, loading, error, archivoActual, textStructure, completeAnalysis, rubricProgress, savedCitations, notasAutoGeneradas, currentUser, userData, activitiesProgress, sessionConflict, conflictingSessionInfo]);

  const contextValue = useMemo(() => ({
    ...dynamicValues,
    ...stableValues
  }), [dynamicValues, stableValues]);

  // 3. Renderizar el Provider con el valor y los componentes hijos
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
