import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  assignLecturasToCourse,
  approveStudentInCourse,
  backfillCourseProgressSourceCourseId,
  createCourse,
  getCourseMetrics,
  getCursosDocente,
  getTextosDocente,
  uploadTexto,
  deleteTextEverywhere,
  deleteCourse,
  deleteStudentFromCourse,
  removeLecturaFromCourse,
  // 🆕 Funciones para reset de artefactos
  resetStudentArtifact,
  resetAllStudentArtifacts,
  getStudentArtifactDetails
} from '../../firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const initialCourseForm = {
  nombre: '',
  periodo: '2025',
  descripcion: '',
  autoApprove: true,
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
  const [savingLecturas, setSavingLecturas] = useState(false);
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

  // 🆕 Estados para exportación
  const [exporting, setExporting] = useState(false);

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

  const loadSetup = useCallback(async () => {
    if (!docenteUid) return;
    setLoadingCourses(true);
    try {
      const [cursos, textosDocente] = await Promise.all([
        getCursosDocente(docenteUid),
        getTextosDocente(docenteUid)
      ]);
      setCourses(cursos);
      setTextos(textosDocente);
      if (cursos.length) {
        setSelectedCourseId(prev => prev || cursos[0].id);
      }
    } catch (error) {
      console.error('Error cargando cursos/docente:', error);
      showFeedback('error', error.message || 'No se pudieron cargar los cursos');
    } finally {
      setLoadingCourses(false);
    }
  }, [docenteUid, showFeedback]);

  const loadMetrics = useCallback(async (courseId) => {
    if (!courseId) {
      setCourseMetrics(null);
      return;
    }
    setLoadingMetrics(true);
    try {
      const metrics = await getCourseMetrics(courseId);
      setCourseMetrics(metrics);
      setCourses(prev => prev.map(course => (
        course.id === courseId ? { ...course, ...metrics.curso } : course
      )));
      const assigned = (metrics?.curso?.lecturasAsignadas || []).map(item => item.textoId).filter(Boolean);
      setLecturasSeleccionadas(assigned);
    } catch (error) {
      console.error('Error cargando métricas:', error);
      showFeedback('error', error.message || 'No se pudieron cargar las métricas');
    } finally {
      setLoadingMetrics(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    if (selectedCourseId) {
      loadMetrics(selectedCourseId);
    }
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
      console.error('Error en migración de progreso:', error);
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

      // Recargar textos
      const updatedTextos = await getTextosDocente(docenteUid);
      setTextos(updatedTextos);

    } catch (error) {
      console.error('Error subiendo texto:', error);
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
    if (!courseForm.nombre.trim()) {
      showFeedback('error', 'El curso necesita un nombre');
      return;
    }
    if (!docenteUid) return;

    setCreatingCourse(true);
    try {
      const lecturasPayload = formLecturas.map(textoId => {
        const texto = textos.find(t => t.id === textoId);
        return texto ? {
          textoId: texto.id,
          titulo: texto.titulo,
          fechaLimite: null,
          notas: ''
        } : null;
      }).filter(Boolean);

      const nuevoCurso = await createCourse(docenteUid, {
        ...courseForm,
        lecturas: lecturasPayload
      });

      setCourses(prev => [
        { id: nuevoCurso.id, ...nuevoCurso },
        ...prev
      ]);
      setCourseForm(initialCourseForm);
      setFormLecturas([]);
      setSelectedCourseId(nuevoCurso.id);
      showFeedback('success', `Curso "${courseForm.nombre}" creado`);
    } catch (error) {
      console.error('Error al crear curso:', error);
      showFeedback('error', error.message || 'No se pudo crear el curso');
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleLecturaToggle = (textoId) => {
    setLecturasSeleccionadas(prev => prev.includes(textoId)
      ? prev.filter(id => id !== textoId)
      : [...prev, textoId]
    );
  };

  const handleUpdateLecturas = async () => {
    if (!selectedCourse) return;
    setSavingLecturas(true);
    try {
      const payload = lecturasSeleccionadas.map(textoId => {
        const texto = textos.find(t => t.id === textoId);
        return texto ? {
          textoId: texto.id,
          titulo: texto.titulo,
          fechaLimite: null,
          notas: ''
        } : null;
      }).filter(Boolean);

      await assignLecturasToCourse(selectedCourse.id, payload);
      await loadMetrics(selectedCourse.id);
      showFeedback('success', 'Lecturas asignadas al curso');
    } catch (error) {
      console.error('Error asignando lecturas:', error);
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
      console.error('Error aprobando estudiante:', error);
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
      console.error(error);
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
      console.error(error);
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
      console.error(error);
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
      console.error(error);
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
      const details = await getStudentArtifactDetails(student.estudianteUid, lectura.textoId);
      setArtifactDetails(details);
    } catch (error) {
      console.error('Error cargando detalles de artefactos:', error);
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
        artifactName
      );

      if (result.success) {
        showFeedback('success', `✅ ${artifactDisplayName} reseteado. El estudiante puede empezar de nuevo.`);
        // Recargar detalles
        const details = await getStudentArtifactDetails(
          selectedStudentForReset.estudianteUid,
          selectedLecturaForReset.textoId
        );
        setArtifactDetails(details);
        // Recargar métricas del curso
        await loadMetrics(selectedCourse.id);
      } else {
        showFeedback('error', result.message);
      }
    } catch (error) {
      console.error('Error reseteando artefacto:', error);
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
        selectedLecturaForReset.textoId
      );

      if (result.success) {
        showFeedback('success', `✅ ${result.resetCount} artefactos reseteados. El estudiante puede comenzar de nuevo.`);
        // Recargar detalles
        const details = await getStudentArtifactDetails(
          selectedStudentForReset.estudianteUid,
          selectedLecturaForReset.textoId
        );
        setArtifactDetails(details);
        // Recargar métricas del curso
        await loadMetrics(selectedCourse.id);
      } else {
        showFeedback('error', result.message);
      }
    } catch (error) {
      console.error('Error reseteando todos los artefactos:', error);
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
      teacherComment: artifact.teacherComment || ''
    });
    setTeacherComment(artifact.teacherComment || '');

    // 🆕 FASE 5: Marcar automáticamente como "visto" por el docente
    // Esto hace que desaparezca del contador de "entregas nuevas"
    if (artifact.submitted && !artifact.viewedByTeacher && selectedStudentForReset && selectedLecturaForReset) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');

        const progressRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'progress', selectedLecturaForReset.textoId);
        const updatePath = `activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${artifactKey}`;

        await updateDoc(progressRef, {
          [`${updatePath}.viewedByTeacher`]: true,
          [`${updatePath}.viewedAt`]: new Date().toISOString(),
          [`${updatePath}.viewedBy`]: docenteUid
        });

        console.log(`✅ [TeacherDashboard] Artefacto ${artifactKey} marcado como visto`);

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
        console.warn('⚠️ Error marcando artefacto como visto:', error);
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
      teacherComment: '',
      isSummativeEssay: true,
      rubricId: rubricId || null,
      gradedAt: essay?.gradedAt || null,
      submittedAt: essay?.submittedAt || null,
      attemptsUsed: essay?.attemptsUsed ?? null
    });
    setTeacherComment('');
  };

  // 🆕 Guardar comentario del docente
  const handleSaveTeacherComment = async () => {
    if (!viewingArtifact || !selectedStudentForReset || !selectedLecturaForReset) return;
    if (viewingArtifact.isSummativeEssay) return;

    setSavingComment(true);
    try {
      // Importar updateDoc y doc de firebase
      const { doc, updateDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      const progressRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'progress', selectedLecturaForReset.textoId);

      // Guardar el comentario en el artefacto correspondiente
      const updatePath = `activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}.teacherComment`;

      await updateDoc(progressRef, {
        [updatePath]: teacherComment,
        [`activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}.commentedAt`]: new Date().toISOString(),
        [`activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}.commentedBy`]: docenteUid
      });

      // 🆕 FASE 5: Crear notificación para el estudiante
      if (teacherComment && teacherComment.trim().length > 0) {
        try {
          const notificationId = `${selectedLecturaForReset.textoId}_${viewingArtifact.key}_${Date.now()}`;
          const notificationRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'notifications', notificationId);
          
          await setDoc(notificationRef, {
            type: 'teacher_comment',
            artifactKey: viewingArtifact.key,
            artifactName: viewingArtifact.name,
            textoId: selectedLecturaForReset.textoId,
            lecturaTitle: selectedLecturaForReset.titulo || 'Lectura',
            comment: teacherComment,
            docenteUid: docenteUid,
            docenteNombre: userData?.nombre || 'Tu docente',
            courseId: selectedCourse,
            courseName: courseMetrics?.curso?.nombre || '',
            read: false,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now()
          });
          console.log('🔔 [TeacherDashboard] Notificación creada para el estudiante');
        } catch (notifError) {
          console.warn('⚠️ Error creando notificación:', notifError);
          // No bloquear si falla la notificación
        }
      }

      showFeedback('success', '✅ Comentario guardado');

      // Actualizar estado local
      setViewingArtifact(prev => ({ ...prev, teacherComment }));

      // Recargar detalles
      const details = await getStudentArtifactDetails(
        selectedStudentForReset.estudianteUid,
        selectedLecturaForReset.textoId
      );
      setArtifactDetails(details);

    } catch (error) {
      console.error('Error guardando comentario:', error);
      showFeedback('error', 'Error al guardar comentario');
    } finally {
      setSavingComment(false);
    }
  };

  // 🆕 Borrar comentario del docente y notificación del estudiante
  const handleDeleteTeacherComment = async () => {
    if (!viewingArtifact || !selectedStudentForReset || !selectedLecturaForReset) return;
    if (viewingArtifact.isSummativeEssay) return;
    
    const confirmMsg = '¿Estás seguro de borrar este comentario?\n\nTambién se eliminará la notificación enviada al estudiante.';
    if (!window.confirm(confirmMsg)) return;

    setSavingComment(true);
    try {
      const { doc, updateDoc, deleteDoc, collection, query, where, getDocs, deleteField } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      const progressRef = doc(db, 'students', selectedStudentForReset.estudianteUid, 'progress', selectedLecturaForReset.textoId);

      // Borrar el comentario del artefacto
      const updatePath = `activitiesProgress.${selectedLecturaForReset.textoId}.artifacts.${viewingArtifact.key}`;
      
      await updateDoc(progressRef, {
        [`${updatePath}.teacherComment`]: deleteField(),
        [`${updatePath}.commentedAt`]: deleteField(),
        [`${updatePath}.commentedBy`]: deleteField()
      });

      // Buscar y borrar la notificación correspondiente del estudiante
      try {
        const notificationsRef = collection(db, 'students', selectedStudentForReset.estudianteUid, 'notifications');
        const q = query(
          notificationsRef,
          where('textoId', '==', selectedLecturaForReset.textoId),
          where('artifactKey', '==', viewingArtifact.key),
          where('docenteUid', '==', docenteUid)
        );
        
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
        
        console.log(`🗑️ [TeacherDashboard] Eliminadas ${snapshot.docs.length} notificaciones del estudiante`);
      } catch (notifError) {
        console.warn('⚠️ Error borrando notificaciones:', notifError);
        // No bloquear si falla borrar notificaciones
      }

      showFeedback('success', '🗑️ Comentario eliminado');

      // Actualizar estado local
      setTeacherComment('');
      setViewingArtifact(prev => ({ ...prev, teacherComment: '' }));

      // Recargar detalles
      const details = await getStudentArtifactDetails(
        selectedStudentForReset.estudianteUid,
        selectedLecturaForReset.textoId
      );
      setArtifactDetails(details);

    } catch (error) {
      console.error('Error borrando comentario:', error);
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
            const details = await getStudentArtifactDetails(estudiante.estudianteUid, lectura.textoId);

            if (details.hasProgress && details.artifacts) {
              for (const [artifactKey, artifact] of Object.entries(details.artifacts)) {
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
            console.warn('Error obteniendo detalles para exportación:', err);
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

      const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
      const safeName = curso.nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
      downloadBlob(csv, `${safeName}-detalle-artefactos.csv`, 'text/csv;charset=utf-8;');

      showFeedback('success', `✅ Exportados ${rows.length - 1} registros`);

    } catch (error) {
      console.error('Error exportando datos:', error);
      showFeedback('error', 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const exportMetrics = (format = 'csv') => {
    if (!courseMetrics?.curso) return;
    const { curso, estudiantes, resumen } = courseMetrics;
    const safeName = curso.nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-');

    if (format === 'json') {
      const data = JSON.stringify({ curso, resumen, estudiantes }, null, 2);
      downloadBlob(data, `${safeName}-reporte.json`, 'application/json');
      return;
    }

    // 🆕 D5 FIX: Función de escape CSV correcta
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Si contiene comillas, comas o saltos de línea, debe ser escapado
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = ['Estudiante', 'Estado', 'Avance (%)', 'Lecturas completadas', 'Puntaje promedio', 'Tiempo lectura (min)', 'Entregas completas', 'Artefactos entregados'];
    const rows = (estudiantes || []).map(est => [
      est.estudianteNombre || est.nombre || 'Sin nombre',
      est.estado,
      est.stats?.avancePorcentaje ?? 0,
      est.stats?.lecturasCompletadas ?? 0,
      est.stats?.promedioScore ?? 0,
      est.stats?.tiempoLecturaTotal ?? 0,
      est.stats?.entregasCompletas ?? 0,
      est.stats?.artefactosEntregados ?? 0
    ]);

    rows.unshift(['Curso', curso.nombre, 'Código', curso.codigoJoin, 'Total estudiantes', resumen?.totalEstudiantes || 0]);
    rows.unshift(header);

    // 🆕 D5 FIX: Usar escape correcto para cada valor
    const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
    downloadBlob(csv, `${safeName}-reporte.csv`, 'text/csv;charset=utf-8;');
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
      console.warn('No se pudo copiar automáticamente', error);
    }
  };

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
              <SectionLabel>Mis cursos</SectionLabel>
              <SectionSub>Gestiona tus grupos y códigos</SectionSub>
            </div>
            <ActionButton type="button" onClick={loadSetup} disabled={loadingCourses}>
              {loadingCourses ? 'Actualizando...' : 'Actualizar'}
            </ActionButton>
          </SectionHeader>

          {/* Botón para subir nueva lectura */}
          <UploadSection>
            <SectionLabel>Biblioteca de Lecturas</SectionLabel>
            <ActionButton type="button" onClick={() => setShowUploadModal(true)}>
              + Nueva Lectura
            </ActionButton>
          </UploadSection>

          {loadingCourses && (
            <InlineLoader>
              <InlineSpinner aria-label="Cargando cursos" />
            </InlineLoader>
          )}

          {!loadingCourses && !courses.length && (
            <EmptyState>
              <h3>Aún no tienes cursos</h3>
              <p>Crea tu primer curso y comparte el código con tus estudiantes.</p>
            </EmptyState>
          )}

          <CoursesScroller>
            {courses.map(course => (
              <CourseCard
                key={course.id}
                $active={course.id === selectedCourseId}
                onClick={() => handleCourseSelect(course.id)}
              >
                <CourseTitle>{course.nombre}</CourseTitle>
                <CourseMeta>
                  <span>{course.periodo}</span>
                  <span>{course.autoApprove ? 'Autoaprueba' : 'Requiere aprobación'}</span>
                </CourseMeta>
                <CourseCode>
                  Código: <strong>{course.codigoJoin}</strong>
                </CourseCode>
                <CourseLecturas>{course.totalLecturas || 0} lecturas</CourseLecturas>
                <DeleteButton
                  onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id, course.nombre); }}
                  title="Eliminar curso"
                >
                  ✕
                </DeleteButton>
              </CourseCard>
            ))}
          </CoursesScroller>

          <CreateCourseCard>
            <h3>Crear curso</h3>
            <CourseForm onSubmit={handleCreateCourse}>
              <label>
                Nombre del curso
                <input
                  type="text"
                  name="nombre"
                  placeholder="Literatura 3°B"
                  value={courseForm.nombre}
                  onChange={handleCourseFormChange}
                  required
                />
              </label>

              <FormRow>
                <label>
                  Periodo
                  <input
                    type="text"
                    name="periodo"
                    value={courseForm.periodo}
                    onChange={handleCourseFormChange}
                  />
                </label>
                <label>
                  Autoaprueba
                  <input
                    type="checkbox"
                    name="autoApprove"
                    checked={courseForm.autoApprove}
                    onChange={handleCourseFormChange}
                  />
                </label>
              </FormRow>

              <label>
                Descripción
                <textarea
                  name="descripcion"
                  rows="2"
                  placeholder="Grupo de lecturas guiadas"
                  value={courseForm.descripcion}
                  onChange={handleCourseFormChange}
                />
              </label>

              <LecturasSelector>
                <LecturasLabel>Lecturas iniciales</LecturasLabel>
                {!textos.length && (
                  <SmallMuted>No tienes lecturas subidas todavía.</SmallMuted>
                )}
                {textos.slice(0, 5).map(texto => (
                  <LecturaCheckbox key={texto.id}>
                    <input
                      type="checkbox"
                      checked={formLecturas.includes(texto.id)}
                      onChange={() => handleFormLecturaToggle(texto.id)}
                    />
                    <span style={{ flex: 1 }}>{texto.titulo}</span>
                    <DeleteButtonSmall
                      onClick={(e) => { e.stopPropagation(); handleDeleteText(texto.id, texto.titulo); }}
                      title="Eliminar de biblioteca"
                      style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 6px' }}
                    >
                      ✕
                    </DeleteButtonSmall>
                  </LecturaCheckbox>
                ))}
                {textos.length > 5 && (
                  <SmallMuted>Solo se muestran las 5 lecturas más recientes.</SmallMuted>
                )}
              </LecturasSelector>

              <ActionButton type="submit" disabled={creatingCourse}>
                {creatingCourse ? 'Creando...' : 'Guardar curso'}
              </ActionButton>
            </CourseForm>
          </CreateCourseCard>
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
                    style={{ marginLeft: '0.5rem' }}
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

                  <LecturasPanel>
                    <PanelHeader>
                      <div>
                        <SectionLabel>Lecturas asignadas</SectionLabel>
                        <SectionSub>
                          {selectedCourse.totalLecturas || 0} lecturas activas en el curso
                        </SectionSub>
                      </div>
                      <ActionButton type="button" onClick={handleUpdateLecturas} disabled={savingLecturas}>
                        {savingLecturas ? 'Guardando...' : 'Actualizar lecturas'}
                      </ActionButton>
                    </PanelHeader>

                    <LecturasLabel style={{ marginTop: '0.75rem', display: 'block' }}>En este curso</LecturasLabel>
                    <SmallMuted style={{ display: 'block' }}>✕ = quitar del curso (no elimina de la biblioteca)</SmallMuted>

                    <LecturasList>
                      {assignedLecturas.map((lectura) => {
                        const texto = textos.find(t => t.id === lectura.textoId);
                        const titulo = lectura.titulo || texto?.titulo || 'Lectura';
                        return (
                          <LecturaItem as="div" key={lectura.textoId}>
                            <div style={{ flex: 1 }}>
                              <strong>{titulo}</strong>
                              <SmallMuted>{texto?.genero || 'Sin género'} · {texto?.complejidad || 'intermedio'}</SmallMuted>
                            </div>
                            <DeleteButtonSmall
                              onClick={(e) => { e.stopPropagation(); handleRemoveLecturaFromCourse(lectura.textoId, titulo); }}
                              title="Quitar del curso"
                            >
                              ✕
                            </DeleteButtonSmall>
                          </LecturaItem>
                        );
                      })}
                      {!assignedLecturas.length && (
                        <SmallMuted>No hay lecturas asignadas en este curso.</SmallMuted>
                      )}
                    </LecturasList>

                    <LecturasSelector style={{ marginTop: '0.75rem' }}>
                      <LecturasLabel>Biblioteca (asignación)</LecturasLabel>
                      <SmallMuted>Marca/desmarca y pulsa “Actualizar lecturas”</SmallMuted>
                    </LecturasSelector>

                    <LecturasList>
                      {textos.map(texto => {
                        const isAssigned = lecturasSeleccionadas.includes(texto.id);
                        return (
                          <LecturaItem key={texto.id}>
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleLecturaToggle(texto.id)}
                            />
                            <div style={{ flex: 1 }}>
                              <strong>{texto.titulo}</strong>
                              <SmallMuted>{texto.genero || 'Sin género'} · {texto.complejidad || 'intermedio'}</SmallMuted>
                            </div>
                          </LecturaItem>
                        );
                      })}
                      {!textos.length && (
                        <SmallMuted>No hay lecturas disponibles para asignar.</SmallMuted>
                      )}
                    </LecturasList>
                  </LecturasPanel>

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
                        <ActionButton
                          type="button"
                          onClick={handleExportCourseData}
                          disabled={exporting}
                        >
                          {exporting ? '⏳ Exportando...' : '📑 Excel Detallado'}
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
                            onClick={() => setExpandedStudent(expandedStudent === est.id ? null : est.id)}
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
                                    const artifactCount = Object.keys(artifacts).length;
                                    const submittedCount = Object.values(artifacts).filter(a => a?.submitted).length;
                                    const avgScore = artifactCount > 0
                                      ? (Object.values(artifacts).reduce((sum, a) => sum + (a?.rubricScore || 0), 0) / 5).toFixed(1)
                                      : 0;

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
                                            <LecturaStat $type="score" $score={parseFloat(avgScore)}>
                                              <span className="value">{avgScore}</span>
                                              <span className="label">promedio</span>
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
                        {(Object.values(artifactDetails.artifacts || {}).reduce((sum, a) => sum + (a.rubricScore || 0), 0) / 5).toFixed(1)}
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
                              ✅ Entregado • Puntaje: {viewingArtifact.score}/10
                            </SubmittedBadge>
                          )}
                        </ViewContentBody>

                        {!viewingArtifact.isSummativeEssay && (
                          <TeacherCommentSection>
                            <CommentLabel>💬 Comentario del docente:</CommentLabel>
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
                          </TeacherCommentSection>
                        )}
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
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 1.5rem;

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
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  min-width: 140px;
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
  border: 1px solid ${props => props.$active ? props.theme.primary : props.theme.border};
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  background: ${props => props.$active ? props.theme.surfaceHover : props.theme.surface};
  box-shadow: ${props => props.$active ? '0 6px 18px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.06)'};
  box-shadow: ${props => props.$active ? '0 6px 18px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.06)'};
  transition: all 0.2s ease;
  position: relative;
