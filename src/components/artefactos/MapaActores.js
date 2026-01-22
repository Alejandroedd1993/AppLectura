// src/components/artefactos/MapaActores.js
import React, { useState, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateMapaActores } from '../../services/mapaActores.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useRateLimit from '../../hooks/useRateLimit';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { getDimension } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';

// ============================================
// STYLED COMPONENTS (reutilizados de TablaACD con ajustes)
// ============================================

// ... (existing styled components)

// 🆕 History UI Components
const HistoryRibbon = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.75rem;
  background: ${props => props.theme.surface};
  border-bottom: 1px solid ${props => props.theme.border};
  margin-bottom: 1rem;
  align-items: center;
  border-radius: 8px;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border};
    border-radius: 2px;
  }
`;

const HistoryBadge = styled.button`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid ${props => props.$active ? '#10b981' : props.theme.border};
  background: ${props => props.$active ? '#dcfce7' : 'transparent'};
  color: ${props => props.$active ? '#065f46' : props.theme.textMuted};
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 60px;

  &:hover {
    background: ${props => props.$active ? '#dcfce7' : props.theme.hoverBg};
    transform: translateY(-1px);
  }

  span.score {
    font-weight: 700;
    font-size: 0.7rem;
  }
`;

const HistoryTitle = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.theme.textMuted};
  margin-right: 0.5rem;
`;

const RestoreBanner = styled(motion.div)`
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #92400e;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
`;

const RestoreButton = styled.button`
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    background: #d97706;
  }
`;

