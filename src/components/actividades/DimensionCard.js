/**
 * DimensionCard — Vista unificada por dimensión de literacidad crítica.
 * Agrupa: práctica opcional (andamiaje) + artefacto formal.
 * El estudiante elige su camino: practicar antes o ir directo al artefacto.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Styled Components ──────────────────────────────────────────────

const Card = styled(motion.div)`
  background: ${p => p.theme.cardBg || '#fff'};
  border: 2px solid ${p => p.$expanded ? p.theme.primary : p.theme.border};
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.2s ease;
`;

const CardHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: ${p => p.theme.surface || '#f5f5f5'};
  }
`;

const DimIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => p.theme.primary}15;
  border-radius: 12px;
`;

const DimInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DimName = styled.h3`
  margin: 0 0 0.2rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: ${p => p.theme.textPrimary};
`;

const DimDesc = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${p => p.theme.textSecondary};
  line-height: 1.4;
`;

const ScoreBadge = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  background: ${p => p.$color ? `${p.$color}15` : 'transparent'};
  border: 1px solid ${p => p.$color ? `${p.$color}40` : 'transparent'};
  min-width: 60px;
`;

const ScoreValue = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${p => p.$color || p.theme.textPrimary};
`;

const ScoreLabel = styled.span`
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${p => p.theme.textSecondary};
`;

const ExpandIcon = styled.span`
  font-size: 1.2rem;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  transform: rotate(${p => p.$expanded ? '180deg' : '0deg'});
  color: ${p => p.theme.textSecondary};
`;

const CardBody = styled(motion.div)`
  padding: 0 1.5rem 1.5rem;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  background: ${p => p.theme.surface};
  border-radius: 10px;
  padding: 0.3rem;
`;

const ToggleBtn = styled.button`
  flex: 1;
  padding: 0.65rem 1rem;
  background: ${p => p.$active ? p.theme.primary : 'transparent'};
  color: ${p => p.$active ? 'white' : p.theme.textPrimary};
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;

  &:hover:not(:disabled) {
    background: ${p => p.$active ? p.theme.primary : `${p.theme.primary}15`};
  }
`;

const PracticeBonusBadge = styled.span`
  font-size: 0.7rem;
  background: #f59e0b;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 700;
`;

const RecommendBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: ${p => p.theme.primary}10;
  border: 1px solid ${p => p.theme.primary}30;
  border-radius: 8px;
  font-size: 0.85rem;
  color: ${p => p.theme.textSecondary};
  line-height: 1.4;
`;

const ContentArea = styled.div`
  min-height: 100px;
`;

// ─── Component ──────────────────────────────────────────────────────

const DIMENSIONS = [
  { id: 'comprension_analitica', rubricId: 'rubrica1', icon: '📚', name: 'Comprensión Analítica', desc: 'Identifica ideas centrales, evidencias y estructura argumentativa del texto.' },
  { id: 'acd', rubricId: 'rubrica2', icon: '🔍', name: 'Análisis Crítico del Discurso', desc: 'Examina marcos ideológicos, estrategias retóricas y voces presentes/silenciadas.' },
  { id: 'contextualizacion', rubricId: 'rubrica3', icon: '🗺️', name: 'Contextualización', desc: 'Sitúa el texto en su contexto socio-histórico, identifica actores y consecuencias.' },
  { id: 'argumentacion', rubricId: 'rubrica4', icon: '💭', name: 'Argumentación', desc: 'Construye postura fundamentada con tesis, evidencias y contraargumentos.' },
  { id: 'metacognicion_etica_ia', rubricId: 'rubrica5', icon: '🤖', name: 'Ética IA y Metacognición', desc: 'Reflexiona sobre el uso ético y responsable de IA en tu aprendizaje.' }
];

export { DIMENSIONS };

/**
 * Score badge helper
 */
function getScoreInfo(rubricProgress, rubricId) {
  const data = rubricProgress?.[rubricId];
  if (!data?.scores?.length) return null;

  // 🛡️ Solo considerar scores de artefactos reales (excluir práctica)
  const artifactScores = data.scores.filter(
    (s) => s.artefacto !== 'PracticaGuiada'
  );
  if (!artifactScores.length) return null;

  const last = artifactScores[artifactScores.length - 1].score;
  if (last >= 8.6) return { value: last.toFixed(1), color: '#10b981', label: 'Excelente' };
  if (last >= 5.6) return { value: last.toFixed(1), color: '#4CAF50', label: 'Bueno' };
  return { value: last.toFixed(1), color: '#FF9800', label: 'En progreso' };
}

export default function DimensionCard({
  dimension,
  theme,
  rubricProgress,
  isRecommended,
  renderPractice,
  renderArtifact,
  defaultExpanded = false,
  expandSignal = null
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [view, setView] = useState('artefacto'); // 'practica' | 'artefacto'

  const score = useMemo(
    () => getScoreInfo(rubricProgress, dimension.rubricId),
    [rubricProgress, dimension.rubricId]
  );

  const handleToggle = useCallback(() => setExpanded(v => !v), []);

  useEffect(() => {
    if (expandSignal) {
      setExpanded(true);
      setView('artefacto');
    }
  }, [expandSignal]);

  return (
    <Card theme={theme} $expanded={expanded} layout>
      <CardHeader theme={theme} onClick={handleToggle} aria-expanded={expanded}>
        <DimIcon theme={theme}>{dimension.icon}</DimIcon>
        <DimInfo>
          <DimName theme={theme}>{dimension.name}</DimName>
          <DimDesc theme={theme}>{dimension.desc}</DimDesc>
        </DimInfo>
        {score && (
          <ScoreBadge $color={score.color} theme={theme}>
            <ScoreValue $color={score.color}>{score.value}</ScoreValue>
            <ScoreLabel theme={theme}>{score.label}</ScoreLabel>
          </ScoreBadge>
        )}
        <ExpandIcon $expanded={expanded} theme={theme}>▼</ExpandIcon>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <CardBody
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {isRecommended && (
              <RecommendBanner theme={theme}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <span><strong>Recomendada:</strong> Esta es una de tus dimensiones con mayor oportunidad de mejora.</span>
              </RecommendBanner>
            )}

            <ViewToggle theme={theme}>
              <ToggleBtn
                $active={view === 'artefacto'}
                onClick={() => setView('artefacto')}
                theme={theme}
              >
                📝 Artefacto
              </ToggleBtn>
              <ToggleBtn
                $active={view === 'practica'}
                onClick={() => setView('practica')}
                theme={theme}
              >
                🎮 Práctica
                <PracticeBonusBadge>+pts</PracticeBonusBadge>
              </ToggleBtn>
            </ViewToggle>

            <ContentArea>
              <AnimatePresence mode="wait">
                {view === 'practica' ? (
                  <motion.div
                    key="practica"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderPractice(dimension)}
                  </motion.div>
                ) : (
                  <motion.div
                    key="artefacto"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderArtifact(dimension)}
                  </motion.div>
                )}
              </AnimatePresence>
            </ContentArea>
          </CardBody>
        )}
      </AnimatePresence>
    </Card>
  );
}
