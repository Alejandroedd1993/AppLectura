/**
 * @file Hook personalizado para gestión de notas de estudio
 * @module useNotasEstudio
 * @version 1.0.0
 * @description Hook que encapsula toda la lógica de notas de estudio con aprendizaje espaciado
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithTimeout } from '../../utils/netUtils';
import { NotesServices } from '../../services/notes';

// ✅ URL del backend
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

/**
 * Hook personalizado para gestión completa de notas de estudio
 * @param {string} texto - Texto a analizar
 * @param {Object} completeAnalysis - Análisis académico completo del texto (opcional)
 * @returns {Object} Estado y funciones para gestión de notas
 */
const useNotasEstudio = (texto, completeAnalysis = null) => {
  // Estados principales
  const [notas, setNotas] = useState(null);
  const [cronograma, setCronograma] = useState([]);
  const [notasRepasadas, setNotasRepasadas] = useState({});
  
  // Estados de configuración
  const [tipoTexto, setTipoTexto] = useState('auto');
  const [duracionEstudio, setDuracionEstudio] = useState(30);
  
  // 🆕 FASE 3: Nivel académico para personalización
  const [nivelAcademico, setNivelAcademico] = useState(() => {
    return localStorage.getItem('nivel_academico') || 'pregrado';
  });
  
  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  
  // Estados internos
  const [inicializado, setInicializado] = useState(false);
  const [idTextoActual, setIdTextoActual] = useState('');

  // 🆕 FASE 3: Guardar nivel académico en localStorage
  useEffect(() => {
    localStorage.setItem('nivel_academico', nivelAcademico);
  }, [nivelAcademico]);

  /**
   * Genera ID único para el texto actual
   */
  const generarIdTexto = useCallback((textoParam) => {
    if (!textoParam) return '';
    return NotesServices.Storage.generarIdTexto(textoParam);
  }, []);

  /**
   * Carga configuración inicial desde localStorage
   */
  const cargarConfiguracionInicial = useCallback(() => {
    try {
      const config = NotesServices.Storage.cargarConfiguracion();
      
      if (config.tipoTexto) setTipoTexto(config.tipoTexto);
      if (config.duracionEstudio) setDuracionEstudio(config.duracionEstudio);
      
      console.log('[useNotasEstudio] Configuración inicial cargada');
    } catch (error) {
      console.error('[useNotasEstudio] Error al cargar configuración inicial:', error);
    }
  }, []);

  /**
   * Carga datos guardados para el texto actual
   */
  const cargarDatosGuardados = useCallback(async (textoParam) => {
    if (!textoParam) return;

    try {
      const progreso = NotesServices.Storage.cargarProgresoNotas(textoParam);
      
      if (progreso) {
        console.log('[useNotasEstudio] Datos guardados encontrados');
        
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
      }
    } catch (error) {
      console.error('[useNotasEstudio] Error al cargar datos guardados:', error);
    }
  }, []);

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
        notasRepasadas,
        ultimaActualizacion: Date.now()
      };

      const guardado = NotesServices.Storage.guardarProgresoNotas(texto, progreso);
      
      if (guardado) {
        console.log('[useNotasEstudio] Progreso guardado exitosamente');
      } else {
        console.warn('[useNotasEstudio] No se pudo guardar el progreso');
      }
    } catch (error) {
      console.error('[useNotasEstudio] Error al guardar progreso:', error);
    }
  }, [texto, notas, cronograma, tipoTexto, duracionEstudio, notasRepasadas]);

  /**
   * Genera notas de estudio usando OpenAI
   */
  const generarNotas = useCallback(async (textoParam, tipoParam) => {
    if (!textoParam) {
      throw new Error('No hay texto para analizar');
    }

    try {
      console.log(`[useNotasEstudio] Generando notas para tipo: ${tipoParam}`);
      
      let tipoDetectado = tipoParam;
      
      // Detectar tipo automáticamente si es necesario
      if (tipoParam === 'auto') {
        tipoDetectado = await NotesServices.OpenAI.detectarTipoTexto(textoParam);
        console.log(`[useNotasEstudio] Tipo detectado automáticamente: ${tipoDetectado}`);
      }
      
      // Generar notas según el tipo
      const notasGeneradas = await NotesServices.OpenAI.generarNotasSegunTipo(textoParam, tipoDetectado);
      
      return notasGeneradas;
    } catch (error) {
      console.error('[useNotasEstudio] Error al generar notas:', error);
      throw error;
    }
  }, []);

  /**
   * Genera cronograma de repaso
   */
  const generarCronograma = useCallback((duracionDias) => {
    try {
      const cronogramaData = NotesServices.Cronograma.generarCronograma(duracionDias);
      return cronogramaData.cronograma;
    } catch (error) {
      console.error('[useNotasEstudio] Error al generar cronograma:', error);
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
  const generarNotasUnificado = useCallback(async (textoParam, tipoParam, analysis = null) => {
    if (!textoParam) throw new Error('No hay texto para analizar');

    // Extraer contexto del análisis académico
    const contextoEnriquecido = extraerContextoDelAnalisis(analysis);
    const tipoDetectado = contextoEnriquecido?.genero || tipoParam;

    console.log('[useNotasEstudio] Generando notas con contexto enriquecido:', {
      genero: contextoEnriquecido?.genero,
      tiene_tesis: !!contextoEnriquecido?.tesis_central,
      tiene_conceptos: !!contextoEnriquecido?.conceptos_clave,
      tiene_resumen: !!contextoEnriquecido?.resumen_previo
    });

    // 1) Backend validado (con contexto enriquecido)
    try {
      const payload = {
        texto: textoParam,
        api: 'openai',
        // ✅ Enviar contexto del análisis
        contexto: contextoEnriquecido,
        // 🆕 FASE 3: Enviar nivel académico para personalización
        nivelAcademico
      };

      const res = await fetchWithTimeout(`${BACKEND_URL}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 45000);
      
      if (res.ok) {
        const notasGeneradas = await res.json();
        console.log('[useNotasEstudio] Notas generadas con contexto del backend');
        return notasGeneradas;
      } else {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
    } catch (errBackend) {
      console.warn('[useNotasEstudio] Backend no disponible, usando OpenAI directo:', errBackend?.message);
    }

    // 2) OpenAI directo (con contexto enriquecido)
    try {
      let tipo = tipoDetectado;
      
      // Solo detectar tipo si no está en el análisis
      if (!contextoEnriquecido?.genero && tipoParam === 'auto') {
        tipo = await NotesServices.OpenAI.detectarTipoTexto(textoParam);
        console.log(`[useNotasEstudio] Tipo detectado automáticamente: ${tipo}`);
      } else if (contextoEnriquecido?.genero) {
        console.log(`[useNotasEstudio] Usando tipo del análisis: ${tipo}`);
      }
      
      return await NotesServices.OpenAI.generarNotasSegunTipo(textoParam, tipo);
    } catch (errOpenAI) {
      console.warn('[useNotasEstudio] OpenAI directo falló, usando fallback local:', errOpenAI?.message);
    }

    // 3) Fallback local mejorado con contexto
    console.log('[useNotasEstudio] Usando fallback local con contexto del análisis');
    
    const frases = textoParam.split(/[.!?]/).filter(Boolean).slice(0, 3).map(s => s.trim());
    
    return {
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
      ].slice(0, 5)
    };
  }, [extraerContextoDelAnalisis, nivelAcademico]);

  /**
   * Inicializa o regenera las notas de estudio
   */
  const inicializarNotas = useCallback(async (forzarRegeneracion = false) => {
    if (!texto) return;

    // Si ya hay notas y no se fuerza regeneración, no hacer nada
    if (notas && !forzarRegeneracion) {
      return;
    }

    setCargando(true);
    setError('');

    try {
      // Generar notas (flujo unificado: backend -> OpenAI -> local) con contexto del análisis
      const notasGeneradas = await generarNotasUnificado(texto, tipoTexto, completeAnalysis);
      setNotas(notasGeneradas);

      // Generar cronograma
      const cronogramaGenerado = generarCronograma(duracionEstudio);
      setCronograma(cronogramaGenerado);

      // Resetear repasos completados
      setNotasRepasadas({});

      // Guardar progreso
      guardarProgreso(notasGeneradas, cronogramaGenerado);

      console.log('[useNotasEstudio] Notas inicializadas exitosamente');
    } catch (err) {
      const errorMessage = `No se pudieron generar las notas de estudio: ${err.message}`;
      setError(errorMessage);
      console.error('[useNotasEstudio] Error en inicialización:', err);
    } finally {
      setCargando(false);
    }
  }, [texto, tipoTexto, duracionEstudio, notas, completeAnalysis, generarNotasUnificado, generarCronograma, guardarProgreso]);

  /**
   * Regenera las notas con nueva configuración
   */
  const regenerarNotas = useCallback(async () => {
    console.log('[useNotasEstudio] Regenerando notas...');
    await inicializarNotas(true);
  }, [inicializarNotas]);

  /**
   * Marca un repaso como completado
   */
  const marcarRepasoCompletado = useCallback((indice) => {
    try {
      // Actualizar cronograma
      const nuevoCronograma = [...cronograma];
      NotesServices.Cronograma.marcarRepasoCompletado(nuevoCronograma, indice);
      setCronograma(nuevoCronograma);

      // Actualizar estado de repasos
      const nuevosRepasados = { ...notasRepasadas, [indice]: true };
      setNotasRepasadas(nuevosRepasados);

      // Guardar progreso
      guardarProgreso(notas, nuevoCronograma);

      // Actualizar estadísticas
      const stats = NotesServices.Storage.cargarEstadisticas();
      NotesServices.Storage.guardarEstadisticas({
        ...stats,
        repasosCompletados: (stats.repasosCompletados || 0) + 1
      });

      console.log(`[useNotasEstudio] Repaso ${indice + 1} marcado como completado`);
    } catch (error) {
      console.error('[useNotasEstudio] Error al marcar repaso completado:', error);
      setError('No se pudo marcar el repaso como completado');
    }
  }, [cronograma, notasRepasadas, notas, guardarProgreso]);

  /**
   * Actualiza configuración y guarda en localStorage
   */
  const actualizarConfiguracion = useCallback((nuevaConfig) => {
    try {
      const config = {
        tipoTexto,
        duracionEstudio,
        ...nuevaConfig
      };

      NotesServices.Storage.guardarConfiguracion(config);
      console.log('[useNotasEstudio] Configuración actualizada');
    } catch (error) {
      console.error('[useNotasEstudio] Error al actualizar configuración:', error);
    }
  }, [tipoTexto, duracionEstudio]);

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

    const nuevoId = generarIdTexto(texto);
    
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
  }, [texto, inicializado, idTextoActual, generarIdTexto, cargarDatosGuardados]);

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
  }, [tipoTexto, duracionEstudio, inicializado, actualizarConfiguracion]);

  // Retornar el estado y funciones públicas
  return {
    // Estados principales
    notas,
    cronograma,
    notasRepasadas,
    
    // Estados de configuración
    tipoTexto,
    duracionEstudio,
    nivelAcademico, // 🆕 FASE 3
    
    // Estados de UI
    cargando,
    error,
    
    // Estadísticas
    estadisticasProgreso,
    
    // Funciones de configuración
    setTipoTexto,
    setDuracionEstudio,
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
    textoActivo: Boolean(texto)
  };
};

export default useNotasEstudio;
