/**
 * SessionCard - Tarjeta mejorada de sesión con detalles expandibles
 * Incluye: badges, progreso por rúbrica, estadísticas, acciones
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const SessionCard = ({ session, theme, onRestore, onDelete, onExport }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Sin fecha';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = () => {
    const progress = session.rubricProgress || {};
    const rubrics = Object.keys(progress).filter(k => k.startsWith('rubrica'));
    
    if (rubrics.length === 0) return 0;
    
    const totalProgress = rubrics.reduce((sum, key) => {
      return sum + (progress[key]?.average || 0);
    }, 0);
    
    return Math.round((totalProgress / rubrics.length) * 10);
  };

  const getRubricStats = () => {
    const progress = session.rubricProgress || {};
    const rubrics = [
      { id: 'rubrica1', name: 'Comprensión', color: '#3B82F6' },
      { id: 'rubrica2', name: 'ACD', color: '#8B5CF6' },
      { id: 'rubrica3', name: 'Contextualización', color: '#10B981' },
      { id: 'rubrica4', name: 'Argumentación', color: '#F59E0B' },
      { id: 'rubrica5', name: 'Metacognición', color: '#EF4444' }
    ];

    return rubrics.map(rubric => ({
      ...rubric,
      average: progress[rubric.id]?.average || 0,
      scores: progress[rubric.id]?.scores || [],
      hasData: progress[rubric.id]?.scores?.length > 0
    }));
  };

  const getPreview = () => {
    if (session.text?.content) {
      const preview = session.text.content.substring(0, 120);
      return preview.length < session.text.content.length ? preview + '...' : preview;
    }
    return 'Sin texto disponible';
  };

  const progressPercentage = getProgressPercentage();
  const rubricStats = getRubricStats();
  const completedRubrics = rubricStats.filter(r => r.hasData).length;

  return (
    <CardContainer
      theme={theme}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      onClick={(e) => {
        // Si el click fue en un botón de acción, no restaurar
        if (e.target.closest('button')) return;
        onRestore(session);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Header con título y badges */}
      <CardHeader theme={theme}>
        <HeaderLeft>
          <SessionTitle theme={theme}>{session.title}</SessionTitle>
          <BadgeContainer>
            {/* Badge de sincronización */}
            <SyncBadge
              theme={theme}
              $source={session.source}
              title={
                session.source === 'firestore' ? 'Solo en la nube' :
                session.source === 'local' ? 'Solo en este dispositivo' :
                session.syncStatus === 'synced' ? 'Sincronizado' :
                'En ambos lugares'
              }
            >
              {session.source === 'firestore' ? '☁️' :
               session.source === 'local' ? '📱' :
               session.syncStatus === 'synced' ? '✓' : '⟳'}
            </SyncBadge>

            {/* Badge de análisis completo */}
            {session.hasCompleteAnalysis && (
              <StatusBadge theme={theme} $type="success">
                ✅ Análisis
              </StatusBadge>
            )}

            {/* Badge de progreso */}
            {completedRubrics > 0 && (
              <StatusBadge theme={theme} $type="info">
                {completedRubrics}/5 rúbricas
              </StatusBadge>
            )}
          </BadgeContainer>
        </HeaderLeft>

        <ExpandButton 
          $expanded={isExpanded}
          onClick={(e) => {
            e.stopPropagation(); // Evitar que dispare el restore
            setIsExpanded(!isExpanded);
          }}
        >
          ▼
        </ExpandButton>
      </CardHeader>

      {/* Metadatos básicos */}
      <CardMeta theme={theme}>
        <MetaItem theme={theme}>
          <MetaIcon>📅</MetaIcon>
          {formatDate(session.lastModified || session.createdAt)}
        </MetaItem>
        <MetaItem theme={theme}>
          <MetaIcon>📄</MetaIcon>
          {session.textMetadata?.words || session.text?.metadata?.words || 0} palabras
        </MetaItem>
        {progressPercentage > 0 && (
          <MetaItem theme={theme}>
            <MetaIcon>🎯</MetaIcon>
            Progreso: {progressPercentage}%
          </MetaItem>
        )}
      </CardMeta>

      {/* Barra de progreso general */}
      {progressPercentage > 0 && (
        <ProgressBarContainer theme={theme}>
          <ProgressBarFill
            theme={theme}
            $percentage={progressPercentage}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </ProgressBarContainer>
      )}

      {/* Preview del texto */}
      <TextPreview theme={theme}>{getPreview()}</TextPreview>

      {/* Detalles expandibles */}
      <AnimatePresence>
        {isExpanded && (
          <ExpandedContent
            theme={theme}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Progreso por rúbrica */}
            <RubricProgressSection theme={theme}>
              <SectionTitle theme={theme}>📊 Progreso por Rúbrica</SectionTitle>
              <RubricsList>
                {rubricStats.map(rubric => (
                  <RubricItem key={rubric.id} theme={theme}>
                    <RubricHeader>
                      <RubricName theme={theme}>{rubric.name}</RubricName>
                      {rubric.hasData ? (
                        <RubricScore theme={theme} $color={rubric.color}>
                          {rubric.average.toFixed(1)}/10
                        </RubricScore>
                      ) : (
                        <RubricScore theme={theme} $empty>
                          Sin datos
                        </RubricScore>
                      )}
                    </RubricHeader>
                    {rubric.hasData && (
                      <RubricBar theme={theme}>
                        <RubricBarFill
                          $color={rubric.color}
                          $percentage={(rubric.average / 10) * 100}
                        />
                      </RubricBar>
                    )}
                    {rubric.scores.length > 0 && (
                      <RubricMeta theme={theme}>
                        {rubric.scores.length} evaluación{rubric.scores.length > 1 ? 'es' : ''}
                      </RubricMeta>
                    )}
                  </RubricItem>
                ))}
              </RubricsList>
            </RubricProgressSection>

            {/* Artefactos creados */}
            {session.artifactsDrafts && Object.keys(session.artifactsDrafts).some(k => {
              const draft = session.artifactsDrafts[k];
              return draft && (draft.draft || Object.keys(draft).length > 0);
            }) && (
              <ArtifactsSection theme={theme}>
                <SectionTitle theme={theme}>📝 Artefactos Creados</SectionTitle>
                <ArtifactsList>
                  {session.artifactsDrafts.resumenAcademico?.draft && (
                    <ArtifactBadge theme={theme}>📋 Resumen Académico</ArtifactBadge>
                  )}
                  {session.artifactsDrafts.tablaACD?.marcoIdeologico && (
                    <ArtifactBadge theme={theme}>🔍 Tabla ACD</ArtifactBadge>
                  )}
                  {session.artifactsDrafts.mapaActores?.actores && (
                    <ArtifactBadge theme={theme}>🗺️ Mapa de Actores</ArtifactBadge>
                  )}
                  {session.artifactsDrafts.respuestaArgumentativa?.tesis && (
                    <ArtifactBadge theme={theme}>💬 Respuesta Argumentativa</ArtifactBadge>
                  )}
                </ArtifactsList>
              </ArtifactsSection>
            )}

            {/* Citas guardadas */}
            {session.savedCitations && Object.keys(session.savedCitations).length > 0 && (
              <CitationsSection theme={theme}>
                <SectionTitle theme={theme}>📌 Citas Guardadas</SectionTitle>
                <CitationCount theme={theme}>
                  {Object.keys(session.savedCitations).length} cita{Object.keys(session.savedCitations).length > 1 ? 's' : ''}
                </CitationCount>
              </CitationsSection>
            )}
          </ExpandedContent>
        )}
      </AnimatePresence>

      {/* Acciones */}
      <CardActions theme={theme}>
        {onExport && (
          <ActionButton
            theme={theme}
            onClick={(e) => {
              e.stopPropagation();
              onExport(session);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📥 Exportar
          </ActionButton>
        )}

        <ActionButton
          theme={theme}
          $danger
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🗑️
        </ActionButton>
      </CardActions>
    </CardContainer>
  );
};

