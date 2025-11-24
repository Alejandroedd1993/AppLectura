import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

const ModalContainer = styled(motion.div)`
  background-color: ${props => props.theme.background};
  border-radius: 16px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.theme.border};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
`;

const Title = styled.h3`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme.textMuted};
  transition: color 0.2s;
  padding: 4px;
  line-height: 1;
  
  &:hover {
    color: ${props => props.theme.text};
  }
`;

const Section = styled.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 8px 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Content = styled.div`
  color: ${props => props.theme.text};
  line-height: 1.6;
  font-size: 0.95rem;
`;

const ActionButton = styled.button`
  padding: 10px 16px;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.primary}dd;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${props => props.theme.textMuted};
`;

const TagContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const Tag = styled.span`
  padding: 4px 8px;
  background-color: ${props => props.theme.surface};
  color: ${props => props.theme.textMuted};
  border-radius: 6px;
  font-size: 0.8rem;
  border: 1px solid ${props => props.theme.border};
`;

/**
 * TermDefinitionModal - Modal con definición contextual de un término
 * 
 * @param {string} term - Término a definir
 * @param {object} definition - Objeto con definición, contexto, relacionados
 * @param {boolean} isOpen - Estado de apertura del modal
 * @param {function} onClose - Callback para cerrar
 * @param {function} onWebSearch - Callback para buscar en web
 * @param {boolean} loading - Estado de carga
 * @param {object} theme - Tema actual
 */
const TermDefinitionModal = ({ 
  term, 
  definition, 
  isOpen, 
  onClose, 
  onWebSearch,
  loading,
  theme 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContainer
            theme={theme}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Header>
              <Title theme={theme}>
                📖 {term}
              </Title>
              <CloseButton theme={theme} onClick={onClose}>
                ×
              </CloseButton>
            </Header>

            {loading ? (
              <LoadingState theme={theme}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
                <div>Generando definición contextual...</div>
              </LoadingState>
            ) : definition ? (
              <>
                {definition.definicion && (
                  <Section>
                    <SectionTitle theme={theme}>💡 Definición</SectionTitle>
                    <Content theme={theme}>{definition.definicion}</Content>
                  </Section>
                )}

                {definition.contexto_en_texto && (
                  <Section>
                    <SectionTitle theme={theme}>📄 En este texto</SectionTitle>
                    <Content theme={theme}>{definition.contexto_en_texto}</Content>
                  </Section>
                )}

                {definition.conceptos_relacionados && definition.conceptos_relacionados.length > 0 && (
                  <Section>
                    <SectionTitle theme={theme}>🔗 Conceptos relacionados</SectionTitle>
                    <TagContainer>
                      {definition.conceptos_relacionados.map((concepto, idx) => (
                        <Tag key={idx} theme={theme}>{concepto}</Tag>
                      ))}
                    </TagContainer>
                  </Section>
                )}

                {definition.nivel_complejidad && (
                  <Section>
                    <SectionTitle theme={theme}>📊 Nivel de complejidad</SectionTitle>
                    <Content theme={theme}>{definition.nivel_complejidad}</Content>
                  </Section>
                )}

                <Section style={{ marginTop: '20px' }}>
                  <ActionButton theme={theme} onClick={() => onWebSearch(term)}>
                    🌐 Buscar más información en web
                  </ActionButton>
                </Section>
              </>
            ) : (
              <Content theme={theme}>No se pudo cargar la definición.</Content>
            )}
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default TermDefinitionModal;
