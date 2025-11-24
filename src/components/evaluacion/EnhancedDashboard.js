// src/components/evaluacion/EnhancedDashboard.js
import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardContainer = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const DashboardTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  background: ${props => props.theme.background};
  padding: 0.25rem;
  border-radius: 8px;
`;

const ToggleButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  background: ${props => props.$active ? props.theme.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : props.theme.text};
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$active ? props.theme.primaryDark : props.theme.surfaceHover};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.$color || props.theme.primary};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RubricsGrid = styled.div`
  display: grid;
  grid-template-columns: ${props => {
    if (props.$view === 'compact') return 'repeat(auto-fit, minmax(150px, 1fr))';
    if (props.$view === 'detailed') return 'repeat(auto-fit, minmax(280px, 1fr))';
    return 'repeat(auto-fit, minmax(200px, 1fr))';
  }};
  gap: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const RubricCard = styled(motion.div)`
  background: ${props => props.theme.background};
  border: 2px solid ${props => props.$borderColor || props.theme.border};
  border-radius: 10px;
  padding: ${props => props.$view === 'compact' ? '0.75rem' : '1rem'};
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadow?.lg || '0 10px 15px rgba(0, 0, 0, 0.1)'};
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.$borderColor || props.theme.border};
  }
`;

const RubricIcon = styled.div`
  font-size: ${props => props.$view === 'compact' ? '1.5rem' : '2rem'};
  margin-bottom: 0.5rem;
  text-align: center;
`;

const RubricName = styled.div`
  font-size: ${props => props.$view === 'compact' ? '0.75rem' : '0.85rem'};
  font-weight: 600;
  color: ${props => props.theme.text};
  text-align: center;
  margin-bottom: 0.75rem;
  min-height: ${props => props.$view === 'compact' ? '2rem' : '2.5rem'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScoreDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const RubricScore = styled.div`
  font-size: ${props => props.$view === 'compact' ? '1.25rem' : '1.5rem'};
  font-weight: 700;
  color: ${props => props.$color};
`;

const RubricLevel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${props => props.theme.backgroundSecondary};
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.$color};
  border-radius: 3px;
`;

const DetailedInfo = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-around;
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const InfoItem = styled.div`
  text-align: center;
  
  strong {
    display: block;
    color: ${props => props.theme.text};
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textMuted};
  
  p {
    margin: 0.5rem 0;
  }
`;

/**
 * Obtiene color según promedio
 */
const getScoreColor = (average) => {
  if (average === 0) return '#9ca3af';
  if (average >= 8.6) return '#8b5cf6';
  if (average >= 5.6) return '#10b981';
  if (average >= 2.6) return '#f59e0b';
  return '#ef4444';
};

/**
 * Obtiene nivel según promedio
 */
const getLevel = (average) => {
  if (average === 0) return 'Sin evaluar';
  if (average >= 8.6) return '⭐ Excepcional';
  if (average >= 5.6) return '✓ Competente';
  if (average >= 2.6) return '△ En desarrollo';
  return '✗ Requiere apoyo';
};

/**
 * Dashboard mejorado con múltiples vistas
 */
