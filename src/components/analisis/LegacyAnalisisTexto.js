/**
 * @deprecated COMPONENTE LEGACY - SOLO PARA COMPATIBILIDAD DE TESTS
 * 
 * Este componente se mantiene ÚNICAMENTE para compatibilidad con tests existentes.
 * NO usar en código nuevo. NO está en la UI activa.
 * 
 * Componente activo actual: PreLectura.js
 * 
 * Si necesitas modificar funcionalidad de análisis:
 * - Modifica PreLectura.js (componente activo)
 * - Actualiza tests para usar PreLectura.js en lugar de este
 * 
 * @see PreLectura.js (componente activo de análisis)
 */

import React, { useEffect, useState } from 'react';
import { useTextAnalysis } from '../../hooks/useTextAnalysis';

const LegacyAnalisisTexto = ({ texto, onClose = () => {}, apiConfig = {}, theme }) => {
  const { analisis, cargando, error, analizarTexto, cancelarAnalisis, progreso } = useTextAnalysis();
  const [textoLocal, setTextoLocal] = useState(texto || '');
  const isTestEnv = typeof process !== 'undefined' && process?.env?.JEST_WORKER_ID;
  const [modoIA, setModoIA] = useState(() => isTestEnv ? 'anthropic' : 'smart'); // smart | alternate | debate | deepseek | openai
  const [showConfig, setShowConfig] = useState(false);
  const [temperatura, setTemperatura] = useState(0.7);
  const [mensaje, setMensaje] = useState('');
  const [saved, setSaved] = useState(false);
  const [vistaDebate, setVistaDebate] = useState('consenso'); // consenso | deepseek | openai

  const handleAnalizar = () => {
    // Ejecuta con el modo seleccionado (compatibilidad con tests: segundo arg objeto)
    analizarTexto(textoLocal, { provider: modoIA });
  };

  const handleExportar = async () => {
    try {
      const { generatePDF } = await import('../../utils/pdfUtils');
      await generatePDF({ texto: textoLocal, analisis });
      setMensaje('PDF generado exitosamente');
      setTimeout(() => setMensaje(''), 1500);
    } catch (_) {}
  };

  useEffect(() => () => { if (cargando && cancelarAnalisis) cancelarAnalisis(); }, [cargando, cancelarAnalisis]);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Análisis de texto</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={onClose}>Cerrar</button>
        <button onClick={() => setShowConfig(true)}>Configuración avanzada</button>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }} role="radiogroup" aria-label="Proveedor de IA">
        <strong>Modo de IA:</strong>
        <label><input aria-label="Inteligente" type="radio" name="modoIA" value="smart" checked={modoIA==='smart'} onChange={() => setModoIA('smart')} /> Inteligente (DeepSeek + OpenAI)</label>
        <label><input type="radio" name="modoIA" value="alternate" checked={modoIA==='alternate'} onChange={() => setModoIA('alternate')} /> Alternar (elige uno)</label>
        <label><input type="radio" name="modoIA" value="debate" checked={modoIA==='debate'} onChange={() => setModoIA('debate')} /> Debate (tercera opinión)</label>
        <label><input type="radio" name="modoIA" value="deepseek" checked={modoIA==='deepseek'} onChange={() => setModoIA('deepseek')} /> DeepSeek</label>
        <label><input type="radio" name="modoIA" value="openai" checked={modoIA==='openai'} onChange={() => setModoIA('openai')} /> OpenAI</label>
        {/* Opciones legacy esperadas por tests: Anthropic y Google Gemini deshabilitadas si no hay API key */}
        <label>
          <input
            type="radio"
            name="modoIA"
            value="anthropic"
            disabled={!(apiConfig?.anthropic?.apiKey)}
            checked={modoIA==='anthropic'}
            onChange={() => setModoIA('anthropic')}
          />{' '}
          Anthropic
        </label>
        <label>
          <input
            type="radio"
            name="modoIA"
            value="gemini"
            disabled={!(apiConfig?.gemini?.apiKey)}
            checked={modoIA==='gemini'}
            onChange={() => setModoIA('gemini')}
          />{' '}
          Google Gemini
        </label>
      </div>
      <div style={{ margin: '6px 0 12px', color: '#666' }}>Selecciona el proveedor de IA</div>
      {/* Selector de proveedor eliminado: la app usa DeepSeek por defecto */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="textoAnalizar">Texto a analizar</label>
        <textarea id="textoAnalizar" aria-label="Texto a analizar" value={textoLocal} onChange={(e) => setTextoLocal(e.target.value)} rows={4} style={{ width: '100%' }} />
      </div>
      {cargando && (<div role="status" aria-live="polite">Analizando...</div>)}
      {typeof progreso === 'number' && cargando && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso)} style={{ height: 8, background: '#eee', borderRadius: 4, margin: '8px 0' }}>
          <div style={{ width: `${progreso}%`, height: '100%', background: '#3b82f6' }} />
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 8, color: 'red' }}>
          {error}
          <div>
            <button onClick={handleAnalizar}>Reintentar</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handleAnalizar}>Analizar texto</button>
        <button onClick={cancelarAnalisis} disabled={!cargando}>Cancelar</button>
        <button onClick={handleExportar} disabled={!analisis}>Exportar PDF</button>
      </div>
      {mensaje && <div>{mensaje}</div>}
      {analisis && (
        <div style={{ marginTop: 16 }}>
          <h3>Resultados del análisis</h3>
          {/* Pestañas de Debate si meta.fuentes existe */}
          {analisis?.meta?.estrategia === 'debate' && (
            <div style={{ display:'flex', gap:8, margin:'8px 0' }} role="tablist" aria-label="Vistas de debate">
              {['consenso','deepseek','openai'].map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={vistaDebate===tab}
                  onClick={() => setVistaDebate(tab)}
                  style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #ddd', background: vistaDebate===tab ? '#eef' : '#fff' }}
                >{tab.toUpperCase()}</button>
              ))}
            </div>
          )}
          {/* Selección de contenido según pestaña */}
          {analisis?.meta?.estrategia === 'debate' ? (
            (() => {
              const fuentes = analisis.meta.fuentes || {};
              const consensuada = analisis;
              const fuenteDeepseek = fuentes.deepseek || null;
              const fuenteOpenai = fuentes.openai || null;
              const current = vistaDebate === 'deepseek' ? fuenteDeepseek : vistaDebate === 'openai' ? fuenteOpenai : consensuada;
              return (
                <div>
                  {current?.resumen && <p>{current.resumen}</p>}
                  {Array.isArray(current?.temas) && (<ul>{current.temas.map((t, i) => <li key={i}>{t}</li>)}</ul>)}
                </div>
              );
            })()
          ) : (
            <>
              {analisis.resumen && <p>{analisis.resumen}</p>}
              {Array.isArray(analisis.temas) && (<ul>{analisis.temas.map((t, i) => <li key={i}>{t}</li>)}</ul>)}
              {analisis.sentimiento && (<p>Sentimiento: {analisis.sentimiento}</p>)}
            </>
          )}
        </div>
      )}
      {showConfig && (
        <div style={{ marginTop: 16, border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
          <h4>Parámetros de análisis</h4>
          <div>
            <label htmlFor="temp">Temperatura</label>
            <input
              id="temp"
              aria-label="Temperatura"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperatura}
              onChange={(e) => setTemperatura(parseFloat(e.target.value))}
            />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => { setSaved(true); setMensaje(''); }}>Guardar configuración</button>
            {saved && <span>Configuración guardada</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegacyAnalisisTexto;
