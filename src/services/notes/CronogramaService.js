/**
 * @file Servicio para gestión de cronogramas de repaso espaciado
 * @module CronogramaService
 * @version 1.0.0
 * @description Servicio para crear y gestionar cronogramas basados en la curva del olvido
 */

/**
 * Servicio de Cronograma de Repaso Espaciado
 * Implementa algoritmos basados en la curva del olvido de Ebbinghaus
 */
class CronogramaService {
  constructor() {
    // Intervalos base para el repaso espaciado (en días)
    this.intervalosBase = [0, 1, 3, 6, 13, 29, 60];
    
    // Configuración por defecto
    this.configuracionDefecto = {
      duracionMinima: 7,
      duracionMaxima: 90,
      intervalosPersonalizados: null
    };
  }

  /**
   * Genera un cronograma de repaso basado en la curva del olvido
   * @param {number} duracionDias - Duración total del plan de estudio en días
   * @param {Date} fechaInicio - Fecha de inicio (opcional, por defecto hoy)
   * @returns {Array<Object>} Array de objetos con información de cada repaso
   */
  generarCronograma(duracionDias = 30, fechaInicio = null) {
    // Validar parámetros
    if (duracionDias < this.configuracionDefecto.duracionMinima) {
      throw new Error(`La duración mínima es ${this.configuracionDefecto.duracionMinima} días`);
    }
    
    if (duracionDias > this.configuracionDefecto.duracionMaxima) {
      throw new Error(`La duración máxima es ${this.configuracionDefecto.duracionMaxima} días`);
    }

    const fechaBase = fechaInicio ? new Date(fechaInicio) : new Date();
    const cronograma = [];

    // Filtrar intervalos que caben dentro de la duración especificada
    const intervalosValidos = this.intervalosBase.filter(dias => dias < duracionDias);
    
    // Generar cada punto de repaso
    intervalosValidos.forEach((dias, index) => {
      const fechaRepaso = new Date(fechaBase);
      fechaRepaso.setDate(fechaBase.getDate() + dias);

      const repaso = {
        numero: index + 1,
        dias: dias,
        fecha: fechaRepaso,
        fechaISO: fechaRepaso.toISOString(),
        completado: false,
        descripcion: this.generarDescripcionRepaso(index + 1, dias),
        importancia: this.calcularImportancia(index + 1, intervalosValidos.length),
        efectividad: this.calcularEfectividad(dias),
        tipo: this.determinarTipoRepaso(index + 1)
      };

      cronograma.push(repaso);
    });

    // Agregar metadatos al cronograma
    const cronogramaCompleto = {
      cronograma,
      metadatos: {
        duracionTotal: duracionDias,
        fechaInicio: fechaBase.toISOString(),
        totalRepasos: cronograma.length,
        algoritmo: 'Curva del Olvido de Ebbinghaus',
        version: '1.0.0',
        creado: new Date().toISOString()
      }
    };

    console.log(`[CronogramaService] Cronograma generado: ${cronograma.length} repasos en ${duracionDias} días`);
    return cronogramaCompleto;
  }

  /**
   * Genera descripción personalizada para cada repaso
   * @param {number} numero - Número del repaso
   * @param {number} dias - Días desde el inicio
   * @returns {string} Descripción del repaso
   */
  generarDescripcionRepaso(numero, dias) {
    const descripciones = {
      1: 'Estudio inicial - Primera lectura completa',
      2: 'Primer repaso - Refuerzo inmediato',
      3: 'Segundo repaso - Consolidación temprana',
      4: 'Tercer repaso - Afianzamiento',
      5: 'Cuarto repaso - Retención intermedia',
      6: 'Quinto repaso - Consolidación avanzada',
      7: 'Repaso final - Retención a largo plazo'
    };

    return descripciones[numero] || `Repaso ${numero} - Día ${dias}`;
  }

