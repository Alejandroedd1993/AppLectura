import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Panel = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 2px solid ${props => props.theme.warning || '#f59e0b'};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
`;

const Title = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Description = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textSecondary};
  line-height: 1.6;
  font-size: 0.95rem;
`;

const Checklist = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CheckItem = styled.li`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.$complete ? 
    `${props.theme.success || '#10b981'}10` : 
    `${props.theme.background}`};
  border: 1px solid ${props => props.$complete ? 
    props.theme.success || '#10b981' : 
    props.theme.border};
  border-radius: 8px;
  transition: all 0.2s ease;
`;

const CheckIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const CheckContent = styled.div`
  flex: 1;
`;

const CheckLabel = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
`;

const CheckDescription = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
  line-height: 1.4;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const Footer = styled.div`
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ProgressText = styled.div`
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
`;

const ProgressBar = styled.div`
  flex: 1;
  min-width: 150px;
  height: 8px;
  background: ${props => props.theme.border};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.theme.primary};
  border-radius: 4px;
`;

/**
 * Componente de checklist de prerequisitos pedagógicos
 * Muestra una guía amigable en lugar de error bloqueante
 */
export default function PrerequisitosChecklist({ 
  dimension, 
  faltantes = [], 
  onNavigate, 
  theme 
}) {
  const PREREQUISITOS_INFO = {
    prelecture: {
      label: 'Análisis de Pre-lectura',
      description: 'Completa el análisis académico estructurado del texto',
      action: () => onNavigate?.('prelectura')
    },
    critical_analysis: {
      label: 'Análisis Crítico del Discurso',
      description: 'Realiza el análisis ideológico y retórico del texto',
      action: () => onNavigate?.('prelectura')
    }
  };

  const DIMENSIONES_LABELS = {
    comprension_analitica: 'Comprensión Analítica',
    acd: 'Análisis Ideológico-Discursivo (ACD)',
    contextualizacion: 'Contextualización Socio-Histórica',
    argumentacion: 'Argumentación y Contraargumento',
    metacognicion_etica_ia: 'Metacognición Ética del Uso de IA'
  };

  const items = Object.keys(PREREQUISITOS_INFO).map(key => ({
    ...PREREQUISITOS_INFO[key],
    id: key,
    complete: !faltantes.includes(key)
  }));

  const completedCount = items.filter(item => item.complete).length;
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <Panel
      theme={theme}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Title theme={theme}>
        📋 Prerequisitos Pedagógicos
      </Title>

      <Description theme={theme}>
        Para evaluar tu nivel en <strong>{DIMENSIONES_LABELS[dimension]}</strong>, 
        primero necesitas completar los siguientes análisis del texto. Estos análisis 
        proporcionan el contexto necesario para generar preguntas relevantes y personalizadas.
      </Description>

      <Checklist>
        {items.map((item) => (
          <CheckItem key={item.id} $complete={item.complete} theme={theme}>
            <CheckIcon>
              {item.complete ? '✅' : '⏳'}
            </CheckIcon>
            <CheckContent>
              <CheckLabel theme={theme}>
                {item.label}
              </CheckLabel>
              <CheckDescription theme={theme}>
                {item.description}
              </CheckDescription>
            </CheckContent>
            {!item.complete && (
              <ActionButton theme={theme} onClick={item.action}>
                Completar →
              </ActionButton>
            )}
          </CheckItem>
        ))}
      </Checklist>

      <Footer theme={theme}>
        <ProgressText theme={theme}>
          {completedCount} de {totalCount} completados
        </ProgressText>
        <ProgressBar theme={theme}>
          <ProgressFill
            theme={theme}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </ProgressBar>
      </Footer>
    </Panel>
  );
}
