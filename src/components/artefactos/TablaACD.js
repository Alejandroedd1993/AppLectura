// src/components/artefactos/TablaACD.js
import React, { useState, useContext, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateTablaACD } from '../../services/tablaACD.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import KeyboardShortcutsBar from '../ui/KeyboardShortcutsBar';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import { getDimension, scoreToLevelDescriptor } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';

// ============================================
// STYLED COMPONENTS
// ============================================

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-radius: 12px;
  color: white;
`;

const Title = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
`;

const GuideSection = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
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
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: block;
  color: ${props => props.theme.text};
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  background: ${props => props.theme.background};
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  &::placeholder {
    color: ${props => props.theme.textMuted};
    opacity: 0.6;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  background: ${props => props.theme.background};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
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
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
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
  background: ${props => props.theme.success};
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 150, 136, 0.3);
    opacity: 0.9;
  }
`;

const SecondaryButton = styled(Button)`
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
    switch(props.$nivel) {
      case 1: return '#fee2e2';
      case 2: return '#fed7aa';
      case 3: return '#dcfce7';
      case 4: return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch(props.$nivel) {
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
    switch(props.$nivel) {
      case 1: return '#fee2e2';
      case 2: return '#fed7aa';
      case 3: return '#dcfce7';
      case 4: return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch(props.$nivel) {
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

// 🆕 Styled Components para Sistema de Citas
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
  width: 400px;
  height: 100vh;
  background: ${props => props.theme.surface};
  border-left: 1px solid ${props => props.theme.border};
  box-shadow: -4px 0 20px rgba(0,0,0,0.1);
  overflow-y: auto;
  z-index: 99;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const CitasPanelHeader = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.primary};
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const CitasList = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CitaItem = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`;

const CitaTexto = styled.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${props => props.theme.textPrimary};
  margin: 0 0 0.75rem 0;
  font-style: italic;
`;

const CitaFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const CitaInfo = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const InsertarButton = styled.button`
  padding: 0.3rem 0.6rem;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.successHover || '#45a049'};
    transform: scale(1.05);
  }
`;

const EliminarButton = styled.button`
  padding: 0.3rem 0.5rem;
  background: transparent;
  color: ${props => props.theme.danger || '#F44336'};
  border: 1px solid ${props => props.theme.danger || '#F44336'};
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.danger || '#F44336'};
    color: white;
  }
`;

const EmptyCitasMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary};
  
  strong {
    color: ${props => props.theme.textPrimary};
    font-size: 1.1rem;
  }
  
  ol {
    margin-top: 1rem;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
`;

const PasteErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.danger}15;
  border: 1px solid ${props => props.theme.danger}40;
  border-radius: 6px;
  color: ${props => props.theme.danger || '#F44336'};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  animation: shake 0.5s ease;
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;

const AutoSaveMessage = styled.div`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.success}15;
  border: 1px solid ${props => props.theme.success}40;
  border-radius: 6px;
  color: ${props => props.theme.success || '#4CAF50'};
  font-size: 0.85rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ShortcutsHint = styled.div`
  position: fixed;
  top: 80px;
  right: 20px;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 9999;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    right: 30px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${props => props.theme.success || '#4CAF50'};
  }
`;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function TablaACD({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas

  // Estados del formulario con recuperación de sessionStorage
  const [marcoIdeologico, setMarcoIdeologico] = useState(() => 
    sessionStorage.getItem('tablaACD_marcoIdeologico') || ''
  );
  const [estrategiasRetoricas, setEstrategiasRetoricas] = useState(() => 
    sessionStorage.getItem('tablaACD_estrategiasRetoricas') || ''
  );
  const [vocesPresentes, setVocesPresentes] = useState(() => 
    sessionStorage.getItem('tablaACD_vocesPresentes') || ''
  );
  const [vocesSilenciadas, setVocesSilenciadas] = useState(() => 
    sessionStorage.getItem('tablaACD_vocesSilenciadas') || ''
  );

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  
  // 🆕 Estados para sistema de citas
  const [showCitasPanel, setShowCitasPanel] = useState(false);
  const [pasteError, setPasteError] = useState(null);
  
  // 🆕 Keyboard shortcuts para productividad
  const [showSaveHint, setShowSaveHint] = useState(false);
  
  useKeyboardShortcuts({
    'ctrl+s': (e) => {
      console.log('⌨️ Ctrl+S: Guardando borrador TablaACD...');
      // Guardar manualmente en sessionStorage
      sessionStorage.setItem('tablaACD_marcoIdeologico', marcoIdeologico);
      sessionStorage.setItem('tablaACD_estrategiasRetoricas', estrategiasRetoricas);
      sessionStorage.setItem('tablaACD_vocesPresentes', vocesPresentes);
      sessionStorage.setItem('tablaACD_vocesSilenciadas', vocesSilenciadas);
      // Feedback visual
      setShowSaveHint(true);
      setTimeout(() => setShowSaveHint(false), 2000);
    },
    'ctrl+enter': (e) => {
      console.log('⌨️ Ctrl+Enter: Evaluando tabla ACD...');
      if (!loading && isValid) {
        handleSubmit();
      }
    },
    'escape': (e) => {
      console.log('⌨️ Esc: Cerrando paneles...');
      if (showCitasPanel) {
        setShowCitasPanel(false);
      } else if (pasteError) {
        setPasteError(null);
      }
    }
  }, {
    enabled: true,
    excludeInputs: false
  });
  
  // 🆕 Refs para guardar posición del cursor en cada textarea
  const marcoRef = React.useRef(null);
  const estrategiasRef = React.useRef(null);
  const presentesRef = React.useRef(null);
  const silenciadasRef = React.useRef(null);
  const [cursorPositions, setCursorPositions] = React.useState({
    marco: 0,
    estrategias: 0,
    presentes: 0,
    silenciadas: 0
  });

  // Validación
  const isValid = useMemo(() => {
    return marcoIdeologico.trim().length >= 10 &&
           estrategiasRetoricas.trim().length >= 20 &&
           vocesPresentes.trim().length >= 3 &&
           vocesSilenciadas.trim().length >= 3;
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas]);

  const validationMessage = useMemo(() => {
    if (!marcoIdeologico.trim()) return '⚠️ Identifica el marco ideológico del texto';
    if (marcoIdeologico.trim().length < 10) return '⚠️ Describe el marco ideológico con más detalle (mín. 10 caracteres)';
    if (!estrategiasRetoricas.trim()) return '⚠️ Lista al menos 2 estrategias retóricas con ejemplos';
    if (estrategiasRetoricas.trim().length < 20) return '⚠️ Desarrolla las estrategias retóricas (mín. 20 caracteres)';
    if (!vocesPresentes.trim()) return '⚠️ Identifica las voces presentes en el discurso';
    if (!vocesSilenciadas.trim()) return '⚠️ Identifica las voces silenciadas o ausentes';
    return '✅ Análisis completo. Solicita evaluación criterial.';
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas]);

  // 🆕 Guardar respaldo en sessionStorage (auto-guardado)
  useEffect(() => {
    if (marcoIdeologico) sessionStorage.setItem('tablaACD_marcoIdeologico', marcoIdeologico);
  }, [marcoIdeologico]);

  useEffect(() => {
    if (estrategiasRetoricas) sessionStorage.setItem('tablaACD_estrategiasRetoricas', estrategiasRetoricas);
  }, [estrategiasRetoricas]);

  useEffect(() => {
    if (vocesPresentes) sessionStorage.setItem('tablaACD_vocesPresentes', vocesPresentes);
  }, [vocesPresentes]);

  useEffect(() => {
    if (vocesSilenciadas) sessionStorage.setItem('tablaACD_vocesSilenciadas', vocesSilenciadas);
  }, [vocesSilenciadas]);

  // 🆕 Escuchar restauración de sesión para actualizar estados desde sessionStorage
  useEffect(() => {
    const handleSessionRestored = () => {
      const restoredMarco = sessionStorage.getItem('tablaACD_marcoIdeologico') || '';
      const restoredEstrategias = sessionStorage.getItem('tablaACD_estrategiasRetoricas') || '';
      const restoredPresentes = sessionStorage.getItem('tablaACD_vocesPresentes') || '';
      const restoredSilenciadas = sessionStorage.getItem('tablaACD_vocesSilenciadas') || '';
      
      if (restoredMarco !== marcoIdeologico) setMarcoIdeologico(restoredMarco);
      if (restoredEstrategias !== estrategiasRetoricas) setEstrategiasRetoricas(restoredEstrategias);
      if (restoredPresentes !== vocesPresentes) setVocesPresentes(restoredPresentes);
      if (restoredSilenciadas !== vocesSilenciadas) setVocesSilenciadas(restoredSilenciadas);
      
      if (restoredMarco || restoredEstrategias || restoredPresentes || restoredSilenciadas) {
        console.log('🔄 [TablaACD] Borradores restaurados desde sesión');
      }
    };
    
    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas]);

  // Persistencia principal
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const persistenceKey = `tabla_acd_${documentId}`;

  useActivityPersistence(persistenceKey, {
    enabled: documentId !== null,
    studentAnswers: {
      marco_ideologico: marcoIdeologico,
      estrategias_retoricas: estrategiasRetoricas,
      voces_presentes: vocesPresentes,
      voces_silenciadas: vocesSilenciadas
    },
    aiFeedbacks: { tabla_acd: feedback },
    onRehydrate: (data) => {
      if (data.student_answers?.marco_ideologico) setMarcoIdeologico(data.student_answers.marco_ideologico);
      if (data.student_answers?.estrategias_retoricas) setEstrategiasRetoricas(data.student_answers.estrategias_retoricas);
      if (data.student_answers?.voces_presentes) setVocesPresentes(data.student_answers.voces_presentes);
      if (data.student_answers?.voces_silenciadas) setVocesSilenciadas(data.student_answers.voces_silenciadas);
      if (data.ai_feedbacks?.tabla_acd) setFeedback(data.ai_feedbacks.tabla_acd);
    }
  });

  // 🆕 Obtener citas guardadas
  const citasGuardadas = useMemo(() => {
    if (!documentId) return [];
    return getCitations(documentId);
  }, [documentId, getCitations]);

  // 🆕 Insertar cita en posición del cursor
  const insertarCita = useCallback((textoCita, campo) => {
    const citaFormateada = `"${textoCita}" `;
    
    const refMap = {
      marco: marcoRef,
      estrategias: estrategiasRef,
      presentes: presentesRef,
      silenciadas: silenciadasRef
    };
    
    const setterMap = {
      marco: setMarcoIdeologico,
      estrategias: setEstrategiasRetoricas,
      presentes: setVocesPresentes,
      silenciadas: setVocesSilenciadas
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
        
        // Actualizar cursor después de la inserción
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
    if (documentId) deleteCitation(documentId, citaId);
  }, [documentId, deleteCitation]);

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
  const rubricDimension = useMemo(() => getDimension('acd'), []);

  // Evaluación
  const handleEvaluate = useCallback(async () => {
    if (!isValid || !texto) return;

    setLoading(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando análisis crítico...', icon: '🔍', duration: 2 });

    try {
      // Simular pasos para feedback visual
      const stepTimeouts = [
        setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando marco ideológico...', icon: '📊', duration: 6 }), 1000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 4000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), 16000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando análisis...', icon: '🔧', duration: 4 }), 28000)
      ];
      
      const result = await evaluateTablaACD({
        text: texto,
        marcoIdeologico,
        estrategiasRetoricas,
        vocesPresentes,
        vocesSilenciadas
      });

      // Cancelar timeouts pendientes si la evaluación terminó antes
      stepTimeouts.forEach(timeout => clearTimeout(timeout));

      setFeedback(result);
      
      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica2', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'TablaACD',
        criterios: result.criterios
      });
      
      // 🎮 REGISTRAR RECOMPENSAS
      if (rewards) {
        // Puntos base por evaluación
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'TablaACD',
          rubricId: 'rubrica2'
        });
        
        // Puntos según nivel
        const nivelEvent = `EVALUATION_LEVEL_${result.nivel_global}`;
        rewards.recordEvent(nivelEvent, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'TablaACD'
        });
        
        // Puntos especiales por completar Tabla ACD
        rewards.recordEvent('TABLA_ACD_COMPLETED', {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global
        });
        
        // Puntos por identificar marco ideológico
        if (marcoIdeologico && marcoIdeologico.trim().length > 50) {
          rewards.recordEvent('ACD_FRAME_IDENTIFIED', {
            frame: marcoIdeologico.substring(0, 100)
          });
        }
        
        // Puntos por identificar estrategias retóricas
        if (estrategiasRetoricas && estrategiasRetoricas.trim().length > 50) {
          rewards.recordEvent('ACD_STRATEGY_IDENTIFIED', {
            strategies: estrategiasRetoricas.substring(0, 100)
          });
        }
        
        // Puntos por análisis de poder (voces silenciadas)
        if (vocesSilenciadas && vocesSilenciadas.trim().length > 50) {
          rewards.recordEvent('ACD_POWER_ANALYSIS', {
            analysis: vocesSilenciadas.substring(0, 100)
          });
        }
        
        // Achievement: Score perfecto
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'TablaACD'
          });
        }
        
        console.log('🎮 [TablaACD] Recompensas registradas');
      }
      
    } catch (error) {
      console.error('Error evaluando Tabla ACD:', error);
      setError(error.message || 'Error al evaluar el análisis');
    } finally {
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValid, texto, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas, setError]);

  // Verificar si hay texto
  if (!texto) {
    return (
      <Container>
        <Header>
          <Title>🔍 Tabla de Análisis Crítico del Discurso</Title>
          <Subtitle>Carga un texto para comenzar</Subtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>🔍 Tabla de Análisis Crítico del Discurso (ACD)</Title>
        <Subtitle>
          Identifica marcos ideológicos, estrategias retóricas y voces presentes/silenciadas en el texto.
          Recibirás evaluación criterial basada en la Rúbrica 2 de Literacidad Crítica.
        </Subtitle>
      </Header>

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
                  : 'Selecciona el campo y haz clic en "Insertar"'}
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
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'marco')} theme={theme}>
                          Marco
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'estrategias')} theme={theme}>
                          Estrategias
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'presentes')} theme={theme}>
                          Presentes
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'silenciadas')} theme={theme}>
                          Silenciadas
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

      {/* Formulario */}
      {!feedback && (
        <>
          {/* 🆕 Mensaje de auto-guardado */}
          {(marcoIdeologico || estrategiasRetoricas || vocesPresentes || vocesSilenciadas) && (
            <AutoSaveMessage theme={theme}>
              💾 Tu trabajo se guarda automáticamente. Puedes cambiar de pestaña sin perder tu progreso.
            </AutoSaveMessage>
          )}
          
          {/* 🆕 Hint de guardado manual */}
          <AnimatePresence>
            {showSaveHint && (
              <ShortcutsHint
                as={motion.div}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                theme={theme}
              >
                ✅ Guardado manual exitoso
              </ShortcutsHint>
            )}
          </AnimatePresence>
          
          {/* 🆕 Barra de atajos de teclado */}
          <KeyboardShortcutsBar 
            theme={theme}
            shortcuts={[
              { keys: ['Ctrl', 'S'], label: 'Guardar' },
              { keys: ['Ctrl', 'Enter'], label: 'Evaluar' },
              { keys: ['Esc'], label: 'Cerrar' }
            ]}
          />
          
          <FormSection theme={theme}>
            <SectionTitle theme={theme}>1️⃣ Marco Ideológico</SectionTitle>
            <Label theme={theme}>¿Qué marco ideológico identifica en el texto?</Label>
            <Textarea
              ref={marcoRef}
              theme={theme}
              value={marcoIdeologico}
              onChange={(e) => setMarcoIdeologico(e.target.value)}
              onClick={(e) => handleCursorChange('marco', e)}
              onKeyUp={(e) => handleCursorChange('marco', e)}
              onPaste={handlePaste}
              placeholder="Ej: El texto adopta un marco neoliberal, naturalizando la competencia y el individualismo como valores universales..."
              disabled={loading}
            />
            {pasteError && <PasteErrorMessage theme={theme}>{pasteError}</PasteErrorMessage>}
            <HintText theme={theme}>
              Ejemplos: neoliberal, feminista, conservador, socialista, postcolonial, ambientalista...
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>2️⃣ Estrategias Retóricas</SectionTitle>
            <Label theme={theme}>¿Qué estrategias retóricas usa el autor y para qué?</Label>
            <Textarea
              ref={estrategiasRef}
              theme={theme}
              value={estrategiasRetoricas}
              onChange={(e) => setEstrategiasRetoricas(e.target.value)}
              onClick={(e) => handleCursorChange('estrategias', e)}
              onKeyUp={(e) => handleCursorChange('estrategias', e)}
              onPaste={handlePaste}
              placeholder="Ej: • Metáforas bélicas ('batalla', 'combate') para naturalizar conflictos&#10;• Eufemismos ('ajuste estructural' en vez de 'despidos masivos')&#10;• Nominalización ('la globalización') para ocultar agentes responsables..."
              disabled={loading}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Ejemplos: metáforas, eufemismos, nominalización, voz pasiva, presuposiciones, apelación a autoridad, falsa dicotomía...
            </HintText>
          </FormSection>

          <FormSection theme={theme}>
            <SectionTitle theme={theme}>3️⃣ Voces en el Discurso</SectionTitle>
            <Label theme={theme}>Voces presentes (legitimadas):</Label>
            <Input
              ref={presentesRef}
              theme={theme}
              value={vocesPresentes}
              onChange={(e) => setVocesPresentes(e.target.value)}
              onClick={(e) => handleCursorChange('presentes', e)}
              onKeyUp={(e) => handleCursorChange('presentes', e)}
              onPaste={handlePaste}
              placeholder="Ej: Empresarios, economistas, expertos internacionales..."
              disabled={loading}
            />
            <HintText theme={theme} style={{ marginBottom: '1rem' }}>
              ¿Quiénes tienen autoridad en este texto?
            </HintText>

            <Label theme={theme}>Voces silenciadas (ausentes):</Label>
            <Input
              ref={silenciadasRef}
              theme={theme}
              value={vocesSilenciadas}
              onChange={(e) => setVocesSilenciadas(e.target.value)}
              onClick={(e) => handleCursorChange('silenciadas', e)}
              onKeyUp={(e) => handleCursorChange('silenciadas', e)}
              onPaste={handlePaste}
              placeholder="Ej: Trabajadores, comunidades locales, movimientos sociales..."
              disabled={loading}
            />
            <HintText theme={theme}>
              ¿Quiénes NO tienen voz en este discurso?
            </HintText>
          </FormSection>

          {/* Validación */}
          <ValidationMessage
            $valid={isValid}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {validationMessage}
          </ValidationMessage>

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
            
            <PrimaryButton onClick={handleEvaluate} disabled={!isValid || loading}>
              {loading ? '⏳ Evaluando...' : '🔍 Solicitar Evaluación Criterial'}
            </PrimaryButton>
          </ButtonGroup>
        </>
      )}

      {/* 🆕 Barra de progreso durante evaluación */}
      <AnimatePresence>
        {loading && (
          <EvaluationProgressBar
            isEvaluating={loading}
            estimatedSeconds={35}
            currentStep={currentEvaluationStep}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Loading antiguo (mantener como fallback) */}
      {loading && false && (
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
      )}

      {/* Feedback */}
      <AnimatePresence>
        {feedback && !loading && (
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
                <NivelGlobal $nivel={feedback.nivel_global}>
                  Nivel {feedback.nivel_global}/4
                </NivelGlobal>
              </div>
            </FeedbackHeader>

            <DimensionLabel theme={theme}>
              <strong>{feedback.dimension_label}:</strong> {feedback.dimension_description}
            </DimensionLabel>

            <CriteriosGrid>
              {/* Marco Ideológico */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Marco Ideológico</CriterioTitle>
                  <CriterioNivel $nivel={feedback.criterios.marco_ideologico.nivel}>
                    Nivel {feedback.criterios.marco_ideologico.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.marco_ideologico.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.marco_ideologico.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.marco_ideologico.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.marco_ideologico.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Estrategias Retóricas */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Estrategias Retóricas</CriterioTitle>
                  <CriterioNivel $nivel={feedback.criterios.estrategias_retoricas.nivel}>
                    Nivel {feedback.criterios.estrategias_retoricas.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.estrategias_retoricas.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.estrategias_retoricas.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.estrategias_retoricas.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.estrategias_retoricas.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme} $icon="→">
                          {renderMarkdown(m)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Voces y Silencios */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Voces y Silencios</CriterioTitle>
                  <CriterioNivel $nivel={feedback.criterios.voces_silencios.nivel}>
                    Nivel {feedback.criterios.voces_silencios.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.voces_silencios.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.voces_silencios.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.voces_silencios.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.voces_silencios.mejoras.map((m, idx) => (
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

