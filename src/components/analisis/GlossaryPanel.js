import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';

const PanelContainer = styled.div`
  background-color: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  border: 1px solid ${props => props.theme.border};
  box-shadow: 0 2px 8px ${props => props.theme.shadow};
  animation: glossaryFadeIn 0.3s ease-out;

  @keyframes glossaryFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
  user-select: none;
`;

const Title = styled.h4`
  margin: 0;
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
`;

const ToggleIcon = styled.span`
  font-size: 1rem;
  color: ${props => props.theme.textMuted};
  display: inline-block;
  transition: transform 0.2s ease;
  transform: rotate(${props => props.$expanded ? '180deg' : '0deg'});
`;

const Badge = styled.span`
  background-color: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  background-color: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
  
  &::placeholder {
    color: ${props => props.theme.textMuted};
  }
`;

const Button = styled.button`
  padding: 8px 12px;
  background-color: ${props => props.$primary ? props.theme.primary : props.theme.surface};
  color: ${props => props.$primary ? 'white' : props.theme.text};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px ${props => props.theme.shadow};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const TermsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
  
  /* Scrollbar personalizado */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.surface};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border};
    border-radius: 4px;
    
    &:hover {
      background: ${props => props.theme.primary}50;
    }
  }
`;

const TermCard = styled.div`
  background-color: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
  animation: termSlideIn 0.25s ease-out backwards;
  animation-delay: ${props => (props.$index || 0) * 0.04}s;

  @keyframes termSlideIn {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }

  &:hover {
    border-color: ${props => props.theme.primary}50;
    box-shadow: 0 2px 6px ${props => props.theme.shadow};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const TermHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const TermName = styled.h5`
  margin: 0;
  color: ${props => props.theme.primary};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CategoryBadge = styled.span`
  background-color: ${props => getCategoryColor(props.$category, props.theme)};
  color: white;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const TermDefinition = styled.p`
  margin: 0 0 8px 0;
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const TermContext = styled.p`
  margin: 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
  line-height: 1.4;
`;

const TermMeta = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${props => props.theme.textMuted};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${props => props.theme.textMuted};
`;

// Helper para colores de categorías
function getCategoryColor(category, _theme) {
  const colors = {
    'Concepto': '#8b5cf6',
    'Técnico': '#0ea5e9',
    'Académico': '#f59e0b',
    'Cultural': '#ec4899',
    'Otro': '#6b7280'
  };
  return colors[category] || colors['Otro'];
}

/**
 * GlossaryPanel - Panel colapsable con glosario dinámico del texto
 * 
 * @param {Array} glossary - Array de términos del glosario
 * @param {boolean} loading - Estado de carga
 * @param {function} onExport - Callback para exportar glosario
 * @param {function} onTermClick - Callback al hacer click en un término (abre modal)
 * @param {object} theme - Tema actual
 */
const GlossaryPanel = ({ 
  glossary = [], 
  loading = false,
  onExport,
  onTermClick,
  theme 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('relevance'); // 'relevance' | 'alphabetical' | 'category'

  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded();
    }
  }, [toggleExpanded]);

  // Filtrar y ordenar términos
  const processedTerms = useMemo(() => {
    // Asegurar que todos los términos tengan un ID único (estable)
    let filtered = glossary.map((term, idx) => ({
      ...term,
      id: term.id || `term_${idx}_${term.termino || idx}`
    }));

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(term => 
        term.termino.toLowerCase().includes(query) ||
        term.definicion.toLowerCase().includes(query) ||
        term.categoria.toLowerCase().includes(query)
      );
    }

    // Ordenar
    if (sortOrder === 'alphabetical') {
      filtered.sort((a, b) => a.termino.localeCompare(b.termino));
    } else if (sortOrder === 'category') {
      filtered.sort((a, b) => {
        const catCompare = a.categoria.localeCompare(b.categoria);
        return catCompare !== 0 ? catCompare : a.termino.localeCompare(b.termino);
      });
    }
    // 'relevance' mantiene el orden original (IA ya lo ordenó por relevancia)

    return filtered;
  }, [glossary, searchQuery, sortOrder]);

  const handleExport = () => {
    if (onExport) {
      onExport(glossary);
    }
  };

  return (
    <PanelContainer
      theme={theme}
    >
      <Header
        onClick={toggleExpanded}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <Title theme={theme}>
          📚 Glosario Dinámico
          {glossary.length > 0 && (
            <Badge theme={theme}>{glossary.length} términos</Badge>
          )}
        </Title>
        <ToggleIcon
          theme={theme}
          $expanded={isExpanded}
          aria-hidden="true"
        >
          ▼
        </ToggleIcon>
      </Header>

      {isExpanded && (
          <div>
            {loading ? (
              <LoadingState theme={theme}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
                <div>Generando glosario con IA...</div>
              </LoadingState>
            ) : glossary.length === 0 ? (
              <EmptyState theme={theme}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📖</div>
                <div>No hay términos en el glosario</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  El glosario se genera automáticamente al analizar el texto
                </div>
              </EmptyState>
            ) : (
              <>
                <Controls>
                  <SearchInput
                    theme={theme}
                    type="text"
                    placeholder="🔍 Buscar en el glosario..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Buscar término en el glosario"
                  />
                  <Button
                    theme={theme}
                    onClick={() => setSortOrder(sortOrder === 'alphabetical' ? 'relevance' : 'alphabetical')}
                    title="Ordenar"
                  >
                    {sortOrder === 'alphabetical' ? '🔤 A-Z' : '⭐ Relevancia'}
                  </Button>
                  <Button
                    theme={theme}
                    $primary
                    onClick={handleExport}
                    title="Exportar glosario en PDF"
                  >
                    � Exportar PDF
                  </Button>
                </Controls>

                {processedTerms.length === 0 ? (
                  <EmptyState theme={theme}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔍</div>
                    <div>No se encontraron términos que coincidan con "{searchQuery}"</div>
                  </EmptyState>
                ) : (
                  <TermsList theme={theme}>
                    {processedTerms.map((term, index) => (
                      <TermCard
                        key={term.id}
                        theme={theme}
                        $index={index}
                      >
                        <TermHeader>
                          <TermName 
                            theme={theme}
                            onClick={() => onTermClick && onTermClick(term.termino)}
                            style={{ cursor: onTermClick ? 'pointer' : 'default' }}
                            title={onTermClick ? 'Click para ver definición completa' : ''}
                          >
                            {term.termino}
                            {onTermClick && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>🔍</span>}
                          </TermName>
                          <CategoryBadge $category={term.categoria} theme={theme}>
                            {term.categoria}
                          </CategoryBadge>
                        </TermHeader>
                        
                        <TermDefinition theme={theme}>
                          {term.definicion}
                        </TermDefinition>
                        
                        {term.contexto && term.contexto !== 'Contexto no especificado' && (
                          <TermContext theme={theme}>
                            💡 En este texto: {term.contexto}
                          </TermContext>
                        )}
                        
                        <TermMeta theme={theme}>
                          <span>📊 {term.nivel_complejidad}</span>
                          {term.agregado_manualmente && (
                            <span>✏️ Agregado manualmente</span>
                          )}
                        </TermMeta>
                      </TermCard>
                    ))}
                  </TermsList>
                )}
              </>
            )}
          </div>
        )}
    </PanelContainer>
  );
};

export default React.memo(GlossaryPanel);
