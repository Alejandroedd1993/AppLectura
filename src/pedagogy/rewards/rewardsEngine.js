/**
 * 🎮 Rewards Engine - Sistema de Gamificación Pedagógica
 * 
 * IMPORTANTE: Este sistema de puntos NO es trivial.
 * Los puntos reflejan PROGRESO COGNITIVO REAL (niveles Bloom, ACD).
 * 
 * Principios:
 * - Puntos exponenciales: Nivel 5 (ACD) vale 12x más que Nivel 1 (Recordar)
 * - Racha diaria incentiva hábito de estudio
 * - Achievements reflejan hitos pedagógicos reales
 * - Datos útiles para investigación (engagement + calidad)
 * 
 * @module rewardsEngine
 */

import { LEGACY_KEYS, rewardsStateKey } from '../../utils/storageKeys.js';

import logger from '../../utils/logger.js';
/**
 * Eventos que generan puntos (alineados con pedagogía)
 */
const REWARD_EVENTS = {
  // Lectura Guiada - Basado en niveles Bloom
  // 🆕 FIX Pass 11: Reducir puntos Bloom (eran farmeables sin resourceId)
  // Ahora se aplica cooldown por sesión para evitar abuso
  QUESTION_BLOOM_1: { points: 2, label: '📖 Pregunta Literal', dailyLimit: 20 },
  QUESTION_BLOOM_2: { points: 4, label: '💡 Pregunta Inferencial', dailyLimit: 15 },
  QUESTION_BLOOM_3: { points: 8, label: '🌍 Pregunta Aplicativa', dailyLimit: 10 },
  QUESTION_BLOOM_4: { points: 15, label: '🔍 Pregunta Analítica', dailyLimit: 8 },
  QUESTION_BLOOM_5: { points: 25, label: '⚖️ Pregunta Crítica (ACD)', dailyLimit: 5 },
  QUESTION_BLOOM_6: { points: 40, label: '✨ Pregunta Propositiva', dailyLimit: 3 },

  // Análisis Crítico del Discurso
  // 🆕 FIX Pass 11: Reducir puntos ACD (se duplicaban entre TablaACD y ACDAnalysisPanel)
  ACD_FRAME_IDENTIFIED: { points: 15, label: '🎭 Marco Ideológico Identificado', dedupe: true },
  ACD_STRATEGY_IDENTIFIED: { points: 10, label: '🗣️ Estrategia Retórica Identificada', dedupe: true },
  ACD_POWER_ANALYSIS: { points: 20, label: '⚡ Análisis de Relaciones de Poder', dedupe: true },

  // Evaluación (calidad de respuesta)
  // 🆕 FIX Pass 11: Ajustar puntos de evaluación (eran excesivos en conjunto)
  EVALUATION_SUBMITTED: { points: 10, label: '📝 Evaluación Enviada', dedupe: true },
  EVALUATION_LEVEL_1: { points: 5, label: '🥉 Nivel 1 - Inicial' },
  EVALUATION_LEVEL_2: { points: 15, label: '🥈 Nivel 2 - Básico' },
  EVALUATION_LEVEL_3: { points: 30, label: '🥇 Nivel 3 - Competente' },
  EVALUATION_LEVEL_4: { points: 50, label: '💎 Nivel 4 - Avanzado' },
  // Nota: dedupe explícito para evitar farming por re-evaluación.
  // Se activará solo si el caller provee metadata.resourceId.
  QUOTE_USED: { points: 5, label: '📎 Cita Textual Usada', dedupe: true },

  // Evidencia textual (anclaje)
  STRONG_TEXTUAL_ANCHORING: { points: 15, label: '🔗 Anclaje Textual Sólido', dedupe: true },
  METACOGNITIVE_INTEGRATION: { points: 10, label: '🧠 Integración Fluida de Evidencia', dedupe: true },

  // Progresión
  DIMENSION_UNLOCKED: { points: 40, label: '🔓 Dimensión Desbloqueada', dedupe: true },
  DIMENSION_COMPLETED: { points: 75, label: '✅ Dimensión Completada', dedupe: true },

  // Anotaciones y estudio
  // 🆕 FIX Pass 11: Reducir puntos y añadir límite diario para evitar farming
  ANNOTATION_CREATED: { points: 2, label: '📝 Anotación Creada', dailyLimit: 30 },
  NOTE_CREATED: { points: 5, label: '💭 Nota de Estudio Creada', dailyLimit: 15 },

  // Uso de herramientas avanzadas
  WEB_SEARCH_USED: { points: 5, label: '🌐 Enriquecimiento Web', dailyLimit: 10 },
  CONTEXTUALIZATION_HISTORICAL: { points: 20, label: '🕰️ Contextualización Socio-Histórica', dedupe: true },
  SOCIAL_CONNECTIONS_MAPPED: { points: 15, label: '🔗 Conexiones Sociales Mapeadas', dedupe: true },
  CRITICAL_THESIS_DEVELOPED: { points: 20, label: '💭 Tesis Crítica Desarrollada', dedupe: true },
  COUNTERARGUMENT_ANTICIPATED: { points: 15, label: '⚔️ Contraargumento Anticipado', dedupe: true },
  REFUTATION_ELABORATED: { points: 15, label: '🛡️ Refutación Elaborada', dedupe: true },
  PERFECT_SCORE: { points: 100, label: '⭐ Puntuación Perfecta', dedupe: true },

  // Metacognición
  METACOGNITIVE_REFLECTION: { points: 15, label: '🤔 Reflexión Metacognitiva', dedupe: true },
  SELF_ASSESSMENT: { points: 10, label: '📊 Autoevaluación', dailyLimit: 3 },

  // Actividades
  ACTIVITY_COMPLETED: { points: 25, label: '🎯 Actividad Completada', dedupe: true },
  TABLA_ACD_COMPLETED: { points: 40, label: '📊 Tabla ACD Completada', dedupe: true },

  // Entrega de artefactos
  ARTIFACT_SUBMITTED: { points: 20, label: '📦 Artefacto Entregado', dedupe: true },

  // 🆕 Evento sintético para recuperación de puntos legacy
  LEGACY_POINTS_RECOVERED: { points: 0, label: '📜 Puntos Recuperados (Historial Previo)', dedupe: false }
};

