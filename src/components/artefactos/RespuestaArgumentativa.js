// src/components/artefactos/RespuestaArgumentativa.js
import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateRespuestaArgumentativa } from '../../services/respuestaArgumentativa.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import { getDimension, scoreToLevelDescriptor } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';

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
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
    border-color: #f59e0b;
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
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
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

// ============================================
// 🆕 STYLED COMPONENTS - SISTEMA DE CITAS
// ============================================

const CitasButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.$active ? props.theme.warning : props.theme.cardBg};
  color: ${props => props.$active ? '#fff' : props.theme.textPrimary};
  border: 2px solid ${props => props.$active ? props.theme.warning : props.theme.border};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex-shrink: 0;
  
  ${props => props.$hasNotification && !props.$active && `
    &:after {
      content: '';
      position: absolute;
      top: -6px;
      right: -6px;
      width: 12px;
      height: 12px;
      background: ${props.theme.success};
      border: 2px solid ${props.theme.cardBg};
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }
  `}
  
  &:hover {
    background: ${props => props.$active ? props.theme.warningHover : props.theme.hoverBg};
    border-color: ${props => props.theme.warning};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  background: ${props => props.theme.error}15;
  border: 2px solid ${props => props.theme.error};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin: 0.75rem 0;
  color: ${props => props.theme.error};
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.5s ease;
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
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

export default function RespuestaArgumentativa({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas

  // Estados del formulario con recuperación de sessionStorage
  const [tesis, setTesis] = useState(() => 
    sessionStorage.getItem('respuestaArgumentativa_tesis') || ''
  );
  const [evidencias, setEvidencias] = useState(() => 
    sessionStorage.getItem('respuestaArgumentativa_evidencias') || ''
  );
  const [contraargumento, setContraargumento] = useState(() => 
    sessionStorage.getItem('respuestaArgumentativa_contraargumento') || ''
  );
  const [refutacion, setRefutacion] = useState(() => 
    sessionStorage.getItem('respuestaArgumentativa_refutacion') || ''
  );

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
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

  // 🆕 Auto-save en sessionStorage (respaldo inmediato)
  useEffect(() => {
    if (tesis) sessionStorage.setItem('respuestaArgumentativa_tesis', tesis);
  }, [tesis]);

  useEffect(() => {
    if (evidencias) sessionStorage.setItem('respuestaArgumentativa_evidencias', evidencias);
  }, [evidencias]);

  useEffect(() => {
    if (contraargumento) sessionStorage.setItem('respuestaArgumentativa_contraargumento', contraargumento);
  }, [contraargumento]);

  useEffect(() => {
    if (refutacion) sessionStorage.setItem('respuestaArgumentativa_refutacion', refutacion);
  }, [refutacion]);

  // 🆕 Escuchar restauración de sesión para actualizar estados desde sessionStorage
  useEffect(() => {
    const handleSessionRestored = () => {
      const restoredTesis = sessionStorage.getItem('respuestaArgumentativa_tesis') || '';
      const restoredEvidencias = sessionStorage.getItem('respuestaArgumentativa_evidencias') || '';
      const restoredContra = sessionStorage.getItem('respuestaArgumentativa_contraargumento') || '';
      const restoredRefutacion = sessionStorage.getItem('respuestaArgumentativa_refutacion') || '';
      
      if (restoredTesis !== tesis) setTesis(restoredTesis);
      if (restoredEvidencias !== evidencias) setEvidencias(restoredEvidencias);
      if (restoredContra !== contraargumento) setContraargumento(restoredContra);
      if (restoredRefutacion !== refutacion) setRefutacion(restoredRefutacion);
      
      if (restoredTesis || restoredEvidencias || restoredContra || restoredRefutacion) {
        console.log('🔄 [RespuestaArgumentativa] Borradores restaurados desde sesión');
      }
    };
    
    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [tesis, evidencias, contraargumento, refutacion]);

  // Persistencia
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const persistenceKey = `respuesta_argumentativa_${documentId}`;

  useActivityPersistence(persistenceKey, {
    enabled: documentId !== null,
    studentAnswers: {
      tesis: tesis,
      evidencias: evidencias,
      contraargumento: contraargumento,
      refutacion: refutacion
    },
    aiFeedbacks: { respuesta_argumentativa: feedback },
    onRehydrate: (data) => {
      if (data.student_answers?.tesis) setTesis(data.student_answers.tesis);
      if (data.student_answers?.evidencias) setEvidencias(data.student_answers.evidencias);
      if (data.student_answers?.contraargumento) setContraargumento(data.student_answers.contraargumento);
      if (data.student_answers?.refutacion) setRefutacion(data.student_answers.refutacion);
      if (data.ai_feedbacks?.respuesta_argumentativa) setFeedback(data.ai_feedbacks.respuesta_argumentativa);
    }
  });

  // Rúbrica
  const rubricDimension = useMemo(() => getDimension('argumentacion'), []);

  // 🆕 Gestión de citas guardadas
  const citasGuardadas = useMemo(() => {
    if (!documentId) return [];
    return getCitations(documentId);
  }, [documentId, getCitations]);

  const insertarCita = useCallback((textoCita, campo) => {
    const citaFormateada = `"${textoCita}" `;
    
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
    if (documentId) {
      deleteCitation(documentId, citaId);
    }
  }, [documentId, deleteCitation]);

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
      
      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica4', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'RespuestaArgumentativa',
        criterios: result.criterios
      });

      // 🎮 Registrar recompensas
      if (rewards) {
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'RespuestaArgumentativa',
          rubricId: 'rubrica4'
        });

        rewards.recordEvent(`EVALUATION_LEVEL_${result.nivel_global}`, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'RespuestaArgumentativa'
        });

        // Bonificación por tesis crítica sólida (>100 caracteres)
        if (tesis.length > 100) {
          rewards.recordEvent('CRITICAL_THESIS_DEVELOPED', {
            length: tesis.length,
            artefacto: 'RespuestaArgumentativa'
          });
        }

        // Bonificación por contraargumento anticipado (>80 caracteres)
        if (contraargumento.length > 80) {
          rewards.recordEvent('COUNTERARGUMENT_ANTICIPATED', {
            length: contraargumento.length,
            artefacto: 'RespuestaArgumentativa'
          });
        }

        // Bonificación por refutación elaborada (>80 caracteres)
        if (refutacion.length > 80) {
          rewards.recordEvent('REFUTATION_ELABORATED', {
            length: refutacion.length,
            artefacto: 'RespuestaArgumentativa'
          });
        }

        // Puntuación perfecta
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'RespuestaArgumentativa'
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
  }, [isValid, texto, tesis, evidencias, contraargumento, refutacion, setError]);

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
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'tesis')} theme={theme}>
                          Tesis
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'evidencias')} theme={theme}>
                          Evidencias
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'contraargumento')} theme={theme}>
                          Contra
                        </InsertarButton>
                        <InsertarButton onClick={() => insertarCita(cita.texto, 'refutacion')} theme={theme}>
                          Refutación
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
              value={tesis}
              onChange={(e) => setTesis(e.target.value)}
              onClick={(e) => handleCursorChange('tesis', e)}
              onKeyUp={(e) => handleCursorChange('tesis', e)}
              onPaste={handlePaste}
              placeholder="Ej: Sostengo que el texto naturaliza la lógica neoliberal al presentar la competencia como única forma legítima de organización social, excluyendo alternativas cooperativas del debate público."
              disabled={loading}
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
              value={evidencias}
              onChange={(e) => setEvidencias(e.target.value)}
              onClick={(e) => handleCursorChange('evidencias', e)}
              onKeyUp={(e) => handleCursorChange('evidencias', e)}
              onPaste={handlePaste}
              placeholder='Ej: En el párrafo 3, el autor afirma que "la competencia es ley natural", naturalizando así un modelo económico histórico como inevitable. Además, al usar metáforas deportivas ("ganar/perder") en el párrafo 5, refuerza una visión individualista donde solo hay ganadores y perdedores, omitiendo modelos de economía solidaria documentados en...'
              disabled={loading}
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
              value={contraargumento}
              onChange={(e) => setContraargumento(e.target.value)}
              onClick={(e) => handleCursorChange('contraargumento', e)}
              onKeyUp={(e) => handleCursorChange('contraargumento', e)}
              onPaste={handlePaste}
              placeholder="Ej: Se podría objetar que la competencia ha demostrado históricamente generar innovación tecnológica y mejora de productos, como evidencia el desarrollo industrial de los últimos dos siglos."
              disabled={loading}
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
              value={refutacion}
              onChange={(e) => setRefutacion(e.target.value)}
              onClick={(e) => handleCursorChange('refutacion', e)}
              onKeyUp={(e) => handleCursorChange('refutacion', e)}
              onPaste={handlePaste}
              placeholder="Ej: Si bien es cierto que la competencia puede generar innovación, esta lógica ignora los costos sociales (precarización laboral, desigualdad extrema) y excluye del análisis modelos donde la cooperación también produjo innovación significativa, como el software libre, las cooperativas de Mondragón, o la economía social y solidaria en América Latina."
              disabled={loading}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Reconoce lo válido del contraargumento, pero muestra sus limitaciones o aspectos que ignora
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
              {loading ? '⏳ Evaluando...' : '💭 Solicitar Evaluación Criterial'}
            </PrimaryButton>
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
              {/* Solidez de la Tesis */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Solidez de la Tesis</CriterioTitle>
                  <CriterioNivel $nivel={feedback.criterios.solidez_tesis.nivel}>
                    Nivel {feedback.criterios.solidez_tesis.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.solidez_tesis.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.solidez_tesis.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.solidez_tesis.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.solidez_tesis.mejoras.map((m, idx) => (
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
                  <CriterioNivel $nivel={feedback.criterios.uso_evidencia.nivel}>
                    Nivel {feedback.criterios.uso_evidencia.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.uso_evidencia.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.uso_evidencia.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.uso_evidencia.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.uso_evidencia.mejoras.map((m, idx) => (
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
                  <CriterioNivel $nivel={feedback.criterios.manejo_contraargumento.nivel}>
                    Nivel {feedback.criterios.manejo_contraargumento.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.manejo_contraargumento.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.manejo_contraargumento.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.manejo_contraargumento.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.manejo_contraargumento.mejoras.map((m, idx) => (
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