// Styled Components

const CardContainer = styled(motion.div)`
  background: ${props => props.theme.surface || '#FFFFFF'};
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${props => props.theme.primary || '#3190FC'};
    box-shadow: 0 4px 12px ${props => props.theme.primary || '#3190FC'}20;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
  gap: 1rem;
`;

const HeaderLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const SessionTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  line-height: 1.3;
`;

const BadgeContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const SyncBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.7rem;
  background: ${props => {
    if (props.$source === 'firestore') return props.theme.info || '#3B82F6';
    if (props.$source === 'local') return props.theme.warning || '#F59E0B';
    return props.theme.success || '#10B981';
  }};
  color: white;
  flex-shrink: 0;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    if (props.$type === 'success') return props.theme.success || '#10B981';
    if (props.$type === 'info') return props.theme.info || '#3B82F6';
    return props.theme.textMuted || '#6B7280';
  }};
  color: white;
`;

const ExpandButton = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s;
`;

const CardMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: ${props => props.theme.textMuted};
`;

const MetaIcon = styled.span`
  font-size: 1rem;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background: ${props => props.theme.border || '#E4EAF1'};
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.75rem;
`;

const ProgressBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #10B981);
  border-radius: 3px;
  width: ${props => props.$percentage}%;
`;

const TextPreview = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
  font-style: italic;
  line-height: 1.5;
  padding: 0.75rem;
  background: ${props => props.theme.background || '#F6F8FA'};
  border-radius: 8px;
  margin-bottom: 0.75rem;
`;

