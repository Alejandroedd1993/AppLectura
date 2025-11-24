/**
 * Componente ResumenAcademico
 * Artefacto de Aprendizaje para Rúbrica 1: Comprensión Analítica
 * 
 * Permite al estudiante crear un resumen académico con citas textuales
 * y recibir evaluación criterial dual (DeepSeek + OpenAI)
 */

import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useRewards } from '../../context/PedagogyContext';
import { evaluarResumenAcademico, validarResumenAcademico } from '../../services/resumenAcademico.service';
import useActivityPersistence from '../../hooks/useActivityPersistence';
import useRateLimit from '../../hooks/useRateLimit';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import EvaluationProgressBar from '../ui/EvaluationProgressBar';
import { renderMarkdown, renderMarkdownList } from '../../utils/markdownUtils';

const ResumenAcademico = ({ theme }) => {
  const { texto, completeAnalysis, setError, updateRubricScore, getCitations, deleteCitation } = useContext(AppContext);
  const rewards = useRewards();
  const documentId = completeAnalysis?.metadata?.document_id || null;
  
  // Estados con recuperación de sessionStorage como respaldo
  const [resumen, setResumen] = useState(() => {
    // 🆕 Intentar recuperar desde sessionStorage primero
    const sessionBackup = sessionStorage.getItem('resumenAcademico_draft');
    return sessionBackup || '';
  });
  const [evaluacion, setEvaluacion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState(null); // 🆕 Paso actual de evaluación
  const [showGuide, setShowGuide] = useState(true);
  const [showCitasPanel, setShowCitasPanel] = useState(false); // 🆕 Panel de citas guardadas
  const [pasteError, setPasteError] = useState(null); // 🆕 Error de pegado externo
  const [isLocked, setIsLocked] = useState(false); // 🆕 Estado de bloqueo después de evaluar
  
  // 🆕 Rate limiting: 5s cooldown, máximo 10 evaluaciones/hora
  const rateLimit = useRateLimit('evaluate_resumen', {
    cooldownMs: 5000,
    maxPerHour: 10
  });
  
  // 🆕 Keyboard shortcuts para productividad
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  
  useKeyboardShortcuts({
    'ctrl+s': (e) => {
      console.log('⌨️ Ctrl+S: Guardando borrador manualmente...');
      persistence.saveManual();
      // Mostrar feedback visual
      setShowShortcutsHint(true);
      setTimeout(() => setShowShortcutsHint(false), 2000);
    },
    'ctrl+enter': (e) => {
      console.log('⌨️ Ctrl+Enter: Evaluando resumen...');
      if (!loading && validacion.valid && rateLimit.canProceed) {
        handleEvaluar();
      }
    },
    'escape': (e) => {
      console.log('⌨️ Esc: Cerrando paneles...');
      if (showCitasPanel) {
        setShowCitasPanel(false);
      } else if (pasteError) {
        setPasteError(null);
      }
    }
  }, {
    enabled: true,
    excludeInputs: false // Permitir en textarea
  });
  
  // Persistencia
  const persistence = useActivityPersistence(documentId, {
    enabled: !!documentId,
    studentAnswers: { resumen },
    aiFeedbacks: { evaluacion },
    criterionFeedbacks: {},
    currentIndex: 0,
    onRehydrate: (data) => {
      console.log('📦 [ResumenAcademico] Rehidratando datos...', {
        documentId,
        hasResumen: !!data.student_answers?.resumen,
        hasEvaluacion: !!data.ai_feedbacks?.evaluacion
      });
      
      // ✅ Rehidratación robusta
      if (data.student_answers?.resumen) {
        setResumen(data.student_answers.resumen);
        console.log(`✅ Resumen rehidratado: ${data.student_answers.resumen.substring(0, 50)}...`);
      }
      if (data.ai_feedbacks?.evaluacion) {
        setEvaluacion(data.ai_feedbacks.evaluacion);
        console.log('✅ Evaluación rehidratada');
      }
    }
  });
  
  // 🆕 Guardar respaldo en sessionStorage al cambiar resumen
  useEffect(() => {
    if (resumen) {
      sessionStorage.setItem('resumenAcademico_draft', resumen);
      console.log('💾 Respaldo guardado en sessionStorage');
    }
  }, [resumen]);

  // 🆕 Escuchar restauración de sesión para actualizar el estado desde sessionStorage
  useEffect(() => {
    const handleSessionRestored = () => {
      const restoredDraft = sessionStorage.getItem('resumenAcademico_draft');
      if (restoredDraft && restoredDraft !== resumen) {
        console.log('🔄 [ResumenAcademico] Restaurando borrador desde sesión...');
        setResumen(restoredDraft);
      }
    };
    
    window.addEventListener('session-restored', handleSessionRestored);
    return () => window.removeEventListener('session-restored', handleSessionRestored);
  }, [resumen]);
  
  // Validación en tiempo real
  const validacion = useMemo(() => {
    if (!resumen || !texto) return { valid: false, errors: [], citasEncontradas: 0 };
    return validarResumenAcademico(resumen, texto);
  }, [resumen, texto]);
  
  // Contador de palabras
  const palabras = useMemo(() => {
    return resumen.trim().split(/\s+/).filter(Boolean).length;
  }, [resumen]);
  
  // Handler de evaluación
  const handleEvaluar = useCallback(async () => {
    if (!validacion.valid) {
      setError(validacion.errors.join('\n'));
      return;
    }
    
    // ✅ Verificar rate limit antes de proceder
    const rateLimitResult = rateLimit.attemptOperation();
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.reason === 'cooldown') {
        setError(`⏱️ Por favor espera ${rateLimitResult.waitSeconds} segundos antes de evaluar nuevamente.`);
      } else if (rateLimitResult.reason === 'hourly_limit') {
        setError(`🚦 Has alcanzado el límite de 10 evaluaciones por hora. Intenta más tarde.`);
      }
      return;
    }
    
    setLoading(true);
    setError(null);
    setCurrentEvaluationStep({ label: 'Iniciando evaluación...', icon: '🚀', duration: 2 });
    
    try {
      console.log('📝 [ResumenAcademico] Solicitando evaluación dual...');
      
      // Simular pasos para feedback visual
      const stepTimeouts = [
        setTimeout(() => setCurrentEvaluationStep({ label: 'Analizando estructura...', icon: '📊', duration: 5 }), 1000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con DeepSeek...', icon: '🤖', duration: 12 }), 3000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Evaluando con OpenAI...', icon: '🧠', duration: 10 }), 15000),
        setTimeout(() => setCurrentEvaluationStep({ label: 'Combinando feedback...', icon: '🔧', duration: 3 }), 25000)
      ];
      
      const result = await evaluarResumenAcademico({
        resumen,
        textoOriginal: texto
      });
      
      // Cancelar timeouts pendientes si la evaluación terminó antes
      stepTimeouts.forEach(timeout => clearTimeout(timeout));
      
      console.log('✅ [ResumenAcademico] Evaluación recibida:', result);
      setEvaluacion(result);
      setIsLocked(true); // 🔒 Bloquear textarea después de evaluar
      
      // 🆕 Actualizar progreso global de rúbrica
      updateRubricScore('rubrica1', {
        score: result.scoreGlobal,
        nivel: result.nivel,
        artefacto: 'ResumenAcademico',
        criterios: result.criteriosEvaluados
      });
      
      // 🎮 REGISTRAR RECOMPENSAS
      if (rewards) {
        // Puntos base por enviar evaluación
        rewards.recordEvent('EVALUATION_SUBMITTED', {
          artefacto: 'ResumenAcademico',
          rubricId: 'rubrica1'
        });
        
        // Puntos según nivel alcanzado
        const nivelEvent = `EVALUATION_LEVEL_${result.nivel}`;
        rewards.recordEvent(nivelEvent, {
          score: result.scoreGlobal,
          nivel: result.nivel,
          artefacto: 'ResumenAcademico'
        });
        
        // Puntos por citas textuales usadas
        const citasCount = (resumen.match(/"/g) || []).length / 2; // Contar pares de comillas
        if (citasCount > 0) {
          rewards.recordEvent('QUOTE_USED', {
            count: Math.floor(citasCount),
            artefacto: 'ResumenAcademico'
          });
        }
        
        // Bonus si el anclaje textual es sólido (3+ citas)
        if (citasCount >= 3) {
          rewards.recordEvent('STRONG_TEXTUAL_ANCHORING', {
            citasCount: Math.floor(citasCount),
            artefacto: 'ResumenAcademico'
          });
        }
        
        // Achievement: Score perfecto
        if (result.scoreGlobal >= 9.5) {
          rewards.recordEvent('PERFECT_SCORE', {
            score: result.scoreGlobal,
            artefacto: 'ResumenAcademico'
          });
        }
        
        console.log('🎮 [ResumenAcademico] Recompensas registradas');
      }
      
      // 🗑️ Limpiar sessionStorage para eliminar advertencia de borrador
      sessionStorage.removeItem('resumenAcademico_draft');
      
      // 📢 Disparar evento para que DraftWarning se actualice inmediatamente
      window.dispatchEvent(new Event('evaluation-complete'));
      
      // Guardar manualmente para asegurar persistencia inmediata
      persistence.saveManual();
      
    } catch (error) {
      console.error('❌ [ResumenAcademico] Error:', error);
      setError(`Error al evaluar: ${error.message}`);
    } finally {
      setLoading(false);
      setCurrentEvaluationStep(null);
    }
  }, [resumen, texto, validacion, setError, persistence, rateLimit, updateRubricScore]);
  
  // 🆕 Función para desbloquear y seguir editando después de recibir feedback
  const handleSeguirEditando = useCallback(() => {
    console.log('✏️ [ResumenAcademico] Desbloqueando para editar...');
    setIsLocked(false);
    setEvaluacion(null); // Ocultar evaluación anterior para enfocarse en editar
  }, []);
  
  // 🆕 Obtener citas guardadas manualmente por el estudiante (sin auto-extraer)
  const citasGuardadas = useMemo(() => {
    if (!documentId) return [];
    return getCitations(documentId);
  }, [documentId, getCitations]);
  
  // 🆕 Insertar cita en el resumen con formato
  const insertarCita = useCallback((textoCita) => {
    const citaFormateada = `"${textoCita}" `;
    setResumen(prev => {
      // Insertar al final con espacio
      return prev + (prev && !prev.endsWith(' ') ? ' ' : '') + citaFormateada;
    });
    setShowCitasPanel(false); // Cerrar panel después de insertar
    console.log('✅ Cita insertada en el resumen');
  }, []);
  
  // 🆕 Eliminar cita guardada
  const handleEliminarCita = useCallback((citaId) => {
    if (documentId) {
      deleteCitation(documentId, citaId);
      console.log(`🗑️ Cita ${citaId} eliminada`);
    }
  }, [documentId, deleteCitation]);
  
  // 🆕 Prevención de pegado externo (anti-plagio)
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if (wordCount <= 40) {
      // Permitir paste de hasta 40 palabras
      document.execCommand('insertText', false, pastedText);
      console.log(`✅ Paste permitido: ${wordCount} palabras`);
    } else {
      const message = `⚠️ Solo puedes pegar hasta 40 palabras (intentaste pegar ${wordCount}). Escribe con tus propias palabras o usa citas guardadas.`;
      setPasteError(message);
      setTimeout(() => setPasteError(null), 5000);
      console.warn('🚫 Intento de pegado bloqueado (excede 40 palabras)');
    }
  }, []);
  
  // Helper para obtener color por nivel
  const getNivelColor = useCallback((nivel) => {
    const colors = {
      1: theme.danger || '#F44336',
      2: theme.warning || '#FF9800',
      3: theme.primary || '#2196F3',
      4: theme.success || '#4CAF50'
    };
    return colors[nivel] || '#757575';
  }, [theme]);
  
  // Helper para obtener label por nivel
  const getNivelLabel = useCallback((nivel) => {
    const labels = {
      1: 'Insuficiente',
      2: 'Básico',
      3: 'Competente',
      4: 'Avanzado'
    };
    return labels[nivel] || 'En desarrollo';
  }, []);
  
  // Si no hay texto cargado
  if (!texto) {
    return (
      <EmptyState>
        <EmptyIcon>📚</EmptyIcon>
        <EmptyTitle theme={theme}>No hay texto cargado</EmptyTitle>
        <EmptyDescription theme={theme}>
          Carga un texto en "Lectura Guiada" y analízalo en "Análisis del Texto" para crear tu resumen académico.
        </EmptyDescription>
      </EmptyState>
    );
  }
  
  return (
    <Container>
      {/* Header */}
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <span>📝</span>
          Resumen Académico con Citas
        </HeaderTitle>
        <HeaderDescription theme={theme}>
          Demuestra tu comprensión analítica resumiendo las ideas centrales del texto con al menos 2 citas textuales.
        </HeaderDescription>
      </Header>
      
      {/* Guía pedagógica colapsable */}
      <AnimatePresence>
        {showGuide && (
          <GuideCard
            as={motion.div}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            theme={theme}
          >
            <GuideHeader>
              <GuideTitle theme={theme}>💡 ¿Cómo escribir un buen resumen académico?</GuideTitle>
              <CloseButton onClick={() => setShowGuide(false)}>✕</CloseButton>
            </GuideHeader>
            <GuideContent theme={theme}>
              <GuideItem>
                <strong>1. Identifica la tesis central:</strong> ¿Cuál es la idea principal que defiende el autor?
              </GuideItem>
              <GuideItem>
                <strong>2. Usa citas textuales:</strong> Selecciona al menos 2 fragmentos representativos entre "comillas".
              </GuideItem>
              <GuideItem>
                <strong>3. Parafrasea con tus palabras:</strong> No copies párrafos enteros, demuestra comprensión.
              </GuideItem>
              <GuideItem>
                <strong>4. Construye inferencias:</strong> ¿Qué sugiere el autor sin decirlo explícitamente?
              </GuideItem>
            </GuideContent>
          </GuideCard>
        )}
      </AnimatePresence>
      
      {/* 🆕 Panel lateral de citas guardadas manualmente */}
      <AnimatePresence>
        {showCitasPanel && (
          <CitasPanel
            as={motion.div}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25 }}
            theme={theme}
          >
            <CitasPanelHeader theme={theme}>
              <h3 style={{ margin: 0 }}>📋 Mis Citas Guardadas</h3>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                {citasGuardadas.length === 0 
                  ? 'Selecciona texto en "Lectura Guiada" y haz clic en "💾 Guardar Cita"'
                  : 'Haz clic en "Insertar" para añadir al resumen'}
              </p>
            </CitasPanelHeader>
            
            <CitasList>
              {citasGuardadas.length === 0 ? (
                <EmptyCitasMessage theme={theme}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
                  <p><strong>¿Cómo guardar citas?</strong></p>
                  <ol style={{ textAlign: 'left', lineHeight: 1.6 }}>
                    <li>Ve a la pestaña "Lectura Guiada"</li>
                    <li>Selecciona el texto importante</li>
                    <li>En el menú contextual, haz clic en "💾 Guardar Cita"</li>
                    <li>Regresa aquí para insertarla en tu resumen</li>
                  </ol>
                </EmptyCitasMessage>
              ) : (
                citasGuardadas.map((cita) => (
                  <CitaItem key={cita.id} theme={theme}>
                    <CitaTexto theme={theme}>{cita.texto}</CitaTexto>
                    {cita.nota && (
                      <CitaNota theme={theme}>📝 {cita.nota}</CitaNota>
                    )}
                    <CitaFooter>
                      <CitaInfo theme={theme}>
                        {new Date(cita.timestamp).toLocaleDateString('es-ES', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CitaInfo>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <InsertarButton
                          onClick={() => insertarCita(cita.texto)}
                          theme={theme}
                        >
                          � Insertar
                        </InsertarButton>
                        <EliminarButton
                          onClick={() => handleEliminarCita(cita.id)}
                          theme={theme}
                          title="Eliminar cita guardada"
                        >
                          🗑️
                        </EliminarButton>
                      </div>
                    </CitaFooter>
                  </CitaItem>
                ))
              )}
            </CitasList>
          </CitasPanel>
        )}
      </AnimatePresence>
      
      {/* Formulario del resumen */}
      <EditorSection>
        <EditorHeader>
          <Label theme={theme}>✏️ Tu resumen</Label>
          <Stats>
            <Stat $valid={palabras >= 50} theme={theme}>
              {palabras} palabras
            </Stat>
            <Stat $valid={validacion.citasEncontradas >= 2} theme={theme}>
              {validacion.citasEncontradas} citas
            </Stat>
          </Stats>
        </EditorHeader>
        
        {/* 🆕 Mensaje de auto-guardado */}
        {resumen.length > 0 && (
          <AutoSaveMessage theme={theme}>
            💾 Tu trabajo se guarda automáticamente. Puedes cambiar de pestaña sin perder tu progreso.
          </AutoSaveMessage>
        )}
        
        {/* 🆕 Hints de atajos de teclado */}
        <AnimatePresence>
          {showShortcutsHint && (
            <ShortcutsHint
              as={motion.div}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              theme={theme}
            >
              ✅ Guardado manual exitoso
            </ShortcutsHint>
          )}
        </AnimatePresence>
        
        <ShortcutsBar theme={theme}>
          <ShortcutItem theme={theme}>
            <kbd>Ctrl</kbd> + <kbd>S</kbd> <span>Guardar</span>
          </ShortcutItem>
          <ShortcutItem theme={theme}>
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> <span>Evaluar</span>
          </ShortcutItem>
          <ShortcutItem theme={theme}>
            <kbd>Esc</kbd> <span>Cerrar</span>
          </ShortcutItem>
        </ShortcutsBar>
        
        <Textarea
          value={resumen}
          onChange={(e) => setResumen(e.target.value)}
          onPaste={handlePaste}
          placeholder='Ejemplo: El autor argumenta que "la literacidad crítica es esencial en la era digital". Esta tesis se sustenta en...'
          rows={12}
          theme={theme}
          disabled={loading || isLocked}
          $isLocked={isLocked}
        />
        
        {/* 🔒 Mensaje cuando está bloqueado después de evaluar */}
        {isLocked && (
          <LockedMessage theme={theme}>
            <LockIcon>🔒</LockIcon>
            <LockText>
              <strong>Resumen enviado a evaluación</strong>
              <span>Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".</span>
            </LockText>
            <UnlockButton onClick={handleSeguirEditando} theme={theme}>
              ✏️ Seguir Editando
            </UnlockButton>
          </LockedMessage>
        )}
        
        {/* 🆕 Mensaje de error cuando se intenta pegar desde fuente externa */}
        {pasteError && (
          <PasteErrorMessage theme={theme}>
            {pasteError}
          </PasteErrorMessage>
        )}
        
        {/* Validación en tiempo real */}
        {resumen.length > 0 && !validacion.valid && (
          <ValidationErrors theme={theme}>
            {validacion.errors.map((error, i) => (
              <ErrorItem key={i}>⚠️ {error}</ErrorItem>
            ))}
          </ValidationErrors>
        )}
        
        {/* Botón de evaluación */}
        <ActionButtons>
          <CitasButton
            onClick={() => setShowCitasPanel(!showCitasPanel)}
            theme={theme}
            $active={showCitasPanel}
            title="Ver mis citas guardadas del texto"
            $hasNotification={citasGuardadas.length > 0}
          >
            {showCitasPanel ? '✕ Cerrar Citas' : `📋 Mis Citas (${citasGuardadas.length})`}
          </CitasButton>
          
          <EvaluateButton
            onClick={handleEvaluar}
            disabled={!validacion.valid || loading || !rateLimit.canProceed}
            theme={theme}
            title={
              !rateLimit.canProceed && rateLimit.nextAvailableIn > 0
                ? `Espera ${rateLimit.nextAvailableIn}s`
                : rateLimit.remaining === 0
                ? 'Límite de evaluaciones alcanzado (10/hora)'
                : `${rateLimit.remaining} evaluaciones restantes esta hora`
            }
          >
            {loading ? '⏳ Evaluando con IA Dual...' : 
             !rateLimit.canProceed && rateLimit.nextAvailableIn > 0 ? `⏱️ Espera ${rateLimit.nextAvailableIn}s` :
             rateLimit.remaining === 0 ? '🚦 Límite alcanzado' :
             '🎓 Solicitar Evaluación Criterial'}
          </EvaluateButton>
        </ActionButtons>
      </EditorSection>
      
      {/* 🆕 Barra de progreso durante evaluación */}
      <AnimatePresence>
        {loading && (
          <EvaluationProgressBar
            isEvaluating={loading}
            estimatedSeconds={30}
            currentStep={currentEvaluationStep}
            theme={theme}
          />
        )}
      </AnimatePresence>
      
      {/* Resultados de la evaluación */}
      <AnimatePresence>
        {evaluacion && (
          <ResultsSection
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            theme={theme}
          >
            <ResultsHeader theme={theme}>
              <ResultsTitle>
                <span>🎓</span>
                Evaluación Criterial de Comprensión Analítica
              </ResultsTitle>
              <NivelGlobalBadge $color={getNivelColor(evaluacion.nivel)}>
                Nivel {evaluacion.nivel}/4: {getNivelLabel(evaluacion.nivel)}
              </NivelGlobalBadge>
            </ResultsHeader>
            
            {/* Resumen de la dimensión */}
            {evaluacion.resumenDimension && (
              <ResumenDimension theme={theme}>
                {renderMarkdown(evaluacion.resumenDimension)}
              </ResumenDimension>
            )}
            
            {/* Criterios evaluados */}
            <CriteriosGrid>
              {evaluacion.criteriosEvaluados?.map((criterio, idx) => (
                <CriterioCard key={idx} theme={theme}>
                  <CriterioHeader>
                    <CriterioTitulo theme={theme}>
                      {criterio.criterio}
                    </CriterioTitulo>
                    <NivelBadge $color={getNivelColor(criterio.nivel)}>
                      Nivel {criterio.nivel}/4
                    </NivelBadge>
                  </CriterioHeader>
                  
                  {/* Evidencias */}
                  {criterio.evidencia && criterio.evidencia.length > 0 && (
                    <EvidenciaSection>
                      <SectionLabel theme={theme}>📌 Evidencia detectada:</SectionLabel>
                      {criterio.evidencia.map((ev, i) => (
                        <EvidenciaItem key={i} theme={theme}>"{ev}"</EvidenciaItem>
                      ))}
                    </EvidenciaSection>
                  )}
                  
                  {/* Fortalezas */}
                  {criterio.fortalezas && criterio.fortalezas.length > 0 && (
                    <FeedbackSection>
                      <SectionLabel $color={theme.success}>✨ Fortalezas:</SectionLabel>
                      <FeedbackList>
                        {criterio.fortalezas.map((f, i) => (
                          <FeedbackItem key={i} theme={theme}>{renderMarkdown(f)}</FeedbackItem>
                        ))}
                      </FeedbackList>
                    </FeedbackSection>
                  )}
                  
                  {/* Mejoras */}
                  {criterio.mejoras && criterio.mejoras.length > 0 && (
                    <FeedbackSection>
                      <SectionLabel $color={theme.warning}>🌱 Áreas de mejora:</SectionLabel>
                      <FeedbackList>
                        {criterio.mejoras.map((m, i) => (
                          <FeedbackItem key={i} theme={theme}>{renderMarkdown(m)}</FeedbackItem>
                        ))}
                      </FeedbackList>
                    </FeedbackSection>
                  )}
                  
                  {/* Fuente de la IA */}
                  <FuenteLabel theme={theme}>
                    Evaluado por: {criterio.fuente}
                  </FuenteLabel>
                </CriterioCard>
              ))}
            </CriteriosGrid>
            
            {/* Siguientes pasos */}
            {evaluacion.siguientesPasos && evaluacion.siguientesPasos.length > 0 && (
              <SiguientesPasosCard theme={theme}>
                <SiguientesPasosTitle theme={theme}>
                  🚀 Siguientes pasos para mejorar
                </SiguientesPasosTitle>
                <SiguientesPasosList>
                  {evaluacion.siguientesPasos.map((paso, i) => (
                    <PasoItem key={i} theme={theme}>
                      {i + 1}. {renderMarkdown(paso)}
                    </PasoItem>
                  ))}
                </SiguientesPasosList>
              </SiguientesPasosCard>
            )}
          </ResultsSection>
        )}
      </AnimatePresence>
    </Container>
  );
};

