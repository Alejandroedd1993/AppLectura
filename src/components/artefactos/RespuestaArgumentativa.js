// src/components/artefactos/RespuestaArgumentativa.js
import React, { useState, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateRespuestaArgumentativa } from '../../services/respuestaArgumentativa.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useRateLimit from '../../hooks/useRateLimit'; // 🆕 Rate Limiting
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

import { getDimension } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import TeacherScoreOverrideBanner from './TeacherScoreOverrideBanner';

// ============================================
// STYLED COMPONENTS
// ============================================

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 1.5rem);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  background: linear-gradient(135deg, ${props => props.theme.primary || '#2196F3'} 0%, ${props => props.theme.primaryDark || props.theme.primary || '#1976D2'} 100%);
  border-radius: 12px;
  color: white;
`;

const Title = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: clamp(0.85rem, 2.2vw, 0.95rem);
  opacity: 0.9;
  line-height: 1.5;
`;

const GuideSection = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const GuideHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`;

const GuideTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
`;

const ToggleIcon = styled.span`
  transition: transform 0.3s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const GuideContent = styled(motion.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const GuideQuestions = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const GuideQuestion = styled.li`
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.5;

  &::before {
    content: '💡';
    position: absolute;
    left: 0;
  }
`;

const FormSection = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: block;
  color: ${props => props.theme.text};
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-family: inherit;
  font-size: clamp(0.9rem, 2.2vw, 0.95rem);
  color: ${props => props.theme.text};
  background: ${props => props.theme.background};
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary || '#2196F3'};
  }

  &::placeholder {
    color: ${props => props.theme.textMuted};
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    min-height: 100px;
  }
`;

const HintText = styled.p`
  margin: 0.5rem 0 0 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`;

const ValidationMessage = styled(motion.div)`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  background: ${props => props.$valid ? '#dcfce7' : '#fee2e2'};
  border: 1px solid ${props => props.$valid ? '#86efac' : '#fca5a5'};
  color: ${props => props.$valid ? '#166534' : '#991b1b'};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme.primary || '#2196F3'};
  color: white;

  &:hover:not(:disabled) {
    background: ${props => props.theme.primaryHover || props.theme.primaryDark || props.theme.primary || '#1976D2'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => `${props.theme.primary || '#2196F3'}40`};
  }
`;

const _SecondaryButton = styled(Button)`
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  border: 1px solid ${props => props.theme.border};

  &:hover:not(:disabled) {
    background: ${props => props.theme.border};
  }
`;

const FeedbackSection = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FeedbackHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const NivelGlobal = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${props => {
    switch (props.$nivel) {
      case 1: return '#fee2e2';
      case 2: return '#fed7aa';
      case 3: return '#dcfce7';
      case 4: return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$nivel) {
      case 1: return '#991b1b';
      case 2: return '#c2410c';
      case 3: return '#166534';
      case 4: return '#6b21a8';
      default: return '#374151';
    }
  }};
  font-weight: 700;
  font-size: 1rem;
`;

const DimensionLabel = styled.p`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const CriteriosGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const CriterioCard = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
`;

const CriterioHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const CriterioTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 0.95rem;
`;

const CriterioNivel = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$nivel) {
      case 1: return '#fee2e2';
      case 2: return '#fed7aa';
      case 3: return '#dcfce7';
      case 4: return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$nivel) {
      case 1: return '#991b1b';
      case 2: return '#c2410c';
      case 3: return '#166534';
      case 4: return '#6b21a8';
      default: return '#374151';
    }
  }};
`;

const ListSection = styled.div`
  margin-top: 0.75rem;
`;

const ListTitle = styled.p`
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.text};
  font-weight: 600;
  font-size: 0.85rem;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ListItem = styled.li`
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  padding-left: 1.25rem;
  position: relative;
  line-height: 1.4;

  &::before {
    content: '${props => props.$icon || '•'}';
    position: absolute;
    left: 0;
  }
`;

const LoadingSpinner = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
`;

const SpinnerIcon = styled(motion.div)`
  font-size: 3rem;
`;

const LoadingText = styled.p`
  color: ${props => props.theme.textMuted};
  font-size: 0.95rem;
  margin: 0;
`;

// ============================================
// 🆕 STYLED COMPONENTS - SISTEMA DE CITAS
// ============================================

const CitasButton = styled.button`
  position: fixed;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  right: calc(1.25rem + env(safe-area-inset-right));
  z-index: 1001;
  padding: 0.7rem 1.2rem;
  background: ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.cardBg || '#fff'};
  color: ${props => props.$active ? '#fff' : props.theme.textPrimary};
  border: 2px solid ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.border};
  border-radius: 50px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  
  ${props => props.$hasNotification && !props.$active && `
    &:after {
      content: '';
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: ${props.theme.success || '#4CAF50'};
      border: 2px solid ${props.theme.cardBg || '#fff'};
      border-radius: 50%;
      animation: fabPulse 2s ease-in-out infinite;
    }
    @keyframes fabPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
  `}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    border-color: ${props => props.theme.warning || '#f59e0b'};
  }

  &:focus-visible {
    outline: 3px solid ${props => props.theme.primary || '#3190FC'};
    outline-offset: 2px;
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    bottom: calc(4rem + env(safe-area-inset-bottom));
    right: calc(1rem + env(safe-area-inset-right));
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
`;

const CitasPanel = styled.div`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: ${props => props.theme.surface};
  border-left: 2px solid ${props => props.theme.border};
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const CitasPanelHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    font-size: 1.2rem;
    margin: 0;
  }
`;

const CitasList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.surface};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border};
    border-radius: 4px;
  }
`;

const CitaItem = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const CitaTexto = styled.p`
  margin: 0 0 0.75rem 0;
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
  font-style: italic;
  padding: 0.5rem;
  background: ${props => props.theme.surface};
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
`;

const CitaFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const CitaInfo = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  margin-right: auto;
`;

const InsertarButton = styled.button`
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const EliminarButton = styled.button`
  background: ${props => props.theme.error};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EmptyCitasMessage = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${props => props.theme.textMuted};
  line-height: 1.6;
  
  p {
    margin: 0.5rem 0;
  }
  
  ol {
    margin: 1rem auto;
    padding-left: 1.5rem;
    max-width: 250px;
  }
`;

const PasteErrorMessage = styled(motion.div)`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.danger}15;
  border: 1px solid ${props => props.theme.danger}40;
  border-radius: 6px;
  color: ${props => props.theme.danger || '#F44336'};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.5s ease;

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;

const AutoSaveMessage = styled(motion.div)`
  background: ${props => props.theme.success}15;
  border: 1px solid ${props => props.theme.success};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.success};
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// ============================================
// 🆕 STYLED COMPONENTS - HISTORIAL
// ============================================

