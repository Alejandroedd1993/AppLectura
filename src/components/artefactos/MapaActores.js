// src/components/artefactos/MapaActores.js
import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluateMapaActores } from '../../services/mapaActores.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import { getDimension, scoreToLevelDescriptor } from '../../pedagogy/rubrics/criticalLiteracyRubric';
import { renderMarkdown } from '../../utils/markdownUtils';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';

// ============================================
// STYLED COMPONENTS (reutilizados de TablaACD con ajustes)
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
    border-color: #10b981;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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

export default function MapaActores({ theme }) {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation } = useContext(AppContext);
  const rewards = useRewards(); // 🎮 Hook de recompensas

  // Estados del formulario con recuperación de sessionStorage
  const [actores, setActores] = useState(() => 
    sessionStorage.getItem('mapaActores_actores') || ''
  );
  const [contextoHistorico, setContextoHistorico] = useState(() => 
    sessionStorage.getItem('mapaActores_contextoHistorico') || ''
  );
  const [conexiones, setConexiones] = useState(() => 
    sessionStorage.getItem('mapaActores_conexiones') || ''
  );
  const [consecuencias, setConsecuencias] = useState(() => 
    sessionStorage.getItem('mapaActores_consecuencias') || ''
  );

  // Estados de evaluación
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
  const [showGuide, setShowGuide] = useState(true);
  
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

  // 🆕 Guardar respaldo en sessionStorage (auto-guardado)
  useEffect(() => {
    if (actores) sessionStorage.setItem('mapaActores_actores', actores);
  }, [actores]);

  useEffect(() => {
    if (contextoHistorico) sessionStorage.setItem('mapaActores_contextoHistorico', contextoHistorico);
  }, [contextoHistorico]);

  useEffect(() => {
    if (conexiones) sessionStorage.setItem('mapaActores_conexiones', conexiones);
  }, [conexiones]);

  useEffect(() => {
    if (consecuencias) sessionStorage.setItem('mapaActores_consecuencias', consecuencias);
  }, [consecuencias]);

  // 🆕 Escuchar restauración de sesión para actualizar estados desde sessionStorage
  useEffect(() => {
    const handleSessionRestored = () => {
      const restoredActores = sessionStorage.getItem('mapaActores_actores') || '';
      const restoredContexto = sessionStorage.getItem('mapaActores_contextoHistorico') || '';
      const restoredConexiones = sessionStorage.getItem('mapaActores_conexiones') || '';
      const restoredConsecuencias = sessionStorage.getItem('mapaActores_consecuencias') || '';
      
      if (restoredActores !== actores) setActores(restoredActores);
      if (restoredContexto !== contextoHistorico) setContextoHistorico(restoredContexto);
      if (restoredConexiones !== conexiones) setConexiones(restoredConexiones);
      if (restoredConsecuencias !== consecuencias) setConsecuencias(restoredConsecuencias);
      
      if (restoredActores || restoredContexto || restoredConexiones || restoredConsecuencias) {
        console.log('🔄 [MapaActores] Borradores restaurados desde sesión');
      }
    };
    
    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [actores, contextoHistorico, conexiones, consecuencias]);

  // Persistencia
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const persistenceKey = `mapa_actores_${documentId}`;

  useActivityPersistence(persistenceKey, {
    enabled: documentId !== null,
    studentAnswers: {
      actores: actores,
      contexto_historico: contextoHistorico,
      conexiones: conexiones,
      consecuencias: consecuencias
    },
    aiFeedbacks: { mapa_actores: feedback },
    onRehydrate: (data) => {
      if (data.student_answers?.actores) setActores(data.student_answers.actores);
      if (data.student_answers?.contexto_historico) setContextoHistorico(data.student_answers.contexto_historico);
      if (data.student_answers?.conexiones) setConexiones(data.student_answers.conexiones);
      if (data.student_answers?.consecuencias) setConsecuencias(data.student_answers.consecuencias);
      if (data.ai_feedbacks?.mapa_actores) setFeedback(data.ai_feedbacks.mapa_actores);
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
  const rubricDimension = useMemo(() => getDimension('contextualizacion'), []);

  // Evaluación
  const handleEvaluate = useCallback(async () => {
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
      
      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica3', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'MapaActores',
        criterios: result.criterios
      });

      // 🎮 Registrar recompensas
      if (rewards) {
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'MapaActores',
          rubricId: 'rubrica3'
        });

        rewards.recordEvent(`EVALUATION_LEVEL_${result.nivel_global}`, {
          score: result.nivel_global * 2.5,
          nivel: result.nivel_global,
          artefacto: 'MapaActores'
        });

        // Bonificación por contextualización histórica profunda (>150 caracteres)
        if (contextoHistorico.length > 150) {
          rewards.recordEvent('CONTEXTUALIZATION_HISTORICAL', {
            length: contextoHistorico.length,
            artefacto: 'MapaActores'
          });
        }

        // Bonificación por análisis de conexiones (>100 caracteres)
        if (conexiones.length > 100) {
          rewards.recordEvent('SOCIAL_CONNECTIONS_MAPPED', {
            length: conexiones.length,
            artefacto: 'MapaActores'
          });
        }

        // Puntuación perfecta
        if (result.nivel_global === 4) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: 10,
            artefacto: 'MapaActores'
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
  }, [isValid, texto, actores, contextoHistorico, conexiones, consecuencias, setError]);

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
        <Title>🗺️ Mapa de Actores y Consecuencias</Title>
        <Subtitle>
          Sitúa el texto en su contexto socio-histórico, identifica actores, analiza conexiones y evalúa consecuencias.
          Recibirás evaluación criterial basada en la Rúbrica 3 de Literacidad Crítica.
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

      {/* Formulario */}
      {!feedback && (
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
              value={actores}
              onChange={(e) => setActores(e.target.value)}
              onClick={(e) => handleCursorChange('actores', e)}
              onKeyUp={(e) => handleCursorChange('actores', e)}
              onPaste={handlePaste}
              placeholder="Ej: Empresas transnacionales, trabajadores precarizados, gobiernos neoliberales, organizaciones sindicales, movimientos sociales..."
              disabled={loading}
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
              value={contextoHistorico}
              onChange={(e) => setContextoHistorico(e.target.value)}
              onClick={(e) => handleCursorChange('contexto', e)}
              onKeyUp={(e) => handleCursorChange('contexto', e)}
              onPaste={handlePaste}
              placeholder="Ej: Contexto de globalización neoliberal post-1990, crisis financiera 2008, pandemia COVID-19, dictadura militar Chile 1973-1990..."
              disabled={loading}
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
              value={conexiones}
              onChange={(e) => setConexiones(e.target.value)}
              onClick={(e) => handleCursorChange('conexiones', e)}
              onKeyUp={(e) => handleCursorChange('conexiones', e)}
              onPaste={handlePaste}
              placeholder="Ej: Empresas buscan maximizar ganancias mediante desregulación laboral, lo cual entra en conflicto con trabajadores que buscan estabilidad. Gobiernos median según correlación de fuerzas..."
              disabled={loading}
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
              value={consecuencias}
              onChange={(e) => setConsecuencias(e.target.value)}
              onClick={(e) => handleCursorChange('consecuencias', e)}
              onKeyUp={(e) => handleCursorChange('consecuencias', e)}
              onPaste={handlePaste}
              placeholder="Ej: Corto plazo: aumento del desempleo, protestas sociales. Largo plazo: debilitamiento de identidades colectivas, naturalización del individualismo competitivo..."
              disabled={loading}
              style={{ minHeight: '150px' }}
            />
            <HintText theme={theme}>
              Distingue entre consecuencias inmediatas y efectos estructurales a largo plazo
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
              {loading ? '⏳ Evaluando...' : '🗺️ Solicitar Evaluación Criterial'}
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
              {/* Actores y Contexto */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Actores y Contexto</CriterioTitle>
                  <CriterioNivel $nivel={feedback.criterios.actores_contexto.nivel}>
                    Nivel {feedback.criterios.actores_contexto.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.actores_contexto.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.actores_contexto.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.actores_contexto.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.actores_contexto.mejoras.map((m, idx) => (
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
                  <CriterioNivel $nivel={feedback.criterios.conexiones_intereses.nivel}>
                    Nivel {feedback.criterios.conexiones_intereses.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.conexiones_intereses.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.conexiones_intereses.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.conexiones_intereses.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.conexiones_intereses.mejoras.map((m, idx) => (
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
                  <CriterioNivel $nivel={feedback.criterios.impacto_consecuencias.nivel}>
                    Nivel {feedback.criterios.impacto_consecuencias.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedback.criterios.impacto_consecuencias.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedback.criterios.impacto_consecuencias.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme} $icon="✓">
                          {renderMarkdown(f)}
                        </ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedback.criterios.impacto_consecuencias.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades de mejora:</ListTitle>
                    <List>
                      {feedback.criterios.impacto_consecuencias.mejoras.map((m, idx) => (
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


