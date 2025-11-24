/**
 * @file Componente para renderizar el contenido de las notas según el tipo de texto
 * @module NotasContenido
 * @version 2.0.0
 */

import React from 'react';
import { ConceptoEtiqueta } from './NotasUI';
import * as tokens from '../../styles/designTokens';

/**
 * Componente para notas de texto narrativo
 */
const NotasNarrativo = React.memo(({ notas, theme }) => (
  <div style={{ marginTop: tokens.spacing.xl }}>
    <h3 style={{ 
      color: theme.text,
      fontSize: tokens.fontSize.xl,
      fontWeight: tokens.fontWeight.bold,
      marginBottom: tokens.spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacing.sm
    }}>
      📖 Notas de Estudio - Texto Narrativo
    </h3>
    <h4 style={{ 
      color: theme.text,
      fontSize: tokens.fontSize.lg,
      fontWeight: tokens.fontWeight.semibold,
      marginBottom: tokens.spacing.lg,
      paddingBottom: tokens.spacing.sm,
      borderBottom: `${tokens.borderWidth.thin} solid ${theme.border}`
    }}>
      {notas.titulo}
    </h4>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        👥 Personajes
      </h5>
      <ul style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        paddingLeft: tokens.spacing.lg
      }}>
        {notas.personajes && notas.personajes.map((personaje, index) => (
          <li key={index} style={{ marginBottom: tokens.spacing.sm }}>
            <strong style={{ color: theme.primary }}>{personaje.nombre}:</strong> {personaje.descripcion}
          </li>
        ))}
      </ul>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🌍 Espacio y Tiempo
      </h5>
      <p style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0
      }}>
        {notas.espacioTiempo}
      </p>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🗣️ Voz Narrativa
      </h5>
      <p style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0
      }}>
        {notas.vozNarrativa}
      </p>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🎯 Temas
      </h5>
      <ul style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        paddingLeft: tokens.spacing.lg
      }}>
        {notas.temas && notas.temas.map((tema, index) => (
          <li key={index} style={{ marginBottom: tokens.spacing.sm }}>{tema}</li>
        ))}
      </ul>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        📊 Estructura
      </h5>
      {notas.estructura && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          <p style={{ 
            color: theme.text,
            lineHeight: tokens.lineHeight.relaxed,
            margin: 0,
            padding: tokens.spacing.sm,
            backgroundColor: theme.background,
            borderRadius: tokens.borderRadius.md,
            borderLeft: `${tokens.borderWidth.thick} solid ${theme.primary}`
          }}>
            <strong style={{ color: theme.primary }}>Inicio:</strong> {notas.estructura.inicio}
          </p>
          <p style={{ 
            color: theme.text,
            lineHeight: tokens.lineHeight.relaxed,
            margin: 0,
            padding: tokens.spacing.sm,
            backgroundColor: theme.background,
            borderRadius: tokens.borderRadius.md,
            borderLeft: `${tokens.borderWidth.thick} solid ${theme.secondary}`
          }}>
            <strong style={{ color: theme.secondary }}>Desarrollo:</strong> {notas.estructura.desarrollo}
          </p>
          <p style={{ 
            color: theme.text,
            lineHeight: tokens.lineHeight.relaxed,
            margin: 0,
            padding: tokens.spacing.sm,
            backgroundColor: theme.background,
            borderRadius: tokens.borderRadius.md,
            borderLeft: `${tokens.borderWidth.thick} solid ${theme.accent}`
          }}>
            <strong style={{ color: theme.accent }}>Desenlace:</strong> {notas.estructura.desenlace}
          </p>
        </div>
      )}
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🔮 Símbolos
      </h5>
      <ul style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        paddingLeft: tokens.spacing.lg
      }}>
        {notas.simbolos && notas.simbolos.map((simbolo, index) => (
          <li key={index} style={{ marginBottom: tokens.spacing.sm }}>
            <strong style={{ color: theme.primary }}>{simbolo.simbolo}:</strong> {simbolo.significado}
          </li>
        ))}
      </ul>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🔑 Conceptos Clave
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
        {notas.conceptosClave && notas.conceptosClave.map((concepto, index) => (
          <ConceptoEtiqueta key={index} concepto={concepto} theme={theme} />
        ))}
      </div>
    </div>
  </div>
));

/**
 * Componente para notas de texto poético
 */