const HistoryRibbon = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${props => props.theme.surface};
  border-bottom: 1px solid ${props => props.theme.border};
  overflow-x: auto;
  align-items: center;
  margin-bottom: 1rem;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border};
    border-radius: 4px;
  }
`;

const HistoryTitle = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const HistoryBadge = styled.button`
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  border: 1px solid ${props => props.$active ? props.theme.primary : props.theme.border};
  background: ${props => props.$active ? props.theme.primary + '15' : 'transparent'};
  color: ${props => props.$active ? props.theme.primary : props.theme.textMuted};
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.theme.primary + '10'};
    border-color: ${props => props.theme.primary};
  }

  .score {
    font-weight: 700;
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    background: ${props => props.$active ? props.theme.primary : props.theme.border};
    color: ${props => props.$active ? '#fff' : props.theme.textMuted};
    border-radius: 8px;
  }
`;

const RestoreBanner = styled(motion.div)`
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #92400e;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
`;

const RestoreButton = styled.button`
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.8rem;
  
  &:hover {
    background: #d97706;
  }
`;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function RespuestaArgumentativa({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation, updateActivitiesProgress, sourceCourseId, currentTextoId, activitiesProgress } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas
  const rateLimit = useRateLimit('evaluate_respuesta_argumentativa', { cooldownMs: 5000, maxPerHour: 10 }); // Rate limiting
  const MAX_ATTEMPTS = 3; // 🆕 Límite de intentos

  // 🆕 Ref para rastrear si ya procesamos el reset (evita bucle infinito)
  const resetProcessedRef = useRef(null);

  // 🆕 FASE 1 FIX: Estados con carga dinámica por textoId
  const [tesis, setTesis] = useState('');
  const [evidencias, setEvidencias] = useState('');
  const [contraargumento, setContraargumento] = useState('');
  const [refutacion, setRefutacion] = useState('');

  // 🆕 Efecto para cargar borradores cuando cambia el textoId
  useEffect(() => {
    if (!currentTextoId) return;

    // Evitar contaminación visual entre documentos mientras se rehidrata
    setTesis('');
    setEvidencias('');
    setContraargumento('');
    setRefutacion('');

    let cancelled = false;

    import('../../services/sessionManager').then(({ getDraftKey }) => {
      if (cancelled) return;
      const getKey = (base) => getDraftKey(base, currentTextoId);

      const readAndMigrateLegacy = (base) => {
        const scopedKey = getKey(base);
        const scoped = sessionStorage.getItem(scopedKey) || '';
        if (scoped) return scoped;

        const legacy = sessionStorage.getItem(base) || '';
        if (legacy) {
          sessionStorage.setItem(scopedKey, legacy);
          sessionStorage.removeItem(base);
          return legacy;
        }
        return '';
      };

      setTesis(readAndMigrateLegacy('respuestaArgumentativa_tesis'));
      setEvidencias(readAndMigrateLegacy('respuestaArgumentativa_evidencias'));
      setContraargumento(readAndMigrateLegacy('respuestaArgumentativa_contraargumento'));
      setRefutacion(readAndMigrateLegacy('respuestaArgumentativa_refutacion'));

      console.log('📂 [RespuestaArgumentativa] Borradores cargados para textoId:', currentTextoId);
    });

    return () => {
      cancelled = true;
    };
  }, [currentTextoId]);

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
  const [evaluationAttempts, setEvaluationAttempts] = useState(0); // 🆕 Contador de intentos
  const [history, setHistory] = useState([]); // 🆕 Historial de versiones
  const [viewingVersion, setViewingVersion] = useState(null); // 🆕 Versión en modo lectura
  const [isSubmitted, setIsSubmitted] = useState(false); // 🆕 Estado de entrega final
  const [teacherScoreOverride, setTeacherScoreOverride] = useState(null); // 🆕 Override docente
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  const [showGuide, setShowGuide] = useState(true);

  // 🆕 Estados para panel de citas y error de pegado
  const [showCitasPanel, setShowCitasPanel] = useState(false);
  const [pasteError, setPasteError] = useState(null);

  // 🆕 Refs para rastrear posición del cursor
  const tesisRef = React.useRef(null);
  const evidenciasRef = React.useRef(null);
  const contraargumentoRef = React.useRef(null);
  const refutacionRef = React.useRef(null);
  const [cursorPositions, setCursorPositions] = React.useState({
    tesis: 0,
    evidencias: 0,
    contraargumento: 0,
    refutacion: 0
  });

  // 🆕 Keyboard shortcuts para productividad
  const [_showSaveHint, setShowSaveHint] = useState(false);

  useKeyboardShortcuts({
    'ctrl+s': (_e) => {
      console.log('⌨️ Ctrl+S: Guardando borrador RespuestaArgumentativa...');
      if (!currentTextoId) return;
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId);
        if (tesis) sessionStorage.setItem(getKey('respuestaArgumentativa_tesis'), tesis);
        if (evidencias) sessionStorage.setItem(getKey('respuestaArgumentativa_evidencias'), evidencias);
        if (contraargumento) sessionStorage.setItem(getKey('respuestaArgumentativa_contraargumento'), contraargumento);
        if (refutacion) sessionStorage.setItem(getKey('respuestaArgumentativa_refutacion'), refutacion);
      });
      setShowSaveHint(true);
      setTimeout(() => setShowSaveHint(false), 2000);
    },
    'ctrl+enter': (_e) => {
      console.log('⌨️ Ctrl+Enter: Evaluando Respuesta Argumentativa...');
      if (!loading && isValid && rateLimit.canProceed && evaluationAttempts < MAX_ATTEMPTS && !isSubmitted && !viewingVersion) {
        handleEvaluate();
      }
    },
    'escape': (_e) => {
      console.log('⌨️ Esc: Cerrando paneles...');
      if (showCitasPanel) {
        setShowCitasPanel(false);
      } else if (pasteError) {
        setPasteError(null);
      } else if (viewingVersion) {
        setViewingVersion(null);
      }
    }
  }, {
    enabled: true,
    excludeInputs: false
  });

  // 🆕 Memo para contenido visualizado (actual o histórico)
  const displayedContent = useMemo(() => {
    if (viewingVersion) {
      return {
        tesis: viewingVersion.content.tesis,
        evidencias: viewingVersion.content.evidencias,
        contraargumento: viewingVersion.content.contraargumento,
        refutacion: viewingVersion.content.refutacion,
        feedback: viewingVersion.feedback
      };
    }
    return {
      tesis,
      evidencias,
      contraargumento,
      refutacion,
      feedback
    };
  }, [viewingVersion, tesis, evidencias, contraargumento, refutacion, feedback]);

  const isReadOnly = viewingVersion !== null || isSubmitted;

  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    console.log('✏️ [RespuestaArgumentativa] Desbloqueando para editar...');
    setIsLocked(false);
    setFeedback(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);

  // Validación
  const isValid = useMemo(() => {
    return tesis.trim().length >= 20 &&
      evidencias.trim().length >= 30 &&
      contraargumento.trim().length >= 20 &&
      refutacion.trim().length >= 30;
  }, [tesis, evidencias, contraargumento, refutacion]);

  const validationMessage = useMemo(() => {
    if (!tesis.trim()) return '⚠️ Formula tu tesis (postura clara sobre el texto)';
    if (tesis.trim().length < 20) return '⚠️ Desarrolla tu tesis con más claridad (mín. 20 caracteres)';
    if (!evidencias.trim()) return '⚠️ Presenta evidencias del texto que sustenten tu tesis';
    if (evidencias.trim().length < 30) return '⚠️ Desarrolla las evidencias (mín. 30 caracteres)';
    if (!contraargumento.trim()) return '⚠️ Presenta una objeción válida a tu tesis';
    if (contraargumento.trim().length < 20) return '⚠️ Desarrolla el contraargumento (mín. 20 caracteres)';
    if (!refutacion.trim()) return '⚠️ Refuta el contraargumento defendiendo tu postura';
    if (refutacion.trim().length < 30) return '⚠️ Desarrolla la refutación (mín. 30 caracteres)';
    return '✅ Argumento completo. Solicita evaluación criterial.';
  }, [tesis, evidencias, contraargumento, refutacion]);

  // 🆕 FASE 1 FIX: Guardar respaldo en sessionStorage con claves namespaced
  useEffect(() => {
    if (!currentTextoId) return;

    import('../../services/sessionManager').then(({ getDraftKey }) => {
      const getKey = (base) => getDraftKey(base, currentTextoId);

      if (tesis) sessionStorage.setItem(getKey('respuestaArgumentativa_tesis'), tesis);
      if (evidencias) sessionStorage.setItem(getKey('respuestaArgumentativa_evidencias'), evidencias);
      if (contraargumento) sessionStorage.setItem(getKey('respuestaArgumentativa_contraargumento'), contraargumento);
      if (refutacion) sessionStorage.setItem(getKey('respuestaArgumentativa_refutacion'), refutacion);

      console.log('💾 [RespuestaArgumentativa] Borradores guardados para textoId:', currentTextoId);
    });
  }, [tesis, evidencias, contraargumento, refutacion, currentTextoId]);

  // 🆕 Sincronización en la nube de borradores (debounced)
  useEffect(() => {
    if (!currentTextoId) return;

    if (tesis || evidencias || contraargumento || refutacion) {
      const timer = setTimeout(() => {
        import('../../services/sessionManager').then(({ updateCurrentSession, captureArtifactsDrafts }) => {
          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId) });
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [tesis, evidencias, contraargumento, refutacion, currentTextoId]);

  // 🆕 Escuchar restauración de sesión para actualizar estados desde sessionStorage
  useEffect(() => {
    if (!currentTextoId) return;

    const handleSessionRestored = () => {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId);

        const readAndMigrateLegacy = (base) => {
          const scopedKey = getKey(base);
          const scoped = sessionStorage.getItem(scopedKey) || '';
          if (scoped) return scoped;

          const legacy = sessionStorage.getItem(base) || '';
          if (legacy) {
            sessionStorage.setItem(scopedKey, legacy);
            sessionStorage.removeItem(base);
            return legacy;
          }
          return '';
        };

        const restoredTesis = readAndMigrateLegacy('respuestaArgumentativa_tesis');
        const restoredEvidencias = readAndMigrateLegacy('respuestaArgumentativa_evidencias');
        const restoredContra = readAndMigrateLegacy('respuestaArgumentativa_contraargumento');
        const restoredRefutacion = readAndMigrateLegacy('respuestaArgumentativa_refutacion');

        if (restoredTesis !== tesis) setTesis(restoredTesis);
        if (restoredEvidencias !== evidencias) setEvidencias(restoredEvidencias);
        if (restoredContra !== contraargumento) setContraargumento(restoredContra);
        if (restoredRefutacion !== refutacion) setRefutacion(restoredRefutacion);

        if (restoredTesis || restoredEvidencias || restoredContra || restoredRefutacion) {
          console.log('🔄 [RespuestaArgumentativa] Borradores restaurados desde sesión');
        }
      });
    };

    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [tesis, evidencias, contraargumento, refutacion, currentTextoId]);

  // Persistencia
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const rewardsResourceId = lectureId ? `${lectureId}:RespuestaArgumentativa` : null;
  const persistenceKey = lectureId ? `respuesta_argumentativa_${lectureId}` : null;

  // ✅ Estructura corregida: capturamos el retorno del hook para usar saveManual
  const persistence = useActivityPersistence(persistenceKey, {
    enabled: !!persistenceKey,
    courseId: sourceCourseId, // 🆕 Aislar datos por curso
    legacyDocumentIds: (currentTextoId && documentId && lectureId && lectureId !== documentId) ? [`respuesta_argumentativa_${documentId}`] : [],
    studentAnswers: {
      tesis: tesis,
      evidencias: evidencias,
      contraargumento: contraargumento,
      refutacion: refutacion
    },
    attempts: evaluationAttempts,
    history: history,
    submitted: isSubmitted,
    aiFeedbacks: { respuesta_argumentativa: feedback },
    onRehydrate: (data) => {
      if (data.student_answers?.tesis) setTesis(data.student_answers.tesis);
      if (data.student_answers?.evidencias) setEvidencias(data.student_answers.evidencias);
      if (data.student_answers?.contraargumento) setContraargumento(data.student_answers.contraargumento);
      if (data.student_answers?.refutacion) setRefutacion(data.student_answers.refutacion);
      if (data.attempts) setEvaluationAttempts(data.attempts);
      if (data.history) setHistory(data.history);
      if (data.submitted) setIsSubmitted(true);
      if (data.ai_feedbacks?.respuesta_argumentativa) setFeedback(data.ai_feedbacks.respuesta_argumentativa);
    }
  });

  // 🆕 CLOUD SYNC: Cargar history/drafts desde Firestore (activitiesProgress)
  // También detecta resets del docente y limpia el estado local
  useEffect(() => {
    if (!lectureId) return;

    const findCloudArtifact = (artifactKey) => {
      if (!activitiesProgress) return null;
      const nested = activitiesProgress?.[lectureId]?.artifacts?.[artifactKey];
      if (nested) return nested;
      const direct = activitiesProgress?.artifacts?.[artifactKey];
      if (direct) return direct;
      if (typeof activitiesProgress === 'object') {
        for (const key of Object.keys(activitiesProgress)) {
          const candidate = activitiesProgress?.[key]?.artifacts?.[artifactKey];
          if (candidate) return candidate;
        }
      }
      return null;
    };

    const cloudData = findCloudArtifact('respuestaArgumentativa');
    
    // 🔄 DETECTAR RESET: Si cloudData tiene resetBy='docente', verificar si aplica
    // Convertir resetAt a timestamp en milisegundos (puede ser string ISO, Firestore Timestamp, o número)
    const rawResetAt = cloudData?.resetAt;
    let resetTimestamp = 0;
    if (rawResetAt) {
      if (rawResetAt.seconds) {
        // Firestore Timestamp
        resetTimestamp = rawResetAt.seconds * 1000;
      } else if (typeof rawResetAt === 'string') {
        // ISO string
        resetTimestamp = new Date(rawResetAt).getTime();
      } else if (typeof rawResetAt === 'number') {
        // Ya es timestamp (verificar si es segundos o milisegundos)
        resetTimestamp = rawResetAt > 1e12 ? rawResetAt : rawResetAt * 1000;
      }
    }
    
    // 🆕 CLAVE: Si submitted === false explícitamente por el reset, debemos aplicarlo
    // El reset escribe submitted: false, así que si cloudData.submitted es false
    // y hay resetBy='docente', es un reset válido
    const wasResetByDocente = cloudData?.resetBy === 'docente' && resetTimestamp > 0;
    const isCurrentlySubmitted = cloudData?.submitted === true;
    
    // Solo aplicar reset si:
    // 1. Hay resetBy='docente' y resetTimestamp válido
    // 2. El artefacto NO está actualmente submitted (el docente lo reseteó a submitted: false)
    const shouldApplyReset = wasResetByDocente && !isCurrentlySubmitted;
    
    if (shouldApplyReset) {
      // Verificar si ya procesamos este reset específico
      const resetKey = `${lectureId}_${resetTimestamp}`;
      if (resetProcessedRef.current === resetKey) {
        // Ya procesamos este reset, no hacer nada
        return;
      }
      
      console.log('🔄 [RespuestaArgumentativa] Detectado RESET por docente, limpiando estado local...');
      console.log('🔄 [RespuestaArgumentativa] resetTimestamp:', resetTimestamp, 'isCurrentlySubmitted:', isCurrentlySubmitted);
      resetProcessedRef.current = resetKey; // Marcar como procesado
      
      // Limpiar estados
      setIsSubmitted(false);
      setIsLocked(false);
      setHistory([]);
      setEvaluationAttempts(0);
      setFeedback(null);
      setTesis('');
      setEvidencias('');
      setContraargumento('');
      setRefutacion('');
      setViewingVersion(null);
      setTeacherScoreOverride(null); // Limpiar override docente tras reset
      
      // Limpiar sessionStorage
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, lectureId);
        sessionStorage.removeItem(getKey('respuestaArgumentativa_tesis'));
        sessionStorage.removeItem(getKey('respuestaArgumentativa_evidencias'));
        sessionStorage.removeItem(getKey('respuestaArgumentativa_contraargumento'));
        sessionStorage.removeItem(getKey('respuestaArgumentativa_refutacion'));
        console.log('🧹 [RespuestaArgumentativa] Borradores locales limpiados tras reset');
      });
      
      if (persistence?.clearResults) persistence.clearResults();
      
      return;
    }
    
    if (!cloudData) return;

    if (cloudData.history && Array.isArray(cloudData.history)) {
      console.log('☁️ [RespuestaArgumentativa] Cargando historial desde Firestore:', cloudData.history.length, 'versiones');
      setHistory(prev => prev.length >= cloudData.history.length ? prev : cloudData.history);
    }

    if (cloudData.attempts) setEvaluationAttempts(prev => Math.max(prev, cloudData.attempts));
    if (cloudData.submitted) setIsSubmitted(true);

    // 🆕 Override de nota docente
    if (cloudData.teacherOverrideScore != null) {
      setTeacherScoreOverride({
        teacherOverrideScore: cloudData.teacherOverrideScore,
        scoreOverrideReason: cloudData.scoreOverrideReason,
        scoreOverriddenAt: cloudData.scoreOverriddenAt,
        docenteNombre: cloudData.docenteNombre
      });
    }

    if (cloudData.drafts) {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, lectureId);

        if (cloudData.drafts.tesis && !sessionStorage.getItem(getKey('respuestaArgumentativa_tesis'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_tesis'), cloudData.drafts.tesis);
          setTesis(cloudData.drafts.tesis);
        }
        if (cloudData.drafts.evidencias && !sessionStorage.getItem(getKey('respuestaArgumentativa_evidencias'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_evidencias'), cloudData.drafts.evidencias);
          setEvidencias(cloudData.drafts.evidencias);
        }
        if (cloudData.drafts.contraargumento && !sessionStorage.getItem(getKey('respuestaArgumentativa_contraargumento'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_contraargumento'), cloudData.drafts.contraargumento);
          setContraargumento(cloudData.drafts.contraargumento);
        }
        if (cloudData.drafts.refutacion && !sessionStorage.getItem(getKey('respuestaArgumentativa_refutacion'))) {
          sessionStorage.setItem(getKey('respuestaArgumentativa_refutacion'), cloudData.drafts.refutacion);
          setRefutacion(cloudData.drafts.refutacion);
        }
        console.log('☁️ [RespuestaArgumentativa] Borradores restaurados desde Firestore');
      });
    }
  }, [lectureId, activitiesProgress, persistence]);

  // 🆕 Manejadores de Historial (definidos DESPUÉS de persistence para poder usar saveManual)
  const handleViewVersion = useCallback((version) => {
    setViewingVersion(version);
  }, []);

  const handleRestoreVersion = useCallback(() => {
    if (!viewingVersion || isSubmitted) return;

    setTesis(viewingVersion.content.tesis);
    setEvidencias(viewingVersion.content.evidencias);
    setContraargumento(viewingVersion.content.contraargumento);
    setRefutacion(viewingVersion.content.refutacion);
    setFeedback(viewingVersion.feedback);
    setViewingVersion(null);

    setTimeout(() => persistence.saveManual(), 100);
  }, [viewingVersion, persistence, isSubmitted]);

  // 🆕 Handle submission
  const handleSubmit = useCallback(() => {
    if (!feedback) return;

    if (window.confirm('¿Estás seguro que deseas entregar tu tarea? Una vez entregada, no podrás realizar más cambios ni solicitar nuevas evaluaciones.')) {
      setIsSubmitted(true);

      // ✅ Forzar guardado inmediato con saveManual
      setTimeout(() => persistence.saveManual(), 100);

      // 🆕 SYNC: Registrar entrega en contexto global para Dashboard (preservando historial)
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => {
          // Obtener el score previo guardado (lastScore) o calcular desde feedback
          const previousArtifact = prev?.artifacts?.respuestaArgumentativa || {};
          const scoreToUse = previousArtifact.lastScore || (feedback.nivel_global ? feedback.nivel_global * 2.5 : 0);
          
          console.log('📤 [RespuestaArgumentativa] Entregando con score:', scoreToUse, 'lastScore:', previousArtifact.lastScore, 'feedback.nivel_global:', feedback.nivel_global);
          
          return {
            ...prev,
            artifacts: {
              ...(prev?.artifacts || {}),
              respuestaArgumentativa: {
                ...previousArtifact,
                submitted: true,
                submittedAt: Date.now(),
                score: scoreToUse,
                nivel: feedback.nivel_global || previousArtifact.lastNivel || 0,
                history: history,
                attempts: evaluationAttempts,
                finalContent: { tesis, evidencias, contraargumento, refutacion }
              }
            }
          };
        });
      }

      const event = new CustomEvent('evaluation-complete', {
        detail: {
          artefacto: 'RespuestaArgumentativa',
          score: feedback.nivel_global * 2.5,
          submitted: true
        }
      });
      window.dispatchEvent(event);

      console.log('✅ [RespuestaArgumentativa] Tarea entregada y sincronizada con Dashboard');
    }
  }, [feedback, persistence, lectureId, updateActivitiesProgress, history, evaluationAttempts, tesis, evidencias, contraargumento, refutacion]);

  // Rúbrica
  const rubricDimension = useMemo(() => getDimension('argumentacion'), []);

  // 🆕 Gestión de citas guardadas
  const citasGuardadas = useMemo(() => {
    if (!lectureId) return [];
    return getCitations(lectureId);
  }, [lectureId, getCitations]);

  const insertarCita = useCallback((textoCita, campo, tipo = 'cita') => {
    const citaFormateada = tipo === 'cita' ? `"${textoCita}" ` : `${textoCita} `;

    const refMap = {
      tesis: tesisRef,
      evidencias: evidenciasRef,
      contraargumento: contraargumentoRef,
      refutacion: refutacionRef
    };

    const setterMap = {
      tesis: setTesis,
      evidencias: setEvidencias,
      contraargumento: setContraargumento,
      refutacion: setRefutacion
    };

    const ref = refMap[campo];
    const setter = setterMap[campo];

    if (ref && ref.current && setter) {
      const textarea = ref.current;
      const start = textarea.selectionStart || cursorPositions[campo] || 0;
      const end = textarea.selectionEnd || cursorPositions[campo] || 0;

      setter(prev => {
        const before = prev.substring(0, start);
        const after = prev.substring(end);
        const newText = before + citaFormateada + after;

        // Refocus y reposicionar cursor después de la inserción
        setTimeout(() => {
          if (textarea) {
            const newPosition = start + citaFormateada.length;
            textarea.focus();
            textarea.setSelectionRange(newPosition, newPosition);
          }
        }, 0);

        return newText;
      });
    }

    setShowCitasPanel(false);
  }, [cursorPositions]);

  const handleCursorChange = useCallback((campo, event) => {
    const position = event.target.selectionStart;
    setCursorPositions(prev => ({ ...prev, [campo]: position }));
  }, []);

  const handleEliminarCita = useCallback((citaId) => {
    if (lectureId) {
      deleteCitation(lectureId, citaId);
    }
  }, [lectureId, deleteCitation]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    if (wordCount <= 40) {
      // Permitir paste de hasta 40 palabras
      document.execCommand('insertText', false, pastedText);
    } else {
      setPasteError(`⚠️ Solo puedes pegar hasta 40 palabras (intentaste pegar ${wordCount}). Escribe con tus propias palabras o usa citas guardadas.`);
      setTimeout(() => setPasteError(null), 5000);
    }
  }, []);

  // Evaluación
  const handleEvaluate = useCallback(async () => {
    if (!isValid || !texto) return;

    // 🆕 Verificar límite de intentos
    if (evaluationAttempts >= MAX_ATTEMPTS) {
      setError(`⚠️ Límite de ${MAX_ATTEMPTS} intentos alcanzado`);
      return;
    }

    // ✅ Verificar rate limit y registrar operación
    const rateLimitResult = rateLimit.attemptOperation();
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.reason === 'cooldown') {
        setError(`⏱️ Por favor espera ${rateLimitResult.waitSeconds} segundos antes de evaluar nuevamente.`);
      } else if (rateLimitResult.reason === 'hourly_limit') {
        setError(`🚦 Has alcanzado el límite de 10 evaluaciones por hora. Intenta más tarde.`);
      }
      return;
    }

    setEvaluationAttempts(prev => prev + 1); // 🆕 Incrementar intentos
    setLoading(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando análisis argumentativo...', icon: '🔍', duration: 2 });

    // 🆕 Programar pasos de evaluación
    const timeouts = [
      setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando estructura de la tesis...', icon: '💡', duration: 5 }), 1000),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 3500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), 15500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 4 }), 27500)
    ];

    try {
      const result = await evaluateRespuestaArgumentativa({
        text: texto,
        tesis,
        evidencias,
        contraargumento,
        refutacion
      });

      // Limpiar timeouts
      timeouts.forEach(clearTimeout);

      setFeedback(result);
      setIsLocked(true); // 🔒 Bloquear formulario después de evaluar

      // 🆕 Guardar en historial
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        attemptNumber: evaluationAttempts + 1,
        content: {
          tesis,
          evidencias,
          contraargumento,
          refutacion
        },
        feedback: result,
        score: result.nivel_global * 2.5
      };
      setHistory(prev => [...prev, newHistoryEntry]);

      // 🆕 CLOUD SYNC: Sincronizar historial y borradores con Firestore
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => ({
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            respuestaArgumentativa: {
              ...(prev?.artifacts?.respuestaArgumentativa || {}),
              history: [...(prev?.artifacts?.respuestaArgumentativa?.history || []), newHistoryEntry],
              attempts: evaluationAttempts + 1,
              lastScore: result.nivel_global * 2.5,
              lastNivel: result.nivel_global,
              lastEvaluatedAt: Date.now(),
              drafts: { tesis, evidencias, contraargumento, refutacion },
              // 🆕 Limpiar flags de reset cuando el estudiante trabaja
              resetBy: null,
              resetAt: null
            }
          }
        }));
        console.log('☁️ [RespuestaArgumentativa] Historial sincronizado con Firestore');
      }

      // 🆕 Limpiar drafts
      if (currentTextoId) {
        import('../../services/sessionManager').then(({ getDraftKey, updateCurrentSession, captureArtifactsDrafts }) => {
          const getKey = (base) => getDraftKey(base, currentTextoId);

          // scoped
          sessionStorage.removeItem(getKey('respuestaArgumentativa_tesis'));
          sessionStorage.removeItem(getKey('respuestaArgumentativa_evidencias'));
          sessionStorage.removeItem(getKey('respuestaArgumentativa_contraargumento'));
          sessionStorage.removeItem(getKey('respuestaArgumentativa_refutacion'));

          // legacy
          sessionStorage.removeItem('respuestaArgumentativa_tesis');
          sessionStorage.removeItem('respuestaArgumentativa_evidencias');
          sessionStorage.removeItem('respuestaArgumentativa_contraargumento');
          sessionStorage.removeItem('respuestaArgumentativa_refutacion');

          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId) });
        });
      }

      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica4', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'RespuestaArgumentativa',
        criterios: result.criterios,
        textoId: lectureId
      });

      // 🎮 Registrar recompensas
      if (rewards) {
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'RespuestaArgumentativa',
          rubricId: 'rubrica4',
          resourceId: rewardsResourceId
        });

        rewards.recordEvent(`EVALUATION_LEVEL_${result.nivel_global}`, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'RespuestaArgumentativa',
          resourceId: rewardsResourceId
        });

        // Bonificación por tesis crítica sólida (>100 caracteres)
        if (tesis.length > 100) {
          rewards.recordEvent('CRITICAL_THESIS_DEVELOPED', {
            length: tesis.length,
            artefacto: 'RespuestaArgumentativa',
            resourceId: rewardsResourceId
          });
        }

        // Bonificación por contraargumento anticipado (>80 caracteres)
        if (contraargumento.length > 80) {
          rewards.recordEvent('COUNTERARGUMENT_ANTICIPATED', {
            length: contraargumento.length,
            artefacto: 'RespuestaArgumentativa',
            resourceId: rewardsResourceId
          });
        }

        // Bonificación por refutación elaborada (>80 caracteres)
        if (refutacion.length > 80) {
          rewards.recordEvent('REFUTATION_ELABORATED', {
            length: refutacion.length,
            artefacto: 'RespuestaArgumentativa',
            resourceId: rewardsResourceId
          });
        }

        // Puntuación perfecta
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'RespuestaArgumentativa',
            resourceId: rewardsResourceId
          });
        }

        console.log('🎮 [RespuestaArgumentativa] Recompensas registradas');
      }

    } catch (error) {
      console.error('Error evaluando Respuesta Argumentativa:', error);
      setError(error.message || 'Error al evaluar el argumento');
      // Limpiar timeouts en caso de error
      timeouts.forEach(clearTimeout);
    } finally {
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValid, texto, tesis, evidencias, contraargumento, refutacion, setError, rewards, rewardsResourceId, evaluationAttempts, rateLimit, updateRubricScore, lectureId, updateActivitiesProgress, history, persistence, currentTextoId]);

  // Verificar si hay texto
  if (!texto) {
    return (
      <Container>
        <Header>
          <Title>💭 Respuesta Argumentativa</Title>
          <Subtitle>Carga un texto para comenzar</Subtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>💭 Respuesta Argumentativa</Title>
        <Subtitle>
          Construye una postura fundamentada sobre el texto, presenta evidencias, anticipa objeciones y refútalas.
          Recibirás evaluación criterial basada en la Rúbrica 4 de Literacidad Crítica.
        </Subtitle>
      </Header>

      {/* 🆕 Banner de Entrega Final */}
      {isSubmitted && (
        <SubmissionBanner
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={theme}
        >
          <span className="icon">✅</span>
          <span className="text">
            <strong>Tarea Entregada:</strong> No se pueden realizar más cambios.
          </span>
        </SubmissionBanner>
      )}

      {/* 🆕 Banner de cambio de nota docente */}
      <TeacherScoreOverrideBanner cloudData={teacherScoreOverride} theme={theme} />

      {/* 🆕 Botón flotante para citas guardadas */}
      {/* 🆕 Panel lateral de citas guardadas */}
      <AnimatePresence>
        {showCitasPanel && (
          <CitasPanel
            as={motion.div}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25 }}
            theme={theme}
          >
            <CitasPanelHeader theme={theme}>
              <h3 style={{ margin: 0 }}>� Cuaderno de Lectura</h3>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                {citasGuardadas.length === 0
                  ? 'Guarda citas y anotaciones desde "Lectura Guiada"'
                  : 'Selecciona el campo y haz clic en el botón correspondiente'}
              </p>
            </CitasPanelHeader>

            <CitasList>
              {citasGuardadas.length === 0 ? (
                <EmptyCitasMessage theme={theme}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📓</div>
                  <p><strong>Tu cuaderno está vacío</strong></p>
                  <ol style={{ textAlign: 'left', lineHeight: 1.6 }}>
                    <li>Ve a "Lectura Guiada"</li>
                    <li>Selecciona texto y usa 📌 Cita o 📓 Anotar</li>
                    <li>Regresa aquí para insertar en tu respuesta</li>
                  </ol>
                </EmptyCitasMessage>
              ) : (
                citasGuardadas.map((cita) => {
                  const tipo = cita.tipo || 'cita';
                  const isInsertable = tipo !== 'pregunta';
                  const badgeColors = { cita: '#3190fc', reflexion: '#8b5cf6', comentario: '#f59e0b', pregunta: '#ef4444' };
                  const badgeLabels = { cita: '📌 Cita', reflexion: '💭 Reflexión', comentario: '💬 Comentario', pregunta: '❓ Pregunta' };
                  return (
                    <CitaItem key={cita.id} theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                          background: badgeColors[tipo] + '22', color: badgeColors[tipo], fontWeight: 600
                        }}>{badgeLabels[tipo]}</span>
                      </div>
                      <CitaTexto theme={theme}>
                        {tipo === 'cita' ? `«${cita.texto}»` : cita.texto}
                      </CitaTexto>
                      {tipo !== 'cita' && cita.nota && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic', margin: '0.25rem 0' }}>
                          Ref: «{cita.nota.substring(0, 60)}{cita.nota.length > 60 ? '…' : ''}»
                        </div>
                      )}
                      <CitaFooter>
                        <CitaInfo theme={theme}>
                          {new Date(cita.timestamp).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </CitaInfo>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {isInsertable && (
                            <>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'tesis', tipo)} theme={theme}>
                                Tesis
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'evidencias', tipo)} theme={theme}>
                                Evidencias
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'contraargumento', tipo)} theme={theme}>
                                Contra
                              </InsertarButton>
                              <InsertarButton onClick={() => insertarCita(cita.texto, 'refutacion', tipo)} theme={theme}>
                                Refutación
                              </InsertarButton>
                            </>
                          )}
                          <EliminarButton onClick={() => handleEliminarCita(cita.id)} theme={theme}>
                            🗑️
                          </EliminarButton>
                        </div>
                      </CitaFooter>
                    </CitaItem>
                  );
                })
              )}
            </CitasList>
          </CitasPanel>
        )}
      </AnimatePresence>

      {/* 🆕 Historial y Navegación de Versiones */}
      {history.length > 0 && (
        <HistoryRibbon theme={theme}>
          <HistoryTitle theme={theme}>📜 Historial:</HistoryTitle>
          <HistoryBadge
            theme={theme}
            $active={!viewingVersion}
            onClick={() => handleViewVersion(null)}
          >
            <span>Actual</span>
            <span className="score">Editando</span>
          </HistoryBadge>
          {history.slice().reverse().map((entry, idx) => (
            <HistoryBadge
              key={idx}
              theme={theme}
              $active={viewingVersion === entry}
              onClick={() => handleViewVersion(entry)}
            >
              <span>Intento {entry.attemptNumber}</span>
              <span className="score">{entry.score?.toFixed(1)}/10</span>
            </HistoryBadge>
          ))}
        </HistoryRibbon>
      )}

      {/* 🆕 Banner de Restauración */}
      <AnimatePresence>
        {viewingVersion && (
          <RestoreBanner
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>
              👁️ Estás viendo el <strong>Intento {viewingVersion.attemptNumber}</strong> ({new Date(viewingVersion.timestamp).toLocaleString()}).
              Es de solo lectura.
            </span>
            <RestoreButton onClick={handleRestoreVersion}>
              🔄 Restaurar esta versión
            </RestoreButton>
          </RestoreBanner>
        )}
      </AnimatePresence>

      {/* Guía pedagógica */}
      <GuideSection theme={theme} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <GuideHeader onClick={() => setShowGuide(!showGuide)}>
          <GuideTitle theme={theme}>
            💡 Preguntas Guía
          </GuideTitle>
          <ToggleIcon $expanded={showGuide}>▼</ToggleIcon>
        </GuideHeader>
        <AnimatePresence>
          {showGuide && (
            <GuideContent
              theme={theme}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <GuideQuestions>
                {rubricDimension?.preguntasGuia?.map((q, idx) => (
                  <GuideQuestion key={idx} theme={theme}>{q}</GuideQuestion>
                ))}
              </GuideQuestions>
            </GuideContent>
          )}
        </AnimatePresence>
      </GuideSection>

      {/* 🔒 Mensaje cuando está bloqueado después de evaluar */}
      {isLocked && !viewingVersion && !isSubmitted && (
        <LockedMessage theme={theme}>
          <LockIcon>🔒</LockIcon>
          <LockText>
            <strong>Argumento enviado a evaluación</strong>
            <span>Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".</span>
          </LockText>
          <UnlockButton onClick={handleSeguirEditando} theme={theme}>
            ✏️ Seguir Editando
          </UnlockButton>
        </LockedMessage>
      )}

      {/* Formulario - Visible solo cuando no está bloqueado */}
      {!viewingVersion && (
        <>
          {/* 🆕 Mensaje de guardado automático */}
          {(tesis || evidencias || contraargumento || refutacion) && (
            <AutoSaveMessage theme={theme}>
              💾 Tu trabajo se guarda automáticamente. No perderás nada al cambiar de pestaña.
            </AutoSaveMessage>
          )}

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>1️⃣ Tu Tesis (Postura Fundamentada)</SectionTitle>
            <Label theme={theme}>¿Cuál es tu postura sobre el texto?</Label>
            <Textarea
              ref={tesisRef}
              theme={theme}
              value={displayedContent.tesis}
              onChange={(e) => !viewingVersion && setTesis(e.target.value)}
              onClick={(e) => handleCursorChange('tesis', e)}
              onKeyUp={(e) => handleCursorChange('tesis', e)}
              onPaste={handlePaste}
              placeholder="Ej: Sostengo que el texto naturaliza la lógica neoliberal al presentar la competencia como única forma legítima de organización social, excluyendo alternativas cooperativas del debate público."
              disabled={loading || isReadOnly}
            />
            {pasteError && <PasteErrorMessage theme={theme}>{pasteError}</PasteErrorMessage>}
            <HintText theme={theme}>
              Formula una tesis clara, específica y defendible (no una obviedad ni algo imposible de sostener)
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>2️⃣ Evidencias del Texto</SectionTitle>
            <Label theme={theme}>¿Qué evidencias del texto sustentan tu tesis?</Label>
            <Textarea
              ref={evidenciasRef}
              theme={theme}
              value={displayedContent.evidencias}
              onChange={(e) => !viewingVersion && setEvidencias(e.target.value)}
              onClick={(e) => handleCursorChange('evidencias', e)}
              onKeyUp={(e) => handleCursorChange('evidencias', e)}
              onPaste={handlePaste}
              placeholder='Ej: En el párrafo 3, el autor afirma que "la competencia es ley natural", naturalizando así un modelo económico histórico como inevitable. Además, al usar metáforas deportivas ("ganar/perder") en el párrafo 5, refuerza una visión individualista donde solo hay ganadores y perdedores, omitiendo modelos de economía solidaria documentados en...'
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Ancla tus evidencias en citas textuales y explica CÓMO sustentan tu tesis
            </HintText>
          </FormSection>

          <FormSection>
            <Label theme={theme}>3️⃣ Contraargumento (al menos 20 caracteres)</Label>
            <Textarea
              ref={contraargumentoRef}
              theme={theme}
              value={displayedContent.contraargumento}
              onChange={(e) => !viewingVersion && setContraargumento(e.target.value)}
              onClick={(e) => handleCursorChange('contraargumento', e)}
              onKeyUp={(e) => handleCursorChange('contraargumento', e)}
              onPaste={handlePaste}
              placeholder="Ej: Se podría objetar que la competencia ha demostrado históricamente generar innovación tecnológica y mejora de productos, como evidencia el desarrollo industrial de los últimos dos siglos."
              disabled={loading || isReadOnly}
              style={{ minHeight: '120px' }}
            />
            <HintText theme={theme}>
              Presenta el contraargumento MÁS FUERTE, no una versión débil o caricaturizada
            </HintText>
          </FormSection>

          <FormSection>
            <Label theme={theme}>4️⃣ Refutación (al menos 30 caracteres)</Label>
            <Textarea
              ref={refutacionRef}
              theme={theme}
              value={displayedContent.refutacion}
              onChange={(e) => !viewingVersion && setRefutacion(e.target.value)}
              onClick={(e) => handleCursorChange('refutacion', e)}
              onKeyUp={(e) => handleCursorChange('refutacion', e)}
              onPaste={handlePaste}
              placeholder="Ej: Si bien es cierto que la competencia puede generar innovación, esta lógica ignora los costos sociales (precarización laboral, desigualdad extrema) y excluye del análisis modelos donde la cooperación también produjo innovación significativa, como el software libre, las cooperativas de Mondragón, o la economía social y solidaria en América Latina."
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Reconoce lo válido del contraargumento, pero muestra sus limitaciones o aspectos que ignora
            </HintText>
          </FormSection>

          {/* Validación */}
          {!viewingVersion && !isSubmitted && (
            <ValidationMessage
              $valid={isValid}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {validationMessage}
            </ValidationMessage>
          )}

          {/* FAB Cuaderno de Lectura */}
          <CitasButton
            onClick={() => setShowCitasPanel(!showCitasPanel)}
            theme={theme}
            $active={showCitasPanel}
            title="Cuaderno de Lectura"
            $hasNotification={citasGuardadas.length > 0}
          >
            {showCitasPanel ? '✕ Cerrar' : `📓 Cuaderno (${citasGuardadas.length})`}
          </CitasButton>

          {/* Botones */}
          <ButtonGroup>
            <PrimaryButton
              onClick={handleEvaluate}
              disabled={!isValid || loading || evaluationAttempts >= MAX_ATTEMPTS || !rateLimit.canProceed || isReadOnly}
            >
              {loading ? '⏳ Evaluando...' :
                !rateLimit.canProceed ? `⏳ Espera ${rateLimit.nextAvailableIn}s` :
                  `💭 Solicitar Evaluación (${MAX_ATTEMPTS - evaluationAttempts} restantes)`}
            </PrimaryButton>

            {!isSubmitted && feedback && !viewingVersion && !loading && (
              <SubmitButton onClick={handleSubmit} theme={theme}>
                🔒 Entregar Tarea
              </SubmitButton>
            )}
          </ButtonGroup>
        </>
      )}

      {/* Loading con barra de progreso animada */}
      {loading && (
        <>
          <EvaluationProgressBar
            theme={theme}
            isEvaluating={loading}
            currentStep={currentEvaluationStep}
          />
          <LoadingSpinner>
            <SpinnerIcon
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              🔄
            </SpinnerIcon>
            <LoadingText theme={theme}>
              Evaluando con estrategia dual (DeepSeek + OpenAI)...
            </LoadingText>
          </LoadingSpinner>
        </>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {displayedContent.feedback && !loading && (
          <FeedbackSection
            theme={theme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FeedbackHeader>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.text }}>
                  📊 Evaluación Criterial ({viewingVersion ? `Intento ${viewingVersion.attemptNumber}` : 'IA Dual'})
                </h3>
                <NivelGlobal $nivel={displayedContent.feedback.nivel_global}>
                  Nivel {displayedContent.feedback.nivel_global}/4
                </NivelGlobal>
              </div>
            </FeedbackHeader>

            <DimensionLabel theme={theme}>
              <strong>{displayedContent.feedback.dimension_label}:</strong> {displayedContent.feedback.dimension_description}
            </DimensionLabel>

            <CriteriosGrid>
              {/* Solidez de la Tesis */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Solidez de la Tesis</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.solidez_tesis.nivel}>
                    Nivel {displayedContent.feedback.criterios.solidez_tesis.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.solidez_tesis.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.solidez_tesis.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.solidez_tesis.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.solidez_tesis.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Uso de Evidencia */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Uso de Evidencia</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.uso_evidencia.nivel}>
                    Nivel {displayedContent.feedback.criterios.uso_evidencia.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.uso_evidencia.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.uso_evidencia.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.uso_evidencia.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.uso_evidencia.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Manejo del Contraargumento */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Manejo del Contraargumento</CriterioTitle>
                  <CriterioNivel $nivel={displayedContent.feedback.criterios.manejo_contraargumento.nivel}>
                    Nivel {displayedContent.feedback.criterios.manejo_contraargumento.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedContent.feedback.criterios.manejo_contraargumento.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.manejo_contraargumento.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedContent.feedback.criterios.manejo_contraargumento.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedContent.feedback.criterios.manejo_contraargumento.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
            </CriteriosGrid>
          </FeedbackSection>
        )}
      </AnimatePresence>
    </Container>
  );
}

const SubmissionBanner = styled(motion.div)`
  background: ${props => `${props.theme.success || '#4CAF50'}10`};
  border: 1px solid ${props => props.theme.success || '#4CAF50'};
  color: ${props => props.theme.success || '#1b5e20'};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);

  .icon { font-size: 1.5rem; }
  .text { font-size: 1rem; }
`;

const SubmitButton = styled.button`
  padding: 1rem 2rem;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px ${props => `${props.theme.success || '#4CAF50'}40`};
  
  &:hover {
    background: ${props => props.theme.successDark || '#388E3C'};
    transform: translateY(-2px);
    box-shadow: 0 6px 16px ${props => `${props.theme.success || '#4CAF50'}50`};
  }
`;

// 🆕 Componentes para Bloqueo y Seguir Editando
const LockedMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  background: linear-gradient(135deg, ${props => props.theme.primary}15, ${props => props.theme.info}10);
  border: 2px solid ${props => props.theme.primary}40;
  border-radius: 8px;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const LockIcon = styled.span`
  font-size: 1.5rem;
`;

const LockText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  strong {
    color: ${props => props.theme?.text || '#333'};
    font-size: 1rem;
  }
  
  span {
    color: ${props => props.theme?.textSecondary || '#666'};
    font-size: 0.9rem;
  }
`;

const UnlockButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: ${props => props.theme.primary || '#2196F3'};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.primaryHover || '#1976D2'};
    transform: translateY(-1px);
  }
`;