`;

const CourseTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
`;

const CourseMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const CourseCode = styled.div`
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const CourseLecturas = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const CreateCourseCard = styled.div`
  border: 1px dashed ${props => props.theme.border};
  border-radius: 12px;
  padding: 1rem;
  background: ${props => props.theme.surface};
`;


const DeleteButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: ${props => props.theme.textMuted};
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  
  &:hover {
    color: ${props => props.theme.error || '#ef4444'};
    opacity: 1;
  }

  ${CourseCard}:hover & {
    opacity: 0.7;
  }
`;

const DeleteButtonSmall = styled(DeleteButton)`
  position: static;
  opacity: 0.5;
  font-size: 1rem;
`;

const CourseForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
  }

  input[type='text'],
  textarea {
    border: 1px solid ${props => props.theme.border};
    border-radius: 8px;
    padding: 0.45rem 0.65rem;
    font-size: 0.9rem;
    background: ${props => props.theme.background};
    color: ${props => props.theme.text};
  }

  textarea {
    resize: vertical;
  }
`;

const FormRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;

  label {
    flex: 1;
  }
`;

const LecturasSelector = styled.div`
  border-top: 1px solid ${props => props.theme.border};
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const LecturasLabel = styled.span`
  font-weight: 600;
  font-size: 0.85rem;
