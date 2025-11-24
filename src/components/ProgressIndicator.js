import React from 'react';

function ProgressIndicator({ progreso, porcentaje, onCancelar, theme, modoOscuro }) {
  return (
    <div 
      style={{ 
        padding: '10px', 
        backgroundColor: modoOscuro ? 'rgba(33, 150, 243, 0.2)' : '#e3f2fd', 
        color: theme.info,
        borderRadius: '4px',
        marginBottom: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
        <div 
          style={{ 
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            border: `3px solid ${modoOscuro ? '#444' : '#e0e0e0'}`,
            borderTopColor: theme.info,
            animation: 'spin 1s linear infinite',
            marginRight: '10px'
          }}
          aria-hidden="true"
        ></div>
        <span>
          {progreso.total > 0 
            ? `Procesando página ${progreso.actual} de ${progreso.total}...` 
            : 'Procesando archivo, por favor espera...'}
        </span>
        
        {/* Botón para cancelar el procesamiento */}
        <button
          onClick={onCancelar}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            color: modoOscuro ? '#aaa' : '#666'
          }}
          aria-label="Cancelar procesamiento"
        >
          Cancelar
        </button>
      </div>
      
      {/* Barra de progreso para PDFs */}
      {progreso.total > 0 && (
        <div style={{ width: '100%', marginTop: '5px' }}>
          <div style={{ 
            width: '100%', 
            backgroundColor: modoOscuro ? '#444' : '#e0e0e0', 
            borderRadius: '4px', 
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${porcentaje}%`, 
              backgroundColor: theme.info, 
              height: '100%',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ 
            textAlign: 'right', 
            fontSize: '0.8em', 
            marginTop: '2px' 
          }}>
            {porcentaje}%
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ProgressIndicator;