const NotasPoetico = React.memo(({ notas, theme }) => (
  <div style={{ marginTop: tokens.spacing.xl }}>
    <h3 style={{ 
      color: theme.text,
      fontSize: tokens.fontSize.xl,
      fontWeight: tokens.fontWeight.bold,
      marginBottom: tokens.spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacing.sm
    }}>
      ✨ Notas de Estudio - Texto Poético
    </h3>
    <h4 style={{ 
      color: theme.text,
      fontSize: tokens.fontSize.lg,
      fontWeight: tokens.fontWeight.semibold,
      marginBottom: tokens.spacing.lg,
      paddingBottom: tokens.spacing.sm,
      borderBottom: `${tokens.borderWidth.thin} solid ${theme.border}`
    }}>
      {notas.titulo}
    </h4>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🎭 Objeto Poético
      </h5>
      <p style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        fontStyle: 'italic',
        padding: tokens.spacing.md,
        backgroundColor: theme.background,
        borderRadius: tokens.borderRadius.md,
        borderLeft: `${tokens.borderWidth.thick} solid ${theme.primary}`
      }}>
        {notas.objetoPoetico}
      </p>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🎨 Recursos Literarios
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        {notas.recursosLiterarios && notas.recursosLiterarios.map((recurso, index) => (
          <div key={index} style={{
            padding: tokens.spacing.md,
            backgroundColor: theme.background,
            borderRadius: tokens.borderRadius.md,
            borderLeft: `${tokens.borderWidth.thick} solid ${theme.secondary}`
          }}>
            <p style={{ 
              color: theme.text,
              lineHeight: tokens.lineHeight.relaxed,
              margin: 0
            }}>
              <strong style={{ color: theme.secondary }}>{recurso.recurso}:</strong> {recurso.ejemplo}
            </p>
            {recurso.efecto && (
              <p style={{ 
                color: theme.lightText,
                fontSize: tokens.fontSize.sm,
                fontStyle: 'italic',
                margin: `${tokens.spacing.xs} 0 0 0`
              }}>
                → {recurso.efecto}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        📏 Métrica y Rima
      </h5>
      <p style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0
      }}>
        {notas.metricaRima}
      </p>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🎵 Tono y Atmósfera
      </h5>
      <p style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0
      }}>
        {notas.tonoAtmosfera}
      </p>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        💭 Interpretación
      </h5>
      <p style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        padding: tokens.spacing.md,
        backgroundColor: theme.background,
        borderRadius: tokens.borderRadius.md,
        borderLeft: `${tokens.borderWidth.thick} solid ${theme.accent}`
      }}>
        {notas.interpretacion}
      </p>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🔑 Conceptos Clave
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
        {notas.conceptosClave && notas.conceptosClave.map((concepto, index) => (
          <ConceptoEtiqueta key={index} concepto={concepto} theme={theme} />
        ))}
      </div>
    </div>
  </div>
));

/**
 * Componente para notas de texto filosófico
 */
