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

/**
 * Eventos que generan puntos (alineados con pedagogía)
 */
const REWARD_EVENTS = {
  // Lectura Guiada - Basado en niveles Bloom
  QUESTION_BLOOM_1: { points: 5, label: '📖 Pregunta Literal' },
  QUESTION_BLOOM_2: { points: 10, label: '💡 Pregunta Inferencial' },
  QUESTION_BLOOM_3: { points: 20, label: '🌍 Pregunta Aplicativa' },
  QUESTION_BLOOM_4: { points: 35, label: '🔍 Pregunta Analítica' },
  QUESTION_BLOOM_5: { points: 60, label: '⚖️ Pregunta Crítica (ACD)' },
  QUESTION_BLOOM_6: { points: 100, label: '✨ Pregunta Propositiva' },
  
  // Análisis Crítico del Discurso
  ACD_FRAME_IDENTIFIED: { points: 40, label: '🎭 Marco Ideológico Identificado' },
  ACD_STRATEGY_IDENTIFIED: { points: 25, label: '🗣️ Estrategia Retórica Identificada' },
  ACD_POWER_ANALYSIS: { points: 50, label: '⚡ Análisis de Relaciones de Poder' },
  
  // Evaluación (calidad de respuesta)
  EVALUATION_SUBMITTED: { points: 20, label: '📝 Evaluación Enviada' },
  EVALUATION_LEVEL_1: { points: 10, label: '🥉 Nivel 1 - Inicial' },
  EVALUATION_LEVEL_2: { points: 25, label: '🥈 Nivel 2 - Básico' },
  EVALUATION_LEVEL_3: { points: 50, label: '🥇 Nivel 3 - Competente' },
  EVALUATION_LEVEL_4: { points: 100, label: '💎 Nivel 4 - Avanzado' },
  QUOTE_USED: { points: 5, label: '📎 Cita Textual Usada' },
  
  // Evidencia textual (anclaje)
  STRONG_TEXTUAL_ANCHORING: { points: 30, label: '🔗 Anclaje Textual Sólido' },
  METACOGNITIVE_INTEGRATION: { points: 20, label: '🧠 Integración Fluida de Evidencia' },
  
  // Progresión
  DIMENSION_UNLOCKED: { points: 75, label: '🔓 Dimensión Desbloqueada' },
  DIMENSION_COMPLETED: { points: 150, label: '✅ Dimensión Completada' },
  
  // Anotaciones y estudio
  ANNOTATION_CREATED: { points: 8, label: '📝 Anotación Creada' },
  NOTE_CREATED: { points: 12, label: '💭 Nota de Estudio Creada' },
  
  // Uso de herramientas avanzadas
  WEB_SEARCH_USED: { points: 15, label: '🌐 Enriquecimiento Web' },
  CONTEXTUALIZATION_HISTORICAL: { points: 40, label: '🕰️ Contextualización Socio-Histórica' },
  SOCIAL_CONNECTIONS_MAPPED: { points: 30, label: '🔗 Conexiones Sociales Mapeadas' },
  CRITICAL_THESIS_DEVELOPED: { points: 35, label: '💭 Tesis Crítica Desarrollada' },
  COUNTERARGUMENT_ANTICIPATED: { points: 25, label: '⚔️ Contraargumento Anticipado' },
  REFUTATION_ELABORATED: { points: 25, label: '🛡️ Refutación Elaborada' },
  PERFECT_SCORE: { points: 200, label: '⭐ Puntuación Perfecta' },
  
  // Metacognición
  METACOGNITIVE_REFLECTION: { points: 35, label: '🤔 Reflexión Metacognitiva' },
  SELF_ASSESSMENT: { points: 20, label: '📊 Autoevaluación' },
  
  // Actividades
  ACTIVITY_COMPLETED: { points: 40, label: '🎯 Actividad Completada' },
  TABLA_ACD_COMPLETED: { points: 80, label: '📊 Tabla ACD Completada' }
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

/**
 * Achievements desbloqueables (hitos pedagógicos)
 */
const ACHIEVEMENTS = {
  FIRST_QUESTION: {
    id: 'first_question',
    name: '🌱 Primer Paso',
    description: 'Primera interacción con el tutor',
    points: 10,
    icon: '🌱'
  },
  CRITICAL_THINKER: {
    id: 'critical_thinker',
    name: '🧠 Pensador Crítico',
    description: 'Primera pregunta de nivel 5 (ACD)',
    points: 100,
    icon: '🧠'
  },
  ACD_MASTER: {
    id: 'acd_master',
    name: '🎭 Maestro del ACD',
    description: 'Identificó 3 marcos ideológicos diferentes',
    points: 150,
    icon: '🎭'
  },
  EVIDENCE_CHAMPION: {
    id: 'evidence_champion',
    name: '🔗 Campeón de Evidencia',
    description: 'Usó 10+ citas textuales en evaluaciones',
    points: 75,
    icon: '🔗'
  },
  TEN_EVALUATIONS: {
    id: 'ten_evals',
    name: '📚 Evaluador Dedicado',
    description: '10 evaluaciones completadas',
    points: 100,
    icon: '📚'
  },
  PERFECT_SCORE: {
    id: 'perfect',
    name: '⭐ Excelencia Crítica',
    description: 'Puntuación 10/10 en evaluación',
    points: 200,
    icon: '⭐'
  },
  ALL_DIMENSIONS: {
    id: 'all_dims',
    name: '🎓 Literato Crítico',
    description: 'Todas las 4 dimensiones completadas',
    points: 500,
    icon: '🎓'
  },
  WEEK_STREAK: {
    id: 'week_streak',
    name: '🔥 Racha Semanal',
    description: '7 días consecutivos de estudio',
    points: 100,
    icon: '🔥'
  },
  MONTH_STREAK: {
    id: 'month_streak',
    name: '💪 Dedicación Mensual',
    description: '30 días consecutivos de estudio',
    points: 500,
    icon: '💪'
  },
  METACOGNITIVE_MASTER: {
    id: 'metacog_master',
    name: '🪞 Maestro Metacognitivo',
    description: '5 reflexiones metacognitivas completadas',
    points: 150,
    icon: '🪞'
  }
};

/**
 * Clase principal del motor de recompensas
 */
class RewardsEngine {
  constructor(storageProvider = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storageProvider;
    this.state = this.loadState();
  }

  /**
   * Carga estado desde localStorage
   */
  loadState() {
    if (!this.storage) return this.initialState();
    
    try {
      const raw = this.storage.getItem('rewards_state');
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
      console.warn('Error loading rewards state:', err);
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
      history: [], // { event, points, timestamp, metadata }
      achievements: [], // IDs de achievements desbloqueados
      dailyLog: {}, // YYYY-MM-DD -> { interactions, points, bloomLevels }
      stats: {
        totalInteractions: 0,
        bloomLevelCounts: {}, // Cuenta por cada nivel
        acdFramesIdentified: 0,
        quotesUsed: 0,
        evaluationsSubmitted: 0,
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
      this.storage.setItem('rewards_state', JSON.stringify(this.state));
      
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
      console.warn('Error persisting rewards:', err);
    }
  }

  /**
   * Registra un evento y calcula puntos
   * @param {string} eventType - Tipo de evento (clave de REWARD_EVENTS)
   * @param {Object} metadata - Metadata adicional del evento
   * @returns {Object} { points, multiplier, totalEarned, message }
   */
  recordEvent(eventType, metadata = {}) {
    const config = REWARD_EVENTS[eventType];
    if (!config) {
      console.warn('Unknown reward event:', eventType);
      return { points: 0, multiplier: 1, totalEarned: 0, message: 'Evento desconocido' };
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

    // Actualizar stats
    this.updateStats(eventType, metadata);

    // Log diario
    this.updateDailyLog(earnedPoints, metadata);

    // Verificar achievements
    this.checkAchievements(eventType, metadata);

    // Persistir
    this.persist();

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
   */
  updateStreak() {
    const now = Date.now();
    const lastDate = this.state.lastInteraction
      ? new Date(this.state.lastInteraction).toISOString().split('T')[0]
      : null;
    const today = new Date(now).toISOString().split('T')[0];

    if (!lastDate) {
      // Primera interacción
      this.state.streak = 1;
    } else if (lastDate === today) {
      // Mismo día, no incrementar
      return;
    } else {
      const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
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
  }

  /**
   * Actualiza log diario
   */
  updateDailyLog(points, metadata) {
    const today = new Date().toISOString().split('T')[0];
    
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

    // ALL_DIMENSIONS
    if (metadata.allDimensionsComplete && !this.state.achievements.includes('all_dims')) {
      this.unlockAchievement('all_dims');
    }

    // METACOGNITIVE_MASTER
    const metacogCount = this.state.history.filter(h => h.event === 'METACOGNITIVE_REFLECTION').length;
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
      console.warn('⚠️ [RewardsEngine] Estado importado inválido');
      return;
    }

    if (merge) {
      // Merge inteligente: combinar puntos, mantener racha más alta, unir achievements
      this.state = {
        ...this.state,
        totalPoints: Math.max(this.state.totalPoints, externalState.totalPoints || 0),
        spentPoints: Math.max(this.state.spentPoints, externalState.spentPoints || 0),
        availablePoints: Math.max(this.state.availablePoints, externalState.availablePoints || 0),
        streak: Math.max(this.state.streak, externalState.streak || 0),
        lastInteraction: externalState.lastInteraction || this.state.lastInteraction,
        history: [...(this.state.history || []), ...(externalState.history || [])],
        achievements: [...new Set([...(this.state.achievements || []), ...(externalState.achievements || [])])],
        dailyLog: { ...(this.state.dailyLog || {}), ...(externalState.dailyLog || {}) },
        stats: {
          totalInteractions: Math.max(this.state.stats?.totalInteractions || 0, externalState.stats?.totalInteractions || 0),
          bloomLevelCounts: { ...(this.state.stats?.bloomLevelCounts || {}), ...(externalState.stats?.bloomLevelCounts || {}) },
          acdFramesIdentified: Math.max(this.state.stats?.acdFramesIdentified || 0, externalState.stats?.acdFramesIdentified || 0),
          quotesUsed: Math.max(this.state.stats?.quotesUsed || 0, externalState.stats?.quotesUsed || 0),
          evaluationsSubmitted: Math.max(this.state.stats?.evaluationsSubmitted || 0, externalState.stats?.evaluationsSubmitted || 0),
          avgBloomLevel: Math.max(this.state.stats?.avgBloomLevel || 0, externalState.stats?.avgBloomLevel || 0)
        }
      };
    } else {
      // Reemplazar completamente (usado al restaurar sesión)
      this.state = {
        ...this.initialState(),
        ...externalState,
        history: Array.isArray(externalState.history) ? externalState.history : [],
        achievements: Array.isArray(externalState.achievements) ? externalState.achievements : [],
        dailyLog: externalState.dailyLog || {}
      };
    }

    // Persistir nuevo estado
    this.persist();
    console.log('✅ [RewardsEngine] Estado importado exitosamente');
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
      h.metadata?.artefacto || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Agregar BOM UTF-8 para correcta visualización en Excel
    return '\uFEFF' + csv;
  }

  /**
   * Reset completo
   */
  reset() {
    this.state = this.initialState();
    this.persist();
  }
}

// Exportar
module.exports = {
  RewardsEngine,
  REWARD_EVENTS,
  ACHIEVEMENTS,
  STREAK_MULTIPLIERS
};

// Para uso en React (ESM)
if (typeof window !== 'undefined') {
  window.RewardsEngine = RewardsEngine;
}
