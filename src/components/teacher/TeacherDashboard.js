import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  assignLecturasToCourse,
  approveStudentInCourse,
  backfillCourseProgressSourceCourseId,
  createCourse,
  getCourseMetrics,
  subscribeToCursosDocente,
  subscribeToDocenteTextos,
  subscribeToCourseStudents,
  uploadTexto,
  deleteTextEverywhere,
  deleteCourse,
  deleteStudentFromCourse,
  removeLecturaFromCourse,
  updateCourseWeights,
  // 🆕 Funciones para reset de artefactos
  resetStudentArtifact,
  resetAllStudentArtifacts,
  getStudentArtifactDetails,
  // 🔧 FIX CROSS-COURSE: Helper para doc IDs con scope de curso
  getProgressDocId
} from '../../firebase/firestore';
import { useAuth } from '../../context/AuthContext';

import logger from '../../utils/logger';
const initialCourseForm = {
  nombre: '',
  periodo: '2025',
  descripcion: '',
  autoApprove: true,
  lecturasFechaLimite: '',
  lecturas: []
};

function TeacherDashboard() {
  const { currentUser, userData } = useAuth();
  const docenteUid = currentUser?.uid;

  const [courses, setCourses] = useState([]);
  const [textos, setTextos] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseMetrics, setCourseMetrics] = useState(null);
  const [lecturasSeleccionadas, setLecturasSeleccionadas] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const creatingCourseLockRef = useRef(false);
  const lastCreateCourseAttemptRef = useRef(0);
  const [savingLecturas, setSavingLecturas] = useState(false);
  const [savingLecturaFechaLimiteId, setSavingLecturaFechaLimiteId] = useState(null);
  const [lecturasFechaLimiteDrafts, setLecturasFechaLimiteDrafts] = useState({});
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const [approvingStudent, setApprovingStudent] = useState(null);

  // 🆕 D1, D9, D10, D11 FIX: Estados de carga para operaciones de eliminación
  const [_deletingCourseId, setDeletingCourseId] = useState(null);
  const [_deletingTextId, setDeletingTextId] = useState(null);
  const [_removingLecturaId, setRemovingLecturaId] = useState(null);
  const [_deletingStudentId, setDeletingStudentId] = useState(null);

  const [backfillingProgress, setBackfillingProgress] = useState(false);

  // Estado para subida de textos
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingText, setUploadingText] = useState(false);
  const [newTextForm, setNewTextForm] = useState({
    titulo: '',
    autor: '',
    genero: '',
    file: null
  });

  // 🆕 Estados para modal de reset de artefactos
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStudentForReset, setSelectedStudentForReset] = useState(null);
  const [selectedLecturaForReset, setSelectedLecturaForReset] = useState(null);
  const [artifactDetails, setArtifactDetails] = useState(null);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [resettingArtifact, setResettingArtifact] = useState(null);

  // 🆕 Estados para ver contenido del trabajo
  const [viewingArtifact, setViewingArtifact] = useState(null); // { key, name, content, history }
  const [teacherComment, setTeacherComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // 🆕 Estados para edición de nota por el docente
  const [teacherScoreEdit, setTeacherScoreEdit] = useState('');
  const [scoreOverrideReason, setScoreOverrideReason] = useState('');
  const [savingScore, setSavingScore] = useState(false);

  // 🆕 Estados para exportación
  const [exporting, setExporting] = useState(false);

  // 🆕 Estados para configuración de ponderación formativa/sumativa
  const [showWeightsConfig, setShowWeightsConfig] = useState(false);
  const [pesoFormativa, setPesoFormativa] = useState(70);
  const [pesoSumativa, setPesoSumativa] = useState(30);
  const [savingWeights, setSavingWeights] = useState(false);
  const selectedCourseIdRef = useRef(null);
  const metricsRequestSeqRef = useRef(0);

  // 🆕 Estado para expandir estudiante y ver detalle por lectura
  const [expandedStudent, setExpandedStudent] = useState(null);

  const WORK_FIELD_ORDER = {
    tablaACD: ['vocesPresentes', 'vocesSilenciadas', 'marcoIdeologico', 'estrategiasRetoricas'],
    mapaActores: ['actores', 'contextoHistorico', 'contexto_historico', 'conexiones', 'consecuencias'],
    respuestaArgumentativa: ['tesis', 'evidencias', 'contraargumento', 'refutacion'],
    bitacoraEticaIA: ['verificacionFuentes', 'procesoUsoIA', 'reflexionEtica', 'declaraciones'],
    resumenAcademico: ['resumen']
  };

  const unescapeStudentText = (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');
  };

  const toWorkFieldLabel = (key) => {
    if (!key) return '';
    const withSpaces = String(key)
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2');
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  };

  const tryParseJsonish = (text) => {
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    const looksJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'));

    if (!looksJson) return null;

    try {
      const parsed = JSON.parse(trimmed);
      // Si era un string JSON-escapado ("{...}") intentamos parsear una vez más
      if (typeof parsed === 'string') {
        const maybeJsonAgain = parsed.trim();
        if (
          (maybeJsonAgain.startsWith('{') && maybeJsonAgain.endsWith('}')) ||
          (maybeJsonAgain.startsWith('[') && maybeJsonAgain.endsWith(']'))
        ) {
          try {
            return JSON.parse(maybeJsonAgain);
          } catch {
            return parsed;
          }
        }
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const isPlainObject = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    return Object.prototype.toString.call(value) === '[object Object]';
  };

  const normalizeWorkContent = (raw) => {
    if (raw === null || raw === undefined) return { kind: 'empty' };

    if (typeof raw === 'string') {
      const parsed = tryParseJsonish(raw);
      if (isPlainObject(parsed) || Array.isArray(parsed)) {
        return { kind: 'structured', data: parsed };
      }
      const text = unescapeStudentText(parsed ?? raw);
      return { kind: 'text', text: String(text) };
    }

    if (isPlainObject(raw) || Array.isArray(raw)) {
      return { kind: 'structured', data: raw };
    }

    return { kind: 'text', text: String(raw) };
  };

  const renderWorkValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <WorkEmptyValue>—</WorkEmptyValue>;
    }

    if (typeof value === 'string') {
      return <WorkFieldValue>{unescapeStudentText(value)}</WorkFieldValue>;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return <WorkFieldValue>{String(value)}</WorkFieldValue>;
    }

    if (Array.isArray(value)) {
      const isFlat = value.every(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
      if (isFlat) {
        return <WorkFieldValue>{value.map(v => unescapeStudentText(String(v))).join('\n')}</WorkFieldValue>;
      }
      return <WorkFieldPre>{JSON.stringify(value, null, 2)}</WorkFieldPre>;
    }

    return <WorkFieldPre>{JSON.stringify(value, null, 2)}</WorkFieldPre>;
  };

  const buildWorkDisplay = (raw, artifactKey) => {
    const normalized = normalizeWorkContent(raw);
    if (normalized.kind === 'empty') return { structured: false, node: null };

    if (normalized.kind === 'structured') {
      const data = normalized.data;
      if (Array.isArray(data)) {
        return {
          structured: true,
          node: (
            <WorkFields>
              {data.map((item, idx) => (
                <WorkField key={idx}>
                  <WorkFieldLabel>Item {idx + 1}</WorkFieldLabel>
                  {renderWorkValue(item)}
                </WorkField>
              ))}
            </WorkFields>
          )
        };
      }

      const order = WORK_FIELD_ORDER?.[artifactKey] || null;
      const entries = Object.entries(data);

      const orderedEntries = order
        ? [
          ...order
            .map((k) => [k, data[k]])
            .filter(([k, v]) => Object.prototype.hasOwnProperty.call(data, k) && v !== undefined),
          ...entries
            .filter(([k]) => !order.includes(k))
            .sort(([a], [b]) => String(a).localeCompare(String(b)))
        ]
        : entries;

      return {
        structured: true,
        node: (
          <WorkFields>
            {orderedEntries.map(([key, value]) => (
              <WorkField key={key}>
                <WorkFieldLabel>{toWorkFieldLabel(key)}</WorkFieldLabel>
                {renderWorkValue(value)}
              </WorkField>
            ))}
          </WorkFields>
        )
      };
    }

    return { structured: false, node: normalized.text };
  };

  const workDisplay = useMemo(
    () => buildWorkDisplay(viewingArtifact?.content, viewingArtifact?.key),
    [viewingArtifact]
  );

  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [formLecturas, setFormLecturas] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // 🆕 D8 FIX: Estado de conexión offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 🆕 D6 FIX: Cola de feedback para evitar sobrescritura
  const feedbackQueueRef = useRef([]);
  const feedbackTimeoutRef = useRef(null);

  const selectedCourse = useMemo(() => courses.find(course => course.id === selectedCourseId), [courses, selectedCourseId]);

  useEffect(() => {
    selectedCourseIdRef.current = selectedCourseId;
  }, [selectedCourseId]);

  useEffect(() => {
    setLecturasFechaLimiteDrafts({});
  }, [selectedCourseId]);

  // 🆕 D6 FIX: showFeedback con cola y debounce
  const showFeedback = useCallback((type, message) => {
    // Agregar a la cola
    feedbackQueueRef.current.push({ type, message, timestamp: Date.now() });

    // Si no hay feedback visible, mostrar el primero de la cola
    if (!feedbackTimeoutRef.current) {
      const next = feedbackQueueRef.current.shift();
      setFeedback(next);

      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;

        // Si hay más en la cola, mostrar el siguiente después de 300ms
        if (feedbackQueueRef.current.length > 0) {
          setTimeout(() => {
            const nextInQueue = feedbackQueueRef.current.shift();
            if (nextInQueue) {
              showFeedback(nextInQueue.type, nextInQueue.message);
            }
          }, 300);
        }
      }, 4000);
    }
  }, []);

  // 🆕 D8 FIX: Listener para cambios de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showFeedback('success', '✅ Conexión restaurada');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showFeedback('error', '⚠️ Sin conexión - Los cambios se guardarán localmente');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Limpiar timeout al desmontar
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [showFeedback]);

  // 🔄 Bug 8 FIX: Listeners en tiempo real para cursos y textos
  // Reemplaza loadSetup one-shot por onSnapshot listeners
  useEffect(() => {
    if (!docenteUid) return;
    setLoadingCourses(true);
    let initialCursosLoaded = false;
    let initialTextosLoaded = false;

    const unsubCursos = subscribeToCursosDocente(docenteUid, (cursos) => {
      setCourses(cursos);
      if (!initialCursosLoaded) {
        initialCursosLoaded = true;
        if (cursos.length) {
          setSelectedCourseId(prev => prev || cursos[0].id);
        }
        if (initialTextosLoaded) setLoadingCourses(false);
      }
    });

    const unsubTextos = subscribeToDocenteTextos(docenteUid, (textosDocente) => {
      setTextos(textosDocente);
      if (!initialTextosLoaded) {
        initialTextosLoaded = true;
        if (initialCursosLoaded) setLoadingCourses(false);
      }
    });

    // Fallback: si no llegan datos en 8s, desactivar loading
    const fallbackTimer = setTimeout(() => setLoadingCourses(false), 8000);

    return () => {
      unsubCursos();
      unsubTextos();
      clearTimeout(fallbackTimer);
    };
  }, [docenteUid]);

  const loadMetrics = useCallback(async (courseId) => {
    if (!courseId) {
      setCourseMetrics(null);
      return;
    }
    const requestId = ++metricsRequestSeqRef.current;
    setLoadingMetrics(true);
    try {
      const metrics = await getCourseMetrics(courseId);
      if (requestId !== metricsRequestSeqRef.current || selectedCourseIdRef.current !== courseId) {
        logger.log('⏭️ [TeacherDashboard] Respuesta de métricas obsoleta ignorada:', { courseId });
        return;
      }
      setCourseMetrics(metrics);
      setCourses(prev => prev.map(course => (
        course.id === courseId ? { ...course, ...metrics.curso } : course
      )));
      const assigned = (metrics?.curso?.lecturasAsignadas || []).map(item => item.textoId).filter(Boolean);
      setLecturasSeleccionadas(assigned);
      // 🆕 Sincronizar pesos de ponderación desde el curso
      if (metrics?.curso?.pesoFormativa != null) {
        setPesoFormativa(metrics.curso.pesoFormativa);
        setPesoSumativa(metrics.curso.pesoSumativa ?? (100 - metrics.curso.pesoFormativa));
      } else {
        setPesoFormativa(70);
        setPesoSumativa(30);
      }
    } catch (error) {
      if (requestId !== metricsRequestSeqRef.current || selectedCourseIdRef.current !== courseId) {
        return;
      }
      logger.error('Error cargando métricas:', error);
      showFeedback('error', error.message || 'No se pudieron cargar las métricas');
    } finally {
      if (requestId === metricsRequestSeqRef.current && selectedCourseIdRef.current === courseId) {
        setLoadingMetrics(false);
      }
    }
  }, [showFeedback]);

  // 🔄 Bug 8 FIX: Listener en tiempo real para estudiantes del curso seleccionado.
  // Cuando cambia la subcollection de students, recalcula métricas con debounce.
  const metricsDebounceRef = useRef(null);
  useEffect(() => {
    if (!selectedCourseId) {
      setCourseMetrics(null);
      return;
    }

    // Carga inicial inmediata
    loadMetrics(selectedCourseId);

    // Listener en subcollection de estudiantes
    let skipFirst = true; // evitar doble carga en el montaje
    const unsubStudents = subscribeToCourseStudents(selectedCourseId, (_students) => {
      if (skipFirst) { skipFirst = false; return; }
      // Debounce de 2s para no recargar métricas en cada micro-cambio
      clearTimeout(metricsDebounceRef.current);
      metricsDebounceRef.current = setTimeout(() => {
        logger.log('🔄 [Dashboard] Cambio detectado en estudiantes, recargando métricas...');
        loadMetrics(selectedCourseId);
      }, 2000);
    });

    return () => {
      unsubStudents();
      clearTimeout(metricsDebounceRef.current);
    };
  }, [selectedCourseId, loadMetrics]);

  const handleCourseSelect = (courseId) => {
    setSelectedCourseId(courseId);
  };

  const handleRefreshMetrics = () => {
    if (selectedCourseId) {
      loadMetrics(selectedCourseId);
      showFeedback('success', 'Métricas actualizadas');
    }
  };

  const handleBackfillProgress = async () => {
    if (!selectedCourseId) return;
    if (!isOnline) {
      showFeedback('error', 'Sin conexión: no se puede migrar ahora');
      return;
    }

    const ok = window.confirm(
      '¿Reparar progreso antiguo de este curso?\n\nEsto rellenará sourceCourseId en progresos antiguos (solo si estaba vacío) para que el dashboard pueda calcular métricas completas.'
    );
    if (!ok) return;

    setBackfillingProgress(true);
    try {
      const result = await backfillCourseProgressSourceCourseId(selectedCourseId);
      showFeedback(
        'success',
        `Migración completada: ${result.updatedDocs || 0} actualizado(s), ${result.skippedOtherCourse || 0} omitido(s) por otro curso, ${result.skippedMissing || 0} sin doc.`
      );
      await loadMetrics(selectedCourseId);
    } catch (error) {
      logger.error('Error en migración de progreso:', error);
      showFeedback('error', error?.message || 'No se pudo reparar el progreso');
    } finally {
      setBackfillingProgress(false);
    }
  };

  const handleCourseFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCourseForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Manejadores para subida de textos
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setNewTextForm(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleUploadText = async (e) => {
    e.preventDefault();
    if (!newTextForm.titulo || !newTextForm.file) {
      showFeedback('error', 'Título y archivo son obligatorios');
      return;
    }

    setUploadingText(true);
    try {
      await uploadTexto(newTextForm.file, {
        titulo: newTextForm.titulo,
        autor: newTextForm.autor,
        genero: newTextForm.genero,
        docenteUid,
        docenteNombre: currentUser.displayName || 'Docente'
      });

      showFeedback('success', 'Lectura subida correctamente');
      setShowUploadModal(false);
      setNewTextForm({ titulo: '', autor: '', genero: '', file: null });

      // 🔄 Los textos se actualizan automáticamente vía listener en tiempo real

    } catch (error) {
      logger.error('Error subiendo texto:', error);
      showFeedback('error', 'Error al subir la lectura');
    } finally {
      setUploadingText(false);
    }
  };

  const handleFormLecturaToggle = (textoId) => {
    setFormLecturas(prev => prev.includes(textoId)
      ? prev.filter(id => id !== textoId)
      : [...prev, textoId]
    );
  };

  const handleCreateCourse = async (event) => {
    event.preventDefault();
    if (creatingCourseLockRef.current || creatingCourse) {
      return;
    }

    const now = Date.now();
    if (now - lastCreateCourseAttemptRef.current < 1200) {
      return;
    }
    lastCreateCourseAttemptRef.current = now;

    const courseName = courseForm.nombre.trim();
    const initialLecturasFechaLimite = (courseForm.lecturasFechaLimite || '').trim() || null;

    if (!courseName) {
      showFeedback('error', 'El curso necesita un nombre');
      return;
    }
    if (!docenteUid) return;

    creatingCourseLockRef.current = true;
    setCreatingCourse(true);
    try {
      const lecturasPayload = formLecturas.map(textoId => {
        const texto = textos.find(t => t.id === textoId);
        return texto ? {
          textoId: texto.id,
          titulo: texto.titulo,
          fechaLimite: initialLecturasFechaLimite,
          notas: ''
        } : null;
      }).filter(Boolean);

      const nuevoCurso = await createCourse(docenteUid, {
        nombre: courseName,
        periodo: courseForm.periodo,
        descripcion: courseForm.descripcion,
        autoApprove: courseForm.autoApprove,
        lecturas: lecturasPayload
      });

      setCourses(prev => {
        const withoutNew = prev.filter(course => course.id !== nuevoCurso.id);
        return [{ id: nuevoCurso.id, ...nuevoCurso }, ...withoutNew];
      });
      setCourseForm(initialCourseForm);
      setFormLecturas([]);
      setSelectedCourseId(nuevoCurso.id);
      showFeedback('success', `Curso "${courseName}" creado`);
    } catch (error) {
      logger.error('Error al crear curso:', error);
      showFeedback('error', error.message || 'No se pudo crear el curso');
    } finally {
      setCreatingCourse(false);
      creatingCourseLockRef.current = false;
    }
  };

  const handleLecturaToggle = (textoId) => {
    setLecturasSeleccionadas(prev => prev.includes(textoId)
      ? prev.filter(id => id !== textoId)
      : [...prev, textoId]
    );
  };

  const handleLecturaFechaLimiteDraftChange = (textoId, value) => {
    setLecturasFechaLimiteDrafts(prev => ({
      ...prev,
      [textoId]: value || ''
    }));
  };

  const handleSaveLecturaFechaLimite = async (textoId) => {
    if (!selectedCourse) return;

    const currentLecturas = (
      selectedCourse.lecturasAsignadas ||
      courseMetrics?.curso?.lecturasAsignadas ||
      []
    ).filter(Boolean);

    const lecturaActual = currentLecturas.find((lectura) => lectura.textoId === textoId);
    if (!lecturaActual) return;

    const rawDraft = Object.prototype.hasOwnProperty.call(lecturasFechaLimiteDrafts, textoId)
      ? lecturasFechaLimiteDrafts[textoId]
      : (lecturaActual.fechaLimite || '');
    const nextFechaLimite = (rawDraft || '').trim() || null;
    const currentFechaLimite = lecturaActual.fechaLimite || null;

    if (nextFechaLimite === currentFechaLimite) {
      return;
    }

    setSavingLecturaFechaLimiteId(textoId);
    try {
      const payload = currentLecturas.map((lectura) => ({
        textoId: lectura.textoId,
        titulo: lectura.titulo || 'Lectura sin título',
        fechaLimite: lectura.textoId === textoId ? nextFechaLimite : (lectura.fechaLimite || null),
        notas: lectura.notas || ''
      }));

      await assignLecturasToCourse(selectedCourse.id, payload);
      await loadMetrics(selectedCourse.id);
      setLecturasFechaLimiteDrafts(prev => ({
        ...prev,
        [textoId]: nextFechaLimite || ''
      }));
      showFeedback('success', nextFechaLimite ? 'Fecha límite actualizada' : 'Fecha límite eliminada');
    } catch (error) {
      logger.error('Error actualizando fecha límite de lectura:', error);
      showFeedback('error', error.message || 'No se pudo actualizar la fecha límite');
    } finally {
      setSavingLecturaFechaLimiteId(null);
    }
  };

  const handleUpdateLecturas = async () => {
    if (!selectedCourse) return;
    setSavingLecturas(true);
    try {
      const existingLecturasById = new Map(
        ((selectedCourse.lecturasAsignadas || courseMetrics?.curso?.lecturasAsignadas || []) || [])
          .filter(Boolean)
          .map((lectura) => [lectura.textoId, lectura])
      );

      const payload = lecturasSeleccionadas.map(textoId => {
        const texto = textos.find(t => t.id === textoId);
        const existingLectura = existingLecturasById.get(textoId);
        return texto ? {
          textoId: texto.id,
          titulo: texto.titulo,
          fechaLimite: existingLectura?.fechaLimite || null,
          notas: existingLectura?.notas || ''
        } : null;
      }).filter(Boolean);

      await assignLecturasToCourse(selectedCourse.id, payload);
      await loadMetrics(selectedCourse.id);
      showFeedback('success', 'Lecturas asignadas al curso');
    } catch (error) {
      logger.error('Error asignando lecturas:', error);
      showFeedback('error', error.message || 'No se pudieron asignar las lecturas');
    } finally {
      setSavingLecturas(false);
    }
  };

  const handleApproveStudent = async (estudianteUid) => {
    if (!selectedCourse) return;
    setApprovingStudent(estudianteUid);
    try {
      await approveStudentInCourse(selectedCourse.id, estudianteUid);
      await loadMetrics(selectedCourse.id);
      showFeedback('success', 'Estudiante aprobado');
    } catch (error) {
      logger.error('Error aprobando estudiante:', error);
      showFeedback('error', error.message || 'No se pudo aprobar al estudiante');
    } finally {
      setApprovingStudent(null);
    }
  };

  const handleDeleteCourse = async (courseId, nombre) => {
    if (!window.confirm(`¿Estás seguro de ELIMINAR el curso "${nombre}"? Esta acción no se puede deshacer.`)) return;

    // 🆕 D1 FIX: Usar estado específico para este curso
    setDeletingCourseId(courseId);
    try {
      await deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
        setCourseMetrics(null);
      }
      showFeedback('success', 'Curso eliminado');
    } catch (error) {
      logger.error(error);
      showFeedback('error', error?.message || 'Error eliminando curso');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleDeleteText = async (textId, titulo) => {
    if (!window.confirm(
      `¿Eliminar lectura "${titulo}" de tu biblioteca?\n\n` +
      `Esta acción la eliminará permanentemente y también la quitará de TODOS tus cursos.`
    )) return;

    // 🆕 D9 FIX: Estado de carga específico
    setDeletingTextId(textId);
    try {
      await deleteTextEverywhere(textId, docenteUid);
      setTextos(prev => prev.filter(t => t.id !== textId));
      showFeedback('success', 'Lectura eliminada de la biblioteca');
      // Si estaba en el curso actual, recargar métricas
      if (selectedCourseId) loadMetrics(selectedCourseId);
    } catch (error) {
      logger.error(error);
      showFeedback('error', 'Error eliminando lectura');
    } finally {
      setDeletingTextId(null);
    }
  };

  // 🆕 Quitar lectura de un curso (sin eliminarla de la biblioteca)
  const handleRemoveLecturaFromCourse = async (textoId, titulo) => {
    if (!selectedCourse) return;
    if (!window.confirm(`¿Quitar "${titulo}" de este curso? La lectura seguirá en tu biblioteca.`)) return;

    // 🆕 D10 FIX: Estado de carga específico
    setRemovingLecturaId(textoId);
    try {
      await removeLecturaFromCourse(selectedCourse.id, textoId);
      // Actualizar UI local
      setLecturasSeleccionadas(prev => prev.filter(id => id !== textoId));
      await loadMetrics(selectedCourse.id); // Recargar métricas
      showFeedback('success', 'Lectura removida del curso');
    } catch (error) {
      logger.error(error);
      showFeedback('error', 'Error removiendo lectura del curso');
    } finally {
      setRemovingLecturaId(null);
    }
  };

  const handleDeleteStudent = async (studentUid, nombre) => {
    if (!selectedCourse) return;
    if (!window.confirm(`¿Eliminar al estudiante "${nombre}" del curso?`)) return;

    // 🆕 D11 FIX: Estado de carga específico
    setDeletingStudentId(studentUid);
    try {
      await deleteStudentFromCourse(selectedCourse.id, studentUid);
      await loadMetrics(selectedCourse.id); // Recargar
      showFeedback('success', 'Estudiante eliminado del curso');
    } catch (error) {
      logger.error(error);
      showFeedback('error', 'Error eliminando estudiante');
    } finally {
      setDeletingStudentId(null);
    }
  };

  // 🆕 Funciones para modal de reset de artefactos
  const handleOpenResetModal = async (student, lectura) => {
    setSelectedStudentForReset(student);
    setSelectedLecturaForReset(lectura);
    setShowResetModal(true);
    setLoadingArtifacts(true);

    try {
      const details = await getStudentArtifactDetails(student.estudianteUid, lectura.textoId, selectedCourse?.id);
      setArtifactDetails(details);
    } catch (error) {
      logger.error('Error cargando detalles de artefactos:', error);
      showFeedback('error', 'Error cargando detalles');
    } finally {
      setLoadingArtifacts(false);
    }
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setSelectedStudentForReset(null);
    setSelectedLecturaForReset(null);
    setArtifactDetails(null);
  };

  const handleResetSingleArtifact = async (artifactName, artifactDisplayName) => {
    if (!selectedStudentForReset || !selectedLecturaForReset) return;

    const confirmMsg = `¿Dar nueva oportunidad al estudiante "${selectedStudentForReset.estudianteNombre}" en "${artifactDisplayName}"?\n\nEsto reseteará:\n• Los 3 intentos de evaluación\n• El historial de versiones\n• El estado de entrega\n\nEl estudiante podrá empezar de nuevo.`;

    if (!window.confirm(confirmMsg)) return;

    setResettingArtifact(artifactName);
    try {
      const result = await resetStudentArtifact(
        selectedStudentForReset.estudianteUid,
        selectedLecturaForReset.textoId,
        artifactName,
        selectedCourse?.id
      );

      if (result.success) {
        showFeedback('success', `✅ ${artifactDisplayName} reseteado. El estudiante puede empezar de nuevo.`);
        // Recargar detalles
        const details = await getStudentArtifactDetails(
          selectedStudentForReset.estudianteUid,
          selectedLecturaForReset.textoId,
          selectedCourse?.id
        );
        setArtifactDetails(details);
        // Recargar métricas del curso
        await loadMetrics(selectedCourse.id);
      } else {
        showFeedback('error', result.message);
      }
    } catch (error) {
      logger.error('Error reseteando artefacto:', error);
      showFeedback('error', 'Error al resetear');
    } finally {
      setResettingArtifact(null);
    }
  };

  const handleResetAllArtifacts = async () => {
    if (!selectedStudentForReset || !selectedLecturaForReset) return;

    const confirmMsg = `⚠️ ¿RESETEAR TODOS los artefactos de "${selectedStudentForReset.estudianteNombre}" para esta lectura?\n\nEsto eliminará TODO el progreso:\n• Resumen Académico\n• Tabla ACD\n• Mapa de Actores\n• Respuesta Argumentativa\n• Bitácora Ética IA\n\nEl estudiante comenzará desde cero.`;

    if (!window.confirm(confirmMsg)) return;

    setResettingArtifact('all');
    try {
      const result = await resetAllStudentArtifacts(
        selectedStudentForReset.estudianteUid,
        selectedLecturaForReset.textoId,
        selectedCourse?.id
      );

      if (result.success) {
        showFeedback('success', `✅ ${result.resetCount} artefactos reseteados. El estudiante puede comenzar de nuevo.`);
        // Recargar detalles
        const details = await getStudentArtifactDetails(
          selectedStudentForReset.estudianteUid,
          selectedLecturaForReset.textoId,
          selectedCourse?.id
        );
        setArtifactDetails(details);
        // Recargar métricas del curso
        await loadMetrics(selectedCourse.id);
      } else {
        showFeedback('error', result.message);
      }
    } catch (error) {
      logger.error('Error reseteando todos los artefactos:', error);
      showFeedback('error', 'Error al resetear');
    } finally {
      setResettingArtifact(null);
    }
  };

  // 🆕 Ver contenido del trabajo del estudiante
  const handleViewArtifactContent = async (artifactKey, artifact) => {
    // Extraer el contenido según el tipo de artefacto
    let content = '';
    let history = artifact.history || [];

    // El contenido puede estar en diferentes lugares según el artefacto.
    // Para reflejar lo mismo que ve el estudiante, priorizamos borradores (drafts/draft).
    if (artifact.drafts) {
      content = artifact.drafts;
    } else if (artifact.draft) {
      content = artifact.draft;
    } else if (artifact.finalContent) {
      content = artifact.finalContent;
    } else if (history.length > 0) {
      // Obtener el último contenido del historial
      const lastVersion = history[history.length - 1];
      content = lastVersion.finalContent || lastVersion.content;
    }

    setViewingArtifact({
      key: artifactKey,
      name: artifact.name,
      content,
      history,
      submitted: artifact.submitted,
      score: artifact.rubricScore,
      teacherComment: artifact.teacherComment || '',
      teacherOverrideScore: artifact.teacherOverrideScore || null,
      scoreOverrideReason: artifact.scoreOverrideReason || ''
    });
    setTeacherComment(artifact.teacherComment || '');
    setTeacherScoreEdit(artifact.teacherOverrideScore != null ? String(artifact.teacherOverrideScore) : String(artifact.rubricScore || ''));
    setScoreOverrideReason(artifact.scoreOverrideReason || '');

    // 🆕 FASE 5: Marcar automáticamente como "visto" por el docente
    // Esto hace que desaparezca del contador de "entregas nuevas"
    if (artifact.submitted && !artifact.viewedByTeacher && selectedStudentForReset && selectedLecturaForReset) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');

        const progressRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'progress', getProgressDocId(selectedCourse?.id, selectedLecturaForReset.textoId));
        const updatePath = `activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${artifactKey}`;

        await updateDoc(progressRef, {
          [`${updatePath}.viewedByTeacher`]: true,
          [`${updatePath}.viewedAt`]: new Date().toISOString(),
          [`${updatePath}.viewedBy`]: docenteUid
        });

        logger.log(`✅ [TeacherDashboard] Artefacto ${artifactKey} marcado como visto`);

        // Actualizar estado local para reflejar el cambio inmediatamente
        setArtifactDetails(prev => {
          if (!prev?.artifacts) return prev;
          return {
            ...prev,
            artifacts: {
              ...prev.artifacts,
              [artifactKey]: {
                ...prev.artifacts[artifactKey],
                viewedByTeacher: true,
                viewedAt: new Date().toISOString()
              }
            }
          };
        });

        // 🆕 FASE 5 FIX: Decrementar contador de entregas recientes localmente
        setCourseMetrics(prev => {
          if (!prev) return prev;
          const currentRecientes = prev.entregasRecientes || 0;
          
          // También actualizar el contador del estudiante específico
          const updatedEstudiantes = (prev.estudiantes || []).map(est => {
            if (est.estudianteUid === selectedStudentForReset.estudianteUid) {
              return {
                ...est,
                stats: {
                  ...est.stats,
                  entregasRecientes: Math.max(0, (est.stats?.entregasRecientes || 0) - 1)
                }
              };
            }
            return est;
          });

          return {
            ...prev,
            entregasRecientes: Math.max(0, currentRecientes - 1),
            estudiantes: updatedEstudiantes
          };
        });

      } catch (error) {
        logger.warn('⚠️ Error marcando artefacto como visto:', error);
        // No mostrar error al usuario, es una operación silenciosa
      }
    }
  };

  // 🆕 Ver Ensayo Integrador (SUMATIVO) del estudiante (no vive en activitiesProgress.artifacts)
  const handleViewSummativeEssay = (essay) => {
    const rubricId = essay?.rubricId;
    const rubricNumber = rubricId ? String(rubricId).replace('rubrica', '') : '';
    setViewingArtifact({
      key: `ensayoIntegrador:${rubricId || 'unknown'}`,
      name: `Ensayo Integrador (Sumativo) - Rúbrica ${rubricNumber || '—'}`,
      content: essay?.essayContent || '',
      history: [],
      submitted: true,
      score: typeof essay?.score === 'number' ? essay.score : Number(essay?.score) || 0,
      teacherComment: essay?.teacherComment || '',
      teacherOverrideScore: essay?.teacherOverrideScore ?? null,
      scoreOverrideReason: essay?.scoreOverrideReason || '',
      isSummativeEssay: true,
      rubricId: rubricId || null,
      gradedAt: essay?.gradedAt || null,
      submittedAt: essay?.submittedAt || null,
      attemptsUsed: essay?.attemptsUsed ?? null
    });
    setTeacherComment(essay?.teacherComment || '');
    setTeacherScoreEdit(essay?.teacherOverrideScore != null ? String(essay.teacherOverrideScore) : String(essay?.score || ''));
    setScoreOverrideReason(essay?.scoreOverrideReason || '');
  };

  // 🆕 Guardar comentario del docente
  const handleSaveTeacherComment = async () => {
    if (!viewingArtifact || !selectedStudentForReset || !selectedLecturaForReset) return;

    setSavingComment(true);
    try {
      // Importar updateDoc y doc de firebase
      const { doc, updateDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      const progressRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'progress', getProgressDocId(selectedCourse?.id, selectedLecturaForReset.textoId));

      if (viewingArtifact.isSummativeEssay) {
        const rubricKey = viewingArtifact.rubricId;
        if (!rubricKey) throw new Error('Rúbrica de ensayo no encontrada');

        const summativePath = `rubricProgress.${rubricKey}.summative`;
        await updateDoc(progressRef, {
          [`${summativePath}.teacherComment`]: teacherComment,
          [`${summativePath}.commentedAt`]: new Date().toISOString(),
          [`${summativePath}.commentedBy`]: docenteUid,
          [`${summativePath}.docenteNombre`]: userData?.nombre || 'Docente'
        });
      } else {
        // Guardar el comentario en el artefacto correspondiente
        const updatePath = `activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}.teacherComment`;

        await updateDoc(progressRef, {
          [updatePath]: teacherComment,
          [`activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}.commentedAt`]: new Date().toISOString(),
          [`activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}.commentedBy`]: docenteUid
        });
      }

      // 🆕 FASE 5: Crear notificación para el estudiante
      if (teacherComment && teacherComment.trim().length > 0) {
        try {
          const notificationId = `${selectedLecturaForReset.textoId}_${viewingArtifact.key}_${Date.now()}`;
          const notificationRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'notifications', notificationId);
          
          await setDoc(notificationRef, {
            type: 'teacher_comment',
            artifactKey: viewingArtifact.isSummativeEssay ? `ensayoIntegrador:${viewingArtifact.rubricId || 'unknown'}` : viewingArtifact.key,
            artifactName: viewingArtifact.name,
            textoId: selectedLecturaForReset.textoId,
            lecturaTitle: selectedLecturaForReset.titulo || 'Lectura',
            comment: teacherComment,
            docenteUid: docenteUid,
            docenteNombre: userData?.nombre || 'Tu docente',
            courseId: selectedCourseId,
            courseName: courseMetrics?.curso?.nombre || '',
            read: false,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now()
          });
          logger.log('🔔 [TeacherDashboard] Notificación creada para el estudiante');
        } catch (notifError) {
          logger.warn('⚠️ Error creando notificación:', notifError);
          // No bloquear si falla la notificación
        }
      }

      showFeedback('success', '✅ Comentario guardado');

      // Actualizar estado local
      setViewingArtifact(prev => ({ ...prev, teacherComment }));

      // Recargar detalles
      const details = await getStudentArtifactDetails(
        selectedStudentForReset.estudianteUid,
        selectedLecturaForReset.textoId,
        selectedCourse?.id
      );
      setArtifactDetails(details);

    } catch (error) {
      logger.error('Error guardando comentario:', error);
      showFeedback('error', 'Error al guardar comentario');
    } finally {
      setSavingComment(false);
    }
  };

  // 🆕 Human-on-the-loop: Guardar nota editada por el docente
  const handleSaveTeacherScore = async () => {
    if (!viewingArtifact || !selectedStudentForReset || !selectedLecturaForReset) return;

    const newScore = parseFloat(teacherScoreEdit);
    if (isNaN(newScore) || newScore < 0 || newScore > 10) {
      showFeedback('error', 'La nota debe ser un número entre 0 y 10');
      return;
    }

    // El motivo del cambio es obligatorio e independiente del comentario general
    if (!scoreOverrideReason || scoreOverrideReason.trim().length < 5) {
      showFeedback('error', 'Debes escribir el motivo del cambio de nota (mínimo 5 caracteres)');
      return;
    }

    setSavingScore(true);
    try {
      const { doc, updateDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      const studentUid = selectedStudentForReset.estudianteUid;
      const textoId = selectedLecturaForReset.textoId;
      const progressRef = doc(db, 'students', studentUid, 'progress', getProgressDocId(selectedCourse?.id, textoId));
      if (viewingArtifact.isSummativeEssay) {
        const rubricKey = viewingArtifact.rubricId;
        if (!rubricKey) {
          showFeedback('error', 'No se encontró la rúbrica del ensayo sumativo');
          return;
        }

        const summativePath = `rubricProgress.${rubricKey}.summative`;
        await updateDoc(progressRef, {
          [`${summativePath}.teacherOverrideScore`]: newScore,
          [`${summativePath}.score`]: newScore,
          [`${summativePath}.scoreOverrideReason`]: scoreOverrideReason.trim(),
          [`${summativePath}.scoreOverriddenAt`]: new Date().toISOString(),
          [`${summativePath}.scoreOverriddenBy`]: docenteUid,
          [`${summativePath}.docenteNombre`]: userData?.nombre || 'Docente',
          [`${summativePath}.status`]: 'graded',
          [`${summativePath}.gradedAt`]: Date.now(),
        });
      } else {
        const basePath = `activitiesProgress.${textoId}.artifacts.${viewingArtifact.key}`;

        await updateDoc(progressRef, {
          // Guardar el override score del docente
          [`${basePath}.teacherOverrideScore`]: newScore,
          [`${basePath}.score`]: newScore,
          [`${basePath}.lastScore`]: newScore,
          [`${basePath}.scoreOverrideReason`]: scoreOverrideReason.trim(),
          [`${basePath}.scoreOverriddenAt`]: new Date().toISOString(),
          [`${basePath}.scoreOverriddenBy`]: docenteUid,
          [`${basePath}.docenteNombre`]: userData?.nombre || 'Docente',
        });

        // También actualizar rubricProgress para que getCourseMetrics lo vea
        const rubricMapping = {
          resumenAcademico: 'rubrica1',
          tablaACD: 'rubrica2',
          mapaActores: 'rubrica3',
          respuestaArgumentativa: 'rubrica4',
          bitacoraEticaIA: 'rubrica5'
        };
        const rubricKey = rubricMapping[viewingArtifact.key];
        if (rubricKey) {
          await updateDoc(progressRef, {
            [`rubricProgress.${rubricKey}.teacherOverrideScore`]: newScore,
            [`rubricProgress.${rubricKey}.average`]: newScore,
          });
        }
      }

      // 🔔 Crear notificación para el estudiante
      try {
        const notificationId = `score_override_${textoId}_${viewingArtifact.key}_${Date.now()}`;
        const notificationRef = doc(db, 'students', studentUid, 'notifications', notificationId);
        
        await setDoc(notificationRef, {
          type: 'score_override',
          artifactKey: viewingArtifact.key,
          artifactName: viewingArtifact.name,
          textoId: textoId,
          lecturaTitle: selectedLecturaForReset.titulo || 'Lectura',
          oldScore: viewingArtifact.score || 0,
          newScore: newScore,
          reason: scoreOverrideReason.trim(),
          docenteUid: docenteUid,
          docenteNombre: userData?.nombre || 'Tu docente',
          courseId: selectedCourseId,
          courseName: courseMetrics?.curso?.nombre || '',
          read: false,
          createdAt: serverTimestamp(),
          createdAtMs: Date.now()
        });
      } catch (notifError) {
        logger.warn('⚠️ Error creando notificación de cambio de nota:', notifError);
      }

      showFeedback('success', `✅ Nota actualizada a ${newScore}/10`);

      // Actualizar estado local
      setViewingArtifact(prev => ({ ...prev, score: newScore, teacherOverrideScore: newScore, scoreOverrideReason: scoreOverrideReason.trim() }));

      // Recargar detalles y métricas
      const details = await getStudentArtifactDetails(studentUid, textoId, selectedCourse?.id);
      setArtifactDetails(details);
      if (selectedCourseId) loadMetrics(selectedCourseId);

    } catch (error) {
      logger.error('Error guardando nota:', error);
      showFeedback('error', 'Error al guardar la nota');
    } finally {
      setSavingScore(false);
    }
  };

  // 🆕 Borrar comentario del docente y notificación del estudiante
  const handleDeleteTeacherComment = async () => {
    if (!viewingArtifact || !selectedStudentForReset || !selectedLecturaForReset) return;
    
    const confirmMsg = '¿Estás seguro de borrar este comentario?\n\nTambién se eliminará la notificación enviada al estudiante.';
    if (!window.confirm(confirmMsg)) return;

    setSavingComment(true);
    try {
      const { doc, updateDoc, deleteDoc, collection, query, where, getDocs, deleteField } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      const progressRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'progress', getProgressDocId(selectedCourse?.id, selectedLecturaForReset.textoId));

      if (viewingArtifact.isSummativeEssay) {
        const rubricKey = viewingArtifact.rubricId;
        if (!rubricKey) throw new Error('Rúbrica de ensayo no encontrada');
        const summativePath = `rubricProgress.${rubricKey}.summative`;
        await updateDoc(progressRef, {
          [`${summativePath}.teacherComment`]: deleteField(),
          [`${summativePath}.commentedAt`]: deleteField(),
          [`${summativePath}.commentedBy`]: deleteField()
        });
      } else {
        // Borrar el comentario del artefacto
        const updatePath = `activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}`;
        
        await updateDoc(progressRef, {
          [`${updatePath}.teacherComment`]: deleteField(),
          [`${updatePath}.commentedAt`]: deleteField(),
          [`${updatePath}.commentedBy`]: deleteField()
        });
      }

      // Buscar y borrar la notificación correspondiente del estudiante
      try {
        const notificationsRef = collection(db, 'students', selectedStudentForReset.estudianteUid, 'notifications');
          const q = query(
            notificationsRef,
            where('textoId', '==', selectedLecturaForReset.textoId),
            where('artifactKey', '==', viewingArtifact.isSummativeEssay ? `ensayoIntegrador:${viewingArtifact.rubricId || 'unknown'}` : viewingArtifact.key),
            where('docenteUid', '==', docenteUid)
          );
        
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
        
        logger.log(`🗑️ [TeacherDashboard] Eliminadas ${snapshot.docs.length} notificaciones del estudiante`);
      } catch (notifError) {
        logger.warn('⚠️ Error borrando notificaciones:', notifError);
        // No bloquear si falla borrar notificaciones
      }

      showFeedback('success', '🗑️ Comentario eliminado');

      // Actualizar estado local
      setTeacherComment('');
      setViewingArtifact(prev => ({ ...prev, teacherComment: '' }));

      // Recargar detalles
      const details = await getStudentArtifactDetails(
        selectedStudentForReset.estudianteUid,
        selectedLecturaForReset.textoId,
        selectedCourse?.id
      );
      setArtifactDetails(details);

    } catch (error) {
      logger.error('Error borrando comentario:', error);
      showFeedback('error', 'Error al borrar comentario');
    } finally {
      setSavingComment(false);
    }
  };

  // 🆕 Exportar datos completos del curso a Excel
  const handleExportCourseData = async () => {
    if (!courseMetrics?.curso || !selectedCourse) return;

    setExporting(true);
    try {
      const { curso, estudiantes } = courseMetrics;
      const lecturas = curso.lecturasAsignadas || [];

      // Construir datos para exportación detallada
      const rows = [];

      // Cabecera
      rows.push([
        'Estudiante',
        'Email',
        'Estado',
        'Lectura',
        'Artefacto',
        'Estado Artefacto',
        'Puntaje',
        'Intentos',
        'Fecha Entrega',
        'Comentario Docente'
      ]);

      // Para cada estudiante y lectura, obtener detalles de artefactos
      for (const estudiante of estudiantes || []) {
        for (const lectura of lecturas) {
          try {
            const details = await getStudentArtifactDetails(estudiante.estudianteUid, lectura.textoId, selectedCourse?.id);

            if (details.hasProgress && details.artifacts) {
              for (const [_artifactKey, artifact] of Object.entries(details.artifacts)) {
                rows.push([
                  estudiante.estudianteNombre || 'Sin nombre',
                  estudiante.estudianteEmail || '',
                  estudiante.estado || '',
                  lectura.titulo || lectura.textoId,
                  artifact.name,
                  artifact.submitted ? 'Entregado' : artifact.attempts > 0 ? 'En progreso' : 'Sin iniciar',
                  artifact.rubricScore || 0,
                  artifact.attempts || 0,
                  artifact.submittedAt ? new Date(artifact.submittedAt).toLocaleDateString('es-CL') : '',
                  artifact.teacherComment || ''
                ]);
              }
            } else {
              // Sin progreso en esta lectura
              rows.push([
                estudiante.estudianteNombre || 'Sin nombre',
                estudiante.estudianteEmail || '',
                estudiante.estado || '',
                lectura.titulo || lectura.textoId,
                'Todos',
                'Sin iniciar',
                0,
                0,
                '',
                ''
              ]);
            }
          } catch (err) {
            logger.warn('Error obteniendo detalles para exportación:', err);
          }
        }
      }

      // Convertir a CSV
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const BOM = '\uFEFF';
      const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
      const safeName = curso.nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
      downloadBlob(BOM + csv, `${safeName}-detalle-artefactos.csv`, 'text/csv;charset=utf-8;');

      showFeedback('success', `✅ Exportados ${rows.length - 1} registros`);

    } catch (error) {
      logger.error('Error exportando datos:', error);
      showFeedback('error', 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const exportMetrics = async (format = 'csv') => {
    if (!courseMetrics?.curso) return;
    const { curso, estudiantes, resumen } = courseMetrics;
    const safeName = curso.nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-');

    if (format === 'pdf') {
      try {
        const { exportGenericPDF } = await import('../../utils/exportUtils');
        const sections = [
          {
            heading: 'Información del curso',
            keyValues: {
              'Curso': curso.nombre,
              'Código de acceso': curso.codigoJoin,
              'Total estudiantes': resumen?.totalEstudiantes || 0,
              'Fecha de exportación': new Date().toLocaleString('es-ES'),
            }
          },
          {
            heading: 'Resumen por estudiante',
            table: {
              headers: ['Estudiante', 'Estado', 'Avance %', 'Lecturas', 'Promedio', 'Entregas'],
              rows: (estudiantes || []).map(est => [
                est.estudianteNombre || est.nombre || 'Sin nombre',
                est.estado || '—',
                `${est.stats?.avancePorcentaje ?? 0}%`,
                est.stats?.lecturasCompletadas ?? 0,
                (est.stats?.promedioScore ?? 0).toFixed ? (est.stats?.promedioScore ?? 0).toFixed(2) : (est.stats?.promedioScore ?? 0),
                est.stats?.entregasCompletas ?? 0,
              ])
            }
          }
        ];
        await exportGenericPDF({
          title: `Reporte del Curso: ${curso.nombre}`,
          sections,
          fileName: `${safeName}-reporte.pdf`
        });
        showFeedback('success', '✅ PDF exportado');
      } catch (error) {
        logger.error('Error exportando PDF:', error);
        showFeedback('error', 'Error al exportar PDF');
      }
      return;
    }

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = ['Estudiante', 'Estado', 'Avance (%)', 'Lecturas Completadas', 'Puntaje Promedio', 'Tiempo Lectura (min)', 'Entregas Completas', 'Artefactos Entregados'];
    const rows = (estudiantes || []).map(est => [
      est.estudianteNombre || est.nombre || 'Sin nombre',
      est.estado || '',
      est.stats?.avancePorcentaje ?? 0,
      est.stats?.lecturasCompletadas ?? 0,
      typeof (est.stats?.promedioScore) === 'number' ? est.stats.promedioScore.toFixed(2) : (est.stats?.promedioScore ?? 0),
      est.stats?.tiempoLecturaTotal ?? 0,
      est.stats?.entregasCompletas ?? 0,
      est.stats?.artefactosEntregados ?? 0
    ]);

    // Fila de metadatos del curso al inicio
    const infoRow = [`Curso: ${curso.nombre}`, `Código: ${curso.codigoJoin}`, `Estudiantes: ${resumen?.totalEstudiantes || 0}`, `Exportado: ${new Date().toLocaleString('es-ES')}`];
    rows.unshift(header);
    rows.unshift(infoRow);

    const BOM = '\uFEFF';
    const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
    downloadBlob(BOM + csv, `${safeName}-reporte.csv`, 'text/csv;charset=utf-8;');
  };

  const downloadBlob = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      showFeedback('success', 'Código copiado');
    } catch (error) {
      logger.warn('No se pudo copiar automáticamente', error);
    }
  };

  // 🆕 Guardar ponderación formativa/sumativa
  const handleSaveWeights = async () => {
    if (!selectedCourseId) return;
    const f = parseInt(pesoFormativa, 10);
    const s = parseInt(pesoSumativa, 10);
    if (isNaN(f) || isNaN(s) || f + s !== 100 || f < 0 || s < 0) {
      showFeedback('error', 'Los pesos deben sumar 100% y ser valores positivos');
      return;
    }
    setSavingWeights(true);
    try {
      await updateCourseWeights(selectedCourseId, f, s);
      showFeedback('success', `✅ Ponderación actualizada: Formativa ${f}% / Sumativa ${s}%`);
      setShowWeightsConfig(false);
      // Recargar métricas para reflejar el cambio
      if (selectedCourseId) loadMetrics(selectedCourseId);
    } catch (error) {
      logger.error('Error guardando ponderación:', error);
      showFeedback('error', error?.message || 'Error al guardar ponderación');
    } finally {
      setSavingWeights(false);
    }
  };

  // 🆕 FIX: Al expandir un estudiante, marcar TODOS sus artefactos entregados como vistos
  const handleExpandStudent = useCallback(async (est) => {
    const newId = expandedStudent === est.id ? null : est.id;
    setExpandedStudent(newId);

    // Si estamos expandiendo (no colapsando) y tiene entregas nuevas → marcar como vistas
    if (newId && est.stats?.entregasRecientes > 0 && selectedCourseId) {
      try {
        const { doc: fbDoc, updateDoc: fbUpdateDoc } = await import('firebase/firestore');
        const { db: fbDb } = await import('../../firebase/config');

        const lecturas = courseMetrics?.curso?.lecturasAsignadas || [];
        let markedCount = 0;

        for (const lectura of lecturas) {
          const lecturaProgress = est.lecturaDetails?.[lectura.textoId] || {};
          const artifacts = lecturaProgress.artifacts || {};

          const updates = {};
          Object.entries(artifacts).forEach(([artKey, artData]) => {
            if (artData?.submitted && !artData?.viewedByTeacher) {
              const basePath = `activitiesProgress.${lectura.textoId}.artifacts.${artKey}`;
              updates[`${basePath}.viewedByTeacher`] = true;
              updates[`${basePath}.viewedAt`] = new Date().toISOString();
              updates[`${basePath}.viewedBy`] = docenteUid;
              markedCount++;
            }
          });

          if (Object.keys(updates).length > 0) {
            const progressRef = fbDoc(fbDb, 'students', est.estudianteUid, 'progress', getProgressDocId(selectedCourseId, lectura.textoId));
            await fbUpdateDoc(progressRef, updates).catch((err) => {
              logger.warn(`⚠️ [TeacherDashboard] Error marcando artefactos como vistos para ${est.estudianteNombre}:`, err?.code || err?.message);
            });
          }
        }

        if (markedCount > 0) {
          logger.log(`✅ [TeacherDashboard] ${markedCount} artefactos marcados como vistos para ${est.estudianteNombre}`);
          // Actualizar contador local inmediatamente
          setCourseMetrics(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              estudiantes: (prev.estudiantes || []).map(e => {
                if (e.estudianteUid === est.estudianteUid) {
                  return {
                    ...e,
                    stats: { ...e.stats, entregasRecientes: 0 }
                  };
                }
                return e;
              })
            };
          });
        }
      } catch (error) {
        logger.warn('⚠️ Error marcando entregas como vistas:', error);
      }
    }
  }, [expandedStudent, courseMetrics, selectedCourseId, docenteUid]);

  const pendingStudents = useMemo(() => {
    return (courseMetrics?.estudiantes || []).filter(est => est.estado === 'pending');
  }, [courseMetrics]);

  const resumenCards = useMemo(() => ([
    { label: 'Estudiantes', value: courseMetrics?.resumen?.totalEstudiantes || 0, accent: '#6366F1' },
    { label: 'Activos', value: courseMetrics?.resumen?.activos || 0, accent: '#10B981' },
    { label: 'Pendientes', value: courseMetrics?.resumen?.pendientes || 0, accent: '#F97316' },
    { label: 'Avance promedio', value: `${courseMetrics?.resumen?.promedioAvance || 0}%`, accent: '#3B82F6' },
    { label: 'Score promedio', value: courseMetrics?.resumen?.promedioScore || 0, accent: '#14B8A6' },
    { label: 'Tiempo total (min)', value: courseMetrics?.resumen?.tiempoTotal || 0, accent: '#A855F7' },
    { label: 'Entregas completas', value: courseMetrics?.resumen?.entregasCompletas || 0, accent: '#10B981' },
    { label: 'Artefactos entregados', value: courseMetrics?.resumen?.artefactosEntregados || 0, accent: '#F97316' }
  ]), [courseMetrics]);

  const assignedLecturas = useMemo(() => {
    return courseMetrics?.curso?.lecturasAsignadas || [];
  }, [courseMetrics]);

  return (
    <DashboardWrapper>
      <DashboardGrid>
        <LeftColumn>
          <SectionHeader>
            <div>
              <SectionLabel>🎓 Mis cursos</SectionLabel>
              <SectionSub>Gestiona tus grupos y códigos de acceso</SectionSub>
            </div>
            <ActionButton type="button" onClick={() => selectedCourseId && loadMetrics(selectedCourseId)} disabled={loadingCourses || loadingMetrics}>
              {loadingCourses ? '⏳ Actualizando...' : '↻ Actualizar'}
            </ActionButton>
          </SectionHeader>

          {loadingCourses && (
            <InlineLoader>
              <InlineSpinner aria-label="Cargando cursos" />
            </InlineLoader>
          )}

          {!loadingCourses && !courses.length && (
            <EmptyState>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <h3>Aún no tienes cursos</h3>
              <p>Crea tu primer curso abajo y comparte el código con tus estudiantes.</p>
            </EmptyState>
          )}

          <CoursesScroller>
            {courses.map(course => (
              <CourseCard
                key={course.id}
                $active={course.id === selectedCourseId}
                onClick={() => handleCourseSelect(course.id)}
              >
                <CourseCardHeader>
                  <CourseTitle>{course.nombre}</CourseTitle>
                  <CourseDeleteBtn
                    onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id, course.nombre); }}
                    title="Eliminar curso"
                    aria-label={`Eliminar ${course.nombre}`}
                  >
                    🗑️
                  </CourseDeleteBtn>
                </CourseCardHeader>
                <CourseMetaRow>
                  <CourseBadge>📅 {course.periodo}</CourseBadge>
                  <CourseBadge $variant={course.autoApprove ? 'success' : 'warning'}>
                    {course.autoApprove ? '✅ Autoaprueba' : '🔒 Requiere aprobación'}
                  </CourseBadge>
                </CourseMetaRow>
                <CourseCodeStrip>
                  <CourseCodeLabel>Código de acceso</CourseCodeLabel>
                  <CourseCodeValue>{course.codigoJoin}</CourseCodeValue>
                </CourseCodeStrip>
                <CourseMetaRow>
                  <CourseBadge>📖 {course.totalLecturas || 0} lectura{(course.totalLecturas || 0) !== 1 ? 's' : ''}</CourseBadge>
                </CourseMetaRow>
              </CourseCard>
            ))}
          </CoursesScroller>

          <CreateCourseCard>
            <CreateCourseHeader>
              <span style={{ fontSize: '1.5rem' }}>➕</span>
              <div>
                <SectionLabel>Crear nuevo curso</SectionLabel>
                <SectionSub>Completa los datos y asigna lecturas iniciales</SectionSub>
              </div>
            </CreateCourseHeader>
            <CourseForm onSubmit={handleCreateCourse}>
              <FormFieldGroup>
                <FormLabel htmlFor="course-nombre">Nombre del curso</FormLabel>
                <FormInput
                  id="course-nombre"
                  type="text"
                  name="nombre"
                  placeholder="Ej: Literatura 3°B"
                  value={courseForm.nombre}
                  onChange={handleCourseFormChange}
                  required
                />
              </FormFieldGroup>

              <FormRow>
                <FormFieldGroup style={{ flex: 1 }}>
                  <FormLabel htmlFor="course-periodo">📅 Periodo</FormLabel>
                  <FormInput
                    id="course-periodo"
                    type="text"
                    name="periodo"
                    value={courseForm.periodo}
                    onChange={handleCourseFormChange}
                  />
                </FormFieldGroup>
                <FormFieldGroup>
                  <FormLabel>Aprobación automática</FormLabel>
                  <ToggleRow onClick={() => setCourseForm(prev => ({ ...prev, autoApprove: !prev.autoApprove }))}>
                    <ToggleTrack $active={courseForm.autoApprove}>
                      <ToggleThumb $active={courseForm.autoApprove} />
                    </ToggleTrack>
                    <ToggleLabel $active={courseForm.autoApprove}>
                      {courseForm.autoApprove ? '✅ Sí' : '🔒 No'}
                    </ToggleLabel>
                  </ToggleRow>
                </FormFieldGroup>
              </FormRow>

              <FormFieldGroup>
                <FormLabel htmlFor="course-lecturas-fecha-limite">Fecha límite lecturas iniciales (opcional)</FormLabel>
                <FormInput
                  id="course-lecturas-fecha-limite"
                  type="date"
                  name="lecturasFechaLimite"
                  value={courseForm.lecturasFechaLimite}
                  onChange={handleCourseFormChange}
                />
                <SmallMuted style={{ marginTop: '0.4rem' }}>
                  Se aplicará a las lecturas seleccionadas al crear el curso.
                </SmallMuted>
              </FormFieldGroup>

              <FormFieldGroup>
                <FormLabel htmlFor="course-descripcion">Descripción (opcional)</FormLabel>
                <FormTextarea
                  id="course-descripcion"
                  name="descripcion"
                  rows="2"
                  placeholder="Ej: Grupo de lecturas guiadas para tercer año"
                  value={courseForm.descripcion}
                  onChange={handleCourseFormChange}
                />
              </FormFieldGroup>

              <FormDivider />

              <FormFieldGroup>
                <FormLabel>📖 Lecturas iniciales</FormLabel>
                <SmallMuted style={{ marginBottom: '0.5rem' }}>
                  {textos.length
                    ? 'Selecciona las lecturas que se asignarán al crear el curso'
                    : 'No tienes lecturas subidas todavía. Sube una desde la biblioteca arriba.'}
                </SmallMuted>
                <FormLecturasGrid>
                  {textos.slice(0, 6).map(texto => {
                    const selected = formLecturas.includes(texto.id);
                    return (
                      <FormLecturaCard
                        key={texto.id}
                        $selected={selected}
                        onClick={() => handleFormLecturaToggle(texto.id)}
                        role="checkbox"
                        aria-checked={selected}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleFormLecturaToggle(texto.id); } }}
                      >
                        <FormLecturaCheck $selected={selected}>
                          {selected ? '✓' : ''}
                        </FormLecturaCheck>
                        <FormLecturaInfo>
                          <FormLecturaTitulo>{texto.titulo}</FormLecturaTitulo>
                          <SmallMuted>{texto.genero || 'Sin género'}</SmallMuted>
                        </FormLecturaInfo>
                        <FormLecturaDeleteBtn
                          onClick={(e) => { e.stopPropagation(); handleDeleteText(texto.id, texto.titulo); }}
                          title={`Eliminar "${texto.titulo}" de la biblioteca`}
                        >
                          🗑️
                        </FormLecturaDeleteBtn>
                      </FormLecturaCard>
                    );
                  })}
                </FormLecturasGrid>
                {textos.length > 6 && (
                  <SmallMuted style={{ marginTop: '0.4rem' }}>Mostrando las 6 más recientes de {textos.length} lecturas.</SmallMuted>
                )}
                {formLecturas.length > 0 && (
                  <FormLecturasCount>
                    {formLecturas.length} lectura{formLecturas.length !== 1 ? 's' : ''} seleccionada{formLecturas.length !== 1 ? 's' : ''}
                  </FormLecturasCount>
                )}
              </FormFieldGroup>

              <ActionButton type="submit" disabled={creatingCourse} style={{ marginTop: '0.5rem' }}>
                {creatingCourse ? '⏳ Creando...' : '🚀 Crear curso'}
              </ActionButton>
            </CourseForm>
          </CreateCourseCard>

          {/* Biblioteca de lecturas — sube textos para asignar */}
          <UploadSection>
            <div>
              <SectionLabel>📚 Biblioteca de Lecturas</SectionLabel>
              <SectionSub style={{ marginTop: '0.15rem' }}>Sube textos para asignar a tus cursos</SectionSub>
            </div>
            <ActionButton type="button" onClick={() => setShowUploadModal(true)}>
              + Nueva Lectura
            </ActionButton>
          </UploadSection>
        </LeftColumn>

        <RightColumn>
          {!selectedCourse && (
            <EmptyState>
              <h3>Selecciona o crea un curso</h3>
              <p>Aquí verás métricas, estudiantes y lecturas asignadas.</p>
            </EmptyState>
          )}

          {selectedCourse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <CourseHeaderCard>
                <div>
                  <CourseTitle>{selectedCourse.nombre}</CourseTitle>
                  <CourseMeta>
                    <span>{selectedCourse.periodo}</span>
                    <span>{selectedCourse.autoApprove ? 'Autoaprueba' : 'Requiere aprobación'}</span>
                  </CourseMeta>
                </div>
                <CourseCodeBox>
                  <span>Código</span>
                  <strong>{selectedCourse.codigoJoin}</strong>
                  <ActionButton type="button" onClick={() => copyCode(selectedCourse.codigoJoin)}>
                    Copiar
                  </ActionButton>
                  <SecondaryButton type="button" onClick={handleRefreshMetrics} disabled={loadingMetrics}>
                    {loadingMetrics ? 'Actualizando...' : '↻ Actualizar'}
                  </SecondaryButton>
                  <ActionButton
                    type="button"
                    onClick={handleBackfillProgress}
                    disabled={backfillingProgress || loadingMetrics}
                    title="Repara progreso antiguo (sourceCourseId)"
                  >
                    {backfillingProgress ? 'Reparando...' : 'Reparar progreso'}
                  </ActionButton>
                </CourseCodeBox>
              </CourseHeaderCard>

              {loadingMetrics ? (
                <InlineLoader>
                  <InlineSpinner aria-label="Cargando métricas" />
                </InlineLoader>
              ) : (
                <>
                  <MetricsGrid>
                    {resumenCards.map(card => (
                      <MetricCard key={card.label} $accent={card.accent}>
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                      </MetricCard>
                    ))}
                  </MetricsGrid>

                  {/* ── Lecturas activas en el curso ── */}
                  <LecturasPanel>
                    <LecturasSectionHeader>
                      <LecturasSectionIcon>📚</LecturasSectionIcon>
                      <div style={{ flex: 1 }}>
                        <SectionLabel>Lecturas activas en el curso</SectionLabel>
                        <SectionSub>
                          {assignedLecturas.length
                            ? `${assignedLecturas.length} lectura${assignedLecturas.length > 1 ? 's' : ''} publicada${assignedLecturas.length > 1 ? 's' : ''} para estudiantes`
                            : 'Aún no hay lecturas publicadas en este curso'}
                        </SectionSub>
                      </div>
                    </LecturasSectionHeader>

                    <LecturasActiveList>
                      {assignedLecturas.map((lectura) => {
                        const texto = textos.find(t => t.id === lectura.textoId);
                        const titulo = lectura.titulo || texto?.titulo || 'Lectura';
                        const isRemoving = _removingLecturaId === lectura.textoId;
                        const draftFechaLimite = Object.prototype.hasOwnProperty.call(lecturasFechaLimiteDrafts, lectura.textoId)
                          ? lecturasFechaLimiteDrafts[lectura.textoId]
                          : (lectura.fechaLimite || '');
                        const hasFechaLimiteChanges = (lectura.fechaLimite || '') !== draftFechaLimite;
                        const isSavingFechaLimite = savingLecturaFechaLimiteId === lectura.textoId;
                        const canClearFechaLimite = Boolean(draftFechaLimite || lectura.fechaLimite);
                        return (
                          <LecturaActiveCard key={lectura.textoId} $removing={isRemoving}>
                            <LecturaActiveInfo>
                              <LecturaActiveTitulo>{titulo}</LecturaActiveTitulo>
                              <LecturaActiveMeta>
                                <LecturaMetaTag>📖 {texto?.genero || 'Sin género'}</LecturaMetaTag>
                                <LecturaMetaTag>📊 {texto?.complejidad || 'intermedio'}</LecturaMetaTag>
                                <LecturaMetaTag>
                                  {lectura.fechaLimite ? `⏰ Vence: ${lectura.fechaLimite}` : '⏰ Sin fecha límite'}
                                </LecturaMetaTag>
                              </LecturaActiveMeta>
                            </LecturaActiveInfo>
                            <LecturaActiveActions>
                              <LecturaDeadlineField>
                                <LecturaDeadlineLabel htmlFor={`lectura-deadline-${lectura.textoId}`}>Fecha límite</LecturaDeadlineLabel>
                                <LecturaDeadlineInput
                                  id={`lectura-deadline-${lectura.textoId}`}
                                  type="date"
                                  value={draftFechaLimite}
                                  onChange={(e) => handleLecturaFechaLimiteDraftChange(lectura.textoId, e.target.value)}
                                  disabled={isRemoving || isSavingFechaLimite}
                                />
                              </LecturaDeadlineField>
                              <LecturaDeadlineButtons>
                                <LecturaDeadlineClearButton
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLecturaFechaLimiteDraftChange(lectura.textoId, '');
                                  }}
                                  disabled={!canClearFechaLimite || isRemoving || isSavingFechaLimite}
                                >
                                  Limpiar
                                </LecturaDeadlineClearButton>
                                <LecturaDeadlineSaveButton
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveLecturaFechaLimite(lectura.textoId);
                                  }}
                                  disabled={!hasFechaLimiteChanges || isRemoving || isSavingFechaLimite}
                                >
                                  {isSavingFechaLimite ? '⏳ Guardando...' : '💾 Guardar fecha'}
                                </LecturaDeadlineSaveButton>
                                <LecturaRemoveButton
                                  onClick={(e) => { e.stopPropagation(); handleRemoveLecturaFromCourse(lectura.textoId, titulo); }}
                                  disabled={isRemoving || isSavingFechaLimite}
                                  title={`Quitar "${titulo}" de este curso (no se elimina de tu biblioteca)`}
                                >
                                  {isRemoving ? '⏳' : '🗑️'} Quitar
                                </LecturaRemoveButton>
                              </LecturaDeadlineButtons>
                            </LecturaActiveActions>
                          </LecturaActiveCard>
                        );
                      })}
                      {!assignedLecturas.length && (
                        <LecturasEmptyState>
                          <span style={{ fontSize: '2rem' }}>📭</span>
                          <strong>Sin lecturas asignadas</strong>
                          <SmallMuted>Usa &quot;Editar selección&quot; para agregar lecturas de tu biblioteca</SmallMuted>
                        </LecturasEmptyState>
                      )}
                    </LecturasActiveList>

                    <LecturasGuardarRow>
                      <SecondaryButton type="button" onClick={() => setShowBiblioteca(prev => !prev)}>
                        {showBiblioteca ? '▲ Cerrar biblioteca' : '📂 Editar selección de lecturas'}
                      </SecondaryButton>
                    </LecturasGuardarRow>
                  </LecturasPanel>

                  {/* ── Biblioteca (colapsable) ── */}
                  <AnimatePresence>
                    {showBiblioteca && (
                      <LecturasPanel
                        as={motion.div}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <LecturasSectionHeader>
                          <LecturasSectionIcon>📂</LecturasSectionIcon>
                          <div style={{ flex: 1 }}>
                            <SectionLabel>Tu biblioteca de lecturas</SectionLabel>
                            <SectionSub>
                              Marca o desmarca lecturas y pulsa &quot;Aplicar cambios&quot;
                            </SectionSub>
                          </div>
                        </LecturasSectionHeader>

                        <LecturasBibliotecaList>
                          {textos.map(texto => {
                            const isAssigned = lecturasSeleccionadas.includes(texto.id);
                            return (
                              <LecturaBibliotecaCard
                                key={texto.id}
                                $selected={isAssigned}
                                onClick={() => handleLecturaToggle(texto.id)}
                                role="checkbox"
                                aria-checked={isAssigned}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleLecturaToggle(texto.id); } }}
                              >
                                <LecturaBibliotecaCheck $selected={isAssigned}>
                                  {isAssigned ? '✓' : ''}
                                </LecturaBibliotecaCheck>
                                <LecturaBibliotecaInfo>
                                  <LecturaBibliotecaTitulo>{texto.titulo}</LecturaBibliotecaTitulo>
                                  <LecturaActiveMeta>
                                    <LecturaMetaTag>📖 {texto.genero || 'Sin género'}</LecturaMetaTag>
                                    <LecturaMetaTag>📊 {texto.complejidad || 'intermedio'}</LecturaMetaTag>
                                  </LecturaActiveMeta>
                                </LecturaBibliotecaInfo>
                                <LecturaBibliotecaBadge $selected={isAssigned}>
                                  {isAssigned ? 'Incluida ✓' : 'No incluida'}
                                </LecturaBibliotecaBadge>
                              </LecturaBibliotecaCard>
                            );
                          })}
                          {!textos.length && (
                            <LecturasEmptyState>
                              <span style={{ fontSize: '2rem' }}>📁</span>
                              <strong>Biblioteca vacía</strong>
                              <SmallMuted>Sube lecturas (PDF o TXT) para poder asignarlas a tus cursos</SmallMuted>
                            </LecturasEmptyState>
                          )}
                        </LecturasBibliotecaList>

                        {textos.length > 0 && (
                          <LecturasGuardarRow>
                            <SmallMuted>{lecturasSeleccionadas.length} de {textos.length} lectura{textos.length > 1 ? 's' : ''} seleccionada{lecturasSeleccionadas.length !== 1 ? 's' : ''}</SmallMuted>
                            <ActionButton type="button" onClick={handleUpdateLecturas} disabled={savingLecturas}>
                              {savingLecturas ? '⏳ Guardando...' : '💾 Aplicar cambios'}
                            </ActionButton>
                          </LecturasGuardarRow>
                        )}
                      </LecturasPanel>
                    )}
                  </AnimatePresence>

                  {/* 🆕 Panel de ponderación formativa/sumativa */}
                  <WeightsPanel>
                    <PanelHeader>
                      <div>
                        <SectionLabel>⚖️ Ponderación de Evaluaciones</SectionLabel>
                        <SectionSub>
                          Formativa (5 artefactos): {pesoFormativa}% · Sumativa (ensayo): {pesoSumativa}%
                        </SectionSub>
                      </div>
                      <SecondaryButton type="button" onClick={() => setShowWeightsConfig(!showWeightsConfig)}>
                        {showWeightsConfig ? 'Cerrar' : '⚙️ Configurar'}
                      </SecondaryButton>
                    </PanelHeader>

                    <AnimatePresence>
                      {showWeightsConfig && (
                        <WeightsConfigPanel
                          as={motion.div}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <WeightsRow>
                            <WeightInputGroup>
                              <WeightLabel>📝 Formativa (5 artefactos)</WeightLabel>
                              <WeightInputRow>
                                <WeightInput
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={pesoFormativa}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setPesoFormativa(val);
                                    setPesoSumativa(100 - val);
                                  }}
                                />
                                <WeightValue>{pesoFormativa}%</WeightValue>
                              </WeightInputRow>
                            </WeightInputGroup>
                            <WeightInputGroup>
                              <WeightLabel>✍️ Sumativa (ensayo integrador)</WeightLabel>
                              <WeightInputRow>
                                <WeightInput
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={pesoSumativa}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setPesoSumativa(val);
                                    setPesoFormativa(100 - val);
                                  }}
                                />
                                <WeightValue>{pesoSumativa}%</WeightValue>
                              </WeightInputRow>
                            </WeightInputGroup>
                          </WeightsRow>
                          <WeightsPreview>
                            Nota final = (Promedio formativa × {pesoFormativa}% + Promedio sumativa × {pesoSumativa}%) / 100
                          </WeightsPreview>
                          <ActionButton type="button" onClick={handleSaveWeights} disabled={savingWeights} style={{ marginTop: '0.75rem' }}>
                            {savingWeights ? '⏳ Guardando...' : '💾 Guardar ponderación'}
                          </ActionButton>
                        </WeightsConfigPanel>
                      )}
                    </AnimatePresence>
                  </WeightsPanel>

                  <StudentsPanel>
                    <PanelHeader>
                      <div>
                        <SectionLabel>Estudiantes</SectionLabel>
                        <SectionSub>{courseMetrics?.resumen?.totalEstudiantes || 0} inscritos</SectionSub>
                      </div>
                      <ActionsRow>
                        <ActionButton type="button" onClick={() => exportMetrics('csv')}>
                          📊 CSV Resumen
                        </ActionButton>
                        <ActionButton type="button" onClick={() => exportMetrics('pdf')}>
                          📄 PDF Resumen
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={handleExportCourseData}
                          disabled={exporting}
                        >
                          {exporting ? '⏳ Exportando...' : '📑 CSV Detallado'}
                        </ActionButton>
                      </ActionsRow>
                    </PanelHeader>

                    {pendingStudents.length > 0 && (
                      <PendingNotice>
                        <strong>{pendingStudents.length} estudiante(s) por aprobar</strong>
                        <PendingList>
                          {pendingStudents.map(est => (
                            <PendingStudent key={est.id}>
                              <div>
                                <span>{est.estudianteNombre || est.id}</span>
                                <SmallMuted>Solicitó acceso recientemente</SmallMuted>
                              </div>
                              <ActionButton
                                type="button"
                                disabled={approvingStudent === est.estudianteUid}
                                onClick={() => handleApproveStudent(est.estudianteUid)}
                              >
                                {approvingStudent === est.estudianteUid ? 'Aprobando...' : 'Aprobar'}
                              </ActionButton>
                            </PendingStudent>
                          ))}
                        </PendingList>
                      </PendingNotice>
                    )}

                    {/* 🆕 NUEVA VISTA: Estudiantes con detalle por lectura */}
                    <StudentsList>
                      {(courseMetrics?.estudiantes || []).map(est => (
                        <StudentCard key={est.id}>
                          <StudentCardHeader
                            onClick={() => handleExpandStudent(est)}
                          >
                            <StudentMainInfo>
                              <StudentAvatar $active={est.estado === 'active'}>
                                {(est.estudianteNombre || est.id).charAt(0).toUpperCase()}
                              </StudentAvatar>
                              <StudentNameSection>
                                <StudentNameRow>
                                  <StudentFullName>{est.estudianteNombre || est.id}</StudentFullName>
                                  <StatusPill $estado={est.estado}>{est.estado}</StatusPill>
                                  {est.stats?.entregasRecientes > 0 && (
                                    <NewBadge title={`${est.stats.entregasRecientes} entrega(s) nueva(s)`}>
                                      🔴 {est.stats.entregasRecientes} nueva(s)
                                    </NewBadge>
                                  )}
                                </StudentNameRow>
                                <StudentQuickStats>
                                  <QuickStat>
                                    <span className="icon">📊</span>
                                    <span className="value">{est.stats?.avancePorcentaje ?? 0}%</span>
                                    <span className="label">avance</span>
                                  </QuickStat>
                                  <QuickStat>
                                    <span className="icon">⭐</span>
                                    <span className="value">{est.stats?.promedioScore ?? 0}</span>
                                    <span className="label">promedio</span>
                                  </QuickStat>
                                  <QuickStat>
                                    <span className="icon">📝</span>
                                    <span className="value">{est.stats?.artefactosEntregados ?? 0}</span>
                                    <span className="label">artefactos</span>
                                  </QuickStat>
                                </StudentQuickStats>
                              </StudentNameSection>
                            </StudentMainInfo>
                            <ExpandButton $expanded={expandedStudent === est.id}>
                              {expandedStudent === est.id ? '▲' : '▼'}
                            </ExpandButton>
                          </StudentCardHeader>

                          <AnimatePresence>
                            {expandedStudent === est.id && (
                              <StudentDetailPanel
                                as={motion.div}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <LecturasProgressSection>
                                  <LecturasProgressTitle>
                                    📚 Progreso por Lectura ({courseMetrics?.curso?.lecturasAsignadas?.length || 0} asignadas)
                                  </LecturasProgressTitle>

                                  {(courseMetrics?.curso?.lecturasAsignadas || []).map(lectura => {
                                    const lecturaProgress = est.lecturaDetails?.[lectura.textoId] || {};
                                    const artifacts = lecturaProgress.artifacts || {};
                                    const summativeEssays = lecturaProgress.summativeEssays || [];
                                    const submittedCount = Object.values(artifacts).filter(a => a?.submitted).length;

                                    // 🔧 Calcular nota formativa (promedio de artefactos con score >0)
                                    const scoredFormative = Object.values(artifacts).filter(a => (a?.rubricScore || 0) > 0);
                                    const formativeAvg = scoredFormative.length > 0
                                      ? scoredFormative.reduce((sum, a) => sum + (a?.rubricScore || 0), 0) / scoredFormative.length
                                      : 0;

                                    // 🔧 Calcular nota sumativa (promedio de ensayos con score >0)
                                    const scoredSummative = summativeEssays.filter(e => (e?.score || 0) > 0);
                                    const summativeAvg = scoredSummative.length > 0
                                      ? scoredSummative.reduce((sum, e) => sum + (e?.score || 0), 0) / scoredSummative.length
                                      : 0;

                                    // 🆕 Nota ponderada: si hay ambas → ponderar; si solo formativa → 100%; si solo sumativa → 100%
                                    let notaFinal = 0;
                                    if (formativeAvg > 0 && summativeAvg > 0) {
                                      notaFinal = (formativeAvg * pesoFormativa + summativeAvg * pesoSumativa) / 100;
                                    } else if (formativeAvg > 0) {
                                      notaFinal = formativeAvg;
                                    } else if (summativeAvg > 0) {
                                      notaFinal = summativeAvg;
                                    }
                                    const displayScore = notaFinal > 0 ? notaFinal.toFixed(1) : '0';

                                    return (
                                      <LecturaProgressCard key={lectura.textoId}>
                                        <LecturaProgressHeader>
                                          <LecturaInfo>
                                            <LecturaTitulo>{lectura.titulo || 'Sin título'}</LecturaTitulo>
                                            <LecturaAutor>{lectura.autor || 'Autor desconocido'}</LecturaAutor>
                                          </LecturaInfo>
                                          <LecturaStats>
                                            <LecturaStat $type="progress">
                                              <span className="value">{submittedCount}/5</span>
                                              <span className="label">entregados</span>
                                            </LecturaStat>
                                            <LecturaStat $type="score" $score={parseFloat(displayScore)}>
                                              <span className="value">{displayScore}</span>
                                              <span className="label">{formativeAvg > 0 && summativeAvg > 0 ? `pond. ${pesoFormativa}/${pesoSumativa}` : 'promedio'}</span>
                                            </LecturaStat>
                                          </LecturaStats>
                                          <LecturaActions>
                                            <SmallActionButton
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenResetModal(est, lectura);
                                              }}
                                              title="Ver detalles y gestionar"
                                            >
                                              👁️ Ver detalle
                                            </SmallActionButton>
                                          </LecturaActions>
                                        </LecturaProgressHeader>

                                        <ArtifactsMinigrid>
                                          {[
                                            { key: 'resumenAcademico', name: 'Resumen', icon: '📝' },
                                            { key: 'tablaACD', name: 'Tabla ACD', icon: '📊' },
                                            { key: 'mapaActores', name: 'Mapa', icon: '🗺️' },
                                            { key: 'respuestaArgumentativa', name: 'Respuesta', icon: '💬' },
                                            { key: 'bitacoraEticaIA', name: 'Bitácora', icon: '🤖' }
                                          ].map(art => {
                                            const artData = artifacts[art.key] || {};
                                            const status = artData.submitted ? 'submitted'
                                              : artData.attempts > 0 ? 'progress'
                                                : 'pending';

                                            return (
                                              <ArtifactMiniCard
                                                key={art.key}
                                                $status={status}
                                                title={`${art.name}: ${status === 'submitted' ? `Entregado - ${artData.rubricScore || 0}/10`
                                                  : status === 'progress' ? `En progreso (${artData.attempts || 0} intentos)`
                                                    : 'Sin iniciar'
                                                  }`}
                                              >
                                                <span className="icon">{art.icon}</span>
                                                <span className="status">
                                                  {status === 'submitted' && '✅'}
                                                  {status === 'progress' && '🔄'}
                                                  {status === 'pending' && '⏸️'}
                                                </span>
                                                {artData.rubricScore > 0 && (
                                                  <span className="score">{artData.rubricScore}</span>
                                                )}
                                              </ArtifactMiniCard>
                                            );
                                          })}
                                          {/* 🆕 Ensayo sumativo en la minigrid */}
                                          {(lecturaProgress.summativeEssays || []).map((essay, idx) => (
                                            <ArtifactMiniCard
                                              key={`ensayo-${idx}`}
                                              $status={essay.status === 'graded' ? 'submitted' : 'evaluated'}
                                              title={`Ensayo Integrador - ${essay.score}/10${essay.status === 'evaluated' ? ' (Evaluado, sin entregar)' : ''}`}
                                            >
                                              <span className="icon">✍️</span>
                                              <span className="status">{essay.status === 'graded' ? '✅' : '🔍'}</span>
                                              {essay.score > 0 && (
                                                <span className="score">{essay.score}</span>
                                              )}
                                            </ArtifactMiniCard>
                                          ))}
                                        </ArtifactsMinigrid>
                                      </LecturaProgressCard>
                                    );
                                  })}

                                  {!courseMetrics?.curso?.lecturasAsignadas?.length && (
                                    <NoLecturasMessage>
                                      No hay lecturas asignadas a este curso
                                    </NoLecturasMessage>
                                  )}
                                </LecturasProgressSection>

                                <StudentActionsBar>
                                  <DeleteStudentButton
                                    onClick={() => handleDeleteStudent(est.estudianteUid, est.estudianteNombre)}
                                    title="Eliminar estudiante del curso"
                                  >
                                    🗑️ Eliminar del curso
                                  </DeleteStudentButton>
                                </StudentActionsBar>
                              </StudentDetailPanel>
                            )}
                          </AnimatePresence>
                        </StudentCard>
                      ))}

                      {!courseMetrics?.estudiantes?.length && (
                        <EmptyStudentsMessage>
                          <span className="icon">👥</span>
                          <span className="text">No hay estudiantes en este curso todavía.</span>
                          <span className="hint">Comparte el código <strong>{selectedCourse?.codigoJoin}</strong> con tus estudiantes</span>
                        </EmptyStudentsMessage>
                      )}
                    </StudentsList>
                  </StudentsPanel>
                </>
              )}
            </motion.div>
          )}
        </RightColumn>
      </DashboardGrid>

      {feedback && (
        <FeedbackToast $type={feedback.type}>
          {feedback.message}
        </FeedbackToast>
      )}

      {/* Modal de Subida de Textos */}
      {showUploadModal && (
        <ModalOverlay>
          <ModalContent>
            <h3>Subir Nueva Lectura</h3>
            <form onSubmit={handleUploadText}>
              <label>
                Título
                <input
                  type="text"
                  value={newTextForm.titulo}
                  onChange={e => setNewTextForm({ ...newTextForm, titulo: e.target.value })}
                  placeholder="Ej: Don Quijote - Cap 1"
                  required
                />
              </label>
              <label>
                Autor (opcional)
                <input
                  type="text"
                  value={newTextForm.autor}
                  onChange={e => setNewTextForm({ ...newTextForm, autor: e.target.value })}
                  placeholder="Miguel de Cervantes"
                />
              </label>
              <label>
                Género (opcional)
                <input
                  type="text"
                  value={newTextForm.genero}
                  onChange={e => setNewTextForm({ ...newTextForm, genero: e.target.value })}
                  placeholder="Novela, Ensayo..."
                />
              </label>
              <label>
                Archivo (PDF, TXT o DOCX)
                <input
                  type="file"
                  accept=".pdf,.PDF,.txt,.TXT,.docx,.DOCX,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  required
                />
              </label>

              <ModalActions>
                <SecondaryButton type="button" onClick={() => setShowUploadModal(false)}>
                  Cancelar
                </SecondaryButton>
                <ActionButton type="submit" disabled={uploadingText}>
                  {uploadingText ? 'Subiendo...' : 'Subir Lectura'}
                </ActionButton>
              </ModalActions>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 🆕 Modal de Reset de Artefactos - Interfaz Completa para Investigación */}
      <AnimatePresence>
        {showResetModal && (
          <ResetModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseResetModal}
          >
            <ResetModalContent
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <ResetModalHeader>
                <h3>📊 Panel de Progreso del Estudiante</h3>
                <CloseModalButton onClick={handleCloseResetModal}>✕</CloseModalButton>
              </ResetModalHeader>

              <StudentInfoCard>
                <StudentInfoMain>
                  <StudentAvatar>👨‍🎓</StudentAvatar>
                  <StudentDetails>
                    <StudentName>{selectedStudentForReset?.estudianteNombre || 'N/A'}</StudentName>
                    <StudentMeta>
                      <MetaBadge $type="lecture">📄 {selectedLecturaForReset?.titulo || 'N/A'}</MetaBadge>
                      {artifactDetails?.lastUpdated && (
                        <MetaBadge $type="time">
                          🕐 Última actividad: {new Date(artifactDetails.lastUpdated?.seconds * 1000 || artifactDetails.lastUpdated).toLocaleDateString('es-CL')}
                        </MetaBadge>
                      )}
                    </StudentMeta>
                  </StudentDetails>
                </StudentInfoMain>
                {artifactDetails?.hasProgress && (
                  <ProgressSummaryBadges>
                    <SummaryBadge $color="#3b82f6">
                      <span className="number">{Object.values(artifactDetails.artifacts || {}).filter(a => a.submitted).length}</span>
                      <span className="label">Entregados</span>
                    </SummaryBadge>
                    <SummaryBadge $color="#f59e0b">
                      <span className="number">{Object.values(artifactDetails.artifacts || {}).reduce((sum, a) => sum + (a.attempts || 0), 0)}</span>
                      <span className="label">Intentos Totales</span>
                    </SummaryBadge>
                    <SummaryBadge $color="#10b981">
                      <span className="number">
                        {(() => {
                          const scored = Object.values(artifactDetails.artifacts || {}).filter(a => (a.rubricScore || 0) > 0);
                          return scored.length > 0 ? (scored.reduce((sum, a) => sum + (a.rubricScore || 0), 0) / scored.length).toFixed(1) : '0';
                        })()}
                      </span>
                      <span className="label">Promedio</span>
                    </SummaryBadge>
                  </ProgressSummaryBadges>
                )}
              </StudentInfoCard>

              {loadingArtifacts ? (
                <LoadingArtifacts>
                  <LoadingSpinner />
                  <span>Cargando datos del estudiante...</span>
                </LoadingArtifacts>
              ) : artifactDetails?.hasProgress ? (
                <>
                  <SectionTitle>📝 Detalle por Artefacto</SectionTitle>
                  <ArtifactsGrid>
                    {Object.entries(artifactDetails.artifacts).map(([key, artifact]) => (
                      <ArtifactCard key={key} $submitted={artifact.submitted} $hasAttempts={artifact.attempts > 0}>
                        <ArtifactHeader $submitted={artifact.submitted}>
                          <ArtifactIcon>{artifact.icon}</ArtifactIcon>
                          <ArtifactTitleGroup>
                            <ArtifactName>{artifact.name}</ArtifactName>
                            <ArtifactRubric>{artifact.rubric}</ArtifactRubric>
                          </ArtifactTitleGroup>
                          <ArtifactStatusBadge $submitted={artifact.submitted}>
                            {artifact.submitted ? '✅ Entregado' : artifact.attempts > 0 ? '🔄 En progreso' : '⏸️ Sin iniciar'}
                          </ArtifactStatusBadge>
                        </ArtifactHeader>

                        <ArtifactMetricsGrid>
                          <MetricBox $type="attempts" $warning={artifact.attempts >= 3}>
                            <MetricValue>{artifact.attempts || 0}<span>/3</span></MetricValue>
                            <MetricLabel>Intentos</MetricLabel>
                            <MetricBar>
                              <MetricBarFill $percent={(artifact.attempts || 0) / 3 * 100} $warning={artifact.attempts >= 3} />
                            </MetricBar>
                          </MetricBox>

                          <MetricBox $type="versions">
                            <MetricValue>{artifact.history?.length || 0}</MetricValue>
                            <MetricLabel>Versiones</MetricLabel>
                          </MetricBox>

                          <MetricBox $type="score" $success={artifact.rubricScore >= 7}>
                            <MetricValue>
                              {artifact.rubricScore || 0}<span>/10</span>
                            </MetricValue>
                            <MetricLabel>Puntaje</MetricLabel>
                          </MetricBox>
                        </ArtifactMetricsGrid>

                        {artifact.history?.length > 0 && (
                          <VersionsTimeline>
                            <TimelineTitle>📜 Historial de versiones</TimelineTitle>
                            <TimelineList>
                              {artifact.history.slice(-3).map((version, idx) => (
                                <TimelineItem key={idx}>
                                  <TimelineDot $isLatest={idx === artifact.history.slice(-3).length - 1} />
                                  <TimelineContent>
                                    <TimelineDate>
                                      {new Date(version.submittedAt || version.timestamp).toLocaleString('es-CL', {
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </TimelineDate>
                                    {version.score !== undefined && (
                                      <TimelineScore $score={version.score}>
                                        {version.score}/10
                                      </TimelineScore>
                                    )}
                                  </TimelineContent>
                                </TimelineItem>
                              ))}
                            </TimelineList>
                          </VersionsTimeline>
                        )}

                        <ArtifactActions>
                          {(artifact.submitted || artifact.attempts > 0 || artifact.draft || artifact.finalContent) && (
                            <ViewArtifactButton
                              onClick={() => handleViewArtifactContent(key, artifact)}
                            >
                              👁️ Ver trabajo
                            </ViewArtifactButton>
                          )}
                          <ResetArtifactButton
                            onClick={() => handleResetSingleArtifact(key, artifact.name)}
                            disabled={resettingArtifact === key || resettingArtifact === 'all'}
                            $disabled={resettingArtifact === key}
                          >
                            {resettingArtifact === key ? (
                              <><LoadingSpinnerSmall /> Reseteando...</>
                            ) : (
                              '🔄 Dar nueva oportunidad'
                            )}
                          </ResetArtifactButton>
                        </ArtifactActions>
                      </ArtifactCard>
                    ))}
                  </ArtifactsGrid>

                  {artifactDetails?.summativeEssays?.length > 0 && (
                    <>
                      <SectionTitle>📝 Ensayo Integrador (Sumativo)</SectionTitle>
                      <ArtifactsGrid>
                        {artifactDetails.summativeEssays.map((essay, idx) => {
                          const rubricId = essay?.rubricId;
                          const rubricNumber = rubricId ? String(rubricId).replace('rubrica', '') : '';
                          const hasEssayText = typeof essay?.essayContent === 'string' && essay.essayContent.trim() !== '';
                          const attemptsUsed = Number(essay?.attemptsUsed || 0);

                          return (
                            <ArtifactCard
                              key={`ensayo-${rubricId || rubricNumber || idx}`}
                              $submitted={true}
                              $hasAttempts={true}
                            >
                              <ArtifactHeader $submitted={true}>
                                <ArtifactIcon>📝</ArtifactIcon>
                                <ArtifactTitleGroup>
                                  <ArtifactName>Ensayo Integrador</ArtifactName>
                                  <ArtifactRubric>Rúbrica {rubricNumber || '—'}</ArtifactRubric>
                                </ArtifactTitleGroup>
                                <ArtifactStatusBadge $submitted={true}>
                                  ✅ Evaluado
                                </ArtifactStatusBadge>
                              </ArtifactHeader>

                              <ArtifactMetricsGrid>
                                <MetricBox $type="attempts" $warning={attemptsUsed >= 1}>
                                  <MetricValue>
                                    {attemptsUsed}<span>/1</span>
                                  </MetricValue>
                                  <MetricLabel>Intentos (ensayo)</MetricLabel>
                                  <MetricBar>
                                    <MetricBarFill $percent={Math.min(100, (attemptsUsed / 1) * 100)} $warning={attemptsUsed >= 1} />
                                  </MetricBar>
                                </MetricBox>

                                <MetricBox $type="versions">
                                  <MetricValue>{hasEssayText ? 1 : 0}</MetricValue>
                                  <MetricLabel>Texto guardado</MetricLabel>
                                </MetricBox>

                                <MetricBox $type="score" $success={(Number(essay?.score || 0)) >= 7}>
                                  <MetricValue>
                                    {Number(essay?.score || 0)}<span>/10</span>
                                  </MetricValue>
                                  <MetricLabel>Nota</MetricLabel>
                                </MetricBox>
                              </ArtifactMetricsGrid>

                              <ArtifactActions>
                                <ViewArtifactButton onClick={() => handleViewSummativeEssay(essay)}>
                                  👁️ Ver ensayo
                                </ViewArtifactButton>
                              </ArtifactActions>
                            </ArtifactCard>
                          );
                        })}
                      </ArtifactsGrid>
                    </>
                  )}

                  {/* 🆕 Panel para ver contenido del trabajo */}
                  <AnimatePresence>
                    {viewingArtifact && (
                      <ViewContentPanel
                        as={motion.div}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <ViewContentHeader>
                          <ViewContentTitle>
                            📄 {viewingArtifact.name} - Trabajo del estudiante
                          </ViewContentTitle>
                          <CloseViewButton onClick={() => setViewingArtifact(null)}>
                            ✕
                          </CloseViewButton>
                        </ViewContentHeader>

                        <ViewContentBody>
                          {viewingArtifact.content ? (
                            <StudentWorkContent $structured={workDisplay?.structured}>
                              {workDisplay?.node}
                            </StudentWorkContent>
                          ) : (
                            <NoContentMessage>
                              El estudiante aún no ha escrito contenido en este artefacto.
                            </NoContentMessage>
                          )}

                          {viewingArtifact.submitted && (
                            <SubmittedBadge>
                              ✅ Entregado • Puntaje: {viewingArtifact.teacherOverrideScore != null ? viewingArtifact.teacherOverrideScore : viewingArtifact.score}/10
                              {viewingArtifact.teacherOverrideScore != null && (
                                <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: '0.5em' }}>
                                  (editado por docente)
                                </span>
                              )}
                            </SubmittedBadge>
                          )}
                        </ViewContentBody>

                        <TeacherCommentSection>
                          {/* 🆕 Human-on-the-loop: Edición de nota por el docente */}
                          <ScoreEditSection>
                            <CommentLabel>📝 Calificación (editable por docente):</CommentLabel>
                            <ScoreEditRow>
                              <ScoreInput
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={teacherScoreEdit}
                                onChange={(e) => setTeacherScoreEdit(e.target.value)}
                                disabled={savingScore}
                              />
                              <span>/10</span>
                            </ScoreEditRow>
                            <CommentLabel style={{ marginTop: '0.5rem' }}>
                              📌 Motivo del cambio de nota <span style={{ fontSize: '0.8em', color: '#ef4444' }}>(obligatorio)</span>:
                            </CommentLabel>
                            <CommentTextarea
                              value={scoreOverrideReason}
                              onChange={(e) => setScoreOverrideReason(e.target.value)}
                              placeholder="Ej: Se ajusta la nota por participación activa en clase y calidad de las evidencias..."
                              rows={2}
                              style={{ fontSize: '0.85rem' }}
                            />
                            <SaveScoreButton
                              onClick={handleSaveTeacherScore}
                              disabled={savingScore || !scoreOverrideReason || scoreOverrideReason.trim().length < 5}
                              title={!scoreOverrideReason || scoreOverrideReason.trim().length < 5 ? 'Escribe el motivo del cambio (mín. 5 caracteres)' : 'Guardar nota modificada'}
                            >
                              {savingScore ? '⏳ Guardando...' : '💾 Guardar nota'}
                            </SaveScoreButton>
                            {viewingArtifact.scoreOverrideReason && (
                              <ScoreOverrideInfo>
                                📌 Último cambio: "{viewingArtifact.scoreOverrideReason}"
                              </ScoreOverrideInfo>
                            )}
                          </ScoreEditSection>

                          <>
                            <CommentLabel>💬 Comentario general del docente <span style={{ fontSize: '0.8em', opacity: 0.6 }}>(opcional, independiente de la nota)</span>:</CommentLabel>
                            <CommentTextarea
                              value={teacherComment}
                              onChange={(e) => setTeacherComment(e.target.value)}
                              placeholder="Escribe un comentario para el estudiante sobre su trabajo..."
                              rows={3}
                            />
                            <CommentActions>
                              <SaveCommentButton
                                onClick={handleSaveTeacherComment}
                                disabled={savingComment || teacherComment === viewingArtifact.teacherComment}
                              >
                                {savingComment ? '⏳ Guardando...' : '💾 Guardar comentario'}
                              </SaveCommentButton>
                              {viewingArtifact.teacherComment && (
                                <>
                                  <DeleteCommentButton
                                    onClick={handleDeleteTeacherComment}
                                    disabled={savingComment}
                                    title="Borrar comentario y notificación del estudiante"
                                  >
                                    🗑️ Borrar
                                  </DeleteCommentButton>
                                  <CommentSavedIndicator>
                                    ✅ Comentario guardado anteriormente
                                  </CommentSavedIndicator>
                                </>
                              )}
                            </CommentActions>
                          </>
                        </TeacherCommentSection>
                      </ViewContentPanel>
                    )}
                  </AnimatePresence>

                  <ResetAllSection>
                    <ResetAllWarning>
                      ⚠️ <strong>Acción destructiva:</strong> Resetear todos elimina completamente el progreso del estudiante en esta lectura, incluyendo intentos, versiones y calificaciones.
                    </ResetAllWarning>
                    <ResetAllButton
                      onClick={handleResetAllArtifacts}
                      disabled={resettingArtifact === 'all'}
                    >
                      {resettingArtifact === 'all' ? (
                        <><LoadingSpinnerSmall /> Reseteando todos...</>
                      ) : (
                        '🗑️ Resetear TODOS los artefactos'
                      )}
                    </ResetAllButton>
                  </ResetAllSection>
                </>
              ) : (
                <NoProgressMessage>
                  <NoProgressIcon>📭</NoProgressIcon>
                  <NoProgressTitle>Sin progreso registrado</NoProgressTitle>
                  <NoProgressText>Este estudiante aún no ha iniciado ningún artefacto en esta lectura.</NoProgressText>
                </NoProgressMessage>
              )}

              <ResetModalFooter>
                <SecondaryButton onClick={handleCloseResetModal}>
                  Cerrar
                </SecondaryButton>
              </ResetModalFooter>
            </ResetModalContent>
          </ResetModalOverlay>
        )}
      </AnimatePresence>
    </DashboardWrapper>
  );
}

