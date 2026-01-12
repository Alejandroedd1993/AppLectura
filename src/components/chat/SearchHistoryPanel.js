import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';

const Panel = styled.div`
  background: ${p => p.theme.surface || '#fff'};
  border: 1px solid ${p => p.theme.border || '#e5e7eb'};
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
`;

const Title = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${p => p.theme.text || '#111'};
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HistoryItem = styled.div`
  padding: 0.5rem 0.75rem;
  background: ${p => p.theme.background || '#f9fafb'};
  border: 1px solid ${p => p.theme.border || '#e5e7eb'};
  border-radius: 4px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #16a34a;
    background: ${p => p.theme.surface || '#fff'};
    transform: translateX(2px);
  }
`;

const QueryText = styled.div`
  font-size: 0.8rem;
  color: ${p => p.theme.text || '#111'};
  margin-bottom: 0.25rem;
`;

const Meta = styled.div`
  font-size: 0.7rem;
  color: ${p => p.theme.textSecondary || '#6b7280'};
  display: flex;
  gap: 0.5rem;
`;

const ClearButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: transparent;
  color: ${p => p.theme.textSecondary || '#6b7280'};
  border: none;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  margin-left: auto;
  
  &:hover {
    background: ${p => p.theme.background || '#f9fafb'};
    color: ${p => p.theme.error || '#ef4444'};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${p => p.theme.textSecondary || '#6b7280'};
  font-size: 0.8rem;
  padding: 2rem 1rem;
`;

const STORAGE_KEY = 'webSearchHistory';
const MAX_HISTORY = 10;

/**
 * Mejora #5: Historial de búsquedas web
 * Guarda y permite reutilizar búsquedas anteriores
 */
export default function SearchHistoryPanel({ onSelectQuery, disabled }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'guest';
  const storageKey = useMemo(() => `${STORAGE_KEY}:${userId}`, [userId]);

  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, [storageKey]);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
        return;
      }

      // Migración legacy (sin userId)
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(storageKey, legacy);
        localStorage.removeItem(STORAGE_KEY);
        const parsed = JSON.parse(legacy);
        setHistory(parsed);
      }
    } catch (e) {
      console.error('Error cargando historial de búsquedas:', e);
    }
  };

  const clearHistory = () => {
    if (window.confirm('¿Eliminar todo el historial de búsquedas?')) {
      localStorage.removeItem(storageKey);
      setHistory([]);
    }
  };

  const handleSelectQuery = (item) => {
    if (disabled) return;
    onSelectQuery?.(item.query, item.config);
  };

  if (history.length === 0) {
    return (
      <Panel>
        <Title>📚 Historial de búsquedas</Title>
        <EmptyState>
          No hay búsquedas guardadas aún.
          <br />
          Las búsquedas web se guardarán automáticamente aquí.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <Panel>
      <Title>
        📚 Historial de búsquedas
        <ClearButton onClick={clearHistory} title="Limpiar historial">
          🗑️ Limpiar
        </ClearButton>
      </Title>
      {history.map((item, idx) => (
        <HistoryItem
          key={idx}
          onClick={() => handleSelectQuery(item)}
          style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <QueryText>{item.query}</QueryText>
          <Meta>
            <span>{item.resultsCount || 0} resultados</span>
            <span>•</span>
            <span>{new Date(item.timestamp).toLocaleDateString('es-ES')}</span>
            {item.config && <span>• {item.config}</span>}
          </Meta>
        </HistoryItem>
      ))}
    </Panel>
  );
}

/**
 * Función helper para guardar en el historial
 */
export function saveSearchToHistory(query, resultsCount, config = 'rapida') {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let history = stored ? JSON.parse(stored) : [];
    
    // Evitar duplicados recientes (últimos 3)
    const isDuplicate = history.slice(0, 3).some(h => h.query === query);
    if (isDuplicate) return;
    
    const newEntry = {
      query,
      resultsCount,
      config,
      timestamp: Date.now()
    };
    
    history.unshift(newEntry);
    history = history.slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Error guardando en historial:', e);
  }
}

/**
 * Variante scopeada por usuario. Si no se provee userId, usa 'guest'.
 */
export function saveSearchToHistoryForUser(userId, query, resultsCount, config = 'rapida') {
  const resolvedUserId = userId || 'guest';
  const scopedKey = `${STORAGE_KEY}:${resolvedUserId}`;

  try {
    const stored = localStorage.getItem(scopedKey);
    let history = stored ? JSON.parse(stored) : [];

    const isDuplicate = history.slice(0, 3).some(h => h.query === query);
    if (isDuplicate) return;

    const newEntry = {
      query,
      resultsCount,
      config,
      timestamp: Date.now()
    };

    history.unshift(newEntry);
    history = history.slice(0, MAX_HISTORY);

    localStorage.setItem(scopedKey, JSON.stringify(history));
  } catch (e) {
    console.error('Error guardando en historial:', e);
  }
}
