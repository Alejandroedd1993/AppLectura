/**
 * HistoryRibbon — Componente compartido para el historial de versiones de artefactos
 * 
 * Garantiza apariencia visual idéntica en los 5 artefactos.
 * 
 * Props:
 *   history        — Array de { timestamp, attemptNumber, score?, feedback?: { nivel_global } }
 *   viewingVersion — Objeto de versión actual siendo vista (null = actual)
 *   onViewVersion  — (entry | null) => void
 *   theme          — Objeto de tema
 *   scoreFormat    — 'score' | 'nivel' — cómo mostrar la puntuación (default: 'score')
 */

import React from 'react';
import styled from 'styled-components';

const HistoryRibbonComponent = ({
  history = [],
  viewingVersion,
  onViewVersion,
  theme,
  scoreFormat = 'score',
}) => {
  if (!history || history.length === 0) return null;

  const formatScore = (entry) => {
    if (scoreFormat === 'nivel' && entry.feedback?.nivel_global != null) {
      return `Nivel ${entry.feedback.nivel_global}`;
    }
    const score = entry.score ?? entry.feedback?.nivel_global ?? 0;
    return `★ ${typeof score === 'number' ? score.toFixed(1) : score}`;
  };

  return (
    <Ribbon theme={theme}>
      <Title theme={theme}>📋 Historial:</Title>

      <Badge
        $active={!viewingVersion}
        onClick={() => onViewVersion(null)}
        theme={theme}
      >
        Actual
        <span className="score">En progreso</span>
      </Badge>

      {history.slice().reverse().map((entry, idx) => (
        <Badge
          key={entry.timestamp || idx}
          $active={
            viewingVersion != null &&
            (viewingVersion === entry || viewingVersion.timestamp === entry.timestamp)
          }
          onClick={() => onViewVersion(entry)}
          theme={theme}
        >
          Intento {entry.attemptNumber || idx + 1}
          <span className="score">{formatScore(entry)}</span>
        </Badge>
      ))}
    </Ribbon>
  );
};

/* ─── Styled Components ────────────────────────────────── */

const Ribbon = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${p => p.theme?.surfaceAlt || p.theme?.surface || '#f8f9fa'};
  border-bottom: 1px solid ${p => p.theme?.border || '#e0e0e0'};
  overflow-x: auto;
  margin-bottom: 1rem;
  border-radius: 8px 8px 0 0;

  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${p => p.theme?.border || '#ccc'};
    border-radius: 2px;
  }
`;

const Title = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${p => p.theme?.textSecondary || '#666'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  white-space: nowrap;
`;

const Badge = styled.button`
  padding: 0.3rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid ${p => p.$active ? (p.theme?.primary || '#2196F3') : (p.theme?.border || '#e0e0e0')};
  background: ${p => p.$active ? (p.theme?.primary || '#2196F3') : 'transparent'};
  color: ${p => p.$active ? 'white' : (p.theme?.textSecondary || '#666')};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: inherit;
  line-height: 1.4;

  &:hover {
    background: ${p => p.$active ? (p.theme?.primaryHover || '#1976D2') : (p.theme?.background || '#f0f0f0')};
    border-color: ${p => p.theme?.primary || '#2196F3'};
  }

  &:focus-visible {
    outline: 2px solid ${p => p.theme?.primary || '#2196F3'};
    outline-offset: 2px;
  }

  span.score {
    background: ${p => p.$active ? 'rgba(255,255,255,0.2)' : (p.theme?.surfaceAlt || p.theme?.surface || '#f0f0f0')};
    padding: 0.1rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 700;
  }
`;

export default React.memo(HistoryRibbonComponent);
