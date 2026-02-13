/**
 * Componente de Checkpoint Rápido
 * Gate ligero: MCQ reflexivo → desbloquea dimensiones
 * ARQUITECTURA V2: Solo MCQ como activación cognitiva previa
 */

import React, { useState, useContext, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import MCQExercise from './MCQExercise';

import logger from '../../utils/logger';
// ==============================================================================
// STYLED COMPONENTS
// ==============================================================================

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h2`
  font-size: 28px;
  margin-bottom: 8px;
  color: ${p => p.theme.textPrimary};
`;

const EmptyDescription = styled.p`
  font-size: 16px;
  color: ${p => p.theme.textSecondary};
  max-width: 500px;
  line-height: 1.6;
`;

const InfoBanner = styled(motion.div)`
  background: ${p => p.theme.surface};
  border: 2px solid ${p => p.theme.primary};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const InfoIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${p => p.theme.textPrimary};
`;

const InfoText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${p => p.theme.textSecondary};
  line-height: 1.5;
`;

const CompletionCard = styled(motion.div)`
  background: linear-gradient(135deg, #10b98115, #3b82f615);
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin: 2rem 0;
`;

const CompletionIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const CompletionTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${p => p.theme.textPrimary};
`;

const CompletionText = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  color: ${p => p.theme.textSecondary};
  line-height: 1.6;
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
`;

const ResultCard = styled.div`
  background: ${p => p.theme.cardBg || '#ffffff'};
  border: 1px solid ${p => p.theme.border || '#e0e0e0'};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const ResultLabel = styled.div`
  font-size: 0.85rem;
  color: ${p => p.theme.textMuted || '#666'};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ResultValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${p => p.$success ? '#10b981' : p.theme.textPrimary};
`;

// ==============================================================================
// COMPONENTE PRINCIPAL
// ==============================================================================

const PreguntasPersonalizadas = ({ theme }) => {
  const {
    texto,
    completeAnalysis,
    activitiesProgress,
    markPreparationProgress,
    currentTextoId
  } = useContext(AppContext);

  // Obtener datos del análisis
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const mcqQuestions = completeAnalysis?.critical?.mcqQuestions || [];

  // 🆕 Memoizar progreso del documento para evitar re-renders
  const docProgress = useMemo(() =>
    activitiesProgress?.[lectureId]?.preparation || {},
    [activitiesProgress, lectureId]
  );

  const [mcqCompleted, setMcqCompleted] = useState(false);
  const [mcqResults, setMcqResults] = useState(null);

  // 🔄 Sincronizar estado local con contexto cuando cambia documentId o activitiesProgress
  useEffect(() => {
    if (lectureId && docProgress) {
      logger.log('🔄 [Checkpoint] Sincronizando con contexto:', docProgress);
      setMcqCompleted(docProgress.mcqPassed || docProgress.completed || false);
      setMcqResults(docProgress.mcqResults || null);

      if (docProgress.completed) {
        logger.log('✅ [Checkpoint] Preparación COMPLETADA restaurada desde contexto');
      }
    } else {
      setMcqCompleted(false);
      setMcqResults(null);
      logger.log('🆕 [Checkpoint] Nuevo checkpoint inicializado');
    }
  }, [lectureId, docProgress]);

  // Handler: MCQ aprobado → preparación completada directamente
  const handleMCQComplete = useCallback((results) => {
    logger.log('✅ [Checkpoint] MCQ completado:', results);
    setMcqResults(results);
    setMcqCompleted(results.passed);

    if (results.passed && lectureId && markPreparationProgress) {
      // 💾 MCQ aprobado = preparación completada (sin paso de síntesis)
      markPreparationProgress(lectureId, {
        completed: true,
        mcqPassed: true,
        mcqResults: results
      });
      logger.log('💾 [Checkpoint] Preparación completada tras MCQ aprobado');

      // Disparar evento para desbloquear dimensiones
      window.dispatchEvent(new CustomEvent('exercises-completed', {
        detail: { mcqResults: results }
      }));
    }
  }, [lectureId, markPreparationProgress]);

  // Verificaciones de estado
  if (!texto) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>📚</EmptyIcon>
          <EmptyTitle theme={theme}>No hay texto cargado</EmptyTitle>
          <EmptyDescription theme={theme}>
            Para comenzar la preparación, primero necesitas cargar un texto.
            <br /><br />
            <strong>Ve a la pestaña "Lectura Guiada"</strong> y carga un texto para comenzar.
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  if (!completeAnalysis || !completeAnalysis.critical) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>⏳</EmptyIcon>
          <EmptyTitle theme={theme}>Análisis en proceso...</EmptyTitle>
          <EmptyDescription theme={theme}>
            El análisis del texto está en curso. La preparación se habilitará automáticamente cuando termine.
            <br /><br />
            <strong>Tiempo estimado:</strong> 30-60 segundos
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  if (mcqQuestions.length === 0) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>⚠️</EmptyIcon>
          <EmptyTitle theme={theme}>No se generaron preguntas de checkpoint</EmptyTitle>
          <EmptyDescription theme={theme}>
            El análisis se completó pero no se generaron las preguntas de activación.
            <br /><br />
            <strong>Esto puede suceder si:</strong>
            <br />• El texto es muy corto
            <br />• Hubo un error en la generación
            <br /><br />
            <strong>Solución:</strong> Recarga el texto para forzar un nuevo análisis.
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  // Si el checkpoint ya fue completado, mostrar resumen
  if (mcqCompleted) {
    const mcqScore = mcqResults ? `${mcqResults.correct}/${mcqResults.total}` : 'N/A';
    const mcqPercentage = mcqResults ? Math.round((mcqResults.correct / mcqResults.total) * 100) : 0;

    return (
      <Container>
        <CompletionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={theme}
        >
          <CompletionIcon>✅</CompletionIcon>
          <CompletionTitle theme={theme}>
            ¡Checkpoint Completado!
          </CompletionTitle>
          <CompletionText theme={theme}>
            Has activado tu comprensión del texto. Las 5 dimensiones de literacidad crítica
            están desbloqueadas. Explora cada una a tu ritmo.
          </CompletionText>

          <ResultsGrid>
            <ResultCard theme={theme}>
              <ResultLabel theme={theme}>Reflexión Inicial</ResultLabel>
              <ResultValue $success={mcqPercentage >= 70} theme={theme}>
                {mcqScore}
              </ResultValue>
              <div style={{ fontSize: '0.85rem', color: mcqPercentage >= 70 ? '#10b981' : '#f59e0b', marginTop: '0.5rem' }}>
                {mcqPercentage}% ✅ Aprobado
              </div>
            </ResultCard>
          </ResultsGrid>

          <CompletionText theme={theme} style={{ marginTop: '1.5rem', fontSize: '0.95rem' }}>
            💡 <strong>Siguiente paso:</strong> Elige una dimensión para comenzar.
            Puedes practicar con preguntas reflexivas opcionales (+puntos extra) o ir directo a crear tu artefacto.
          </CompletionText>
        </CompletionCard>
      </Container>
    );
  }

  // Contenido: MCQ como checkpoint rápido de activación cognitiva
  return (
    <Container>
      <InfoBanner
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        theme={theme}
      >
        <InfoIcon>🧠</InfoIcon>
        <InfoContent>
          <InfoTitle theme={theme}>Checkpoint de Activación</InfoTitle>
          <InfoText theme={theme}>
            Responde estas preguntas reflexivas para activar tu comprensión del texto.
            Al aprobar, se desbloquean las 5 dimensiones de literacidad crítica.
            <strong> ~3 minutos</strong>
          </InfoText>
        </InfoContent>
      </InfoBanner>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <MCQExercise
          questions={mcqQuestions}
          onComplete={handleMCQComplete}
          initialResults={mcqResults}
          theme={theme}
        />
      </motion.div>
    </Container>
  );
};

export default React.memo(PreguntasPersonalizadas);
