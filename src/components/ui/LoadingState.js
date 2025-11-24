/**
 * @file Componente reutilizable para estados de carga
 * @module LoadingState
 * @version 1.0.0
 */

import React from 'react';
import * as tokens from '../../styles/designTokens';

/**
 * Spinner animado con rotación
 */
export const Spinner = React.memo(({ theme, size = 'md' }) => {
  const sizes = {
    sm: '24px',
    md: '40px',
    lg: '60px'
  };
  
  return (
    <>
      <div 
        role="status"
        aria-live="polite"
        aria-label="Cargando contenido"
        style={{ 
          width: sizes[size], 
          height: sizes[size], 
          border: `4px solid ${theme.border}`,
          borderTopColor: theme.primary,
          borderRadius: tokens.borderRadius.full,
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto'
        }}
      ></div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes spin {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        }
      `}</style>
    </>
  );
});

/**
 * Spinner con pulso (alternativa)
 */
export const PulseSpinner = React.memo(({ theme, size = 'md' }) => {
  const sizes = {
    sm: '24px',
    md: '40px',
    lg: '60px'
  };
  
  return (
    <>
      <div 
        role="status"
        aria-live="polite"
        aria-label="Procesando"
        style={{
          position: 'relative',
          width: sizes[size],
          height: sizes[size],
          margin: '0 auto'
        }}
      >
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: theme.primary,
          borderRadius: tokens.borderRadius.full,
          animation: 'pulse 1.4s ease-in-out infinite',
          opacity: 0.6
        }}></div>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: theme.secondary,
          borderRadius: tokens.borderRadius.full,
          animation: 'pulse 1.4s ease-in-out 0.7s infinite',
          opacity: 0.6
        }}></div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          50% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(0.5);
            opacity: 0.8;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
});

/**
 * Dots loader (puntos animados)
 */
export const DotsLoader = React.memo(({ theme }) => {
  return (
    <>
      <div 
        role="status"
        aria-live="polite"
        aria-label="Cargando"
        style={{
          display: 'flex',
          gap: tokens.spacing.sm,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: theme.primary,
          borderRadius: tokens.borderRadius.full,
          animation: 'bounce 1.4s ease-in-out infinite'
        }}></div>
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: theme.secondary,
          borderRadius: tokens.borderRadius.full,
          animation: 'bounce 1.4s ease-in-out 0.2s infinite'
        }}></div>
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: theme.accent,
          borderRadius: tokens.borderRadius.full,
          animation: 'bounce 1.4s ease-in-out 0.4s infinite'
        }}></div>
      </div>
      
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes bounce {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
});

/**
 * Skeleton para loading de contenido
 */
export const Skeleton = React.memo(({ theme, width = '100%', height = '20px', style = {} }) => {
  return (
    <>
      <div 
        role="status"
        aria-live="polite"
        aria-label="Cargando contenido"
        style={{
          width,
          height,
          backgroundColor: theme.border,
          borderRadius: tokens.borderRadius.md,
          animation: 'shimmer 1.5s ease-in-out infinite',
          backgroundImage: `linear-gradient(90deg, ${theme.border} 0%, ${theme.cardBg} 50%, ${theme.border} 100%)`,
          backgroundSize: '200% 100%',
          ...style
        }}
      ></div>
      
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
});

/**
 * Skeleton para tarjetas de notas
 */
export const NotasSkeletonCard = React.memo(({ theme }) => (
  <div style={{
    backgroundColor: theme.cardBg,
    padding: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
    border: `${tokens.borderWidth.normal} solid ${theme.border}`,
    marginBottom: tokens.spacing.md
  }}>
    <Skeleton theme={theme} width="60%" height="24px" style={{ marginBottom: tokens.spacing.md }} />
    <Skeleton theme={theme} width="100%" height="16px" style={{ marginBottom: tokens.spacing.sm }} />
    <Skeleton theme={theme} width="90%" height="16px" style={{ marginBottom: tokens.spacing.sm }} />
    <Skeleton theme={theme} width="85%" height="16px" />
  </div>
));

/**
 * Componente principal de estado de carga
 */
export const LoadingState = React.memo(({ 
  theme, 
  variant = 'spinner', // 'spinner', 'pulse', 'dots', 'skeleton'
  size = 'md',
  title = 'Cargando...',
  description = null,
  steps = null,
  showSkeleton = false
}) => {
  // Renderizar skeleton si se solicita
  if (showSkeleton) {
    return (
      <div style={{ padding: tokens.spacing.xl }}>
        <NotasSkeletonCard theme={theme} />
        <NotasSkeletonCard theme={theme} />
        <NotasSkeletonCard theme={theme} />
      </div>
    );
  }

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: `${tokens.spacing.xxl} ${tokens.spacing.lg}`,
      color: theme.text
    }}>
      {/* Spinner según variante */}
      <div style={{ marginBottom: tokens.spacing.lg }}>
        {variant === 'spinner' && <Spinner theme={theme} size={size} />}
        {variant === 'pulse' && <PulseSpinner theme={theme} size={size} />}
        {variant === 'dots' && <DotsLoader theme={theme} />}
      </div>
      
      {/* Título */}
      {title && (
        <h3 style={{ 
          color: theme.text,
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          margin: `0 0 ${tokens.spacing.sm} 0`
        }}>
          {title}
        </h3>
      )}
      
      {/* Descripción */}
      {description && (
        <p style={{ 
          color: theme.lightText,
          fontSize: tokens.fontSize.base,
          lineHeight: tokens.lineHeight.relaxed,
          margin: `0 0 ${tokens.spacing.lg} 0`,
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {description}
        </p>
      )}
      
      {/* Pasos de progreso */}
      {steps && Array.isArray(steps) && steps.length > 0 && (
        <div style={{
          marginTop: tokens.spacing.lg,
          textAlign: 'left',
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto',
          backgroundColor: theme.cardBg,
          padding: tokens.spacing.lg,
          borderRadius: tokens.borderRadius.lg,
          border: `${tokens.borderWidth.normal} solid ${theme.border}`
        }}>
          {steps.map((step, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                marginBottom: index < steps.length - 1 ? tokens.spacing.md : 0,
                color: step.completed ? theme.primary : theme.lightText,
                fontSize: tokens.fontSize.sm
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: tokens.borderRadius.full,
                backgroundColor: step.completed ? theme.primary : 'transparent',
                border: `2px solid ${step.completed ? theme.primary : theme.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: tokens.transition.normal
              }}>
                {step.completed && (
                  <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>
                )}
              </div>
              <span style={{ fontWeight: step.completed ? tokens.fontWeight.semibold : tokens.fontWeight.normal }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default LoadingState;
