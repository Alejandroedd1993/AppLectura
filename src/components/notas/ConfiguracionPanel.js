/**
 * @file Panel de configuración para las notas de estudio
 * @module ConfiguracionPanel
 * @version 2.0.0
 */

import React from 'react';
import * as tokens from '../../styles/designTokens';

/**
 * Panel de configuración para personalizar la generación de notas
 * @param {Object} props - Propiedades del componente
 * @param {string} props.nivelAcademico - Nivel académico del estudiante (FASE 3)
 * @param {Function} props.setNivelAcademico - Función para cambiar el nivel académico
 */
const ConfiguracionPanel = React.memo(({ 
  theme, 
  tipoTexto, 
  setTipoTexto, 
  duracionEstudio, 
  setDuracionEstudio,
  regenerarNotas,
  nivelAcademico,
  setNivelAcademico
}) => {

  return (
    <div style={{
      backgroundColor: theme.cardBg,
      borderRadius: tokens.borderRadius.lg,
      padding: tokens.spacing.lg,
      marginTop: tokens.spacing.md,
      marginBottom: tokens.spacing.lg,
      border: `${tokens.borderWidth.thin} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.md
    }} id="panel-configuracion">
      <h3 style={{ 
        color: theme.text, 
        marginTop: 0,
        marginBottom: tokens.spacing.lg,
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.semibold,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm
      }}>
        ⚙️ Configuración de Notas
      </h3>
      
      {/* Grupo: Tipo de texto */}
      <div style={{
        marginBottom: tokens.spacing.lg,
        padding: tokens.spacing.md,
        backgroundColor: theme.background,
        borderRadius: tokens.borderRadius.md,
        border: `${tokens.borderWidth.thin} solid ${theme.border}`
      }}>
        <label 
          htmlFor="tipo-texto" 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            marginBottom: tokens.spacing.sm,
            color: theme.text,
            fontWeight: tokens.fontWeight.semibold,
            fontSize: tokens.fontSize.base
          }}
        >
          📄 Tipo de texto
        </label>
        <select 
          id="tipo-texto"
          value={tipoTexto}
          onChange={(e) => setTipoTexto(e.target.value)}
          style={{
            width: '100%',
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            borderRadius: tokens.borderRadius.md,
            border: `${tokens.borderWidth.thin} solid ${theme.border}`,
            backgroundColor: theme.background,
            color: theme.text,
            fontSize: tokens.fontSize.base,
            cursor: 'pointer',
            minHeight: tokens.components.input.minHeight,
            transition: tokens.transition.normal
          }}
        >
          <option value="auto">Detección automática</option>
          <option value="narrativo">Narrativo</option>
          <option value="poetico">Poético</option>
          <option value="filosofico">Filosófico</option>
          <option value="ensayo">Ensayo</option>
        </select>
        <p style={{
          color: theme.lightText,
          fontSize: tokens.fontSize.sm,
          margin: `${tokens.spacing.sm} 0 0 0`,
          lineHeight: tokens.lineHeight.normal
        }}>
          Selecciona el tipo o deja que la IA lo detecte automáticamente
        </p>
      </div>

      {/* 🆕 FASE 3: Selector de nivel académico */}
      {nivelAcademico !== undefined && setNivelAcademico && (
        <div style={{
          marginBottom: tokens.spacing.lg,
          padding: tokens.spacing.md,
          backgroundColor: theme.background,
          borderRadius: tokens.borderRadius.md,
          border: `${tokens.borderWidth.thin} solid ${theme.border}`
        }}>
          <label 
            htmlFor="nivel-academico" 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.xs,
              marginBottom: tokens.spacing.sm,
              color: theme.text,
              fontWeight: tokens.fontWeight.semibold,
              fontSize: tokens.fontSize.base
            }}
          >
            📚 Nivel académico
          </label>
          <select 
            id="nivel-academico"
            value={nivelAcademico}
            onChange={(e) => setNivelAcademico(e.target.value)}
            style={{
              width: '100%',
              padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
              borderRadius: tokens.borderRadius.md,
              border: `${tokens.borderWidth.thin} solid ${theme.border}`,
              backgroundColor: theme.background,
              color: theme.text,
              fontSize: tokens.fontSize.base,
              cursor: 'pointer',
              minHeight: tokens.components.input.minHeight,
              transition: tokens.transition.normal
            }}
          >
            <option value="secundaria">Secundaria (básico)</option>
            <option value="pregrado">Pregrado / Licenciatura (intermedio)</option>
            <option value="posgrado">Posgrado / Maestría (avanzado)</option>
            <option value="doctorado">Doctorado / Investigación (experto)</option>
          </select>
          <p style={{ 
            color: theme.lightText, 
            fontSize: tokens.fontSize.sm,
            margin: `${tokens.spacing.sm} 0 0 0`,
            lineHeight: tokens.lineHeight.normal
          }}>
            Las notas se adaptarán al nivel de complejidad seleccionado
          </p>
        </div>
      )}
      
      {/* Control de duración */}
      <div style={{
        marginBottom: tokens.spacing.lg,
        padding: tokens.spacing.md,
        backgroundColor: theme.background,
        borderRadius: tokens.borderRadius.md,
        border: `${tokens.borderWidth.thin} solid ${theme.border}`
      }}>
        <label 
          htmlFor="duracion-estudio" 
          style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: tokens.spacing.md,
            color: theme.text,
            fontWeight: tokens.fontWeight.semibold,
            fontSize: tokens.fontSize.base
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
            📅 Duración del estudio
          </span>
          <span style={{ 
            color: theme.primary,
            fontWeight: tokens.fontWeight.bold,
            fontSize: tokens.fontSize.lg
          }}>
            {duracionEstudio} días
          </span>
        </label>
        <input 
          id="duracion-estudio"
          type="range"
          min="7"
          max="90"
          value={duracionEstudio}
          onChange={(e) => setDuracionEstudio(parseInt(e.target.value))}
          style={{ 
            width: '100%',
            cursor: 'pointer',
            marginBottom: tokens.spacing.sm
          }}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          color: theme.lightText,
          fontSize: tokens.fontSize.sm
        }}>
          <span>7 días (mínimo)</span>
          <span>30 días (recomendado)</span>
          <span>90 días (máximo)</span>
        </div>
      </div>
      
      {/* Botón de regeneración */}
      <button 
        onClick={regenerarNotas}
        style={{
          backgroundColor: theme.secondary,
          color: '#fff',
          border: 'none',
          borderRadius: tokens.borderRadius.md,
          padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
          cursor: 'pointer',
          width: '100%',
          fontWeight: tokens.fontWeight.bold,
          fontSize: tokens.fontSize.base,
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
        🔄 Regenerar notas con esta configuración
      </button>
    </div>
  );
});

export default ConfiguracionPanel;
