/**
 * Componente de Ejercicios Guiados (Rediseñado)
 * Sistema de 3 capas: MCQ → Síntesis → Unlock Artefactos
 * ARQUITECTURA SIMPLIFICADA: Sin selector de dimensiones
 */

import React, { useState, useContext, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import MCQExercise from './MCQExercise';
import SynthesisQuestions from './SynthesisQuestions';

import logger from '../../utils/logger';
// ==============================================================================
// STYLED COMPONENTS
// ==============================================================================

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid ${p => p.theme.border};
  padding-bottom: 0.5rem;
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${p => p.$active ? p.theme.primary : 'transparent'};
  color: ${p => p.$active ? 'white' : p.theme.textPrimary};
  border: none;
  border-bottom: 3px solid ${p => p.$active ? p.theme.primary : 'transparent'};
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${p => p.$locked ? 0.4 : 1};
  cursor: ${p => p.$locked ? 'not-allowed' : 'pointer'};
  
  &:hover:not(:disabled) {
    background: ${p => p.$active ? p.theme.primary : p.theme.surface};
  }
  
  &:disabled {
    cursor: not-allowed;
  }
`;

const LockBadge = styled.span`
  font-size: 0.9rem;
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

  // Estado local
  const [activeTab, setActiveTab] = useState('mcq');

  // Obtener datos del análisis primero
  const documentId = completeAnalysis?.metadata?.document_id || null;
  const lectureId = currentTextoId || documentId || null;
  const mcqQuestions = completeAnalysis?.critical?.mcqQuestions || [];
  const synthesisQuestions = completeAnalysis?.critical?.synthesisQuestions || [];

  // 🆕 Memoizar progreso del documento para evitar re-renders
  const docProgress = useMemo(() =>
    activitiesProgress?.[lectureId]?.preparation || {},
    [activitiesProgress, lectureId]
  );

  const [mcqCompleted, setMcqCompleted] = useState(false);
  const [mcqResults, setMcqResults] = useState(null);
  const [synthesisCompleted, setSynthesisCompleted] = useState(false);
  const [synthesisAnswers, setSynthesisAnswers] = useState(null);

  // 🔄 Sincronizar estado local con contexto cuando cambia documentId o activitiesProgress
  useEffect(() => {
    if (lectureId && docProgress) {
      logger.log('🔄 [PreguntasPersonalizadas] Sincronizando con contexto:', docProgress);
      setMcqCompleted(docProgress.mcqPassed || false);
      setMcqResults(docProgress.mcqResults || null);
      setSynthesisCompleted(docProgress.completed || false);
      setSynthesisAnswers(docProgress.synthesisAnswers || null);

      if (docProgress.completed) {
        logger.log('✅ [PreguntasPersonalizadas] Preparación COMPLETADA restaurada desde contexto');
      } else if (docProgress.mcqPassed) {
        logger.log('✅ [PreguntasPersonalizadas] MCQ completado, activando síntesis');
        setActiveTab('synthesis');
      }
    } else {
      // Resetear si no hay documento
      setMcqCompleted(false);
      setMcqResults(null);
      setSynthesisCompleted(false);
      setSynthesisAnswers(null);
      setActiveTab('mcq');
      logger.log('🆕 [PreguntasPersonalizadas] Nueva preparación inicializada');
    }
  }, [lectureId, docProgress]);

  // Handlers
  const handleMCQComplete = useCallback((results) => {
    logger.log('✅ [EjerciciosGuiados] MCQ completado:', results);
    setMcqResults(results);
    setMcqCompleted(results.passed);

    // 💾 Guardar resultados MCQ en context
    if (lectureId && markPreparationProgress) {
      markPreparationProgress(lectureId, {
        mcqPassed: results.passed,
        mcqResults: results
      });
      logger.log('💾 [PreguntasPersonalizadas] Resultados MCQ guardados en contexto');
    }

    if (results.passed) {
      setActiveTab('synthesis');
    }
  }, [lectureId, markPreparationProgress]);

  const handleSynthesisComplete = useCallback((answers) => {
    logger.log('✅ [EjerciciosGuiados] Síntesis completada, desbloqueando artefactos...');
    setSynthesisAnswers(answers);
    setSynthesisCompleted(true);

    // 💾 Guardar preparación completada en context
    if (lectureId && markPreparationProgress) {
      markPreparationProgress(lectureId, {
        completed: true,
        mcqPassed: mcqResults?.passed || false,
        mcqResults,
        synthesisAnswers: answers
      });
      logger.log('💾 [PreguntasPersonalizadas] Preparación y respuestas guardadas en contexto');
    }

    // Disparar evento para desbloquear artefactos
    window.dispatchEvent(new CustomEvent('exercises-completed', {
      detail: { mcqResults, synthesisAnswers: answers }
    }));
  }, [lectureId, markPreparationProgress, mcqResults]);

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

  if (mcqQuestions.length === 0 || synthesisQuestions.length === 0) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>⚠️</EmptyIcon>
          <EmptyTitle theme={theme}>No se generaron preguntas de preparación</EmptyTitle>
          <EmptyDescription theme={theme}>
            El análisis se completó pero no se generaron las preguntas de preparación.
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

  // 🆕 Si la preparación ya fue completada, mostrar resumen bloqueado
  if (synthesisCompleted) {
    const mcqScore = mcqResults ? `${mcqResults.correct}/${mcqResults.total}` : 'N/A';
    const mcqPercentage = mcqResults ? Math.round((mcqResults.correct / mcqResults.total) * 100) : 0;

    return (
      <Container>
        <CompletionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={theme}
        >
          <CompletionIcon>🎓</CompletionIcon>
          <CompletionTitle theme={theme}>
            ¡Preparación Completada Exitosamente!
          </CompletionTitle>
          <CompletionText theme={theme}>
            Has demostrado comprensión del texto y completado las reflexiones de síntesis.
            Los 5 artefactos académicos ya están desbloqueados para que puedas crear y recibir evaluación formativa.
          </CompletionText>

          <ResultsGrid>
            <ResultCard theme={theme}>
              <ResultLabel theme={theme}>Autoevaluación MCQ</ResultLabel>
              <ResultValue $success={mcqPercentage >= 70} theme={theme}>
                {mcqScore}
              </ResultValue>
              <div style={{ fontSize: '0.85rem', color: mcqPercentage >= 70 ? '#10b981' : '#f59e0b', marginTop: '0.5rem' }}>
                {mcqPercentage}% {mcqPercentage >= 70 ? '✅ Aprobado' : '⚠️ Aprobado'}
              </div>
            </ResultCard>

            <ResultCard theme={theme}>
              <ResultLabel theme={theme}>Preguntas de Síntesis</ResultLabel>
              <ResultValue $success theme={theme}>
                2/2
              </ResultValue>
              <div style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.5rem' }}>
                ✅ Completadas
              </div>
            </ResultCard>
          </ResultsGrid>

          <CompletionText theme={theme} style={{ marginTop: '1.5rem', fontSize: '0.95rem' }}>
            💡 <strong>Siguiente paso:</strong> Ve a las pestañas de artefactos (Resumen Académico, Análisis del Discurso, etc.)
            para crear tus trabajos y recibir evaluación criterial con feedback dual de IA.
          </CompletionText>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#3b82f615', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.9rem', color: theme.textSecondary }}>
              🔒 <strong>Nota:</strong> La preparación es un checkpoint único.
              Una vez completada, no necesitas volver a hacerla.
              Enfócate ahora en crear y mejorar tus artefactos académicos.
            </div>
          </div>
        </CompletionCard>
      </Container>
    );
  }

  // Contenido normal si no ha completado la preparación
  return (
    <Container>
      {/* Banner informativo */}
      {!synthesisCompleted && (
        <InfoBanner
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          theme={theme}
        >
          <InfoIcon>💡</InfoIcon>
          <InfoContent>
            <InfoTitle theme={theme}>Preparación Obligatoria</InfoTitle>
            <InfoText theme={theme}>
              Completa esta preparación para desbloquear los artefactos académicos formales.
              <strong> Paso 1:</strong> Autoevaluación rápida (5 MCQ) ·
              <strong> Paso 2:</strong> Preguntas de síntesis (2 reflexiones) ·
              <strong> Resultado:</strong> Acceso a los 5 artefactos evaluados
            </InfoText>
          </InfoContent>
        </InfoBanner>
      )}

      {/* Tabs de navegación */}
      <TabsContainer theme={theme}>
        <Tab
          $active={activeTab === 'mcq'}
          onClick={() => setActiveTab('mcq')}
          theme={theme}
        >
          📋 Autoevaluación Rápida
          {mcqCompleted && ' ✅'}
        </Tab>

        <Tab
          $active={activeTab === 'synthesis'}
          $locked={!mcqCompleted}
          onClick={() => mcqCompleted && setActiveTab('synthesis')}
          disabled={!mcqCompleted}
          theme={theme}
        >
          💭 Preguntas de Síntesis
          {!mcqCompleted && <LockBadge>🔒</LockBadge>}
          {synthesisCompleted && ' ✅'}
        </Tab>
      </TabsContainer>

      {/* Contenido de las tabs */}
      <AnimatePresence mode="wait">
        {activeTab === 'mcq' && (
          <motion.div
            key="mcq"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <MCQExercise
              questions={mcqQuestions}
              onComplete={handleMCQComplete}
              initialResults={mcqResults}
              theme={theme}
            />
          </motion.div>
        )}

        {activeTab === 'synthesis' && mcqCompleted && (
          <motion.div
            key="synthesis"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <SynthesisQuestions
              questions={synthesisQuestions}
              onComplete={handleSynthesisComplete}
              initialAnswers={synthesisAnswers}
              theme={theme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensaje de finalización */}
      {synthesisCompleted && (
        <InfoBanner
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          theme={theme}
          style={{ marginTop: '2rem', borderColor: '#10b981', background: '#10b98110' }}
        >
          <InfoIcon>🎉</InfoIcon>
          <InfoContent>
            <InfoTitle theme={theme}>✅ ¡Preparación completada exitosamente!</InfoTitle>
            <InfoText theme={theme}>
              Has demostrado comprensión básica del texto y completado las reflexiones de síntesis.
              Los artefactos académicos ya están desbloqueados.
              <br /><br />
              <strong>Siguiente paso:</strong> Navega a las otras pestañas (Resumen Académico, Análisis del Discurso, Mapa de Actores, etc.) para crear tus producciones formales con evaluación criterial.
            </InfoText>
          </InfoContent>
        </InfoBanner>
      )}
    </Container>
  );
};

export default React.memo(PreguntasPersonalizadas);
