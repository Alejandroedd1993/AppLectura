import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { buildProgressSnapshot, formatSnapshotDate } from '../../services/progressSnapshot';

const Container = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const Header = styled.div`
  margin-bottom: 1.25rem;

  h3 {
    margin: 0;
    font-size: 1.2rem;
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  }

  p {
    margin: 0.45rem 0 0;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
    font-size: 0.9rem;
    line-height: 1.55;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.9rem 0;
  color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  font-size: 0.98rem;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const DetailCard = styled(motion.div)`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.$accent}44;
  border-left: 4px solid ${props => props.$accent};
  border-radius: 14px;
  padding: 1rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;

  .title {
    flex: 1;
  }

  .title strong {
    display: block;
    margin-bottom: 0.2rem;
    font-size: 0.95rem;
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
  }

  .title span {
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
    font-size: 0.8rem;
  }

  .badge {
    padding: 0.28rem 0.7rem;
    border-radius: 999px;
    background: ${props => props.$accent}18;
    color: ${props => props.$accent};
    border: 1px solid ${props => props.$accent}40;
    font-size: 0.74rem;
    font-weight: 700;
    white-space: nowrap;
  }
`;

const StatList = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: ${props => props.theme.surface};
  font-size: 0.83rem;

  span:first-child {
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  }

  span:last-child {
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
    font-weight: 700;
    text-align: right;
  }
`;

const CardAction = styled.button`
  margin-top: 0.85rem;
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  background: ${props => props.$accent};
  color: white;
  font-weight: 700;
  cursor: pointer;
`;

const CompactList = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-top: 0.9rem;
`;

const CompactRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  border: ${props => props.$solid ? '1px solid' : '1px dashed'} ${props => props.$accent || props.theme.border};
  background: ${props => props.$focus ? `${props.$accent}0D` : props.theme.background};
`;

const CompactCopy = styled.div`
  flex: 1;
  min-width: 220px;

  strong {
    display: block;
    margin-bottom: 0.2rem;
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
    font-size: 0.9rem;
  }

  p {
    margin: 0;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
    font-size: 0.8rem;
    line-height: 1.5;
  }
`;

const CompactTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: ${props => props.$accent || props.theme.border}18;
  color: ${props => props.$accent || props.theme.textSecondary || '#6B7280'};
  font-size: 0.72rem;
  font-weight: 700;
