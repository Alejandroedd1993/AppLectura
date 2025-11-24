import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import webSearchService from '../services/webSearchService';

const ConfigPanel = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const Title = styled.h4`
  color: ${props => props.theme.textPrimary};
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConfigRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const Label = styled.label`
  color: ${props => props.theme.textSecondary};
  font-size: 0.8rem;
  min-width: 100px;
  
  @media (max-width: 768px) {
    min-width: auto;
  }
`;

const Select = styled.select`
  background: ${props => props.theme.inputBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: 4px;
  color: ${props => props.theme.textPrimary};
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  flex: 1;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const Input = styled.input`
  background: ${props => props.theme.inputBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: 4px;
  color: ${props => props.theme.textPrimary};
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  flex: 1;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
  
  &::placeholder {
    color: ${props => props.theme.textSecondary};
  }
`;

const Toggle = styled.button`
  background: ${props => props.enabled ? props.theme.primary : props.theme.inputBg};
  border: 1px solid ${props => props.enabled ? props.theme.primary : props.theme.border};
  border-radius: 4px;
  color: ${props => props.enabled ? 'white' : props.theme.textSecondary};
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.enabled ? props.theme.primaryHover : props.theme.border};
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary};
  margin-top: 0.5rem;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.status === 'available' ? '#10b981' : 
                     props.status === 'configured' ? '#f59e0b' : '#ef4444'};
`;

const WebSearchConfigPanel = ({ 
  isVisible, 
  onToggle, 
  config, 
  onConfigChange 
}) => {
  const [availableProviders, setAvailableProviders] = useState([]);
  const [providerStatus, setProviderStatus] = useState({});

  useEffect(() => {
    // Verificar proveedores disponibles
    const providers = webSearchService.getAvailableProviders();
    setAvailableProviders(providers);
    
    // Determinar estado de cada proveedor
    const status = {
      tavily: process.env.REACT_APP_TAVILY_API_KEY ? 'configured' : 'not-configured',
      serper: process.env.REACT_APP_SERPER_API_KEY ? 'configured' : 'not-configured',
      duckduckgo: 'available' // Siempre disponible
    };
    
    setProviderStatus(status);
  }, []);

  const handleConfigChange = (key, value) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  if (!isVisible) return null;

  return (
    <ConfigPanel
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Title>
        🌐 Búsqueda Web para Literacidad Crítica
      </Title>
      
      <ConfigRow>
        <Label>Habilitado:</Label>
        <Toggle
          enabled={config.enabled}
          onClick={() => handleConfigChange('enabled', !config.enabled)}
        >
          {config.enabled ? 'Activado' : 'Desactivado'}
        </Toggle>
      </ConfigRow>

      {config.enabled && (
        <>
          <ConfigRow>
            <Label>Proveedor:</Label>
            <Select
              value={config.provider}
              onChange={(e) => handleConfigChange('provider', e.target.value)}
            >
              {availableProviders.map(provider => (
                <option key={provider} value={provider}>
                  {provider === 'tavily' ? 'Tavily AI (Recomendado)' :
                   provider === 'serper' ? 'Google Search (Serper)' :
                   provider === 'duckduckgo' ? 'DuckDuckGo (Gratuito)' : provider}
                </option>
              ))}
            </Select>
          </ConfigRow>

          <ConfigRow>
            <Label>Máx. Resultados:</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={config.maxResults}
              onChange={(e) => handleConfigChange('maxResults', parseInt(e.target.value))}
            />
          </ConfigRow>

          <ConfigRow>
            <Label>Tipo de Análisis:</Label>
            <Select
              value={config.analysisType}
              onChange={(e) => handleConfigChange('analysisType', e.target.value)}
            >
              <option value="contexto-social">Contexto Social y Cultural</option>
              <option value="perspectiva-critica">Perspectiva Crítica</option>
              <option value="fuentes-contraste">Fuentes de Contraste</option>
              <option value="analisis-integral">Análisis Integral</option>
              <option value="academico">Académico</option>
              <option value="historico">Histórico</option>
              <option value="cientifico">Científico</option>
            </Select>
          </ConfigRow>

          <StatusIndicator>
            <StatusDot status={providerStatus[config.provider]} />
            Estado: {
              providerStatus[config.provider] === 'configured' ? 'Configurado y listo' :
              providerStatus[config.provider] === 'available' ? 'Disponible' :
              'Requiere clave API'
            }
          </StatusIndicator>

          {providerStatus[config.provider] === 'not-configured' && (
            <StatusIndicator style={{ color: '#f59e0b', marginTop: '0.25rem' }}>
              ⚠️ Configura {config.provider.toUpperCase()}_API_KEY en el archivo .env
            </StatusIndicator>
          )}
        </>
      )}
    </ConfigPanel>
  );
};

export default WebSearchConfigPanel;