const EnhancedDashboard = ({ rubricProgress = {}, onSelectRubric, theme }) => {
  const [view, setView] = useState('normal'); // 'compact' | 'normal' | 'detailed'

  // Calcular estadísticas generales
  const stats = useMemo(() => {
    const rubrics = Object.values(rubricProgress);
    const evaluated = rubrics.filter(r => r && r.scores && r.scores.length > 0);
    const totalScores = rubrics.reduce((sum, r) => sum + ((r && r.scores) ? r.scores.length : 0), 0);
    const avgScore = evaluated.length > 0
      ? evaluated.reduce((sum, r) => sum + Number(r.average || 0), 0) / evaluated.length
      : 0;
    
    return {
      totalRubrics: rubrics.length,
      evaluatedRubrics: evaluated.length,
      totalAttempts: totalScores,
      averageScore: avgScore.toFixed(1),
    };
  }, [rubricProgress]);

  // Datos de rúbricas
  const rubricsData = [
    { id: 'rubrica1', name: 'Comprensión Analítica', icon: '📚' },
    { id: 'rubrica2', name: 'Análisis Crítico del Discurso', icon: '🔍' },
    { id: 'rubrica3', name: 'Contextualización', icon: '🗺️' },
    { id: 'rubrica4', name: 'Argumentación', icon: '💭' },
    { id: 'rubrica5', name: 'Metacognición Ética IA', icon: '🤖' },
  ];

  const hasData = Object.keys(rubricProgress).length > 0;

  return (
    <DashboardContainer theme={theme}>
      <DashboardHeader>
        <DashboardTitle theme={theme}>
          📊 Progreso en Rúbricas
        </DashboardTitle>
        <ViewToggle theme={theme}>
          <ToggleButton
            $active={view === 'compact'}
            onClick={() => setView('compact')}
            theme={theme}
          >
            Compacto
          </ToggleButton>
          <ToggleButton
            $active={view === 'normal'}
            onClick={() => setView('normal')}
            theme={theme}
          >
            Normal
          </ToggleButton>
          <ToggleButton
            $active={view === 'detailed'}
            onClick={() => setView('detailed')}
            theme={theme}
          >
            Detallado
          </ToggleButton>
        </ViewToggle>
      </DashboardHeader>

      {/* Estadísticas generales */}
      {hasData && (
        <StatsGrid>
          <StatCard theme={theme}>
            <StatValue theme={theme} $color={theme.primary}>{stats.evaluatedRubrics}/{stats.totalRubrics}</StatValue>
            <StatLabel theme={theme}>Rúbricas Evaluadas</StatLabel>
          </StatCard>
          <StatCard theme={theme}>
            <StatValue theme={theme} $color={theme.success}>{stats.totalAttempts}</StatValue>
            <StatLabel theme={theme}>Total Intentos</StatLabel>
          </StatCard>
          <StatCard theme={theme}>
            <StatValue theme={theme} $color={getScoreColor(parseFloat(stats.averageScore))}>
              {stats.averageScore}
            </StatValue>
            <StatLabel theme={theme}>Promedio Global</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      {/* Grid de rúbricas */}
      <RubricsGrid $view={view}>
        {rubricsData.map((rubric) => {
          const data = rubricProgress[rubric.id] || { scores: [], average: 0 };
          const scores = (data.scores || []).map(s => typeof s === 'object' ? Number(s.score) : Number(s));
          const color = getScoreColor(Number(data.average));
          const level = getLevel(Number(data.average));
          const attempts = scores.length;
          const lastScore = scores.length > 0 ? scores[scores.length - 1] : null;
          const bestScore = scores.length > 0 ? Math.max(...scores) : null;

          return (
            <RubricCard
              key={rubric.id}
              theme={theme}
              $view={view}
              $borderColor={color}
              onClick={() => onSelectRubric?.(rubric.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RubricIcon $view={view}>{rubric.icon}</RubricIcon>
              <RubricName theme={theme} $view={view}>{rubric.name}</RubricName>
              
              <ScoreDisplay>
                <RubricScore $view={view} $color={color}>
                  {data.average > 0 ? data.average.toFixed(1) : '—'}
                </RubricScore>
                {view !== 'compact' && (
                  <RubricLevel theme={theme}>{level}</RubricLevel>
                )}
              </ScoreDisplay>

              {view !== 'compact' && data.average > 0 && (
                <ProgressBar theme={theme}>
                  <ProgressFill
                    $color={color}
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.average / 10) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </ProgressBar>
              )}

              {view === 'detailed' && (
                <DetailedInfo theme={theme}>
                  <InfoItem theme={theme}>
                    <strong>{attempts}</strong>
                    Intentos
                  </InfoItem>
                  <InfoItem theme={theme}>
                    <strong>{lastScore ? lastScore.toFixed(1) : '—'}</strong>
                    Último
                  </InfoItem>
                  <InfoItem theme={theme}>
                    <strong>{bestScore ? bestScore.toFixed(1) : '—'}</strong>
                    Mejor
                  </InfoItem>
                </DetailedInfo>
              )}
            </RubricCard>
          );
        })}
      </RubricsGrid>

      {!hasData && (
        <EmptyState theme={theme}>
          <p>📝 Aún no has realizado evaluaciones</p>
          <p>Selecciona una dimensión arriba para comenzar</p>
        </EmptyState>
      )}
    </DashboardContainer>
  );
};

export default EnhancedDashboard;
