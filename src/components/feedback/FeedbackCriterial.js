/**
 * @file FeedbackCriterial Component
 * @description Componente para visualizar evaluaciones criteriales estructuradas
 * de literacidad crítica. Muestra puntuación global, evaluación por criterio,
 * evidencias textuales, fortalezas y mejoras específicas.
 * 
 * @version 1.0.0
 * @module FeedbackCriterial
 * 
 * @example
 * <FeedbackCriterial 
 *   evaluation={evaluationData}
 *   onClose={() => setShowFeedback(false)}
 * />
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const FeedbackContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin: 1.5rem 0;
`;

const FeedbackHeader = styled.div`
  background: linear-gradient(135deg, 
    ${props => getNivelColor(props.nivel, props.theme, 0.15)}, 
    ${props => getNivelColor(props.nivel, props.theme, 0.05)}
  );
  padding: 1.5rem;
  border-bottom: 2px solid ${props => getNivelColor(props.nivel, props.theme, 0.3)};
`;

const DimensionTitle = styled.h3`
  color: ${props => props.theme.text};
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const ScoreContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ScoreBadge = styled.div`
  background: ${props => getNivelColor(props.nivel, props.theme, 1)};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px ${props => getNivelColor(props.nivel, props.theme, 0.3)};
`;

const NivelBadge = styled.div`
  background: ${props => props.theme.surface};
  border: 2px solid ${props => getNivelColor(props.nivel, props.theme, 1)};
  color: ${props => getNivelColor(props.nivel, props.theme, 1)};
  padding: 0.4rem 0.8rem;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 600;
`;

const TimestampText = styled.span`
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  margin-left: auto;
`;

// ----------------------------------------------------------------------------
// CRITERIOS
// ----------------------------------------------------------------------------

const CriteriaList = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CriterioCard = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-left: 4px solid ${props => getNivelColor(props.nivel, props.theme, 1)};
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px ${props => getNivelColor(props.nivel, props.theme, 0.2)};
    transform: translateY(-2px);
  }
`;

const CriterioHeader = styled.div`
  padding: 1rem;
  background: ${props => getNivelColor(props.nivel, props.theme, 0.05)};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  
  &:hover {
    background: ${props => getNivelColor(props.nivel, props.theme, 0.1)};
  }
`;

const CriterioTitleContainer = styled.div`
  flex: 1;
`;

const CriterioTitulo = styled.h4`
  color: ${props => props.theme.text};
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
`;

const CriterioSubtitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const NivelIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: ${props => getNivelColor(props.nivel, props.theme, 1)};
  font-size: 0.85rem;
  font-weight: 600;
`;

const NivelTexto = styled.span`
  color: ${props => props.theme.textMuted};
  font-size: 0.8rem;
  font-style: italic;
`;

const ExpandIcon = styled(motion.div)`
  color: ${props => props.theme.textMuted};
  font-size: 1.2rem;
  line-height: 1;
`;

const CriterioContent = styled(motion.div)`
  padding: 0 1rem 1rem 1rem;
`;

// ----------------------------------------------------------------------------
// SECCIONES DE CONTENIDO
// ----------------------------------------------------------------------------

const Section = styled.div`
  margin-top: 1rem;
  
  &:first-child {
    margin-top: 0.5rem;
  }
`;

const SectionTitle = styled.h5`
  color: ${props => props.theme.text};
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const EvidenceList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EvidenceItem = styled.li`
  background: ${props => props.theme.infoBg};
  border-left: 3px solid ${props => props.theme.info};
  padding: 0.75rem;
  border-radius: 4px;
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
  position: relative;
  
  &::before {
    content: '"';
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    font-size: 1.5rem;
    color: ${props => props.theme.info};
    opacity: 0.3;
  }
  
  &::after {
    content: '"';
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    font-size: 1.5rem;
    color: ${props => props.theme.info};
    opacity: 0.3;
  }
`;

const ItemList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const ItemListElement = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
  
  &::before {
    content: '${props => props.icon}';
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 0.2rem;
  }
`;

// ----------------------------------------------------------------------------
// RESUMEN Y SIGUIENTES PASOS
// ----------------------------------------------------------------------------

const ResumenContainer = styled.div`
  background: ${props => props.theme.surface};
  border-top: 2px solid ${props => props.theme.border};
  padding: 1.5rem;
`;

const ResumenTitle = styled.h4`
  color: ${props => props.theme.text};
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResumenText = styled.p`
  color: ${props => props.theme.text};
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SiguientesPasosContainer = styled.div`
  background: linear-gradient(135deg, 
    ${props => props.theme.success}15, 
    ${props => props.theme.info}15
  );
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const PasosList = styled.ol`
  list-style: none;
  counter-reset: paso-counter;
  padding: 0;
  margin: 0.5rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PasoItem = styled.li`
  counter-increment: paso-counter;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
  
  &::before {
    content: counter(paso-counter);
    background: ${props => props.theme.primary};
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.85rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
`;

// ----------------------------------------------------------------------------
// BOTÓN DE CIERRE
// ----------------------------------------------------------------------------

const CloseButton = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  width: 100%;
  
  &:hover {
    background: ${props => props.theme.primaryHover};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.theme.primary}40;
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${props => props.theme.textMuted};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.p`
  font-size: 1.1rem;
  margin: 0;
`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Obtiene el color asociado a un nivel de desempeño
 * @param {number} nivel - Nivel de 1 a 4
 * @param {object} theme - Tema actual (light/dark)
 * @param {number} opacity - Opacidad (0-1)
 * @returns {string} Color en formato rgba o hex
 */
