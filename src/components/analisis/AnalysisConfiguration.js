/**
 * @deprecated COMPONENTE MODULAR NO USADO - NO INTEGRAR EN CÓDIGO NUEVO
 * 
 * Wrapper huérfano de SettingsPanel que nunca se integró en el sistema activo.
 * NO está en uso por ningún componente.
 * 
 * Si necesitas configuración de análisis:
 * - Usa SettingsPanel directamente (ya está funcionando)
 * - PreLectura.js ya tiene acceso a configuración global
 * 
 * @see SettingsPanel.js (componente activo de configuración)
 * @see PreLectura.js
 */

import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import SettingsPanel from '../SettingsPanel';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

/**
 * Componente de configuración modernizado que usa el sistema centralizado
 * Esto reemplaza la configuración dispersa anterior
 */
const AnalysisConfiguration = ({ currentConfig, onSave, onClose, theme }) => {
  
  const handleClose = () => {
    // Notificar que se guardó la configuración (compatibilidad)
    if (onSave) {
      onSave(currentConfig);
    }
    onClose();
  };

  return (
    <SettingsPanel 
      isOpen={true}
      onClose={handleClose}
    />
  );
};

export default React.memo(AnalysisConfiguration);