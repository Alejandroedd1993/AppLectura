/**
 * @file Hook personalizado para gestión de notas de estudio
 * @module useNotasEstudio
 * @version 1.0.0
 * @description Hook que encapsula toda la lógica de notas de estudio con aprendizaje espaciado
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchWithTimeout } from '../../utils/netUtils';
import { NotesServices } from '../../services/notes';
import logger from '../../utils/logger';

// ✅ URL del backend
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

/**
 * Hook personalizado para gestión completa de notas de estudio
 * @param {string} texto - Texto a analizar
 * @param {Object} completeAnalysis - Análisis académico completo del texto (opcional)
 * @returns {Object} Estado y funciones para gestión de notas
 */
const useNotasEstudio = (texto, completeAnalysis = null, textoId = null, courseId = null) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'guest';

  const getAuthHeader = useCallback(async () => {
    try {
      const idToken = await currentUser?.getIdToken?.();
      return idToken ? { Authorization: `Bearer ${idToken}` } : {};
    } catch (err) {
      logger.warn('[useNotasEstudio] No se pudo obtener Firebase ID token:', err?.message || err);
      return {};
    }
  }, [currentUser]);

  // Estados principales
  const [notas, setNotas] = useState(null);
  const [cronograma, setCronograma] = useState([]);
  const [notasRepasadas, setNotasRepasadas] = useState({});
  
  // Estados de configuración
  const [tipoTexto, setTipoTexto] = useState('auto');
  const [duracionEstudio, setDuracionEstudio] = useState(30);
  const [numeroTarjetas, setNumeroTarjetas] = useState(5);
  
  // 🆕 FASE 3: Nivel académico para personalización
  const [nivelAcademico, setNivelAcademico] = useState(() => {
    const scopedKey = `nivel_academico:${userId}`;

    const scoped = localStorage.getItem(scopedKey);
    if (scoped) return scoped;

    // Migración legacy (sin userId)
    const legacy = localStorage.getItem('nivel_academico');
    if (legacy) {
      try {
        localStorage.setItem(scopedKey, legacy);
        localStorage.removeItem('nivel_academico');
      } catch {}
      return legacy;
    }

    return 'pregrado';
  });
  
  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [origenNotas, setOrigenNotas] = useState('');
  
  // Estados internos
  const [inicializado, setInicializado] = useState(false);
  const abortRef = useRef(null);
  const isMountedRef = useRef(true);
  const prevDuracionRef = useRef(duracionEstudio);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort?.();
    };
  }, []);
  const [idTextoActual, setIdTextoActual] = useState('');

  // Rehidratar el nivel cuando cambia el usuario
  useEffect(() => {
    try {
      const scopedKey = `nivel_academico:${userId}`;
      const scoped = localStorage.getItem(scopedKey);
      if (scoped) {
        setNivelAcademico(scoped);
        return;
      }

      const legacy = localStorage.getItem('nivel_academico');
      if (legacy) {
        localStorage.setItem(scopedKey, legacy);
        localStorage.removeItem('nivel_academico');
        setNivelAcademico(legacy);
      }
    } catch {}
  }, [userId]);

  // 🆕 FASE 3: Guardar nivel académico en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`nivel_academico:${userId}`, nivelAcademico);
    } catch {}
  }, [nivelAcademico, userId]);

  /**
   * Genera ID único para el texto actual
   */
  const generarIdTexto = useCallback((textoParam) => {
    if (!textoParam) return '';
    // Fallback legacy (si no hay textoId)
    return NotesServices.Storage.generarIdTexto(textoParam);
  }, []);

  /**
   * Carga configuración inicial desde localStorage
   */
  const cargarConfiguracionInicial = useCallback(() => {
    try {
      const config = NotesServices.Storage.cargarConfiguracion(userId);
      
      if (config.tipoTexto) setTipoTexto(config.tipoTexto);
      if (config.duracionEstudio) setDuracionEstudio(config.duracionEstudio);
      if (config.numeroTarjetas) setNumeroTarjetas(config.numeroTarjetas);
      
      logger.log('[useNotasEstudio] Configuración inicial cargada');
    } catch (error) {
      logger.error('[useNotasEstudio] Error al cargar configuración inicial:', error);
    }
  }, [userId]);

  /**
   * Carga datos guardados para el texto actual
   */
  const cargarDatosGuardados = useCallback(async (textoParam) => {
    if (!textoParam) return;

    try {
      const progreso = NotesServices.Storage.cargarProgresoNotas(textoParam, textoId, userId, courseId);
      
      if (progreso) {
        logger.log('[useNotasEstudio] Datos guardados encontrados');
        
        if (progreso.notas) {
          setNotas(progreso.notas);
        }
        
        if (progreso.cronograma) {
          setCronograma(progreso.cronograma);
          
          // Cargar estado de repasos completados
          const repasosCompletados = {};
          progreso.cronograma.forEach((repaso, index) => {
            if (repaso.completado) {
              repasosCompletados[index] = true;
            }
          });
          setNotasRepasadas(repasosCompletados);
        }
        
        // Actualizar configuración si está guardada
        if (progreso.tipoTexto) setTipoTexto(progreso.tipoTexto);
        if (progreso.duracionEstudio) setDuracionEstudio(progreso.duracionEstudio);
        if (progreso.numeroTarjetas) setNumeroTarjetas(progreso.numeroTarjetas);
        if (progreso.origenNotas) setOrigenNotas(progreso.origenNotas);
      }
    } catch (error) {
      logger.error('[useNotasEstudio] Error al cargar datos guardados:', error);
    }
  }, [textoId, userId, courseId]);

  /**
   * Guarda el progreso actual en localStorage
   */
  const guardarProgreso = useCallback((notasParam, cronogramaParam) => {
    if (!texto) return;

    try {
      const progreso = {
        notas: notasParam || notas,
        cronograma: cronogramaParam || cronograma,
        tipoTexto,
        duracionEstudio,
        numeroTarjetas,
        notasRepasadas,
        origenNotas,
        ultimaActualizacion: Date.now()
      };

      const guardado = NotesServices.Storage.guardarProgresoNotas(texto, progreso, textoId, userId, courseId);
      
      if (guardado) {
        logger.log('[useNotasEstudio] Progreso guardado exitosamente');
      } else {
        logger.warn('[useNotasEstudio] No se pudo guardar el progreso');
      }
    } catch (error) {
      logger.error('[useNotasEstudio] Error al guardar progreso:', error);
    }
  }, [texto, notas, cronograma, tipoTexto, duracionEstudio, numeroTarjetas, notasRepasadas, origenNotas, textoId, userId]);

  const normalizarNumeroTarjetas = useCallback((valor) => {
    const num = Number(valor);
    if (!Number.isFinite(num)) return 5;
    return Math.min(10, Math.max(3, Math.round(num)));
  }, []);

  const ajustarTarjetas = useCallback((notasBase, textoParam, contextoEnriquecido, objetivo) => {
    if (!notasBase || typeof notasBase !== 'object') return notasBase;

    const tarjetasObjetivo = normalizarNumeroTarjetas(objetivo);
    const tarjetasActuales = Array.isArray(notasBase.tarjetas) ? [...notasBase.tarjetas] : [];

    if (tarjetasActuales.length > tarjetasObjetivo) {
      return { ...notasBase, tarjetas: tarjetasActuales.slice(0, tarjetasObjetivo) };
    }

    if (tarjetasActuales.length < tarjetasObjetivo) {
      const frases = (textoParam || '')
        .split(/[.!?]/)
        .filter(Boolean)
        .map(s => s.trim())
        .slice(0, 6);

      const conceptos = Array.isArray(contextoEnriquecido?.conceptos_clave)
        ? contextoEnriquecido.conceptos_clave
        : [];

      const extras = [
        ...conceptos.map(c => ({ frente: c, reverso: 'Concepto clave del texto' })),
        ...frases.map((f, i) => ({ frente: `Idea ${i + 1}`, reverso: f }))
      ];

      const existentes = new Set(tarjetasActuales.map(t => t?.frente).filter(Boolean));
      for (const extra of extras) {
        if (tarjetasActuales.length >= tarjetasObjetivo) break;
        if (!extra?.frente || existentes.has(extra.frente)) continue;
        tarjetasActuales.push(extra);
        existentes.add(extra.frente);
      }
    }

    return { ...notasBase, tarjetas: tarjetasActuales };
  }, [normalizarNumeroTarjetas]);

  /**
   * Genera cronograma de repaso
   */
  const generarCronograma = useCallback((duracionDias) => {
    try {
      const cronogramaData = NotesServices.Cronograma.generarCronograma(duracionDias);
      return cronogramaData.cronograma;
    } catch (error) {
      logger.error('[useNotasEstudio] Error al generar cronograma:', error);
      throw error;
    }
  }, []);

  /**
   * Extrae contexto enriquecido del análisis académico completo
   */
  const extraerContextoDelAnalisis = useCallback((analysis) => {
    if (!analysis) return null;

    const contexto = {
      // Metadata básica
      genero: analysis?.prelecture?.metadata?.genero_textual || analysis?.metadata?.genero_textual,
      proposito: analysis?.prelecture?.metadata?.proposito_comunicativo,
      audiencia: analysis?.prelecture?.metadata?.audiencia_objetivo,
      tipologia: analysis?.prelecture?.metadata?.tipologia_textual,
      
      // Argumentación (conceptos clave para notas)
      tesis_central: analysis?.prelecture?.argumentation?.tesis_central,
      argumentos_principales: analysis?.prelecture?.argumentation?.argumentos_principales?.map(arg => arg.argumento),
      tipo_argumentacion: analysis?.prelecture?.argumentation?.tipo_argumentacion,
      
      // Conceptos lingüísticos
      terminos_tecnicos: analysis?.prelecture?.linguistics?.lexico_especializado?.terminos_tecnicos,
      conceptos_clave: analysis?.critical?.temas_principales,
      
      // Resumen ya generado
      resumen_previo: analysis?.critical?.resumen,
      
      // Figuras retóricas (para textos literarios)
      figuras_retoricas: analysis?.prelecture?.linguistics?.figuras_retoricas?.map(fig => 
        typeof fig === 'string' ? fig : fig.tipo
      ),
      
      // Contexto crítico (si existe)
      marcos_ideologicos: analysis?.critical?.contexto_critico?.marcos_ideologicos,
      voces_representadas: analysis?.critical?.contexto_critico?.voces_representadas
    };

    // Filtrar valores null/undefined
    return Object.fromEntries(
      Object.entries(contexto).filter(([_, v]) => v != null && v !== undefined)
    );
  }, []);

  /**
   * Generación unificada: backend (Zod) -> OpenAI -> fallback local
   * MEJORADO: Ahora aprovecha completeAnalysis para generar notas contextualizadas
   */
  const generarNotasUnificado = useCallback(async (textoParam, tipoParam, analysis = null, signal = undefined) => {
    if (!textoParam) throw new Error('No hay texto para analizar');

    // Extraer contexto del análisis académico
    const contextoEnriquecido = extraerContextoDelAnalisis(analysis);

    logger.log('[useNotasEstudio] Generando notas con contexto enriquecido:', {
      genero: contextoEnriquecido?.genero,
      tiene_tesis: !!contextoEnriquecido?.tesis_central,
      tiene_conceptos: !!contextoEnriquecido?.conceptos_clave,
      tiene_resumen: !!contextoEnriquecido?.resumen_previo
    });

    // 1) Backend validado (con contexto enriquecido)
    try {
      const authHeader = await getAuthHeader();
      const payload = {
        texto: textoParam,
        api: 'openai',
        // ✅ Enviar contexto del análisis
        contexto: contextoEnriquecido,
        // 🆕 FASE 3: Enviar nivel académico para personalización
        nivelAcademico,
        tipoTexto: tipoParam,
        numeroTarjetas: normalizarNumeroTarjetas(numeroTarjetas)
      };

      const res = await fetchWithTimeout(`${BACKEND_URL}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload),
        signal
      }, 45000);
      
      if (res.ok) {
        const notasGeneradas = await res.json();
        logger.log('[useNotasEstudio] Notas generadas con contexto del backend');
        setOrigenNotas('backend');
        return ajustarTarjetas(notasGeneradas, textoParam, contextoEnriquecido, numeroTarjetas);
      } else {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
    } catch (errBackend) {
      logger.warn('[useNotasEstudio] Backend no disponible, evaluando fallback:', errBackend?.message);
    }

    // 2) Fallback local mejorado con contexto
    logger.log('[useNotasEstudio] Usando fallback local con contexto del análisis');
    
    const frases = textoParam.split(/[.!?]/).filter(Boolean).slice(0, 3).map(s => s.trim());
    
    const notasFallback = {
      resumen: contextoEnriquecido?.resumen_previo || (textoParam.slice(0, 400) + (textoParam.length > 400 ? '...' : '')),
      notas: [
        ...(contextoEnriquecido?.tesis_central ? [{
          titulo: 'Tesis Central',
          contenido: contextoEnriquecido.tesis_central
        }] : []),
        ...(contextoEnriquecido?.argumentos_principales?.slice(0, 3).map((arg, i) => ({
          titulo: `Argumento ${i + 1}`,
          contenido: arg
        })) || frases.map((f, i) => ({ titulo: `Nota ${i + 1}`, contenido: f })))
      ],
      preguntas: [
        '¿Cuál es la idea principal del texto?',
        ...(contextoEnriquecido?.tesis_central ? [`¿Cómo se relaciona la tesis "${contextoEnriquecido.tesis_central.slice(0, 50)}..." con los argumentos?`] : []),
        '¿Qué conceptos clave recuerdas?',
        '¿Cómo aplicarías este contenido?'
      ],
      tarjetas: [
        ...(contextoEnriquecido?.conceptos_clave?.slice(0, 3).map(concepto => ({
          frente: concepto,
          reverso: `Concepto clave identificado en el análisis del texto`
        })) || []),
        ...frases.slice(0, 2).map((f, i) => ({ frente: `Concepto ${i + 1}`, reverso: f }))
      ]
    };
    setOrigenNotas('fallback');
    return ajustarTarjetas(notasFallback, textoParam, contextoEnriquecido, numeroTarjetas);
  }, [ajustarTarjetas, extraerContextoDelAnalisis, getAuthHeader, nivelAcademico, normalizarNumeroTarjetas, numeroTarjetas]);

  /**
   * Inicializa o regenera las notas de estudio
   */
  const inicializarNotas = useCallback(async (forzarRegeneracion = false) => {
    if (!texto) return;

    // Si ya hay notas y no se fuerza regeneración, no hacer nada
    if (notas && !forzarRegeneracion) {
      return;
    }

    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isMountedRef.current) {
      setCargando(true);
      setError('');
    }

    try {
      // Generar notas (flujo unificado: backend -> OpenAI -> local) con contexto del análisis
      const notasGeneradas = await generarNotasUnificado(texto, tipoTexto, completeAnalysis, controller.signal);
      if (!isMountedRef.current || controller.signal.aborted) return;
      setNotas(notasGeneradas);

      // Generar o conservar cronograma
      const debeRegenerarCronograma = !cronograma.length || duracionEstudio !== prevDuracionRef.current;
      let cronogramaGenerado = cronograma;
      if (debeRegenerarCronograma) {
        cronogramaGenerado = generarCronograma(duracionEstudio);
        setCronograma(cronogramaGenerado);
        setNotasRepasadas({});
      }

      prevDuracionRef.current = duracionEstudio;

      // Guardar progreso
      guardarProgreso(notasGeneradas, cronogramaGenerado);

      logger.log('[useNotasEstudio] Notas inicializadas exitosamente');
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted) return;
      const errorMessage = `No se pudieron generar las notas de estudio: ${err.message}`;
      setError(errorMessage);
      logger.error('[useNotasEstudio] Error en inicialización:', err);
    } finally {
      if (isMountedRef.current && !controller.signal.aborted) {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setCargando(false);
      }
    }
  }, [texto, tipoTexto, duracionEstudio, notas, completeAnalysis, generarNotasUnificado, generarCronograma, guardarProgreso, cronograma]);

  /**
   * Regenera las notas con nueva configuración
   */
  const regenerarNotas = useCallback(async () => {
    logger.log('[useNotasEstudio] Regenerando notas...');
    await inicializarNotas(true);
  }, [inicializarNotas]);

  /**
   * Marca un repaso como completado
   */
  const marcarRepasoCompletado = useCallback((indice) => {
    try {
      // Actualizar cronograma
      let cronogramaActualizado = null;
      setCronograma(prevCronograma => {
        const nuevoCronograma = [...prevCronograma];
        if (nuevoCronograma[indice]) {
          nuevoCronograma[indice] = { ...nuevoCronograma[indice] };
        }
        NotesServices.Cronograma.marcarRepasoCompletado(nuevoCronograma, indice);
        cronogramaActualizado = nuevoCronograma;
        return nuevoCronograma;
      });

      // Actualizar estado de repasos
      setNotasRepasadas(prev => ({ ...prev, [indice]: true }));

      // Guardar progreso
      if (cronogramaActualizado) {
        guardarProgreso(notas, cronogramaActualizado);
      }

      // Actualizar estadísticas
      const stats = NotesServices.Storage.cargarEstadisticas(userId);
      NotesServices.Storage.guardarEstadisticas({
        ...stats,
        repasosCompletados: (stats.repasosCompletados || 0) + 1
      }, userId);

      logger.log(`[useNotasEstudio] Repaso ${indice + 1} marcado como completado`);
    } catch (error) {
      logger.error('[useNotasEstudio] Error al marcar repaso completado:', error);
      setError('No se pudo marcar el repaso como completado');
    }
  }, [notas, guardarProgreso, userId]);

  /**
   * Actualiza configuración y guarda en localStorage
   */
  const actualizarConfiguracion = useCallback((nuevaConfig) => {
    try {
      const config = {
        tipoTexto,
        duracionEstudio,
        numeroTarjetas,
        ...nuevaConfig
      };

      NotesServices.Storage.guardarConfiguracion(config, userId);
      logger.log('[useNotasEstudio] Configuración actualizada');
    } catch (error) {
      logger.error('[useNotasEstudio] Error al actualizar configuración:', error);
    }
  }, [tipoTexto, duracionEstudio, numeroTarjetas, userId]);

  /**
   * Estadísticas del progreso calculadas
   */
  const estadisticasProgreso = useMemo(() => {
    if (!cronograma.length) {
      return {
        total: 0,
        completados: 0,
        pendientes: 0,
        porcentajeCompletado: 0
      };
    }

    return NotesServices.Cronograma.calcularEstadisticasProgreso(cronograma);
  }, [cronograma]);

  // Efecto de inicialización
  useEffect(() => {
    if (!inicializado) {
      cargarConfiguracionInicial();
      setInicializado(true);
    }
  }, [inicializado, cargarConfiguracionInicial]);

  // Efecto para cuando cambia el texto
  useEffect(() => {
    if (!texto || !inicializado) return;

    // 🆕 FASE 5: preferir textoId estable (por lectura) y caer a legacy solo si falta
    const nuevoId = textoId || generarIdTexto(texto);
    
    // Solo procesar si es un texto diferente
    if (nuevoId !== idTextoActual) {
      setIdTextoActual(nuevoId);
      
      // Resetear estados
      setNotas(null);
      setCronograma([]);
      setNotasRepasadas({});
      setError('');

      // Cargar datos guardados
      cargarDatosGuardados(texto);
    }
  }, [texto, textoId, inicializado, idTextoActual, generarIdTexto, cargarDatosGuardados]);

  // 🔒 DESHABILITADO: No generar notas automáticamente
  // Las notas solo se generan cuando:
  // 1. El usuario hace clic en "Generar Notas" (regenerarNotas)
  // 2. Hay un análisis completo y se muestra el banner FASE 2
  // 
  // Efecto anterior comentado para evitar generación automática innecesaria
  /*
  useEffect(() => {
    if (texto && inicializado && !notas && !cargando && !error) {
      const timer = setTimeout(() => {
        if (!notas) {
          inicializarNotas();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [texto, inicializado, notas, cargando, error, inicializarNotas]);
  */

  // Efecto para guardar configuración cuando cambia
  useEffect(() => {
    if (inicializado) {
      actualizarConfiguracion({});
    }
  }, [tipoTexto, duracionEstudio, numeroTarjetas, inicializado, actualizarConfiguracion]);

  // Retornar el estado y funciones públicas
  return {
    // Estados principales
    notas,
    cronograma,
    notasRepasadas,
    
    // Estados de configuración
    tipoTexto,
    duracionEstudio,
    numeroTarjetas,
    nivelAcademico, // 🆕 FASE 3
    
    // Estados de UI
    cargando,
    error,
    
    // Estadísticas
    estadisticasProgreso,
    
    // Funciones de configuración
    setTipoTexto,
    setDuracionEstudio,
    setNumeroTarjetas,
    setNivelAcademico, // 🆕 FASE 3
    
    // Funciones principales
    regenerarNotas,
    marcarRepasoCompletado,
    
    // Funciones utilitarias
    limpiarError: () => setError(''),
    reinicializarNotas: () => inicializarNotas(true),
    
    // Estados computados
    tieneNotas: Boolean(notas),
    tieneCronograma: cronograma.length > 0,
    textoActivo: Boolean(texto),
    origenNotas
  };
};

export default useNotasEstudio;
