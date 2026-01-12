/**
 * Componente Pre-lectura
 * Muestra análisis académico estructurado ANTES de la lectura detallada
 * Basado en modelo de análisis de textos académicos (4 fases)
 * 
 * ACTUALIZADO: Ahora incluye glosario dinámico, términos clickeables y exportación
 */

import React, { useContext, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { AppContext } from '../context/AppContext';

// Componentes de análisis avanzado
import GlossaryPanel from './analisis/GlossaryPanel';
import TermDefinitionModal from './analisis/TermDefinitionModal';
import NextStepCard from './common/NextStepCard';

// Servicios
import { fetchTermDefinition } from '../services/termDefinitionService';
import { generateGlossary } from '../services/glossaryService';
import { downloadGlossaryAsPDF } from '../services/pdfGlossaryService';
import { exportarResultados } from '../utils/exportUtils';
import { lightTheme, darkTheme } from '../styles/theme';

const PreLectura = () => {
  const { completeAnalysis, modoOscuro, loading, texto, error, analyzeDocument } = useContext(AppContext);

  // Estados para glosario y términos clickeables
  const [glossary, setGlossary] = useState([]);
  const [loadingGlossary, setLoadingGlossary] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [termDefinition, setTermDefinition] = useState(null);
  const [loadingTermDefinition, setLoadingTermDefinition] = useState(false);

  // Calcular tema
  const theme = modoOscuro ? darkTheme : lightTheme;

  // Estado de carga: Solo si loading es true (no depender de completeAnalysis para evitar loading infinito)
  const isLoading = loading;

  // Funciones para glosario
  const generateGlossaryAsync = useCallback(async () => {
    if (!texto || texto.length < 200) return;

    // Generar hash simple del texto para caché
    // Usar encodeURIComponent para manejar caracteres especiales (ñ, acentos, emojis)
    const textHash = btoa(encodeURIComponent(texto.substring(0, 500))).substring(0, 32);
    const cacheKey = `glossary_cache_${textHash}`;

    // Intentar recuperar del caché primero
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const cacheAge = Date.now() - timestamp;
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

        if (cacheAge < CACHE_DURATION) {
          console.log('✅ Glosario recuperado del caché');
          setGlossary(data || []);
          return; // Usar caché, no regenerar
        }
      }
    } catch (err) {
      console.log('⚠️ Error leyendo caché de glosario:', err);
    }

    // Si no hay caché válido, generar nuevo glosario
    setLoadingGlossary(true);
    try {
      const glossaryData = await generateGlossary(texto);
      setGlossary(glossaryData || []);

      // Guardar en caché
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: glossaryData,
          timestamp: Date.now()
        }));
        console.log('💾 Glosario guardado en caché');
      } catch (cacheError) {
        console.log('⚠️ No se pudo guardar en caché:', cacheError);
      }
    } catch (error) {
      console.error('Error generando glosario:', error);
    } finally {
      setLoadingGlossary(false);
    }
  }, [texto]);

  const handleExportGlossary = useCallback(async () => {
    if (glossary.length === 0) return;

    try {
      await downloadGlossaryAsPDF(glossary, texto.slice(0, 100));
    } catch (error) {
      console.error('Error exportando glosario:', error);
    }
  }, [glossary, texto]);

  const handleTermClick = useCallback(async (term) => {
    setSelectedTerm(term);
    setLoadingTermDefinition(true);
    setTermDefinition(null);

    try {
      const definition = await fetchTermDefinition(term, texto);
      setTermDefinition(definition);
    } catch (error) {
      console.error('Error obteniendo definición:', error);
      setTermDefinition({ error: 'No se pudo obtener la definición' });
    } finally {
      setLoadingTermDefinition(false);
    }
  }, [texto]);

  const handleGlossaryTermClick = useCallback((term) => {
    // term puede ser un string o un objeto con termino/term
    const termText = typeof term === 'string' ? term : (term.termino || term.term || term);
    handleTermClick(termText);
  }, [handleTermClick]);

  const handleCloseTermModal = useCallback(() => {
    setSelectedTerm(null);
    setTermDefinition(null);
  }, []);

  const handleExportAnalysis = useCallback(() => {
    if (completeAnalysis) {
      exportarResultados(completeAnalysis, 'prelectura');
    }
  }, [completeAnalysis]);

  // Efecto para generar glosario cuando hay análisis
  useEffect(() => {
    if (completeAnalysis && texto.length > 200) {
      generateGlossaryAsync();
    }
  }, [completeAnalysis, generateGlossaryAsync]);

  // 🆕 A3 FIX: Estado para mostrar tiempo transcurrido
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 🆕 A3 FIX: Efecto para contar tiempo transcurrido durante carga
  useEffect(() => {
    let interval;
    if (isLoading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // 🆕 A3 FIX: Calcular progreso estimado y mensaje dinámico
  const getProgressInfo = () => {
    if (elapsedSeconds < 10) return { step: 1, msg: 'Iniciando análisis...' };
    if (elapsedSeconds < 30) return { step: 2, msg: 'Preparando contexto (si aplica)...' };
    if (elapsedSeconds < 60) return { step: 3, msg: 'Analizando con DeepSeek AI...' };
    if (elapsedSeconds < 90) return { step: 4, msg: 'Estructurando resultados...' };
    return { step: 5, msg: 'Finalizando... (textos largos tardan más)' };
  };

  if (isLoading) {
    const progressInfo = getProgressInfo();
    const estimatedRemaining = Math.max(0, 90 - elapsedSeconds);

    return (
      <Container $darkMode={modoOscuro}>
        <LoadingState
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <LoadingSpinner
            as={motion.div}
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            📊
          </LoadingSpinner>
          <LoadingTitle>Analizando documento...</LoadingTitle>
          <LoadingDescription>
            {progressInfo.msg}
          </LoadingDescription>

          {/* 🆕 A3 FIX: Indicador de tiempo */}
          <div style={{
            fontSize: '14px',
            color: modoOscuro ? '#9ca3af' : '#6b7280',
            marginBottom: '12px',
            display: 'flex',
            gap: '20px',
            justifyContent: 'center'
          }}>
            <span>⏱️ Tiempo: {elapsedSeconds}s</span>
            {elapsedSeconds < 90 && (
              <span>📊 ~{estimatedRemaining}s restantes</span>
            )}
            {elapsedSeconds >= 90 && (
              <span style={{ color: '#f59e0b' }}>⏳ Casi listo...</span>
            )}
          </div>

          <LoadingSteps>
            <LoadingStep
              as={motion.div}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: progressInfo.step >= 1 ? 1 : 0.5 }}
              style={{ color: progressInfo.step >= 2 ? '#10b981' : 'inherit' }}
            >
              <StepIcon>{progressInfo.step >= 2 ? '✅' : '🔍'}</StepIcon> Detectando necesidad de contexto
            </LoadingStep>
            <LoadingStep
              as={motion.div}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: progressInfo.step >= 2 ? 1 : 0.5 }}
              style={{ color: progressInfo.step >= 3 ? '#10b981' : 'inherit' }}
            >
              <StepIcon>{progressInfo.step >= 3 ? '✅' : '🤖'}</StepIcon> Analizando estructura y argumentación
            </LoadingStep>
            <LoadingStep
              as={motion.div}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: progressInfo.step >= 3 ? 1 : 0.5 }}
              style={{ color: progressInfo.step >= 4 ? '#10b981' : 'inherit' }}
            >
              <StepIcon>{progressInfo.step >= 4 ? '✅' : '📝'}</StepIcon> Generando análisis académico
            </LoadingStep>
          </LoadingSteps>
          <ProgressBar
            as={motion.div}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(95, (elapsedSeconds / 90) * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </LoadingState>
      </Container>
    );
  }

  // Estado vacío: No hay texto cargado
  if (!texto) {
    return (
      <Container $darkMode={modoOscuro}>
        <EmptyState>
          <Icon>📋</Icon>
          <Title>Pre-lectura</Title>
          <Description>
            Carga un texto para ver el análisis académico estructurado
          </Description>
        </EmptyState>
      </Container>
    );
  }

  // Estado de error o análisis fallido
  if (!completeAnalysis || !completeAnalysis.prelecture) {
    const errorMsg = completeAnalysis?._errorMessage || error || 'El análisis no pudo completarse';
    const isConnectionError = errorMsg.includes('Failed to fetch') || errorMsg.includes('Network Error');

    return (
      <Container $darkMode={modoOscuro}>
        <EmptyState>
          <Icon>⚠️</Icon>
          <Title>Análisis no disponible</Title>
          <Description>
            {errorMsg}
          </Description>
          {isConnectionError && (
            <Description style={{ color: '#ef4444', fontWeight: 'bold' }}>
              Asegúrate de que el servidor backend esté ejecutándose (puerto 3001).
            </Description>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button
              onClick={() => {
                // 🆕 A2 FIX: Re-intentar análisis sin recargar página
                if (texto && texto.length > 0) {
                  analyzeDocument(texto, null, { force: true });
                } else {
                  // Fallback: Si no hay texto, recargar como último recurso
                  window.location.reload();
                }
              }}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: loading ? '#9ca3af' : theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? '⏳ Analizando...' : '🔄 Reintentar análisis'}
            </button>
          </div>
          <Description style={{ marginTop: '10px', fontSize: '14px', opacity: 0.7 }}>
            Puedes seguir leyendo el texto en la pestaña "Lectura Guiada"
          </Description>
        </EmptyState>
      </Container>
    );
  }

  const { prelecture, critical, metadata: analysisMeta } = completeAnalysis;
  const { metadata, argumentation, linguistics, web_sources, web_summary } = prelecture;

  // Extraer datos de Análisis Crítico del Discurso (ACD)
  const acdData = critical?.contexto_critico || {};

  return (
    <Container $darkMode={modoOscuro}>
      {/* Header con badge web */}
      <Header>
        <HeaderTitle>
          📋 Pre-lectura: Análisis Académico
        </HeaderTitle>
        {analysisMeta.web_enriched && (
          <WebBadge>
            <span>🌐</span>
            Enriquecido con {analysisMeta.web_sources_count} fuentes web
          </WebBadge>
        )}
      </Header>

      {/* Warning Banner for Fallback */}
      {completeAnalysis._isFallback && (
        <WarningBanner $darkMode={modoOscuro}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong>Análisis Parcial:</strong> {completeAnalysis._errorMessage || 'El análisis tardó demasiado y se muestran resultados básicos.'}
            <br />
            Algunas secciones pueden estar incompletas. Intenta analizar un texto más corto para mejores resultados.
          </div>
        </WarningBanner>
      )}

      {/* 🆕 A1 FIX: Banner de análisis preliminar */}
      {analysisMeta?._isPreliminary && !completeAnalysis._isFallback && (
        <PreliminaryBanner $darkMode={modoOscuro}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ fontSize: '24px' }}
            >
              ⏳
            </motion.span>
            <div>
              <strong style={{ color: '#3b82f6' }}>Análisis preliminar mostrado</strong>
              <br />
              <span style={{ fontSize: '13px', opacity: 0.8 }}>
                El análisis profundo con IA está en progreso y actualizará automáticamente...
              </span>
            </div>
          </div>
        </PreliminaryBanner>
      )}

      {/* FASE I: CONTEXTUALIZACIÓN */}
      <Section
        as={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SectionHeader>
          <SectionIcon>🎯</SectionIcon>
          <SectionTitle>Fase I: Contextualización</SectionTitle>
        </SectionHeader>

        <SectionContent>
          <InfoGrid>
            <InfoItem>
              <Label>Género Textual</Label>
              <Value>{metadata.genero_textual}</Value>
            </InfoItem>

            <InfoItem>
              <Label>Propósito Comunicativo</Label>
              <Value>{metadata.proposito_comunicativo}</Value>
            </InfoItem>

            <InfoItem>
              <Label>Tipología Textual</Label>
              <Value>{metadata.tipologia_textual}</Value>
            </InfoItem>

            {metadata.autor && (
              <InfoItem>
                <Label>Autor</Label>
                <Value>{metadata.autor}</Value>
              </InfoItem>
            )}

            {metadata.audiencia_objetivo && (
              <InfoItem>
                <Label>Audiencia Objetivo</Label>
                <Value>{metadata.audiencia_objetivo}</Value>
              </InfoItem>
            )}
          </InfoGrid>

          {metadata.contexto_historico && (
            <TextBlock $darkMode={modoOscuro}>
              <Label>Contexto Histórico:</Label>
              <p>{metadata.contexto_historico}</p>
            </TextBlock>
          )}
        </SectionContent>
      </Section>

      {/* FASE II: ANÁLISIS DE CONTENIDO Y ARGUMENTACIÓN */}
      <Section
        as={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <SectionHeader>
          <SectionIcon>💡</SectionIcon>
          <SectionTitle>Fase II: Contenido y Argumentación</SectionTitle>
        </SectionHeader>

        <SectionContent>
          {argumentation.tesis_central && (
            <Highlight $darkMode={modoOscuro}>
              <HighlightLabel>Tesis Central</HighlightLabel>
              <HighlightContent>{argumentation.tesis_central}</HighlightContent>
            </Highlight>
          )}

          <InfoGrid>
            <InfoItem>
              <Label>Tipo de Argumentación</Label>
              <Value>{argumentation.tipo_argumentacion}</Value>
            </InfoItem>

            {argumentation.tipo_razonamiento && (
              <InfoItem>
                <Label>Tipo de Razonamiento</Label>
                <Value>{argumentation.tipo_razonamiento}</Value>
              </InfoItem>
            )}
          </InfoGrid>

          {argumentation.hipotesis_secundarias?.length > 0 && (
            <ListSection>
              <ListTitle>Hipótesis Secundarias:</ListTitle>
              <List>
                {argumentation.hipotesis_secundarias.map((hipotesis, index) => (
                  <ListItem key={index}>{hipotesis}</ListItem>
                ))}
              </List>
            </ListSection>
          )}

          {argumentation.argumentos_principales?.length > 0 && (
            <ListSection>
              <ListTitle>Argumentos Principales:</ListTitle>
              {argumentation.argumentos_principales.map((arg, index) => (
                <ArgumentCard key={index} $darkMode={modoOscuro}>
                  <ArgumentText>{arg.argumento || arg}</ArgumentText>
                  {arg.evidencia && (
                    <ArgumentEvidence $darkMode={modoOscuro}>
                      <strong>Evidencia:</strong> {arg.evidencia}
                    </ArgumentEvidence>
                  )}
                  {arg.tipo && (
                    <ArgumentMeta>
                      <Badge $type="info">Tipo: {arg.tipo}</Badge>
                      {arg.solidez && (
                        <Badge $type={arg.solidez === 'alta' ? 'success' : arg.solidez === 'media' ? 'warning' : 'neutral'}>
                          Solidez: {arg.solidez}
                        </Badge>
                      )}
                    </ArgumentMeta>
                  )}
                </ArgumentCard>
              ))}
            </ListSection>
          )}

          {argumentation.estructura_logica && (
            <ListSection>
              <ListTitle>Estructura Lógica:</ListTitle>
              {argumentation.estructura_logica.premisas_principales?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>Premisas Principales:</Label>
                  <List>
                    {argumentation.estructura_logica.premisas_principales.map((premisa, index) => (
                      <ListItem key={index}>{premisa}</ListItem>
                    ))}
                  </List>
                </div>
              )}
              {argumentation.estructura_logica.conclusiones?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>Conclusiones:</Label>
                  <List>
                    {argumentation.estructura_logica.conclusiones.map((conclusion, index) => (
                      <ListItem key={index}>{conclusion}</ListItem>
                    ))}
                  </List>
                </div>
              )}
              {argumentation.estructura_logica.cadena_argumentativa && (
                <TextBlock $darkMode={modoOscuro}>
                  <Label>Cadena Argumentativa:</Label>
                  <p>{argumentation.estructura_logica.cadena_argumentativa}</p>
                </TextBlock>
              )}
            </ListSection>
          )}

          {argumentation.fortalezas_argumentativas && (
            <TextBlock $darkMode={modoOscuro} style={{ borderLeftColor: '#10b981' }}>
              <Label>Fortalezas Argumentativas:</Label>
              <p>{argumentation.fortalezas_argumentativas}</p>
            </TextBlock>
          )}

          {argumentation.limitaciones_o_fallos && (
            <TextBlock $darkMode={modoOscuro} style={{ borderLeftColor: '#f59e0b' }}>
              <Label>Limitaciones o Posibles Fallos:</Label>
              <p>{argumentation.limitaciones_o_fallos}</p>
            </TextBlock>
          )}
        </SectionContent>
      </Section>

      {/* FASE III: ANÁLISIS FORMAL Y LINGÜÍSTICO */}
      <Section
        as={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <SectionHeader>
          <SectionIcon>📖</SectionIcon>
          <SectionTitle>Fase III: Análisis Formal y Lingüístico</SectionTitle>
        </SectionHeader>

        <SectionContent>
          <InfoGrid>
            <InfoItem>
              <Label>Tipo de Estructura</Label>
              <Value>{linguistics.tipo_estructura}</Value>
            </InfoItem>

            <InfoItem>
              <Label>Registro Lingüístico</Label>
              <Value>{linguistics.registro_linguistico}</Value>
            </InfoItem>

            <InfoItem>
              <Label>Nivel de Complejidad</Label>
              <Badge $type={
                linguistics.nivel_complejidad === 'Básico' ? 'success' :
                  linguistics.nivel_complejidad === 'Intermedio' ? 'warning' :
                    'info'
              }>
                {linguistics.nivel_complejidad}
              </Badge>
            </InfoItem>
          </InfoGrid>

          {linguistics.coherencia_cohesion && (
            <TextBlock $darkMode={modoOscuro}>
              <Label>Coherencia y Cohesión:</Label>
              <p>{linguistics.coherencia_cohesion}</p>
            </TextBlock>
          )}

          {linguistics.analisis_sintactico && (
            <ListSection>
              <ListTitle>Análisis Sintáctico:</ListTitle>
              <InfoGrid>
                {linguistics.analisis_sintactico.tipo_oraciones && (
                  <InfoItem>
                    <Label>Tipo de Oraciones</Label>
                    <Value>{linguistics.analisis_sintactico.tipo_oraciones}</Value>
                  </InfoItem>
                )}
                {linguistics.analisis_sintactico.longitud_promedio && (
                  <InfoItem>
                    <Label>Longitud Promedio</Label>
                    <Value>{linguistics.analisis_sintactico.longitud_promedio}</Value>
                  </InfoItem>
                )}
                {linguistics.analisis_sintactico.complejidad_sintactica && (
                  <InfoItem>
                    <Label>Complejidad Sintáctica</Label>
                    <Value>{linguistics.analisis_sintactico.complejidad_sintactica}</Value>
                  </InfoItem>
                )}
              </InfoGrid>
            </ListSection>
          )}

          {linguistics.conectores_discursivos && (
            <ListSection>
              <ListTitle>Conectores Discursivos:</ListTitle>
              {linguistics.conectores_discursivos.causales?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <Label style={{ fontSize: '13px', marginBottom: '4px', display: 'block' }}>Causales:</Label>
                  <TagList>
                    {linguistics.conectores_discursivos.causales.map((c, i) => (
                      <Tag key={i}>{c}</Tag>
                    ))}
                  </TagList>
                </div>
              )}
              {linguistics.conectores_discursivos.concesivos?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <Label style={{ fontSize: '13px', marginBottom: '4px', display: 'block' }}>Concesivos:</Label>
                  <TagList>
                    {linguistics.conectores_discursivos.concesivos.map((c, i) => (
                      <Tag key={i}>{c}</Tag>
                    ))}
                  </TagList>
                </div>
              )}
              {linguistics.conectores_discursivos.temporales?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <Label style={{ fontSize: '13px', marginBottom: '4px', display: 'block' }}>Temporales:</Label>
                  <TagList>
                    {linguistics.conectores_discursivos.temporales.map((c, i) => (
                      <Tag key={i}>{c}</Tag>
                    ))}
                  </TagList>
                </div>
              )}
              {linguistics.conectores_discursivos.comparativos?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <Label style={{ fontSize: '13px', marginBottom: '4px', display: 'block' }}>Comparativos:</Label>
                  <TagList>
                    {linguistics.conectores_discursivos.comparativos.map((c, i) => (
                      <Tag key={i}>{c}</Tag>
                    ))}
                  </TagList>
                </div>
              )}
              {linguistics.conectores_discursivos.funcion && (
                <TextBlock $darkMode={modoOscuro} style={{ marginTop: '12px' }}>
                  <Label>Función de los Conectores:</Label>
                  <p>{linguistics.conectores_discursivos.funcion}</p>
                </TextBlock>
              )}
            </ListSection>
          )}

          {linguistics.lexico_especializado && (
            <ListSection>
              <ListTitle>Léxico Especializado:</ListTitle>
              <InfoGrid>
                {linguistics.lexico_especializado.campo_semantico && (
                  <InfoItem>
                    <Label>Campo Semántico</Label>
                    <Value>{linguistics.lexico_especializado.campo_semantico}</Value>
                  </InfoItem>
                )}
                {linguistics.lexico_especializado.densidad_conceptual && (
                  <InfoItem>
                    <Label>Densidad Conceptual</Label>
                    <Value>{linguistics.lexico_especializado.densidad_conceptual}</Value>
                  </InfoItem>
                )}
              </InfoGrid>
              {linguistics.lexico_especializado.terminos_tecnicos?.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <Label style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>Términos Técnicos:</Label>
                  <TagList>
                    {linguistics.lexico_especializado.terminos_tecnicos.map((term, i) => (
                      <Tag key={i}>{term}</Tag>
                    ))}
                  </TagList>
                </div>
              )}
            </ListSection>
          )}

          {linguistics.tono_y_modalidad && (
            <ListSection>
              <ListTitle>Tono y Modalidad:</ListTitle>
              <InfoGrid>
                {linguistics.tono_y_modalidad.tono && (
                  <InfoItem>
                    <Label>Tono</Label>
                    <Value>{linguistics.tono_y_modalidad.tono}</Value>
                  </InfoItem>
                )}
                {linguistics.tono_y_modalidad.modalidad && (
                  <InfoItem>
                    <Label>Modalidad</Label>
                    <Value>{linguistics.tono_y_modalidad.modalidad}</Value>
                  </InfoItem>
                )}
                {linguistics.tono_y_modalidad.distancia_epistemica && (
                  <InfoItem>
                    <Label>Distancia Epistémica</Label>
                    <Value>{linguistics.tono_y_modalidad.distancia_epistemica}</Value>
                  </InfoItem>
                )}
              </InfoGrid>
            </ListSection>
          )}

          {linguistics.figuras_retoricas?.length > 0 && (
            <ListSection>
              <ListTitle>Figuras Retóricas Detectadas:</ListTitle>
              <FigurasList>
                {linguistics.figuras_retoricas.map((figura, index) => {
                  // Normalizar SIEMPRE a objeto para consistencia
                  const figuraObj = typeof figura === 'string'
                    ? { tipo: figura, ejemplo: null }
                    : figura;

                  return (
                    <FiguraItem key={index} $darkMode={modoOscuro}>
                      <FiguraTipo $darkMode={modoOscuro}>
                        {figuraObj.tipo}
                        {figuraObj.confidence && (
                          <ConfidenceBadge $level={figuraObj.confidence}>
                            {(figuraObj.confidence * 100).toFixed(0)}%
                          </ConfidenceBadge>
                        )}
                      </FiguraTipo>

                      {figuraObj.ejemplo && (
                        <FiguraEjemplo $darkMode={modoOscuro}>
                          "{figuraObj.ejemplo}"
                        </FiguraEjemplo>
                      )}

                      {figuraObj.justificacion && (
                        <FiguraJustificacion $darkMode={modoOscuro}>
                          💡 {figuraObj.justificacion}
                        </FiguraJustificacion>
                      )}
                    </FiguraItem>
                  );
                })}
              </FigurasList>
            </ListSection>
          )}
        </SectionContent>
      </Section>

      {/* FASE IV: ANÁLISIS IDEOLÓGICO-DISCURSIVO (ACD) */}
      {(acdData.voces_representadas?.length > 0 || acdData.voces_silenciadas?.length > 0 || acdData.ideologia_subyacente) && (
        <Section
          as={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <SectionHeader>
            <SectionIcon>ACD</SectionIcon>
            <SectionTitle>Fase IV: Análisis Ideológico-Discursivo (ACD)</SectionTitle>
          </SectionHeader>

          <SectionContent>
            {/* Marco Ideológico */}
            {acdData.ideologia_subyacente && (
              <ACDCard $darkMode={modoOscuro} $variant="ideology">
                <ACDLabel>
                  Marco Ideológico Subyacente
                </ACDLabel>
                <ACDValue>{acdData.ideologia_subyacente}</ACDValue>
              </ACDCard>
            )}

            {/* Voces Representadas */}
            {acdData.voces_representadas?.length > 0 && (
              <ACDCard $darkMode={modoOscuro} $variant="represented">
                <ACDLabel>
                  Voces Representadas (legitimadas en el discurso)
                </ACDLabel>
                <VoicesList>
                  {acdData.voces_representadas.map((voz, index) => (
                    <VoiceChip key={index} $type="represented" $darkMode={modoOscuro}>
                      {voz}
                    </VoiceChip>
                  ))}
                </VoicesList>
              </ACDCard>
            )}

            {/* Voces Silenciadas */}
            {acdData.voces_silenciadas?.length > 0 && (
              <ACDCard $darkMode={modoOscuro} $variant="silenced">
                <ACDLabel>
                  Voces Silenciadas (ausentes o marginadas)
                </ACDLabel>
                <VoicesList>
                  {acdData.voces_silenciadas.map((voz, index) => (
                    <VoiceChip key={index} $type="silenced" $darkMode={modoOscuro}>
                      {voz}
                    </VoiceChip>
                  ))}
                </VoicesList>
                <ACDWarning $darkMode={modoOscuro}>
                  Pregunta crítica: ¿Por qué estas perspectivas están ausentes? ¿Qué implicaciones tiene su exclusión?
                </ACDWarning>
              </ACDCard>
            )}

            {/* Contraste con Contexto Web (si existe) */}
            {(acdData.contraste_web?.texto_actualizado || acdData.contraste_web?.datos_verificados) && (
              <ACDCard $darkMode={modoOscuro} $variant="web">
                <ACDLabel>
                  Contraste con Contexto Web Actual
                </ACDLabel>
                {acdData.contraste_web.texto_actualizado && (
                  <TextBlock $darkMode={modoOscuro}>
                    <Label>Actualización del Contexto:</Label>
                    <p>{acdData.contraste_web.texto_actualizado}</p>
                  </TextBlock>
                )}
                {acdData.contraste_web.datos_verificados && (
                  <TextBlock $darkMode={modoOscuro}>
                    <Label>Verificación de Datos:</Label>
                    <p>{acdData.contraste_web.datos_verificados}</p>
                  </TextBlock>
                )}
              </ACDCard>
            )}
          </SectionContent>
        </Section>
      )}

      {/* FUENTES WEB (si aplica) */}
      {web_sources?.length > 0 && (
        <Section
          as={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <SectionHeader>
            <SectionIcon>🌐</SectionIcon>
            <SectionTitle>Fuentes Web Consultadas</SectionTitle>
          </SectionHeader>

          <SectionContent>
            {web_summary && (
              <TextBlock $darkMode={modoOscuro}>
                {Array.isArray(web_summary)
                  ? web_summary.filter(Boolean).map((item, idx) => <p key={idx}>{item}</p>)
                  : <p>{web_summary}</p>
                }
              </TextBlock>
            )}

            <SourcesList>
              {web_sources.map((source, index) => (
                <SourceCard key={index} $darkMode={modoOscuro}>
                  <SourceNumber>{index + 1}</SourceNumber>
                  <SourceContent>
                    <SourceTitle>{source.title}</SourceTitle>
                    {source.snippet && (
                      <SourceSnippet>{source.snippet.substring(0, 150)}...</SourceSnippet>
                    )}
                    <SourceLink href={source.url} target="_blank" rel="noopener noreferrer">
                      🔗 Ver fuente completa
                    </SourceLink>
                  </SourceContent>
                </SourceCard>
              ))}
            </SourcesList>
          </SectionContent>
        </Section>
      )}

      {/* Glosario Dinámico */}
      <GlossaryPanel
        glossary={glossary}
        loading={loadingGlossary}
        onExport={handleExportGlossary}
        onTermClick={handleGlossaryTermClick}
        theme={theme}
      />

      {/* Botón de Exportar Análisis Completo */}
      <ExportSection>
        <ExportButton onClick={handleExportAnalysis} theme={theme}>
          📥 Exportar Análisis Completo
        </ExportButton>
      </ExportSection>

      {/* Footer con timestamp */}
      <Footer>
        <FooterText>
          ⏱️ Análisis generado: {new Date(analysisMeta.analysis_timestamp).toLocaleString('es-ES')}
        </FooterText>
        <FooterText>
          📊 Tiempo de procesamiento: {analysisMeta.processing_time_ms}ms
        </FooterText>
      </Footer>

      {/* ✅ GUÍA PEDAGÓGICA: Siguiente paso en el ciclo */}
      <NextStepCard
        icon="🎯"
        title="Siguiente Paso: Practica con Actividades"
        description="Ahora que has analizado el texto críticamente (marco ideológico, voces representadas/silenciadas), ve a la pestaña Actividades para practicar la identificación de dimensiones críticas con feedback formativo."
        actionLabel="Ir a Actividades →"
        onAction={() => {
          window.dispatchEvent(new CustomEvent('app-change-tab', {
            detail: { tabId: 'actividades' }
          }));
        }}
        theme={theme}
        variant="success"
      />

      {/* Modal de definición de términos */}
      <TermDefinitionModal
        term={selectedTerm}
        definition={termDefinition}
        isOpen={!!selectedTerm}
        loading={loadingTermDefinition}
        onClose={handleCloseTermModal}
        onWebSearch={(term) => {
          const query = encodeURIComponent(term + ' definición educativa');
          window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
        }}
        theme={theme}
      />
    </Container>
  );
};