const NotasFilosofico = React.memo(({ notas, theme }) => (
  <div style={{ marginTop: tokens.spacing.xl }}>
    <h3 style={{ 
      color: theme.text,
      fontSize: tokens.fontSize.xl,
      fontWeight: tokens.fontWeight.bold,
      marginBottom: tokens.spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacing.sm
    }}>
      🧠 Notas de Estudio - Texto Filosófico
    </h3>
    <h4 style={{ 
      color: theme.text,
      fontSize: tokens.fontSize.lg,
      fontWeight: tokens.fontWeight.semibold,
      marginBottom: tokens.spacing.lg,
      paddingBottom: tokens.spacing.sm,
      borderBottom: `${tokens.borderWidth.thin} solid ${theme.border}`
    }}>
      {notas.titulo}
    </h4>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        💡 Ideas Fundamentales
      </h5>
      <ul style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        paddingLeft: tokens.spacing.lg
      }}>
        {notas.ideasFundamentales && notas.ideasFundamentales.map((idea, index) => (
          <li key={index} style={{ 
            marginBottom: tokens.spacing.sm,
            padding: tokens.spacing.sm,
            backgroundColor: theme.background,
            borderRadius: tokens.borderRadius.md,
            borderLeft: `${tokens.borderWidth.thick} solid ${theme.primary}`
          }}>
            {idea}
          </li>
        ))}
      </ul>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        ❓ Preguntas Clave
      </h5>
      <ul style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        paddingLeft: tokens.spacing.lg
      }}>
        {notas.preguntasClave && notas.preguntasClave.map((pregunta, index) => (
          <li key={index} style={{ 
            marginBottom: tokens.spacing.sm,
            fontStyle: 'italic'
          }}>
            {pregunta}
          </li>
        ))}
      </ul>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🎯 Argumentos
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        {notas.argumentos && notas.argumentos.map((argumento, index) => (
          <div key={index} style={{
            padding: tokens.spacing.md,
            backgroundColor: theme.background,
            borderRadius: tokens.borderRadius.md,
            border: `${tokens.borderWidth.normal} solid ${theme.border}`
          }}>
            <p style={{ 
              color: theme.text,
              lineHeight: tokens.lineHeight.relaxed,
              margin: `0 0 ${tokens.spacing.sm} 0`
            }}>
              <strong style={{ color: theme.secondary }}>Premisa:</strong> {argumento.premisa}
            </p>
            <p style={{ 
              color: theme.text,
              lineHeight: tokens.lineHeight.relaxed,
              margin: 0,
              paddingTop: tokens.spacing.sm,
              borderTop: `${tokens.borderWidth.thin} solid ${theme.border}`
            }}>
              <strong style={{ color: theme.primary }}>Conclusión:</strong> {argumento.conclusion}
            </p>
          </div>
        ))}
      </div>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🏛️ Corriente Filosófica
      </h5>
      <p style={{ 
        color: theme.text,
        lineHeight: tokens.lineHeight.relaxed,
        margin: 0,
        padding: tokens.spacing.md,
        backgroundColor: theme.background,
        borderRadius: tokens.borderRadius.md,
        borderLeft: `${tokens.borderWidth.thick} solid ${theme.accent}`
      }}>
        {notas.corrienteFilosofica}
      </p>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        📚 Conceptos Esenciales
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
        {notas.conceptosEsenciales && notas.conceptosEsenciales.map((concepto, index) => (
          <div key={index} style={{
            padding: tokens.spacing.sm,
            backgroundColor: theme.background,
            borderRadius: tokens.borderRadius.md,
            borderLeft: `${tokens.borderWidth.thick} solid ${theme.secondary}`
          }}>
            <p style={{ 
              color: theme.text,
              lineHeight: tokens.lineHeight.relaxed,
              margin: 0
            }}>
              <strong style={{ color: theme.secondary }}>{concepto.concepto}:</strong> {concepto.definicion}
            </p>
          </div>
        ))}
      </div>
    </div>
    
    <div style={{ 
      marginTop: tokens.spacing.lg,
      backgroundColor: theme.cardBg,
      padding: tokens.spacing.lg,
      borderRadius: tokens.borderRadius.lg,
      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
      boxShadow: tokens.boxShadow.sm
    }}>
      <h5 style={{ 
        color: theme.primary,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs
      }}>
        🔑 Conceptos Clave
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
        {notas.conceptosClave && notas.conceptosClave.map((concepto, index) => (
          <ConceptoEtiqueta key={index} concepto={concepto} theme={theme} />
        ))}
      </div>
    </div>
  </div>
));

/**
 * Componente para notas de ensayo
 */
const NotasEnsayo = React.memo(({ notas, theme }) => (
  <div style={{ marginTop: '20px' }}>
    <h3 style={{ color: theme.text }}>Notas de Estudio - Ensayo</h3>
    <h4 style={{ color: theme.text }}>{notas.titulo}</h4>
    
    <div style={{ marginTop: '15px' }}>
      <h5 style={{ color: theme.primary }}>Tesis Principal</h5>
      <p style={{ color: theme.text }}>{notas.tesisPrincipal}</p>
    </div>
    
    <div style={{ marginTop: '15px' }}>
      <h5 style={{ color: theme.primary }}>Ideas Secundarias</h5>
      <ul style={{ color: theme.text }}>
        {notas.ideasSecundarias && notas.ideasSecundarias.map((idea, index) => (
          <li key={index}>{idea}</li>
        ))}
      </ul>
    </div>
    
    <div style={{ marginTop: '15px' }}>
      <h5 style={{ color: theme.primary }}>Evidencia</h5>
      <ul style={{ color: theme.text }}>
        {notas.evidencia && notas.evidencia.map((item, index) => (
          <li key={index}>
            <strong>{item.tipo}:</strong> {item.descripcion}
          </li>
        ))}
      </ul>
    </div>
    
    <div style={{ marginTop: '15px' }}>
      <h5 style={{ color: theme.primary }}>Estructura Lógica</h5>
      <ol style={{ color: theme.text }}>
        {notas.estructuraLogica && notas.estructuraLogica.map((punto, index) => (
          <li key={index}>{punto}</li>
        ))}
      </ol>
    </div>
    
    <div style={{ marginTop: '15px' }}>
      <h5 style={{ color: theme.primary }}>Conclusiones</h5>
      <ul style={{ color: theme.text }}>
        {notas.conclusiones && notas.conclusiones.map((conclusion, index) => (
          <li key={index}>{conclusion}</li>
        ))}
      </ul>
    </div>
    
    <div style={{ marginTop: '15px' }}>
      <h5 style={{ color: theme.primary }}>Conceptos Clave</h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {notas.conceptosClave && notas.conceptosClave.map((concepto, index) => (
          <ConceptoEtiqueta key={index} concepto={concepto} theme={theme} />
        ))}
      </div>
    </div>
  </div>
));