// ============================================================
// STYLED COMPONENTS
// ============================================================

const Container = styled.div`
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${props => props.theme.primary || '#2196F3'};
`;

const HeaderTitle = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.textPrimary || '#333'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const HeaderDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.textSecondary || '#666'};
  line-height: 1.6;
`;

const GuideCard = styled.div`
  background: ${props => `${props.theme.primary || '#2196F3'}08`};
  border: 1px solid ${props => `${props.theme.primary || '#2196F3'}40`};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const GuideHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const GuideTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: ${props => props.theme.textSecondary || '#666'};
  padding: 0.25rem 0.5rem;
  
  &:hover {
    color: ${props => props.theme.textPrimary || '#333'};
  }
`;

const GuideContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const GuideItem = styled.div`
  color: ${props => props.theme.textPrimary || '#333'};
  line-height: 1.6;
  font-size: 0.95rem;
  
  strong {
    color: ${props => props.theme.primary || '#2196F3'};
  }
`;

const EditorSection = styled.div`
  background: ${props => props.theme.cardBg || '#ffffff'};
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Label = styled.label`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const Stats = styled.div`
  display: flex;
  gap: 1rem;
`;

const Stat = styled.span`
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: ${props => props.$valid ? `${props.theme.success || '#4CAF50'}20` : `${props.theme.warning || '#FF9800'}20`};
  color: ${props => props.$valid ? props.theme.success || '#4CAF50' : props.theme.warning || '#FF9800'};
  font-weight: 600;
  font-size: 0.9rem;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid ${props => props.theme.border || '#e0e0e0'};
  background: ${props => props.$isLocked ? `${props.theme.surface || '#f5f5f5'}` : props.theme.background || '#fff'};
  color: ${props => props.theme.textPrimary || '#333'};
  font-size: 1rem;
  line-height: 1.8;
  font-family: inherit;
  resize: vertical;
  min-height: 200px;
  opacity: ${props => props.$isLocked ? 0.7 : 1};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary || '#2196F3'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${props => props.theme.surface || '#f5f5f5'};
  }