const DashboardWrapper = styled.section`
  width: 100%;
  box-sizing: border-box;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-x: hidden;

  @media (max-width: 640px) {
    padding: 1rem;
    gap: 1rem;
  }
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  gap: 1.5rem;

  & > * {
    min-width: 0;
  }

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const UploadSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem;
  background: ${props => props.theme.surface};
  border: 1px dashed ${props => props.theme.primary};
  border-radius: 12px;
  margin-bottom: 1rem;
`;

const SectionLabel = styled.span`
  font-weight: 600;
  font-size: 1rem;
`;

const SectionSub = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
`;

const ActionButton = styled.button`
  background: ${props => props.theme.primary};
  color: ${props => props.theme.name === 'dark' ? props.theme.backgroundSecondary : '#fff'};
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  min-width: 140px;
  min-height: 44px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    width: 100%;
    min-width: 0;
  }
`;

const CoursesScroller = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.4rem;
`;

const CourseCard = styled.div`
  border: 2px solid ${props => props.$active ? props.theme.primary : props.theme.border};
  padding: 1rem 1.15rem;
  border-radius: 14px;
  cursor: pointer;
  background: ${props => props.$active ? props.theme.surfaceHover : props.theme.surface};
  box-shadow: ${props => props.$active ? '0 6px 18px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.06)'};
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &:hover {
    border-color: ${props => props.theme.primary};
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
`;

const CourseCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const CourseTitle = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
`;

const CourseDeleteBtn = styled.button`
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  padding: 0.25rem;
  border-radius: 6px;

  &:hover {
    background: ${props => props.theme.error}22;
    opacity: 1;
  }

  ${CourseCard}:hover & {
    opacity: 0.6;
  }
`;

const CourseMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const CourseBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
  background: ${props => {
    if (props.$variant === 'success') return (props.theme.name === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)');
    if (props.$variant === 'warning') return (props.theme.name === 'dark' ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.1)');
    return props.theme.name === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.1)';
  }};
  color: ${props => props.theme.textMuted};
`;

const CourseCodeStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.75rem;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
`;

const CourseCodeLabel = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  white-space: nowrap;
`;

const CourseCodeValue = styled.strong`
  font-size: 1rem;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.08em;
  color: ${props => props.theme.primary};
`;

const CourseMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const CreateCourseCard = styled.div`
  border: 1px dashed ${props => props.theme.borderLight || props.theme.border};
  border-radius: 16px;
  padding: 1.25rem;
  background: ${props => props.theme.surface};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CreateCourseHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
`;

const FormFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const FormLabel = styled.label`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const FormInput = styled.input`
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  transition: border-color 0.2s;

  &:focus {
    border-color: ${props => props.theme.primary};
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.primary}33;
  }
