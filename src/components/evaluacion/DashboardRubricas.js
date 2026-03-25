import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { buildProgressSnapshot, formatRubricAttemptDisplay } from '../../services/progressSnapshot';

const DashboardContainer = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const DashboardTitle = styled.h3`
  margin: 0 0 0.4rem 0;
  color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ScopeNote = styled.p`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  font-size: 0.86rem;
  line-height: 1.5;
`;

const RubricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
`;

const RubricCard = styled(motion.button)`
  background: ${props => props.$muted ? props.theme.surface : props.theme.background};
  border: 2px ${props => props.$muted ? 'dashed' : 'solid'} ${props => props.$accent};
  border-radius: 14px;
  padding: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  cursor: pointer;
  text-align: left;
  opacity: ${props => props.$muted ? 0.82 : 1};

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px ${props => `${props.$accent}26`};
    opacity: 1;
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
`;

const RubricIcon = styled.div`
  font-size: 1.6rem;
  line-height: 1;
`;

const FocusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${props => props.$accent}18;
  color: ${props => props.$accent};
  border: 1px solid ${props => props.$accent}50;
`;

const RubricName = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  margin-bottom: 0.25rem;
`;

const RubricArtifact = styled.div`
  font-size: 0.78rem;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  margin-bottom: 0.85rem;
`;

const RubricScore = styled.div`
  font-size: 1.35rem;
  font-weight: 700;
  color: ${props => props.$accent};
  margin-bottom: 0.25rem;
`;

const RubricStatus = styled.div`
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  margin-bottom: 0.85rem;
`;

const RubricMeta = styled.div`
  display: grid;
  gap: 0.45rem;

  div {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
    background: ${props => props.theme.surface};
    font-size: 0.8rem;
  }

  span:first-child {
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  }

  span:last-child {
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
    font-weight: 700;
    text-align: right;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
`;

const EmptyIcon = styled.div`
  font-size: 2.8rem;
  margin-bottom: 0.75rem;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
`;

function getAccent(rubric, theme) {
  if (!rubric.started) return theme.border || '#CBD5E1';
  if (rubric.isPendingReview) return '#F59E0B';
  return rubric.badgeColor;
}

function formatScore(rubric) {
  if (rubric.isPendingReview) return 'En rev.';
  if (rubric.effectiveScore > 0) return `${rubric.effectiveScore.toFixed(1)}/10`;
  return 'Lista';
}

export default function DashboardRubricas({ theme, onSelectRubric, progressSnapshot = null }) {
  const { rubricProgress, activitiesProgress, currentTextoId, completeAnalysis } = useContext(AppContext);
  const lectureId = currentTextoId || completeAnalysis?.metadata?.document_id || null;

  const snapshot = useMemo(() => (
    progressSnapshot || buildProgressSnapshot({
      rubricProgress,
      activitiesProgress,
      lectureId
    })
  ), [progressSnapshot, rubricProgress, activitiesProgress, lectureId]);

  if (!snapshot.hasData) {
    return (
      <DashboardContainer theme={theme}>
        <DashboardTitle theme={theme}>📊 Tu mapa de dimensiones</DashboardTitle>
        <ScopeNote theme={theme}>Este resumen se limita a la lectura actual para no mezclar historiales.</ScopeNote>
        <EmptyState theme={theme}>
          <EmptyIcon>📝</EmptyIcon>
          <EmptyText>
            Aun no hay actividad registrada en esta lectura. En cuanto abras una dimension, aqui veras cobertura, estados y puntajes.
          </EmptyText>
        </EmptyState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer theme={theme}>
      <DashboardTitle theme={theme}>📊 Tu progreso en las 5 dimensiones</DashboardTitle>
      <ScopeNote theme={theme}>
        Hay {snapshot.summary.coverageCount} activa(s), {snapshot.lists.unstarted.length} por abrir y {snapshot.summary.pendingCount} esperando revisión en esta lectura.
      </ScopeNote>

      <RubricsGrid>
        {snapshot.rubrics.map((rubric) => {
          const accent = getAccent(rubric, theme);
          const isFocus = snapshot.focusRubricId === rubric.rubricId;

          return (
            <RubricCard
              key={rubric.rubricId}
              type="button"
              $accent={accent}
              $muted={!rubric.started}
              theme={theme}
              onClick={() => onSelectRubric?.(rubric.rubricId)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: parseInt(rubric.rubricId.replace('rubrica', ''), 10) * 0.06 }}
            >
              <CardTop>
                <RubricIcon>{rubric.icon}</RubricIcon>
                {isFocus && (
                  <FocusPill $accent={accent}>
                    {rubric.isPendingReview ? 'En foco' : 'Siguiente'}
                  </FocusPill>
                )}
              </CardTop>

              <RubricName theme={theme}>{rubric.name}</RubricName>
              <RubricArtifact theme={theme}>{rubric.artifactName}</RubricArtifact>
              <RubricScore $accent={accent}>{formatScore(rubric)}</RubricScore>
              <RubricStatus theme={theme}>{rubric.currentStatusLabel}</RubricStatus>

              <RubricMeta theme={theme}>
                <div>
                  <span>{rubric.hasLegacyScoreOnlyEvidence ? 'Registro' : 'Intentos'}</span>
                  <span>{formatRubricAttemptDisplay(rubric, { legacyLabel: 'Sin registro legacy' })}</span>
                </div>
                <div>
                  <span>{rubric.started ? 'Proximo paso' : 'Estado'}</span>
                  <span>{rubric.started ? 'Abrir dimension' : 'Lista para empezar'}</span>
                </div>
              </RubricMeta>
            </RubricCard>
          );
        })}
      </RubricsGrid>
    </DashboardContainer>
  );
}