`;

const LockedMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin-top: 1rem;
  background: linear-gradient(135deg, ${props => props.theme.primary}15, ${props => props.theme.info}10);
  border: 2px solid ${props => props.theme.primary}40;
  border-radius: 8px;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const LockIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
`;

const LockText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  strong {
    color: ${props => props.theme.textPrimary};
    font-size: 1rem;
  }
  
  span {
    color: ${props => props.theme.textSecondary};
    font-size: 0.9rem;
  }
`;

const UnlockButton = styled.button`
  padding: 0.6rem 1.2rem;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background: ${props => props.theme.primaryDark || props.theme.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.theme.primary}40;
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ValidationErrors = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${props => `${props.theme.warning || '#FF9800'}15`};
  border-left: 3px solid ${props => props.theme.warning || '#FF9800'};
  border-radius: 6px;
`;

const ErrorItem = styled.div`
  color: ${props => props.theme.textPrimary || '#333'};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

const EvaluateButton = styled.button`
  padding: 0.9rem 1.8rem;
  background: ${props => props.theme.primary || '#2196F3'};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  }
`;

const SecondaryButton = styled.button`
  padding: 0.9rem 1.8rem;
  background: transparent;
  color: ${props => props.theme.primary || '#2196F3'};
  border: 2px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => `${props.theme.primary || '#2196F3'}10`};
    transform: translateY(-2px);
  }
`;

