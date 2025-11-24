/**
 * CORRECCIÓN: Editor anti-paste para el módulo de Análisis
 * Bloquea pegado, arrastar y soltar, y cuenta teclas reales de tipeo
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';

// CORRECCIÓN: Estilos con indicadores visuales de restricción
const EditorContainer = styled.div`
  position: relative;
  border: 2px solid ${props => props.hasViolation ? '#ff4444' : '#ddd'};
  border-radius: 8px;
  background: ${props => props.theme.backgroundSecondary || '#fafafa'};
  transition: border-color 0.3s ease;
  
  &:focus-within {
    border-color: ${props => props.hasViolation ? '#ff4444' : '#0066cc'};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 16px;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.5;
  color: ${props => props.theme.textPrimary || '#333'};
  resize: vertical;
  
  &::placeholder {
    color: ${props => props.theme.textSecondary || '#999'};
    font-style: italic;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const InfoBar = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 8px 16px;
  background: ${props => props.theme.backgroundTertiary || '#f0f0f0'};
  border-top: 1px solid #ddd;
  font-size: 14px;
  color: ${props => props.theme.textSecondary || '#666'};
`;

const Counter = styled.span`
  font-weight: 500;
  color: ${props => {
    if (props.isEnough) return '#22c55e'; // Verde cuando suficiente
    if (props.count > 0) return '#f59e0b'; // Ámbar cuando typing
    return '#6b7280'; // Gris por defecto
  }};
`;

const ViolationAlert = styled.div`
  position: absolute;
  top: -40px;
  right: 0;
  background: #ff4444;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  animation: fadeInOut 3s ease-in-out;
  z-index: 10;
  
  @keyframes fadeInOut {
    0%, 100% { opacity: 0; transform: translateY(-10px); }
    20%, 80% { opacity: 1; transform: translateY(0); }
  }
`;

const CiteButton = styled.button`
  background: ${props => props.theme.primary || '#0066cc'};
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 8px;
  
  &:hover {
    background: ${props => props.theme.primaryDark || '#0052a3'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// CORRECCIÓN: Teclas que no cuentan como tipeo
const NON_TYPING_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Escape', 'PrintScreen', 'ScrollLock', 'Pause'
]);

export default function AntiPasteEditor({
  value = '',
  onChange,
  placeholder = 'Escribe tu respuesta aquí... (máximo 40 palabras al pegar)',
  minKeystrokes = 120,
  anchors = [],
  disabled = false,
  onKeystrokeThresholdMet,
  className
}) {
  const [keyCount, setKeyCount] = useState(0);
  const [violation, setViolation] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lastKeystrokeRef = useRef(Date.now());
  
  // CORRECCIÓN: Reset counters when value changes externally
  useEffect(() => {
    if (!value) {
      setKeyCount(0);
      startTimeRef.current = Date.now();
    }
  }, [value]);
  
  // CORRECCIÓN: Callback cuando se alcanza el umbral
  useEffect(() => {
    if (keyCount >= minKeystrokes && onKeystrokeThresholdMet) {
      onKeystrokeThresholdMet(true);
    }
  }, [keyCount, minKeystrokes, onKeystrokeThresholdMet]);
  
  const showViolation = useCallback((message) => {
    setViolation(message);
    setTimeout(() => setViolation(null), 3000);
  }, []);
  
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if (wordCount <= 40) {
      // Permitir paste de hasta 40 palabras
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
      
      // Actualizar el valor manualmente
      if (onChange) {
        onChange({ target: { value: newValue } });
      }
      
      // Mover el cursor al final del texto pegado
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + pastedText.length;
      }, 0);
    } else {
      showViolation(`Solo puedes pegar hasta 40 palabras (intentaste pegar ${wordCount}). Escribe con tus propias palabras.`);
    }
  }, [showViolation, onChange]);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    showViolation('No se permite arrastrar y soltar texto');
  }, [showViolation]);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);
  
  const handleKeyDown = useCallback((e) => {
    // CORRECCIÓN: No contar teclas de navegación ni modificadores
    if (NON_TYPING_KEYS.has(e.key)) return;
    
    // No contar durante composición (IME para acentos, etc)
    if (isComposing) return;
    
    // CORRECCIÓN: Detectar combinaciones sospechosas
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'v') {
        e.preventDefault();
        showViolation('Usa Ctrl+V para pegar (máximo 40 palabras)');
        return;
      }
      if (e.key === 'a') {
        // Permitir Ctrl+A para seleccionar todo
        return;
      }
      if (e.key === 'z' || e.key === 'y') {
        // Permitir deshacer/rehacer
        return;
      }
      // Bloquear otras combinaciones
      e.preventDefault();
      showViolation('Combinación de teclas no permitida');
      return;
    }
    
    // CORRECCIÓN: Contar solo keystrokes válidos
    const now = Date.now();
    const timeSinceLastKey = now - lastKeystrokeRef.current;
    
    // Si las teclas son muy rápidas (< 50ms), posible automatización
    if (timeSinceLastKey < 50 && keyCount > 10) {
      showViolation('Velocidad de tipeo sospechosa');
      return;
    }
    
    setKeyCount(prev => prev + 1);
    lastKeystrokeRef.current = now;
  }, [isComposing, keyCount, showViolation]);
  
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);
  
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);
  
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    
    // CORRECCIÓN: Detectar cambios sospechosos (muchos caracteres de una vez)
    if (value && newValue.length - value.length > 50) {
      showViolation('Cambio de texto sospechoso detectado');
      return;
    }
    
    if (onChange) {
      onChange(newValue);
    }
  }, [value, onChange, showViolation]);
  
  const insertCitation = useCallback((anchor) => {
    if (!textareaRef.current) return;
    
    const citation = `"${anchor.quote}" (párrafo ${anchor.paragraph})`;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = value.slice(0, start) + citation + value.slice(end);
    
    if (onChange) {
      onChange(newValue);
    }
    
    // Mover cursor después de la cita
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + citation.length;
      textarea.focus();
    }, 0);
  }, [value, onChange]);
  
  const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
  const isEnoughKeystrokes = keyCount >= minKeystrokes;
  
  return (
    <EditorContainer hasViolation={!!violation} className={className}>
      {violation && (
        <ViolationAlert>{violation}</ViolationAlert>
      )}
      
      <TextArea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={true}
        autoComplete="off"
        autoCorrect="on"
      />
      
      <InfoBar>
        <div>
          <Counter count={keyCount} isEnough={isEnoughKeystrokes}>
            {keyCount} / {minKeystrokes} teclas
          </Counter>
          {isEnoughKeystrokes && ' ✓'}
          <span style={{ marginLeft: '16px' }}>
            Tiempo: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
          </span>
        </div>
        
        <div>
          {anchors.length > 0 && (
            <>
              <span>Citas disponibles:</span>
              {anchors.slice(0, 3).map((anchor, index) => (
                <CiteButton
                  key={index}
                  onClick={() => insertCitation(anchor)}
                  disabled={disabled}
                  title={`Insertar: "${anchor.quote}"`}
                >
                  Párrafo {anchor.paragraph}
                </CiteButton>
              ))}
            </>
          )}
        </div>
      </InfoBar>
    </EditorContainer>
  );
}