/**
 * Multiplicadores por racha (incentiva hábito)
 */
const STREAK_MULTIPLIERS = {
  3: 1.2,   // 3 días consecutivos: +20%
  7: 1.5,   // 1 semana: +50%
  14: 2.0,  // 2 semanas: +100%
  21: 2.5,  // 3 semanas: +150%
  30: 3.0   // 1 mes: +200%
};

const MAX_HISTORY = 300; // 🆕 Límite de historial para evitar degradación de rendimiento

/**
 * Achievements desbloqueables (hitos pedagógicos)
 * 🆕 FIX Pass 11: Reducir puntos de achievements a valores más razonables
 */
const ACHIEVEMENTS = {
  FIRST_QUESTION: {
    id: 'first_question',
    name: '🌱 Primer Paso',
    description: 'Primera interacción con el tutor',
    points: 5,
    icon: '🌱'
  },
  CRITICAL_THINKER: {
    id: 'critical_thinker',
    name: '🧠 Pensador Crítico',
    description: 'Primera pregunta de nivel 5 (ACD)',
    points: 50,
    icon: '🧠'
  },
  ACD_MASTER: {
    id: 'acd_master',
    name: '🎭 Maestro del ACD',
    description: 'Identificó 3 marcos ideológicos diferentes',
    points: 75,
    icon: '🎭'
  },
  EVIDENCE_CHAMPION: {
    id: 'evidence_champion',
    name: '🔗 Campeón de Evidencia',
    description: 'Usó 10+ citas textuales en evaluaciones',
    points: 40,
    icon: '🔗'
  },
  TEN_EVALUATIONS: {
    id: 'ten_evals',
    name: '📚 Evaluador Dedicado',
    description: '10 evaluaciones completadas',
    points: 50,
    icon: '📚'
  },
  PERFECT_SCORE: {
    id: 'perfect',
    name: '⭐ Excelencia Crítica',
    description: 'Puntuación 10/10 en evaluación',
    points: 100,
    icon: '⭐'
  },
  ALL_DIMENSIONS: {
    id: 'all_dims',
    name: '🎓 Literato Crítico',
    description: 'Todas las 4 dimensiones completadas',
    points: 200,
    icon: '🎓'
  },
  WEEK_STREAK: {
    id: 'week_streak',
    name: '🔥 Racha Semanal',
    description: '7 días consecutivos de estudio',
    points: 50,
    icon: '🔥'
  },
  MONTH_STREAK: {
    id: 'month_streak',
    name: '💪 Dedicación Mensual',
    description: '30 días consecutivos de estudio',
    points: 200,
    icon: '💪'
  },
  METACOGNITIVE_MASTER: {
    id: 'metacog_master',
    name: '🪞 Maestro Metacognitivo',
    description: '5 reflexiones metacognitivas completadas',
    points: 75,
    icon: '🪞'
  }
};

/**
 * Clase principal del motor de recompensas
 */
class RewardsEngine {
  constructor(storageProvider = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storageProvider;
    this.userId = null; // 🆕 Identificador de usuario activo
    // ⚠️ NO cargar localStorage automáticamente - esperar importState() de Firebase
    // Solo usar caché local si NO hay usuario autenticado (offline mode)
    this.state = this.initialState();

    // MODIFICACIÓN: Eliminada carga automática para evitar conflictos de prioridad.
    // Ahora AppContext debe llamar explícitamente a loadFromCache() si falla Firebase.
    /*
    if (typeof window !== 'undefined' && !window.__firebaseUserLoading) {
      const cached = this.loadState();
      if (cached && cached.totalPoints > 0) {
        logger.warn('⚠️ [RewardsEngine] Usando caché local temporal, Firebase tendrá prioridad...');
        this.state = cached;
      }
    }
    */
  }

