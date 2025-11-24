import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import SettingsPanel from './SettingsPanel';
import { useApiConfig } from '../hooks/useApiConfig';

const SettingsButton = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { stats, activeProvider } = useApiConfig();

  return (
    <>
      <FloatingButton 
        onClick={() => setIsSettingsOpen(true)}
        title="Configuración de APIs de IA"
      >
        <ButtonIcon>{activeProvider.icon}</ButtonIcon>
        <ButtonLabel>APIs</ButtonLabel>
        {!stats.isConfigured && <NotificationDot />}
      </FloatingButton>

      <SettingsPanel 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const FloatingButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  z-index: 1000;
  font-family: inherit;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
    ${css`animation: ${pulse} 2s infinite;`}
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
    bottom: 16px;
    right: 16px;
  }
`;

const ButtonIcon = styled.div`
  font-size: 1.2rem;
  margin-bottom: 2px;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ButtonLabel = styled.div`
  font-size: 0.6rem;
  font-weight: 500;
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 0.55rem;
  }
`;

const NotificationDot = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 12px;
  height: 12px;
  background: #ff4757;
  border-radius: 50%;
  border: 2px solid white;
  ${css`animation: ${pulse} 1.5s infinite;`}
`;

export default SettingsButton;