// ============================================================
// STYLED COMPONENTS
// ============================================================

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: ${props => props.$darkMode ? '#1a1a1a' : '#f8f9fa'};
  min-height: calc(100vh - 120px);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`;

const Icon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  font-size: 28px;
  margin-bottom: 8px;
  color: #333;
`;

const Description = styled.p`
  font-size: 16px;
  color: #666;
  max-width: 400px;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  min-height: 400px;
`;

const LoadingSpinner = styled.div`
  font-size: 72px;
  margin-bottom: 24px;
`;

const LoadingTitle = styled.h2`
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
`;

const LoadingDescription = styled.p`
  font-size: 16px;
  color: #666;
  margin-bottom: 32px;
`;

const LoadingSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
  width: 100%;
  max-width: 400px;
`;

const LoadingStep = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(74, 144, 226, 0.1);
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  text-align: left;
`;

const StepIcon = styled.span`
  font-size: 20px;
`;

const ProgressBar = styled.div`
  width: 100%;
  max-width: 400px;
  height: 4px;
  background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
  border-radius: 2px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme?.text || '#333'};
  margin: 0;
`;

const WebBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  
  span {
    font-size: 18px;
  }
`;

const Section = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
`;

const SectionIcon = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #3498db;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  padding: 6px 10px;
  border-radius: 999px;
