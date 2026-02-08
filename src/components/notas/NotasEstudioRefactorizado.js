/**
 * @file Componente principal de Notas de Estudio refactorizado
 * @module NotasEstudio
 * @version 2.0.0
 */

import React, { useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
// Usar el entrypoint de hooks que exporta el hook estable (useNotasEstudioHook)
import useNotasEstudio from '../../hooks/notes';
import { ErrorDisplay, LoadingSpinner, InfoAprendizajeEspaciado, NotasAnimations } from './NotasUI';
import ConfiguracionPanel from './ConfiguracionPanel';
import NotasContenido from './NotasContenido';
import CronogramaRepaso from './CronogramaRepaso';
import PanelStudyItems from '../PanelStudyItems';
import useStudyItems from '../../hooks/useStudyItems';
import DraftWarning from '../common/DraftWarning';
import logger from '../../utils/logger';
import * as tokens from '../../styles/designTokens';
import useMediaQuery from '../../hooks/useMediaQuery';

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
    numeroTarjetas,
    origenNotas,
    nivelAcademico, // 🆕 FASE 3
    setTipoTexto,
    setDuracionEstudio,
    setNumeroTarjetas,
    setNivelAcademico, // 🆕 FASE 3
    marcarRepasoCompletado,
    regenerarNotas
  } = useNotasEstudio(texto, completeAnalysis, currentTextoId); // ✅ Pasar análisis completo + textoId

  // Estado local para la visibilidad del panel
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [mostrarPractice, setMostrarPractice] = useState(false);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // Hook de study items (mismo texto) para mostrar conteo rápido
  const { dueItems, items } = useStudyItems(texto, currentTextoId);

  const hasCompleteAnalysis = !!completeAnalysis;

  // 🆕 FASE 2: Detectar cuando hay análisis disponible y notas no generadas
  useEffect(() => {
    if (hasCompleteAnalysis && notasAutoGeneradas && !notas) {
      setMostrarNotificacion(true);
      logger.log('🎓 [NotasEstudio] Análisis disponible, mostrando notificación');
    }
  }, [hasCompleteAnalysis, notasAutoGeneradas, notas]);

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

  const isSmallScreen = useMediaQuery('(max-width: 640px)');
  const isNarrowScreen = useMediaQuery('(max-width: 768px)');

  // Función para alternar la visibilidad del panel de configuración
  const toggleConfiguracion = useCallback(() => {
    setMostrarConfiguracion(prev => !prev);
  }, []);

  // Comprobar si el cronograma tiene repasos completados
  const tieneProgresoRepaso = useMemo(() => {
    if (!cronograma || cronograma.length === 0) return false;
    return cronograma.some(r => r.completado);
  }, [cronograma]);

  // Regenerar con confirmación si hay progreso
  const regenerarConConfirmacion = useCallback(() => {
    if (tieneProgresoRepaso) {
      setMostrarConfirmacion(true);
    } else {
      regenerarNotas();
    }
  }, [tieneProgresoRepaso, regenerarNotas]);

  const confirmarRegeneracion = useCallback(() => {
    setMostrarConfirmacion(false);
    regenerarNotas();
  }, [regenerarNotas]);

  const cancelarRegeneracion = useCallback(() => {
    setMostrarConfirmacion(false);
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
      padding: isNarrowScreen ? tokens.spacing.md : tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      boxShadow: tokens.boxShadow.md,
      maxWidth: tokens.containerWidth.lg,
      margin: '0 auto'
    }}>
      <NotasAnimations />

      {/* 🆕 FASE 2: Notificación de notas disponibles - MEJORADO */}
      {mostrarNotificacion && !notas && hasCompleteAnalysis && (
        <>
          <div style={{
            backgroundColor: theme.secondary,
            color: '#fff',
            padding: tokens.spacing.lg,
            borderRadius: tokens.borderRadius.lg,
            marginBottom: tokens.spacing.lg,
            display: 'flex',
            flexDirection: isSmallScreen ? 'column' : 'row',
            gap: tokens.spacing.md,
            alignItems: isSmallScreen ? 'stretch' : 'center',
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
              flexDirection: isSmallScreen ? 'column' : 'row',
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
                onFocus={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = tokens.boxShadow.lg;
                }}
                onBlur={(e) => {
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
                onFocus={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.8)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
              >
                Ahora no
              </button>
            </div>
          </div>
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
          {origenNotas && (
            <div style={{
              marginTop: tokens.spacing.xs,
              display: 'inline-flex',
              alignItems: 'center',
              gap: tokens.spacing.xs,
              padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
              borderRadius: tokens.borderRadius.full,
              backgroundColor: origenNotas === 'backend' ? theme.primary : theme.accent,
              color: '#fff',
              fontSize: tokens.fontSize.xs,
              fontWeight: tokens.fontWeight.semibold
            }}>
              {origenNotas === 'backend' ? '🤖 Generado con IA' : '📝 Notas básicas (fallback)'}
            </div>
          )}
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

      {/* Diálogo de confirmación al regenerar con progreso */}
      {mostrarConfirmacion && (
        <div style={{
          backgroundColor: theme.accent + '18',
          border: `${tokens.borderWidth.normal} solid ${theme.accent}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.lg,
          marginBottom: tokens.spacing.lg,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: tokens.spacing.md
          }}>
            <span style={{ fontSize: tokens.fontSize['2xl'] }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong style={{
                color: theme.text,
                fontSize: tokens.fontSize.lg,
                display: 'block',
                marginBottom: tokens.spacing.sm
              }}>
                ¿Regenerar notas?
              </strong>
              <p style={{
                color: theme.text,
                margin: `0 0 ${tokens.spacing.md} 0`,
                fontSize: tokens.fontSize.base,
                lineHeight: tokens.lineHeight.relaxed
              }}>
                Tienes repasos completados en el cronograma actual. Al regenerar las notas, el cronograma se preservará solo si mantienes la misma duración de estudio.
              </p>
              <div style={{
                display: 'flex',
                gap: tokens.spacing.sm,
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={confirmarRegeneracion}
                  style={{
                    backgroundColor: theme.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: tokens.borderRadius.md,
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    cursor: 'pointer',
                    fontWeight: tokens.fontWeight.bold,
                    fontSize: tokens.fontSize.base,
                    minHeight: tokens.components.button.minHeight,
                    transition: tokens.transition.all
                  }}
                >
                  Sí, regenerar
                </button>
                <button
                  onClick={cancelarRegeneracion}
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.text,
                    border: `${tokens.borderWidth.normal} solid ${theme.border}`,
                    borderRadius: tokens.borderRadius.md,
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    cursor: 'pointer',
                    fontWeight: tokens.fontWeight.medium,
                    fontSize: tokens.fontSize.base,
                    minHeight: tokens.components.button.minHeight,
                    transition: tokens.transition.all
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de configuración */}
      {mostrarConfiguracion && (
        <ConfiguracionPanel 
          theme={theme}
          tipoTexto={tipoTexto}
          setTipoTexto={setTipoTexto}
          duracionEstudio={duracionEstudio}
          setDuracionEstudio={setDuracionEstudio}
          numeroTarjetas={numeroTarjetas}
          setNumeroTarjetas={setNumeroTarjetas}
          nivelAcademico={nivelAcademico}
          setNivelAcademico={setNivelAcademico}
          regenerarNotas={regenerarConConfirmacion}
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
            <div style={{
              textAlign: 'center',
              padding: tokens.spacing.xl,
              borderRadius: tokens.borderRadius.lg,
              border: `${tokens.borderWidth.thin} dashed ${theme.border}`,
              backgroundColor: theme.cardBg
            }}>
              <p style={{
                margin: `0 0 ${tokens.spacing.md} 0`,
                color: theme.text,
                fontSize: tokens.fontSize.base
              }}>
                Aún no hay notas generadas para este texto.
              </p>
              <button
                onClick={regenerarConConfirmacion}
                style={{
                  backgroundColor: theme.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: tokens.borderRadius.md,
                  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                  cursor: 'pointer',
                  fontWeight: tokens.fontWeight.semibold,
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
                onFocus={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = tokens.boxShadow.md;
                }}
                onBlur={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = tokens.boxShadow.sm;
                }}
              >
                ✨ Generar notas
              </button>
            </div>
          )}
        </div>
      )}

      {/* Información sobre el aprendizaje espaciado */}
      {cronograma?.length > 0 && (
        <InfoAprendizajeEspaciado theme={theme} />
      )}
    </div>
  );
};

export default NotasEstudio;
