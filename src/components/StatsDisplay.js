import React from 'react';

function StatsDisplay({ estadisticas, theme, modoOscuro }) {
  if (!estadisticas) return null;
  
  return (
    <div 
      style={{ 
        backgroundColor: modoOscuro ? 'rgba(100, 181, 246, 0.1)' : '#e3f2fd',
        padding: '10px 15px',
        borderRadius: '4px',
        marginBottom: '15px',
        color: theme.info
      }}
    >
      <h4 style={{ margin: '0 0 8px 0' }}>Estadísticas del texto:</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {estadisticas.palabras !== undefined && (
          <span>📝 {estadisticas.palabras} palabras</span>
        )}
        {estadisticas.caracteres !== undefined && (
          <span>🔤 {estadisticas.caracteres} caracteres</span>
        )}
        {estadisticas.lineas !== undefined && (
          <span>📊 {estadisticas.lineas} líneas</span>
        )}
        {estadisticas.paginas !== undefined && (
          <span>📄 {estadisticas.paginas} páginas</span>
        )}
        {estadisticas.imagenes !== undefined && (
          <span>🖼️ {estadisticas.imagenes} imágenes</span>
        )}
      </div>
    </div>
  );
}

export default StatsDisplay;