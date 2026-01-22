import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  scroll-padding: 0.5rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    gap: 0.25rem;
    padding: 0.25rem 0;
  }
`;

const TabButton = styled(motion.button).withConfig({
  shouldForwardProp: (prop) => !['active', 'compact', 'layout'].includes(prop)
})`
  padding: ${props => props.compact ? '10px 14px' : '12px 20px'};
  cursor: pointer;
  background: ${props => props.active
    ? `linear-gradient(135deg, ${props.theme.primary || '#3190FC'} 0%, ${props.theme.primaryDark || '#1F7EEB'} 100%)`
    : props.theme.surface || '#fff'};
  color: ${props => props.active ? 'white' : props.theme.text};
  border: 1px solid ${props => props.active ? 'transparent' : props.theme.border};
  border-radius: 12px;
  font-weight: ${props => props.active ? '600' : '500'};
  font-size: ${props => props.compact ? '0.85rem' : '0.95rem'};
  display: flex;
  align-items: center;
  gap: ${props => props.compact ? '6px' : '10px'};
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: fit-content;
  min-height: 44px;
  touch-action: manipulation;
  scroll-snap-align: start;
  box-shadow: ${props => props.active
    ? '0 4px 12px rgba(49, 144, 252, 0.3)'
    : '0 1px 3px rgba(0, 0, 0, 0.05)'};
  
  &:hover:not(:disabled) {
    background: ${props => props.active
    ? `linear-gradient(135deg, ${props.theme.primary || '#3190FC'} 0%, ${props.theme.primaryDark || '#1F7EEB'} 100%)`
    : props.theme.surfaceHover || '#f5f5f5'};
    transform: translateY(-2px);
    box-shadow: ${props => props.active
    ? '0 6px 16px rgba(49, 144, 252, 0.4)'
    : '0 4px 12px rgba(0, 0, 0, 0.1)'};
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    color: ${props => props.theme.textMuted};
    cursor: not-allowed;
    opacity: 0.5;
    background: transparent;
    box-shadow: none;
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    padding: 10px 14px;
    font-size: 0.85rem;
    gap: 6px;
    border-radius: 10px;
    
    span:last-child {
      display: ${props => props.compact ? 'none' : 'inline'};
    }
  }
  
  @media (max-width: 480px) {
    padding: 8px 10px;
    min-height: 40px;
    
    span:last-child {
      display: none;
    }
  }
`;

const TabIcon = styled.span`
  font-size: 1.25rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Soporte para imágenes dentro del icono */
  img {
    width: 2rem;
    height: 2rem;
    object-fit: contain;
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    
    img {
      width: 1.75rem;
      height: 1.75rem;
    }
  }
`;

const TabLabel = styled.span`
  line-height: 1;
  
  @media (max-width: 480px) {
    display: none;
  }
`;

const ProgressIndicator = styled.div`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${props =>
    props.$completed ? props.theme.success :
      props.$active ? props.theme.primary :
        props.theme.border
  };
  margin-left: 4px;
  
  @media (max-width: 768px) {
    width: 3px;
    height: 3px;
  }
`;

const TabCounter = styled.span`
  background: ${props => props.theme.primary};
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
  margin-left: 4px;
  
  @media (max-width: 768px) {
    font-size: 0.6rem;
    padding: 1px 4px;
  }
`;

function TabNavigation({
  tabs = [],
  activeTab,
  onTabChange,
  disabled = false,
  compact = false,
  showProgress = false,
  tabProgress = {},
  tabCounters = {}
}) {
  const handleTabClick = React.useCallback((tabId) => {
    if (disabled && tabId !== 'lectura') return;
    onTabChange(tabId);
  }, [disabled, onTabChange]);

  const tabElements = React.useMemo(() => {
    return tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      const isDisabled = disabled && tab.id !== 'lectura';
      const progress = tabProgress[tab.id];
      const counter = tabCounters[tab.id];

      return (
        <TabButton
          key={tab.id}
          active={isActive}
          compact={compact}
          disabled={isDisabled}
          onClick={() => handleTabClick(tab.id)}
          whileHover={{ scale: isDisabled ? 1 : 1.02 }}
          whileTap={{ scale: isDisabled ? 1 : 0.98 }}
          // layout (framer-motion) se usa internamente, evitamos prop DOM directa filtrándola con shouldForwardProp
          layout
        >
          <TabIcon>{tab.icon}</TabIcon>
          <TabLabel>{tab.label}</TabLabel>

          {/* Mostrar progreso si está habilitado */}
          {showProgress && (
            <ProgressIndicator
              $completed={progress === 'completed'}
              $active={progress === 'active'}
            />
          )}

          {/* Mostrar contador si existe */}
          {counter > 0 && (
            <TabCounter>{counter}</TabCounter>
          )}
        </TabButton>
      );
    });
  }, [tabs, activeTab, disabled, compact, showProgress, tabProgress, tabCounters, handleTabClick]);

  return (
    <TabsContainer>
      {tabElements}
    </TabsContainer>
  );
}

export default React.memo(TabNavigation);
