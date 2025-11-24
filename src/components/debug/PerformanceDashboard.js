import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformanceMonitor } from '../../utils/performanceMonitor';

const DashboardContainer = styled(motion.div)`
  position: fixed;
  bottom: 70px;
  left: 20px;
  width: 320px;
  max-height: 500px;
  background: ${props => props.theme?.surface || '#ffffff'};
  border: 1px solid ${props => props.theme?.border || '#dddddd'};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  overflow: hidden;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    width: calc(100vw - 40px);
    max-width: 320px;
    bottom: 60px;
    left: 20px;
    right: 20px;
  }
`;

const Header = styled.div`
  padding: 12px 16px;
  background: ${props => props.theme?.primary || '#007bff'};
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.9rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Content = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
`;

const MetricCard = styled.div`
  background: ${props => props.theme?.cardBg || '#f8f9fa'};
  border: 1px solid ${props => props.theme?.border || '#e9ecef'};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
`;

const MetricTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: ${props => props.theme?.text || '#333'};
  font-weight: 600;
`;

const MetricValue = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme?.textSecondary || '#666'};
  line-height: 1.4;
`;

const MemoryBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${props => props.theme?.border || '#e9ecef'};
  border-radius: 2px;
  margin: 4px 0;
  position: relative;
`;

const MemoryFill = styled.div`
  height: 100%;
  background: ${props => {
    const percentage = props.percentage;
    if (percentage > 80) return '#dc3545'; // Rojo si uso > 80%
    if (percentage > 60) return '#ffc107'; // Amarillo si uso > 60%
    return '#28a745'; // Verde si uso < 60%
  }};
  border-radius: 2px;
  width: ${props => Math.min(props.percentage, 100)}%;
  transition: all 0.3s ease;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    if (props.status === 'good') return '#28a745';
    if (props.status === 'warning') return '#ffc107';
    return '#dc3545';
  }};
  display: inline-block;
  margin-right: 6px;
`;

const Toggle = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.theme?.primary || '#007bff'}dd;
  border: 2px solid ${props => props.theme?.primary || '#007bff'};
  color: white;
  cursor: pointer;
  z-index: 9998;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  opacity: 0.85;
  
  &:hover {
    transform: scale(1.1);
    opacity: 1;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
    bottom: 16px;
    left: 16px;
  }
`;

const RefreshButton = styled.button`
  background: none;
  border: 1px solid ${props => props.theme?.border || '#dee2e6'};
  color: ${props => props.theme?.text || '#333'};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-left: 8px;
  
  &:hover {
    background: ${props => props.theme?.surfaceHover || '#f8f9fa'};
  }
`;

