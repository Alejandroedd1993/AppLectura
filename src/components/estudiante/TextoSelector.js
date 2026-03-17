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
  getStudentProgress,
  getStudentCourses,
  withdrawFromCourse,
  cleanupOrphanedStudentOwnedCourseData
} from '../../firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { procesarArchivo } from '../../utils/fileProcessor';
import { recoverPdfBlobWithFallback } from '../../utils/pdfRecovery';
import { AppContext } from '../../context/AppContext';
import { getAllSessionsMerged, deleteSession } from '../../services/sessionManager';
import {
  cleanupCourseScopedBrowserData,
  cleanupMultipleCoursesBrowserData,
  inferCourseIdsFromBrowserData
} from '../../utils/courseDataCleanup';
import { getBackendBaseUrl } from '../../utils/backendConfig';

import logger from '../../utils/logger';
const BACKEND_BASE_URL = getBackendBaseUrl();

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 40px 20px;
  @media (max-width: 640px) {
    padding: 24px 14px;
  }
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

  @media (max-width: 640px) {
    margin: 0 auto 24px auto;
    text-align: left;
    h1 {
      font-size: clamp(24px, 6vw, 32px);
    }
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

  @media (max-width: 720px) {
    padding: 16px;
    flex-wrap: wrap;
    gap: 12px;
    align-items: stretch;

    .info {
      flex: 1 1 100%;
      gap: 18px;
      flex-wrap: wrap;
    }

    .item .value {
      font-size: clamp(14px, 4.2vw, 16px);
    }

    .logout-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

const UserActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  @media (max-width: 720px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
`;

const FreeAnalysisQuotaInfo = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textMuted};
  margin-top: 6px;
  text-align: right;

  strong {
    color: ${props => props.theme.primary};
  }

  &.limit-reached strong {
    color: ${props => props.theme.error};
  }

  @media (max-width: 720px) {
    text-align: left;
  }
`;

const FreeAnalysisSection = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadow.sm};
`;

const FreeAnalysisSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  cursor: pointer;
  border-bottom: 1px solid ${props => props.$expanded ? props.theme.border : 'transparent'};
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.surfaceHover || props.theme.background};
  }

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.theme.text};
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle-icon {
    font-size: 12px;
    color: ${props => props.theme.textMuted};
    transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform 0.3s ease;
  }

  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`;

const FreeAnalysisList = styled.div`
  padding: 12px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.background};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border};
    border-radius: 3px;
    &:hover { background: ${props => props.theme.textMuted}; }
  }

  @media (max-width: 640px) {
    padding: 8px 16px 12px;
  }
`;

const FreeSessionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 10px;
  gap: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: ${props => props.theme.primary}50;
    box-shadow: 0 2px 8px ${props => props.theme.primary}15;
  }

  .session-info {
    flex: 1;
    min-width: 0;

    .session-title {
      font-size: 14px;
      font-weight: 600;
      color: ${props => props.theme.text};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .session-meta {
      font-size: 12px;
      color: ${props => props.theme.textMuted};
      margin-top: 2px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }

  .session-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;

    button {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.2s, opacity 0.2s;

      &:disabled {
        opacity: 0.6;
        cursor: wait;
      }
    }

    .continue-btn {
      background: ${props => props.theme.primary};
      color: white;
      &:hover:not(:disabled) { background: ${props => props.theme.primaryDark}; }
    }

    .delete-btn {
      background: transparent;
      color: ${props => props.theme.textMuted};
      border: 1px solid ${props => props.theme.border};
      padding: 6px 10px;
      &:hover {
        background: ${props => props.theme.error}10;
        color: ${props => props.theme.error};
        border-color: ${props => props.theme.error}50;
      }
    }
  }

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;

    .session-actions {
      width: 100%;
      button { flex: 1; }
    }
  }
`;

const FreeHistoryEmpty = styled.div`
  text-align: center;
  padding: 20px;
  color: ${props => props.theme.textMuted};
  font-size: 13px;
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

  @media (max-width: 720px) {
    flex-direction: column;
    gap: 12px;
    padding: 16px;

    h2 { font-size: clamp(18px, 5.2vw, 22px); }
    .actions {
      width: 100%;
      justify-content: flex-start;
    }
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

  @media (max-width: 720px) {
    width: 100%;
    padding: 10px 12px;
    font-size: 13px;
  }
`;

const PendingCourseNotice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2.5rem 1.5rem;
  gap: 0.5rem;

  h3 {
    margin: 0;
    font-size: 1.15rem;
    color: ${props => props.theme.text};
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: ${props => props.theme.textMuted};
    max-width: 400px;
    line-height: 1.5;
  }
`;

const ReadingsList = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  @media (max-width: 720px) {
    padding: 14px;
    gap: 12px;
  }
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

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;

    .progress-ring {
      width: 100%;
      margin: 0;
      .label { text-align: left; }
    }

    button {
      width: 100%;
    }
  }
`;

const ReadingActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  .export-btn {
    min-width: 44px;
    padding: 8px 12px;
  }

  @media (max-width: 720px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;

    .export-btn {
      width: 100%;
    }
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

  @media (max-width: 640px) {
    padding: 16px;
    .input-group {
      flex-direction: column;
      align-items: stretch;
      input, button {
        width: 100%;
      }
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
  const [freeAnalysisQuota, setFreeAnalysisQuota] = useState({ used: 0, limit: 4, monthKey: '' });
  const [freeAnalysisSessions, setFreeAnalysisSessions] = useState([]);
  const [freeHistoryExpanded, setFreeHistoryExpanded] = useState(false);
  const [restoringFreeSession, setRestoringFreeSession] = useState(null);

  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const loadFreeAnalysisQuota = async () => {
    if (!currentUser?.uid) return;

    const uid = currentUser.uid;
    const monthKey = getCurrentMonthKey();
    const localKey = `free_analysis_quota_${uid}_${monthKey}`;

    let localCount = 0;
    try {
      const raw = localStorage.getItem(localKey);
      const usage = raw ? JSON.parse(raw) : null;
      localCount = Number.isFinite(Number(usage?.count)) ? Number(usage.count) : 0;
    } catch {
      localCount = 0;
    }

    let cloudCount = 0;
    try {
      const cloudProgress = await getStudentProgress(uid, 'global_progress');
      const cloudMonthCount = cloudProgress?.freeAnalysisQuota?.[monthKey]?.count;
      cloudCount = Number.isFinite(Number(cloudMonthCount)) ? Number(cloudMonthCount) : 0;
    } catch {
      cloudCount = 0;
    }

    const used = Math.max(localCount, cloudCount);
    setFreeAnalysisQuota({ used, limit: 4, monthKey });
  };

  useEffect(() => {
    if (currentUser) loadDashboard();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadFreeAnalysisQuota();
  }, [currentUser?.uid]);

  useEffect(() => {
    localSessionsMapRef.current = localSessionsMap;
  }, [localSessionsMap]);

  const loadDashboard = async () => {
    let loadingReleased = false;
    const releaseLoading = () => {
      if (loadingReleased) return;
      loadingReleased = true;
      setLoading(false);
    };

    try {
      setLoading(true);
      // 1. Cargar cursos
      const enrolledCourses = await getStudentCourses(currentUser.uid);
      if (!Array.isArray(enrolledCourses)) {
        throw new Error('No se pudo validar cursos activos del estudiante; limpieza huérfana abortada');
      }
      const activeCourseIds = (enrolledCourses || [])
        .map((course) => course?.id)
        .filter(Boolean);

      // 1.1 Limpieza de datos huérfanos (curso eliminado / baja por docente)
      try {
        const inferredCourseIds = inferCourseIdsFromBrowserData(currentUser.uid);
        const orphanCourseIds = Array.from(new Set([
          ...(inferredCourseIds || [])
        ])).filter((courseId) => !activeCourseIds.includes(courseId));

        if (orphanCourseIds.length > 0) {
          const localCleanupStats = cleanupMultipleCoursesBrowserData({
            courseIds: orphanCourseIds,
            userId: currentUser.uid
          });

          logger.log('🧹 [TextoSelector] Limpieza de cursos huérfanos aplicada:', {
            uid: currentUser.uid,
            orphanCourseIds,
            localCleanupStats
          });
        }

        // No bloquear render por limpieza cloud (puede tardar o fallar por permisos)
        cleanupOrphanedStudentOwnedCourseData(currentUser.uid, activeCourseIds)
          .then((cloudCleanupStats) => {
            const cloudOrphans = (cloudCleanupStats?.orphanCourseIds || []).filter(Boolean);
            const finalOrphans = cloudOrphans.filter((courseId) => !activeCourseIds.includes(courseId));
            if (!finalOrphans.length) return;
            const localCleanupStats = cleanupMultipleCoursesBrowserData({
              courseIds: finalOrphans,
              userId: currentUser.uid
            });
            logger.log('🧹 [TextoSelector] Limpieza cloud huérfana aplicada (async):', {
              uid: currentUser.uid,
              orphanCourseIds: finalOrphans,
              cloudCleanupStats,
              localCleanupStats
            });
          })
          .catch((cleanupError) => {
            logger.warn('⚠️ [TextoSelector] Limpieza cloud huérfana async falló:', cleanupError);
          });
      } catch (cleanupError) {
        logger.warn('⚠️ [TextoSelector] Error limpiando datos huérfanos por curso:', cleanupError);
      }

      // 2. Cargar progreso global
      const allProgress = await getAllStudentProgress(currentUser.uid);
      // 🔧 FIX CROSS-COURSE: Usar claves compuestas {sourceCourseId}_{textoId} para aislar progreso entre cursos.
      // Además mantener fallback por textoId para datos legacy (sin sourceCourseId).
      const pMap = {};
      allProgress.forEach(p => {
        const docTextoId = p.textoId || p.id;
        const docCourseId = p.sourceCourseId;
        if (docCourseId && docTextoId) {
          // Clave compuesta: prioridad máxima (aislado por curso)
          pMap[`${docCourseId}_${docTextoId}`] = p;
        }
        // Fallback legacy: solo textoId (se usa si no hay clave compuesta para un curso)
        // Solo si no existe otra entrada para ese textoId O si no tiene sourceCourseId (legacy)
        if (!pMap[docTextoId] || !docCourseId) {
          pMap[docTextoId] = p;
        }
      });

      // 3. Enriquecer cursos con detalles de lecturas
      const enrichedCourses = await Promise.all(enrolledCourses.map(async (course) => {
        // Resolver objetos de lectura
        const readingDetails = await Promise.all((course.lecturasAsignadas || []).map(async (l) => {
          // 🔧 FIX CROSS-COURSE: Buscar progreso con clave compuesta primero, luego fallback legacy.
          // Solo usar fallback si el sourceCourseId coincide o no existe.
          const compositeKey = `${course.id}_${l.textoId}`;
          let progress = pMap[compositeKey] || null;
          if (!progress) {
            const legacyProgress = pMap[l.textoId] || null;
            // 🛡️ FIX ESTRICTO: si hay curso actual, no aceptar legacy sin sourceCourseId
            if (legacyProgress && (!course.id || legacyProgress.sourceCourseId === course.id)) {
              progress = legacyProgress;
            }
          }
          return {
            ...l,
            progress
          };
        }));
        return { ...course, readings: readingDetails };
      }));

      setCourses(enrichedCourses);
      setProgressMap(pMap);
      // Liberar UI tan pronto estén los cursos y progreso principal
      releaseLoading();

      // 4. 🆕 Cargar mapa de sesiones locales CON CLAVE COMPUESTA courseId_textoId
      const mergedSessions = await getAllSessionsMerged();
      logger.log('🔍 [TextoSelector] Sesiones cargadas:', mergedSessions.length);

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

          const summative = rp?.summative;
          if (summative && typeof summative === 'object') {
            maxTs = Math.max(
              maxTs,
              toMillisSafe(summative?.submittedAt),
              toMillisSafe(summative?.gradedAt),
              toMillisSafe(summative?.timestamp)
            );
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
            logger.log(`  📎 Sesión mapeada (curso aislado): ${compositeKey}`);
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
          logger.log(`  ⚠️ Sesión sin courseId: ${sessionTextoId}`);
          // NO mapear sesiones sin courseId para evitar conflictos
        }
      });

      // Log resumido: claves con duplicados (solo diagnóstico; evita spam)
      const duplicatedKeys = Object.entries(pickedMeta)
        .filter(([, meta]) => (meta?.replacedCount || 0) > 0)
        .map(([key, meta]) => ({ key, chosenId: meta.chosenId, chosenTs: meta.chosenTs, seen: meta.replacedCount + 1 }));
      if (duplicatedKeys.length > 0) {
        logger.warn('⚠️ [TextoSelector] Duplicados de sesión por curso+texto detectados. Se eligió la más reciente.');
        try {
          console.table(duplicatedKeys);
        } catch {
          logger.warn('Detalles duplicados:', duplicatedKeys);
        }
      }

      setLocalSessionsMap(sMap);

      // 🆕 Filtrar sesiones de análisis libre (sin courseId)
      const freeSessions = mergedSessions.filter(s => {
        const sessionCourseId = s.sourceCourseId || s.text?.sourceCourseId;
        // Es análisis libre si NO tiene courseId
        // Incluir sesiones con texto o análisis previo
        const hasAnyContent = s.text?.content || s.textPreview || s.completeAnalysis || s.hasCompleteAnalysis;
        return !sessionCourseId && hasAnyContent;
      });
      // Ordenar por más reciente
      freeSessions.sort((a, b) => {
        const tsA = a.lastModified || a.createdAt || 0;
        const tsB = b.lastModified || b.createdAt || 0;
        return tsB - tsA;
      });
      setFreeAnalysisSessions(freeSessions);
      logger.log('📝 [TextoSelector] Sesiones de análisis libre encontradas:', freeSessions.length, freeSessions.map(s => ({ id: s.id, title: s.title, sourceCourseId: s.sourceCourseId })));

    } catch (error) {
      logger.error('Error loading dashboard:', error);
    } finally {
      releaseLoading();
    }
  };

  const handleFreeAnalysisClick = async () => {
    if (freeAnalysisQuota.used >= freeAnalysisQuota.limit) {
      alert(`Has alcanzado tu cuota de análisis libre (${freeAnalysisQuota.limit} por mes).`);
      return;
    }

    onFreeAnalysis?.();

    // Refrescar quota al volver al selector (si el usuario navega de regreso)
    setTimeout(() => {
      loadFreeAnalysisQuota();
    }, 300);
  };

  // 🆕 Restaurar sesión de análisis libre
  const handleRestoreFreeSession = async (session) => {
    if (restoringFreeSession) return;
    setRestoringFreeSession(session.id);

    try {
      logger.log('🔄 [TextoSelector] Restaurando sesión de análisis libre:', session.id);
      const success = await restoreSession(session);

      if (success) {
        logger.log('✅ [TextoSelector] Sesión libre restaurada exitosamente');
        // Ocultar dashboard para mostrar el análisis
        onFreeAnalysis?.();
        // Cambiar a lectura guiada
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('app-change-tab', {
            detail: { tabId: 'lectura-guiada' }
          }));
        }, 300);
      } else {
        alert('No se pudo restaurar la sesión. Inténtalo de nuevo.');
      }
    } catch (err) {
      logger.error('❌ [TextoSelector] Error restaurando sesión libre:', err);
      alert('Error al restaurar la sesión: ' + (err.message || 'Error desconocido'));
    } finally {
      setRestoringFreeSession(null);
    }
  };

  // 🆕 Eliminar sesión de análisis libre
  const handleDeleteFreeSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta sesión de análisis libre? Esta acción no se puede deshacer.')) {
      return;
    }
    const success = await deleteSession(sessionId);
    if (success) {
      // 🛡️ FIX: Actualizar estado local inmediatamente (optimista)
      setFreeAnalysisSessions(prev => prev.filter(s => s.id !== sessionId));
      // 🛡️ FIX: Recargar dashboard completo para sincronizar todos los estados
      // Esto asegura que localSessionsMap también se actualice
      try {
        await loadDashboard();
      } catch (err) {
        logger.warn('⚠️ [TextoSelector] Error recargando dashboard tras eliminar:', err);
      }
      logger.log('✅ [TextoSelector] Sesión libre eliminada:', sessionId);
    }
  };

  // Helpers para mostrar datos de sesiones libres
  const getFreeSessionTitle = (session) => {
    return session.text?.fileName
      || session.title
      || session.text?.metadata?.fileName
      || 'Análisis sin título';
  };

  const getFreeSessionDate = (session) => {
    const ts = session.lastModified || session.createdAt;
    if (!ts) return 'Fecha desconocida';
    try {
      return new Date(ts).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getFreeSessionWordCount = (session) => {
    const words = session.textMetadata?.words || session.text?.metadata?.words;
    return words ? `${words} palabras` : null;
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
        logger.log('✅ [JoinCourse] sourceCourseId actualizado en sesión:', result.courseId);
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
      const localCleanupStats = cleanupCourseScopedBrowserData({
        courseId,
        userId: currentUser.uid
      });

      setCourses(prev => prev.filter(c => c.id !== courseId)); // Optimistic UI
      setLocalSessionsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${courseId}_`)) {
            delete next[key];
          }
        });
        return next;
      });

      logger.log('🧹 [TextoSelector] Limpieza local tras baja de curso:', {
        uid: currentUser.uid,
        courseId,
        localCleanupStats
      });

      await loadDashboard();
    } catch (err) {
      alert('Error al salir del curso: ' + err.message);
    }
  };

  const handleSelectText = async (textoLite, sourceCourseId = null) => {
    if (openingText) return;
    const openingKey = `${sourceCourseId || 'free'}_${textoLite.textoId}`;
    setOpeningText(openingKey);

    // 🆕 SMART RESUME: Check if a session already exists for this text
    try {
      // 🆕 SMART RESUME: Búsqueda CON CLAVE COMPUESTA courseId_textoId
      let existingSession = null;

      // Estrategia ÚNICA: Usar clave compuesta para aislar por curso
      if (sourceCourseId && textoLite.textoId) {
        const compositeKey = `${sourceCourseId}_${textoLite.textoId}`;
        existingSession = localSessionsMapRef.current?.[compositeKey];
        logger.log(`🔍 [Smart Resume] Buscando con clave: ${compositeKey}`, existingSession ? '✅ Encontrada' : '❌ No encontrada');
      }

      // 🆕 Ya no hacemos búsqueda exhaustiva - solo usamos clave compuesta
      // Si no hay sesión con clave compuesta, es una sesión nueva

      if (existingSession) {
        logger.log('🔄 [Smart Resume] Restaurando sesión del mismo curso:', existingSession.id);
        logger.log('📊 [Smart Resume] Análisis disponible:', !!existingSession.completeAnalysis);
        try {
          const rubricKeys = Object.keys(existingSession?.rubricProgress || {});
          const maxRubricTs = rubricKeys.reduce((max, key) => {
            const rp = existingSession?.rubricProgress?.[key];
            const scores = Array.isArray(rp?.scores) ? rp.scores : [];
            const bestScoreTs = scores.reduce((m, sc) => Math.max(m, Number(sc?.timestamp) || 0), 0);
            return Math.max(max, Number(rp?.lastUpdate) || 0, bestScoreTs);
          }, 0);
          logger.log('🧭 [Smart Resume] Debug rúbricas:', { rubrics: rubricKeys.length, maxRubricTs });
        } catch {
          // noop
        }

        const success = await restoreSession(existingSession);
        if (success) {
          logger.log('✅ [Smart Resume] Sesión restaurada - saltando análisis');
          // Cambiar a vista de Lectura Guiada
          window.dispatchEvent(new CustomEvent('app-change-tab', { detail: { tabId: 'lectura-guiada' } }));
          setOpeningText(null);
          return;
        } else {
          logger.warn('⚠️ [Smart Resume] Fallo al restaurar sesión, procediendo con carga normal');
        }
      } else {
        logger.log('ℹ️ [Smart Resume] No se encontró sesión para este curso+texto, se creará nueva');
      }
    } catch (e) {
      logger.warn('⚠️ [Smart Resume] Error en sistema Smart Resume:', e);
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
      // Lógica de descarga robusta con fallback directo + proxy

      let contenido = docData.contenido;
      let archivoInfo = null;

      if (docData.fileURL && !contenido) {
        let blob = null;
        try {
          const recovered = await recoverPdfBlobWithFallback(docData.fileURL, {
            backendBaseUrl: BACKEND_BASE_URL,
            logger,
            prefix: '[TextoSelector]'
          });
          blob = recovered?.blob || null;
        } catch (recoverErr) {
          logger.warn('⚠️ [TextoSelector] Recuperación de PDF falló:', recoverErr?.message || recoverErr);
        }

        if (blob) {
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
        } else {
          // No se pudo descargar, pero pasar la URL para que VisorTexto la use directamente
          logger.warn('⚠️ [TextoSelector] No se pudo descargar PDF, pasando fileURL directa');
          contenido = 'PDF Viewing';
          archivoInfo = {
            fileURL: docData.fileURL,
            objectUrl: docData.fileURL,
            type: docData.fileType || 'application/pdf',
            name: docData.fileName || 'texto.pdf'
          };
        }
      }

      // 🆕 CRÍTICO: Propagar textoId Y sourceCourseId
      // 🛡️ FIX: sourceCourseId DESPUÉS del spread para garantizar que no sea pisado por docData
      onSelectText(contenido, {
        ...docData,
        id: docSnap.id,
        textoId: textoLite.textoId,
        sourceCourseId, // 🆕 Propagar ID del curso (AFTER spread to win)
        archivoInfo
      });

    } catch (err) {
      logger.error(err);
      alert('Error abriendo texto: ' + err.message);
    } finally {
      setOpeningText(null);
    }
  };

  const calculateProgress = (prog) => {
    if (!prog) return 0;
    // Simple promedio de rubricas o porcentaje guardado
    if (prog.porcentaje) return prog.porcentaje;
    // 🔧 FIX: Buscar en rubricProgress (donde realmente se guardan los datos)
    // y verificar que haya scores reales (no solo objetos truthy de reset)
    const rp = prog.rubricProgress || prog;
    let completed = 0;
    for (let i = 1; i <= 5; i++) {
      const rubric = rp[`rubrica${i}`];
      const summative = rubric?.summative;
      const summativeStatus = String(summative?.status || '').toLowerCase();
      const summativeAttempts = Number(summative?.attemptsUsed || 0);
      const hasSummative =
        summative && (
          summativeStatus === 'submitted' ||
          summativeStatus === 'graded' ||
          summativeAttempts > 0 ||
          Number(summative?.submittedAt || 0) > 0 ||
          Number(summative?.gradedAt || 0) > 0
        );
      // Solo contar como completada si tiene scores con datos reales
      if (rubric && (rubric.scores?.length > 0 || rubric.average > 0 || hasSummative)) {
        completed++;
      }
    }
    return (completed / 5) * 100;
  };

  const handleExport = async (reading) => {
    if (!reading.progress) {
      alert('No hay progreso para exportar.');
      return;
    }
    try {
      const { exportGenericPDF } = await import('../../utils/exportUtils');
      const sections = [{ heading: 'Lectura', keyValues: { titulo: reading.titulo || 'Sin titulo' } }];

      const progress = reading.progress;
      const safeObj = (v) => (v && typeof v === 'object' ? v : null);

      // Resumen (evita IDs/syncType y datos crudos)
      if (safeObj(progress)) {
        const resumen = {};

        // Progreso porcentual simple
        const pct = calculateProgress(progress);
        if (Number.isFinite(pct) && pct > 0) resumen.porcentaje = Math.round(pct);

        // Campos comunes (si existen)
        const candidateKeys = [
          'promedioGlobal', 'PromedioGlobal',
          'ultimaPuntuacion', 'UltimaPuntuacion',
          'lastActivity', 'LastActivity', 'ultimaActividad', 'UltimaActividad',
          'lastResetAt', 'LastResetAt'
        ];
        candidateKeys.forEach((k) => {
          if (progress[k] !== undefined && progress[k] !== null && progress[k] !== '') {
            resumen[k] = progress[k];
          }
        });

        // Si no encontramos nada, al menos exportar valores primitivos "cortos"
        if (Object.keys(resumen).length === 0) {
          Object.entries(progress).forEach(([k, v]) => {
            if (v === null || v === undefined || v === '') return;
            if (typeof v === 'string' && v.length > 250) return;
            if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
              resumen[k] = v;
            }
          });
        }

        sections.push({ heading: 'Resumen de progreso', keyValues: resumen });

        // Actividades: resumir activitiesProgress en lugar de volcar JSON
        const rawActivities = progress.activitiesProgress || progress.ActivitiesProgress;
        let activities = rawActivities;
        if (typeof rawActivities === 'string') {
          try { activities = JSON.parse(rawActivities); } catch { activities = null; }
        }

        if (activities && typeof activities === 'object') {
          const docs = Object.entries(activities);
          const stats = {
            totalActividades: docs.length,
            completadas: 0,
            mcqPasados: 0,
            totalPreguntasMCQ: 0,
            correctasMCQ: 0,
            totalPreguntasSintesis: 0,
          };

          const rows = [];
          docs.slice(0, 8).forEach(([\u005fdocId, docData], idx) => {
            const d = docData && typeof docData === 'object' ? docData : {};
            const prep = (d.preparation && typeof d.preparation === 'object') ? d.preparation : d;

            const completed = !!prep.completed;
            if (completed) stats.completadas += 1;

            const mcq = (prep.mcqResults && typeof prep.mcqResults === 'object') ? prep.mcqResults : (d.mcqResults || null);
            if (mcq && typeof mcq === 'object') {
              if (typeof mcq.total === 'number') stats.totalPreguntasMCQ += mcq.total;
              if (typeof mcq.correct === 'number') stats.correctasMCQ += mcq.correct;
              if (mcq.passed === true) stats.mcqPasados += 1;
            } else if (prep.mcqPassed === true) {
              stats.mcqPasados += 1;
            }

            const synth = (prep.synthesisAnswers && typeof prep.synthesisAnswers === 'object') ? prep.synthesisAnswers : (d.synthesisAnswers || null);
            if (synth && typeof synth.totalQuestions === 'number') {
              stats.totalPreguntasSintesis += synth.totalQuestions;
            }

            const percentage = (typeof prep.percentage === 'number') ? prep.percentage
              : (typeof prep.porcentaje === 'number') ? prep.porcentaje
                : (mcq && typeof mcq.total === 'number' && mcq.total > 0 && typeof mcq.correct === 'number')
                  ? Math.round((mcq.correct / mcq.total) * 100)
                  : null;

            rows.push([
              `Actividad ${idx + 1}`,
              completed ? 'Completada' : 'En progreso',
              percentage === null ? '—' : `${percentage}%`,
            ]);
          });

          sections.push({
            heading: 'Actividades (resumen)',
            keyValues: {
              totalActividades: stats.totalActividades,
              completadas: stats.completadas,
              mcqPasados: stats.mcqPasados,
              totalPreguntasMCQ: stats.totalPreguntasMCQ,
              correctasMCQ: stats.correctasMCQ,
              totalPreguntasSintesis: stats.totalPreguntasSintesis,
            },
          });
          if (rows.length > 0) {
            sections.push({
              heading: 'Detalle (muestra)',
              table: { headers: ['Actividad', 'Estado', '%'], rows },
            });
          }
        }
      }
      await exportGenericPDF({
        title: `Progreso de Lectura - ${reading.titulo || 'Sin título'}`,
        sections,
        fileName: `progreso-${(reading.titulo || 'lectura').replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (error) {
      logger.error('Error exportando progreso como PDF:', error);
      alert('Error exportando el progreso');
    }
  };

  if (loading) return <Container><h2 style={{ textAlign: 'center' }}>Cargando cursos...</h2></Container>;

  const remainingFreeAnalyses = Math.max(0, freeAnalysisQuota.limit - freeAnalysisQuota.used);

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
        <UserActions>
          {/* 🆕 Button for Free Analysis */}
          <button
            className="logout-btn"
            style={{ background: '#3190FC20', color: '#3190FC', borderColor: '#3190FC' }}
            onClick={handleFreeAnalysisClick}
            disabled={freeAnalysisQuota.used >= freeAnalysisQuota.limit}
            title={freeAnalysisQuota.used >= freeAnalysisQuota.limit
              ? `Límite mensual alcanzado (${freeAnalysisQuota.limit}/${freeAnalysisQuota.limit})`
              : `Disponible: ${remainingFreeAnalyses} análisis este mes`
            }
          >
            Análisis Libre
          </button>
          <FreeAnalysisQuotaInfo className={freeAnalysisQuota.used >= freeAnalysisQuota.limit ? 'limit-reached' : ''}>
            Análisis libre este mes: <strong>{freeAnalysisQuota.used}/{freeAnalysisQuota.limit}</strong>
            {' · '}
            {freeAnalysisQuota.used >= freeAnalysisQuota.limit
              ? 'Te quedan 0 análisis este mes'
              : `Te quedan ${remainingFreeAnalyses} análisis este mes`}
          </FreeAnalysisQuotaInfo>
          <button className="logout-btn" onClick={signOut}>Cerrar Sesión</button>
        </UserActions>
      </UserInfo>

      {/* 🆕 Historial de Análisis Libres */}
      {freeAnalysisSessions.length > 0 && (
        <FreeAnalysisSection>
          <FreeAnalysisSectionHeader
            onClick={() => setFreeHistoryExpanded(!freeHistoryExpanded)}
            $expanded={freeHistoryExpanded}
          >
            <h3>
              <span>📝</span>
              Historial de Análisis Libres
              <span style={{ fontSize: '13px', fontWeight: 400, color: 'inherit', opacity: 0.7 }}>
                ({freeAnalysisSessions.length})
              </span>
            </h3>
            <span className="toggle-icon">▼</span>
          </FreeAnalysisSectionHeader>

          {freeHistoryExpanded && (
            <FreeAnalysisList>
              {freeAnalysisSessions.length === 0 ? (
                <FreeHistoryEmpty>No hay análisis libres guardados.</FreeHistoryEmpty>
              ) : (
                freeAnalysisSessions.map(session => (
                  <FreeSessionItem key={session.id}>
                    <div className="session-info">
                      <div className="session-title">
                        {getFreeSessionTitle(session)}
                      </div>
                      <div className="session-meta">
                        <span>📅 {getFreeSessionDate(session)}</span>
                        {getFreeSessionWordCount(session) && (
                          <span>📄 {getFreeSessionWordCount(session)}</span>
                        )}
                        {(session.hasCompleteAnalysis || session.completeAnalysis) && (
                          <span>✅ Analizado</span>
                        )}
                      </div>
                    </div>
                    <div className="session-actions">
                      <button
                        className="continue-btn"
                        onClick={() => handleRestoreFreeSession(session)}
                        disabled={restoringFreeSession === session.id}
                      >
                        {restoringFreeSession === session.id ? 'Cargando...' : '▶ Continuar'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDeleteFreeSession(session.id, e)}
                        title="Eliminar sesión"
                      >
                        🗑
                      </button>
                    </div>
                  </FreeSessionItem>
                ))
              )}
            </FreeAnalysisList>
          )}
        </FreeAnalysisSection>
      )}

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
        {courses.map(course => {
          const isPending = course.enrollmentStatus === 'pending';
          return (
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

            {isPending ? (
              <PendingCourseNotice>
                <span style={{ fontSize: '2.5rem' }}>🔒</span>
                <h3>Esperando aprobación del docente</h3>
                <p>Tu solicitud de acceso ha sido enviada. Podrás ver y trabajar las lecturas del curso una vez que el docente te apruebe.</p>
              </PendingCourseNotice>
            ) : (
            <ReadingsList>
              {course.readings.length === 0 && <p style={{ padding: '0 20px', color: '#888' }}>No hay lecturas asignadas.</p>}
              {course.readings.map(reading => {
                const pct = calculateProgress(reading.progress);
                const compositeSessionKey = `${course.id}_${reading.textoId}`;
                const hasLocalSession = Boolean(localSessionsMap[compositeSessionKey]);
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
                    <ReadingActions>
                      {pct > 0 && (
                        <button
                          onClick={() => handleExport(reading)}
                          style={{ background: 'transparent', color: '#666', border: '1px solid #ccc' }}
                          className="export-btn"
                          title="Exportar progreso"
                        >
                          📥
                        </button>
                      )}
                      <button
                        onClick={() => handleSelectText(reading, course.id)}
                        disabled={openingText === `${course.id || 'free'}_${reading.textoId}`}
                      >
                        {openingText === `${course.id || 'free'}_${reading.textoId}` ? 'Cargando...' :
                          (canContinue ? '▶ Continuar' : 'Iniciar')
                        }
                      </button>
                    </ReadingActions>
                  </ReadingItem>
                );
              })}
            </ReadingsList>
            )}
          </CourseCard>
          );
        })}
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
