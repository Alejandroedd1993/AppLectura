import React, { useState } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 0.75rem;
  
  /* Mejor soporte móvil */
  @media (max-width: 600px) {
    padding: 0;
    align-items: flex-end;
  }
`;

const Modal = styled.div`
  background: ${p => p.theme?.surface || '#fff'};
  border-radius: 12px;
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  
  /* Responsividad móvil */
  @media (max-width: 600px) {
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
    max-width: 100%;
  }
`;

const Header = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${p => p.theme?.border || '#e5e7eb'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, ${p => p.theme?.primary || '#3190FC'} 0%, ${p => p.theme?.primaryDark || '#1F7EEB'} 100%);
  color: #fff;
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 600px) {
    font-size: 0.9rem;
  }
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 1.1rem;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  min-height: 0; /* Importante para flex scroll */
  
  @media (max-width: 600px) {
    padding: 0.75rem 1rem;
  }
`;

const InfoBanner = styled.div`
  background: ${p => p.theme?.primary || '#3190FC'}10;
  border-left: 4px solid ${p => p.theme?.primary || '#3190FC'};
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  color: ${p => p.theme?.text || '#222'};
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ResultCard = styled.div`
  border: 1px solid ${p => p.$selected ? (p.theme?.primary || '#3190FC') : (p.theme?.border || '#e5e7eb')};
  border-radius: 8px;
  padding: 0.875rem;
  background: ${p => p.$selected ? (p.theme?.primary || '#3190FC') + '08' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    border-color: ${p => p.theme?.primary || '#3190FC'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 600px) {
    padding: 0.75rem;
  }
`;

const Checkbox = styled.input`
  position: absolute;
  top: 0.875rem;
  right: 0.875rem;
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${p => p.theme?.primary || '#3190FC'};
`;

const ResultTitle = styled.h3`
  margin: 0 0 0.4rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${p => p.theme?.primary || '#3190FC'};
  padding-right: 2rem;
  line-height: 1.35;
`;

const ResultUrl = styled.a`
  font-size: 0.7rem;
  color: ${p => p.theme?.success || '#059669'};
  text-decoration: none;
  display: block;
  margin-bottom: 0.4rem;
  word-break: break-all;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ResultSnippet = styled.p`
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: ${p => p.theme?.textSecondary || '#666'};
  
  /* Limitar a 4 líneas */
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Footer = styled.div`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${p => p.theme?.border || '#e5e7eb'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${p => p.theme?.background || '#f9fafb'};
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0.5rem;
  
  @media (max-width: 600px) {
    padding: 0.75rem 1rem;
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const SelectionInfo = styled.div`
  font-size: 0.8rem;
  color: ${p => p.theme?.textSecondary || '#666'};
  
  @media (max-width: 600px) {
    text-align: center;
    width: 100%;
  }
`;

const ActionBtn = styled.button`
  padding: 0.6rem 1.25rem;
  background: ${p => p.$secondary ? 'transparent' : (p.theme?.primary || '#3190FC')};
  color: ${p => p.$secondary ? (p.theme?.text || '#222') : '#fff'};
  border: 1px solid ${p => p.$secondary ? (p.theme?.border || '#ccc') : 'transparent'};
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 600px) {
    flex: 1;
    min-width: 120px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  
  @media (max-width: 600px) {
    width: 100%;
  }
`;

export default function WebSearchResultsModal({
  results = [],
  query = '',
  onClose,
  onSendToTutor
}) {
  const [selectedResults, setSelectedResults] = useState(
    results.map((_, idx) => idx) // Por defecto, todos seleccionados
  );

  const toggleResult = (index) => {
    setSelectedResults(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleAll = () => {
    if (selectedResults.length === results.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(results.map((_, idx) => idx));
    }
  };

  const handleSendToTutor = () => {
    const selected = results.filter((_, idx) => selectedResults.includes(idx));
    onSendToTutor(selected);
    onClose();
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            🌐 Resultados de Búsqueda Web
          </Title>
          <CloseBtn onClick={onClose} title="Cerrar">✕</CloseBtn>
        </Header>

        <Content>
          <InfoBanner>
            <strong>📊 Se encontraron {results.length} resultados</strong> para la búsqueda:
            <em style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.9em' }}>
              "{query}"
            </em>
            <div style={{ marginTop: '0.75rem', fontSize: '0.85em', opacity: 0.9 }}>
              💡 Selecciona los resultados que deseas enviar al tutor. Puedes desmarcar los que no sean relevantes.
            </div>
          </InfoBanner>

          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
              No se encontraron resultados
            </div>
          ) : (
            <ResultsList>
              {results.map((result, idx) => (
                <ResultCard
                  key={idx}
                  $selected={selectedResults.includes(idx)}
                  onClick={() => toggleResult(idx)}
                >
                  <Checkbox
                    type="checkbox"
                    checked={selectedResults.includes(idx)}
                    onChange={() => toggleResult(idx)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ResultTitle>{result.title || 'Sin título'}</ResultTitle>
                  <ResultUrl
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.url}
                  </ResultUrl>
                  <ResultSnippet>{result.snippet || 'Sin descripción disponible'}</ResultSnippet>
                  {result.publishedDate && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#999' }}>
                      📅 {result.publishedDate}
                    </div>
                  )}
                </ResultCard>
              ))}
            </ResultsList>
          )}
        </Content>

        <Footer>
          <SelectionInfo>
            {selectedResults.length} de {results.length} resultados seleccionados
            {selectedResults.length > 0 && (
              <button
                onClick={toggleAll}
                style={{
                  marginLeft: '1rem',
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.85rem'
                }}
              >
                {selectedResults.length === results.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            )}
          </SelectionInfo>
          <ButtonGroup>
            <ActionBtn $secondary onClick={onClose}>
              Cancelar
            </ActionBtn>
            <ActionBtn
              onClick={handleSendToTutor}
              disabled={selectedResults.length === 0}
            >
              Enviar al Tutor ({selectedResults.length})
            </ActionBtn>
          </ButtonGroup>
        </Footer>
      </Modal>
    </Overlay>
  );
}