  /**
   * Carga explícita desde caché local (fallback)
   */
  loadFromCache() {
    logger.log('📂 [RewardsEngine] Intentando cargar desde caché local...');
    const cached = this.loadState();
    if (cached && cached.totalPoints > 0) {
      logger.log('✅ [RewardsEngine] Caché local cargado:', cached.totalPoints, 'pts');
      this.state = cached;
      // Notificar cambio
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rewards-state-changed', {
          detail: {
            totalPoints: this.state.totalPoints,
            availablePoints: this.state.availablePoints,
            streak: this.state.streak
          }
        }));
      }
      return true;
    }
    return false;
  }

  /**
   * 🆕 Cambia el usuario activo y limpia/carga según corresponda
   */
  setUserId(uid) {
    if (this.userId === uid) return;
    logger.log(`👤 [RewardsEngine] Cambiando usuario a: ${uid || 'ninguno'}`);
    this.userId = uid;

    // Si no hay usuario, limpiar estado en MEMORIA pero NO hacer reset con nuevo resetAt
    // Esto evita que al volver a iniciar sesión se sobreescriban los puntos de Firestore
    if (!uid) {
      this.clearStateWithoutReset();
    }
  }

  /**
   * 🆕 Limpia el estado en memoria SIN crear un nuevo resetAt
   * Usado para logout - no queremos que parezca un "reset intencional"
   */
  clearStateWithoutReset() {
    logger.log('🧹 [RewardsEngine] Limpiando estado en memoria (logout)');
    this.state = this.initialState();
    // NO establecer resetAt - dejarlo en 0 para que al re-login Firestore tenga prioridad
    // NO persistir en localStorage - el próximo usuario tendrá su propio key
    // NO disparar evento - no queremos sincronizar esto a Firestore
  }

  /**
   * 🆕 Resetea el motor a su estado original (reset INTENCIONAL del usuario)
   * Solo llamar cuando el usuario EXPLÍCITAMENTE quiere reiniciar sus puntos
   */
  reset() {
    this.state = this.initialState();
    // 🆕 Marcar timestamp de reset para evitar que Firestore restaure datos antiguos
    this.state.resetAt = Date.now();
    this.state.lastInteraction = Date.now();
    this.state.lastUpdate = Date.now();
    
    // Persistir el reset en localStorage
    this.persist();
    
    // Notificar cambio para limpiar UI y sincronizar a Firestore
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rewards-state-changed', {
        detail: {
          totalPoints: 0,
          availablePoints: 0,
          streak: 0,
          forceSync: true, // 🆕 Forzar sincronización inmediata
          isReset: true
        }
      }));
    }
  }

  /**
   * Carga estado desde localStorage
   */
  loadState() {
    if (!this.storage) return this.initialState();

    try {
      const storageKey = rewardsStateKey(this.userId);

      // Migración controlada: si hay usuario y no existe clave scoped,
      // intentamos aprovechar el legacy `rewards_state` (si existe) una sola vez.
      if (this.userId) {
        const scopedRaw = this.storage.getItem(storageKey);
        if (!scopedRaw) {
          const legacyRaw = this.storage.getItem(LEGACY_KEYS.REWARDS_STATE);
          if (legacyRaw) {
            try {
              this.storage.setItem(storageKey, legacyRaw);
            } catch {
              // ignore
            }
          }
        }
      }

      const raw = this.storage.getItem(storageKey);
      if (!raw) return this.initialState();

      const parsed = JSON.parse(raw);
      // Validar estructura
      return {
        ...this.initialState(),
        ...parsed,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        dailyLog: parsed.dailyLog || {}
      };
    } catch (err) {
      logger.warn('Error loading rewards state:', err);
      return this.initialState();
    }
  }

  /**
   * Estado inicial
   */
  initialState() {
    return {
      totalPoints: 0,
      spentPoints: 0,
      availablePoints: 0,
      streak: 0,
      lastInteraction: null,
      resetAt: 0, // 🆕 Timestamp del último reset (para sincronización)
      history: [], // { event, points, timestamp, metadata }
      achievements: [], // IDs de achievements desbloqueados
      dailyLog: {}, // YYYY-MM-DD -> { interactions, points, bloomLevels }
      recordedMilestones: {}, // 🆕 Anti-farming: { [eventType_resourceId]: timestamp }
      stats: {
        totalInteractions: 0,
        bloomLevelCounts: {}, // Cuenta por cada nivel
        acdFramesIdentified: 0,
        quotesUsed: 0,
        evaluationsSubmitted: 0,
        metacognitiveReflections: 0, // 🆕 Contador para achievement O(1)
        annotationsCreated: 0,      // 🆕 Rastrear uso de resaltador
        notesCreated: 0,            // 🆕 Rastrear creación de notas
        webSearchesUsed: 0,         // 🆕 Rastrear investigación web
        avgBloomLevel: 0
      }
    };
  }

  /**
   * Persiste estado en localStorage
   */
  persist() {
    if (!this.storage) return;

    try {
      const storageKey = rewardsStateKey(this.userId);
      this.storage.setItem(storageKey, JSON.stringify(this.state));

      // 🆕 DISPARAR EVENTO para sincronización con Firestore
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rewards-state-changed', {
          detail: {
            totalPoints: this.state.totalPoints,
            availablePoints: this.state.availablePoints,
            streak: this.state.streak
          }
        }));
      }
    } catch (err) {
      logger.warn('Error persisting rewards:', err);
    }
  }

  /**
   * Registra un evento y calcula puntos
   * @param {string} eventType - Tipo de evento (clave de REWARD_EVENTS)
   * @param {Object} metadata - Metadata adicional del evento
   * @returns {Object} { points, multiplier, totalEarned, message }
   */
  recordEvent(eventType, metadata = {}) {
    logger.log(`🎮 [RewardsEngine] recordEvent llamado: ${eventType}`, metadata);
    
    const config = REWARD_EVENTS[eventType];
    if (!config) {
      logger.warn('Unknown reward event:', eventType);
      return { points: 0, multiplier: 1, totalEarned: 0, message: 'Evento desconocido' };
    }

    // 🆕 FIX Pass 11: Verificar límite diario si está configurado
    if (config.dailyLimit) {
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const dailyKey = `${eventType}_daily_${today}`;
      const currentCount = this.state.recordedMilestones?.[dailyKey] || 0;
      
      if (currentCount >= config.dailyLimit) {
        logger.log(`🛡️ [RewardsEngine] Límite diario alcanzado para ${eventType}: ${currentCount}/${config.dailyLimit}`);
        return { 
          points: 0, 
          multiplier: 1, 
          totalEarned: 0, 
          message: `Límite diario alcanzado (${config.dailyLimit}/${config.dailyLimit})`,
          dailyLimitReached: true
        };
      }
      
      // Incrementar contador diario
      if (!this.state.recordedMilestones) this.state.recordedMilestones = {};
      this.state.recordedMilestones[dailyKey] = currentCount + 1;
    }

    // 🆕 Anti-farming: Verificar si es un evento único ya reclamado
    // Aplica dedupe si: el caller provee resourceId Y (puntos > 10 O dedupe explícito)
    const resourceId = metadata?.resourceId;
    if (resourceId && (config.points > 10 || config.dedupe === true)) {
      const milestoneKey = `${eventType}_${resourceId}`;
      if (this.state.recordedMilestones?.[milestoneKey]) {
        logger.log(`🛡️ [RewardsEngine] Evento duplicado evitado para ${milestoneKey}`);
        return { points: 0, multiplier: 1, totalEarned: 0, message: 'Ya has ganado puntos por esto!' };
      }
      // Marcar como reclamado
      if (!this.state.recordedMilestones) this.state.recordedMilestones = {};
      this.state.recordedMilestones[milestoneKey] = Date.now();
    }

    // Actualizar racha
    this.updateStreak();

    // Calcular puntos base
    const basePoints = config.points;

    // Aplicar multiplicador de racha
    const multiplier = this.getStreakMultiplier();
    const earnedPoints = Math.round(basePoints * multiplier);

    // Actualizar totales
    this.state.totalPoints += earnedPoints;
    this.state.availablePoints = this.state.totalPoints - this.state.spentPoints;
    this.state.lastInteraction = Date.now();
    this.state.lastEventLabel = config.label; // 🆕 Para feedback en UI
    this.state.lastMultiplier = multiplier;  // 🆕 Para feedback en UI

    // Registrar en historial
    this.state.history.push({
      event: eventType,
      label: config.label,
      basePoints,
      multiplier,
      earnedPoints,
      timestamp: Date.now(),
      metadata
    });

    // 🆕 Pruning: Mantener historial bajo control
    if (this.state.history.length > MAX_HISTORY) {
      this.state.history = this.state.history.slice(-MAX_HISTORY);
    }

    // Actualizar stats
    this.updateStats(eventType, metadata);

    // Log diario
    this.updateDailyLog(earnedPoints, metadata);

    // Verificar achievements
    this.checkAchievements(eventType, metadata);

    // Persistir
    this.persist();

    logger.log(`✅ [RewardsEngine] Evento registrado: ${eventType}, +${earnedPoints} pts, total: ${this.state.totalPoints}`);

    return {
      points: basePoints,
      multiplier,
      totalEarned: earnedPoints,
      message: `${config.label} +${earnedPoints} pts`,
      streak: this.state.streak
    };
  }

  /**
   * Actualiza racha de días consecutivos
   * 🆕 FIX: Usa hora LOCAL en lugar de UTC para evitar el "bug de medianoche"
   */
  updateStreak() {
    const now = Date.now();

    // Helper para obtener fecha YYYY-MM-DD en hora local
    const getLocalDate = (ts) => new Date(ts).toLocaleDateString('en-CA'); // 'en-CA' = YYYY-MM-DD

    const lastDate = this.state.lastInteraction
      ? getLocalDate(this.state.lastInteraction)
      : null;
    const today = getLocalDate(now);

    if (!lastDate) {
      // Primera interacción
      this.state.streak = 1;
    } else if (lastDate === today) {
      // Mismo día, no incrementar
      return;
    } else {
      // 🆕 FIX: Calcular "ayer" usando setDate para manejar horario de verano
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getLocalDate(yesterdayDate);

      if (lastDate === yesterday) {
        // Día consecutivo
        this.state.streak += 1;

        // Check achievements de racha
        if (this.state.streak === 7 && !this.state.achievements.includes('week_streak')) {
          this.unlockAchievement('week_streak');
        } else if (this.state.streak === 30 && !this.state.achievements.includes('month_streak')) {
          this.unlockAchievement('month_streak');
        }
      } else {
        // Racha rota
        this.state.streak = 1;
      }
    }
  }

  /**
   * Obtiene multiplicador según racha
   */
  getStreakMultiplier() {
    const streak = this.state.streak;

    // Buscar el mayor multiplicador aplicable
    const applicableMultipliers = Object.keys(STREAK_MULTIPLIERS)
      .map(Number)
      .filter(days => streak >= days)
      .sort((a, b) => b - a);

    if (applicableMultipliers.length === 0) return 1;

    return STREAK_MULTIPLIERS[applicableMultipliers[0]];
  }

  /**
   * Actualiza estadísticas internas
   */
  updateStats(eventType, metadata) {
    this.state.stats.totalInteractions += 1;

    // Rastrear niveles Bloom
    if (eventType.startsWith('QUESTION_BLOOM_')) {
      const level = parseInt(eventType.replace('QUESTION_BLOOM_', ''));
      this.state.stats.bloomLevelCounts[level] = (this.state.stats.bloomLevelCounts[level] || 0) + 1;

      // Recalcular promedio
      const total = Object.values(this.state.stats.bloomLevelCounts).reduce((a, b) => a + b, 0);
      const weightedSum = Object.entries(this.state.stats.bloomLevelCounts)
        .reduce((sum, [level, count]) => sum + (parseInt(level) * count), 0);
      this.state.stats.avgBloomLevel = Math.round((weightedSum / total) * 10) / 10;
    }

    // Rastrear marcos ACD
    if (eventType === 'ACD_FRAME_IDENTIFIED') {
      this.state.stats.acdFramesIdentified += 1;
    }

    // Rastrear citas
    if (eventType === 'QUOTE_USED' && metadata.count) {
      this.state.stats.quotesUsed += metadata.count;
    }

    // Rastrear evaluaciones
    if (eventType === 'EVALUATION_SUBMITTED') {
      this.state.stats.evaluationsSubmitted += 1;
    }

    // Rastrear reflexiones metacognitivas
    if (eventType === 'METACOGNITIVE_REFLECTION') {
      this.state.stats.metacognitiveReflections += 1;
    }

    // 🆕 Rastrear nuevas métricas estructurales (Pass 9)
    if (eventType === 'ANNOTATION_CREATED') this.state.stats.annotationsCreated = (this.state.stats.annotationsCreated || 0) + 1;
    if (eventType === 'NOTE_CREATED') this.state.stats.notesCreated = (this.state.stats.notesCreated || 0) + 1;
    if (eventType === 'WEB_SEARCH_USED') this.state.stats.webSearchesUsed = (this.state.stats.webSearchesUsed || 0) + 1;
  }

  /**
   * Actualiza log diario
   */
  updateDailyLog(points, metadata) {
    const today = new Date().toLocaleDateString('en-CA'); // 🆕 FIX: Hora local

    if (!this.state.dailyLog[today]) {
      this.state.dailyLog[today] = {
        interactions: 0,
        points: 0,
        bloomLevels: []
      };
    }

    this.state.dailyLog[today].interactions += 1;
    this.state.dailyLog[today].points += points;

    if (metadata.bloomLevel) {
      this.state.dailyLog[today].bloomLevels.push(metadata.bloomLevel);
    }
  }

  /**
   * 🆕 Reconstruye estadísticas desde el historial (fuente de verdad)
   * Garantiza consistencia tras merge o migración
   */
  recalculateStatsFromHistory() {
    const history = this.state.history || [];
    const stats = {
      totalInteractions: 0,
      bloomLevelCounts: {},
      acdFramesIdentified: 0,
      quotesUsed: 0,
      evaluationsSubmitted: 0,
      metacognitiveReflections: 0,
      avgBloomLevel: 0,
      annotationsCreated: 0, // 🆕 Inicializar
      notesCreated: 0,       // 🆕 Inicializar
      webSearchesUsed: 0     // 🆕 Inicializar
    };

    history.forEach(h => {
      if (!h || !h.event) return;

      // 🆕 FIX Pass 6: Excluir logros y eventos sintéticos del conteo - son consecuencias, no interacciones
      if (h.event !== 'ACHIEVEMENT_UNLOCKED' && h.event !== 'LEGACY_POINTS_RECOVERED') {
        stats.totalInteractions += 1;
      }

      if (h.event.startsWith('QUESTION_BLOOM_')) {
        const level = parseInt(h.event.replace('QUESTION_BLOOM_', ''));
        if (!isNaN(level)) {
          stats.bloomLevelCounts[level] = (stats.bloomLevelCounts[level] || 0) + 1;
        }
      }
      if (h.event === 'ACD_FRAME_IDENTIFIED') stats.acdFramesIdentified += 1;
      if (h.event === 'EVALUATION_SUBMITTED') stats.evaluationsSubmitted += 1;
      if (h.event === 'METACOGNITIVE_REFLECTION') stats.metacognitiveReflections += 1;
      if (h.event === 'QUOTE_USED' && h.metadata?.count) {
        stats.quotesUsed += h.metadata.count;
      }

      // 🆕 Rastrear nuevas métricas en reconstrucción
      if (h.event === 'ANNOTATION_CREATED') stats.annotationsCreated = (stats.annotationsCreated || 0) + 1;
      if (h.event === 'NOTE_CREATED') stats.notesCreated = (stats.notesCreated || 0) + 1;
      if (h.event === 'WEB_SEARCH_USED') stats.webSearchesUsed = (stats.webSearchesUsed || 0) + 1;
      // The line below is redundant as it's already handled above.
      // if (h.event === 'METACOGNITIVE_REFLECTION') stats.metacognitiveReflections = (stats.metacognitiveReflections || 0) + 1;

      // 🆕 FIX Pass 7: Reconstruir recordedMilestones para consistencia
      const resourceId = h.metadata?.resourceId || h.metadata?.textoId || h.metadata?.artefacto;
      if (resourceId) {
        if (!this.state.recordedMilestones) this.state.recordedMilestones = {};
        this.state.recordedMilestones[`${h.event}_${resourceId}`] = h.timestamp;
      }
    });

    // Recalcular promedio Bloom
    const totalBloom = Object.values(stats.bloomLevelCounts).reduce((a, b) => a + b, 0);
    if (totalBloom > 0) {
      const weightedSum = Object.entries(stats.bloomLevelCounts)
        .reduce((sum, [level, count]) => sum + (parseInt(level) * count), 0);
      stats.avgBloomLevel = Math.round((weightedSum / totalBloom) * 10) / 10;
    }

    this.state.stats = stats;
    logger.log('📊 [RewardsEngine] Stats recalculados desde historial');
  }

  /**
   * Verifica y desbloquea achievements
   */
  checkAchievements(eventType, metadata) {
    // FIRST_QUESTION
    if (this.state.stats.totalInteractions === 1 && !this.state.achievements.includes('first_question')) {
      this.unlockAchievement('first_question');
    }

    // CRITICAL_THINKER (primera pregunta nivel 5)
    if (eventType === 'QUESTION_BLOOM_5' && !this.state.achievements.includes('critical_thinker')) {
      const bloom5Count = this.state.stats.bloomLevelCounts[5] || 0;
      if (bloom5Count === 1) {
        this.unlockAchievement('critical_thinker');
      }
    }

    // ACD_MASTER (3 marcos identificados)
    if (this.state.stats.acdFramesIdentified >= 3 && !this.state.achievements.includes('acd_master')) {
      this.unlockAchievement('acd_master');
    }

    // EVIDENCE_CHAMPION (10+ citas)
    if (this.state.stats.quotesUsed >= 10 && !this.state.achievements.includes('evidence_champion')) {
      this.unlockAchievement('evidence_champion');
    }

    // TEN_EVALUATIONS
    if (this.state.stats.evaluationsSubmitted >= 10 && !this.state.achievements.includes('ten_evals')) {
      this.unlockAchievement('ten_evals');
    }

    // PERFECT_SCORE
    if (metadata.score === 10 && !this.state.achievements.includes('perfect')) {
      this.unlockAchievement('perfect');
    }

    // ALL_DIMENSIONS (🆕 FIX Pass 7: Detección automática de 4 artefactos únicos)
    if (!this.state.achievements.includes('all_dims')) {
      const uniqueArtifacts = new Set(
        this.state.history
          .filter(h => h.event === 'ARTIFACT_SUBMITTED')
          .map(h => h.metadata?.artefacto)
          .filter(Boolean)
      );
      if (uniqueArtifacts.size >= 4) {
        this.unlockAchievement('all_dims');
      }
    }

    // METACOGNITIVE_MASTER - 🆕 FIX: Usar contador O(1) en lugar de O(N) filter
    const metacogCount = this.state.stats.metacognitiveReflections || 0;
    if (metacogCount >= 5 && !this.state.achievements.includes('metacog_master')) {
      this.unlockAchievement('metacog_master');
    }
  }

  /**
   * Desbloquea un achievement
   */
  unlockAchievement(achievementId) {
    const achievement = ACHIEVEMENTS[achievementId.toUpperCase()];
    if (!achievement) return;

    if (this.state.achievements.includes(achievementId)) {
      return; // Ya desbloqueado
    }

    this.state.achievements.push(achievementId);
    this.state.totalPoints += achievement.points;
    this.state.availablePoints = this.state.totalPoints - this.state.spentPoints;

    // Registrar en historial
    this.state.history.push({
      event: 'ACHIEVEMENT_UNLOCKED',
      label: `🏆 ${achievement.name}`,
      basePoints: achievement.points,
      multiplier: 1,
      earnedPoints: achievement.points,
      timestamp: Date.now(),
      metadata: { achievementId, description: achievement.description }
    });

    this.persist();

    return achievement;
  }

  /**
   * Canjea puntos con docente
   */
  redeemPoints(amount, reason = 'Canje con docente') {
    if (amount > this.state.availablePoints) {
      throw new Error(`Puntos insuficientes. Disponibles: ${this.state.availablePoints}, solicitados: ${amount}`);
    }

    this.state.spentPoints += amount;
    this.state.availablePoints = this.state.totalPoints - this.state.spentPoints;

    this.state.history.push({
      event: 'POINTS_REDEEMED',
      label: reason,
      basePoints: -amount,
      multiplier: 1,
      earnedPoints: -amount,
      timestamp: Date.now(),
      metadata: { reason }
    });

    this.persist();

    return this.state.availablePoints;
  }

  /**
   * Obtiene estado actual
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 🆕 Exporta estado completo para sincronización (sin métodos)
   * @returns {object} Estado serializable
   */
  exportState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 🆕 Importa estado desde otra fuente (sesiones, Firestore)
   * @param {object} externalState - Estado importado
   * @param {boolean} merge - Si debe hacer merge con estado actual (default: false)
   */
  importState(externalState, merge = false) {
    if (!externalState || typeof externalState !== 'object') {
      logger.warn('⚠️ [RewardsEngine] Estado importado inválido');
      return;
    }

    // 🆕 FIX Pass 10: Detectar estado corrupto (tiene puntos pero no historial)
    const externalHistory = Array.isArray(externalState.history) ? externalState.history : [];
    const externalPoints = externalState.totalPoints || 0;
    const localHistory = this.state.history || [];
    const localPoints = this.state.totalPoints || 0;

    // 🆕 FIX: Detectar reset intencional comparando resetAt
    const externalResetAt = externalState.resetAt || 0;
    const localResetAt = this.state.resetAt || 0;
    const isExternalResetNewer = externalResetAt > localResetAt;

    // 🛡️ FIX Pass 12: Si externo está vacío pero local tiene datos, NO sobrescribir
    // ⚠️ EXCEPCIÓN: Si el externo tiene un resetAt más reciente, es un reset intencional y SÍ debe sobrescribir
    if (externalPoints === 0 && externalHistory.length === 0 && (localPoints > 0 || localHistory.length > 0)) {
      if (!isExternalResetNewer) {
        logger.warn('⚠️ [RewardsEngine] Estado externo vacío sin reset reciente, preservando datos locales:', { localPoints, localHistory: localHistory.length });
        return; // No hacer nada, mantener estado local
      } else {
        logger.log('🗑️ [RewardsEngine] Reset intencional detectado (resetAt externo más reciente), aplicando estado vacío');
        // Continuar con el import del estado vacío
      }
    }

    // 🛡️ Protección: Si externo tiene puntos pero historial vacío, y local tiene historial,
    // preferir el historial local para no perder datos
    const externalIsCorrupt = externalPoints > 0 && externalHistory.length === 0;
    const localHasHistory = localHistory.length > 0;

    if (externalIsCorrupt && localHasHistory && !merge) {
      logger.warn('⚠️ [RewardsEngine] Estado externo corrupto (puntos sin historial). Haciendo merge con historial local...');
      // Forzar merge para preservar historial local
      merge = true;
    }

    if (merge) {
      // Merge inteligente: combinar puntos, mantener racha más alta, unir achievements

      // 🆕 FIX: Deduplicar historial basándose en timestamp
      const existingTimestamps = new Set((this.state.history || []).map(h => h.timestamp));
      const newHistoryEntries = (externalState.history || []).filter(h => !existingTimestamps.has(h.timestamp));
      const mergedHistory = [...(this.state.history || []), ...newHistoryEntries]
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      const mergedTotalPoints = Math.max(this.state.totalPoints, externalState.totalPoints || 0);
      const mergedSpentPoints = Math.max(this.state.spentPoints, externalState.spentPoints || 0);

      // 🆕 FIX Pass 10: Merge recordedMilestones para preservar protección anti-farming
      const mergedMilestones = {
        ...(this.state.recordedMilestones || {}),
        ...(externalState.recordedMilestones || {})
      };

      this.state = {
        ...this.state,
        totalPoints: mergedTotalPoints,
        spentPoints: mergedSpentPoints,
        // 🆕 FIX: Recalcular availablePoints en lugar de usar Math.max directo
        availablePoints: mergedTotalPoints - mergedSpentPoints,
        streak: Math.max(this.state.streak, externalState.streak || 0),
        lastInteraction: externalState.lastInteraction || this.state.lastInteraction,
        history: mergedHistory,
        achievements: [...new Set([...(this.state.achievements || []), ...(externalState.achievements || [])])],
        dailyLog: { ...(this.state.dailyLog || {}), ...(externalState.dailyLog || {}) },
        recordedMilestones: mergedMilestones
      };
    } else {
      // Reemplazar completamente (usado al restaurar sesión)
      this.state = {
        ...this.initialState(),
        ...externalState,
        history: externalHistory,
        achievements: Array.isArray(externalState.achievements) ? externalState.achievements : [],
        dailyLog: externalState.dailyLog || {},
        // 🆕 FIX Pass 10: Preservar recordedMilestones del estado externo o inicializar vacío
        recordedMilestones: externalState.recordedMilestones || {},
        // 🆕 FIX: Preservar resetAt explícitamente para detección de reset
        resetAt: externalState.resetAt || this.state.resetAt || 0
      };
    }

    // 🆕 FIX Pass 10: Si después de importar hay puntos pero no historial, crear entrada sintética
    if (this.state.totalPoints > 0 && (!this.state.history || this.state.history.length === 0)) {
      logger.log('🔧 [RewardsEngine] Creando entrada sintética para puntos sin historial...');
      this.state.history = [{
        event: 'LEGACY_POINTS_RECOVERED',
        label: '📜 Puntos Recuperados (Historial Previo)',
        basePoints: this.state.totalPoints,
        multiplier: 1,
        earnedPoints: this.state.totalPoints,
        timestamp: this.state.lastInteraction || Date.now(),
        metadata: { 
          synthetic: true, 
          reason: 'Migración de puntos sin historial',
          recoveredAt: Date.now()
        }
      }];
      // Establecer stats mínimos basados en puntos totales
      this.state.stats = {
        ...this.state.stats,
        totalInteractions: Math.ceil(this.state.totalPoints / 20), // Aproximación
      };
    }

    // 🆕 FIX Pass 5: Reconstruir stats SIEMPRE desde historial para garantizar integridad
    this.recalculateStatsFromHistory();

    // Persistir nuevo estado
    this.persist();
    logger.log('✅ [RewardsEngine] Estado importado exitosamente');
  }

  /**
   * Obtiene analytics para investigación
   */
  getAnalytics() {
    return {
      engagement: {
        totalInteractions: this.state.stats.totalInteractions,
        streak: this.state.streak,
        avgBloomLevel: this.state.stats.avgBloomLevel,
        dailyActivity: Object.entries(this.state.dailyLog).map(([date, data]) => ({
          date,
          interactions: data.interactions,
          points: data.points,
          avgBloomLevel: data.bloomLevels.length > 0
            ? data.bloomLevels.reduce((a, b) => a + b, 0) / data.bloomLevels.length
            : 0
        }))
      },
      quality: {
        bloomLevelDistribution: this.state.stats.bloomLevelCounts,
        acdFramesIdentified: this.state.stats.acdFramesIdentified,
        metacognitiveReflections: this.state.stats.metacognitiveReflections || 0,
        webSearchesUsed: this.state.stats.webSearchesUsed || 0,
        annotationsCreated: this.state.stats.annotationsCreated || 0,
        notesCreated: this.state.stats.notesCreated || 0,
        quotesPerEvaluation: this.state.stats.evaluationsSubmitted > 0
          ? Math.round((this.state.stats.quotesUsed / this.state.stats.evaluationsSubmitted) * 10) / 10
          : 0
      },
      gamification: {
        totalPoints: this.state.totalPoints,
        availablePoints: this.state.availablePoints,
        spentPoints: this.state.spentPoints,
        achievements: this.state.achievements.length,
        achievementsList: this.state.achievements.map(id => ACHIEVEMENTS[id.toUpperCase()]?.name)
      },
      history: this.state.history
    };
  }

  /**
   * Export CSV para investigación
   */
  exportCSV() {
    const headers = [
      'Fecha y Hora',
      'Tipo de Evento',
      'Descripción',
      'Puntos Base',
      'Multiplicador',
      'Puntos Ganados',
      'Nivel Bloom',
      'Metacognitivo',
      'Investigación Web',
      'Artefacto'
    ];

    const rows = this.state.history.map(h => [
      new Date(h.timestamp).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      h.event,
      h.label,
      h.basePoints,
      h.multiplier.toFixed(1),
      h.earnedPoints,
      h.metadata?.bloomLevel || '',
      h.event === 'METACOGNITIVE_REFLECTION' ? 'SÍ' : '',
      h.event === 'WEB_SEARCH_USED' ? 'SÍ' : '',
      h.metadata?.artefacto || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Agregar BOM UTF-8 para correcta visualización en Excel
    return '\uFEFF' + csv;
  }
}

// Exportar ES6 para React
export { RewardsEngine, REWARD_EVENTS, ACHIEVEMENTS, STREAK_MULTIPLIERS };

if (typeof window !== 'undefined') {
  window.RewardsEngine = RewardsEngine;
}
