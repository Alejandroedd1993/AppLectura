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

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;

  @media (max-width: 840px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  padding: 0.9rem;
  border-radius: 12px;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};

  .label {
    display: block;
    margin-bottom: 0.3rem;
    font-size: 0.73rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  }

  .value {
    display: block;
    font-size: 1.22rem;
    font-weight: 700;
    color: ${props => props.$accent || props.theme.textPrimary || props.theme.text || '#111827'};
  }

  .helper {
    display: block;
    margin-top: 0.22rem;
    font-size: 0.78rem;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  }
`;

const FocusBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.2rem;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid ${props => {
    if (props.$tone === 'warning') return '#F59E0B55';
    if (props.$tone === 'success') return '#16A34A44';
    return `${props.theme.primary}30`;
  }};
  background: ${props => {
    if (props.$tone === 'warning') return 'rgba(245, 158, 11, 0.09)';
    if (props.$tone === 'success') return 'rgba(22, 163, 74, 0.08)';
    return `${props.theme.primary}10`;
  }};
`;

const FocusCopy = styled.div`
  min-width: 220px;

  .eyebrow {
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
  }

  strong {
    display: block;
    margin-bottom: 0.25rem;
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
    font-size: 0.88rem;
    line-height: 1.5;
  }
`;

const FocusButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: ${props => {
    if (props.$tone === 'warning') return '#F59E0B';
    if (props.$tone === 'success') return '#16A34A';
    return props.theme.primary || '#2196F3';
  }};
  color: white;
  font-weight: 700;
  cursor: pointer;
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

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
`;

const CompactCard = styled.div`
  padding: 0.95rem;
  border-radius: 12px;
  border: 1px dashed ${props => props.$accent || props.theme.border};
  background: ${props => props.theme.background};

  strong {
    display: block;
    margin-bottom: 0.25rem;
    color: ${props => props.theme.textPrimary || props.theme.text || '#111827'};
    font-size: 0.9rem;
  }

  p {
    margin: 0;
    color: ${props => props.theme.textSecondary || props.theme.textMuted || '#6B7280'};
    font-size: 0.8rem;
    line-height: 1.5;
  }

  span {
    display: inline-flex;
    margin-top: 0.65rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: ${props => props.$accent || props.theme.border}18;
    color: ${props => props.$accent || props.theme.textSecondary || '#6B7280'};
    font-size: 0.72rem;
    font-weight: 700;
  }
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
        <p>Esta vista separa lo que ya esta en movimiento de las dimensiones que aun faltan por abrir.</p>
      </Header>

      <SummaryGrid>
        <SummaryCard $accent="#2563EB">
          <span className="label">Activas</span>
          <span className="value">{snapshot.summary.coverageCount}/5</span>
          <span className="helper">Dimensiones con actividad</span>
        </SummaryCard>
        <SummaryCard $accent="#16A34A">
          <span className="label">Con nota</span>
          <span className="value">{snapshot.summary.evaluatedCount}/5</span>
          <span className="helper">
            {snapshot.summary.averageEvaluatedScore > 0
              ? `${snapshot.summary.averageEvaluatedScore.toFixed(1)}/10 promedio`
              : 'Sin promedio vigente'
            }
          </span>
        </SummaryCard>
        <SummaryCard $accent="#F59E0B">
          <span className="label">Pendientes</span>
          <span className="value">{snapshot.summary.pendingCount}</span>
          <span className="helper">Entregas a la espera</span>
        </SummaryCard>
        <SummaryCard $accent="#7C3AED">
          <span className="label">Intentos</span>
          <span className="value">{snapshot.summary.totalAttempts}</span>
          <span className="helper">Total registrado en esta lectura</span>
        </SummaryCard>
      </SummaryGrid>

      {snapshot.nextAction && onSelectRubric && (
        <FocusBanner $tone={snapshot.nextAction.tone}>
          <FocusCopy>
            <span className="eyebrow">Siguiente mejor paso</span>
            <strong>{snapshot.nextAction.title}</strong>
            <p>{snapshot.nextAction.description}</p>
          </FocusCopy>
          <FocusButton
            type="button"
            $tone={snapshot.nextAction.tone}
            onClick={() => onSelectRubric(snapshot.nextAction.rubricId)}
          >
            {snapshot.nextAction.ctaLabel}
          </FocusButton>
        </FocusBanner>
      )}

      <SectionTitle>Dimensiones activas ahora</SectionTitle>
      <DetailGrid>
        {activeRubrics.map((rubric) => {
          const accent = getAccent(rubric);
          const currentScoreLabel = rubric.effectiveScore > 0 ? `${rubric.effectiveScore.toFixed(1)}/10` : 'Sin nota';
          const bestScoreLabel = rubric.bestFormativeScore > 0
            ? `${rubric.bestFormativeScore.toFixed(1)}/10`
            : rubric.effectiveScore > 0
              ? `${rubric.effectiveScore.toFixed(1)}/10`
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
        })}
      </DetailGrid>

      {snapshot.lists.unstarted.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: '1.25rem' }}>Dimensiones por abrir</SectionTitle>
          <CompactGrid>
            {snapshot.lists.unstarted.map((rubric) => {
              const isFocus = snapshot.focusRubricId === rubric.rubricId;
              return (
                <CompactCard key={rubric.rubricId} $accent={isFocus ? rubric.color : '#CBD5E1'}>
                  <strong>{rubric.name}</strong>
                  <p>{rubric.artifactName}. Aun no hay evidencia registrada en esta dimension.</p>
                  <span>{isFocus ? 'Siguiente sugerida' : 'Lista para empezar'}</span>
                </CompactCard>
              );
            })}
          </CompactGrid>
        </>
      )}
    </Container>
  );
}
