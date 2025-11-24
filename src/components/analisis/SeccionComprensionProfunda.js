/**
 * Sección de Comprensión Profunda
 * Muestra: Resumen, Temas, Estructura Argumentativa, Figuras Retóricas
 * MIGRADO desde PreLectura (argumentación + figuras retóricas)
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const SeccionComprensionProfunda = ({ analysis, prelecture, modoOscuro }) => {
  if (!analysis && !prelecture) return null;

  const { resumen, temas_principales } = analysis || {};
  const { argumentation, linguistics } = prelecture || {};

  return (
    <Section
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <SectionHeader>
        <SectionIcon>📊</SectionIcon>
        <SectionTitle>Comprensión Profunda</SectionTitle>
      </SectionHeader>

      <SectionContent>
        {/* Resumen Ejecutivo */}
        {resumen && (
          <Subsection $darkMode={modoOscuro}>
            <SubsectionTitle>Resumen Ejecutivo</SubsectionTitle>
            <ResumenText>{resumen}</ResumenText>
          </Subsection>
        )}

        {/* Temas Principales */}
        {temas_principales && temas_principales.length > 0 && (
          <Subsection $darkMode={modoOscuro}>
            <SubsectionTitle>Temas Principales</SubsectionTitle>
            <TemasList>
              {temas_principales.map((tema, index) => (
                <TemaItem key={index} $darkMode={modoOscuro}>
                  <TemaIcon>🎯</TemaIcon>
                  <TemaText>{tema}</TemaText>
                </TemaItem>
              ))}
            </TemasList>
          </Subsection>
        )}

        {/* MIGRADO: Estructura Argumentativa desde PreLectura */}
        {argumentation && (
          <Subsection $darkMode={modoOscuro}>
            <SubsectionTitle>Estructura Argumentativa</SubsectionTitle>
            
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

            {argumentation.argumentos_principales?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <ListTitle>Argumentos Principales:</ListTitle>
                {argumentation.argumentos_principales.map((arg, index) => (
                  <ArgumentCard key={index} $darkMode={modoOscuro}>
                    <ArgumentText>{arg.argumento || arg}</ArgumentText>
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
              </div>
            )}
          </Subsection>
        )}

        {/* MIGRADO: Figuras Retóricas desde PreLectura */}
        {linguistics?.figuras_retoricas?.length > 0 && (
          <Subsection $darkMode={modoOscuro}>
            <SubsectionTitle>Figuras Retóricas</SubsectionTitle>
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
          </Subsection>
        )}
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
  border-bottom: 2px solid ${props => props.theme.primary || '#2196F3'};
`;

const SectionIcon = styled.span`
  font-size: 1.75rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.textPrimary || '#333'};
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
    color: ${props => props.theme.primary || '#2196F3'};
    font-weight: bold;
  }
`;

const ResumenText = styled.p`
  margin: 0;
  line-height: 1.7;
  color: ${props => props.theme.textSecondary || '#555'};
  font-size: 1rem;
`;

const TemasList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TemaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${props => props.$darkMode ? 'rgba(33,150,243,0.1)' : 'rgba(33,150,243,0.05)'};
  border-left: 3px solid ${props => props.theme.primary || '#2196F3'};
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$darkMode ? 'rgba(33,150,243,0.15)' : 'rgba(33,150,243,0.1)'};
    transform: translateX(4px);
  }
`;

const TemaIcon = styled.span`
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const TemaText = styled.span`
  font-size: 0.95rem;
  color: ${props => props.theme.textPrimary || '#333'};
  font-weight: 500;
`;

const Highlight = styled.div`
  background: ${props => props.$darkMode ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)'};
  border-left: 4px solid ${props => props.theme.success || '#4CAF50'};
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const HighlightLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.success || '#4CAF50'};
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
`;

const HighlightContent = styled.p`
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: ${props => props.theme.textPrimary || '#333'};
  font-weight: 500;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
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

const ListTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${props => props.theme.textSecondary || '#666'};
`;

const ArgumentCard = styled.div`
  background: ${props => props.$darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff'};
  border: 1px solid ${props => props.$darkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const ArgumentText = styled.p`
  margin: 0 0 0.75rem 0;
  line-height: 1.6;
  color: ${props => props.theme.textPrimary || '#333'};
`;

const ArgumentMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
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

const FigurasList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
`;

const FiguraItem = styled.div`
  background: ${props => props.$darkMode ? 'rgba(156,39,176,0.1)' : 'rgba(156,39,176,0.05)'};
  border: 1px solid ${props => props.$darkMode ? 'rgba(156,39,176,0.3)' : 'rgba(156,39,176,0.2)'};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$darkMode ? 'rgba(156,39,176,0.15)' : 'rgba(156,39,176,0.1)'};
    transform: translateY(-2px);
  }
`;

const FiguraTipo = styled.div`
  font-weight: 600;
  color: ${props => props.$darkMode ? '#CE93D8' : '#9C27B0'};
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConfidenceBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
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
  font-style: italic;
  color: ${props => props.theme.textSecondary || '#666'};
  font-size: 0.9rem;
  line-height: 1.5;
  padding-left: 0.75rem;
  border-left: 2px solid ${props => props.$darkMode ? 'rgba(206,147,216,0.3)' : 'rgba(156,39,176,0.3)'};
`;

const FiguraJustificacion = styled.div`
  font-size: 0.85rem;
  color: ${props => props.$darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'};
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${props => props.$darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  line-height: 1.4;
`;

export default SeccionComprensionProfunda;
