/**
 * Componente Bitácora Ética del Uso de IA
 * RÚBRICA 5: Metacognición Ética del Uso de IA
 * 
 * Tres dimensiones evaluadas:
 * 1. Registro y Transparencia: ¿Documenta el uso de IA?
 * 2. Evaluación Crítica: ¿Contrasta la información con otras fuentes?
 * 3. Agencia y Responsabilidad: ¿Asume autoría y uso ético?
 */

import React, { useState, useEffect, useCallback, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import { usePedagogy } from '../context/PedagogyContext';
import { evaluateBitacoraEticaIA } from '../services/bitacoraEticaIA.service';
import useActivityPersistence from '../hooks/useActivityPersistence';
import { renderMarkdown } from '../utils/markdownUtils';
import EvaluationProgressBar from './ui/EvaluationProgressBar';

const BitacoraEticaIA = () => {
  const { modoOscuro, completeAnalysis, setError, updateRubricScore } = useContext(AppContext);
  const { progression } = usePedagogy();

  // Estado local para reflexiones
  const [verificacionFuentes, setVerificacionFuentes] = useState('');
  const [procesoUsoIA, setProcesoUsoIA] = useState('');
  const [reflexionEtica, setReflexionEtica] = useState('');
  const [declaraciones, setDeclaraciones] = useState({
    respuestasPropias: false,
    verificacionRealizada: false,
    usoTransparente: false,
    contrasteMultifuente: false
  });

  // Estados para evaluación criterial
  const [feedbackCriterial, setFeedbackCriterial] = useState(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación

  // Cargar interacciones del tutor desde localStorage
  const [tutorInteractions, setTutorInteractions] = useState([]);

  useEffect(() => {
    // Cargar log de interacciones del tutor
    const loadTutorLog = () => {
      try {
        const log = JSON.parse(localStorage.getItem('tutorInteractionsLog') || '[]');
        setTutorInteractions(log);
      } catch (error) {
        console.error('Error cargando log del tutor:', error);
        setTutorInteractions([]);
      }
    };

    loadTutorLog();

    // Cargar reflexiones guardadas
    const savedReflections = JSON.parse(localStorage.getItem('ethicalReflections') || '{}');
    if (savedReflections.verificacionFuentes) setVerificacionFuentes(savedReflections.verificacionFuentes);
    if (savedReflections.procesoUsoIA) setProcesoUsoIA(savedReflections.procesoUsoIA);
    if (savedReflections.reflexionEtica) setReflexionEtica(savedReflections.reflexionEtica);
    if (savedReflections.declaraciones) setDeclaraciones(savedReflections.declaraciones);

    // Escuchar evento de nueva interacción del tutor
    const handleNewInteraction = (event) => {
      console.log('🎯 [BitacoraEticaIA] Evento recibido:', event.detail);
      const interaction = event.detail;
      setTutorInteractions(prev => {
        const updated = [...prev, interaction];
        console.log('📝 [BitacoraEticaIA] Guardando en localStorage:', updated);
        localStorage.setItem('tutorInteractionsLog', JSON.stringify(updated));
        return updated;
      });
    };

    console.log('👂 [BitacoraEticaIA] Registrando listener para tutor-interaction-logged');
    window.addEventListener('tutor-interaction-logged', handleNewInteraction);

    return () => {
      console.log('🔌 [BitacoraEticaIA] Removiendo listener');
      window.removeEventListener('tutor-interaction-logged', handleNewInteraction);
    };
  }, []);

  // Persistencia robusta
  const documentId = completeAnalysis?.metadata?.document_id || 'global';
  const persistenceKey = `bitacora_etica_ia_${documentId}`;

  useActivityPersistence(persistenceKey, {
    enabled: true,
    studentAnswers: {
      verificacionFuentes,
      procesoUsoIA,
      reflexionEtica,
      declaraciones
    },
    aiFeedbacks: { bitacora: feedbackCriterial },
    onRehydrate: (data) => {
      if (data.student_answers?.verificacionFuentes) setVerificacionFuentes(data.student_answers.verificacionFuentes);
      if (data.student_answers?.procesoUsoIA) setProcesoUsoIA(data.student_answers.procesoUsoIA);
      if (data.student_answers?.reflexionEtica) setReflexionEtica(data.student_answers.reflexionEtica);
      if (data.student_answers?.declaraciones) setDeclaraciones(data.student_answers.declaraciones);
      if (data.ai_feedbacks?.bitacora) setFeedbackCriterial(data.ai_feedbacks.bitacora);
    }
  });

  // Guardar reflexiones en localStorage legacy (compatibilidad)
  useEffect(() => {
    const reflections = {
      verificacionFuentes,
      procesoUsoIA,
      reflexionEtica,
      declaraciones
    };
    localStorage.setItem('ethicalReflections', JSON.stringify(reflections));
  }, [verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones]);

  const handleCheckboxChange = (key) => {
    setDeclaraciones(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const clearTutorLog = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres borrar todo el historial de interacciones con el tutor IA?')) {
      localStorage.removeItem('tutorInteractionsLog');
      setTutorInteractions([]);
    }
  }, []);

  const exportBitacora = useCallback(() => {
    const bitacoraData = {
      timestamp: new Date().toISOString(),
      interaccionesTutor: tutorInteractions,
      reflexiones: {
        verificacionFuentes,
        procesoUsoIA,
        reflexionEtica
      },
      declaraciones,
      evaluacion: evaluarRubrica5()
    };

    const blob = new Blob([JSON.stringify(bitacoraData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora-etica-ia-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones]);

  // Evaluación de la Rúbrica 5
  const evaluarRubrica5 = useCallback(() => {
    let scoreRegistro = 0;
    let scoreEvaluacionCritica = 0;
    let scoreAgencia = 0;

    // Dimensión 1: Registro y Transparencia (0-10)
    if (tutorInteractions.length > 0) scoreRegistro += 3;
    if (tutorInteractions.length >= 5) scoreRegistro += 2;
    if (procesoUsoIA.length > 100) scoreRegistro += 3;
    if (procesoUsoIA.length > 300) scoreRegistro += 2;

    // Dimensión 2: Evaluación Crítica (0-10)
    if (verificacionFuentes.length > 100) scoreEvaluacionCritica += 3;
    if (verificacionFuentes.length > 300) scoreEvaluacionCritica += 2;
    if (declaraciones.contrasteMultifuente) scoreEvaluacionCritica += 3;
    if (verificacionFuentes.includes('fuente') || verificacionFuentes.includes('verificar')) scoreEvaluacionCritica += 2;

    // Dimensión 3: Agencia y Responsabilidad (0-10)
    const declaracionesCompletadas = Object.values(declaraciones).filter(Boolean).length;
    scoreAgencia = declaracionesCompletadas * 2.5;
    if (reflexionEtica.length > 100) scoreAgencia = Math.min(10, scoreAgencia + 2);

    return {
      dimensiones: {
        registro: Math.min(10, scoreRegistro),
        evaluacionCritica: Math.min(10, scoreEvaluacionCritica),
        agencia: Math.min(10, scoreAgencia)
      },
      promedio: ((Math.min(10, scoreRegistro) + Math.min(10, scoreEvaluacionCritica) + Math.min(10, scoreAgencia)) / 3).toFixed(1)
    };
  }, [tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones]);

  const evaluacion = evaluarRubrica5();

  // Validación para evaluación criterial
  const isValidForEvaluation = (
    verificacionFuentes.length >= 50 &&
    procesoUsoIA.length >= 50 &&
    reflexionEtica.length >= 50 &&
    Object.values(declaraciones).filter(Boolean).length >= 2
  );

  // Evaluación criterial dual
  const handleEvaluateCriterial = useCallback(async () => {
    if (!isValidForEvaluation) return;

    setLoadingEvaluation(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando evaluación ética...', icon: '🔍', duration: 2 });

    // 🆕 Programar pasos de evaluación
    const timeouts = [
      setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando transparencia...', icon: '📝', duration: 5 }), 1000),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 3500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 12 }), 15500),
      setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 4 }), 27500)
    ];

    try {
      const result = await evaluateBitacoraEticaIA({
        tutorInteractions,
        verificacionFuentes,
        procesoUsoIA,
        reflexionEtica,
        declaraciones
      });

      // Limpiar timeouts
      timeouts.forEach(clearTimeout);

      setFeedbackCriterial(result);
      
      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica5', {
        score: result.nivel_global * 2.5, // Convertir nivel 1-4 a escala 2.5-10
        nivel: result.nivel_global,
        artefacto: 'BitacoraEticaIA',
        criterios: result.criterios
      });
      
    } catch (error) {
      console.error('Error evaluando Bitácora Ética de IA:', error);
      setError(error.message || 'Error al evaluar la bitácora');
      // Limpiar timeouts en caso de error
      timeouts.forEach(clearTimeout);
    } finally {
      setLoadingEvaluation(false);
      setCurrentEvaluationStep(null);
    }
  }, [isValidForEvaluation, tutorInteractions, verificacionFuentes, procesoUsoIA, reflexionEtica, declaraciones, setError, updateRubricScore]);

  const theme = {
    background: modoOscuro ? '#1a1a1a' : '#f8f9fa',
    cardBg: modoOscuro ? '#2a2a2a' : '#ffffff',
    surface: modoOscuro ? '#333' : '#f5f5f5',
    border: modoOscuro ? '#444' : '#e0e0e0',
    textPrimary: modoOscuro ? '#fff' : '#333',
    textSecondary: modoOscuro ? '#aaa' : '#666',
    textMuted: modoOscuro ? '#888' : '#999',
    primary: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    purple: '#9C27B0'
  };

  return (
    <Container theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <span>🤖</span>
          Bitácora Ética del Uso de IA
        </HeaderTitle>
        <HeaderDescription theme={theme}>
          Rúbrica 5: Metacognición sobre el uso responsable y ético de herramientas de inteligencia artificial en tu proceso de aprendizaje.
        </HeaderDescription>
      </Header>

      {/* Resumen de Evaluación */}
      <EvaluacionSummary theme={theme}>
        <SummaryTitle theme={theme}>📊 Tu Evaluación Actual - Rúbrica 5</SummaryTitle>
        <DimensionesGrid>
          <DimensionCard theme={theme} $color={theme.primary}>
            <DimensionIcon>📝</DimensionIcon>
            <DimensionName>Registro y Transparencia</DimensionName>
            <DimensionScore>{evaluacion.dimensiones.registro}/10</DimensionScore>
            <DimensionDesc>¿Documentas el uso de IA?</DimensionDesc>
          </DimensionCard>

          <DimensionCard theme={theme} $color={theme.warning}>
            <DimensionIcon>🔍</DimensionIcon>
            <DimensionName>Evaluación Crítica</DimensionName>
            <DimensionScore>{evaluacion.dimensiones.evaluacionCritica}/10</DimensionScore>
            <DimensionDesc>¿Contrastas con otras fuentes?</DimensionDesc>
          </DimensionCard>

          <DimensionCard theme={theme} $color={theme.success}>
            <DimensionIcon>✍️</DimensionIcon>
            <DimensionName>Agencia y Responsabilidad</DimensionName>
            <DimensionScore>{evaluacion.dimensiones.agencia}/10</DimensionScore>
            <DimensionDesc>¿Asumes autoría clara?</DimensionDesc>
          </DimensionCard>
        </DimensionesGrid>

        <PromedioFinal theme={theme}>
          <span>Promedio Rúbrica 5:</span>
          <PromedioValue $score={parseFloat(evaluacion.promedio)}>
            {evaluacion.promedio}/10
          </PromedioValue>
        </PromedioFinal>
      </EvaluacionSummary>

      {/* Sección 1: Registro de Interacciones con el Tutor */}
      <Section theme={theme}>
        <SectionHeader>
          <SectionTitle theme={theme}>
            <span>🤖</span>
            1. Registro de Interacciones con el Tutor IA
          </SectionTitle>
          <ActionButtons>
            <SmallButton onClick={clearTutorLog} theme={theme} $variant="danger">
              🗑️ Limpiar Historial
            </SmallButton>
          </ActionButtons>
        </SectionHeader>

        <SectionDescription theme={theme}>
          Este es el registro automático de todas tus consultas al tutor IA durante la lectura.
          La transparencia en el uso de IA es fundamental para un aprendizaje ético.
        </SectionDescription>

        {tutorInteractions.length === 0 ? (
          <EmptyState theme={theme}>
            <EmptyIcon>📭</EmptyIcon>
            <EmptyText>No hay interacciones registradas todavía</EmptyText>
            <EmptyHint>Usa el tutor IA en la pestaña "Lectura Guiada" para que se registren aquí automáticamente</EmptyHint>
          </EmptyState>
        ) : (
          <InteractionsList>
            {tutorInteractions.slice().reverse().map((interaction, index) => (
              <InteractionCard
                key={index}
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                theme={theme}
              >
                <InteractionHeader>
                  <Timestamp theme={theme}>
                    🕒 {new Date(interaction.timestamp).toLocaleString('es-ES')}
                  </Timestamp>
                  {interaction.bloomLevel && (
                    <BloomBadge theme={theme}>
                      Bloom: {interaction.bloomLevel}
                    </BloomBadge>
                  )}
                </InteractionHeader>

                <QuestionLabel theme={theme}>Pregunta al tutor:</QuestionLabel>
                <QuestionText theme={theme}>{interaction.question}</QuestionText>

                {interaction.context && (
                  <>
                    <ContextLabel theme={theme}>Contexto:</ContextLabel>
                    <ContextText theme={theme}>{interaction.context}</ContextText>
                  </>
                )}

                {interaction.tutorMode && (
                  <ModeTag theme={theme}>{interaction.tutorMode}</ModeTag>
                )}
              </InteractionCard>
            ))}
          </InteractionsList>
        )}

        <StatsBar theme={theme}>
          <StatItem>
            <StatLabel>Total de consultas:</StatLabel>
            <StatValue>{tutorInteractions.length}</StatValue>
          </StatItem>
        </StatsBar>
      </Section>

      {/* Sección 2: Reflexión Metacognitiva */}
      <Section theme={theme}>
        <SectionTitle theme={theme}>
          <span>🧠</span>
          2. Reflexión Metacognitiva sobre el Uso de IA
        </SectionTitle>

        <SectionDescription theme={theme}>
          Reflexiona críticamente sobre cómo has usado la inteligencia artificial en tu proceso de aprendizaje.
        </SectionDescription>

        <ReflectionQuestion theme={theme}>
          <QuestionIcon>🔍</QuestionIcon>
          <QuestionTitle>¿Qué información de la IA verificaste en otras fuentes?</QuestionTitle>
          <QuestionHint>
            Describe qué fuentes consultaste (libros, artículos académicos, expertos) y qué información contrastaste.
          </QuestionHint>
          <ReflectionTextarea
            value={verificacionFuentes}
            onChange={(e) => setVerificacionFuentes(e.target.value)}
            placeholder="Ej: Verifiqué la definición de 'hegemonía' consultando el diccionario de la RAE y comparándola con la definición que me dio la IA. También contraté el contexto histórico mencionado con mi libro de texto..."
            rows={5}
            theme={theme}
          />
          <CharCount theme={theme}>
            {verificacionFuentes.length} caracteres
          </CharCount>
        </ReflectionQuestion>

        <ReflectionQuestion theme={theme}>
          <QuestionIcon>🤔</QuestionIcon>
          <QuestionTitle>¿Cómo usaste la IA? (guía vs. respuestas directas)</QuestionTitle>
          <QuestionHint>
            Explica si usaste la IA como guía para explorar conceptos o si buscaste respuestas directas. ¿Procesaste la información críticamente?
          </QuestionHint>
          <ReflectionTextarea
            value={procesoUsoIA}
            onChange={(e) => setProcesoUsoIA(e.target.value)}
            placeholder="Ej: Usé el tutor principalmente para aclarar conceptos complejos como 'análisis crítico del discurso'. No copié las respuestas directamente, sino que las usé como punto de partida para mi propia investigación..."
            rows={5}
            theme={theme}
          />
          <CharCount theme={theme}>
            {procesoUsoIA.length} caracteres
          </CharCount>
        </ReflectionQuestion>

        <ReflectionQuestion theme={theme}>
          <QuestionIcon>💭</QuestionIcon>
          <QuestionTitle>Reflexión ética: ¿Qué aprendiste sobre el uso responsable de IA?</QuestionTitle>
          <QuestionHint>
            ¿Qué desafíos éticos identificaste? ¿Cómo garantizaste que tu aprendizaje sea auténtico y no dependiente de la IA?
          </QuestionHint>
          <ReflectionTextarea
            value={reflexionEtica}
            onChange={(e) => setReflexionEtica(e.target.value)}
            placeholder="Ej: Aprendí que es importante no confiar ciegamente en la IA. Debo ser crítico y verificar la información. También me di cuenta de que la IA puede ayudarme a explorar ideas, pero el pensamiento crítico final debe ser mío..."
            rows={5}
            theme={theme}
          />
          <CharCount theme={theme}>
            {reflexionEtica.length} caracteres
          </CharCount>
        </ReflectionQuestion>
      </Section>

      {/* Sección 3: Declaración de Autoría */}
      <Section theme={theme}>
        <SectionTitle theme={theme}>
          <span>✍️</span>
          3. Declaración de Autoría y Uso Ético
        </SectionTitle>

        <SectionDescription theme={theme}>
          Declara de manera transparente cómo has usado la IA y asume responsabilidad sobre tu trabajo.
        </SectionDescription>

        <DeclaracionesContainer>
          <DeclaracionItem
            onClick={() => handleCheckboxChange('respuestasPropias')}
            theme={theme}
            $checked={declaraciones.respuestasPropias}
          >
            <Checkbox $checked={declaraciones.respuestasPropias}>
              {declaraciones.respuestasPropias && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>Confirmo que las respuestas reflejan mi comprensión personal</strong>
              <DeclaracionDesc>
                He procesado la información de la IA y generado mis propias conclusiones.
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>

          <DeclaracionItem
            onClick={() => handleCheckboxChange('verificacionRealizada')}
            theme={theme}
            $checked={declaraciones.verificacionRealizada}
          >
            <Checkbox $checked={declaraciones.verificacionRealizada}>
              {declaraciones.verificacionRealizada && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>He verificado la información de la IA con otras fuentes</strong>
              <DeclaracionDesc>
                No he aceptado la información de la IA sin contrastarla.
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>

          <DeclaracionItem
            onClick={() => handleCheckboxChange('usoTransparente')}
            theme={theme}
            $checked={declaraciones.usoTransparente}
          >
            <Checkbox $checked={declaraciones.usoTransparente}>
              {declaraciones.usoTransparente && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>Declaro transparentemente el uso de asistencia IA</strong>
              <DeclaracionDesc>
                He registrado y documentado cómo he usado la IA en mi proceso de aprendizaje.
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>

          <DeclaracionItem
            onClick={() => handleCheckboxChange('contrasteMultifuente')}
            theme={theme}
            $checked={declaraciones.contrasteMultifuente}
          >
            <Checkbox $checked={declaraciones.contrasteMultifuente}>
              {declaraciones.contrasteMultifuente && '✓'}
            </Checkbox>
            <DeclaracionLabel>
              <strong>He contrastado con múltiples fuentes (académicas, primarias)</strong>
              <DeclaracionDesc>
                No me he limitado a una sola fuente de información (incluida la IA).
              </DeclaracionDesc>
            </DeclaracionLabel>
          </DeclaracionItem>
        </DeclaracionesContainer>

        <DeclaracionesProgress theme={theme}>
          <ProgressLabel>Declaraciones completadas:</ProgressLabel>
          <ProgressBar>
            <ProgressFill
              $percentage={(Object.values(declaraciones).filter(Boolean).length / 4) * 100}
              theme={theme}
            />
          </ProgressBar>
          <ProgressText>
            {Object.values(declaraciones).filter(Boolean).length} de 4
          </ProgressText>
        </DeclaracionesProgress>
      </Section>

      {/* Botón de Evaluación Criterial */}
      {!feedbackCriterial && (
        <EvaluationButtonSection>
          <EvaluationValidation theme={theme} $valid={isValidForEvaluation}>
            {isValidForEvaluation
              ? '✅ Bitácora completa. Solicita evaluación criterial con IA dual.'
              : '⚠️ Completa al menos 50 caracteres en cada reflexión y 2 declaraciones para evaluar.'}
          </EvaluationValidation>
          <EvaluationButton
            onClick={handleEvaluateCriterial}
            disabled={!isValidForEvaluation || loadingEvaluation}
            theme={theme}
          >
            {loadingEvaluation ? '⏳ Evaluando con IA Dual...' : '🤖 Solicitar Evaluación Criterial'}
          </EvaluationButton>
        </EvaluationButtonSection>
      )}

      {/* Barra de progreso de evaluación */}
      {loadingEvaluation && (
        <EvaluationProgressBar
          theme={theme}
          isEvaluating={loadingEvaluation}
          currentStep={currentEvaluationStep}
        />
      )}

      {/* Feedback Criterial */}
      <AnimatePresence>
        {feedbackCriterial && !loadingEvaluation && (
          <FeedbackCriterialSection
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            theme={theme}
          >
            <FeedbackHeader theme={theme}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.textPrimary }}>
                  📊 Evaluación Criterial (IA Dual)
                </h3>
                <NivelGlobalBadge $nivel={feedbackCriterial.nivel_global} theme={theme}>
                  Nivel {feedbackCriterial.nivel_global}/4
                </NivelGlobalBadge>
              </div>
            </FeedbackHeader>

            <FeedbackDimension theme={theme}>
              <strong>{feedbackCriterial.dimension_label}:</strong> {feedbackCriterial.dimension_description}
            </FeedbackDimension>

            <CriteriosGrid>
              {/* Criterio 1 */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Registro y Transparencia</CriterioTitle>
                  <CriterioNivel $nivel={feedbackCriterial.criterios.registro_transparencia.nivel} theme={theme}>
                    Nivel {feedbackCriterial.criterios.registro_transparencia.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedbackCriterial.criterios.registro_transparencia.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedbackCriterial.criterios.registro_transparencia.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme}>✓ {renderMarkdown(f)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedbackCriterial.criterios.registro_transparencia.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades:</ListTitle>
                    <List>
                      {feedbackCriterial.criterios.registro_transparencia.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme}>→ {renderMarkdown(m)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Criterio 2 */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Evaluación Crítica de la Herramienta</CriterioTitle>
                  <CriterioNivel $nivel={feedbackCriterial.criterios.evaluacion_critica_herramienta.nivel} theme={theme}>
                    Nivel {feedbackCriterial.criterios.evaluacion_critica_herramienta.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedbackCriterial.criterios.evaluacion_critica_herramienta.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedbackCriterial.criterios.evaluacion_critica_herramienta.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme}>✓ {renderMarkdown(f)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedbackCriterial.criterios.evaluacion_critica_herramienta.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades:</ListTitle>
                    <List>
                      {feedbackCriterial.criterios.evaluacion_critica_herramienta.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme}>→ {renderMarkdown(m)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>

              {/* Criterio 3 */}
              <CriterioCard theme={theme}>
                <CriterioHeader>
                  <CriterioTitle theme={theme}>Agencia y Responsabilidad</CriterioTitle>
                  <CriterioNivel $nivel={feedbackCriterial.criterios.agencia_responsabilidad.nivel} theme={theme}>
                    Nivel {feedbackCriterial.criterios.agencia_responsabilidad.nivel}/4
                  </CriterioNivel>
                </CriterioHeader>

                {feedbackCriterial.criterios.agencia_responsabilidad.fortalezas?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>✅ Fortalezas:</ListTitle>
                    <List>
                      {feedbackCriterial.criterios.agencia_responsabilidad.fortalezas.map((f, idx) => (
                        <ListItem key={idx} theme={theme}>✓ {renderMarkdown(f)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}

                {feedbackCriterial.criterios.agencia_responsabilidad.mejoras?.length > 0 && (
                  <ListSection>
                    <ListTitle theme={theme}>💡 Oportunidades:</ListTitle>
                    <List>
                      {feedbackCriterial.criterios.agencia_responsabilidad.mejoras.map((m, idx) => (
                        <ListItem key={idx} theme={theme}>→ {renderMarkdown(m)}</ListItem>
                      ))}
                    </List>
                  </ListSection>
                )}
              </CriterioCard>
            </CriteriosGrid>

            <FeedbackFooter>
              <SecondaryButton onClick={() => setFeedbackCriterial(null)} theme={theme}>
                🔄 Revisar y Mejorar Reflexiones
              </SecondaryButton>
            </FeedbackFooter>
          </FeedbackCriterialSection>
        )}
      </AnimatePresence>

      {/* Botón de Exportación */}
      <ExportSection>
        <ExportButton onClick={exportBitacora} theme={theme}>
          📥 Exportar Bitácora Completa (JSON)
        </ExportButton>
        <ExportHint theme={theme}>
          Descarga un registro completo de tu uso ético de IA para incluir en tu portafolio de aprendizaje.
        </ExportHint>
      </ExportSection>
    </Container>
  );
};

export default BitacoraEticaIA;

// ============================================================
// STYLED COMPONENTS
// ============================================================

const Container = styled.div`
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  background: ${props => props.theme.background};
  min-height: calc(100vh - 120px);
`;

const Header = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 3px solid ${props => props.theme.purple};
`;

const HeaderTitle = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const HeaderDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.textSecondary};
  font-size: 1rem;
  line-height: 1.6;
`;

const EvaluacionSummary = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.purple}15, ${props => props.theme.primary}15);
  border: 2px solid ${props => props.theme.purple}40;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SummaryTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textPrimary};
  font-size: 1.25rem;
  font-weight: 700;
`;

const DimensionesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DimensionCard = styled.div`
  background: ${props => props.theme.cardBg};
  border: 2px solid ${props => props.$color}40;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px ${props => props.$color}30;
  }
`;

const DimensionIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const DimensionName = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary};
  margin-bottom: 0.5rem;
`;

const DimensionScore = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-bottom: 0.25rem;
`;

const DimensionDesc = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textSecondary};
  font-style: italic;
`;

const PromedioFinal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${props => props.theme.cardBg};
  border-radius: 8px;
  font-weight: 600;
  color: ${props => props.theme.textPrimary};
`;

const PromedioValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => {
    const score = props.$score;
    if (score >= 8.6) return '#4CAF50';
    if (score >= 5.6) return '#2196F3';
    if (score >= 2.6) return '#FF9800';
    return '#F44336';
  }};
`;

const Section = styled.section`
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: ${props => props.theme.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionDescription = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textSecondary};
  line-height: 1.6;
  font-size: 0.95rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const SmallButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.$variant === 'danger' ? props.theme.danger : props.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.$variant === 'danger' ? props.theme.danger : props.theme.primary}40;
  }
`;

const InteractionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
  margin-bottom: 1rem;
`;

const InteractionCard = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const InteractionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Timestamp = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  font-weight: 500;
`;

const BloomBadge = styled.span`
  padding: 0.25rem 0.6rem;
  background: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const QuestionLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${props => props.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const QuestionText = styled.div`
  color: ${props => props.theme.textPrimary};
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

const ContextLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${props => props.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const ContextText = styled.div`
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.4;
  font-style: italic;
`;

const ModeTag = styled.span`
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.6rem;
  background: ${props => props.theme.success}20;
  color: ${props => props.theme.success};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background: ${props => props.theme.surface};
  border-radius: 8px;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatLabel = styled.span`
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
`;

const StatValue = styled.span`
  color: ${props => props.theme.primary};
  font-weight: 700;
  font-size: 1.1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme.textSecondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.textPrimary};
`;

const EmptyHint = styled.div`
  font-size: 0.9rem;
  font-style: italic;
`;

const ReflectionQuestion = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${props => props.theme.surface};
  border-radius: 10px;
  border-left: 4px solid ${props => props.theme.primary};
`;

const QuestionIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.75rem;
`;

const QuestionTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.textPrimary};
  font-size: 1.1rem;
  font-weight: 600;
`;

const QuestionHint = styled.p`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;
  font-style: italic;
`;

const ReflectionTextarea = styled.textarea`
  width: 100%;
  padding: 1rem;
  border: 2px solid ${props => props.theme.border};
  border-radius: 8px;
  background: ${props => props.theme.background};
  color: ${props => props.theme.textPrimary};
  font-size: 0.95rem;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.primary}20;
  }
  
  &::placeholder {
    color: ${props => props.theme.textMuted};
    font-style: italic;
  }
`;

const CharCount = styled.div`
  margin-top: 0.5rem;
  text-align: right;
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const DeclaracionesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DeclaracionItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.$checked ? props.theme.success + '10' : props.theme.surface};
  border: 2px solid ${props => props.$checked ? props.theme.success : props.theme.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$checked ? props.theme.success + '15' : props.theme.primary + '05'};
    border-color: ${props => props.$checked ? props.theme.success : props.theme.primary};
  }
`;

const Checkbox = styled.div`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border: 2px solid ${props => props.$checked ? props.theme.success : props.theme.border};
  border-radius: 6px;
  background: ${props => props.$checked ? props.theme.success : 'transparent'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.2s ease;
`;

const DeclaracionLabel = styled.div`
  flex: 1;
`;

const DeclaracionDesc = styled.div`
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: ${props => props.theme.textSecondary};
  line-height: 1.4;
`;

const DeclaracionesProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.theme.surface};
  border-radius: 8px;
`;

const ProgressLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary};
  white-space: nowrap;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 12px;
  background: ${props => props.theme.border};
  border-radius: 6px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percentage}%;
  background: linear-gradient(90deg, ${props => props.theme.success}, ${props => props.theme.primary});
  transition: width 0.5s ease;
`;

const ProgressText = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
  white-space: nowrap;
`;

const ExportSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  border: 2px dashed ${props => props.theme.border};
`;

const ExportButton = styled.button`
  padding: 1rem 2rem;
  background: ${props => props.theme.purple};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px ${props => props.theme.purple}40;
  
  &:hover {
    background: ${props => props.theme.purple}dd;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${props => props.theme.purple}50;
  }
`;

const ExportHint = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${props => props.theme.textSecondary};
  text-align: center;
  font-style: italic;
`;

// Nuevos styled components para evaluación criterial
const EvaluationButtonSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const EvaluationValidation = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: ${props => props.$valid ? '#dcfce7' : '#fee2e2'};
  border: 1px solid ${props => props.$valid ? '#86efac' : '#fca5a5'};
  color: ${props => props.$valid ? '#166534' : '#991b1b'};
  font-size: 0.9rem;
  text-align: center;
  width: 100%;
  max-width: 600px;
`;

const EvaluationButton = styled.button`
  padding: 1rem 2rem;
  background: ${props => props.theme.purple};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px ${props => props.theme.purple}40;
  
  &:hover:not(:disabled) {
    background: ${props => props.theme.purple}dd;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${props => props.theme.purple}50;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FeedbackCriterialSection = styled.div`
  background: ${props => props.theme.cardBg};
  border: 2px solid ${props => props.theme.purple};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px ${props => props.theme.purple}20;
`;

const FeedbackHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const NivelGlobalBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${props => {
    switch(props.$nivel) {
      case 1: return '#fee2e2';
      case 2: return '#fed7aa';
      case 3: return '#dcfce7';
      case 4: return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch(props.$nivel) {
      case 1: return '#991b1b';
      case 2: return '#c2410c';
      case 3: return '#166534';
      case 4: return '#6b21a8';
      default: return '#374151';
    }
  }};
  font-weight: 700;
  font-size: 1rem;
`;

const FeedbackDimension = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const CriteriosGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const CriterioCard = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
`;

const CriterioHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const CriterioTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.textPrimary};
  font-size: 0.95rem;
`;

const CriterioNivel = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch(props.$nivel) {
      case 1: return '#fee2e2';
      case 2: return '#fed7aa';
      case 3: return '#dcfce7';
      case 4: return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch(props.$nivel) {
      case 1: return '#991b1b';
      case 2: return '#c2410c';
      case 3: return '#166534';
      case 4: return '#6b21a8';
      default: return '#374151';
    }
  }};
`;

const ListSection = styled.div`
  margin-top: 0.75rem;
`;

const ListTitle = styled.p`
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.textPrimary};
  font-weight: 600;
  font-size: 0.85rem;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ListItem = styled.li`
  color: ${props => props.theme.textSecondary};
  font-size: 0.85rem;
  line-height: 1.4;
`;

const FeedbackFooter = styled.div`
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.surface};
  color: ${props => props.theme.textPrimary};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.border};
  }
`;
