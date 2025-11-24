import React, { useMemo } from 'react';
import styled from 'styled-components';
import { usePedagogy, useProgression } from '../../context/PedagogyContext';

// Panel de progreso de literacidad crítica
// Muestra: orden, estado (bloqueada/activa/desbloqueada/completada), criterios y avance

const PanelWrapper = styled.div`
  background: ${p => p.theme.cardBg};
  border: 1px solid ${p => p.theme.border};
  border-radius: 12px;
  padding: 1rem 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const Title = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${p => p.theme.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const ResetBtn = styled.button`
  background: ${p => p.theme.danger};
  color: #fff;
  border: none;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  letter-spacing: .3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: .9;
  &:hover { opacity: 1; }
`;

const DimensionsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

const DimItem = styled.li`
  background: ${p => p.active ? p.theme.primary + '18' : p.theme.surface};
  border: 1px solid ${p => p.active ? p.theme.primary : p.theme.border};
  border-left: 5px solid
    ${p => p.completed ? '#16a34a' : p.active ? p.theme.primary : p.unlocked ? '#f59e0b' : p.theme.border};
  padding: 0.55rem 0.7rem 0.6rem 0.75rem;
  border-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  opacity: ${p => p.locked ? .55 : 1};
`;

const DimHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
`;

const DimName = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${p => p.theme.textPrimary};
`;

const StatusBadge = styled.span`
  font-size: 0.6rem;
  text-transform: uppercase;
  background: ${p => p.color || p.theme.border};
  color: #fff;
  padding: 2px 6px 2px;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: .5px;
`;

const CriteriaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.6rem;
  color: ${p => p.theme.textSecondary};
`;

const MiniStat = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: ${p => p.theme.background};
  border: 1px solid ${p => p.theme.border};
  padding: 2px 6px;
  border-radius: 12px;
`;

const ProgressBarOuter = styled.div`
  height: 6px;
  border-radius: 4px;
  background: ${p => p.theme.background};
  overflow: hidden;
  border: 1px solid ${p => p.theme.border};
`;

const ProgressBarInner = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${p => p.theme.primary}, #16a34a);
  width: ${p => p.percent}%;
  transition: width .45s ease;
`;

const SetCurrentBtn = styled.button`
  margin-left: auto;
  background: ${p => p.theme.primary};
  color: #fff;
  border: none;
  padding: 0.3rem 0.55rem;
  font-size: 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  opacity: .9;
  &:hover { opacity: 1; }
  &:disabled { opacity: .4; cursor: not-allowed; }
`;

const HelpText = styled.p`
  margin: 0;
  font-size: 0.65rem;
  line-height: 1.3;
  color: ${p => p.theme.textSecondary};
`;

function computeDimensionProgress(entry, criteria) {
  if (!entry) return 0;
  const { scores = [], evidence = [] } = entry;
  if (!scores.length) return 0;
  const lastScore = scores[scores.length - 1];
  const lastEvidence = evidence[evidence.length - 1] || 0;
  let pct = 0;
  // Score peso 70%, evidencia 30%
  pct += Math.min(lastScore / criteria.minScore, 1) * 70;
  pct += Math.min(lastEvidence / criteria.minEvidence, 1) * 30;
  return Math.round(pct);
}

export default function CriticalProgressionPanel({ compact = false }) {
  const { RUBRIC } = usePedagogy();
  const progression = useProgression();

  const state = progression.getState();
  const { criteria, sequence } = progression;

  const globalProgress = useMemo(() => {
    let completed = 0;
    sequence.forEach(dim => {
      const entry = state.completed[dim];
      if (entry && computeDimensionProgress(entry, criteria[dim]) >= 100) completed += 1;
    });
    return Math.round((completed / sequence.length) * 100);
  }, [state, criteria, sequence]);

  return (
    <PanelWrapper>
      <Header>
        <Title>🔁 Progresión Crítica <small style={{ fontWeight: 400, opacity: .7 }}>({globalProgress}%)</small></Title>
        {!compact && (
          <ResetBtn onClick={() => progression.resetProgress()} title="Reiniciar progreso">
            ♻️ Reset
          </ResetBtn>
        )}
      </Header>

      <ProgressBarOuter>
        <ProgressBarInner percent={globalProgress} />
      </ProgressBarOuter>

      <DimensionsList>
        {sequence.map(dim => {
          const meta = RUBRIC.dimensiones[dim];
          const entry = state.completed[dim];
          const isCurrent = state.current === dim;
          const unlocked = state.unlocked.includes ? state.unlocked.includes(dim) : state.unlocked.has(dim);
          const progressPct = computeDimensionProgress(entry, criteria[dim]);
          const completed = progressPct >= 100;
          const locked = !unlocked;

          let badge = { text: 'BLOQUEADA', color: '#4b5563' };
          if (completed) badge = { text: 'COMPLETADA', color: '#16a34a' };
          else if (isCurrent) badge = { text: 'ACTIVA', color: '#2563eb' };
          else if (unlocked) badge = { text: 'DESBLOQUEADA', color: '#f59e0b' };

          return (
            <DimItem key={dim} active={isCurrent} unlocked={unlocked} completed={completed} locked={locked}>
              <DimHeader>
                <DimName>{meta.nombre}</DimName>
                <StatusBadge color={badge.color}>{badge.text}</StatusBadge>
                <SetCurrentBtn
                  disabled={!unlocked || isCurrent}
                  onClick={() => progression.setCurrent(dim)}
                  title={unlocked ? 'Activar esta dimensión' : 'Aún bloqueada'}
                >Ir</SetCurrentBtn>
              </DimHeader>

              {!compact && (
                <CriteriaRow>
                  <MiniStat title="Intentos registrados">🧪 {(entry?.attempts) || 0}</MiniStat>
                  <MiniStat title="Último puntaje">🏅 {entry?.scores?.slice(-1)[0] ?? '—'}</MiniStat>
                  <MiniStat title="Promedio reciente">📊 {entry?.scores?.length ? (entry.scores.slice(-2).reduce((a,b)=>a+b,0)/Math.min(entry.scores.length,2)).toFixed(1) : '—'}</MiniStat>
                  <MiniStat title="Evidencia última evaluación">🔗 {entry?.evidence?.slice(-1)[0] ?? 0}</MiniStat>
                  <MiniStat title="Criterio score mínimo">🎯 ≥ {criteria[dim].minScore}</MiniStat>
                  <MiniStat title="Criterio evidencia mínima">📎 ≥ {criteria[dim].minEvidence}</MiniStat>
                </CriteriaRow>
              )}

              <ProgressBarOuter>
                <ProgressBarInner percent={progressPct} />
              </ProgressBarOuter>

              {!compact && (
                <HelpText>
                  {completed ? '✅ Criterios cumplidos. Puedes avanzar.' : isCurrent ? 'Trabaja esta dimensión hasta cumplir criterios para desbloquear la siguiente.' : unlocked ? 'Disponible para seguir practicando.' : 'Bloqueada: cumple criterios de la dimensión anterior.'}
                </HelpText>
              )}
            </DimItem>
          );
        })}
      </DimensionsList>
    </PanelWrapper>
  );
}
