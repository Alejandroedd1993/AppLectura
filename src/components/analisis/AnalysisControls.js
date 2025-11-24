/**
 * @deprecated COMPONENTE MODULAR NO USADO - NO INTEGRAR EN CÓDIGO NUEVO
 * 
 * Este componente fue parte de un intento de modularización de AnalisisTexto.js
 * que nunca se completó. NO está en uso por ningún componente activo.
 * 
 * Estado actual: Componente huérfano sin uso
 * 
 * Si necesitas controles de análisis:
 * - PreLectura.js ya tiene controles integrados funcionales
 * - Considera integrar este componente en PreLectura si tiene funcionalidad útil
 * - O elimínalo si no aporta valor adicional
 * 
 * @see PreLectura.js (componente activo de análisis)
 */

import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

// Estilos movidos desde AnalisisTexto.js
const ControlsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: ${props => props.theme.background};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.border};
`;

const ModeSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  
  .label {
    font-weight: 600;
    color: ${props => props.theme.text};
    margin-right: 8px;
  }
`;

const AnalyzeButton = styled(motion.button)`
  padding: 16px 32px;
  background: ${props => props.disabled ? 
    props.theme.border : 
    `linear-gradient(135deg, ${props.theme.primary}, ${props.theme.secondary})`};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
`;

const AnalysisControls = ({
  onAnalizar, puedeAnalizar, cargando, progressPercent, theme
}) => {
  return (
    <ControlsSection theme={theme}>
      <ModeSelector>
        <span className="label">🧠 Análisis Inteligente Dual</span>
        <div style={{ 
          padding: '8px 16px', 
          background: `linear-gradient(135deg, ${theme.primary}15, ${theme.secondary}15)`,
          border: `2px solid ${theme.primary}40`,
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: theme.text
        }}>
          <span style={{ fontSize: '1.2rem' }}>🔥</span>
          <span>DeepSeek (rápido)</span>
          <span style={{ color: theme.primary }}>→</span>
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <span>OpenAI (profundo)</span>
        </div>
      </ModeSelector>
      <div style={{ 
        fontSize: '0.85rem', 
        color: theme.textSecondary, 
        marginTop: 4, 
        marginBottom: 16,
        fontStyle: 'italic' 
      }}>
        ✨ Sistema automático: análisis base + profundización crítica
      </div>

      <AnalyzeButton 
        onClick={onAnalizar} 
        disabled={!puedeAnalizar} 
        theme={theme} 
        whileHover={puedeAnalizar ? { scale: 1.02 } : {}} 
        whileTap={puedeAnalizar ? { scale: 0.98 } : {}}
      >
        {cargando ? (
          <><span>🔄 Analizando...</span>{progressPercent > 0 && <span style={{ marginLeft: '8px' }}>{progressPercent}%</span>}</>
        ) : '🚀 Analizar texto'}
      </AnalyzeButton>
    </ControlsSection>
  );
};

export default React.memo(AnalysisControls);