import React from 'react';

function FileDropZone({ archivo, arrastrandoArchivo, onDragEnter, onDragOver, onDragLeave, onDrop, onChange, theme, modoOscuro }) {
  return (
    <div 
      style={{ 
        border: `2px dashed ${arrastrandoArchivo ? theme.primary : theme.border}`,
        borderRadius: '4px',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: arrastrandoArchivo ? (modoOscuro ? 'rgba(129, 199, 132, 0.1)' : 'rgba(76, 175, 80, 0.05)') : 'transparent',
        marginBottom: '20px',
        transition: 'all 0.3s ease'
      }}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <p>Arrastra y suelta un archivo aquí o haz clic para seleccionar</p>
      <input
        type="file"
        onChange={onChange}
        accept=".txt,.docx,.pdf"
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label 
        htmlFor="file-upload"
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          backgroundColor: theme.primary,
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Seleccionar archivo
      </label>
      {archivo && (
        <p style={{ marginTop: '10px' }}>
          Archivo seleccionado: <strong>{archivo.name}</strong>
        </p>
      )}
    </div>
  );
}

export default FileDropZone;