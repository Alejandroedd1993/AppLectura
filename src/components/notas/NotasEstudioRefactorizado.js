/**
 * @file Componente principal de Notas de Estudio refactorizado
 * @module NotasEstudio
 * @version 2.0.0
 */

import React, { useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
// Usar el entrypoint de hooks que exporta el hook estable (useNotasEstudioHook)
import useNotasEstudio from '../../hooks/notes';
import { ErrorDisplay, LoadingSpinner, InfoAprendizajeEspaciado } from './NotasUI';
import ConfiguracionPanel from './ConfiguracionPanel';
import NotasContenido from './NotasContenido';
import CronogramaRepaso from './CronogramaRepaso';
import PanelStudyItems from '../PanelStudyItems';
import useStudyItems from '../../hooks/useStudyItems';
import DraftWarning from '../common/DraftWarning';
import * as tokens from '../../styles/designTokens';

/**
 * Componente principal para generar y mostrar notas de estudio
 * con aprendizaje espaciado
 */
const NotasEstudio = () => {
  // Contexto global
  const { texto, modoOscuro, completeAnalysis, notasAutoGeneradas, currentTextoId } = useContext(AppContext);
  
  // Hook personalizado para gestión de estado (ahora con análisis completo)
  const {
    notas,
    tipoTexto,
    duracionEstudio,
    cargando,
    error,
    cronograma,
    notasRepasadas,
    nivelAcademico, // 🆕 FASE 3
    setTipoTexto,
    setDuracionEstudio,
    setNivelAcademico, // 🆕 FASE 3
    marcarRepasoCompletado,
    regenerarNotas
  } = useNotasEstudio(texto, completeAnalysis, currentTextoId); // ✅ Pasar análisis completo + textoId

  // Estado local para la visibilidad del panel
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [mostrarPractice, setMostrarPractice] = useState(false);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);

  // Hook de study items (mismo texto) para mostrar conteo rápido
  const { dueItems, items } = useStudyItems(texto, currentTextoId);

  // 🆕 FASE 2: Detectar cuando hay análisis disponible y notas no generadas
  useEffect(() => {
    if (completeAnalysis && notasAutoGeneradas && !notas) {
      setMostrarNotificacion(true);
      console.log('🎓 [NotasEstudio] Análisis disponible, mostrando notificación');
    }
  }, [completeAnalysis, notasAutoGeneradas, notas]);

  // Tema basado en modo oscuro
  const theme = useMemo(() => ({
    background: modoOscuro ? '#212121' : 'white',
    text: modoOscuro ? '#f5f5f5' : '#333',
    border: modoOscuro ? '#616161' : '#e0e0e0',
    shadow: modoOscuro ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
    primary: modoOscuro ? '#81c784' : '#4CAF50',
    secondary: modoOscuro ? '#64b5f6' : '#2196F3',
    accent: modoOscuro ? '#ffb74d' : '#FF9800',
    error: modoOscuro ? '#e57373' : '#F44336',
    cardBg: modoOscuro ? '#333' : '#f9f9f9',
    lightText: modoOscuro ? '#aaa' : '#666'
  }), [modoOscuro]);

  // Función para alternar la visibilidad del panel de configuración
  const toggleConfiguracion = useCallback(() => {
    setMostrarConfiguracion(prev => !prev);
  }, []);

  // Mensaje de estado cuando no hay texto
  if (!texto) {
    return (
      <div style={{ 
        backgroundColor: theme.background,
        color: theme.text,
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: theme.text }}>Notas de Estudio</h2>
        <p>Carga un texto para comenzar a generar notas de estudio personalizadas.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: theme.background,
      color: theme.text,
      padding: typeof window !== 'undefined' && window.innerWidth < 768 ? tokens.spacing.md : tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      boxShadow: tokens.boxShadow.md,
      maxWidth: tokens.containerWidth.lg,
      margin: '0 auto'
    }}>
      {/* 🆕 FASE 2: Notificación de notas disponibles - MEJORADO */}
      {mostrarNotificacion && !notas && completeAnalysis && (
        <>
          <div style={{
            backgroundColor: theme.secondary,
            color: '#fff',
            padding: tokens.spacing.lg,
            borderRadius: tokens.borderRadius.lg,
            marginBottom: tokens.spacing.lg,
            display: 'flex',
            flexDirection: typeof window !== 'undefined' && window.innerWidth < 600 ? 'column' : 'row',
            gap: tokens.spacing.md,
            alignItems: typeof window !== 'undefined' && window.innerWidth < 600 ? 'stretch' : 'center',
            boxShadow: tokens.boxShadow.lg,
            animation: 'slideDown 0.3s ease-out',
            border: `1px solid ${theme.secondary}`
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: tokens.spacing.sm,
                marginBottom: tokens.spacing.sm
              }}>
                <span style={{ fontSize: tokens.fontSize.xl }}>✅</span>
                <strong style={{ 
                  fontSize: tokens.fontSize.lg,
                  fontWeight: tokens.fontWeight.bold
                }}>
                  ¡Análisis completo disponible!
                </strong>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: tokens.fontSize.base, 
                opacity: 0.95,
                lineHeight: tokens.lineHeight.relaxed
              }}>
                Las notas de estudio se pueden generar usando el contexto completo del análisis académico realizado.
              </p>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: tokens.spacing.sm,
              flexDirection: typeof window !== 'undefined' && window.innerWidth < 600 ? 'column' : 'row',
              alignItems: 'stretch'
            }}>
              <button
                onClick={() => {
                  setMostrarNotificacion(false);
                  regenerarNotas();
                }}
                style={{
                  backgroundColor: '#fff',
                  color: theme.secondary,
                  border: 'none',
                  borderRadius: tokens.borderRadius.md,
                  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                  cursor: 'pointer',
                  fontWeight: tokens.fontWeight.bold,
                  fontSize: tokens.fontSize.base,
                  whiteSpace: 'nowrap',
                  boxShadow: tokens.boxShadow.md,
                  transition: tokens.transition.all,
                  minHeight: tokens.components.button.minHeight
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = tokens.boxShadow.lg;
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = tokens.boxShadow.md;
                }}
              >
                Generar Notas Ahora
              </button>
              
              <button
                onClick={() => setMostrarNotificacion(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#fff',
                  border: `${tokens.borderWidth.normal} solid rgba(255,255,255,0.5)`,
                  borderRadius: tokens.borderRadius.md,
                  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                  cursor: 'pointer',
                  fontSize: tokens.fontSize.base,
                  fontWeight: tokens.fontWeight.medium,
                  transition: tokens.transition.all,
                  minHeight: tokens.components.button.minHeight
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.8)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
              >
                Ahora no
              </button>
            </div>
          </div>
          
          {/* Animación CSS */}
          <style>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              @keyframes slideDown {
                from, to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            }
          `}</style>
        </>
      )}
      
      {/* Header con botón de configuración */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: tokens.spacing.lg,
        gap: tokens.spacing.md,
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h2 style={{ 
            color: theme.text, 
            margin: `0 0 ${tokens.spacing.xs} 0`,
            fontSize: tokens.fontSize['2xl'],
            fontWeight: tokens.fontWeight.bold,
            lineHeight: tokens.lineHeight.tight,
            letterSpacing: tokens.letterSpacing.tight
          }}>
            Notas de Estudio
          </h2>
          <p style={{
            color: theme.lightText,
            margin: 0,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.normal
          }}>
            Con aprendizaje espaciado optimizado
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: tokens.spacing.sm,
          flexWrap: 'wrap'
        }}>
          {/* Solo mostrar botón de práctica si hay items de estudio */}
          {items?.length > 0 && (
            <button 
              onClick={() => setMostrarPractice(p => !p)}
              aria-expanded={mostrarPractice}
              style={{
                backgroundColor: mostrarPractice ? theme.primary : 'transparent',
                color: mostrarPractice ? '#fff' : theme.primary,
                border: `${tokens.borderWidth.normal} solid ${theme.primary}`,
                borderRadius: tokens.borderRadius.md,
                padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                fontWeight: tokens.fontWeight.semibold,
                fontSize: tokens.fontSize.base,
                minHeight: tokens.components.button.minHeight,
                transition: tokens.transition.normal,
                whiteSpace: 'nowrap'
              }}
            >
              🧠 {mostrarPractice ? 'Cerrar práctica' : 'Practicar ahora'}
              {dueItems?.length > 0 && (
                <span style={{
                  background: '#ff7043',
                  color: '#fff',
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  borderRadius: tokens.borderRadius.full,
                  fontSize: tokens.fontSize.xs,
                  fontWeight: tokens.fontWeight.bold
                }}>{dueItems.length}</span>
              )}
            </button>
          )}
          <button 
            onClick={toggleConfiguracion}
          aria-expanded={mostrarConfiguracion}
          aria-controls="panel-configuracion"
          style={{
            backgroundColor: mostrarConfiguracion ? theme.secondary : 'transparent',
            color: mostrarConfiguracion ? '#fff' : theme.secondary,
            border: `${tokens.borderWidth.normal} solid ${theme.secondary}`,
            borderRadius: tokens.borderRadius.md,
            padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            fontWeight: tokens.fontWeight.semibold,
            fontSize: tokens.fontSize.base,
            minHeight: tokens.components.button.minHeight,
            transition: tokens.transition.normal
          }}
        >
          <span>{mostrarConfiguracion ? 'Ocultar' : 'Mostrar'} configuración</span>
          <span style={{
            transition: tokens.transition.transform,
            transform: mostrarConfiguracion ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>▼</span>
          </button>
        </div>
      </div>

      {/* 🆕 Advertencia de borradores sin evaluar */}
      <DraftWarning theme={theme} />

      {/* Panel de configuración */}
      {mostrarConfiguracion && (
        <ConfiguracionPanel 
          theme={theme}
          tipoTexto={tipoTexto}
          setTipoTexto={setTipoTexto}
          duracionEstudio={duracionEstudio}
          setDuracionEstudio={setDuracionEstudio}
          nivelAcademico={nivelAcademico}
          setNivelAcademico={setNivelAcademico}
          regenerarNotas={regenerarNotas}
        />
      )}

      {/* Panel rápido de práctica (study items) */}
      {mostrarPractice && (
        <div style={{ marginBottom: '24px' }}>
          {items?.length ? (
            <PanelStudyItems texto={texto} textoId={currentTextoId} theme={theme} />
          ) : (
            <div style={{
              border: `1px dashed ${theme.border}`,
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: theme.lightText
            }}>
              Aún no hay items de estudio generados. Responde evaluaciones para producir mejoras convertibles en repaso.
            </div>
          )}
        </div>
      )}

      {/* Contenido principal */}
      {cargando ? (
        <LoadingSpinner theme={theme} />
      ) : error ? (
        <ErrorDisplay 
          error={error} 
          onRetry={regenerarNotas} 
          theme={theme} 
          modoOscuro={modoOscuro} 
        />
      ) : (
        <div>
          {notas ? (
            <>
              <NotasContenido notas={notas} theme={theme} />
              <CronogramaRepaso 
                cronograma={cronograma} 
                notasRepasadas={notasRepasadas} 
                theme={theme} 
                marcarRepasoCompletado={marcarRepasoCompletado} 
              />
            </>
          ) : (
            <p style={{ textAlign: 'center', padding: '20px' }}>
              Configurando notas de estudio...
            </p>
          )}
        </div>
      )}

      {/* Información sobre el aprendizaje espaciado */}
      <InfoAprendizajeEspaciado theme={theme} />
    </div>
  );
};

export default NotasEstudio;
