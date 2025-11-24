/**
 * SessionFilters - Panel de filtros avanzados para historial
 * Incluye: búsqueda, filtros por fecha/estado, ordenamiento
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const SessionFilters = ({ onFiltersChange, totalSessions, theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    searchQuery: '',
    dateRange: 'all', // all, today, week, month, custom
    hasAnalysis: 'all', // all, yes, no
    hasProgress: 'all', // all, yes, no
    sortBy: 'recent', // recent, oldest, progress, words
    syncStatus: 'all' // all, synced, local, cloud
  });

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const resetFilters = () => {
    const defaultFilters = {
      searchQuery: '',
      dateRange: 'all',
      hasAnalysis: 'all',
      hasProgress: 'all',
      sortBy: 'recent',
      syncStatus: 'all'
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.hasAnalysis !== 'all') count++;
    if (filters.hasProgress !== 'all') count++;
    if (filters.syncStatus !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <FiltersContainer theme={theme}>
      {/* Header con toggle */}
      <FiltersHeader theme={theme} onClick={() => setIsExpanded(!isExpanded)}>
        <HeaderLeft>
          <FilterIcon>🔍</FilterIcon>
          <FilterTitle theme={theme}>
            Filtros y Ordenamiento
          </FilterTitle>
          {activeFiltersCount > 0 && (
            <ActiveBadge theme={theme}>
              {activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}
            </ActiveBadge>
          )}
        </HeaderLeft>
        <ExpandButton $expanded={isExpanded}>▼</ExpandButton>
      </FiltersHeader>

      {/* Panel expandible */}
      <AnimatePresence>
        {isExpanded && (
          <FiltersPanel
            theme={theme}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Búsqueda */}
            <FilterGroup theme={theme}>
              <FilterLabel theme={theme}>🔎 Buscar por título o contenido</FilterLabel>
              <SearchInput
                theme={theme}
                type="text"
                placeholder="Escribe para buscar..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              />
            </FilterGroup>

            {/* Fila de filtros principales */}
            <FiltersRow>
              {/* Rango de fecha */}
              <FilterGroup theme={theme}>
                <FilterLabel theme={theme}>📅 Fecha</FilterLabel>
                <Select
                  theme={theme}
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="today">Hoy</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mes</option>
                  <option value="custom">Personalizado</option>
                </Select>
              </FilterGroup>

              {/* Estado de sincronización */}
              <FilterGroup theme={theme}>
                <FilterLabel theme={theme}>☁️ Sincronización</FilterLabel>
                <Select
                  theme={theme}
                  value={filters.syncStatus}
                  onChange={(e) => handleFilterChange('syncStatus', e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="synced">Sincronizadas</option>
                  <option value="local">Solo local</option>
                  <option value="cloud">Solo nube</option>
                </Select>
              </FilterGroup>

              {/* Tiene análisis */}
              <FilterGroup theme={theme}>
                <FilterLabel theme={theme}>✅ Análisis</FilterLabel>
                <Select
                  theme={theme}
                  value={filters.hasAnalysis}
                  onChange={(e) => handleFilterChange('hasAnalysis', e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="yes">Con análisis</option>
                  <option value="no">Sin análisis</option>
                </Select>
              </FilterGroup>

              {/* Tiene progreso */}
              <FilterGroup theme={theme}>
                <FilterLabel theme={theme}>📊 Progreso</FilterLabel>
                <Select
                  theme={theme}
                  value={filters.hasProgress}
                  onChange={(e) => handleFilterChange('hasProgress', e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="yes">Con progreso</option>
                  <option value="no">Sin progreso</option>
                </Select>
              </FilterGroup>
            </FiltersRow>

            {/* Ordenamiento */}
            <FilterGroup theme={theme}>
              <FilterLabel theme={theme}>🔄 Ordenar por</FilterLabel>
              <SortOptions theme={theme}>
                <SortButton
                  theme={theme}
                  $active={filters.sortBy === 'recent'}
                  onClick={() => handleFilterChange('sortBy', 'recent')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  📅 Más reciente
                </SortButton>
                <SortButton
                  theme={theme}
                  $active={filters.sortBy === 'oldest'}
                  onClick={() => handleFilterChange('sortBy', 'oldest')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🕒 Más antiguo
                </SortButton>
                <SortButton
                  theme={theme}
                  $active={filters.sortBy === 'progress'}
                  onClick={() => handleFilterChange('sortBy', 'progress')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  📈 Mayor progreso
                </SortButton>
                <SortButton
                  theme={theme}
                  $active={filters.sortBy === 'words'}
                  onClick={() => handleFilterChange('sortBy', 'words')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  📄 Más palabras
                </SortButton>
              </SortOptions>
            </FilterGroup>

            {/* Botón reset */}
            {activeFiltersCount > 0 && (
              <ResetButton
                theme={theme}
                onClick={resetFilters}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🔄 Restablecer filtros
              </ResetButton>
            )}
          </FiltersPanel>
        )}
      </AnimatePresence>

      {/* Resumen de resultados */}
      <ResultsSummary theme={theme}>
        Mostrando <strong>{totalSessions}</strong> sesión{totalSessions !== 1 ? 'es' : ''}
      </ResultsSummary>
    </FiltersContainer>
  );
};

// Styled Components

const FiltersContainer = styled.div`
  background: ${props => props.theme.surface || '#FFFFFF'};
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const FiltersHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  cursor: pointer;
  background: ${props => props.theme.surface};
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.background || '#F6F8FA'};
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const FilterIcon = styled.span`
  font-size: 1.2rem;
`;

const FilterTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const ActiveBadge = styled.span`
  padding: 0.25rem 0.5rem;
  background: ${props => props.theme.primary || '#3190FC'}20;
  color: ${props => props.theme.primary || '#3190FC'};
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const ExpandButton = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s;
`;

const FiltersPanel = styled(motion.div)`
  padding: 0 1.25rem 1rem 1.25rem;
  overflow: hidden;
`;

const FilterGroup = styled.div`
  margin-bottom: 1rem;
`;

const FilterLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: ${props => props.theme.text};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  border-radius: 8px;
  font-size: 0.9rem;
  color: ${props => props.theme.text};
  background: ${props => props.theme.surface};
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary || '#3190FC'};
    box-shadow: 0 0 0 3px ${props => props.theme.primary || '#3190FC'}20;
  }

  &::placeholder {
    color: ${props => props.theme.textMuted};
  }
`;

const FiltersRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid ${props => props.theme.border || '#E4EAF1'};
  border-radius: 8px;
  font-size: 0.85rem;
  color: ${props => props.theme.text};
  background: ${props => props.theme.surface};
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary || '#3190FC'};
    box-shadow: 0 0 0 3px ${props => props.theme.primary || '#3190FC'}20;
  }
`;

const SortOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
`;

const SortButton = styled(motion.button)`
  padding: 0.65rem 1rem;
  border: 1px solid ${props => props.$active 
    ? props.theme.primary || '#3190FC' 
    : props.theme.border || '#E4EAF1'};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  background: ${props => props.$active 
    ? props.theme.primary || '#3190FC'
    : props.theme.surface};
  color: ${props => props.$active 
    ? 'white'
    : props.theme.text};
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${props => props.theme.primary || '#3190FC'}30;
  }
`;

const ResetButton = styled(motion.button)`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  background: ${props => props.theme.surface};
  color: ${props => props.theme.textMuted};
  margin-top: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.theme.background};
    color: ${props => props.theme.text};
  }
`;

const ResultsSummary = styled.div`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${props => props.theme.border};
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
  background: ${props => props.theme.background || '#F6F8FA'};

  strong {
    color: ${props => props.theme.text};
    font-weight: 600;
  }
`;

export default SessionFilters;