function getNivelColor(nivel, theme, opacity = 1) {
  const colors = {
    1: { r: 217, g: 48, b: 37 },   // Rojo (Insuficiente)
    2: { r: 249, g: 171, b: 0 },   // Naranja (En desarrollo)
    3: { r: 52, g: 168, b: 83 },   // Verde (Competente)
    4: { r: 26, g: 115, b: 232 },  // Azul (Avanzado)
  };
  
  const color = colors[nivel] || colors[2];
  
  if (opacity === 1) {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

/**
 * Obtiene el icono para cada dimensión de literacidad crítica
 */
function getDimensionIcon(dimensionKey) {
  const icons = {
    comprensionAnalitica: '📖',
    acd: '🔍',
    contextualizacion: '🌍',
    argumentacion: '💬',
    metacognicion: '🧠',
  };
  return icons[dimensionKey] || '📋';
}

/**
 * Obtiene el nombre legible de la dimensión
 */
function getDimensionName(dimensionKey) {
  const names = {
    comprensionAnalitica: 'Comprensión Analítica',
    acd: 'Análisis Ideológico-Discursivo',
    contextualizacion: 'Contextualización Socio-Histórica',
    argumentacion: 'Argumentación y Contraargumento',
    metacognicion: 'Metacognición y Uso Crítico de IA',
  };
  return names[dimensionKey] || dimensionKey;
}

/**
 * Formatea la fecha de timestamp
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

/**
 * Componente para el header con puntuación global
 */
const ScoreHeader = ({ dimension, scoreGlobal, nivel, nivelTexto, timestamp }) => {
  const dimensionIcon = getDimensionIcon(dimension);
  const dimensionName = getDimensionName(dimension);
  
  return (
    <FeedbackHeader nivel={nivel}>
      <DimensionTitle>
        <span>{dimensionIcon}</span>
        {dimensionName}
      </DimensionTitle>
      <ScoreContainer>
        <ScoreBadge nivel={nivel}>
          ⭐ {scoreGlobal}/10
        </ScoreBadge>
        <NivelBadge nivel={nivel}>
          Nivel {nivel} - {nivelTexto}
        </NivelBadge>
        {timestamp && (
          <TimestampText>
            🕒 {formatTimestamp(timestamp)}
          </TimestampText>
        )}
      </ScoreContainer>
    </FeedbackHeader>
  );
};

/**
 * Componente para una tarjeta de criterio individual
 */
const CriterioCardComponent = ({ criterio, index }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0); // Primer criterio expandido por defecto
  
  return (
    <CriterioCard
      nivel={criterio.nivel}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <CriterioHeader
        nivel={criterio.nivel}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CriterioTitleContainer>
          <CriterioTitulo>{criterio.titulo}</CriterioTitulo>
          <CriterioSubtitle>
            <NivelIndicator nivel={criterio.nivel}>
              🎯 Nivel {criterio.nivel}/4
            </NivelIndicator>
            <NivelTexto>— {criterio.nivelTexto}</NivelTexto>
          </CriterioSubtitle>
        </CriterioTitleContainer>
        <ExpandIcon
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ▼
        </ExpandIcon>
      </CriterioHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <CriterioContent
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Evidencias */}
            {criterio.evidencias && criterio.evidencias.length > 0 && (
              <Section>
                <SectionTitle>
                  <span>📌</span>
                  Evidencias Textuales
                </SectionTitle>
                <EvidenceList>
                  {criterio.evidencias.map((evidencia, idx) => (
                    <EvidenceItem key={idx}>
                      {evidencia}
                    </EvidenceItem>
                  ))}
                </EvidenceList>
              </Section>
            )}
            
            {/* Fortalezas */}
            {criterio.fortalezas && criterio.fortalezas.length > 0 && (
              <Section>
                <SectionTitle>
                  <span>✅</span>
                  Fortalezas Identificadas
                </SectionTitle>
                <ItemList>
                  {criterio.fortalezas.map((fortaleza, idx) => (
                    <ItemListElement key={idx} icon="✓">
                      {fortaleza}
                    </ItemListElement>
                  ))}
                </ItemList>
              </Section>
            )}
            
            {/* Mejoras */}
            {criterio.mejoras && criterio.mejoras.length > 0 && (
              <Section>
                <SectionTitle>
                  <span>🎯</span>
                  Oportunidades de Mejora
                </SectionTitle>
                <ItemList>
                  {criterio.mejoras.map((mejora, idx) => (
                    <ItemListElement key={idx} icon="→">
                      {mejora}
                    </ItemListElement>
                  ))}
                </ItemList>
              </Section>
            )}
          </CriterioContent>
        )}
      </AnimatePresence>
    </CriterioCard>
  );
};

