import React from 'react';
import styled, { keyframes } from 'styled-components';

const slideIn = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  background: ${p => p.theme.surface || '#fff'};
  border: 1px solid ${p => p.theme.border || '#e5e7eb'};
  border-radius: 8px;
  padding: 1rem 1.25rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: ${slideIn} 0.3s ease-out;
  max-width: 400px;
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${p => p.theme.border || '#e5e7eb'};
  border-top: 2px solid #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const Message = styled.div`
  font-size: 0.9rem;
  color: ${p => p.theme.text || '#111'};
  font-weight: 500;
`;

const SubMessage = styled.div`
  font-size: 0.75rem;
  color: ${p => p.theme.textSecondary || '#6b7280'};
  margin-top: 0.25rem;
`;

/**
 * Toast de búsqueda web activa
 * Mejora #2: Indicador de progreso visual
 */
export default function SearchToast({ query, resultsCount }) {
  return (
    <ToastContainer>
      <Spinner />
      <div>
        <Message>🔍 Buscando en la web...</Message>
        <SubMessage>
          {query ? `"${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"` : 'Procesando búsqueda'}
          {resultsCount > 0 && ` • ${resultsCount} resultados encontrados`}
        </SubMessage>
      </div>
    </ToastContainer>
  );
}