const ResultsSection = styled.div`
  background: ${props => props.theme.cardBg || '#ffffff'};
  border: 2px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 12px;
  padding: 2rem;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ResultsTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${props => props.theme.textPrimary || '#333'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const NivelGlobalBadge = styled.span`
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  background: ${props => props.$color};
  color: white;
  font-weight: 700;
  font-size: 1rem;
`;

const ResumenDimension = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${props => `${props.theme.primary || '#2196F3'}08`};
  border-radius: 8px;
  font-size: 1.05rem;
  line-height: 1.8;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const CriteriosGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const CriterioCard = styled.div`
  background: ${props => props.theme.surface || '#f5f5f5'};
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
`;

const CriterioHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const CriterioTitulo = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const NivelBadge = styled.span`
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: ${props => props.$color};
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
`;

const EvidenciaSection = styled.div`
  margin-bottom: 1rem;
`;

const SectionLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.$color || props.theme.textPrimary || '#333'};
  margin-bottom: 0.5rem;
`;

const EvidenciaItem = styled.div`
  padding: 0.75rem;
  background: ${props => props.theme.background || '#fff'};
  border-left: 3px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 4px;
  font-style: italic;
  color: ${props => props.theme.textSecondary || '#666'};
  margin-top: 0.5rem;
`;