`;

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
`;

const SectionContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Value = styled.span`
  font-size: 16px;
  color: #2c3e50;
  font-weight: 500;
`;

const Highlight = styled.div`
  background: ${props => props.$darkMode ? '#2d3748' : '#f0f4f8'};
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #4a90e2;
`;

const HighlightLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const HighlightContent = styled.p`
  font-size: 17px;
  line-height: 1.6;
  color: #2c3e50;
  margin: 0;
  font-weight: 500;
`;

const ListSection = styled.div`
  margin-top: 16px;
`;

const ListTitle = styled.h4`
  font-size: 15px;
  font-weight: 600;
  color: #34495e;
  margin-bottom: 12px;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ListItem = styled.li`
  padding: 10px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 15px;
  color: #2c3e50;
  border-left: 3px solid #3498db;
`;

const ArgumentCard = styled.div`
  background: ${props => props.$darkMode ? '#2d3748' : '#f8f9fa'};
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 3px solid #9b59b6;
`;

const ArgumentText = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #2c3e50;
  margin: 0 0 12px 0;
`;

const ArgumentEvidence = styled.div`
  font-size: 13px;
  line-height: 1.5;
  color: ${props => props.$darkMode ? '#94a3b8' : '#64748b'};
  font-style: italic;
  margin: 8px 0;
  padding: 8px;
  background: ${props => props.$darkMode ? '#1e293b' : '#f1f5f9'};
  border-radius: 4px;
  border-left: 2px solid ${props => props.$darkMode ? '#475569' : '#cbd5e1'};
`;

const ArgumentMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  
  ${props => {
    switch (props.$type) {
      case 'success':
        return 'background: #d4edda; color: #155724;';
      case 'warning':
        return 'background: #fff3cd; color: #856404;';
      case 'info':
        return 'background: #d1ecf1; color: #0c5460;';
      default:
        return 'background: #e2e3e5; color: #383d41;';
    }
  }}
`;

const TextBlock = styled.div`
  background: ${props => props.$darkMode ? '#2d3748' : '#f8f9fa'};
  padding: 16px;
  border-radius: 8px;
  
  p {
    margin: 8px 0 0 0;
    font-size: 15px;
    line-height: 1.6;
    color: #2c3e50;
  }
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Tag = styled.span`
  padding: 6px 14px;
  background: #e8f4f8;
  color: #2980b9;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
`;

const FigurasList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FiguraItem = styled.div`
  padding: 12px 16px;
  background: ${props => props.$darkMode ? '#2d3748' : '#f0f8ff'};
  border-radius: 8px;
  border-left: 3px solid #3498db;
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.15);
  }
`;

const FiguraTipo = styled.div`
  font-weight: 600;
  color: ${props => props.$darkMode ? '#63b3ed' : '#2980b9'};
  font-size: 14px;
  margin-bottom: 6px;
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ConfidenceBadge = styled.span`
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: ${props => {
    const level = props.$level || 0;
    if (level >= 0.9) return 'rgba(76,175,80,0.2)'; // Verde - muy seguro
    if (level >= 0.7) return 'rgba(255,193,7,0.2)'; // Amarillo - seguro
    return 'rgba(158,158,158,0.2)'; // Gris - dudoso
  }};
  color: ${props => {
    const level = props.$level || 0;
    if (level >= 0.9) return '#4CAF50';
    if (level >= 0.7) return '#FFA000';
    return '#757575';
  }};