`;

const FormTextarea = styled.textarea`
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${props => props.theme.primary};
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.primary}33;
  }
`;

const FormDivider = styled.div`
  height: 1px;
  background: ${props => props.theme.border};
  margin: 0.25rem 0;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem 0;
`;

const ToggleTrack = styled.div`
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: ${props => props.$active ? props.theme.primary : (props.theme.name === 'dark' ? '#444' : '#ccc')};
  position: relative;
  transition: background 0.25s;
  flex-shrink: 0;
`;

const ToggleThumb = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  left: ${props => props.$active ? '20px' : '2px'};
  transition: left 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
`;

const ToggleLabel = styled.span`
  font-size: 0.82rem;
  font-weight: 500;
  color: ${props => props.$active ? props.theme.text : props.theme.textMuted};
`;

const FormLecturasGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const FormLecturaCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid ${props => props.$selected ? props.theme.primary : props.theme.border};
  border-radius: 10px;
  background: ${props => props.$selected ? (props.theme.name === 'dark' ? 'rgba(91,165,253,0.08)' : 'rgba(59,130,246,0.05)') : props.theme.surface};
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    border-color: ${props => props.theme.primary};
    background: ${props => props.theme.surfaceHover};
  }
`;

const FormLecturaCheck = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid ${props => props.$selected ? props.theme.primary : props.theme.border};
  background: ${props => props.$selected ? props.theme.primary : 'transparent'};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.2s;
`;

const FormLecturaInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FormLecturaTitulo = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FormLecturaDeleteBtn = styled.button`
  background: none;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0.35;
  padding: 0.2rem 0.35rem;
  border-radius: 6px;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    background: ${props => props.theme.error}22;
  }
`;

const FormLecturasCount = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.theme.primary};
  margin-top: 0.3rem;
`;

const CourseForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const FormRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SmallMuted = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const EmptyState = styled.div`
  border: 1px dashed ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  background: ${props => props.theme.surface};
`;

const InlineLoader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const InlineSpinner = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(148, 163, 184, 0.3);
  border-top-color: ${props => props.theme.primary};
  animation: ${spin} 0.8s linear infinite;
`;

const CourseHeaderCard = styled.div`
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  padding: 1.5rem;
  background: ${props => props.theme.surface};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 1rem;
    gap: 1rem;
  }
`;

const CourseCodeBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 180px;
  padding: 0.75rem;
  background: ${props => props.theme.background};
  border-radius: 12px;
  text-align: center;

  & > button {
    width: 100%;
    margin-left: 0 !important;
  }

  @media (max-width: 640px) {
    min-width: 0;
    width: 100%;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const MetricCard = styled.div`
  border-radius: 12px;
  padding: 1rem;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.25rem;

  span {
    font-size: 0.75rem;
    color: ${props => props.$accent};
    font-weight: 600;
    line-height: 1.2;
  }

  strong {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const LecturasPanel = styled.div`
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  padding: 1.25rem;
  background: ${props => props.theme.surface};
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const LecturasSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const LecturasSectionIcon = styled.span`
  font-size: 1.6rem;
  line-height: 1;
`;

const LecturasActiveList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.25rem;
`;

const LecturaActiveCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: ${props => props.theme.surfaceHover};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  transition: all 0.2s ease;
  opacity: ${props => props.$removing ? 0.5 : 1};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const LecturaActiveInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  min-width: 0;
`;

const LecturaActiveTitulo = styled.span`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LecturaActiveMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const LecturaMetaTag = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  background: ${props => props.theme.background};
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
`;

const LecturaActiveActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 220px;

  @media (max-width: 640px) {
    min-width: 0;
    width: 100%;
  }
`;

const LecturaDeadlineField = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;

  @media (max-width: 640px) {
    justify-content: space-between;
  }
`;

const LecturaDeadlineLabel = styled.label`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${props => props.theme.textMuted};
  white-space: nowrap;
`;

const LecturaDeadlineInput = styled.input`
  width: 148px;
  max-width: 100%;
  min-height: 34px;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  padding: 0.25rem 0.5rem;
  font-size: 0.78rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(91, 165, 253, 0.22)' : 'rgba(49, 144, 252, 0.15)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LecturaDeadlineButtons = styled.div`
  display: flex;
  gap: 0.45rem;
  justify-content: flex-end;

  @media (max-width: 640px) {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
`;

const LecturaDeadlineClearButton = styled.button`
  background: transparent;
  color: ${props => props.theme.textMuted};
  border: 1px solid ${props => props.theme.borderDark || props.theme.border};
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  min-height: 36px;

  &:hover:not(:disabled) {
    background: ${props => props.theme.surfaceHover};
    color: ${props => props.theme.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LecturaDeadlineSaveButton = styled.button`
  background: ${props => props.theme.primary};
  color: ${props => props.theme.name === 'dark' ? props.theme.backgroundSecondary : 'white'};
  border: 1px solid ${props => props.theme.primary};
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  min-height: 36px;

  &:hover:not(:disabled) {
    background: ${props => props.theme.primaryDark || props.theme.primary};
    border-color: ${props => props.theme.primaryDark || props.theme.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LecturaRemoveButton = styled.button`
  background: transparent;
  color: ${props => props.theme.error};
  border: 1px solid ${props => props.theme.error};
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  min-height: 36px;

  &:hover:not(:disabled) {
    background: ${props => props.theme.error};
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LecturasEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
  color: ${props => props.theme.textMuted};
  border: 1px dashed ${props => props.theme.border};
  border-radius: 12px;

  strong {
    color: ${props => props.theme.text};
    font-size: 0.95rem;
  }
`;

const LecturasBibliotecaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 0.25rem;
`;

const LecturaBibliotecaCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.$selected ? props.theme.primary : props.theme.border};
  background: ${props => props.$selected ? (props.theme.name === 'dark' ? 'rgba(49,144,252,0.08)' : '#EFF6FF') : props.theme.surface};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;

  &:hover {
    border-color: ${props => props.$selected ? props.theme.primary : props.theme.borderDark};
    background: ${props => props.$selected ? (props.theme.name === 'dark' ? 'rgba(49,144,252,0.12)' : '#DBEAFE') : props.theme.surfaceHover};
  }

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

const LecturaBibliotecaCheck = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid ${props => props.$selected ? props.theme.primary : props.theme.border};
  background: ${props => props.$selected ? props.theme.primary : 'transparent'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.15s ease;
`;

const LecturaBibliotecaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`;

const LecturaBibliotecaTitulo = styled.span`
  font-weight: 600;
  font-size: 0.9rem;
  color: ${props => props.theme.text};
`;

const LecturaBibliotecaBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
  background: ${props => props.$selected ? (props.theme.name === 'dark' ? 'rgba(49,144,252,0.2)' : '#DBEAFE') : props.theme.surfaceHover};
  color: ${props => props.$selected ? props.theme.primary : props.theme.textMuted};
`;

const LecturasGuardarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${props => props.theme.border};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const WeightsPanel = styled.div`
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  padding: 1rem;
  background: ${props => props.theme.surface};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const WeightsConfigPanel = styled.div`
  overflow: hidden;
  padding-top: 0.5rem;
`;

const WeightsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const WeightInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const WeightLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const WeightInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const WeightInput = styled.input`
  flex: 1;
  accent-color: ${props => props.theme.primary};
  height: 6px;
  cursor: pointer;
`;

const WeightValue = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
  min-width: 3rem;
  text-align: center;
`;

const WeightsPreview = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  background: ${props => props.theme.surfaceHover || 'rgba(0,0,0,0.03)'};
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  margin-top: 0.5rem;
  text-align: center;
`;

const StudentsPanel = styled.div`
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  padding: 1rem;
  background: ${props => props.theme.surface};
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

const PendingNotice = styled.div`
  background: rgba(244, 114, 182, 0.08);
  border: 1px solid rgba(244, 114, 182, 0.3);
  border-radius: 12px;
  padding: 0.75rem;
`;

const PendingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const PendingStudent = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed ${props => props.theme.border};

  &:last-child {
    border-bottom: none;
  }
`;

const _StudentsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  max-width: 100%;

  th, td {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid ${props => props.theme.border};
  }

  th {
    font-size: 0.85rem;
    color: ${props => props.theme.textMuted};
    font-weight: 600;
  }

  @media (max-width: 640px) {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${props => props.$estado === 'active' ? 'rgba(16, 185, 129, 0.15)' : props.$estado === 'pending' ? 'rgba(250, 204, 21, 0.2)' : 'rgba(148, 163, 184, 0.2)'};
  color: ${props => props.$estado === 'active' ? '#059669' : props.$estado === 'pending' ? '#B45309' : '#475569'};
`;

const FeedbackToast = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 0.85rem 1.25rem;
  border-radius: 10px;
  color: #fff;
  background: ${props => props.$type === 'error' ? '#DC2626' : '#059669'};
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  z-index: 1000;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.surface};
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);

  @media (max-width: 640px) {
    padding: 1.25rem;
    border-radius: 12px;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  input {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid ${props => props.theme.border};
    border-radius: 8px;
    background: ${props => props.theme.background};
    color: ${props => props.theme.text};
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const SecondaryButton = styled.button`
  background: transparent;
  border: 1px solid ${props => props.theme.border};
  color: ${props => props.theme.text};
  padding: 0.5rem 1rem;
  min-width: 140px;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.background};
    transform: translateY(-1px);
  }

  @media (max-width: 640px) {
    width: 100%;
    min-width: 0;
  }
`;

// 🆕 Styled Components para Dropdown de Reset
const _ResetDropdown = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover > div {
    display: block;
  }
`;

const _ResetDropdownButton = styled.button`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
`;

const _ResetDropdownContent = styled.div`
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  min-width: 220px;
  max-width: 92vw;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;

  @media (max-width: 640px) {
    min-width: 180px;
    right: 0;
  }
`;

const _ResetDropdownHeader = styled.div`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.surfaceHover};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.theme.textMuted};
  border-bottom: 1px solid ${props => props.theme.border};
`;

const _ResetDropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: ${props => props.theme.text};
  cursor: pointer;
  transition: background 0.15s ease;
  
  &:hover:not(:disabled) {
    background: ${props => props.theme.surfaceHover};
    color: ${props => props.theme.primary};
  }
  
  &:disabled {
    color: ${props => props.theme.disabledText};
    cursor: not-allowed;
  }
`;

// 🆕 Styled Components para Modal de Reset - Interfaz Completa de Investigación
const ResetModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ResetModalContent = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 20px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
`;

const ResetModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 20px 20px 0 0;
  
  h3 {
    margin: 0;
    color: white;
    font-size: 1.4rem;
    font-weight: 700;
  }
`;

const CloseModalButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }
`;

// Card de información del estudiante
const StudentInfoCard = styled.div`
  background: ${props => props.theme.surface};
  margin: 1.5rem;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  
  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  @media (max-width: 640px) {
    margin: 1rem;
    padding: 1rem;
  }
`;

const StudentInfoMain = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StudentAvatar = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
`;

const StudentDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StudentName = styled.h4`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.theme.text};
`;

const StudentMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => props.$type === 'lecture' ? props.theme.infoBg : props.theme.surfaceHover};
  color: ${props => props.$type === 'lecture' ? props.theme.infoLight : props.theme.textMuted};
`;

const ProgressSummaryBadges = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const SummaryBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: ${props => `${props.$color}10`};
  border: 2px solid ${props => `${props.$color}30`};
  border-radius: 12px;
  min-width: 90px;
  
  .number {
    font-size: 1.5rem;
    font-weight: 800;
    color: ${props => props.$color};
    line-height: 1;
  }
  
  .label {
    font-size: 0.7rem;
    font-weight: 600;
    color: ${props => props.theme.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0.25rem;
  }
`;

const LoadingArtifacts = styled.div`
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: ${props => props.theme.textMuted};
  font-size: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.theme.border};
  border-top-color: ${props => props.theme.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingSpinnerSmall = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 0.5rem;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SectionTitle = styled.h4`
  margin: 0 1.5rem 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: ${props => props.theme.text};
`;

const ArtifactsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  padding: 1rem 1.5rem 1.5rem;

  @media (max-width: 640px) {
    padding: 0.75rem 1rem 1rem;
  }
`;

const ArtifactCard = styled.div`
  background: ${props => props.theme.surface};
  border: 2px solid ${props =>
    props.$submitted ? '#86efac' :
      props.$hasAttempts ? '#fde047' : '#e5e7eb'};
  border-radius: 16px;
  padding: 1.25rem;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  min-height: 320px;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  }

  @media (max-width: 640px) {
    min-height: 0;
  }
`;

const ArtifactHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.border};
`;

const ArtifactIcon = styled.span`
  font-size: 2rem;
  line-height: 1;
`;

const ArtifactTitleGroup = styled.div`
  flex: 1;
`;

const ArtifactName = styled.div`
  font-weight: 700;
  color: ${props => props.theme.text};
  font-size: 1rem;
  line-height: 1.2;
`;

const ArtifactRubric = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.textMuted};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.25rem;
`;

const ArtifactStatusBadge = styled.span`
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  background: ${props => props.$submitted ? '#dcfce7' : '#fef3c7'};
  color: ${props => props.$submitted ? '#166534' : '#92400e'};
`;

const ArtifactMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MetricBox = styled.div`
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: ${props => {
    if (props.$type === 'score' && props.$success) return '#f0fdf4';
    if (props.$warning) return '#fef2f2';
    return props.theme.surfaceHover;
  }};
  border-radius: 10px;
  position: relative;
`;

const MetricValue = styled.div`
  font-size: clamp(1.1rem, 4vw, 1.5rem);
  font-weight: 800;
  color: ${props => props.theme.text};
  line-height: 1;
  
  span {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${props => props.theme.textMuted};
  }
`;

const MetricLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.35rem;
`;

const MetricBar = styled.div`
  height: 4px;
  background: ${props => props.theme.border};
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const MetricBarFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => props.$warning ? '#ef4444' : '#3b82f6'};
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const _ScoreRing = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 28px;
  height: 28px;
  
  svg {
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
  }
`;

const VersionsTimeline = styled.div`
  background: ${props => props.theme.surfaceHover};
  border-radius: 10px;
  padding: 0.75rem;
  margin-bottom: 1rem;
`;

const TimelineTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${props => props.theme.textMuted};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TimelineItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TimelineDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$isLatest ? '#3b82f6' : '#cbd5e1'};
  flex-shrink: 0;
`;

const TimelineContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
`;

const TimelineDate = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const TimelineScore = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: ${props =>
    props.$score >= 7 ? '#dcfce7' :
      props.$score >= 4 ? '#fef3c7' : '#fee2e2'};
  color: ${props =>
    props.$score >= 7 ? '#166534' :
      props.$score >= 4 ? '#92400e' : '#991b1b'};
`;

const ResetArtifactButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: ${props => props.$disabled ? props.theme.disabled : `linear-gradient(135deg, ${props.theme.primary} 0%, ${props.theme.primaryDark || props.theme.primary} 100%)`};
  color: ${props => props.$disabled ? props.theme.disabledText : (props.theme.name === 'dark' ? props.theme.backgroundSecondary : 'white')};
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
  }
`;

const ResetAllSection = styled.div`
  margin: 0 1.5rem 1.5rem;
  padding: 1.25rem;
  background: ${props => props.theme.surface};
  border: 2px solid #fecaca;
  border-radius: 12px;
`;

const ResetAllWarning = styled.p`
  margin: 0 0 1rem 0;
  color: #991b1b;
  font-size: 0.85rem;
  line-height: 1.5;
`;

const ResetAllButton = styled.button`
  width: 100%;
  padding: 0.85rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const NoProgressMessage = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  background: ${props => props.theme.surface};
  margin: 1.5rem;
  border-radius: 16px;
`;

const NoProgressIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const NoProgressTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: ${props => props.theme.text};
`;

const NoProgressText = styled.p`
  margin: 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.95rem;
`;

const ResetModalFooter = styled.div`
  padding: 1.25rem 2rem;
  border-top: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  border-radius: 0 0 20px 20px;
  display: flex;
  justify-content: flex-end;
`;

// 🆕 Styled components para vista de contenido y comentarios
const ArtifactActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
`;

const ViewArtifactButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
  }
