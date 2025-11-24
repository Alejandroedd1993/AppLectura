import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApiConfig } from '../hooks/useApiConfig';
import { getAvailableProviders } from '../config/aiProviders';

const SettingsPanel = ({ isOpen, onClose }) => {
  const { 
    currentProvider, 
    activeProvider, 
    apiKeys, 
    stats, 
    providers,
    switchProvider, 
    setApiKey,
    usage,
    isAvailable 
  } = useApiConfig();
  
  const [localKeys, setLocalKeys] = useState(apiKeys);
  const [selectedTab, setSelectedTab] = useState('providers');
  const [saveStatus, setSaveStatus] = useState({}); // Estado para feedback visual

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  // Añadir soporte para cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Evitar scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleKeyChange = (providerId, value) => {
    setLocalKeys(prev => ({ ...prev, [providerId]: value }));
    // Limpiar estado de guardado cuando se cambia el valor
    setSaveStatus(prev => ({ ...prev, [providerId]: null }));
  };

  const handleSaveKey = async (providerId) => {
    try {
      setSaveStatus(prev => ({ ...prev, [providerId]: 'saving' }));
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
      
      setApiKey(providerId, localKeys[providerId]);
      setSaveStatus(prev => ({ ...prev, [providerId]: 'success' }));
      
      // Limpiar el estado después de 2 segundos
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [providerId]: null }));
      }, 2000);
      
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
      console.error('Error saving API key:', error);
    }
  };

  const handleProviderSwitch = (providerId) => {
    console.log(`🔄 Intentando cambiar a proveedor: ${providerId}`);
    
    // Permitir cambio a cualquier proveedor existente, sin validar disponibilidad
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      // Cambiar proveedor usando el hook en lugar de localStorage directo
      if (switchProvider(providerId)) {
        console.log(`✅ Proveedor cambiado a: ${providerId}`);
      } else {
        console.log(`⚠️ No se pudo cambiar a: ${providerId}`);
      }
    } else {
      alert('Proveedor no encontrado.');
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    // Solo cerrar si se hace clic en el overlay, no en el contenido del panel
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <SettingsOverlay onClick={handleOverlayClick}>
      <SettingsContainer onClick={e => e.stopPropagation()}>
        <Header>
          <Title>⚙️ Configuración de APIs</Title>
          <CloseButton onClick={onClose} title="Cerrar configuración">✕</CloseButton>
        </Header>

        <TabContainer>
          <Tab 
            active={selectedTab === 'providers'} 
            onClick={() => setSelectedTab('providers')}
          >
            🔄 Proveedores
          </Tab>
          <Tab 
            active={selectedTab === 'dashboard'} 
            onClick={() => setSelectedTab('dashboard')}
          >
            📊 Dashboard
          </Tab>
          <Tab 
            active={selectedTab === 'settings'} 
            onClick={() => setSelectedTab('settings')}
          >
            ⚙️ Configuración
          </Tab>
        </TabContainer>

        <Content>
          {selectedTab === 'providers' && (
            <ProvidersTab>
              <SectionTitle>Seleccionar Proveedor de IA</SectionTitle>
              <ProviderGrid>
                {providers.map(provider => (
                  <ProviderCard 
                    key={provider.id}
                    active={currentProvider === provider.id}
                    available={isAvailable[provider.id]}
                    onClick={() => handleProviderSwitch(provider.id)}
                  >
                    <ProviderIcon>{provider.icon}</ProviderIcon>
                    <ProviderName>{provider.name}</ProviderName>
                    <ProviderDescription>{provider.description}</ProviderDescription>
                    
                    {provider.free && <FreeBadge>🎁 GRATUITO</FreeBadge>}
                    
                    <ProviderStats>
                      <Stat>💰 ${provider.costPer1M}/1M tokens</Stat>
                      {provider.dailyLimit && (
                        <Stat>📅 Límite: {provider.dailyLimit}/día</Stat>
                      )}
                    </ProviderStats>

                    <StatusIndicator available={isAvailable[provider.id]}>
                      {isAvailable[provider.id] ? '✅ Disponible' : '❌ No disponible'}
                    </StatusIndicator>

                    {provider.apiKeyRequired && (
                      <KeySection>
                        <KeyInput
                          type="password"
                          placeholder={`${provider.name} API Key`}
                          value={localKeys[provider.id] || ''}
                          onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                        />
                        <SaveButton 
                          onClick={() => handleSaveKey(provider.id)}
                          disabled={saveStatus[provider.id] === 'saving'}
                          status={saveStatus[provider.id]}
                        >
                          {saveStatus[provider.id] === 'saving' ? '⏳ Guardando...' :
                           saveStatus[provider.id] === 'success' ? '✅ Guardado!' :
                           saveStatus[provider.id] === 'error' ? '❌ Error' :
                           'Guardar'}
                        </SaveButton>
                      </KeySection>
                    )}
                  </ProviderCard>
                ))}
              </ProviderGrid>
            </ProvidersTab>
          )}

          {selectedTab === 'dashboard' && (
            <DashboardTab>
              <SectionTitle>📊 Dashboard de Uso</SectionTitle>
              
              <StatsGrid>
                <StatCard>
                  <StatValue>{stats.dailyUsage}</StatValue>
                  <StatLabel>Peticiones Hoy</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{stats.availableCount}/{stats.providersCount}</StatValue>
                  <StatLabel>Proveedores Activos</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{activeProvider.name}</StatValue>
                  <StatLabel>Proveedor Actual</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{stats.isConfigured ? '✅' : '❌'}</StatValue>
                  <StatLabel>Configurado</StatLabel>
                </StatCard>
              </StatsGrid>

              <UsageSection>
                <h3>Uso por Proveedor</h3>
                {Object.entries(usage).map(([providerId, data]) => (
                  <UsageRow key={providerId}>
                    <UsageProvider>
                      {providers.find(p => p.id === providerId)?.icon} {providerId}
                    </UsageProvider>
                    <UsageCount>{data.count || 0} peticiones</UsageCount>
                    <UsageDate>{data.date}</UsageDate>
                  </UsageRow>
                ))}
              </UsageSection>
            </DashboardTab>
          )}

          {selectedTab === 'settings' && (
            <SettingsTab>
              <SectionTitle>⚙️ Configuración Avanzada</SectionTitle>
              
              <SettingGroup>
                <h3>🔄 Fallback Automático</h3>
                <SettingDescription>
                  Cambiar automáticamente a otro proveedor si el actual no está disponible
                </SettingDescription>
                <Toggle>
                  <input type="checkbox" defaultChecked />
                  <ToggleSlider />
                </Toggle>
              </SettingGroup>

              <SettingGroup>
                <h3>📊 Tracking de Uso</h3>
                <SettingDescription>
                  Monitorear uso diario y estadísticas de rendimiento
                </SettingDescription>
                <Toggle>
                  <input type="checkbox" defaultChecked />
                  <ToggleSlider />
                </Toggle>
              </SettingGroup>

              <SettingGroup>
                <h3>🎯 Calidad vs Velocidad</h3>
                <SettingDescription>
                  Priorizar calidad de respuesta o velocidad de procesamiento
                </SettingDescription>
                <select defaultValue="balanced">
                  <option value="quality">🎯 Calidad máxima</option>
                  <option value="balanced">⚖️ Balanceado</option>
                  <option value="speed">⚡ Velocidad máxima</option>
                </select>
              </SettingGroup>

              <ResetSection>
                <ResetButton onClick={() => {
                  if (window.confirm('¿Resetear toda la configuración?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}>
                  🔄 Resetear Configuración
                </ResetButton>
              </ResetSection>
            </SettingsTab>
          )}
        </Content>

        <Footer>
          <FooterInfo>
            💡 <strong>Tip:</strong> DeepSeek es gratuito y no requiere API key para empezar
          </FooterInfo>
        </Footer>
      </SettingsContainer>
    </SettingsOverlay>
  );
};

const SettingsOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const SettingsContainer = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border-radius: 20px;
  width: 95vw;
  max-width: 900px;
  max-height: 95vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    width: 98vw;
    max-height: 98vh;
    border-radius: 12px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.2rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const TabContainer = styled.div`
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
`;

const Tab = styled.button`
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: ${props => props.active ? '#ffffff' : 'transparent'};
  color: ${props => props.active ? '#333' : '#666'};
  font-weight: ${props => props.active ? '600' : '400'};
  border-bottom: ${props => props.active ? '2px solid #667eea' : 'none'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#ffffff' : '#e9ecef'};
    color: #333;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
`;

const SectionTitle = styled.h3`
  margin: 0 0 20px 0;
  color: #333;
  font-weight: 600;
`;

const ProvidersTab = styled.div``;

const ProviderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 100%;
`;

const ProviderCard = styled.div`
  border: 2px solid ${props => 
    props.active ? '#667eea' : 
    props.available ? '#e9ecef' : '#ff6b6b'
  };
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.active ? '#f8f9ff' : '#ffffff'};
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;

  &:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  }
`;

const ProviderIcon = styled.div`
  font-size: 2rem;
  text-align: center;
  margin-bottom: 8px;
`;

const ProviderName = styled.h4`
  margin: 0 0 4px 0;
  text-align: center;
  font-weight: 600;
  color: #333;
`;

const ProviderDescription = styled.p`
  margin: 0 0 12px 0;
  text-align: center;
  font-size: 0.85rem;
  color: #666;
`;

const FreeBadge = styled.div`
  background: #28a745;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 8px;
`;

const ProviderStats = styled.div`
  margin-bottom: 8px;
`;

const Stat = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 2px;
`;

const StatusIndicator = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.available ? '#28a745' : '#dc3545'};
  text-align: center;
  margin-bottom: 8px;