`;

const FiguraEjemplo = styled.div`
  color: ${props => props.$darkMode ? '#cbd5e0' : '#4a5568'};
  font-size: 13px;
  font-style: italic;
  line-height: 1.5;
  padding-left: 12px;
  border-left: 2px solid ${props => props.$darkMode ? '#4a5568' : '#cbd5e0'};
`;

const FiguraJustificacion = styled.div`
  font-size: 12px;
  color: ${props => props.$darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'};
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${props => props.$darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  line-height: 1.4;
`;

const SourcesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SourceCard = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  background: ${props => props.$darkMode ? '#2d3748' : '#f8f9fa'};
  border-radius: 8px;
  border-left: 3px solid #27ae60;
`;

const SourceNumber = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #27ae60;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
`;

const SourceContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SourceTitle = styled.h5`
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
`;

const SourceSnippet = styled.p`
  font-size: 13px;
  color: #7f8c8d;
  margin: 0;
  line-height: 1.5;
`;

const SourceLink = styled.a`
  font-size: 13px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  margin-top: 32px;
  flex-wrap: wrap;
  gap: 12px;
`;

const FooterText = styled.span`
  font-size: 13px;
  color: #7f8c8d;
`;

const ExportSection = styled.div`
  display: flex;
  justify-content: center;
  margin: 32px 0;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${props => props.theme.success || '#27ae60'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);

  &:hover {
    background: ${props => props.theme.successHover || '#229954'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

// ============================================
// STYLED COMPONENTS PARA FASE IV (ACD)
// ============================================

const ACDCard = styled.div`
  background: ${props => props.$darkMode ? '#2d3748' : '#f8f9fa'};
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 3px solid ${props => {
    // Reusar la paleta existente del componente (coherente con otras secciones)
    if (props.$variant === 'ideology') return '#9b59b6';
    if (props.$variant === 'represented') return '#27ae60';
    if (props.$variant === 'silenced') return '#e67e22';
    if (props.$variant === 'web') return '#3498db';
    return '#3498db';
  }};
`;

const ACDLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
`;

const ACDValue = styled.p`
  font-size: 15px;
  line-height: 1.7;
  color: #2c3e50;
  margin: 0;
  font-weight: 500;
`;

const VoicesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
`;

const VoiceChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;

  ${props => props.$type === 'represented' ? `
    background: ${props.$darkMode ? '#2d3748' : '#ffffff'};
    color: ${props.$darkMode ? '#e5e7eb' : '#2c3e50'};
    border: 1px solid ${props.$darkMode ? '#4b5563' : '#e0e0e0'};
  ` : `
    background: ${props.$darkMode ? '#2d3748' : '#ffffff'};
    color: ${props.$darkMode ? '#e5e7eb' : '#2c3e50'};
    border: 1px solid ${props.$darkMode ? '#4b5563' : '#e0e0e0'};
  `}
`;

const ACDWarning = styled.div`
  margin-top: 16px;
  padding: 12px 16px;
  background: ${props => props.$darkMode ? '#2d3748' : '#f8f9fa'};
  border-radius: 8px;
  border-left: 3px solid #e67e22;
  font-size: 13px;
  line-height: 1.6;
  color: ${props => props.$darkMode ? '#e5e7eb' : '#2c3e50'};
`;

const WarningBanner = styled.div`
  background: ${props => props.$darkMode ? 'rgba(245, 158, 11, 0.2)' : '#fff3cd'};
  color: ${props => props.$darkMode ? '#fcd34d' : '#856404'};
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  border-left: 4px solid #f59e0b;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  line-height: 1.5;
`;

// 🆕 A1 FIX: Banner de análisis preliminar
const PreliminaryBanner = styled.div`
  background: ${props => props.$darkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff'};
  color: ${props => props.$darkMode ? '#93c5fd' : '#1e40af'};
  padding: 14px 18px;
  border-radius: 10px;
  margin-bottom: 24px;
  border-left: 4px solid #3b82f6;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  line-height: 1.5;
  
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
`;

export default PreLectura;