`;

const ViewContentPanel = styled.div`
  margin: 1rem 1.5rem;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  border: 2px solid #3b82f6;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
  @media (max-width: 640px) {
    margin: 0.75rem 1rem;
    border-radius: 12px;
  }
`;

const ViewContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  @media (max-width: 640px) {
    padding: 0.75rem 1rem;
  }
`;

const ViewContentTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

const CloseViewButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ViewContentBody = styled.div`
  padding: 1.5rem;
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const StudentWorkContent = styled.div`
  background: ${props => props.theme.surfaceHover};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.25rem;
  font-size: 0.95rem;
  line-height: 1.7;
  color: ${props => props.theme.text};
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: ${props => props.$structured ? 'inherit' : "'Georgia', serif"};
  @media (max-width: 640px) {
    max-height: 240px;
    font-size: 0.9rem;
  }
`;

const WorkFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const WorkField = styled.div`
  padding: 0.85rem 0.95rem;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 10px;
`;

const WorkFieldLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 0.4rem;
`;

const WorkFieldValue = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${props => props.theme.text};
  white-space: pre-wrap;
`;

const WorkEmptyValue = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.textMuted};
`;

const WorkFieldPre = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.55;
  color: ${props => props.theme.text};
`;

const NoContentMessage = styled.div`
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 12px;
  padding: 1.25rem;
  color: #92400e;
  text-align: center;
  font-size: 0.9rem;