function PerformanceDashboard({ theme }) {
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [hideToggle, setHideToggle] = useState(false);
  const performanceMonitor = usePerformanceMonitor();

  // Ocultar el botón toggle cuando el Tutor Virtual esté abierto
  useEffect(() => {
    const onTutorVisibility = (e) => {
      const active = !!(e && e.detail && e.detail.active);
      setHideToggle(active);
    };
    window.addEventListener('tutor-visibility', onTutorVisibility);
    return () => window.removeEventListener('tutor-visibility', onTutorVisibility);
  }, []);

  useEffect(() => {
    if (visible) {
      const updateMetrics = () => {
        const summary = performanceMonitor.getSummary();
        setMetrics(summary);
      };

      updateMetrics();
      const interval = setInterval(updateMetrics, 2000); // Actualizar cada 2 segundos

      return () => clearInterval(interval);
    }
  }, [visible, performanceMonitor]);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (!ms && ms !== 0) return 'N/A';
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceStatus = (avg) => {
    if (!avg && avg !== 0) return 'unknown';
    if (avg < 16) return 'good'; // < 16ms es bueno para 60 FPS
    if (avg < 33) return 'warning'; // < 33ms es aceptable para 30 FPS
    return 'bad';
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {!hideToggle && (
        <Toggle
          onClick={() => setVisible(!visible)}
          theme={theme}
          title="Performance Dashboard"
        >
          📊
        </Toggle>
      )}

      <AnimatePresence>
        {visible && (
            <DashboardContainer
              theme={theme}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
            <Header theme={theme}>
              Performance Monitor
              <div>
                <RefreshButton
                  onClick={() => {
                    const summary = performanceMonitor.getSummary();
                    setMetrics(summary);
                  }}
                  theme={theme}
                >
                  ↻
                </RefreshButton>
                <CloseButton onClick={() => setVisible(false)}>
                  ×
                </CloseButton>
              </div>
            </Header>

            <Content>
              {metrics?.memory && (
                <MetricCard theme={theme}>
                  <MetricTitle theme={theme}>
                    <StatusDot status={
                      (metrics.memory.used / metrics.memory.total) > 0.8 ? 'bad' :
                      (metrics.memory.used / metrics.memory.total) > 0.6 ? 'warning' : 'good'
                    } />
                    Memory Usage
                  </MetricTitle>
                  <MemoryBar theme={theme}>
                    <MemoryFill 
                      percentage={(metrics.memory.used / metrics.memory.total) * 100}
                    />
                  </MemoryBar>
                  <MetricValue theme={theme}>
                    {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                    <br />
                    Limit: {formatBytes(metrics.memory.limit)}
                  </MetricValue>
                </MetricCard>
              )}

              {metrics?.operations && Object.keys(metrics.operations).length > 0 && (
                <MetricCard theme={theme}>
                  <MetricTitle theme={theme}>Component Performance</MetricTitle>
                  {Object.entries(metrics.operations).map(([name, stats]) => (
                    <div key={name}>
                      <MetricValue theme={theme}>
                        <StatusDot status={getPerformanceStatus(stats?.avg)} />
                        <strong>{name.replace(/^component-/, '')}</strong>
                        <br />
                        Avg: {formatDuration(stats?.avg)} | 
                        Max: {formatDuration(stats?.max)} | 
                        Count: {stats?.count || 0}
                      </MetricValue>
                    </div>
                  ))}
                </MetricCard>
              )}

              {metrics?.navigation && (
                <MetricCard theme={theme}>
                  <MetricTitle theme={theme}>
                    <StatusDot status={
                      metrics.navigation.loadComplete > 3000 ? 'bad' :
                      metrics.navigation.loadComplete > 1500 ? 'warning' : 'good'
                    } />
                    Navigation Timing
                  </MetricTitle>
                  <MetricValue theme={theme}>
                    DOM Content Loaded: {formatDuration(metrics.navigation.domContentLoaded)}
                    <br />
                    Load Complete: {formatDuration(metrics.navigation.loadComplete)}
                    <br />
                    Network Time: {formatDuration(metrics.navigation.networkTime)}
                  </MetricValue>
                </MetricCard>
              )}

              {metrics?.resources && metrics.resources.length > 0 && (
                <MetricCard theme={theme}>
                  <MetricTitle theme={theme}>Recent Resources</MetricTitle>
                  <MetricValue theme={theme}>
                    {metrics.resources.slice(0, 5).map((resource, index) => (
                      <div key={index}>
                        {resource.name.split('/').pop()}: {formatDuration(resource.duration)}
                        {resource.size > 0 && ` (${formatBytes(resource.size)})`}
                      </div>
                    ))}
                  </MetricValue>
                </MetricCard>
              )}

              {(!metrics || Object.keys(metrics).length === 0) && (
                <MetricCard theme={theme}>
                  <MetricValue theme={theme}>
                    No performance data available. Interact with the application to see metrics.
                  </MetricValue>
                </MetricCard>
              )}
            </Content>
          </DashboardContainer>
        )}
      </AnimatePresence>
    </>
  );
}

export default React.memo(PerformanceDashboard);
