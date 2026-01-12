import React from 'react';
import styled from 'styled-components';

const Box = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
`;

const Title = styled.h4`
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.text};
  font-size: 1rem;
`;

const List = styled.ul`
  margin: 0.5rem 0 0 1.25rem;
  color: ${props => props.theme.text};
`;

const Note = styled.p`
  margin: 0.5rem 0 0 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
`;

const Button = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    opacity: 0.95;
  }
`;

export default function EnsayoPrerequisites({ theme, prerequisitesResult, onGoToActivities }) {
  const canAccess = Boolean(prerequisitesResult?.canAccess);
  const missing = prerequisitesResult?.missing || [];
  const scores = prerequisitesResult?.scores || [];

  return (
    <Box theme={theme} role="region" aria-label="Prerequisitos del Ensayo Integrador">
      <Title theme={theme}>🔒 Prerequisitos</Title>

      {canAccess ? (
        <>
          <div style={{ color: theme.success, fontWeight: 700 }}>✅ Prerequisitos completos</div>
          {scores.length > 0 && (
            <Note theme={theme}>
              Mínimo por dimensión: <strong>{prerequisitesResult.minScoreEach}</strong>. (Se calcula usando el promedio formativo.)
            </Note>
          )}
        </>
      ) : (
        <>
          <div style={{ color: theme.warning || theme.primary, fontWeight: 700 }}>
            ⚠️ Aún no puedes enviar el ensayo.
          </div>

          {missing.length > 0 && (
            <>
              <Note theme={theme}>Artefactos obligatorios pendientes:</Note>
              <List theme={theme}>
                {missing.map((m, idx) => (
                  <li key={`${m.rubricId}:${m.artefacto}:${idx}`}>{m.artefacto} ({m.rubricId})</li>
                ))}
              </List>
            </>
          )}

          {scores.length > 0 && (
            <>
              <Note theme={theme}>Puntajes mínimos por dimensión:</Note>
              <List theme={theme}>
                {scores.map((s, idx) => (
                  <li key={`${s.rubricId}:${idx}`}>
                    {s.rubricId}: {s.average} / 10 {s.passing ? '✅' : '❌'}
                  </li>
                ))}
              </List>
            </>
          )}

          <ActionRow>
            <Button
              theme={theme}
              type="button"
              onClick={() => onGoToActivities?.()}
            >
              Ir a Actividades →
            </Button>
          </ActionRow>
        </>
      )}
    </Box>
  );
}
