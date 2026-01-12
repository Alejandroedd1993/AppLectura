import React, { createContext, useMemo, useState, useCallback, useContext } from 'react';
import { generateSocraticQuestions } from '../pedagogy/questions/socratic';

// Usa require para interoperar con módulos CommonJS en /src/pedagogy
const { RUBRIC } = require('../pedagogy/rubrics/criticalLiteracyRubric');
const { buildTutorPrompt, buildEvaluatorPrompt } = require('../pedagogy/prompts/templates');
import { scheduleNext } from '../pedagogy/spaced/scheduler';
import { createProgressionEngine } from '../pedagogy/progression/progressionEngine';

// ✨ NUEVO: Sistema de andamiaje pedagógico (ZDP + ACD)
import { ZDPDetector } from '../pedagogy/tutor/zdpDetector';
import { ACDAnalyzer } from '../pedagogy/discourse/acdAnalyzer';
import { RewardsEngine } from '../pedagogy/rewards/rewardsEngine';

export const PedagogyContext = createContext(null);

export function PedagogyProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('pedagogyConfig');
      return saved ? JSON.parse(saved) : { idioma: 'es', socraticMax: 5 };
    } catch {
      return { idioma: 'es', socraticMax: 5 };
    }
  });

  // 🆕 Crear instancia de RewardsEngine y exponerla globalmente
  const [rewardsEngine] = useState(() => {
    const engine = new RewardsEngine();
    // Exponer globalmente para acceso desde AppContext
    if (typeof window !== 'undefined') {
      window.__rewardsEngine = engine;
    }
    return engine;
  });

  const updateConfig = useCallback((patch) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem('pedagogyConfig', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const stable = useMemo(() => ({
    RUBRIC,
    buildTutorPrompt,
    buildEvaluatorPrompt,
    generateSocraticQuestions,
    scheduleNext,
    progression: createProgressionEngine(),
    // ✨ NUEVO: Instancias de los motores pedagógicos
    zdpDetector: new ZDPDetector(),
    acdAnalyzer: new ACDAnalyzer(),
    rewards: rewardsEngine, // 🆕 Usar instancia única (accesible globalmente)
    updateConfig,
    // Indicador explícito para consumidores que necesitan saber si los módulos pedagógicos están disponibles
    modulesLoaded: true
  }), [updateConfig, rewardsEngine]);

  const dynamic = useMemo(() => ({ config }), [config]);

  const value = useMemo(() => ({ ...stable, ...dynamic }), [stable, dynamic]);
  return <PedagogyContext.Provider value={value}>{children}</PedagogyContext.Provider>;
}

// Hook simplificado para acceder al contexto
export function usePedagogy() {
  const ctx = useContext(PedagogyContext);
  if (!ctx) throw new Error('usePedagogy debe usarse dentro de PedagogyProvider');
  return ctx;
}

// Variante tolerante (permite renderizar pantallas sin provider pedagógico)
export function usePedagogyMaybe() {
  return useContext(PedagogyContext);
}

// Hook específico para progresión
export function useProgression() {
  const { progression } = usePedagogy();
  return progression;
}

// ✨ NUEVO: Hook para ZDP Detector
export function useZDPDetector() {
  const { zdpDetector } = usePedagogy();
  return zdpDetector;
}

// ✨ NUEVO: Hook para ACD Analyzer
export function useACDAnalyzer() {
  const { acdAnalyzer } = usePedagogy();
  return acdAnalyzer;
}

// ✨ NUEVO: Hook para Rewards Engine
export function useRewards() {
  const ctx = usePedagogyMaybe();
  return ctx?.rewards || null;
}
