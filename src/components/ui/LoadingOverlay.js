import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const OverlayContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: white;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid ${props => props.theme.primary || '#fff'};
  border-radius: 50%;
  ${css`animation: ${spin} 1s linear infinite;`}
`;

const Message = styled.p`
  margin-top: 20px;
  font-size: 1.2rem;
  font-weight: 500;
`;

const LoadingOverlay = ({ message, progress }) => {
  return (
    <OverlayContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Spinner />
      <Message>
        {message || 'Cargando...'}
        {progress > 0 && ` (${progress}%)`}
      </Message>
    </OverlayContainer>
  );
};

export default LoadingOverlay;