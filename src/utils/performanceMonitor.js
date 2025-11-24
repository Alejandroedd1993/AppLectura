/**
 * Sistema de monitoreo de performance optimizado para React
 * Mide tiempos de render, uso de memoria y métricas de usuario
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
    
    if (this.isEnabled) {
      this.initializeObservers();
    }
  }

  /**
   * Inicializar observadores de performance
   */
  initializeObservers() {
    // Observer para métricas de navegador
    if ('PerformanceObserver' in window) {
      try {
        // Métricas de navegación
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.set('navigation', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              networkTime: entry.responseEnd - entry.requestStart,
              timestamp: Date.now()
            });
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

        // Métricas de recursos
        const resourceObserver = new PerformanceObserver((list) => {
          const resources = list.getEntries().map(entry => ({
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize || 0,
            type: entry.initiatorType
          }));
          
          this.metrics.set('resources', resources);
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // Métricas de memoria (si está disponible)
        if ('memory' in performance) {
          setInterval(() => {
            this.metrics.set('memory', {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              limit: performance.memory.jsHeapSizeLimit,
              timestamp: Date.now()
            });
          }, 5000); // Cada 5 segundos
        }

      } catch (error) {
        console.warn('Error inicializando observadores de performance:', error);
      }
    }
  }

  /**
   * Marcar inicio de una operación
   */
  markStart(operationName) {
    if (!this.isEnabled) return;
    
    performance.mark(`${operationName}-start`);
    return operationName;
  }

  /**
   * Marcar fin de una operación y calcular duración
   */
  markEnd(operationName) {
    if (!this.isEnabled) return;

    performance.mark(`${operationName}-end`);
    
    try {
      performance.measure(
        operationName,
        `${operationName}-start`,
        `${operationName}-end`
      );

      const measure = performance.getEntriesByName(operationName, 'measure')[0];
      if (measure) {
        const existing = this.metrics.get(operationName) || [];
        existing.push({
          duration: measure.duration,
          timestamp: Date.now()
        });
        
        // Mantener solo las últimas 100 mediciones
        if (existing.length > 100) {
          existing.shift();
        }
        
        this.metrics.set(operationName, existing);
        
        // Limpiar marks para liberar memoria
        performance.clearMarks(`${operationName}-start`);
        performance.clearMarks(`${operationName}-end`);
        performance.clearMeasures(operationName);
      }
    } catch (error) {
      console.warn(`Error midiendo operación ${operationName}:`, error);
    }
  }

  /**
   * Medir tiempo de ejecución de una función
   */
  measure(operationName, fn) {
    if (!this.isEnabled) return fn();

    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    const existing = this.metrics.get(operationName) || [];
    existing.push({
      duration: endTime - startTime,
      timestamp: Date.now()
    });
    
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(operationName, existing);
    
    return result;
  }

  /**
   * Medir tiempo de ejecución de una función async
   */
  async measureAsync(operationName, fn) {
    if (!this.isEnabled) return await fn();

    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    const existing = this.metrics.get(operationName) || [];
    existing.push({
      duration: endTime - startTime,
      timestamp: Date.now()
    });
    
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(operationName, existing);
    
    return result;
  }

  /**
   * Obtener estadísticas de una operación
   */
  getStats(operationName) {
    if (!this.isEnabled) return null;

    const measurements = this.metrics.get(operationName);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const durations = measurements.map(m => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      recent: durations.slice(-10) // Últimas 10 mediciones
    };
  }

  /**
   * Obtener resumen completo de performance
   */
  getSummary() {
    if (!this.isEnabled) return { disabled: true };

    const summary = {
      timestamp: new Date().toISOString(),
      operations: {},
      memory: this.metrics.get('memory'),
      navigation: this.metrics.get('navigation'),
      resources: this.metrics.get('resources')?.slice(-20) || [] // Últimos 20 recursos
    };

    // Estadísticas por operación
    for (const [operationName] of this.metrics) {
      if (!['memory', 'navigation', 'resources'].includes(operationName)) {
        summary.operations[operationName] = this.getStats(operationName);
      }
    }

    return summary;
  }

  /**
   * Limpiar métricas antiguas
   */
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, value] of this.metrics) {
      if (Array.isArray(value)) {
        const filtered = value.filter(item => 
          item.timestamp && item.timestamp > oneHourAgo
        );
        
        if (filtered.length === 0) {
          this.metrics.delete(key);
        } else {
          this.metrics.set(key, filtered);
        }
      }
    }
  }

  /**
   * Exportar métricas para análisis
   */
  export() {
    if (!this.isEnabled) return null;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metrics: Object.fromEntries(this.metrics)
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Destructor - limpiar observadores
   */
  destroy() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Error desconectando observer:', error);
      }
    });
    
    this.observers = [];
    this.metrics.clear();
  }
}

// Instancia singleton
const performanceMonitor = new PerformanceMonitor();

// Limpiar métricas cada hora
if (performanceMonitor.isEnabled) {
  setInterval(() => {
    performanceMonitor.cleanup();
  }, 60 * 60 * 1000); // 1 hora
}

export default performanceMonitor;

// Importar React para el HOC
import React from 'react';

/**
 * Hook para usar el monitor de performance en componentes React
 */
export const usePerformanceMonitor = () => {
  return {
    markStart: performanceMonitor.markStart.bind(performanceMonitor),
    markEnd: performanceMonitor.markEnd.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
    getSummary: performanceMonitor.getSummary.bind(performanceMonitor)
  };
};

/**
 * HOC para medir performance de componentes
 */
export const withPerformanceTracking = (WrappedComponent, componentName) => {
  return React.forwardRef((props, ref) => {
    const { measure } = usePerformanceMonitor();
    
    return measure(`component-${componentName}`, () => 
      React.createElement(WrappedComponent, { ...props, ref })
    );
  });
};
