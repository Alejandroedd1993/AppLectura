import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useACDAnalyzer, useRewards } from '../../context/PedagogyContext';

/**
 * 🔍 ACDAnalysisPanel - Panel de Análisis Crítico del Discurso
 * 
 * Características:
 * - Detecta marcos ideológicos automáticamente (van Dijk framework)
 * - Identifica estrategias retóricas (eufemismo, nominalización, etc.)
 * - Analiza relaciones de poder
 * - Identifica voces presentes/ausentes
 * - Genera preguntas críticas automáticas
 * - Registra puntos por identificación de marcos (+40 pts por marco)
 */

const PanelContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  margin: 0.75rem;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  }
  
  .title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 0.95rem;
  }
  
  .toggle {
    font-size: 1.2rem;
    transition: transform 0.3s ease;
    transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const PanelContent = styled(motion.div)`
  padding: 1rem;
  max-height: 60vh;
  overflow-y: auto;
`;

const AnalyzeButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .icon {
    font-size: 1.2em;
  }
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  color: ${props => props.theme.textPrimary};
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .icon {
    font-size: 1.2em;
  }
`;

const FrameCard = styled(motion.div)`
  background: ${props => props.$color ? `${props.$color}15` : props.theme.background};
  border: 2px solid ${props => props.$color || props.theme.border};
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FrameHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const FrameName = styled.div`
  font-weight: 700;
  color: ${props => props.$color || props.theme.textPrimary};
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .icon {
    font-size: 1.2em;
  }
`;

const FrameDensity = styled.div`
  background: ${props => props.$color || props.theme.primary};
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const FrameDescription = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary};
  line-height: 1.4;
  margin-bottom: 0.5rem;
`;

const ExamplesList = styled.ul`
  margin: 0.5rem 0 0 1.2rem;
  padding: 0;
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary};
  
  li {
    margin: 0.3rem 0;
    line-height: 1.3;
  }
`;

const StrategyCard = styled(motion.div)`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  padding: 0.6rem;
  margin-bottom: 0.6rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StrategyName = styled.div`
  font-weight: 700;
  color: ${props => props.theme.textPrimary};
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  
  .count {
    background: ${props => props.theme.primary};
    color: white;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    font-size: 0.7rem;
  }
`;

const StrategyDescription = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textSecondary};
  line-height: 1.3;
  margin-bottom: 0.4rem;
`;

const CriticalQuestion = styled.div`
  background: ${props => props.theme.info ? `${props.theme.info}15` : '#dbeafe'};
  border-left: 3px solid ${props => props.theme.info || '#3b82f6'};
  padding: 0.5rem 0.7rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: ${props => props.theme.textPrimary};
  line-height: 1.4;
  font-style: italic;
  margin-top: 0.4rem;
`;

const PowerBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: ${props => props.$color || props.theme.surface};
  color: ${props => props.$textColor || props.theme.textPrimary};
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0.3rem 0.3rem 0.3rem 0;
  border: 1px solid ${props => props.$color || props.theme.border};
`;

const VoiceTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: ${props => props.$present ? '#dcfce7' : '#fef2f2'};
  color: ${props => props.$present ? '#166534' : '#991b1b'};
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0.3rem 0.3rem 0.3rem 0;
  border: 1px solid ${props => props.$present ? '#22c55e' : '#ef4444'};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  
  .spinner {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${props => props.theme.textSecondary};
  font-size: 0.85rem;
  line-height: 1.5;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }
`;

const PointsEarned = styled(motion.div)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  .icon {
    font-size: 1.5em;
  }
`;

export default function ACDAnalysisPanel({ text, compact: _compact = false, rewardsResourceId }) {
  const acdAnalyzer = useACDAnalyzer();
  const rewards = useRewards();
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  
  // Analizar automáticamente si hay texto y el panel está expandido
  useEffect(() => {
    if (expanded && text && !analysis && !loading && acdAnalyzer) {
      handleAnalyze();
    }
  }, [expanded, text]);
  
  const handleAnalyze = async () => {
    if (!text || !acdAnalyzer) return;
    
    setLoading(true);
    try {
      // Analizar el texto
      const result = await acdAnalyzer.analyze(text);
      setAnalysis(result);
      
      // Registrar puntos por análisis ACD (dedupe: una vez por texto)
      if (rewards) {
        const toSafeKey = (value) => (value || '')
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_\-:]/g, '')
          .slice(0, 120);

        let totalPoints = 0;

        // Marcos ideológicos: una vez por texto y por marco
        if (result.ideologicalFrames && result.ideologicalFrames.length > 0) {
          result.ideologicalFrames.forEach(frame => {
            const safeFrameName = toSafeKey(frame?.name) || 'unknown';
            const resourceId = rewardsResourceId
              ? `${rewardsResourceId}:acd_frame:${safeFrameName}`
              : undefined;

            const eventResult = rewards.recordEvent('ACD_FRAME_IDENTIFIED', {
              frame: frame.name,
              density: frame.density,
              examples: frame.examples.length,
              resourceId
            });
            totalPoints += eventResult.totalEarned || 0;
          });
        }

        // Estrategias retóricas: una vez por texto y por estrategia
        if (result.rhetoricalStrategies && result.rhetoricalStrategies.length > 0) {
          result.rhetoricalStrategies.forEach(strategy => {
            const safeStrategyName = toSafeKey(strategy?.name) || 'unknown';
            const resourceId = rewardsResourceId
              ? `${rewardsResourceId}:acd_strategy:${safeStrategyName}`
              : undefined;

            const eventResult = rewards.recordEvent('ACD_STRATEGY_IDENTIFIED', {
              strategy: strategy.name,
              occurrences: strategy.occurrences,
              examples: Array.isArray(strategy.examples) ? strategy.examples.length : 0,
              resourceId
            });
            totalPoints += eventResult.totalEarned || 0;
          });
        }

        // Poder: una vez por texto (si se detecta algo)
        const detectedPower = result.powerRelations?.detected || {};
        const detectedTypes = Object.keys(detectedPower);
        if (detectedTypes.length > 0) {
          const resourceId = rewardsResourceId
            ? `${rewardsResourceId}:acd_power`
            : undefined;

          const eventResult = rewards.recordEvent('ACD_POWER_ANALYSIS', {
            detectedTypes,
            resourceId
          });
          totalPoints += eventResult.totalEarned || 0;
        }

        if (totalPoints > 0) {
          setPointsEarned(totalPoints);
          // Auto-limpiar mensaje de puntos después de 5 segundos
          setTimeout(() => setPointsEarned(0), 5000);
        }
      }
      
      console.log('🔍 Análisis ACD completado:', result);
    } catch (error) {
      console.error('Error en análisis ACD:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!acdAnalyzer) return null; // No renderizar si no hay analyzer
  
  return (
    <PanelContainer
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PanelHeader 
        onClick={() => setExpanded(!expanded)}
        $expanded={expanded}
      >
        <div className="title">
          <span>🔍</span>
          <span>Análisis Crítico del Discurso</span>
        </div>
        <div className="toggle">▼</div>
      </PanelHeader>
      
      <AnimatePresence>
        {expanded && (
          <PanelContent
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {!analysis && !loading && (
              <>
                <AnalyzeButton onClick={handleAnalyze} disabled={!text}>
                  <span className="icon">🔍</span>
                  <span>Analizar Texto</span>
                </AnalyzeButton>
                <EmptyState>
                  <div className="icon">📊</div>
                  <div>
                    Haz clic en "Analizar Texto" para detectar marcos ideológicos,
                    estrategias retóricas y relaciones de poder en el texto.
                  </div>
                </EmptyState>
              </>
            )}
            
            {loading && (
              <LoadingState>
                <div className="spinner">🔄</div>
                <div>Analizando el discurso...</div>
              </LoadingState>
            )}
            
            {pointsEarned > 0 && (
              <PointsEarned
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <span className="icon">🎉</span>
                <span>+{pointsEarned} pts por análisis ACD</span>
              </PointsEarned>
            )}
            
            {analysis && (
              <>
                {/* Marcos Ideológicos */}
                {analysis.ideologicalFrames && analysis.ideologicalFrames.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <span className="icon">🎭</span>
                      <span>Marcos Ideológicos Detectados</span>
                    </SectionTitle>
                    
                    {analysis.ideologicalFrames.map((frame, idx) => (
                      <FrameCard
                        key={idx}
                        $color={frame.color}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <FrameHeader>
                          <FrameName $color={frame.color}>
                            <span className="icon">{frame.icon || '🎭'}</span>
                            <span>{frame.name}</span>
                          </FrameName>
                          <FrameDensity $color={frame.color}>
                            {frame.density?.toFixed(1)}% densidad
                          </FrameDensity>
                        </FrameHeader>
                        
                        {frame.description && (
                          <FrameDescription>{frame.description}</FrameDescription>
                        )}
                        
                        {frame.examples && frame.examples.length > 0 && (
                          <>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem', marginBottom: '0.3rem' }}>
                              Ejemplos en el texto:
                            </div>
                            <ExamplesList>
                              {frame.examples.slice(0, 3).map((example, i) => (
                                <li key={i}>"{example}"</li>
                              ))}
                            </ExamplesList>
                          </>
                        )}
                        
                        {frame.criticalQuestions && frame.criticalQuestions.length > 0 && (
                          <CriticalQuestion>
                            💡 {frame.criticalQuestions[0]}
                          </CriticalQuestion>
                        )}
                      </FrameCard>
                    ))}
                  </Section>
                )}
                
                {/* Estrategias Retóricas */}
                {analysis.rhetoricalStrategies && analysis.rhetoricalStrategies.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <span className="icon">📝</span>
                      <span>Estrategias Retóricas</span>
                    </SectionTitle>
                    
                    {analysis.rhetoricalStrategies.map((strategy, idx) => (
                      <StrategyCard
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                      >
                        <StrategyName>
                          <span>{strategy.name}</span>
                          <span className="count">{strategy.occurrences}x</span>
                        </StrategyName>
                        
                        {strategy.description && (
                          <StrategyDescription>{strategy.description}</StrategyDescription>
                        )}
                        
                        {strategy.examples && strategy.examples.length > 0 && (
                          <ExamplesList>
                            {strategy.examples.slice(0, 2).map((example, i) => (
                              <li key={i}>"{example}"</li>
                            ))}
                          </ExamplesList>
                        )}
                        
                        {strategy.criticalQuestion && (
                          <CriticalQuestion>
                            💭 {strategy.criticalQuestion}
                          </CriticalQuestion>
                        )}
                      </StrategyCard>
                    ))}
                  </Section>
                )}
                
                {/* Relaciones de Poder */}
                {analysis.powerRelations && (
                  <Section>
                    <SectionTitle>
                      <span className="icon">⚖️</span>
                      <span>Relaciones de Poder</span>
                    </SectionTitle>
                    
                    <div>
                      {analysis.powerRelations.dominance && analysis.powerRelations.dominance.length > 0 && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Dominancia:</div>
                          {analysis.powerRelations.dominance.map((item, i) => (
                            <PowerBadge key={i} $color="#ef4444" $textColor="white">
                              ⬆️ {item}
                            </PowerBadge>
                          ))}
                        </div>
                      )}
                      
                      {analysis.powerRelations.resistance && analysis.powerRelations.resistance.length > 0 && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Resistencia:</div>
                          {analysis.powerRelations.resistance.map((item, i) => (
                            <PowerBadge key={i} $color="#10b981" $textColor="white">
                              ✊ {item}
                            </PowerBadge>
                          ))}
                        </div>
                      )}
                      
                      {analysis.powerRelations.legitimation && analysis.powerRelations.legitimation.length > 0 && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Legitimación:</div>
                          {analysis.powerRelations.legitimation.map((item, i) => (
                            <PowerBadge key={i} $color="#f59e0b" $textColor="white">
                              ✓ {item}
                            </PowerBadge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Section>
                )}
                
                {/* Voces */}
                {analysis.voiceAnalysis && (
                  <Section>
                    <SectionTitle>
                      <span className="icon">🗣️</span>
                      <span>Análisis de Voces</span>
                    </SectionTitle>
                    
                    <div>
                      {analysis.voiceAnalysis.present && analysis.voiceAnalysis.present.length > 0 && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Voces Presentes:</div>
                          {analysis.voiceAnalysis.present.map((voice, i) => (
                            <VoiceTag key={i} $present={true}>
                              ✓ {voice}
                            </VoiceTag>
                          ))}
                        </div>
                      )}
                      
                      {analysis.voiceAnalysis.absent && analysis.voiceAnalysis.absent.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Voces Ausentes/Silenciadas:</div>
                          {analysis.voiceAnalysis.absent.map((voice, i) => (
                            <VoiceTag key={i} $present={false}>
                              ✗ {voice}
                            </VoiceTag>
                          ))}
                        </div>
                      )}
                    </div>
                  </Section>
                )}
                
                <AnalyzeButton onClick={handleAnalyze}>
                  <span className="icon">🔄</span>
                  <span>Analizar Nuevamente</span>
                </AnalyzeButton>
              </>
            )}
          </PanelContent>
        )}
      </AnimatePresence>
    </PanelContainer>
  );
}
