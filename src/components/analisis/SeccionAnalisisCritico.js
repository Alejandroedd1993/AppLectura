/**
 * Sección de Análisis Crítico del Discurso (ACD)
 * Muestra: Marcadores ideológicos, Estrategias retóricas, Relaciones de poder
 * MIGRADO desde PreLectura (linguistics)
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const SeccionAnalisisCritico = ({ prelecture, modoOscuro }) => {
  if (!prelecture?.linguistics) return null;

  const { linguistics } = prelecture;

  return (
    <Section
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <SectionHeader>
        <SectionIcon>🔍</SectionIcon>
        <SectionTitle>Análisis Crítico del Discurso</SectionTitle>
        <SectionBadge>ACD</SectionBadge>
      </SectionHeader>

      <SectionContent>
        {/* Análisis Formal */}
        <Subsection $darkMode={modoOscuro}>
          <SubsectionTitle>Análisis Formal y Lingüístico</SubsectionTitle>
          
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
              <TextContent>{linguistics.coherencia_cohesion}</TextContent>
            </TextBlock>
          )}
        </Subsection>

        {/* Marcadores Ideológicos */}
        {linguistics.marcadores_ideologicos && (
          <Subsection $darkMode={modoOscuro}>
            <SubsectionTitle>Marcadores Ideológicos</SubsectionTitle>
            <CriticalAlert $darkMode={modoOscuro}>
              <AlertIcon>⚠️</AlertIcon>
              <AlertContent>
                <AlertTitle>Análisis de Marcos Discursivos</AlertTitle>
                <AlertText>
                  Los marcadores ideológicos revelan posicionamientos políticos, culturales y sociales implícitos en el texto.
                  Identificar estos marcos es clave para el análisis crítico del discurso.
                </AlertText>
              </AlertContent>
            </CriticalAlert>
            
            {Array.isArray(linguistics.marcadores_ideologicos) ? (
              <MarcadoresList>
                {linguistics.marcadores_ideologicos.map((marcador, index) => (
                  <MarcadorItem key={index} $darkMode={modoOscuro}>
                    <MarcadorIcon>🎯</MarcadorIcon>
                    <MarcadorText>{marcador}</MarcadorText>
                  </MarcadorItem>
                ))}
              </MarcadoresList>
            ) : (
              <TextBlock $darkMode={modoOscuro}>
                <TextContent>{linguistics.marcadores_ideologicos}</TextContent>
              </TextBlock>
            )}
          </Subsection>
        )}

        {/* Estrategias Retóricas */}
        {linguistics.estrategias_retoricas && (
          <Subsection $darkMode={modoOscuro}>
            <SubsectionTitle>Estrategias Retóricas Detectadas</SubsectionTitle>
            
            {Array.isArray(linguistics.estrategias_retoricas) ? (
              <EstrategiasList>
                {linguistics.estrategias_retoricas.map((estrategia, index) => (
                  <EstrategiaCard key={index} $darkMode={modoOscuro}>
                    <EstrategiaTitulo>
                      {typeof estrategia === 'string' ? estrategia : estrategia.nombre}
                    </EstrategiaTitulo>
                    {typeof estrategia === 'object' && estrategia.descripcion && (
                      <EstrategiaDesc>{estrategia.descripcion}</EstrategiaDesc>
                    )}
                    {typeof estrategia === 'object' && estrategia.funcion && (
                      <EstrategiaFunc>
                        <FuncLabel>Función:</FuncLabel> {estrategia.funcion}
                      </EstrategiaFunc>
                    )}
                  </EstrategiaCard>
                ))}
              </EstrategiasList>
            ) : (
              <TextBlock $darkMode={modoOscuro}>
                <TextContent>{linguistics.estrategias_retoricas}</TextContent>
              </TextBlock>
            )}
          </Subsection>
        )}

        {/* Preguntas Críticas Sugeridas */}
        <Subsection $darkMode={modoOscuro}>
          <SubsectionTitle>Preguntas Críticas para Profundizar</SubsectionTitle>
          <PreguntasCriticas>
            <PreguntaItem $darkMode={modoOscuro}>
              <PreguntaIcon>❓</PreguntaIcon>
              <PreguntaTexto>¿Qué VOCES están presentes en este discurso? ¿Cuáles están ausentes o silenciadas?</PreguntaTexto>
            </PreguntaItem>
            <PreguntaItem $darkMode={modoOscuro}>
              <PreguntaIcon>❓</PreguntaIcon>
              <PreguntaTexto>¿Qué RELACIONES DE PODER se reproducen o cuestionan en este texto?</PreguntaTexto>
            </PreguntaItem>
            <PreguntaItem $darkMode={modoOscuro}>
              <PreguntaIcon>❓</PreguntaIcon>
              <PreguntaTexto>¿Qué se presenta como "NATURAL" o "inevitable"? ¿Qué alternativas quedan fuera del marco?</PreguntaTexto>
            </PreguntaItem>
            <PreguntaItem $darkMode={modoOscuro}>
              <PreguntaIcon>❓</PreguntaIcon>
              <PreguntaTexto>¿A qué INTERESES sirve este discurso? ¿Quién se beneficia de esta narrativa?</PreguntaTexto>
            </PreguntaItem>
          </PreguntasCriticas>
        </Subsection>
      </SectionContent>
    </Section>
  );
};