// ============================================
// 🆕 STYLED COMPONENTS - SISTEMA DE CITAS
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
  font-size: 0.95rem;
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
  padding: 0.75rem 1.25rem;
  background: ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.cardBg || '#fff'};
  color: ${props => props.$active ? '#fff' : props.theme.textPrimary};
  border: 2px solid ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.border};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex-shrink: 0;
  
  /* Indicador de notificación cuando hay citas guardadas */
  ${props => props.$hasNotification && !props.$active && `
    &:after {
      content: '';
      position: absolute;
      top: -6px;
      right: -6px;
      width: 12px;
      height: 12px;
      background: ${props.theme.success || '#4CAF50'};
      border: 2px solid ${props.theme.cardBg || '#fff'};
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
  `}
  
  &:hover {
    background: ${props => props.$active ? props.theme.warningHover || '#f59e0b' : props.theme.hoverBg || '#f5f5f5'};
    border-color: ${props => props.theme.warning || '#f59e0b'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
  border-left: 3px solid #10b981;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
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
// COMPONENTE PRINCIPAL
// ============================================

export default function MapaActores({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation, updateActivitiesProgress, sourceCourseId, currentTextoId, activitiesProgress } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas

  // 🆕 Ref para rastrear si ya procesamos el reset (evita bucle infinito)
  const resetProcessedRef = useRef(null);

  // 🆕 FASE 1 FIX: Estados con carga dinámica por textoId
  const [actores, setActores] = useState('');
  const [contextoHistorico, setContextoHistorico] = useState('');
  const [conexiones, setConexiones] = useState('');
  const [consecuencias, setConsecuencias] = useState('');

  // 🆕 Efecto para cargar borradores cuando cambia el textoId
  useEffect(() => {
    if (!currentTextoId) return;

    // Evitar contaminación visual entre documentos mientras se rehidrata
    setActores('');
    setContextoHistorico('');
    setConexiones('');
    setConsecuencias('');

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

      setActores(readAndMigrateLegacy('mapaActores_actores'));
      setContextoHistorico(readAndMigrateLegacy('mapaActores_contextoHistorico'));
      setConexiones(readAndMigrateLegacy('mapaActores_conexiones'));
      setConsecuencias(readAndMigrateLegacy('mapaActores_consecuencias'));

      console.log('📂 [MapaActores] Borradores cargados para textoId:', currentTextoId);
    });

    return () => {
      cancelled = true;
    };
  }, [currentTextoId]);

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
  const [showGuide, setShowGuide] = useState(true);

  // 🆕 Estados para Límites e Historial
  const [evaluationAttempts, setEvaluationAttempts] = useState(0); // Intentos de evaluación (Max 3)
  const [history, setHistory] = useState([]); // Historial de versiones { timestamp, content, feedback }
  const [viewingVersion, setViewingVersion] = useState(null); // Versión que se está visualizando (null = actual)
  const [isSubmitted, setIsSubmitted] = useState(false); // 🆕 Estado de entrega final
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  const MAX_ATTEMPTS = 3;

  // 🆕 Rate Limiting
  const rateLimit = useRateLimit({
    maxRequests: 10,
    windowMinutes: 60,
    key: 'mapaActores_eval' // Clave única para rate limit
  });

  // 🆕 Estados para sistema de citas
  const [showCitasPanel, setShowCitasPanel] = useState(false);
  const [pasteError, setPasteError] = useState(null);

  // 🆕 Refs para guardar posición del cursor en cada textarea
  const actoresRef = React.useRef(null);
  const contextoRef = React.useRef(null);
  const conexionesRef = React.useRef(null);
  const consecuenciasRef = React.useRef(null);
  const [cursorPositions, setCursorPositions] = React.useState({
    actores: 0,
    contexto: 0,
    conexiones: 0,
    consecuencias: 0
  });

  // 🆕 Keyboard shortcuts para productividad
  const [_showSaveHint, setShowSaveHint] = useState(false);

  useKeyboardShortcuts({
    'ctrl+s': (_e) => {
      console.log('⌨️ Ctrl+S: Guardando borrador MapaActores...');
      if (!currentTextoId) return;
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId);
        if (actores) sessionStorage.setItem(getKey('mapaActores_actores'), actores);
        if (contextoHistorico) sessionStorage.setItem(getKey('mapaActores_contextoHistorico'), contextoHistorico);
        if (conexiones) sessionStorage.setItem(getKey('mapaActores_conexiones'), conexiones);
        if (consecuencias) sessionStorage.setItem(getKey('mapaActores_consecuencias'), consecuencias);
      });
      setShowSaveHint(true);
      setTimeout(() => setShowSaveHint(false), 2000);
    },
    'ctrl+enter': (_e) => {
      console.log('⌨️ Ctrl+Enter: Evaluando Mapa de Actores...');
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

  // 🆕 Persistencia
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const rewardsResourceId = lectureId ? `${lectureId}:MapaActores` : null;
  const persistenceKey = lectureId ? `mapa_actores_${lectureId}` : null;

  const persistence = useActivityPersistence(persistenceKey, {
    enabled: !!persistenceKey,
    courseId: sourceCourseId, // 🆕 Aislar datos por curso
    legacyDocumentIds: (currentTextoId && documentId && lectureId && lectureId !== documentId) ? [`mapa_actores_${documentId}`] : [],
    studentAnswers: {
      actores,
      contexto_historico: contextoHistorico,
      conexiones,
      consecuencias
    },
    aiFeedbacks: { mapa_actores: feedback },
    attempts: evaluationAttempts,
    history,
    submitted: isSubmitted,
    onRehydrate: (data) => {
      if (data.student_answers?.actores) setActores(data.student_answers.actores);
      if (data.student_answers?.contexto_historico) setContextoHistorico(data.student_answers.contexto_historico);
      if (data.student_answers?.conexiones) setConexiones(data.student_answers.conexiones);
      if (data.student_answers?.consecuencias) setConsecuencias(data.student_answers.consecuencias);
      if (data.ai_feedbacks?.mapa_actores) setFeedback(data.ai_feedbacks.mapa_actores);

      if (typeof data.attempts === 'number') setEvaluationAttempts(data.attempts);
      if (Array.isArray(data.history)) setHistory(data.history);
      if (data.submitted) setIsSubmitted(true);
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

    const cloudData = findCloudArtifact('mapaActores');
    
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
      
      console.log('🔄 [MapaActores] Detectado RESET por docente, limpiando estado local...');
      console.log('🔄 [MapaActores] resetTimestamp:', resetTimestamp, 'isCurrentlySubmitted:', isCurrentlySubmitted);
      resetProcessedRef.current = resetKey; // Marcar como procesado
      
      // Limpiar estados
      setIsSubmitted(false);
      setIsLocked(false);
      setHistory([]);
      setEvaluationAttempts(0);
      setFeedback(null);
      setActores('');
      setContextoHistorico('');
      setConexiones('');
      setConsecuencias('');
      setViewingVersion(null);
      
      // Limpiar sessionStorage
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, lectureId);
        sessionStorage.removeItem(getKey('mapaActores_actores'));
        sessionStorage.removeItem(getKey('mapaActores_contextoHistorico'));
        sessionStorage.removeItem(getKey('mapaActores_conexiones'));
        sessionStorage.removeItem(getKey('mapaActores_consecuencias'));
        console.log('🧹 [MapaActores] Borradores locales limpiados tras reset');
      });
      
      if (persistence?.clearResults) persistence.clearResults();
      
      return;
    }
    
    if (!cloudData) return;

    if (cloudData.history && Array.isArray(cloudData.history)) {
      console.log('☁️ [MapaActores] Cargando historial desde Firestore:', cloudData.history.length, 'versiones');
      setHistory(prev => prev.length >= cloudData.history.length ? prev : cloudData.history);
    }

    if (cloudData.attempts) setEvaluationAttempts(prev => Math.max(prev, cloudData.attempts));
    if (cloudData.submitted) setIsSubmitted(true);

    if (cloudData.drafts) {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, lectureId);

        if (cloudData.drafts.actores && !sessionStorage.getItem(getKey('mapaActores_actores'))) {
          sessionStorage.setItem(getKey('mapaActores_actores'), cloudData.drafts.actores);
          setActores(cloudData.drafts.actores);
        }
        if (cloudData.drafts.contextoHistorico && !sessionStorage.getItem(getKey('mapaActores_contextoHistorico'))) {
          sessionStorage.setItem(getKey('mapaActores_contextoHistorico'), cloudData.drafts.contextoHistorico);
          setContextoHistorico(cloudData.drafts.contextoHistorico);
        }
        if (cloudData.drafts.conexiones && !sessionStorage.getItem(getKey('mapaActores_conexiones'))) {
          sessionStorage.setItem(getKey('mapaActores_conexiones'), cloudData.drafts.conexiones);
          setConexiones(cloudData.drafts.conexiones);
        }
        if (cloudData.drafts.consecuencias && !sessionStorage.getItem(getKey('mapaActores_consecuencias'))) {
          sessionStorage.setItem(getKey('mapaActores_consecuencias'), cloudData.drafts.consecuencias);
          setConsecuencias(cloudData.drafts.consecuencias);
        }
        console.log('☁️ [MapaActores] Borradores restaurados desde Firestore');
      });
    }
  }, [lectureId, activitiesProgress, persistence]);

  // 🆕 Handle submission
  const handleSubmit = useCallback(() => {
    if (!feedback) return;

    if (window.confirm('¿Estás seguro que deseas entregar tu tarea? Una vez entregada, no podrás realizar más cambios ni solicitar nuevas evaluaciones.')) {
      setIsSubmitted(true);
      setTimeout(() => persistence.saveManual(), 100);

      // 🆕 SYNC: Registrar entrega en contexto global para Dashboard (preservando historial)
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => {
          // Obtener el score previo guardado (lastScore) o calcular desde feedback
          const previousArtifact = prev?.artifacts?.mapaActores || {};
          const scoreToUse = previousArtifact.lastScore || (feedback.nivel_global ? feedback.nivel_global * 2.5 : 0);
          
          console.log('📤 [MapaActores] Entregando con score:', scoreToUse, 'lastScore:', previousArtifact.lastScore, 'feedback.nivel_global:', feedback.nivel_global);
          
          return {
            ...prev,
            artifacts: {
              ...(prev?.artifacts || {}),
              mapaActores: {
                ...previousArtifact,
                submitted: true,
                submittedAt: Date.now(),
                score: scoreToUse,
                nivel: feedback.nivel_global || previousArtifact.lastNivel || 0,
                history: history,
                attempts: evaluationAttempts,
                finalContent: { actores, contextoHistorico, conexiones, consecuencias }
              }
            }
          };
        });
      } else {
        console.warn('⚠️ [MapaActores] No se pudo sincronizar - lectureId:', lectureId, 'updateActivitiesProgress:', !!updateActivitiesProgress);
      }

      if (rewards) {
        rewards.recordEvent('ARTIFACT_SUBMITTED', {
          artefacto: 'MapaActores',
          level: feedback.nivel_global,
          resourceId: rewardsResourceId
        });
      }

      console.log('✅ [MapaActores] Tarea entregada y sincronizada con Dashboard');
    }
  }, [feedback, rewards, persistence, lectureId, updateActivitiesProgress, rewardsResourceId, history, evaluationAttempts, actores, contextoHistorico, conexiones, consecuencias]);

  // 🆕 Variables para visualizar contenido (Actual o Histórico)
  const displayedContent = useMemo(() => {
    if (viewingVersion) {
      return {
        actores: viewingVersion.content.actores || '',
        contexto: viewingVersion.content.contexto_historico || '',
        conexiones: viewingVersion.content.conexiones || '',
        consecuencias: viewingVersion.content.consecuencias || ''
      };
    }
    return { actores, contexto: contextoHistorico, conexiones, consecuencias };
  }, [viewingVersion, actores, contextoHistorico, conexiones, consecuencias]);

  const displayedFeedback = useMemo(() => {
    if (viewingVersion) return viewingVersion.feedback;
    return feedback;
  }, [viewingVersion, feedback]);

  const isReadOnly = !!viewingVersion || isSubmitted;

  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    console.log('✏️ [MapaActores] Desbloqueando para editar...');
    setIsLocked(false);
    setFeedback(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);

  // 🆕 Manejadores de Historial
  const handleViewVersion = useCallback((entry) => {
    if (!entry) {
      setViewingVersion(null); // Volver al actual
      return;
    }
    setViewingVersion(entry);
    console.log(`📜 Visualizando versión: Intento ${entry.attemptNumber}`);
  }, []);

  const handleRestoreVersion = useCallback(() => {
    if (!viewingVersion) return;

    // Restaurar contenido
    setActores(viewingVersion.content.actores || '');
    setContextoHistorico(viewingVersion.content.contexto_historico || '');
    setConexiones(viewingVersion.content.conexiones || '');
    setConsecuencias(viewingVersion.content.consecuencias || '');

    // Restaurar evaluación
    setFeedback(viewingVersion.feedback);

    // Resetear vista
    setViewingVersion(null);

    // Guardar cambio
    setTimeout(() => persistence.saveManual(), 100);

    console.log('rewind ⏪ Versión restaurada exitosamente');
  }, [viewingVersion, persistence]);

  // Validación
  const isValid = useMemo(() => {
    return actores.trim().length >= 20 &&
      contextoHistorico.trim().length >= 15 &&
      conexiones.trim().length >= 20 &&
      consecuencias.trim().length >= 20;
  }, [actores, contextoHistorico, conexiones, consecuencias]);

  const validationMessage = useMemo(() => {
    if (!actores.trim()) return '⚠️ Identifica los actores sociales y políticos relevantes';
    if (actores.trim().length < 20) return '⚠️ Describe los actores con más detalle (mín. 20 caracteres)';
    if (!contextoHistorico.trim()) return '⚠️ Sitúa el texto en su contexto histórico/social';
    if (contextoHistorico.trim().length < 15) return '⚠️ Desarrolla el contexto histórico (mín. 15 caracteres)';
    if (!conexiones.trim()) return '⚠️ Analiza las conexiones e intereses entre actores';
    if (conexiones.trim().length < 20) return '⚠️ Profundiza en las conexiones (mín. 20 caracteres)';
    if (!consecuencias.trim()) return '⚠️ Evalúa las consecuencias o impacto del texto';
    if (consecuencias.trim().length < 20) return '⚠️ Desarrolla las consecuencias (mín. 20 caracteres)';
    return '✅ Análisis completo. Solicita evaluación criterial.';
  }, [actores, contextoHistorico, conexiones, consecuencias]);

  // 🆕 FASE 1 FIX: Guardar respaldo en sessionStorage con claves namespaced
  useEffect(() => {
    if (!currentTextoId) return;

    import('../../services/sessionManager').then(({ getDraftKey }) => {
      const getKey = (base) => getDraftKey(base, currentTextoId);

      if (actores) sessionStorage.setItem(getKey('mapaActores_actores'), actores);
      if (contextoHistorico) sessionStorage.setItem(getKey('mapaActores_contextoHistorico'), contextoHistorico);
      if (conexiones) sessionStorage.setItem(getKey('mapaActores_conexiones'), conexiones);
      if (consecuencias) sessionStorage.setItem(getKey('mapaActores_consecuencias'), consecuencias);

      console.log('💾 [MapaActores] Borradores guardados para textoId:', currentTextoId);
    });
  }, [actores, contextoHistorico, conexiones, consecuencias, currentTextoId]);

  // 🆕 Sincronización en la nube de borradores (debounced)
  useEffect(() => {
    if (!currentTextoId) return;

    if (actores || contextoHistorico || conexiones || consecuencias) {
      const timer = setTimeout(() => {
        import('../../services/sessionManager').then(({ updateCurrentSession, captureArtifactsDrafts }) => {
          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId) });
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actores, contextoHistorico, conexiones, consecuencias, currentTextoId]);

  // 🆕 Escuchar restauración de sesión para actualizar estados desde sessionStorage
  useEffect(() => {
    if (!currentTextoId) return;

    const handleSessionRestored = () => {
      import('../../services/sessionManager').then(({ getDraftKey }) => {
        const getKey = (base) => getDraftKey(base, currentTextoId);

        const restoredActores = sessionStorage.getItem(getKey('mapaActores_actores')) || '';
        const restoredContexto = sessionStorage.getItem(getKey('mapaActores_contextoHistorico')) || '';
        const restoredConexiones = sessionStorage.getItem(getKey('mapaActores_conexiones')) || '';
        const restoredConsecuencias = sessionStorage.getItem(getKey('mapaActores_consecuencias')) || '';

        if (restoredActores !== actores) setActores(restoredActores);
        if (restoredContexto !== contextoHistorico) setContextoHistorico(restoredContexto);
        if (restoredConexiones !== conexiones) setConexiones(restoredConexiones);
        if (restoredConsecuencias !== consecuencias) setConsecuencias(restoredConsecuencias);

        if (restoredActores || restoredContexto || restoredConexiones || restoredConsecuencias) {
          console.log('🔄 [MapaActores] Borradores restaurados desde sesión');
        }
      });
    };

    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [actores, contextoHistorico, conexiones, consecuencias, currentTextoId]);

  // 🆕 Obtener citas guardadas
  const citasGuardadas = useMemo(() => {
    if (!lectureId) return [];
    return getCitations(lectureId);
  }, [lectureId, getCitations]);

  // 🆕 Insertar cita en posición del cursor
  const insertarCita = useCallback((textoCita, campo) => {
    const citaFormateada = `"${textoCita}" `;

    const refMap = {
      actores: actoresRef,
      contexto: contextoRef,
      conexiones: conexionesRef,
      consecuencias: consecuenciasRef
    };

    const setterMap = {
      actores: setActores,
      contexto: setContextoHistorico,
      conexiones: setConexiones,
      consecuencias: setConsecuencias
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

  // 🆕 Capturar posición del cursor
  const handleCursorChange = useCallback((campo, event) => {
    const position = event.target.selectionStart;
    setCursorPositions(prev => ({ ...prev, [campo]: position }));
  }, []);

  // 🆕 Eliminar cita
  const handleEliminarCita = useCallback((citaId) => {
    if (lectureId) deleteCitation(lectureId, citaId);
  }, [lectureId, deleteCitation]);

  // 🆕 Prevención de pegado
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

  // Rúbrica
  const rubricDimension = useMemo(() => getDimension('contextualizacion'), []);

  // Evaluación
  const handleEvaluate = useCallback(async () => {
    // 🆕 Verificaciones de límites
    if (!rateLimit.canProceed) {
      setError(`⏳ Por favor espera ${rateLimit.remaining} segundos antes de intentar nuevamente.`);
      return;
    }

    if (evaluationAttempts >= MAX_ATTEMPTS) {
      setError(`🚫 Has agotado tus ${MAX_ATTEMPTS} intentos de evaluación para este artefacto.`);
      return;
    }

    if (!isValid || !texto) return;

    setLoading(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando análisis socio-histórico...', icon: '🔍', duration: 2 });

    // 🆕 Programar pasos de evaluación
    const timeouts = [
      setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando actores y contexto...', icon: '👥', duration: 5 }), 1000),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 3500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), 15500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 4 }), 27500)
    ];

    try {
      const result = await evaluateMapaActores({
        text: texto,
        actores,
        contextoHistorico,
        conexiones,
        consecuencias
      });

      // Limpiar timeouts
      timeouts.forEach(clearTimeout);

      setFeedback(result);
      setIsLocked(true); // 🔒 Bloquear formulario después de evaluar

      // 🆕 Incrementar intentos
      setEvaluationAttempts(prev => prev + 1);

      // 🆕 Archivar en Historial
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        content: {
          actores,
          contexto_historico: contextoHistorico,
          conexiones,
          consecuencias
        },
        feedback: result,
        score: result.nivel_global * 2.5,
        attemptNumber: evaluationAttempts + 1
      };

      setHistory(prev => [...prev, newHistoryEntry]);
      console.log('📜 [MapaActores] Versión archivada en historial');

      // 🆕 CLOUD SYNC: Sincronizar historial y borradores con Firestore
      if (lectureId && updateActivitiesProgress) {
        updateActivitiesProgress(lectureId, prev => ({
          ...prev,
          artifacts: {
            ...(prev?.artifacts || {}),
            mapaActores: {
              ...(prev?.artifacts?.mapaActores || {}),
              history: [...(prev?.artifacts?.mapaActores?.history || []), newHistoryEntry],
              attempts: evaluationAttempts + 1,
              lastScore: result.nivel_global * 2.5,
              lastNivel: result.nivel_global,
              lastEvaluatedAt: Date.now(),
              drafts: { actores, contextoHistorico, conexiones, consecuencias },
              // 🆕 Limpiar flags de reset cuando el estudiante trabaja
              resetBy: null,
              resetAt: null
            }
          }
        }));
        console.log('☁️ [MapaActores] Historial sincronizado con Firestore');
      }

      // 🆕 Limpiar borrador temporal tras éxito
      if (currentTextoId) {
        import('../../services/sessionManager').then(({ getDraftKey, updateCurrentSession, captureArtifactsDrafts }) => {
          const getKey = (base) => getDraftKey(base, currentTextoId);

          // scoped
          sessionStorage.removeItem(getKey('mapaActores_actores'));
          sessionStorage.removeItem(getKey('mapaActores_contextoHistorico'));
          sessionStorage.removeItem(getKey('mapaActores_conexiones'));
          sessionStorage.removeItem(getKey('mapaActores_consecuencias'));

          // legacy
          sessionStorage.removeItem('mapaActores_actores');
          sessionStorage.removeItem('mapaActores_contextoHistorico');
          sessionStorage.removeItem('mapaActores_conexiones');
          sessionStorage.removeItem('mapaActores_consecuencias');

          updateCurrentSession({ artifactsDrafts: captureArtifactsDrafts(currentTextoId) });
        });
      }

      // Notificar completitud
      window.dispatchEvent(new CustomEvent('evaluation-complete', {
        detail: { artefacto: 'MapaActores' }
      }));

      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica3', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'MapaActores',
        criterios: result.criterios,
        textoId: lectureId
      });

      // 🎮 Registrar recompensas
      if (rewards) {
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'MapaActores',
          rubricId: 'rubrica3',
          resourceId: rewardsResourceId
        });

        rewards.recordEvent(`EVALUATION_LEVEL_${result.nivel_global}`, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'MapaActores',
          resourceId: rewardsResourceId
        });

        // Bonificación por contextualización histórica profunda (>150 caracteres)
        if (contextoHistorico.length > 150) {
          rewards.recordEvent('CONTEXTUALIZATION_HISTORICAL', {
            length: contextoHistorico.length,
            artefacto: 'MapaActores',
            resourceId: rewardsResourceId
          });
        }

        // Bonificación por análisis de conexiones (>100 caracteres)
        if (conexiones.length > 100) {
          rewards.recordEvent('SOCIAL_CONNECTIONS_MAPPED', {
            length: conexiones.length,
            artefacto: 'MapaActores',
            resourceId: rewardsResourceId
          });
        }

        // Puntuación perfecta
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'MapaActores',
            resourceId: rewardsResourceId
          });
        }

        console.log('🎮 [MapaActores] Recompensas registradas');
      }

    } catch (error) {
      console.error('Error evaluando Mapa de Actores:', error);
      setError(error.message || 'Error al evaluar el análisis');
      // Limpiar timeouts en caso de error
      timeouts.forEach(clearTimeout);
    } finally {
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValid, texto, actores, contextoHistorico, conexiones, consecuencias, setError, evaluationAttempts, rateLimit, rewards, rewardsResourceId]);

  // Verificar si hay texto
  if (!texto) {
    return (
      <Container>
        <Header>
          <Title>🗺️ Mapa de Actores y Consecuencias</Title>
          <Subtitle>Carga un texto para comenzar</Subtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>🔍 Mapa de Actores Sociales</Title>
        <Subtitle>
          Identifica los actores, sus conexiones y el contexto histórico.
          Recibirás evaluación criterial basada en la Rúbrica 2.
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
              <h3 style={{ margin: 0 }}>📋 Mis Citas Guardadas</h3>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                {citasGuardadas.length === 0
                  ? 'Selecciona texto en "Lectura Guiada" y guarda citas'
                  : 'Selecciona el campo y haz clic en el botón correspondiente'}
              </p>
            </CitasPanelHeader>

            <CitasList>
              {citasGuardadas.length === 0 ? (
                <EmptyCitasMessage theme={theme}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
                  <p><strong>¿Cómo guardar citas?</strong></p>
                  <ol style={{ textAlign: 'left', lineHeight: 1.6 }}>
                    <li>Ve a "Lectura Guiada"</li>
                    <li>Selecciona texto importante</li>
                    <li>Clic en "💾 Guardar Cita"</li>
                    <li>Regresa aquí para usar</li>
                  </ol>
                </EmptyCitasMessage>
              ) : (
                citasGuardadas.map((cita) => (
                  <CitaItem key={cita.id} theme={theme}>
                    <CitaTexto theme={theme}>{cita.texto}</CitaTexto>
                    <CitaFooter>
                      <CitaInfo theme={theme}>
                        {new Date(cita.timestamp).toLocaleDateString('es-ES', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </CitaInfo>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'actores')} theme={theme}>
                          Actores
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'contexto')} theme={theme}>
                          Contexto
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'conexiones')} theme={theme}>
                          Conexiones
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'consecuencias')} theme={theme}>
                          Consecuencias
                        </InsertarButton>
                        <EliminarButton onClick={() => handleEliminarCita(cita.id)} theme={theme}>
                          🗑️
                        </EliminarButton>
                      </div>
                    </CitaFooter>
                  </CitaItem>
                ))
              )}
            </CitasList>
          </CitasPanel>
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

      {/* 🆕 Ribbon de Historial - SIEMPRE visible */}
      {history.length > 0 && (
        <HistoryRibbon theme={theme}>
          <HistoryTitle theme={theme}>Versiones:</HistoryTitle>

          {/* Versión actual primero */}
          <HistoryBadge
            $active={!viewingVersion}
            onClick={() => handleViewVersion(null)}
            theme={theme}
          >
            Actual
            <span className="score">En progreso</span>
          </HistoryBadge>

          {/* Historial en orden cronológico inverso (más reciente primero) */}
          {history.slice().reverse().map((entry, idx) => (
            <HistoryBadge
              key={idx}
              $active={viewingVersion && viewingVersion.timestamp === entry.timestamp}
              onClick={() => handleViewVersion(entry)}
              theme={theme}
            >
              Intento {entry.attemptNumber}
              <span className="score">Nivel {entry.feedback.nivel_global}</span>
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
            theme={theme}
          >
            <div>
              <strong>Modo Lectura:</strong> Estás viendo una versión anterior (Intento {viewingVersion.attemptNumber}).
            </div>
            <RestoreButton onClick={handleRestoreVersion} theme={theme}>
              ↺ Restaurar esta versión
            </RestoreButton>
          </RestoreBanner>
        )}
      </AnimatePresence>

      {/* 🔒 Mensaje cuando está bloqueado después de evaluar */}
      {isLocked && !viewingVersion && !isSubmitted && (
        <LockedMessage theme={theme}>
          <LockIcon>🔒</LockIcon>
          <LockText>
            <strong>Análisis enviado a evaluación</strong>
            <span>Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".</span>
          </LockText>
          <UnlockButton onClick={handleSeguirEditando} theme={theme}>
            ✏️ Seguir Editando
          </UnlockButton>
        </LockedMessage>
      )}

      {/* Formulario - Ahora siempre visible pero controlado por isLocked */}
      {!viewingVersion && (
        <>
          {/* 🆕 Mensaje de guardado automático */}
          {(actores || contextoHistorico || conexiones || consecuencias) && (
            <AutoSaveMessage theme={theme}>
              💾 Tu trabajo se guarda automáticamente. No perderás nada al cambiar de pestaña.
            </AutoSaveMessage>
          )}

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>1️⃣ Actores Sociales y Políticos</SectionTitle>
            <Label theme={theme}>¿Qué actores son relevantes en este texto?</Label>
            <Textarea
              ref={actoresRef}
              theme={theme}
              value={displayedContent.actores}
              onChange={(e) => !viewingVersion && setActores(e.target.value)}
              onClick={(e) => handleCursorChange('actores', e)}
              onKeyUp={(e) => handleCursorChange('actores', e)}
              onPaste={handlePaste}
              placeholder="Ej: Empresas transnacionales, trabajadores precarizados, gobiernos neoliberales, organizaciones sindicales, movimientos sociales..."
              disabled={loading || isReadOnly}
            />
            {pasteError && <PasteErrorMessage theme={theme}>{pasteError}</PasteErrorMessage>}
            <HintText theme={theme}>
              Identifica individuos, grupos, instituciones o clases sociales mencionados o afectados
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>2️⃣ Contexto Histórico/Social</SectionTitle>
            <Label theme={theme}>¿En qué contexto se produce este texto?</Label>
            <Textarea
              ref={contextoRef}
              theme={theme}
              value={displayedContent.contexto}
              onChange={(e) => !viewingVersion && setContextoHistorico(e.target.value)}
              onClick={(e) => handleCursorChange('contexto', e)}
              onKeyUp={(e) => handleCursorChange('contexto', e)}
              onPaste={handlePaste}
              placeholder="Ej: Contexto de globalización neoliberal post-1990, crisis financiera 2008, pandemia COVID-19, dictadura militar Chile 1973-1990..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '100px' }}
            />
            <HintText theme={theme}>
              Sitúa en época, eventos históricos, procesos sociales o debates públicos
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>3️⃣ Conexiones e Intereses</SectionTitle>
            <Label theme={theme}>¿Cómo se relacionan los actores? ¿Qué intereses tienen?</Label>
            <Textarea
              ref={conexionesRef}
              theme={theme}
              value={displayedContent.conexiones}
              onChange={(e) => !viewingVersion && setConexiones(e.target.value)}
              onClick={(e) => handleCursorChange('conexiones', e)}
              onKeyUp={(e) => handleCursorChange('conexiones', e)}
              onPaste={handlePaste}
              placeholder="Ej: Empresas buscan maximizar ganancias mediante desregulación laboral, lo cual entra en conflicto con trabajadores que buscan estabilidad. Gobiernos median según correlación de fuerzas..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Analiza relaciones de poder, conflictos, alianzas, hegemonías, resistencias
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>4️⃣ Consecuencias e Impacto</SectionTitle>
            <Label theme={theme}>¿Qué consecuencias reales o potenciales tiene este discurso?</Label>
            <Textarea
              ref={consecuenciasRef}
              theme={theme}
              value={displayedContent.consecuencias}
              onChange={(e) => !viewingVersion && setConsecuencias(e.target.value)}
              onClick={(e) => handleCursorChange('consecuencias', e)}
              onKeyUp={(e) => handleCursorChange('consecuencias', e)}
              onPaste={handlePaste}
              placeholder="Ej: Corto plazo: aumento del desempleo, protestas sociales. Largo plazo: debilitamiento de identidades colectivas, naturalización del individualismo competitivo..."
              disabled={loading || isReadOnly}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Distingue entre consecuencias inmediatas y efectos estructurales a largo plazo
            </HintText>
          </FormSection>

          {/* Validación */}
          {!viewingVersion && (
            <ValidationMessage
              $valid={isValid}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {validationMessage}
            </ValidationMessage>
          )}

          {/* Botones */}
          <ButtonGroup>
            <CitasButton
              onClick={() => setShowCitasPanel(!showCitasPanel)}
              theme={theme}
              $active={showCitasPanel}
              title="Ver mis citas guardadas del texto"
              $hasNotification={citasGuardadas.length > 0}
            >
              {showCitasPanel ? '✕ Cerrar Citas' : `📋 Mis Citas (${citasGuardadas.length})`}
            </CitasButton>

            <PrimaryButton
              onClick={handleEvaluate}
              disabled={(!isValid && !viewingVersion) || loading || !rateLimit.canProceed || evaluationAttempts >= MAX_ATTEMPTS || isReadOnly}
              theme={theme}
              title={
                viewingVersion
                  ? 'Estás viendo una versión histórica. Vuelve a "Actual" para editar.'
                  : evaluationAttempts >= MAX_ATTEMPTS
                    ? 'Has agotado tus intentos de evaluación'
                    : !rateLimit.canProceed && rateLimit.nextAvailableIn > 0
                      ? `Espera ${rateLimit.nextAvailableIn}s`
                      : rateLimit.remaining === 0
                        ? 'Límite de evaluaciones alcanzado (10/hora)'
                        : `${rateLimit.remaining} evaluaciones restantes esta hora`
              }
            >
              {loading ? '⏳ Evaluando...' :
                viewingVersion ? '👁️ Modo Lectura' :
                  evaluationAttempts >= MAX_ATTEMPTS ? '🚫 Intentos Agotados' :
                    !rateLimit.canProceed && rateLimit.nextAvailableIn > 0 ? `⏱️ Espera ${rateLimit.nextAvailableIn}s` :
                      `🗺️ Solicitar Evaluación (${MAX_ATTEMPTS - evaluationAttempts} restantes)`}
            </PrimaryButton>

            {/* 🆕 Botón de Entrega */}
            {!isSubmitted && feedback && !viewingVersion && (
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
        {displayedFeedback && !loading && (
          <FeedbackSection
            theme={theme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FeedbackHeader>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.text }}>
                  📊 Evaluación Criterial
                </h3>
                <NivelGlobal $nivel={displayedFeedback.nivel_global}>
                  Nivel {displayedFeedback.nivel_global}/4
                </NivelGlobal>
              </div>
            </FeedbackHeader>

            <DimensionLabel theme={theme}>
              <strong>{displayedFeedback.dimension_label}:</strong> {displayedFeedback.dimension_description}
            </DimensionLabel>

            <CriteriosGrid>
              {/* Actores y Contexto */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Actores y Contexto</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.actores_contexto.nivel}>
                    Nivel {displayedFeedback.criterios.actores_contexto.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.actores_contexto.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.actores_contexto.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.actores_contexto.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.actores_contexto.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Conexiones e Intereses */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Conexiones e Intereses</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.conexiones_intereses.nivel}>
                    Nivel {displayedFeedback.criterios.conexiones_intereses.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.conexiones_intereses.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.conexiones_intereses.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.conexiones_intereses.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.conexiones_intereses.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Impacto y Consecuencias */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Impacto y Consecuencias</CriterioTitle>
                  <CriterioNivel $nivel={displayedFeedback.criterios.impacto_consecuencias.nivel}>
                    Nivel {displayedFeedback.criterios.impacto_consecuencias.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {displayedFeedback.criterios.impacto_consecuencias.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.impacto_consecuencias.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {displayedFeedback.criterios.impacto_consecuencias.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {displayedFeedback.criterios.impacto_consecuencias.mejoras.map((m, idx) => (
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
  padding: 0.9rem 1.8rem;
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover {
    background: ${props => props.theme.successDark || '#388E3C'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => `${props.theme.success || '#4CAF50'}40`};
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
