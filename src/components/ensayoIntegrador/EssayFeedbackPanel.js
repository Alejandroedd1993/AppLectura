import React from 'react';
import styled, { keyframes } from 'styled-components';

// 🆕 Animación sutil para entrada
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Box = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.25rem;
  animation: ${fadeIn} 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const Title = styled.h4`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SavedBadge = styled.span`
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: ${props => props.theme.textMuted}20;
  color: ${props => props.theme.textMuted};
  border-radius: 999px;
  font-weight: 600;
`;

// 🆕 Score visual mejorado
const ScoreCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: ${props => {
    const score = props.$score;
    if (score >= 8) return props.theme.success + '15';
    if (score >= 6) return (props.theme.warning || '#f59e0b') + '15';
    return (props.theme.danger || '#ef4444') + '15';
  }};
  border: 2px solid ${props => {
    const score = props.$score;
    if (score >= 8) return props.theme.success;
    if (score >= 6) return props.theme.warning || '#f59e0b';
    return props.theme.danger || '#ef4444';
  }};
  border-radius: 12px;
`;

const ScoreValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${props => {
    const score = props.$score;
    if (score >= 8) return props.theme.success;
    if (score >= 6) return props.theme.warning || '#f59e0b';
    return props.theme.danger || '#ef4444';
  }};
`;

const ScoreLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
  font-weight: 600;
`;

const NivelBadge = styled.div`
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  background: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  border-radius: 999px;
  font-weight: 700;
  margin-top: 0.35rem;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.border};
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

// 🆕 Secciones de feedback mejoradas
const FeedbackSection = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: ${props => props.$variant === 'strengths' 
    ? props.theme.success + '08' 
    : props.$variant === 'weaknesses'
    ? (props.theme.warning || '#f59e0b') + '08'
    : props.theme.primary + '08'};
  border-radius: 8px;
  border-left: 3px solid ${props => props.$variant === 'strengths' 
    ? props.theme.success 
    : props.$variant === 'weaknesses'
    ? props.theme.warning || '#f59e0b'
    : props.theme.primary};
`;

const SectionTitle = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const SectionIcon = styled.span`
  font-size: 1rem;
`;

const FeedbackList = styled.ul`
  margin: 0;
  padding-left: 1.25rem;
  color: ${props => props.theme.text};
  line-height: 1.6;
  
  li {
    margin-bottom: 0.35rem;
  }
  
  li:last-child {
    margin-bottom: 0;
  }
`;

const DetailedFeedback = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
`;

const DetailTitle = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
  margin-bottom: 0.5rem;
`;

const DetailText = styled.p`
  margin: 0;
  color: ${props => props.theme.text};
  line-height: 1.5;
  font-size: 0.9rem;
`;

// 🆕 Helper para nivel descriptivo
function getNivelDescription(nivel) {
  const n = Number(nivel);
  if (n >= 4) return 'Avanzado';
  if (n >= 3) return 'Competente';
  if (n >= 2) return 'En desarrollo';
  return 'Inicial';
}

export default function EssayFeedbackPanel({ theme, evaluation }) {
  if (!evaluation) return null;

  const score = Number(evaluation.score) || 0;
  const nivel = Number(evaluation.nivel) || 0;
  const isSaved = evaluation?.__source === 'saved';

  const hasFortalezas = Array.isArray(evaluation.fortalezas) && evaluation.fortalezas.length > 0;
  const hasDebilidades = Array.isArray(evaluation.debilidades) && evaluation.debilidades.length > 0;
  const hasRecomendaciones = Array.isArray(evaluation.recomendaciones) && evaluation.recomendaciones.length > 0;
  const hasDeepseekFeedback = evaluation.evaluators?.deepseek?.feedback_contenido || 
                              evaluation.evaluators?.deepseek?.feedback_estructura;

  return (
    <Box theme={theme} role="region" aria-label="Feedback del Ensayo Integrador">
      <Header>
        <Title theme={theme}>
          🧾 Resultado de Evaluación
          {isSaved && <SavedBadge theme={theme}>guardado</SavedBadge>}
        </Title>
        
        <ScoreCard theme={theme} $score={score}>
          <ScoreValue theme={theme} $score={score}>{score.toFixed(1)}</ScoreValue>
          <ScoreLabel theme={theme}>de 10 puntos</ScoreLabel>
          <NivelBadge theme={theme}>
            Nivel {nivel}: {getNivelDescription(nivel)}
          </NivelBadge>
        </ScoreCard>
      </Header>

      {(evaluation.attemptsUsed != null || evaluation.gradedAt || evaluation.submittedAt) && (
        <MetaRow theme={theme}>
          {evaluation.attemptsUsed != null && (
            <MetaItem>🎯 Intentos: {evaluation.attemptsUsed}</MetaItem>
          )}
          {evaluation.submittedAt && (
            <MetaItem>📤 Enviado: {new Date(evaluation.submittedAt).toLocaleString()}</MetaItem>
          )}
          {evaluation.gradedAt && (
            <MetaItem>✅ Calificado: {new Date(evaluation.gradedAt).toLocaleString()}</MetaItem>
          )}
        </MetaRow>
      )}

      {hasFortalezas && (
        <FeedbackSection theme={theme} $variant="strengths">
          <SectionTitle theme={theme}>
            <SectionIcon>💪</SectionIcon>
            Fortalezas identificadas
          </SectionTitle>
          <FeedbackList theme={theme}>
            {evaluation.fortalezas.map((f, idx) => <li key={`f-${idx}`}>{f}</li>)}
          </FeedbackList>
        </FeedbackSection>
      )}

      {hasDebilidades && (
        <FeedbackSection theme={theme} $variant="weaknesses">
          <SectionTitle theme={theme}>
            <SectionIcon>🔧</SectionIcon>
            Oportunidades de mejora
          </SectionTitle>
          <FeedbackList theme={theme}>
            {evaluation.debilidades.map((d, idx) => <li key={`d-${idx}`}>{d}</li>)}
          </FeedbackList>
        </FeedbackSection>
      )}

      {hasRecomendaciones && (
        <FeedbackSection theme={theme} $variant="recommendations">
          <SectionTitle theme={theme}>
            <SectionIcon>💡</SectionIcon>
            Recomendaciones para el futuro
          </SectionTitle>
          <FeedbackList theme={theme}>
            {evaluation.recomendaciones.map((r, idx) => <li key={`r-${idx}`}>{r}</li>)}
          </FeedbackList>
        </FeedbackSection>
      )}

      {hasDeepseekFeedback && (
        <DetailedFeedback theme={theme}>
          {evaluation.evaluators?.deepseek?.feedback_contenido && (
            <>
              <DetailTitle theme={theme}>📝 Análisis de contenido</DetailTitle>
              <DetailText theme={theme}>{evaluation.evaluators.deepseek.feedback_contenido}</DetailText>
            </>
          )}
          {evaluation.evaluators?.deepseek?.feedback_estructura && (
            <>
              <DetailTitle theme={theme} style={{ marginTop: '0.75rem' }}>🏗️ Análisis de estructura</DetailTitle>
              <DetailText theme={theme}>{evaluation.evaluators.deepseek.feedback_estructura}</DetailText>
            </>
          )}
        </DetailedFeedback>
      )}
    </Box>
  );
}