/**
 * Vista genérica (backend): resumen, notas, preguntas y tarjetas
 */
const NotasGenericas = React.memo(({ data, theme }) => {
  const Tarjeta = ({ card, idx }) => {
    const [show, setShow] = React.useState(false);
    const [isFlipping, setIsFlipping] = React.useState(false);
    
    const handleFlip = () => {
      setIsFlipping(true);
      setTimeout(() => {
        setShow(s => !s);
        setIsFlipping(false);
      }, 150);
    };
    
    return (
      <div style={{
        backgroundColor: theme.cardBg,
        border: `${tokens.borderWidth.normal} solid ${theme.border}`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.lg,
        width: typeof window !== 'undefined' && window.innerWidth < 600 ? '100%' : 'calc(50% - 8px)',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: tokens.transition.all,
        transform: isFlipping ? 'scale(0.98)' : 'scale(1)',
        boxShadow: tokens.boxShadow.md
      }}
      onMouseOver={(e) => {
        if (!isFlipping) {
          e.currentTarget.style.boxShadow = tokens.boxShadow.lg;
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseOut={(e) => {
        if (!isFlipping) {
          e.currentTarget.style.boxShadow = tokens.boxShadow.md;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}>
        <div>
          <div style={{ 
            color: theme.text, 
            fontWeight: tokens.fontWeight.semibold, 
            marginBottom: tokens.spacing.md,
            fontSize: tokens.fontSize.base,
            lineHeight: tokens.lineHeight.normal
          }}>
            {card.frente}
          </div>
          
          {show && (
            <div style={{
              color: theme.text,
              marginTop: tokens.spacing.md,
              padding: tokens.spacing.md,
              backgroundColor: theme.background,
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.fontSize.sm,
              lineHeight: tokens.lineHeight.relaxed,
              animation: 'fadeIn 0.3s ease',
              borderLeft: `${tokens.borderWidth.thick} solid ${theme.primary}`
            }}>
              {card.reverso}
            </div>
          )}
        </div>
        
        <button
          onClick={handleFlip}
          style={{
            backgroundColor: show ? theme.primary : theme.secondary,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.borderRadius.md,
            padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
            cursor: 'pointer',
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.bold,
            marginTop: tokens.spacing.md,
            transition: tokens.transition.all,
            minHeight: tokens.components.button.minHeight,
            boxShadow: tokens.boxShadow.sm,
            width: '100%'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = tokens.boxShadow.md;
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = tokens.boxShadow.sm;
          }}>
          {show ? '🔒 Ocultar' : '🔓 Mostrar'} respuesta
        </button>
        
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @media (prefers-reduced-motion: reduce) {
            @keyframes fadeIn {
              from, to { 
                opacity: 1; 
                transform: translateY(0); 
              }
            }
          }
        `}</style>
      </div>
    );
  };

  return (
    <div style={{ marginTop: tokens.spacing.lg }}>
      {data.resumen && (
        <div style={{ marginBottom: tokens.spacing.lg }}>
          <h3 style={{ 
            color: theme.text, 
            margin: `0 0 ${tokens.spacing.md} 0`,
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.semibold,
            borderBottom: `${tokens.borderWidth.normal} solid ${theme.border}`,
            paddingBottom: tokens.spacing.sm
          }}>
            📝 Resumen
          </h3>
          <p style={{ 
            color: theme.text,
            lineHeight: tokens.lineHeight.relaxed,
            fontSize: tokens.fontSize.base
          }}>
            {data.resumen}
          </p>
        </div>
      )}

      {Array.isArray(data.notas) && data.notas.length > 0 && (
        <div style={{ marginBottom: tokens.spacing.lg }}>
          <h3 style={{ 
            color: theme.text, 
            margin: `0 0 ${tokens.spacing.md} 0`,
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.semibold,
            borderBottom: `${tokens.borderWidth.normal} solid ${theme.border}`,
            paddingBottom: tokens.spacing.sm
          }}>
            💡 Notas clave
          </h3>
          <ul style={{ 
            color: theme.text,
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            {data.notas.map((n, i) => (
              <li key={i} style={{
                padding: `${tokens.spacing.md} ${tokens.spacing.md}`,
                marginBottom: tokens.spacing.sm,
                backgroundColor: theme.background,
                borderRadius: tokens.borderRadius.md,
                borderLeft: `${tokens.borderWidth.thick} solid ${theme.primary}`,
                lineHeight: tokens.lineHeight.relaxed
              }}>
                <strong style={{ color: theme.primary }}>{n.titulo}:</strong> {n.contenido}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(data.preguntas) && data.preguntas.length > 0 && (
        <div style={{ marginBottom: tokens.spacing.lg }}>
          <h3 style={{ 
            color: theme.text, 
            margin: `0 0 ${tokens.spacing.md} 0`,
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.semibold,
            borderBottom: `${tokens.borderWidth.normal} solid ${theme.border}`,
            paddingBottom: tokens.spacing.sm
          }}>
            ❓ Preguntas de evocación
          </h3>
          <ol style={{ 
            color: theme.text,
            paddingLeft: tokens.spacing.lg,
            margin: 0
          }}>
            {data.preguntas.map((q, i) => (
              <li key={i} style={{
                marginBottom: tokens.spacing.md,
                lineHeight: tokens.lineHeight.relaxed
              }}>
                {q}
              </li>
            ))}
          </ol>
        </div>
      )}

      {Array.isArray(data.tarjetas) && data.tarjetas.length > 0 && (
        <div style={{ marginBottom: tokens.spacing.lg }}>
          <h3 style={{ 
            color: theme.text, 
            margin: `0 0 ${tokens.spacing.md} 0`,
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.semibold,
            borderBottom: `${tokens.borderWidth.normal} solid ${theme.border}`,
            paddingBottom: tokens.spacing.sm
          }}>
            🎴 Tarjetas (flashcards)
          </h3>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: tokens.spacing.md, 
            marginTop: tokens.spacing.md
          }}>
            {data.tarjetas.map((t, i) => (
              <Tarjeta key={i} card={t} idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Componente principal para renderizar notas (genéricas o por tipo)
 */
const NotasContenido = React.memo(({ notas, theme }) => {
  if (!notas) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: theme.lightText 
      }}>
        <p>No hay notas disponibles.</p>
      </div>
    );
  }

  // Si viene del backend (esquema genérico): mostrar vista genérica
  if (notas && (notas.resumen || (Array.isArray(notas.preguntas) && notas.preguntas.length))) {
    return <NotasGenericas data={notas} theme={theme} />;
  }

  // Renderizar según el tipo de texto (vista detallada por tipo)
  switch (notas.tipoTexto) {
    case 'narrativo':
      return <NotasNarrativo notas={notas} theme={theme} />;
    case 'poetico':
      return <NotasPoetico notas={notas} theme={theme} />;
    case 'filosofico':
      return <NotasFilosofico notas={notas} theme={theme} />;
    case 'ensayo':
      return <NotasEnsayo notas={notas} theme={theme} />;
    default:
      return (
        <div style={{ 
          marginTop: '20px',
          padding: '20px',
          backgroundColor: theme.cardBg,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`
        }}>
          <h3 style={{ color: theme.text }}>Notas de Estudio</h3>
          <p style={{ color: theme.error }}>
            Tipo de texto no reconocido: "{notas.tipoTexto}". 
            Por favor, regenera las notas.
          </p>
          <p style={{ color: theme.lightText, fontSize: '0.9em' }}>
            Tipos soportados: narrativo, poético, filosófico, ensayo
          </p>
        </div>
      );
  }
});

export default NotasContenido;