  /**
   * Calcula la importancia relativa de cada repaso
   * @param {number} numero - Número del repaso
   * @param {number} total - Total de repasos
   * @returns {string} Nivel de importancia
   */
  calcularImportancia(numero, total) {
    if (numero === 1) return 'crítica';
    if (numero === 2) return 'muy alta';
    if (numero <= 3) return 'alta';
    if (numero <= total * 0.7) return 'media';
    return 'mantenimiento';
  }

  /**
   * Calcula la efectividad esperada del repaso
   * @param {number} dias - Días desde el inicio
   * @returns {number} Porcentaje de efectividad (0-100)
   */
  calcularEfectividad(dias) {
    // Basado en estudios de memoria espaciada
    if (dias === 0) return 100;
    if (dias === 1) return 95;
    if (dias <= 3) return 85;
    if (dias <= 7) return 75;
    if (dias <= 14) return 65;
    if (dias <= 30) return 55;
    return 45;
  }

  /**
   * Determina el tipo de repaso según su posición
   * @param {number} numero - Número del repaso
   * @returns {string} Tipo de repaso
   */
  determinarTipoRepaso(numero) {
    const tipos = {
      1: 'inicial',
      2: 'refuerzo',
      3: 'consolidacion',
      4: 'afianzamiento',
      5: 'intermedio',
      6: 'avanzado',
      7: 'final'
    };

    return tipos[numero] || 'mantenimiento';
  }

  /**
   * Verifica si un repaso debe realizarse hoy
   * @param {Object} repaso - Objeto de repaso
   * @param {Date} fechaReferencia - Fecha de referencia (opcional, por defecto hoy)
   * @returns {boolean} True si debe realizarse hoy
   */
  esRepasoDeHoy(repaso, fechaReferencia = null) {
    const hoy = fechaReferencia ? new Date(fechaReferencia) : new Date();
    const fechaRepaso = new Date(repaso.fecha);
    
    // Comparar solo las fechas, ignorando la hora
    return (
      hoy.getFullYear() === fechaRepaso.getFullYear() &&
      hoy.getMonth() === fechaRepaso.getMonth() &&
      hoy.getDate() === fechaRepaso.getDate()
    );
  }

  /**
   * Obtiene los repasos pendientes para hoy
   * @param {Array} cronograma - Array de repasos
   * @param {Date} fechaReferencia - Fecha de referencia (opcional)
   * @returns {Array} Repasos que deben realizarse hoy
   */
  getRepasosPendientesHoy(cronograma, fechaReferencia = null) {
    return cronograma.filter(repaso => 
      !repaso.completado && this.esRepasoDeHoy(repaso, fechaReferencia)
    );
  }

  /**
   * Obtiene los repasos vencidos (que debieron hacerse antes)
   * @param {Array} cronograma - Array de repasos
   * @param {Date} fechaReferencia - Fecha de referencia (opcional)
   * @returns {Array} Repasos vencidos
   */
  getRepasosVencidos(cronograma, fechaReferencia = null) {
    const hoy = fechaReferencia ? new Date(fechaReferencia) : new Date();
    
    return cronograma.filter(repaso => {
      const fechaRepaso = new Date(repaso.fecha);
      return !repaso.completado && fechaRepaso < hoy;
    });
  }

  /**
   * Calcula estadísticas del progreso del cronograma
   * @param {Array} cronograma - Array de repasos
   * @returns {Object} Estadísticas de progreso
   */
  calcularEstadisticasProgreso(cronograma) {
    const total = cronograma.length;
    const completados = cronograma.filter(r => r.completado).length;
    const pendientes = total - completados;
    const porcentajeCompletado = total > 0 ? (completados / total * 100) : 0;
    
    const hoy = new Date();
    const vencidos = this.getRepasosVencidos(cronograma, hoy);
    const paraHoy = this.getRepasosPendientesHoy(cronograma, hoy);
    
    return {
      total,
      completados,
      pendientes,
      porcentajeCompletado: Math.round(porcentajeCompletado * 10) / 10,
      vencidos: vencidos.length,
      paraHoy: paraHoy.length,
      proximoRepaso: this.getProximoRepaso(cronograma),
      estado: this.determinarEstadoGeneral(porcentajeCompletado, vencidos.length)
    };
  }