/**
 * Componente para el resumen y siguientes pasos
 */
const ResumenSection = ({ resumenDimension, siguientesPasos }) => {
  return (
    <ResumenContainer>
      <ResumenTitle>
        <span>📝</span>
        Resumen de la Evaluación
      </ResumenTitle>
      <ResumenText>{resumenDimension}</ResumenText>
      
      {siguientesPasos && siguientesPasos.length > 0 && (
        <SiguientesPasosContainer>
          <ResumenTitle>
            <span>🚀</span>
            Siguientes Pasos Recomendados
          </ResumenTitle>
          <PasosList>
            {siguientesPasos.map((paso, idx) => (
              <PasoItem key={idx}>
                {paso}
              </PasoItem>
            ))}
          </PasosList>
        </SiguientesPasosContainer>
      )}
    </ResumenContainer>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente principal FeedbackCriterial
 * Visualiza evaluaciones criteriales estructuradas de literacidad crítica
 * 
 * @param {Object} props
 * @param {Object} props.evaluation - Datos de la evaluación desde el backend
 * @param {Function} props.onClose - Callback para cerrar el feedback
 * @returns {JSX.Element}
 */
const FeedbackCriterial = ({ evaluation, onClose }) => {
  // Validación de datos
  if (!evaluation || !evaluation.valid) {
    return (
      <FeedbackContainer
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <EmptyState>
          <EmptyIcon>⚠️</EmptyIcon>
          <EmptyText>
            No se pudo cargar la evaluación. Por favor, intenta nuevamente.
          </EmptyText>
        </EmptyState>
        {onClose && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <CloseButton onClick={onClose}>
              Cerrar
            </CloseButton>
          </div>
        )}
      </FeedbackContainer>
    );
  }
  
  const {
    dimension,
    scoreGlobal,
    nivel,
    nivelTexto,
    criteriosEvaluados = [],
    resumenDimension,
    siguientesPasos = [],
    timestamp,
  } = evaluation;
  
  return (
    <FeedbackContainer
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ScoreHeader
        dimension={dimension}
        scoreGlobal={scoreGlobal}
        nivel={nivel}
        nivelTexto={nivelTexto}
        timestamp={timestamp}
      />
      
      <CriteriaList>
        {criteriosEvaluados.map((criterio, index) => (
          <CriterioCardComponent
            key={index}
            criterio={criterio}
            index={index}
          />
        ))}
      </CriteriaList>
      
      <ResumenSection
        resumenDimension={resumenDimension}
        siguientesPasos={siguientesPasos}
      />
      
      {onClose && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <CloseButton onClick={onClose}>
            ✓ Entendido, continuar
          </CloseButton>
        </div>
      )}
    </FeedbackContainer>
  );
};

export default FeedbackCriterial;
