import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * ConfirmModal - Modal accesible y reutilizable para confirmaciones.
 * Props:
 * - open: boolean
 * - title: string
 * - description: React.ReactNode
 * - confirmLabel?: string (default: 'Confirmar')
 * - cancelLabel?: string (default: 'Cancelar')
 * - onConfirm: () => void
 * - onCancel: () => void
 * - danger?: boolean (estilo rojo para confirmar)
 */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  danger = false,
}) {
  const theme = useTheme();
  const dialogRef = useRef(null);
  const overlayRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement;
    const focusFirst = () => {
      if (!dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogRef.current.focus();
      }
    };
    setTimeout(focusFirst, 0);

    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (!dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
          return;
        }
        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      try {
        if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
          previouslyFocusedRef.current.focus();
        }
      } catch {}
    };
  }, [open, onCancel]);

  const content = (
    <AnimatePresence>
      {open && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
      aria-hidden={false}
      ref={overlayRef}
      onMouseDown={(e) => {
        // Clic fuera del diálogo cierra
        if (dialogRef.current && !dialogRef.current.contains(e.target)) {
          onCancel?.();
        }
      }}
      style={{
        position: 'fixed', inset: 0,
        background: theme.name === 'dark' ? 'rgba(0,0,0,0.6)' : '#00000055',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
    >
      <motion.div
        initial={{ y: 16, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 8, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmModalTitle"
        tabIndex={-1}
        style={{
          width: '100%', maxWidth: 440,
          background: theme.surface,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          boxShadow: '0 12px 28px rgba(0,0,0,0.22)'
        }}
        onMouseDown={(e) => {
          // Prevenir que el mousedown dentro del diálogo se propague al overlay
          e.stopPropagation();
        }}
      >
        <div id="confirmModalTitle" style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}`, fontWeight: 600 }}>
          {title}
        </div>
        <div style={{ padding: '12px 16px', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {description}
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${theme.border}` }}>
          <button
            onClick={onCancel}
            style={{ padding: '6px 10px', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '6px 10px', background: danger ? theme.error : theme.primary, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(content, document.body);
}
