/**
 * Componente de Advertencia de IA
 * Muestra disclaimer sobre contenido generado con IA
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const AIDisclaimer = ({ modoOscuro }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <Container
        as={motion.div}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.4 }}
        $darkMode={modoOscuro}
      >
        <Content>
          <Icon>⚠️</Icon>
          <Message>
            <Strong>Importante:</Strong> Las respuestas de esta aplicación son generadas por IA y pueden contener errores. Como usuario, es su responsabilidad <Highlight>verificar los datos y analizar íntegramente la información</Highlight>. Esta herramienta pedagógica ha sido desarrollada para acompañar el proceso de entendimiento profundo de un texto, en ningún caso sustituye el trabajo humano que es central en todo el proceso.
          </Message>
          <CloseButton onClick={() => setIsVisible(false)} title="Cerrar advertencia">
            ×
          </CloseButton>
        </Content>
      </Container>
    </AnimatePresence>
  );
};

export default AIDisclaimer;

// Styled Components
const Container = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.$darkMode 
    ? 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)'
    : 'linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)'
  };
  border-top: 3px solid #ff9800;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 16px 24px;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
`;

const Icon = styled.div`
  font-size: 32px;
  flex-shrink: 0;
`;

const Message = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: ${props => props.theme?.text || '#333'};
  flex: 1;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

const Strong = styled.strong`
  font-weight: 700;
  color: #d84315;
`;

const Highlight = styled.span`
  font-weight: 600;
  color: #f57c00;
  text-decoration: underline;
  text-decoration-color: #ff9800;
  text-decoration-thickness: 2px;
`;

const CloseButton = styled.button`
  background: rgba(0, 0, 0, 0.1);
  border: none;
  color: #666;
  font-size: 32px;
  font-weight: 300;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.2);
    color: #333;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;
