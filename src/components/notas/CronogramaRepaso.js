/**
 * @file Componente para mostrar y gestionar el cronograma de repaso espaciado
 * @module CronogramaRepaso
 * @version 2.0.0
 */

import React from 'react';
import * as tokens from '../../styles/designTokens';

/**
 * Componente individual para cada item de repaso
 */
const RepasoItem = React.memo(({ 
  repaso, 
  index, 
  esHoy, 
  completado, 
  theme, 
  onMarcarCompletado 
}) => (
  <div style={{
    backgroundColor: theme.cardBg,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: `${tokens.borderWidth.normal} solid ${theme.border}`,
    opacity: completado ? 0.8 : 1,
    position: 'relative',
    overflow: 'hidden',
    transition: tokens.transition.all,
    transform: completado ? 'scale(0.98)' : 'scale(1)',
    boxShadow: esHoy && !completado ? tokens.boxShadow.lg : tokens.boxShadow.sm
  }}>
    {/* Indicador de completado */}
    {completado && (
      <div style={{
        position: 'absolute',
        top: '0',
        right: '0',
        backgroundColor: theme.primary,
        color: '#fff',
        padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
        fontSize: tokens.fontSize.xs,
        borderBottomLeftRadius: tokens.borderRadius.md,
        fontWeight: tokens.fontWeight.bold,
        animation: 'slideInRight 0.3s ease'
      }}>
        ✓ Completado
      </div>
    )}
    
    {/* Barra de acento para día actual */}
    {esHoy && !completado && (
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        backgroundColor: theme.accent,
        animation: 'pulse 2s infinite'
      }}></div>
    )}
    
    {/* Información del repaso */}
    <div style={{ flex: 1, paddingLeft: esHoy && !completado ? tokens.spacing.md : 0 }}>
      <h4 style={{ 
        color: theme.text, 
        margin: `0 0 ${tokens.spacing.xs} 0`,
        textDecoration: completado ? 'line-through' : 'none',
        fontSize: tokens.fontSize.lg,
        fontWeight: tokens.fontWeight.semibold,
        transition: tokens.transition.normal
      }}>
        {repaso.descripcion}
      </h4>
      
      <p style={{ 
        color: theme.lightText, 
        margin: '0',
        fontSize: tokens.fontSize.sm,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        flexWrap: 'wrap'
      }}>
        {repaso.dias === 0 ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
            📅 Hoy
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
            📅 Día {repaso.dias}: {new Date(repaso.fecha).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        )}
        
        {/* Indicador especial para el día actual */}
        {esHoy && !completado && (
          <span style={{ 
            backgroundColor: theme.accent, 
            color: '#fff',
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
            borderRadius: tokens.borderRadius.full,
            fontSize: tokens.fontSize.xs,
            fontWeight: tokens.fontWeight.bold,
            animation: 'pulse 2s infinite'
          }}>
            ¡Hoy!
          </span>
        )}
      </p>
      
      {/* Información adicional para próximos repasos */}
      {!completado && repaso.dias > 0 && (
        <p style={{ 
          color: theme.lightText, 
          margin: `${tokens.spacing.xs} 0 0 0`,
          fontSize: tokens.fontSize.xs,
          opacity: tokens.opacity.medium
        }}>
          {getDiasRestantes(repaso.fecha)} días restantes
        </p>
      )}
    </div>
    
    {/* Botón de acción */}
    <button 
      onClick={() => onMarcarCompletado(index)}
      disabled={completado}
      aria-label={completado ? "Repaso ya completado" : "Marcar repaso como completado"}
      style={{
        backgroundColor: completado ? theme.border : theme.primary,
        color: completado ? theme.lightText : '#fff',
        border: 'none',
        borderRadius: tokens.borderRadius.md,
        padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
        cursor: completado ? 'default' : 'pointer',
        opacity: completado ? tokens.opacity.disabled : 1,
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.bold,
        transition: tokens.transition.all,
        minWidth: '140px',
        minHeight: tokens.components.button.minHeight,
        boxShadow: completado ? 'none' : tokens.boxShadow.sm
      }}
      onMouseOver={(e) => {
        if (!completado) {
          e.target.style.backgroundColor = theme.secondary;
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = tokens.boxShadow.md;
        }
      }}
      onMouseOut={(e) => {
        if (!completado) {
          e.target.style.backgroundColor = theme.primary;
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = tokens.boxShadow.sm;
        }
      }}
    >
      {completado ? '✓ Completado' : 'Marcar completado'}
    </button>
    
    {/* Animaciones CSS */}
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes slideInRight {
          from, to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      }
    `}</style>
  </div>
));

/**
 * Función helper para calcular días restantes
 */
const getDiasRestantes = (fecha) => {
  const hoy = new Date();
  const fechaRepaso = new Date(fecha);
  const diferencia = Math.ceil((fechaRepaso - hoy) / (1000 * 60 * 60 * 24));
  return Math.max(0, diferencia);
};

/**
 * Componente de estadísticas del progreso
 */
const EstadisticasProgreso = React.memo(({ cronograma, notasRepasadas, theme }) => {
  const totalRepasos = cronograma.length;
  const repasosCompletados = Object.keys(notasRepasadas).length;
  const porcentajeCompletado = totalRepasos > 0 ? (repasosCompletados / totalRepasos * 100) : 0;
  
  return (
    <div style={{
      backgroundColor: theme.cardBg,
      borderRadius: tokens.borderRadius.lg,
      padding: tokens.spacing.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      marginBottom: tokens.spacing.xl,
      boxShadow: tokens.boxShadow.md,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Fondo decorativo de progreso */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(90deg, ${theme.primary}15 ${porcentajeCompletado}%, transparent ${porcentajeCompletado}%)`,
        pointerEvents: 'none',
        transition: 'all 0.5s ease'
      }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h4 style={{ 
          color: theme.text, 
          margin: `0 0 ${tokens.spacing.md} 0`,
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm
        }}>
          📊 Progreso del Estudio
        </h4>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: tokens.spacing.md,
          flexWrap: 'wrap',
          gap: tokens.spacing.sm
        }}>
          <span style={{ 
            color: theme.text,
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.medium
          }}>
            {repasosCompletados} de {totalRepasos} repasos completados
          </span>
          <span style={{ 
            color: theme.primary, 
            fontWeight: tokens.fontWeight.bold,
            fontSize: tokens.fontSize.xl,
            animation: porcentajeCompletado === 100 ? 'celebrate 0.5s ease' : 'none'
          }}>
            {porcentajeCompletado.toFixed(1)}%
          </span>
        </div>
        
        {/* Barra de progreso mejorada */}
        <div style={{
          width: '100%',
          height: '12px',
          backgroundColor: theme.border,
          borderRadius: tokens.borderRadius.full,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`
        }}>
          <div style={{
            width: `${porcentajeCompletado}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
            transition: 'width 0.5s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animación de brillo */}
            {porcentajeCompletado > 0 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shine 2s infinite'
              }}></div>
            )}
          </div>
        </div>
        
        {/* Mensaje motivacional */}
        {porcentajeCompletado === 100 ? (
          <p style={{ 
            color: theme.primary, 
            margin: `${tokens.spacing.md} 0 0 0`,
            fontWeight: tokens.fontWeight.bold,
            textAlign: 'center',
            fontSize: tokens.fontSize.base,
            animation: 'celebrate 0.5s ease'
          }}>
            🎉 ¡Felicitaciones! Has completado todos los repasos.
          </p>
        ) : (
          <p style={{ 
            color: theme.lightText, 
            margin: `${tokens.spacing.md} 0 0 0`,
            fontSize: tokens.fontSize.sm,
            lineHeight: tokens.lineHeight.relaxed
          }}>
            {repasosCompletados === 0 
              ? "¡Comienza tu primer repaso hoy!" 
              : "¡Excelente progreso! Continúa con el siguiente repaso."
            }
          </p>
        )}
      </div>
      
      {/* Animaciones CSS */}
      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        
        @keyframes celebrate {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes shine {
            0%, 100% { left: 0; opacity: 0.5; }
            50% { opacity: 1; }
          }
          
          @keyframes celebrate {
            0%, 100% { transform: scale(1); }
          }
        }
      `}</style>
    </div>
  );
});

/**
 * Componente principal del cronograma de repaso
 */
const CronogramaRepaso = React.memo(({ 
  cronograma, 
  notasRepasadas, 
  theme, 
  marcarRepasoCompletado 
}) => {
  // Validación de datos
  if (!cronograma || cronograma.length === 0) {
    return (
      <div style={{ 
        marginTop: '30px',
        textAlign: 'center',
        padding: '20px',
        color: theme.lightText 
      }}>
        <p>No hay cronograma de repaso disponible.</p>
      </div>
    );
  }
  
  const hoy = new Date();
  
  // Separar repasos por estado
  const repasosHoy = cronograma.filter((repaso, index) => 
    new Date(repaso.fecha).toDateString() === hoy.toDateString() && 
    !repaso.completado && 
    !notasRepasadas[index]
  );
  
  const _repasosCompletados = cronograma.filter((repaso, index) => 
    repaso.completado || notasRepasadas[index]
  );
  
  const _repasosPendientes = cronograma.filter((repaso, index) => 
    !repaso.completado && 
    !notasRepasadas[index] && 
    new Date(repaso.fecha).toDateString() !== hoy.toDateString()
  );

  return (
    <div style={{ marginTop: tokens.spacing.xl }}>
      <h3 style={{ 
        color: theme.text,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.bold,
        marginBottom: tokens.spacing.md
      }}>
        🔄 Cronograma de Repaso Espaciado
      </h3>
      
      <p style={{ 
        color: theme.lightText, 
        marginBottom: tokens.spacing.xl,
        fontSize: tokens.fontSize.base,
        lineHeight: tokens.lineHeight.relaxed
      }}>
        Basado en la curva del olvido para optimizar la retención a largo plazo. 
        Sigue el cronograma para maximizar tu aprendizaje.
      </p>
      
      {/* Estadísticas de progreso */}
      <EstadisticasProgreso 
        cronograma={cronograma}
        notasRepasadas={notasRepasadas}
        theme={theme}
      />
      
      {/* Repasos para hoy */}
      {repasosHoy.length > 0 && (
        <div style={{ marginBottom: tokens.spacing.xxl }}>
          <h4 style={{ 
            color: theme.accent,
            margin: `0 0 ${tokens.spacing.lg} 0`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.semibold
          }}>
            ⭐ Repasos para Hoy ({repasosHoy.length})
          </h4>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: tokens.spacing.md,
            maxWidth: tokens.containerWidth.md,
            margin: '0 auto'
          }}>
            {repasosHoy.map((repaso, _originalIndex) => {
              const index = cronograma.findIndex(r => r === repaso);
              return (
                <RepasoItem 
                  key={`hoy-${index}`}
                  repaso={repaso}
                  index={index}
                  esHoy={true}
                  completado={false}
                  theme={theme}
                  onMarcarCompletado={marcarRepasoCompletado}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Todos los repasos */}
      <div style={{ marginBottom: tokens.spacing.xl }}>
        <h4 style={{ 
          color: theme.text,
          margin: `0 0 ${tokens.spacing.lg} 0`,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold
        }}>
          📅 Cronograma Completo
        </h4>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: tokens.spacing.md,
          maxWidth: tokens.containerWidth.md,
          margin: '0 auto'
        }}>
          {cronograma.map((repaso, index) => {
            const esHoy = new Date(repaso.fecha).toDateString() === hoy.toDateString();
            const completado = repaso.completado || notasRepasadas[index];
            
            return (
              <RepasoItem 
                key={index}
                repaso={repaso}
                index={index}
                esHoy={esHoy}
                completado={completado}
                theme={theme}
                onMarcarCompletado={marcarRepasoCompletado}
              />
            );
          })}
        </div>
      </div>
      
      {/* Consejos para el aprendizaje espaciado */}
      <div style={{
        backgroundColor: theme.cardBg,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.lg,
        border: `${tokens.borderWidth.normal} solid ${theme.border}`,
        marginTop: tokens.spacing.xl,
        boxShadow: tokens.boxShadow.sm
      }}>
        <h4 style={{ 
          color: theme.text, 
          margin: `0 0 ${tokens.spacing.md} 0`,
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm
        }}>
          💡 Consejos para el Repaso Efectivo
        </h4>
        <ul style={{ 
          color: theme.lightText, 
          fontSize: tokens.fontSize.sm, 
          margin: 0,
          paddingLeft: tokens.spacing.lg,
          lineHeight: tokens.lineHeight.relaxed
        }}>
          <li style={{ marginBottom: tokens.spacing.sm }}>Revisa las notas sin mirar las respuestas primero</li>
          <li style={{ marginBottom: tokens.spacing.sm }}>Intenta recordar los conceptos clave de memoria</li>
          <li style={{ marginBottom: tokens.spacing.sm }}>Si olvidas algo, no te preocupes: es parte del proceso</li>
          <li style={{ marginBottom: tokens.spacing.sm }}>Marca como completado solo después de revisar todo el material</li>
          <li>La consistencia es más importante que la perfección</li>
        </ul>
      </div>
    </div>
  );
});

export default CronogramaRepaso;
