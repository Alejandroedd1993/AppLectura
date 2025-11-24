import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const CardContainer = styled.div`
  background: ${props => props.theme?.cardBg || '#ffffff'};
  border: 1px solid ${props => props.theme?.border || '#dddddd'};
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: all 0.3s ease;
  min-height: 140px;
  position: relative;
  
  &:hover {
    ${props => props.clickable && `
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    `}
  }
`;

const Title = styled.h3`
  color: ${props => props.theme?.text || '#333333'};
  font-size: 1.1rem;
  margin-bottom: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border-bottom: 2px solid ${props => props.theme?.border || '#eeeeee'};
  padding-bottom: 8px;
`;

const Content = styled.div`
  color: ${props => props.theme?.textMuted || '#666666'};
  font-size: 0.95rem;
  line-height: 1.6;
  width: 100%;
  flex: 1;
  
  ${props => !props.expanded && `
    max-height: 100px;
    overflow: hidden;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 40px;
      width: 100%;
      background: linear-gradient(transparent, ${props.theme?.cardBg || '#ffffff'});
      pointer-events: none;
    }
  `}
`;

const ExpandButton = styled.button`
  background: ${props => props.theme?.primary || '#007bff'};
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.85rem;
  margin-top: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  align-self: center;
  font-weight: 500;
  
  &:hover {
    background: ${props => props.theme?.primaryDark || '#0056b3'};
    transform: translateY(-1px);
  }
`;

const ListContainer = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
  width: 100%;
`;

const ListItem = styled.li`
  padding: 6px 0;
  border-bottom: 1px solid ${props => props.theme?.border || '#eeeeee'};
  color: ${props => props.theme?.text || '#333333'};
  
  &:last-child {
    border-bottom: none;
  }
`;

const ObjectContainer = styled.div`
  text-align: left;
  width: 100%;
`;

const ObjectItem = styled.div`
  margin: 10px 0;
  padding: 8px 0;
  border-bottom: 1px solid ${props => props.theme?.border || '#eeeeee'};
  
  &:last-child {
    border-bottom: none;
  }
  
  strong {
    color: ${props => props.theme?.primary || '#007bff'};
    text-transform: capitalize;
  }
`;

const VocabularyContainer = styled.div`
  text-align: left;
  width: 100%;
`;

const VocabularyItem = styled.div`
  margin: 12px 0;
  padding: 12px;
  background: ${props => props.theme?.background || '#f8f9fa'};
  border-radius: 8px;
  border-left: 4px solid ${props => props.theme?.primary || '#007bff'};
  
  .word {
    font-weight: bold;
    color: ${props => props.theme?.primary || '#007bff'};
    font-size: 1rem;
    margin-bottom: 4px;
  }
  
  .definition {
    font-size: 0.9rem;
    color: ${props => props.theme?.textMuted || '#666666'};
    line-height: 1.4;
  }
`;

const EmptyState = styled.div`
  color: ${props => props.theme?.textMuted || '#999999'};
  font-style: italic;
  padding: 30px 20px;
  text-align: center;
  background: ${props => props.theme?.background || '#f8f9fa'};
  border-radius: 8px;
  border: 2px dashed ${props => props.theme?.border || '#dddddd'};
`;

const StatsCard = ({ title, content, value, type = 'text', theme, maxPreviewLength = 200 }) => {
  const [expanded, setExpanded] = useState(false);

  // Si es el formato antiguo (solo value)
  if (value !== undefined) {
    return (
      <CardContainer theme={theme}>
        <Title theme={theme}>{title}</Title>
        <Content theme={theme}>{value}</Content>
      </CardContainer>
    );
  }

  // Si no hay contenido
  if (!content || (Array.isArray(content) && content.length === 0) || 
      (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <CardContainer theme={theme}>
        <Title theme={theme}>{title}</Title>
        <EmptyState theme={theme}>No hay información disponible</EmptyState>
      </CardContainer>
    );
  }

  const renderContent = () => {
    switch (type) {
      case 'list':
        if (!Array.isArray(content)) return <EmptyState theme={theme}>No hay datos disponibles</EmptyState>;
        return (
          <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ListContainer>
              {content.slice(0, expanded ? content.length : 4).map((item, index) => (
                <ListItem key={index} theme={theme}>• {item}</ListItem>
              ))}
            </ListContainer>
            {content.length > 4 && (
              <ExpandButton 
                theme={theme} 
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? `↑ Mostrar menos` : `↓ Ver todas (${content.length} elementos)`}
              </ExpandButton>
            )}
          </div>
        );

      case 'object':
        if (!content || typeof content !== 'object') return <EmptyState theme={theme}>No hay datos disponibles</EmptyState>;
        return (
          <div style={{ width: '100%', flex: 1 }}>
            <ObjectContainer>
              {Object.entries(content).map(([key, value]) => (
                <ObjectItem key={key} theme={theme}>
                  <strong>{key}:</strong> {value}
                </ObjectItem>
              ))}
            </ObjectContainer>
          </div>
        );

      case 'vocabulary':
        if (!Array.isArray(content)) return <EmptyState theme={theme}>No hay vocabulario disponible</EmptyState>;
        return (
          <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <VocabularyContainer>
              {content.slice(0, expanded ? content.length : 3).map((item, index) => (
                <VocabularyItem key={index} theme={theme}>
                  <div className="word">{item.palabra}</div>
                  <div className="definition">{item.definicion}</div>
                </VocabularyItem>
              ))}
            </VocabularyContainer>
            {content.length > 3 && (
              <ExpandButton 
                theme={theme} 
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? `↑ Mostrar menos` : `↓ Ver todo el vocabulario (${content.length} términos)`}
              </ExpandButton>
            )}
          </div>
        );

      default:
        // Tipo texto
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        const shouldTruncate = text.length > maxPreviewLength;
        
        return (
          <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Content expanded={expanded} theme={theme}>
              {expanded ? text : (shouldTruncate ? text.substring(0, maxPreviewLength) + '...' : text)}
            </Content>
            {shouldTruncate && (
              <ExpandButton 
                theme={theme} 
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? '↑ Mostrar menos' : '↓ Ver completo'}
              </ExpandButton>
            )}
          </div>
        );
    }
  };

  return (
    <CardContainer theme={theme} clickable={false}>
      <Title theme={theme}>{title}</Title>
      {renderContent()}
    </CardContainer>
  );
};

export default StatsCard;