`;

const SubmittedBadge = styled.div`
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-radius: 10px;
  color: #166534;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
`;

const TeacherCommentSection = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.infoBg};
  border-top: 1px solid ${props => props.theme.border};

  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const CommentLabel = styled.label`
  display: block;
  font-weight: 600;
  color: ${props => props.theme.infoLight};
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: block;
  padding: 1rem;
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  border: 2px solid ${props => props.theme.border};
  border-radius: 10px;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(91, 165, 253, 0.22)' : 'rgba(49, 144, 252, 0.15)'};
  }
  
  &::placeholder {
    color: ${props => props.theme.textMuted};
  }
`;

const CommentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    gap: 0.75rem;
  }
`;

const SaveCommentButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;

  @media (max-width: 640px) {
    width: 100%;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const DeleteCommentButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: ${props => props.theme.error};
  border: 1px solid ${props => props.theme.error};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;

  @media (max-width: 640px) {
    width: 100%;
  }
  
  &:hover:not(:disabled) {
    background: ${props => props.theme.error};
    color: white;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CommentSavedIndicator = styled.span`
  color: ${props => props.theme.success};
  font-size: 0.85rem;
  font-weight: 500;
`;

// 🆕 Styled components para edición de nota por el docente
const ScoreEditSection = styled.div`
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.border};
`;

const ScoreEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
  
  & > span {
    font-weight: 600;
    font-size: 1rem;
    color: ${props => props.theme.text};
  }
`;

const ScoreInput = styled.input`
  width: 80px;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  background: ${props => props.theme.surface};
  border: 2px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  color: ${props => props.theme.text};
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(91, 165, 253, 0.22)' : 'rgba(49, 144, 252, 0.15)'};
  }
  
  &:disabled {
    opacity: 0.6;
    background: ${props => props.theme.disabled};
  }
`;

const SaveScoreButton = styled.button`
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;

  @media (max-width: 640px) {
    width: 100%;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ScoreOverrideInfo = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #92400e;
`;

const NewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`;

// 🆕 Styled components para nueva vista de estudiantes con detalle por lectura
const StudentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StudentCard = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  border: 1px solid ${props => props.theme.border};
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const StudentCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  cursor: pointer;
  background: ${props => props.theme.surfaceHover};
  border-bottom: 1px solid ${props => props.theme.border};
  gap: 0.75rem;
  flex-wrap: wrap;
  
  &:hover {
    background: ${props => props.theme.hover};
  }

  @media (max-width: 640px) {
    padding: 0.85rem 1rem;
  }
`;

const StudentMainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
`;

const StudentNameSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
`;

const StudentNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const StudentFullName = styled.span`
  font-size: clamp(0.95rem, 2.6vw, 1.05rem);
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const StudentQuickStats = styled.div`
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  @media (max-width: 640px) {
    gap: 0.75rem;
  }
`;

const QuickStat = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
  
  .icon { font-size: 0.9rem; }
  .value { font-weight: 600; color: ${props => props.theme.text}; }
  .label { color: ${props => props.theme.textMuted}; }
`;

const ExpandButton = styled.button`
  background: ${props => props.$expanded ? props.theme.primary : props.theme.border};
  color: ${props => props.$expanded ? (props.theme.name === 'dark' ? props.theme.backgroundSecondary : 'white') : props.theme.textMuted};
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$expanded ? (props.theme.primaryDark || props.theme.primary) : props.theme.borderLight};
  }
