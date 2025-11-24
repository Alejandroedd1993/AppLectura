/**
 * @file Componentes básicos de UI para las notas de estudio
 * @module NotasUI
 * @version 2.0.0
 */

import React from 'react';
import * as tokens from '../../styles/designTokens';
import LoadingState from '../ui/LoadingState';

/**
 * Componente de error con opción de reintento
 */
export const ErrorDisplay = React.memo(({ error, onRetry, theme, modoOscuro }) => (
  <div style={{ 
    color: theme.error, 
    padding: tokens.spacing.lg, 
    backgroundColor: modoOscuro ? 'rgba(244, 67, 54, 0.1)' : '#ffebee',
    borderRadius: tokens.borderRadius.lg,
    marginBottom: tokens.spacing.xl,
    border: `${tokens.borderWidth.normal} solid ${theme.error}`
  }}>
    <p style={{ 
      margin: `0 0 ${tokens.spacing.sm} 0`, 
      fontWeight: tokens.fontWeight.bold,
      fontSize: tokens.fontSize.lg,
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacing.xs
    }}>
      ⚠️ Error
    </p>
    <p style={{ 
      margin: 0,
      lineHeight: tokens.lineHeight.relaxed,
      fontSize: tokens.fontSize.base
    }}>
      {error}
    </p>
    
    <button 
      onClick={onRetry}
      style={{
        backgroundColor: theme.error,
        color: '#fff',
        border: 'none',
        borderRadius: tokens.borderRadius.md,
        padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
        cursor: 'pointer',
        marginTop: tokens.spacing.lg,
        fontSize: tokens.fontSize.base,
        fontWeight: tokens.fontWeight.semibold,
        minHeight: tokens.components.button.minHeight,
        transition: tokens.transition.all,
        boxShadow: tokens.boxShadow.sm
      }}
      onMouseOver={(e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = tokens.boxShadow.md;
      }}
      onMouseOut={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = tokens.boxShadow.sm;
      }}
    >
      🔄 Intentar nuevamente
    </button>
  </div>
));

/**
 * Componente de carga con spinner animado (usa LoadingState)
 */
export const LoadingSpinner = React.memo(({ theme, title, description, variant = 'pulse' }) => (
  <LoadingState
    theme={theme}
    variant={variant}
    size="lg"
    title={title || 'Generando notas de estudio...'}
    description={description || 'Analizando el texto y creando notas personalizadas para tu nivel académico'}
    steps={[
      { label: 'Analizando estructura del texto', completed: true },
      { label: 'Identificando conceptos clave', completed: true },
      { label: 'Generando notas personalizadas', completed: false },
      { label: 'Creando cronograma de repaso', completed: false }
    ]}
  />
));

/**
 * Etiqueta para conceptos clave
 */
export const ConceptoEtiqueta = React.memo(({ concepto, theme }) => (
  <span style={{
    backgroundColor: theme.accent,
    color: '#fff',
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.borderRadius.full,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    display: 'inline-block',
    transition: tokens.transition.normal,
    cursor: 'default'
  }}
  onMouseOver={(e) => {
    e.target.style.transform = 'scale(1.05)';
    e.target.style.boxShadow = tokens.boxShadow.sm;
  }}
  onMouseOut={(e) => {
    e.target.style.transform = 'scale(1)';
    e.target.style.boxShadow = 'none';
  }}>
    {concepto}
  </span>
));

/**
 * Información sobre el aprendizaje espaciado
 */
export const InfoAprendizajeEspaciado = React.memo(({ theme }) => (
  <div style={{ 
    marginTop: tokens.spacing.xl,
    padding: tokens.spacing.lg,
    backgroundColor: theme.cardBg,
    borderRadius: tokens.borderRadius.lg,
    border: `${tokens.borderWidth.normal} solid ${theme.border}`,
    boxShadow: tokens.boxShadow.sm
  }}>
    <h3 style={{ 
      color: theme.text, 
      marginTop: 0,
      marginBottom: tokens.spacing.md,
      fontSize: tokens.fontSize.lg,
      fontWeight: tokens.fontWeight.semibold,
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacing.xs
    }}>
      💡 ¿Qué es el Aprendizaje Espaciado?
    </h3>
    <p style={{ 
      color: theme.text,
      lineHeight: tokens.lineHeight.relaxed,
      margin: 0,
      fontSize: tokens.fontSize.base
    }}>
      El aprendizaje espaciado es una técnica de estudio que consiste en revisar el material en intervalos 
      crecientes de tiempo, aprovechando la curva del olvido para mejorar la retención a largo plazo.
    </p>
    <p style={{ color: theme.text }}>
      Sigue el cronograma de repaso para maximizar tu retención del material. Cada repaso refuerza 
      la memoria y hace que sea más difícil olvidar lo aprendido.
    </p>
  </div>
));