const FeedbackSection = styled.div`
  margin-bottom: 1rem;
`;

const FeedbackList = styled.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
`;

const FeedbackItem = styled.li`
  margin-bottom: 0.5rem;
  line-height: 1.6;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const FuenteLabel = styled.div`
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${props => props.theme.border || '#e0e0e0'};
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary || '#666'};
  font-style: italic;
`;

const SiguientesPasosCard = styled.div`
  background: ${props => `${props.theme.success || '#4CAF50'}10`};
  border: 1px solid ${props => `${props.theme.success || '#4CAF50'}40`};
  border-radius: 8px;
  padding: 1.5rem;
`;

const SiguientesPasosTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const SiguientesPasosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PasoItem = styled.div`
  color: ${props => props.theme.textPrimary || '#333'};
  line-height: 1.6;
  font-size: 0.95rem;
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
  font-size: 1.75rem;
  margin-bottom: 8px;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const EmptyDescription = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.textSecondary || '#666'};
  max-width: 500px;
  line-height: 1.6;
`;

// 🆕 Styled Components para Panel de Citas
const CitasButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.cardBg || '#fff'};
  color: ${props => props.$active ? '#fff' : props.theme.textPrimary};
  border: 2px solid ${props => props.$active ? props.theme.warning || '#f59e0b' : props.theme.border};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex-shrink: 0;
  
  /* Indicador de notificación cuando hay citas guardadas */
  ${props => props.$hasNotification && !props.$active && `
    &:after {
      content: '';
      position: absolute;
      top: -6px;
      right: -6px;
      width: 12px;
      height: 12px;
      background: ${props.theme.success || '#4CAF50'};
      border: 2px solid ${props.theme.cardBg || '#fff'};
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
  `}
  
  &:hover {
    background: ${props => props.$active ? props.theme.warningHover || '#f59e0b' : props.theme.hoverBg || '#f5f5f5'};
    border-color: ${props => props.theme.warning || '#f59e0b'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
`;

const CitasPanel = styled.div`
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
  background: ${props => props.theme.surface};
  border-left: 1px solid ${props => props.theme.border};
  box-shadow: -4px 0 20px rgba(0,0,0,0.1);
  overflow-y: auto;
  z-index: 99;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const CitasPanelHeader = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.primary};
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const CitasList = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CitaItem = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`;

const CitaTexto = styled.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${props => props.theme.textPrimary};
  margin: 0 0 0.75rem 0;
  font-style: italic;
`;

const CitaFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CitaInfo = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const CopiarButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.primaryHover};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const AutoSaveMessage = styled.div`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.success}15;
  border: 1px solid ${props => props.theme.success}40;
  border-radius: 6px;
  color: ${props => props.theme.success || '#4CAF50'};
  font-size: 0.85rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// 🆕 Nuevos componentes para sistema de citas mejorado
const PasteErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.danger}15;
  border: 1px solid ${props => props.theme.danger}40;
  border-radius: 6px;
  color: ${props => props.theme.danger || '#F44336'};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.5s ease;
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;

const EmptyCitasMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textSecondary};
  
  strong {
    color: ${props => props.theme.textPrimary};
    font-size: 1.1rem;
  }
  
  ol {
    margin-top: 1rem;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
`;