  /**
   * Obtiene el próximo repaso pendiente
   * @param {Array} cronograma - Array de repasos
   * @returns {Object|null} Próximo repaso o null si no hay ninguno
   */
  getProximoRepaso(cronograma) {
    const pendientes = cronograma
      .filter(r => !r.completado)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    return pendientes.length > 0 ? pendientes[0] : null;
  }

  /**
   * Determina el estado general del progreso
   * @param {number} porcentajeCompletado - Porcentaje completado
   * @param {number} vencidos - Número de repasos vencidos
   * @returns {string} Estado general
   */
  determinarEstadoGeneral(porcentajeCompletado, vencidos) {
    if (porcentajeCompletado === 100) return 'completado';
    if (vencidos > 2) return 'atrasado';
    if (vencidos > 0) return 'con-retrasos';
    if (porcentajeCompletado >= 75) return 'avanzado';
    if (porcentajeCompletado >= 50) return 'en-progreso';
    if (porcentajeCompletado >= 25) return 'iniciado';
    return 'no-iniciado';
  }

  /**
   * Marca un repaso como completado
   * @param {Array} cronograma - Array de repasos (se modifica in-place)
   * @param {number} indice - Índice del repaso a marcar
   * @param {Date} fechaCompletado - Fecha de completado (opcional)
   * @returns {Object} Repaso modificado
   */
  marcarRepasoCompletado(cronograma, indice, fechaCompletado = null) {
    if (indice < 0 || indice >= cronograma.length) {
      throw new Error('Índice de repaso inválido');
    }

    const repaso = cronograma[indice];
    repaso.completado = true;
    repaso.fechaCompletado = (fechaCompletado || new Date()).toISOString();
    
    console.log(`[CronogramaService] Repaso ${repaso.numero} marcado como completado`);
    return repaso;
  }

  /**
   * Resetea el estado de completado de todos los repasos
   * @param {Array} cronograma - Array de repasos (se modifica in-place)
   * @returns {Array} Cronograma reseteado
   */
  resetearCronograma(cronograma) {
    cronograma.forEach(repaso => {
      repaso.completado = false;
      delete repaso.fechaCompletado;
    });
    
    console.log('[CronogramaService] Cronograma reseteado');
    return cronograma;
  }

  /**
   * Exporta el cronograma a formato JSON
   * @param {Object} cronogramaCompleto - Cronograma con metadatos
   * @returns {string} JSON string del cronograma
   */
  exportarCronograma(cronogramaCompleto) {
    return JSON.stringify(cronogramaCompleto, null, 2);
  }

  /**
   * Importa un cronograma desde JSON
   * @param {string} jsonString - String JSON del cronograma
   * @returns {Object} Cronograma importado
   */
  importarCronograma(jsonString) {
    try {
      const cronograma = JSON.parse(jsonString);
      
      // Validar estructura básica
      if (!cronograma.cronograma || !Array.isArray(cronograma.cronograma)) {
        throw new Error('Formato de cronograma inválido');
      }
      
      // Convertir fechas string a objetos Date
      cronograma.cronograma.forEach(repaso => {
        if (repaso.fechaISO) {
          repaso.fecha = new Date(repaso.fechaISO);
        }
        if (repaso.fechaCompletado) {
          repaso.fechaCompletado = new Date(repaso.fechaCompletado);
        }
      });
      
      console.log('[CronogramaService] Cronograma importado exitosamente');
      return cronograma;
      
    } catch (error) {
      console.error('[CronogramaService] Error al importar cronograma:', error);
      throw new Error(`Error al importar cronograma: ${error.message}`);
    }
  }
}

// Instancia singleton del servicio
const cronogramaService = new CronogramaService();

export default cronogramaService;
