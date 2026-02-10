import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

/**
 * ConfirmModal — Modal accesible reutilizable para reemplazar window.confirm
 * 
 * Props:
 *   open       — boolean: controla visibilidad
 *   title      — string: título del diálogo
 *   message    — string: mensaje descriptivo
 *   confirmText— string: texto del botón confirmar (default "Confirmar")
 *   cancelText — string: texto del botón cancelar (default "Cancelar")
 *   variant    — 'danger' | 'warning' | 'info' (default 'warning')
 *   onConfirm  — () => void
 *   onCancel   — () => void
 *   theme      — objeto de tema de la app
 */

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: ${fadeIn} 0.2s ease-out;
  padding: 20px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme?.cardBg || '#fff'};
  border-radius: 16px;
  padding: 28px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: ${slideUp} 0.25s ease-out;
`;

const Title = styled.h3`
  margin: 0 0 12px;
  font-size: 1.2rem;
  color: ${({ theme }) => theme?.textPrimary || '#333'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Message = styled.p`
  margin: 0 0 24px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme?.textSecondary || '#666'};
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;

  &:focus-visible {
    outline: 2px solid #2196F3;
    outline-offset: 2px;
  }
`;

const CancelButton = styled(BaseButton)`
  background: ${({ theme }) => theme?.surface || '#f5f5f5'};
  color: ${({ theme }) => theme?.textPrimary || '#333'};
  border: 1px solid ${({ theme }) => theme?.border || '#e0e0e0'};

  &:hover {
    background: ${({ theme }) => theme?.border || '#e0e0e0'};
  }
`;

const VARIANT_COLORS = {
  danger: { bg: '#F44336', hover: '#D32F2F' },
  warning: { bg: '#FF9800', hover: '#F57C00' },
  info: { bg: '#2196F3', hover: '#1976D2' },
};

const ConfirmButton = styled(BaseButton)`
  background: ${({ $variant }) => VARIANT_COLORS[$variant]?.bg || VARIANT_COLORS.warning.bg};
  color: white;

  &:hover {
    background: ${({ $variant }) => VARIANT_COLORS[$variant]?.hover || VARIANT_COLORS.warning.hover};
  }
`;

const VARIANT_ICONS = {
  danger: '🗑️',
  warning: '⚠️',
  info: 'ℹ️',
};

const ConfirmModal = ({
  open,
  title = '¿Estás seguro?',
  message = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  onConfirm,
  onCancel,
  theme,
}) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleEscape);
    // Focus al botón cancelar al abrir
    cancelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <Overlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={onCancel}
    >
      <Card theme={theme} onClick={(e) => e.stopPropagation()}>
        <Title id="confirm-modal-title" theme={theme}>
          <span>{VARIANT_ICONS[variant] || '⚠️'}</span>
          {title}
        </Title>
        <Message theme={theme}>{message}</Message>
        <Actions>
          <CancelButton ref={cancelRef} theme={theme} onClick={onCancel}>
            {cancelText}
          </CancelButton>
          <ConfirmButton $variant={variant} onClick={onConfirm}>
            {confirmText}
          </ConfirmButton>
        </Actions>
      </Card>
    </Overlay>
  );
};

export default React.memo(ConfirmModal);
