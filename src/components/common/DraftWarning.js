import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { checkUnsaveDrafts } from '../../utils/checkUnsaveDrafts';
import { AppContext } from '../../context/AppContext';

/**
 * Componente de advertencia para borradores sin evaluar
 * Se muestra cuando hay borradores que se perderán al cambiar de sesión
 * 🆕 FASE 4 FIX: Ahora también considera activitiesProgress para detectar artefactos ya entregados
 */
const DraftWarning = ({ theme }) => {
  const { currentTextoId, rubricProgress, activitiesProgress } = useContext(AppContext);
  const [hasDrafts, setHasDrafts] = useState(false);
  const [details, setDetails] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkDrafts = () => {
      // 🆕 FASE 4 FIX: Pasar activitiesProgress para verificar artefactos ya entregados
      const result = checkUnsaveDrafts(currentTextoId, rubricProgress, activitiesProgress);
      setHasDrafts(result.hasDrafts);
      setDetails(result.details);
      
      // Si no hay borradores, hacer visible de nuevo (por si carga nuevo texto)
      if (!result.hasDrafts) {
        setIsVisible(true);
      }
    };

    // Verificar inicialmente
    checkDrafts();

    // Verificar periódicamente (cada 2 segundos para respuesta más rápida)
    const interval = setInterval(checkDrafts, 2000);

    // Escuchar cambios en sessionStorage y localStorage
    const handleStorageChange = (e) => {
      // Re-verificar inmediatamente cuando cambie algo relevante
      if (e.key?.includes('_draft') || e.key?.includes('ACD_') || e.key?.includes('Actores_') || e.key?.includes('Argumentativa_')) {
        checkDrafts();
      }
    };
    
    // Escuchar eventos personalizados cuando se evalúa exitosamente
    // - `artifact-evaluated`: emitido desde AppContext.updateRubricScore
    // - `evaluation-complete`: compatibilidad con emisores legacy
    // - `artifact-submitted`: 🆕 cuando se entrega un artefacto al docente
    const handleEvaluationComplete = () => {
      console.log('✅ [DraftWarning] Evaluación/entrega completada, re-verificando borradores...');
      checkDrafts();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('artifact-evaluated', handleEvaluationComplete);
    window.addEventListener('evaluation-complete', handleEvaluationComplete);
    window.addEventListener('artifact-submitted', handleEvaluationComplete);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('artifact-evaluated', handleEvaluationComplete);
      window.removeEventListener('evaluation-complete', handleEvaluationComplete);
      window.removeEventListener('artifact-submitted', handleEvaluationComplete);
    };
  }, [currentTextoId, rubricProgress]);

  if (!hasDrafts || !isVisible) return null;

  return (
    <AnimatePresence>
      <WarningContainer
        theme={theme}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <WarningIcon>⚠️</WarningIcon>
        <WarningContent theme={theme}>
          <WarningTitle theme={theme}>
            Advertencia: Borradores sin Evaluar
          </WarningTitle>
          <WarningText theme={theme}>
            Tienes borradores sin evaluar en los siguientes artefactos. 
            <strong> Si cambias de sesión o cargas un nuevo documento, estos borradores se perderán permanentemente.</strong>
          </WarningText>
          <ArtefactosList theme={theme}>
            {details.map((item, idx) => (
              <ArtefactoItem key={idx} theme={theme}>
                <span>•</span>
                <strong>{item.artefacto}</strong>
                <span>→ {item.ubicacion}</span>
              </ArtefactoItem>
            ))}
          </ArtefactosList>
          <Recommendation theme={theme}>
            💡 <strong>Recomendación:</strong> Evalúa estos artefactos antes de cambiar de sesión para guardar tu progreso.
          </Recommendation>
        </WarningContent>
        <CloseButton
          theme={theme}
          onClick={() => setIsVisible(false)}
          title="Cerrar advertencia"
        >
          ×
        </CloseButton>
      </WarningContainer>
    </AnimatePresence>
  );
};

const WarningContainer = styled(motion.div)`
  background: linear-gradient(135deg, ${props => props.theme.error || '#dc2626'}15, ${props => props.theme.warning || '#f59e0b'}15);
  border: 2px solid ${props => props.theme.error || '#dc2626'};
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  position: relative;
  box-shadow: 0 4px 12px ${props => props.theme.error || '#dc2626'}20;
`;

const WarningIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
`;

const WarningContent = styled.div`
  flex: 1;
`;

const WarningTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.theme.error || '#dc2626'};
`;

const WarningText = styled.p`
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${props => props.theme.text || '#232B33'};
  
  strong {
    color: ${props => props.theme.error || '#dc2626'};
    font-weight: 600;
  }
`;

const ArtefactosList = styled.div`
  background: ${props => props.theme.surface || '#FFFFFF'};
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  border-radius: 8px;
  padding: 0.75rem;
  margin: 0.75rem 0;
`;

const ArtefactoItem = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  color: ${props => props.theme.text || '#232B33'};
  margin: 0.5rem 0;
  
  strong {
    font-weight: 600;
    color: ${props => props.theme.text || '#232B33'};
  }
  
  span:last-child {
    color: ${props => props.theme.textMuted || '#607D8B'};
    font-size: 0.85rem;
  }
`;

const Recommendation = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.text || '#232B33'};
  padding: 0.75rem;
  background: ${props => props.theme.success || '#009688'}15;
  border-left: 3px solid ${props => props.theme.success || '#009688'};
  border-radius: 4px;
  margin-top: 0.75rem;
  
  strong {
    color: ${props => props.theme.success || '#009688'};
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${props => props.theme.textMuted || '#607D8B'};
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.theme.border || '#E4EAF1'};
    color: ${props => props.theme.text || '#232B33'};
  }
`;

export default DraftWarning;

