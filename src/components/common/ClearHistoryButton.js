import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';

/**
 * Botón para eliminar todo el historial de la aplicación
 * Muestra un modal de confirmación antes de eliminar
 */
const ClearHistoryButton = ({ theme }) => {
  const { clearAllHistory } = useContext(AppContext);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setIsClearing(true);
    try {
      const result = clearAllHistory();
      if (result.success) {
        console.log(`🧹 Limpieza completada: ${result.removedCount} elementos eliminados`);
        // Mostrar éxito brevemente y luego recargar la página
        setTimeout(() => {
          setShowConfirm(false);
          setIsClearing(false);
          // 🆕 Recargar la página para asegurar estado limpio
          window.location.reload();
        }, 1500);
      } else {
        alert('Error al limpiar: ' + result.message);
        setIsClearing(false);
      }
    } catch (error) {
      console.error('Error al limpiar:', error);
      alert('Error inesperado al limpiar');
      setIsClearing(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <ClearButton
        onClick={handleClearClick}
        theme={theme}
        title="Eliminar todo el historial de la aplicación"
        aria-label="Eliminar historial"
      >
        🗑️
      </ClearButton>

      <AnimatePresence>
        {showConfirm && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          >
            <ModalContent
              theme={theme}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader theme={theme}>
                <WarningIcon>🧹</WarningIcon>
                <ModalTitle theme={theme}>Limpieza Total de Datos</ModalTitle>
              </ModalHeader>

              <ModalBody theme={theme}>
                <WarningText theme={theme}>
                  <strong>¿Ves progreso de otro curso?</strong> Esta herramienta soluciona ese problema limpiando todos los datos guardados localmente.
                </WarningText>
                <DetailsList theme={theme}>
                  <DetailItem>🗑️ Sesiones y progreso de lecturas</DetailItem>
                  <DetailItem>🗑️ Borradores de artefactos (ACD, Mapa, Resumen, etc.)</DetailItem>
                  <DetailItem>🗑️ Conversaciones con el tutor</DetailItem>
                  <DetailItem>🗑️ Progreso de rúbricas y evaluaciones</DetailItem>
                  <DetailItem>🗑️ Resaltados, anotaciones y citas</DetailItem>
                  <DetailItem>🗑️ Caché de análisis de textos</DetailItem>
                </DetailsList>
                <PreservedInfo theme={theme}>
                  ✅ <strong>Se conservarán:</strong> Modo oscuro, API key, preferencias del tutor
                </PreservedInfo>
                <TipInfo theme={theme}>
                  💡 <strong>Tip:</strong> Después de limpiar, recarga la página y vuelve a entrar a tu curso
                </TipInfo>
              </ModalBody>

              <ModalFooter theme={theme}>
                <CancelButton
                  theme={theme}
                  onClick={handleCancel}
                  disabled={isClearing}
                >
                  Cancelar
                </CancelButton>
                <ConfirmButton
                  theme={theme}
                  onClick={handleConfirm}
                  disabled={isClearing}
                >
                  {isClearing ? '🧹 Limpiando...' : '🧹 Limpiar Todo'}
                </ConfirmButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </>
  );
};

const ClearButton = styled.button`
  background: ${props => props.theme?.error || '#dc2626'}15;
  border: 2px solid ${props => props.theme?.error || '#dc2626'}40;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.3s ease;
  color: ${props => props.theme?.error || '#dc2626'};
  
  &:hover {
    background: ${props => props.theme?.error || '#dc2626'}25;
    border-color: ${props => props.theme?.error || '#dc2626'}60;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1em;
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: ${props => props.theme?.surface || '#FFFFFF'};
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.theme?.border || '#E4EAF1'};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${props => props.theme?.border || '#E4EAF1'};
`;

const WarningIcon = styled.span`
  font-size: 2rem;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: ${props => props.theme?.text || '#232B33'};
`;

const ModalBody = styled.div`
  margin-bottom: 24px;
`;

const WarningText = styled.p`
  font-size: 1rem;
  color: ${props => props.theme?.text || '#232B33'};
  margin-bottom: 16px;
  line-height: 1.6;
`;

const DetailsList = styled.div`
  background: ${props => props.theme?.background || '#F6F8FA'};
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
`;

const DetailItem = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme?.textMuted || '#607D8B'};
  margin: 6px 0;
  line-height: 1.5;
`;

const PreservedInfo = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme?.success || '#009688'};
  background: ${props => props.theme?.success || '#009688'}15;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid ${props => props.theme?.success || '#009688'};
  margin-top: 12px;
`;

const TipInfo = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme?.warning || '#f59e0b'};
  background: ${props => props.theme?.warning || '#f59e0b'}15;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid ${props => props.theme?.warning || '#f59e0b'};
  margin-top: 12px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme?.border || '#E4EAF1'};
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  background: ${props => props.theme?.surface || '#FFFFFF'};
  color: ${props => props.theme?.text || '#232B33'};
  border: 2px solid ${props => props.theme?.border || '#E4EAF1'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.background || '#F6F8FA'};
    border-color: ${props => props.theme?.textMuted || '#607D8B'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmButton = styled.button`
  padding: 10px 20px;
  background: ${props => props.theme?.error || '#dc2626'};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.error || '#dc2626'}dd;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${props => props.theme?.error || '#dc2626'}40;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default ClearHistoryButton;

