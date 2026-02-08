/**
 * TeacherScoreOverrideBanner.js
 * 📝 Banner que muestra al estudiante cuando el docente ha modificado su nota.
 * Se muestra dentro de cada artefacto si existe teacherOverrideScore en la data de Firestore.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const TeacherScoreOverrideBanner = ({ cloudData, theme }) => {
  if (!cloudData?.teacherOverrideScore && cloudData?.teacherOverrideScore !== 0) return null;

  const overrideScore = cloudData.teacherOverrideScore;
  const reason = cloudData.scoreOverrideReason || '';
  const docenteNombre = cloudData.docenteNombre || 'Tu docente';
  const overriddenAt = cloudData.scoreOverriddenAt;

  // Formatear fecha
  let dateStr = '';
  if (overriddenAt) {
    try {
      const d = typeof overriddenAt === 'string' ? new Date(overriddenAt) :
                overriddenAt?.seconds ? new Date(overriddenAt.seconds * 1000) : null;
      if (d && !isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch { /* silencioso */ }
  }

  return (
    <Banner
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      theme={theme}
    >
      <BannerIcon>📝</BannerIcon>
      <BannerContent>
        <BannerTitle theme={theme}>
          {docenteNombre} ha ajustado tu nota a <ScoreHighlight theme={theme}>{overrideScore}/10</ScoreHighlight>
        </BannerTitle>
        {reason && (
          <BannerReason theme={theme}>
            Motivo: "{reason}"
          </BannerReason>
        )}
        {dateStr && (
          <BannerDate theme={theme}>{dateStr}</BannerDate>
        )}
      </BannerContent>
    </Banner>
  );
};

export default TeacherScoreOverrideBanner;

// Styled Components
const Banner = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  margin: 0.5rem 0;
  background: ${props => `${props.theme.primary || '#3190FC'}0D`};
  border: 1px solid ${props => `${props.theme.primary || '#3190FC'}30`};
  border-left: 4px solid ${props => props.theme.primary || '#3190FC'};
  border-radius: 0 12px 12px 0;
`;

const BannerIcon = styled.span`
  font-size: 1.3rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
`;

const BannerContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const BannerTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.text || '#333'};
`;

const ScoreHighlight = styled.strong`
  color: ${props => props.theme.primary || '#3190FC'};
  font-size: 1.05em;
`;

const BannerReason = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.text || '#555'};
  font-style: italic;
  padding: 0.35rem 0.5rem;
  background: ${props => props.theme.surfaceHover || 'rgba(0,0,0,0.03)'};
  border-radius: 6px;
  margin-top: 0.15rem;
`;

const BannerDate = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted || '#888'};
  margin-top: 0.1rem;
`;