const ExpandedContent = styled(motion.div)`
  overflow: hidden;
  border-top: 1px solid ${props => props.theme.border};
  padding-top: 1rem;
  margin-top: 1rem;
`;

const RubricProgressSection = styled.div`
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const RubricsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const RubricItem = styled.div`
  padding: 0.75rem;
  background: ${props => props.theme.background || '#F6F8FA'};
  border-radius: 8px;
`;

const RubricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const RubricName = styled.span`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${props => props.theme.text};
`;

const RubricScore = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.$empty ? props.theme.textMuted : props.$color};
`;

const RubricBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${props => props.theme.border};
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.35rem;
`;

const RubricBarFill = styled.div`
  height: 100%;
  width: ${props => props.$percentage}%;
  background: ${props => props.$color};
  border-radius: 2px;
  transition: width 0.5s ease;
`;

const RubricMeta = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const ArtifactsSection = styled.div`
  margin-bottom: 1rem;
`;

const ArtifactsList = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ArtifactBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.65rem;
  background: ${props => props.theme.primary || '#3190FC'}20;
  color: ${props => props.theme.primary || '#3190FC'};
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const CitationsSection = styled.div`
  margin-bottom: 1rem;
`;

const CitationCount = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const ActionButton = styled(motion.button)`
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.$primary && `
    background: ${props.theme.primary || '#3190FC'};
    color: white;

    &:hover {
      background: ${props.theme.primary || '#3190FC'}dd;
    }
  `}

  ${props => props.$danger && `
    background: ${props.theme.danger || '#EF4444'}20;
    color: ${props.theme.danger || '#EF4444'};

    &:hover {
      background: ${props.theme.danger || '#EF4444'}30;
    }
  `}

  ${props => !props.$primary && !props.$danger && `
    background: ${props.theme.surface || '#FFFFFF'};
    color: ${props.theme.text};
    border: 1px solid ${props.theme.border || '#E4EAF1'};

    &:hover {
      background: ${props.theme.background || '#F6F8FA'};
    }
  `}
`;

export default SessionCard;