// ============================================================
// STYLED COMPONENTS
// ============================================================

const Section = styled.section`
  background: ${props => props.theme.cardBg || '#ffffff'};
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${props => props.theme.warning || '#FF9800'};
`;

const SectionIcon = styled.span`
  font-size: 1.75rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.textPrimary || '#333'};
  flex: 1;
`;

const SectionBadge = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${props => props.theme.warning || '#FF9800'};
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Subsection = styled.div`
  background: ${props => props.$darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border-radius: 8px;
  padding: 1.25rem;
`;

const SubsectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.textPrimary || '#333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:before {
    content: '▸';
    color: ${props => props.theme.warning || '#FF9800'};
    font-weight: bold;
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const Label = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.textSecondary || '#666'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Value = styled.span`
  font-size: 1rem;
  color: ${props => props.theme.textPrimary || '#333'};
  font-weight: 500;
`;

const Badge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-block;
  background: ${props => {
    switch (props.$type) {
      case 'success': return 'rgba(76,175,80,0.2)';
      case 'warning': return 'rgba(255,193,7,0.2)';
      case 'info': return 'rgba(33,150,243,0.2)';
      default: return 'rgba(158,158,158,0.2)';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#4CAF50';
      case 'warning': return '#FFA000';
      case 'info': return '#2196F3';
      default: return '#757575';
    }
  }};
`;

const TextBlock = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${props => props.$darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff'};
  border-radius: 6px;
  border: 1px solid ${props => props.$darkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'};
`;

const TextContent = styled.p`
  margin: 0.5rem 0 0 0;
  line-height: 1.6;
  color: ${props => props.theme.textSecondary || '#555'};
`;

const CriticalAlert = styled.div`
  background: ${props => props.$darkMode ? 'rgba(255,152,0,0.1)' : 'rgba(255,152,0,0.05)'};
  border: 2px solid ${props => props.$darkMode ? 'rgba(255,152,0,0.3)' : 'rgba(255,152,0,0.2)'};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
`;

const AlertIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.warning || '#FF9800'};
`;

const AlertText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${props => props.theme.textSecondary || '#555'};
`;

const MarcadoresList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MarcadorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${props => props.$darkMode ? 'rgba(255,152,0,0.1)' : 'rgba(255,152,0,0.05)'};
  border-left: 3px solid ${props => props.theme.warning || '#FF9800'};
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$darkMode ? 'rgba(255,152,0,0.15)' : 'rgba(255,152,0,0.1)'};
    transform: translateX(4px);
  }
`;

const MarcadorIcon = styled.span`
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const MarcadorText = styled.span`
  font-size: 0.95rem;
  color: ${props => props.theme.textPrimary || '#333'};
  font-weight: 500;
`;

const EstrategiasList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
`;

const EstrategiaCard = styled.div`
  background: ${props => props.$darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff'};
  border: 1px solid ${props => props.$darkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(255,152,0,0.2);
    transform: translateY(-2px);
    border-color: ${props => props.theme.warning || '#FF9800'};
  }
`;

const EstrategiaTitulo = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.warning || '#FF9800'};
`;

const EstrategiaDesc = styled.p`
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${props => props.theme.textSecondary || '#555'};
`;

const EstrategiaFunc = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${props => props.theme.textSecondary || '#666'};
`;

const FuncLabel = styled.span`
  font-weight: 600;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const PreguntasCriticas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PreguntaItem = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: ${props => props.$darkMode ? 'rgba(33,150,243,0.1)' : 'rgba(33,150,243,0.05)'};
  border-left: 3px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$darkMode ? 'rgba(33,150,243,0.15)' : 'rgba(33,150,243,0.1)'};
    transform: translateX(4px);
  }
`;

const PreguntaIcon = styled.span`
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const PreguntaTexto = styled.span`
  font-size: 0.95rem;
  line-height: 1.5;
  color: ${props => props.theme.textPrimary || '#333'};
  font-weight: 500;
`;

export default SeccionAnalisisCritico;
