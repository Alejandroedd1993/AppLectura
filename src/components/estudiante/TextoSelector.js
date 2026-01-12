/**
 * TextoSelector - Student Dashboard
 * 
 * Features:
 * - "My Courses" view with enrollment status
 * - Progress tracking per text and overall course
 * - Withdraw method
 * - Direct access to readings
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useContext } from 'react'; // Added useContext
import {
  joinCourseWithCode,
  getAllStudentProgress,
  getStudentCourses,
  withdrawFromCourse
} from '../../firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { procesarArchivo } from '../../utils/fileProcessor';
import { AppContext } from '../../context/AppContext';
import { getAllSessionsMerged } from '../../services/sessionManager';

const BACKEND_BASE_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 40px 20px;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 40px auto;
  text-align: center;
  color: ${props => props.theme.text};
  
  h1 {
    font-size: 42px;
    font-weight: 700;
    margin: 0 0 12px 0;
  }
`;

const UserInfo = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .info {
    display: flex;
    gap: 30px;
    .item {
      display: flex;
      flex-direction: column;
      .label { font-size: 12px; opacity: 0.8; text-transform: uppercase; color: ${props => props.theme.textMuted}; }
      .value { font-size: 16px; font-weight: 600; color: ${props => props.theme.text}; }
    }
  }
  
  .logout-btn {
    padding: 10px 20px;
    background: ${props => props.theme.surfaceHover};
    border: 1px solid ${props => props.theme.border};
    border-radius: 8px;
    color: ${props => props.theme.error};
    font-weight: 600;
    cursor: pointer;
    &:hover { background: ${props => props.theme.error}10; }
  }
`;

const CourseGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
`;

const CourseCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadow.sm};
`;

const CourseHeader = styled.div`
  background: ${props => props.theme.primary}10;
  border-bottom: 1px solid ${props => props.theme.border};
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  h2 { margin: 0; color: ${props => props.theme.primary}; font-size: 24px; }
  p { margin: 4px 0 0; color: ${props => props.theme.textMuted}; }

  .actions {
    display: flex;
    gap: 10px;
  }
`;

const WithdrawButton = styled.button`
  background: transparent;
  border: 1px solid ${props => props.theme.error};
  color: ${props => props.theme.error};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
  
  &:hover {
    opacity: 1;
    background: ${props => props.theme.error}10;
  }
`;

const ReadingsList = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ReadingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: ${props => props.theme.background};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  
  &:hover {
    border-color: ${props => props.theme.primary}50;
  }
  
  .info {
    flex: 1;
    h4 { margin: 0; font-size: 16px; color: ${props => props.theme.text}; }
    span { font-size: 13px; color: ${props => props.theme.textMuted}; }
  }

  .progress-ring {
    width: 120px;
    margin: 0 20px;
    .bar-bg { height: 6px; background: ${props => props.theme.border}; border-radius: 3px; }
    .bar-fill { height: 6px; background: ${props => props.theme.success}; border-radius: 3px; transition: width 0.5s ease; }
    .label { font-size: 11px; text-align: right; margin-top: 4px; color: ${props => props.theme.textMuted}; }
  }

  button {
    padding: 8px 16px;
    background: ${props => props.theme.primary};
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    &:disabled { opacity: 0.7; cursor: wait; }
    &:hover:not(:disabled) { background: ${props => props.theme.primaryDark}; }
  }
`;

const JoinCourseSection = styled.div`
  max-width: 600px;
  margin: 0 auto 40px auto;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 24px;
  box-shadow: ${props => props.theme.shadow.md};
  border: 1px solid ${props => props.theme.border};
  
  .input-group {
    display: flex;
    gap: 12px;
    margin-top: 12px;
    
    input {
      flex: 1;
      padding: 12px;
      border: 2px solid ${props => props.theme.border};
      border-radius: 8px;
      text-transform: uppercase;
    }
    
    button {
      padding: 12px 24px;
      background: ${props => props.theme.primary};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
  }
`;

export default function TextoSelector({ onSelectText, onFreeAnalysis }) {
  const { currentUser, userData, signOut } = useAuth();
  const { restoreSession } = useContext(AppContext); // Access restoreSession
  const [courses, setCourses] = useState([]);
  const [_progressMap, setProgressMap] = useState({});
  const [localSessionsMap, setLocalSessionsMap] = useState({}); // 🆕 Mapa de sesiones locales
  const localSessionsMapRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [openingText, setOpeningText] = useState(null);

  useEffect(() => {
    if (currentUser) loadDashboard();
  }, [currentUser]);

  useEffect(() => {
    localSessionsMapRef.current = localSessionsMap;
  }, [localSessionsMap]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      // 1. Cargar cursos
      const enrolledCourses = await getStudentCourses(currentUser.uid);

      // 2. Cargar progreso global
      const allProgress = await getAllStudentProgress(currentUser.uid);
      const pMap = {};
      allProgress.forEach(p => pMap[p.textoId] = p);

      // 3. Enriquecer cursos con detalles de lecturas
      const enrichedCourses = await Promise.all(enrolledCourses.map(async (course) => {
        // Resolver objetos de lectura
        const readingDetails = await Promise.all((course.lecturasAsignadas || []).map(async (l) => {
          // Si ya tenemos el texto en cache local o necesitamos fetch basico
          // Por optimización, aquí usamos titulo del array. El contenido completo se carga al abrir.
          return {
            ...l, // textoId, titulo, etc
            progress: pMap[l.textoId] || null
          };
        }));
        return { ...course, readings: readingDetails };
      }));

      setCourses(enrichedCourses);
      setProgressMap(pMap);

      // 4. 🆕 Cargar mapa de sesiones locales CON CLAVE COMPUESTA courseId_textoId
      const mergedSessions = await getAllSessionsMerged();
      console.log('🔍 [TextoSelector] Sesiones cargadas:', mergedSessions.length);

      const sMap = {};
      const pickedMeta = {}; // compositeKey -> { chosenId, chosenTs, replacedCount }

      const toMillisSafe = (value) => {
        if (!value) return 0;
        if (typeof value === 'object' && typeof value.toMillis === 'function') return value.toMillis();
        const asNumber = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
        const asDate = new Date(value);
        const asMs = asDate instanceof Date ? asDate.getTime() : 0;
        return Number.isFinite(asMs) ? asMs : 0;
      };

      const getSessionProgressTs = (session) => {
        let maxTs = 0;

        // 1) Rúbricas: último score / lastUpdate
        const rubricProgress = session?.rubricProgress || {};
        for (const rubricId of Object.keys(rubricProgress)) {
          const rp = rubricProgress[rubricId];
          maxTs = Math.max(maxTs, toMillisSafe(rp?.lastUpdate), toMillisSafe(rp?.lastUpdatedAt));
          const scores = Array.isArray(rp?.scores) ? rp.scores : [];
          for (const sc of scores) {
            maxTs = Math.max(maxTs, toMillisSafe(sc?.timestamp));
          }
        }

        // 2) Actividades: updatedAt
        const activitiesProgress = session?.activitiesProgress || {};
        for (const docId of Object.keys(activitiesProgress)) {
          const prep = activitiesProgress[docId]?.preparation;
          maxTs = Math.max(maxTs, toMillisSafe(prep?.updatedAt));
        }

        return maxTs;
      };

      const getSessionMetaTs = (session) => {
        // 1) Preferir timestamps explícitos
        const ts =
          session?.lastModified ||
          session?.sessionInfo?.lastModified ||
          session?.text?.lastModified ||
          session?.createdAt ||
          session?.sessionInfo?.createdAt ||
          0;

        const numericTs = toMillisSafe(ts);
        if (numericTs > 0) return numericTs;

        // 2) Fallback robusto: muchos ids llevan epoch ms
        // Ej: "session_1767360143614_abc" o "1767366541096_xyz"
        const id = session?.id || session?.sessionId || '';
        if (typeof id === 'string') {
          const match = id.match(/^session_(\d+)_/) || id.match(/^(\d+)_/);
          if (match && match[1]) {
            const parsed = Number(match[1]);
            if (Number.isFinite(parsed)) return parsed;
          }
        }

        return 0;
      };

      const getSessionFreshnessTs = (session) => {
        const progressTs = getSessionProgressTs(session);
        const metaTs = getSessionMetaTs(session);
        return Math.max(progressTs, metaTs);
      };

      mergedSessions.forEach(s => {
        // 🆕 CRÍTICO: Usar clave compuesta courseId_textoId para aislar por curso
        const sessionCourseId = s.sourceCourseId || s.text?.sourceCourseId;
        const sessionTextoId = s.textMetadata?.id || s.text?.metadata?.id || s.text?.textoId || s.currentTextoId;
        
        if (sessionCourseId && sessionTextoId) {
          // Clave compuesta: solo se encontrará si coincide curso + texto
          const compositeKey = `${sessionCourseId}_${sessionTextoId}`;

          const existing = sMap[compositeKey];
          if (!existing) {
            sMap[compositeKey] = s;
            const ts = getSessionFreshnessTs(s);
            pickedMeta[compositeKey] = { chosenId: s?.id, chosenTs: ts, replacedCount: 0 };
            console.log(`  📎 Sesión mapeada (curso aislado): ${compositeKey}`);
            return;
          }

          // 🛡️ Si hay duplicados, conservar SIEMPRE la sesión más reciente.
          const existingTs = getSessionFreshnessTs(existing);
          const nextTs = getSessionFreshnessTs(s);

          if (nextTs > existingTs) {
            sMap[compositeKey] = s;
            const prev = pickedMeta[compositeKey];
            pickedMeta[compositeKey] = {
              chosenId: s?.id,
              chosenTs: nextTs,
              replacedCount: (prev?.replacedCount || 0) + 1
            };
          } else {
            const prev = pickedMeta[compositeKey];
            pickedMeta[compositeKey] = {
              chosenId: prev?.chosenId || existing?.id,
              chosenTs: prev?.chosenTs || existingTs,
              replacedCount: (prev?.replacedCount || 0) + 1
            };
          }
        } else if (sessionTextoId) {
          // Fallback para sesiones legacy sin courseId (no se usarán si hay courseId)
          console.log(`  ⚠️ Sesión sin courseId: ${sessionTextoId}`);
          // NO mapear sesiones sin courseId para evitar conflictos
        }
      });

      // Log resumido: claves con duplicados (solo diagnóstico; evita spam)
      const duplicatedKeys = Object.entries(pickedMeta)
        .filter(([, meta]) => (meta?.replacedCount || 0) > 0)
        .map(([key, meta]) => ({ key, chosenId: meta.chosenId, chosenTs: meta.chosenTs, seen: meta.replacedCount + 1 }));
      if (duplicatedKeys.length > 0) {
        console.warn('⚠️ [TextoSelector] Duplicados de sesión por curso+texto detectados. Se eligió la más reciente.');
        try {
          console.table(duplicatedKeys);
        } catch {
          console.warn('Detalles duplicados:', duplicatedKeys);
        }
      }

      setLocalSessionsMap(sMap);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const result = await joinCourseWithCode(joinCode, currentUser.uid);
      alert('¡Unido al curso exitosamente!');
      setJoinCode('');
      
      // 🆕 CRÍTICO: Actualizar sesión activa con sourceCourseId
      if (result?.courseId) {
        const { updateCurrentSession } = await import('../../services/sessionManager');
        updateCurrentSession({ sourceCourseId: result.courseId });
        console.log('✅ [JoinCourse] sourceCourseId actualizado en sesión:', result.courseId);
      }
      
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWithdraw = async (courseId, courseName) => {
    if (!window.confirm(`¿Estás seguro de salir del curso "${courseName}"? Perderás tu progreso en este grupo.`)) return;
    try {
      await withdrawFromCourse(courseId, currentUser.uid);
      setCourses(prev => prev.filter(c => c.id !== courseId)); // Optimistic UI
    } catch (err) {
      alert('Error al salir del curso: ' + err.message);
    }
  };

  const handleSelectText = async (textoLite, sourceCourseId = null) => {
    if (openingText) return;
    setOpeningText(textoLite.textoId);

    // 🆕 SMART RESUME: Check if a session already exists for this text
    try {
      // 🆕 SMART RESUME: Búsqueda CON CLAVE COMPUESTA courseId_textoId
      let existingSession = null;
      
      // Estrategia ÚNICA: Usar clave compuesta para aislar por curso
      if (sourceCourseId && textoLite.textoId) {
        const compositeKey = `${sourceCourseId}_${textoLite.textoId}`;
        existingSession = localSessionsMapRef.current?.[compositeKey];
        console.log(`🔍 [Smart Resume] Buscando con clave: ${compositeKey}`, existingSession ? '✅ Encontrada' : '❌ No encontrada');
      }

      // 🆕 Ya no hacemos búsqueda exhaustiva - solo usamos clave compuesta
      // Si no hay sesión con clave compuesta, es una sesión nueva

      if (existingSession) {
        console.log('🔄 [Smart Resume] Restaurando sesión del mismo curso:', existingSession.id);
        console.log('📊 [Smart Resume] Análisis disponible:', !!existingSession.completeAnalysis);
        try {
          const rubricKeys = Object.keys(existingSession?.rubricProgress || {});
          const maxRubricTs = rubricKeys.reduce((max, key) => {
            const rp = existingSession?.rubricProgress?.[key];
            const scores = Array.isArray(rp?.scores) ? rp.scores : [];
            const bestScoreTs = scores.reduce((m, sc) => Math.max(m, Number(sc?.timestamp) || 0), 0);
            return Math.max(max, Number(rp?.lastUpdate) || 0, bestScoreTs);
          }, 0);
          console.log('🧭 [Smart Resume] Debug rúbricas:', { rubrics: rubricKeys.length, maxRubricTs });
        } catch {
          // noop
        }
        
        const success = await restoreSession(existingSession);
        if (success) {
          console.log('✅ [Smart Resume] Sesión restaurada - saltando análisis');
          // Cambiar a vista de Lectura Guiada
          window.dispatchEvent(new CustomEvent('app-change-tab', { detail: { tabId: 'lectura-guiada' } }));
          setOpeningText(null);
          return;
        } else {
          console.warn('⚠️ [Smart Resume] Fallo al restaurar sesión, procediendo con carga normal');
        }
      } else {
        console.log('ℹ️ [Smart Resume] No se encontró sesión para este curso+texto, se creará nueva');
      }
    } catch (e) {
      console.warn('⚠️ [Smart Resume] Error en sistema Smart Resume:', e);
    }

    try {
      // Fetch full text content similar to previous logic
      const docSnap = await getDoc(doc(db, 'textos', textoLite.textoId));
      if (!docSnap.exists()) throw new Error('El texto no existe');

      const docData = docSnap.data();

      // Handle Storage proxy Logic (reuse previous robust logic here ideally, simplified for brevity)
      // Lógica simplificada: Reutiliza manejo en App.js o expande aquí la logica de proxy
      // Para mantener consistencia con el código anterior, pasamos los datos básicos
      // App.js debería manejar la carga pesada o deberíamos re-implementar el fetch completo aquí.
      // POR AHORA: Pasamos docData + archivoInfo placeholder si es necesario.

      // NOTA: Para no duplicar 200 líneas de código de descarga de proxy, asumimos que
      // onSelectText maneja el objeto. SI falla, podemos copiar la lógica de descarga.
      // Reusando la lógica de descarga del archivo anterior...

      // ... (Lógica de descarga de proxy omitida para brevedad, pero esencial si son PDFs)
      // RESTAURANDO LOGICA CRITICA DE DISK/PROXY:

      let contenido = docData.contenido;
      let archivoInfo = null;

      if (docData.fileURL && !contenido) {
        // Proxy fetch quick implementation
        const proxyUrl = `${BACKEND_BASE_URL}/api/storage/proxy?url=${encodeURIComponent(docData.fileURL)}`;
        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        const file = new File([blob], docData.fileName || 'texto.pdf', { type: docData.fileType || blob.type });
        const extracted = await procesarArchivo(file, { analyzeStructure: false });
        contenido = extracted || 'PDF Viewing';
        archivoInfo = {
          file,
          objectUrl: URL.createObjectURL(blob),
          fileURL: docData.fileURL,
          type: file.type,
          name: file.name
        };
      }

      // 🆕 CRÍTICO: Propagar textoId Y sourceCourseId
      onSelectText(contenido, { 
        id: docSnap.id, 
        textoId: textoLite.textoId,
        sourceCourseId, // 🆕 Propagar ID del curso
        ...docData, 
        archivoInfo 
      });

    } catch (err) {
      console.error(err);
      alert('Error abriendo texto: ' + err.message);
    } finally {
      setOpeningText(null);
    }
  };

  const calculateProgress = (prog) => {
    if (!prog) return 0;
    // Simple promedio de rubricas o porcentaje guardado
    if (prog.porcentaje) return prog.porcentaje;
    let completed = 0;
    for (let i = 1; i <= 5; i++) if (prog[`rubrica${i}`]) completed++;
    return (completed / 5) * 100;
  };

  const handleExport = (reading) => {
    if (!reading.progress) {
      alert('No hay progreso para exportar.');
      return;
    }
    const dataStr = JSON.stringify(reading.progress, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `progreso-${reading.titulo}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) return <Container><h2 style={{ textAlign: 'center' }}>Cargando cursos...</h2></Container>;

  return (
    <Container>
      <Header>
        <h1>Mis Cursos</h1>
        <p>Gestiona tu aprendizaje por grupos</p>
      </Header>

      <UserInfo>
        <div className="info">
          <div className="item"><span className="label">Estudiante</span><span className="value">{userData?.nombre}</span></div>
          <div className="item"><span className="label">Cursos Activos</span><span className="value">{courses.length}</span></div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* 🆕 Button for Free Analysis */}
          <button
            className="logout-btn"
            style={{ background: '#3190FC20', color: '#3190FC', borderColor: '#3190FC' }}
            onClick={onFreeAnalysis}
          >
            Análisis Libre
          </button>
          <button className="logout-btn" onClick={signOut}>Cerrar Sesión</button>
        </div>
      </UserInfo>

      <JoinCourseSection>
        <h3>Unirse a un nuevo curso</h3>
        <form onSubmit={handleJoinCourse}>
          <div className="input-group">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="CÓDIGO DEL CURSO"
            />
            <button type="submit">Unirse</button>
          </div>
        </form>
      </JoinCourseSection>

      <CourseGrid>
        {courses.map(course => (
          <CourseCard key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <CourseHeader>
              <div>
                <h2>{course.nombre}</h2>
                <p>{course.descripcion || 'Sin descripción'} • {course.periodo}</p>
              </div>
              <div className="actions">
                <WithdrawButton onClick={() => handleWithdraw(course.id, course.nombre)}>
                  Salir del curso
                </WithdrawButton>
              </div>
            </CourseHeader>
            <ReadingsList>
              {course.readings.length === 0 && <p style={{ padding: '0 20px', color: '#888' }}>No hay lecturas asignadas.</p>}
              {course.readings.map(reading => {
                const pct = calculateProgress(reading.progress);
                const hasLocalSession = localSessionsMap[reading.textoId] || localSessionsMap[reading.titulo];
                const canContinue = pct > 0 || hasLocalSession;

                return (
                  <ReadingItem key={reading.textoId}>
                    <div className="info">
                      <h4>{reading.titulo}</h4>
                      <span>{reading.fechaLimite ? `Vence: ${reading.fechaLimite}` : 'Sin fecha límite'}</span>
                    </div>
                    <div className="progress-ring">
                      <div className="bar-bg"><div className="bar-fill" style={{ width: `${pct}%` }}></div></div>
                      <div className="label">{Math.round(pct)}% completado</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {pct > 0 && (
                        <button
                          onClick={() => handleExport(reading)}
                          style={{ background: 'transparent', color: '#666', border: '1px solid #ccc' }}
                          title="Exportar progreso"
                        >
                          📥
                        </button>
                      )}
                      <button
                        onClick={() => handleSelectText(reading, course.id)}
                        disabled={openingText === reading.textoId}
                      >
                        {openingText === reading.textoId ? 'Cargando...' :
                          (canContinue ? '▶ Continuar' : 'Iniciar')
                        }
                      </button>
                    </div>
                  </ReadingItem>
                );
              })}
            </ReadingsList>
          </CourseCard>
        ))}
        {courses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888', gridColumn: '1 / -1' }}>
            <h3>No estás inscrito en ningún curso.</h3>
            <p>Usa el código proporcionado por tu docente para unirte.</p>
          </div>
        )}
      </CourseGrid>
    </Container>
  );
}