const CitaNota = styled.p`
  font-size: 0.8rem;
  line-height: 1.4;
  color: ${props => props.theme.primary};
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: ${props => props.theme.primary}10;
  border-left: 3px solid ${props => props.theme.primary};
  border-radius: 4px;
`;

const InsertarButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.successHover || '#45a049'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EliminarButton = styled.button`
  padding: 0.4rem 0.6rem;
  background: transparent;
  color: ${props => props.theme.danger || '#F44336'};
  border: 1px solid ${props => props.theme.danger || '#F44336'};
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.danger || '#F44336'};
    color: white;
  }
`;

const ShortcutsBar = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: ${props => props.theme.surfaceAlt || props.theme.background || '#f8f9fa'};
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    padding: 0.5rem;
  }
`;

const ShortcutItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: ${props => props.theme.textSecondary || '#666'};
  
  kbd {
    display: inline-block;
    padding: 0.2rem 0.4rem;
    background: ${props => props.theme.surface || '#fff'};
    border: 1px solid ${props => props.theme.border || '#ddd'};
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${props => props.theme.textPrimary || '#333'};
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  
  span {
    font-size: 0.75rem;
  }
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
    
    kbd {
      padding: 0.15rem 0.3rem;
      font-size: 0.7rem;
    }
  }
`;

const ShortcutsHint = styled.div`
  position: absolute;
  top: -40px;
  right: 0;
  background: ${props => props.theme.success || '#4CAF50'};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 10;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    right: 20px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${props => props.theme.success || '#4CAF50'};
  }
`;

export default ResumenAcademico;


