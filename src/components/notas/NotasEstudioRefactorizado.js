/**
 * @file Componente principal de Notas de Estudio refactorizado
 * @module NotasEstudio
 * @version 2.0.0
 */

import React, { useState, useContext, useMemo, useCallback } from 'react';
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
  const { texto, modoOscuro, completeAnalysis, currentTextoId } = useContext(AppContext);

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

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // Hook de study items (mismo texto) para mostrar conteo rápido
  const { dueItems, items } = useStudyItems(texto, currentTextoId);



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