`;

const LecturaCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
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
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
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
`;

const LecturasPanel = styled.div`
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  padding: 1rem;
  background: ${props => props.theme.surface};
`;

const LecturasList = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
`;

const LecturaItem = styled.label`
  display: flex;
  gap: 0.65rem;
  align-items: center;
  padding: 0.4rem 0.2rem;
  border-bottom: 1px solid ${props => props.theme.border};

  &:last-child {
    border-bottom: none;
  }
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

const StudentsTable = styled.table`
  width: 100%;
  border-collapse: collapse;

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
`;

// 🆕 Styled Components para Dropdown de Reset
const ResetDropdown = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover > div {
    display: block;
  }
`;

const ResetDropdownButton = styled.button`
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

const ResetDropdownContent = styled.div`
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  min-width: 220px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
`;

const ResetDropdownHeader = styled.div`
  padding: 0.75rem 1rem;
  background: #f3f4f6;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
`;

const ResetDropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s ease;
  
  &:hover:not(:disabled) {
    background: #eff6ff;
    color: #2563eb;
  }
  
  &:disabled {
    color: #9ca3af;
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
  background: #f8fafc;
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
  background: white;
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
  color: #1e293b;
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
  background: ${props => props.$type === 'lecture' ? '#dbeafe' : '#f1f5f9'};
  color: ${props => props.$type === 'lecture' ? '#1e40af' : '#64748b'};
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
    color: #64748b;
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
  color: #64748b;
  font-size: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
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
  color: #374151;
`;

const ArtifactsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  padding: 1rem 1.5rem 1.5rem;
`;

const ArtifactCard = styled.div`
  background: white;
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
`;

const ArtifactHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
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
  color: #1e293b;
  font-size: 1rem;
  line-height: 1.2;
`;

const ArtifactRubric = styled.div`
  font-size: 0.7rem;
  color: #94a3b8;
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
`;

const MetricBox = styled.div`
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: ${props => {
    if (props.$type === 'score' && props.$success) return '#f0fdf4';
    if (props.$warning) return '#fef2f2';
    return '#f8fafc';
  }};
  border-radius: 10px;
  position: relative;
`;

const MetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  
  span {
    font-size: 0.85rem;
    font-weight: 600;
    color: #94a3b8;
  }
`;

const MetricLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.35rem;
`;

const MetricBar = styled.div`
  height: 4px;
  background: #e5e7eb;
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

const ScoreRing = styled.div`
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
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.75rem;
  margin-bottom: 1rem;
`;

const TimelineTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
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
  color: #64748b;
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
  background: ${props => props.$disabled ? '#e5e7eb' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
  color: ${props => props.$disabled ? '#9ca3af' : 'white'};
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
  background: white;
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
  background: white;
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
  color: #374151;
`;

const NoProgressText = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
`;

const ResetModalFooter = styled.div`
  padding: 1.25rem 2rem;
  border-top: 1px solid #e5e7eb;
  background: white;
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
  background: white;
  border-radius: 16px;
  border: 2px solid #3b82f6;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
`;

const ViewContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
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
`;

const StudentWorkContent = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  font-size: 0.95rem;
  line-height: 1.7;
  color: #374151;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: ${props => props.$structured ? 'inherit' : "'Georgia', serif"};
`;

const WorkFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const WorkField = styled.div`
  padding: 0.85rem 0.95rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
`;

const WorkFieldLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.4rem;
`;

const WorkFieldValue = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
`;

const WorkEmptyValue = styled.div`
  font-size: 0.95rem;
  color: #9ca3af;
`;

const WorkFieldPre = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #374151;
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
  background: #f0f9ff;
  border-top: 1px solid #e0f2fe;
`;

const CommentLabel = styled.label`
  display: block;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  padding: 1rem;
  border: 2px solid #bae6fd;
  border-radius: 10px;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const CommentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
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
  color: #dc2626;
  border: 1px solid #dc2626;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #dc2626;
    color: white;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CommentSavedIndicator = styled.span`
  color: #059669;
  font-size: 0.85rem;
  font-weight: 500;
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
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
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
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  
  &:hover {
    background: #f5f5f5;
  }
`;

const StudentMainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const StudentNameSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StudentNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const StudentFullName = styled.span`
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2937;
`;

const StudentQuickStats = styled.div`
  display: flex;
  gap: 1.25rem;
`;

const QuickStat = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #6b7280;
  
  .icon { font-size: 0.9rem; }
  .value { font-weight: 600; color: #374151; }
  .label { color: #9ca3af; }
`;

const ExpandButton = styled.button`
  background: ${props => props.$expanded ? '#3b82f6' : '#e5e7eb'};
  color: ${props => props.$expanded ? 'white' : '#6b7280'};
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
    background: ${props => props.$expanded ? '#2563eb' : '#d1d5db'};
  }
`;

const StudentDetailPanel = styled.div`
  overflow: hidden;
  background: white;
`;

const LecturasProgressSection = styled.div`
  padding: 1.25rem;
`;

const LecturasProgressTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
`;

const LecturaProgressCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
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
`;

const LecturaTitulo = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
`;

const LecturaAutor = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
`;

const LecturaStats = styled.div`
  display: flex;
  gap: 1rem;
`;

const LecturaStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: ${props => {
    if (props.$type === 'score') {
      const score = props.$score || 0;
      if (score >= 7) return '#dcfce7';
      if (score >= 4) return '#fef3c7';
      if (score > 0) return '#fee2e2';
      return '#f1f5f9';
    }
    return '#f1f5f9';
  }};
  border-radius: 8px;
  min-width: 60px;
  
  .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${props => {
    if (props.$type === 'score') {
      const score = props.$score || 0;
      if (score >= 7) return '#166534';
      if (score >= 4) return '#92400e';
      if (score > 0) return '#991b1b';
      return '#64748b';
    }
    return '#3b82f6';
  }};
  }
  
  .label {
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const LecturaActions = styled.div`
  display: flex;
  gap: 0.5rem;
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
    if (props.$status === 'submitted') return '#dcfce7';
    if (props.$status === 'progress') return '#fef3c7';
    return '#f1f5f9';
  }};
  border: 1px solid ${props => {
    if (props.$status === 'submitted') return '#bbf7d0';
    if (props.$status === 'progress') return '#fde68a';
    return '#e2e8f0';
  }};
  
  .icon { font-size: 0.9rem; }
  .status { font-size: 0.75rem; }
  .score {
    font-weight: 700;
    font-size: 0.75rem;
    color: #166534;
    background: white;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }
`;

const NoLecturasMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.9rem;
`;

const StudentActionsBar = styled.div`
  padding: 1rem 1.25rem;
  background: #fafafa;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
`;

const DeleteStudentButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }
`;

const EmptyStudentsMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: white;
  border-radius: 16px;
  border: 2px dashed #e5e7eb;
  
  .icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }
  
  .text {
    display: block;
    color: #64748b;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .hint {
    display: block;
    color: #94a3b8;
    font-size: 0.9rem;
  }
`;

export default TeacherDashboard;