`;

const KeySection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  width: 100%;
  box-sizing: border-box;
`;

const KeyInput = styled.input`
  width: 100%;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 8px;
  box-sizing: border-box;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &::placeholder {
    color: #999;
    font-family: inherit;
  }
`;

const SaveButton = styled.button`
  width: 100%;
  background: ${props => 
    props.status === 'saving' ? '#ffc107' :
    props.status === 'success' ? '#28a745' :
    props.status === 'error' ? '#dc3545' :
    '#667eea'
  };
  color: white;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.7 : 1};

  &:hover:not(:disabled) {
    background: ${props => 
      props.status === 'saving' ? '#e0a800' :
      props.status === 'success' ? '#218838' :
      props.status === 'error' ? '#c82333' :
      '#5a67d8'
    };
  }
`;

const DashboardTab = styled.div``;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  opacity: 0.9;
`;

const UsageSection = styled.div`
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
`;

const UsageRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;

  &:last-child {
    border-bottom: none;
  }
`;

const UsageProvider = styled.span`
  font-weight: 500;
`;

const UsageCount = styled.span`
  color: #667eea;
  font-weight: 600;
`;

const UsageDate = styled.span`
  color: #666;
  font-size: 0.85rem;
`;

const SettingsTab = styled.div``;

const SettingGroup = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
`;

const SettingDescription = styled.p`
  margin: 8px 0 12px 0;
  color: #666;
  font-size: 0.9rem;
`;

const Toggle = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + & {
    background-color: #667eea;
  }

  input:checked + &:before {
    transform: translateX(26px);
  }
`;

const ResetSection = styled.div`
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #eee;
`;

const ResetButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: #c82333;
  }
`;

const Footer = styled.div`
  padding: 16px 24px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
`;

const FooterInfo = styled.div`
  font-size: 0.85rem;
  color: #666;
  text-align: center;
`;

export default SettingsPanel;