`;

const CompactAction = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.55rem 0.85rem;
  background: ${props => props.$accent === '#94A3B8'
    ? (props.theme.primary || '#2563EB')
    : (props.$accent || props.theme.primary || '#2563EB')};
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};

  .icon {
    font-size: 3rem;
    opacity: 0.35;
    margin-bottom: 0.5rem;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

function getAccent(rubric) {
  if (!rubric.started) return '#CBD5E1';
  if (rubric.isPendingReview) return '#F59E0B';
  return rubric.badgeColor;
}

function sortActiveRubrics(rubrics = [], focusRubricId = null) {
  return [...rubrics].sort((a, b) => {
    if (a.rubricId === focusRubricId) return -1;
    if (b.rubricId === focusRubricId) return 1;
    if (a.isPendingReview && !b.isPendingReview) return -1;
    if (!a.isPendingReview && b.isPendingReview) return 1;
    return (b.lastActivityAt || 0) - (a.lastActivityAt || 0);
  });
}

export default function ProgressStats({ rubricProgress, progressSnapshot = null, onSelectRubric }) {
  const { activitiesProgress, currentTextoId, completeAnalysis } = useContext(AppContext);
  const lectureId = currentTextoId || completeAnalysis?.metadata?.document_id || null;

  const snapshot = useMemo(() => (
    progressSnapshot || buildProgressSnapshot({
      rubricProgress,
      activitiesProgress,
      lectureId
    })
  ), [progressSnapshot, rubricProgress, activitiesProgress, lectureId]);

  const activeRubrics = useMemo(
    () => sortActiveRubrics(snapshot.lists.started, snapshot.focusRubricId),
    [snapshot.lists.started, snapshot.focusRubricId]
  );
  const isFullyCovered = snapshot.summary.coverageCount === snapshot.summary.totalRubrics;
  const leadRubric = isFullyCovered ? activeRubrics[0] || null : null;
  const secondaryActiveRubrics = isFullyCovered ? activeRubrics.slice(1) : [];

  const renderActiveDetailCard = (rubric) => {
    const accent = getAccent(rubric);
    const currentScoreLabel = rubric.effectiveScore > 0 ? `${rubric.effectiveScore.toFixed(1)}/10` : 'Sin nota';
    const bestScoreLabel = rubric.bestRecordedScore > 0
      ? `${rubric.bestRecordedScore.toFixed(1)}/10`
      : 'Sin historial';

    return (
      <DetailCard
        key={rubric.rubricId}
        $accent={accent}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <CardHeader $accent={accent}>
          <div className="title">
            <strong>{rubric.artifactName}</strong>
            <span>{rubric.name}</span>
          </div>
          <div className="badge">{rubric.badgeLabel}</div>
        </CardHeader>

        <StatList>
          <StatRow>
            <span>Estado actual</span>
            <span>{rubric.currentStatusLabel}</span>
          </StatRow>
          <StatRow>
            <span>Puntaje vigente</span>
            <span>{currentScoreLabel}</span>
          </StatRow>
          <StatRow>
            <span>Puntaje mas alto</span>
            <span>{bestScoreLabel}</span>
          </StatRow>
          <StatRow>
            <span>Ultima actividad</span>
            <span>{formatSnapshotDate(rubric.lastActivityAt)}</span>
          </StatRow>
        </StatList>

        {onSelectRubric && (
          <CardAction
            type="button"
            $accent={accent}
            onClick={() => onSelectRubric(rubric.rubricId)}
          >
            Abrir dimension
          </CardAction>
        )}
      </DetailCard>
    );
  };

  if (!snapshot.hasData) {
    return (
      <Container>
        <Header>
          <h3>Mi progreso detallado</h3>
          <p>Cuando registres tus primeras respuestas o entregas, aqui veras estados, notas y actividad reciente por dimension.</p>
        </Header>
        <EmptyState>
          <div className="icon">📝</div>
          <p>Aun no hay evidencia suficiente para mostrar progreso detallado.</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h3>Mi progreso en lectura critica</h3>
        <p>Esta vista prioriza la dimension en foco y compacta el resto del mapa para que puedas decidir tu siguiente movimiento sin tanto scroll.</p>
      </Header>

      {isFullyCovered ? (
        <>
          {leadRubric && (
            <>
              <SectionTitle>Dimension en foco ahora</SectionTitle>
              <DetailGrid style={{ gridTemplateColumns: '1fr' }}>
                {renderActiveDetailCard(leadRubric)}
              </DetailGrid>
            </>
          )}

          {secondaryActiveRubrics.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: '1.25rem' }}>Resto del mapa activo</SectionTitle>
              <CompactList>
                {secondaryActiveRubrics.map((rubric) => {
                  const accent = getAccent(rubric);
                  const currentScoreLabel = rubric.effectiveScore > 0 ? `${rubric.effectiveScore.toFixed(1)}/10` : 'Sin nota';
                  return (
                    <CompactRow key={rubric.rubricId} $accent={accent} $solid>
                      <CompactCopy>
                        <strong>{rubric.artifactName}</strong>
                        <p>{rubric.name}. {rubric.currentStatusLabel} con {currentScoreLabel}. Ultima actividad: {formatSnapshotDate(rubric.lastActivityAt)}.</p>
                      </CompactCopy>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <CompactTag $accent={accent}>{rubric.badgeLabel}</CompactTag>
                        <CompactTag $accent={accent}>{currentScoreLabel}</CompactTag>
                        {onSelectRubric && (
                          <CompactAction
                            type="button"
                            $accent={accent}
                            onClick={() => onSelectRubric(rubric.rubricId)}
                          >
                            Abrir
                          </CompactAction>
                        )}
                      </div>
                    </CompactRow>
                  );
                })}
              </CompactList>
            </>
          )}
        </>
      ) : (
        <>
          <SectionTitle>Dimensiones activas ahora</SectionTitle>
          <DetailGrid>
            {activeRubrics.map((rubric) => renderActiveDetailCard(rubric))}
          </DetailGrid>
        </>
      )}

      {snapshot.lists.unstarted.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: '1.25rem' }}>Dimensiones por abrir</SectionTitle>
          <CompactList>
            {snapshot.lists.unstarted.map((rubric) => {
              const isFocus = snapshot.focusRubricId === rubric.rubricId;
              return (
                <CompactRow key={rubric.rubricId} $accent={isFocus ? rubric.color : '#CBD5E1'} $focus={isFocus}>
                  <CompactCopy>
                    <strong>{rubric.name}</strong>
                    <p>{rubric.artifactName}. Aun no hay evidencia registrada en esta dimension.</p>
                  </CompactCopy>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <CompactTag $accent={isFocus ? rubric.color : '#94A3B8'}>
                      {isFocus ? 'Siguiente sugerida' : 'Lista para empezar'}
                    </CompactTag>
                    {onSelectRubric && (
                      <CompactAction
                        type="button"
                        $accent={isFocus ? rubric.color : '#94A3B8'}
                        onClick={() => onSelectRubric(rubric.rubricId)}
                      >
                        Abrir
                      </CompactAction>
                    )}
                  </div>
                </CompactRow>
              );
            })}
          </CompactList>
        </>
      )}
    </Container>
  );
}