`;

const StudentDetailPanel = styled.div`
  overflow: hidden;
  background: ${props => props.theme.surface};
`;

const LecturasProgressSection = styled.div`
  padding: 1.25rem;
`;

const LecturasProgressTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const LecturaProgressCard = styled.div`
  background: ${props => props.theme.surfaceHover};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LecturaProgressHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const LecturaInfo = styled.div`
  flex: 1;
  min-width: 200px;

  @media (max-width: 640px) {
    min-width: 0;
    width: 100%;
  }
`;

const LecturaTitulo = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
`;

const LecturaAutor = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const LecturaStats = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const LecturaStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: ${props => {
    const isDark = props.theme.name === 'dark';
    if (props.$type === 'score') {
      const score = props.$score || 0;
      if (score >= 7) return isDark ? 'rgba(38, 166, 154, 0.2)' : '#dcfce7';
      if (score >= 4) return isDark ? 'rgba(255, 183, 77, 0.2)' : '#fef3c7';
      if (score > 0) return isDark ? 'rgba(255, 107, 107, 0.2)' : '#fee2e2';
      return props.theme.surface;
    }
    return props.theme.surface;
  }};
  border-radius: 8px;
  min-width: 60px;
  
  .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${props => {
      if (props.$type === 'score') {
        const score = props.$score || 0;
        if (score >= 7) return props.theme.name === 'dark' ? props.theme.successLight : '#166534';
        if (score >= 4) return props.theme.name === 'dark' ? props.theme.warningLight : '#92400e';
        if (score > 0) return props.theme.name === 'dark' ? props.theme.errorLight : '#991b1b';
        return props.theme.textMuted;
      }
      return props.theme.primary;
    }};
  }
  
  .label {
    font-size: 0.7rem;
    color: ${props => props.theme.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const LecturaActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  @media (max-width: 640px) {
    width: 100%;
  }
`;

const SmallActionButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  touch-action: manipulation;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const ArtifactsMinigrid = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ArtifactMiniCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  font-size: 0.8rem;
  background: ${props => {
    if (props.$status === 'submitted') return props.theme.name === 'dark' ? 'rgba(38, 166, 154, 0.2)' : '#dcfce7';
    if (props.$status === 'progress') return props.theme.name === 'dark' ? 'rgba(255, 183, 77, 0.2)' : '#fef3c7';
    return props.theme.surface;
  }};
  border: 1px solid ${props => {
    if (props.$status === 'submitted') return props.theme.name === 'dark' ? 'rgba(38, 166, 154, 0.35)' : '#bbf7d0';
    if (props.$status === 'progress') return props.theme.name === 'dark' ? 'rgba(255, 183, 77, 0.35)' : '#fde68a';
    return props.theme.border;
  }};
  
  .icon { font-size: 0.9rem; }
  .status { font-size: 0.75rem; }
  .score {
    font-weight: 700;
    font-size: 0.75rem;
    color: ${props => {
      if (props.$status === 'submitted') return props.theme.name === 'dark' ? props.theme.successLight : '#166534';
      if (props.$status === 'progress') return props.theme.name === 'dark' ? props.theme.warningLight : '#92400e';
      return props.theme.textMuted;
    }};
    background: ${props => props.theme.surface};
    border: 1px solid ${props => props.theme.border};
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }
`;

const NoLecturasMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
`;

const StudentActionsBar = styled.div`
  padding: 1rem 1.25rem;
  background: ${props => props.theme.surfaceHover};
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: flex-end;
`;

const DeleteStudentButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: ${props => props.theme.error};
  border: 1px solid ${props => props.theme.errorBorder || props.theme.error};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.errorBackground || 'rgba(255, 107, 107, 0.15)'};
    border-color: ${props => props.theme.error};
  }
`;

const EmptyStudentsMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  border: 2px dashed ${props => props.theme.border};
  
  .icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }
  
  .text {
    display: block;
    color: ${props => props.theme.textMuted};
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .hint {
    display: block;
    color: ${props => props.theme.disabledText};
    font-size: 0.9rem;
  }
`;

export default TeacherDashboard;
