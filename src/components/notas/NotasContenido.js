/**
 * @file Componente para renderizar el contenido de las notas según el tipo de texto
 * @module NotasContenido
 * @version 2.0.0
 */

import React from 'react';
import * as tokens from '../../styles/designTokens';
import useMediaQuery from '../../hooks/useMediaQuery';

/**
 * Componente de tarjeta (flashcard)
 */
const Tarjeta = React.memo(({ card, theme, isMobile }) => {
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
      width: isMobile ? '100%' : 'calc(50% - 8px)',
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
        }}
        onFocus={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = tokens.boxShadow.md;
        }}
        onBlur={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = tokens.boxShadow.sm;
        }}>
        {show ? '🔒 Ocultar' : '🔓 Mostrar'} respuesta
      </button>
    </div>
  );
});

/**
 * Vista genérica (backend): resumen, notas, preguntas y tarjetas
 *
 * NOTA: Las vistas tipo-específicas (NotasNarrativo, NotasPoetico, NotasFilosofico,
 * NotasEnsayo) fueron eliminadas porque el backend siempre devuelve el schema genérico
 * validado por Zod: { resumen, notas[], preguntas[], tarjetas[] }.
 */
const NotasGenericas = React.memo(({ data, theme }) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [flashcardMode, setFlashcardMode] = React.useState('grid');
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const [copyStatus, setCopyStatus] = React.useState('');
  const [reviewedCards, setReviewedCards] = React.useState(new Set());
  const copyTimerRef = React.useRef(null);

  const tarjetas = Array.isArray(data.tarjetas) ? data.tarjetas : [];
  const safeIndex = Math.min(currentCardIndex, Math.max(0, tarjetas.length - 1));
  const reviewedCount = reviewedCards.size;
  const totalCards = tarjetas.length;
  const progressPercent = totalCards > 0 ? Math.round((reviewedCount / totalCards) * 100) : 0;

  // Marcar tarjeta como revisada al navegar en modo estudio
  const markAsReviewed = React.useCallback((index) => {
    setReviewedCards(prev => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (safeIndex !== currentCardIndex) {
      setCurrentCardIndex(safeIndex);
    }
  }, [safeIndex, currentCardIndex]);

  React.useEffect(() => {
    if (flashcardMode === 'single' && tarjetas.length > 0) {
      setCurrentCardIndex(0);
      setReviewedCards(new Set([0]));
    } else {
      setReviewedCards(new Set());
    }
  }, [flashcardMode, tarjetas.length]);

  const buildExportText = (payload) => {
    if (!payload) return '';
    const lines = [];

    if (payload.resumen) {
      lines.push('RESUMEN\n' + payload.resumen);
    }

    if (Array.isArray(payload.notas) && payload.notas.length) {
      lines.push('NOTAS CLAVE');
      payload.notas.forEach((n, i) => {
        lines.push(`${i + 1}. ${n.titulo}: ${n.contenido}`);
      });
    }

    if (Array.isArray(payload.preguntas) && payload.preguntas.length) {
      lines.push('PREGUNTAS DE EVOCACIÓN');
      payload.preguntas.forEach((q, i) => {
        lines.push(`${i + 1}. ${q}`);
      });
    }

    if (Array.isArray(payload.tarjetas) && payload.tarjetas.length) {
      lines.push('TARJETAS (FLASHCARDS)');
      payload.tarjetas.forEach((t, i) => {
        lines.push(`${i + 1}. ${t.frente} -> ${t.reverso}`);
      });
    }

    return lines.join('\n\n');
  };

  const handleCopy = async (text) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyStatus('Copiado');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('No se pudo copiar');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const handleDownload = (text) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'notas-de-estudio.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportText = buildExportText(data);
  const tieneResumen = Boolean(data.resumen);

  return (
    <div style={{ marginTop: tokens.spacing.lg }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: tokens.spacing.sm,
        marginBottom: tokens.spacing.lg
      }}>
        <button
          onClick={() => handleCopy(exportText)}
          disabled={!exportText}
          style={{
            backgroundColor: theme.primary,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.borderRadius.md,
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.semibold,
            minHeight: tokens.components.button.minHeight,
            transition: tokens.transition.all,
            opacity: exportText ? 1 : 0.6,
            cursor: exportText ? 'pointer' : 'default'
          }}
        >
          📋 Copiar todo
        </button>
        <button
          onClick={() => tieneResumen && handleCopy(`RESUMEN\n${data.resumen}`)}
          disabled={!tieneResumen}
          style={{
            backgroundColor: theme.secondary,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.borderRadius.md,
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.semibold,
            minHeight: tokens.components.button.minHeight,
            transition: tokens.transition.all,
            opacity: tieneResumen ? 1 : 0.6,
            cursor: tieneResumen ? 'pointer' : 'default'
          }}
        >
          📝 Copiar resumen
        </button>
        <button
          onClick={() => handleDownload(exportText)}
          disabled={!exportText}
          style={{
            backgroundColor: 'transparent',
            color: theme.text,
            border: `${tokens.borderWidth.normal} solid ${theme.border}`,
            borderRadius: tokens.borderRadius.md,
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.semibold,
            minHeight: tokens.components.button.minHeight,
            transition: tokens.transition.all,
            opacity: exportText ? 1 : 0.6,
            cursor: exportText ? 'pointer' : 'default'
          }}
        >
          ⬇️ Descargar .txt
        </button>
        {copyStatus && (
          <span style={{
            alignSelf: 'center',
            color: theme.lightText,
            fontSize: tokens.fontSize.sm
          }}>
            {copyStatus}
          </span>
        )}
      </div>
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
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setFlashcardMode(m => (m === 'grid' ? 'single' : 'grid'))}
              style={{
                backgroundColor: flashcardMode === 'single' ? theme.primary : 'transparent',
                color: flashcardMode === 'single' ? '#fff' : theme.primary,
                border: `${tokens.borderWidth.normal} solid ${theme.primary}`,
                borderRadius: tokens.borderRadius.md,
                padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                cursor: 'pointer',
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                minHeight: tokens.components.button.minHeight,
                transition: tokens.transition.normal
              }}
            >
              {flashcardMode === 'single' ? '🧩 Modo cuadrícula' : '🧠 Modo estudio'}
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: tokens.spacing.md, 
            marginTop: tokens.spacing.md
          }}>
            {flashcardMode === 'single' && tarjetas.length > 0 ? (
              <div style={{ width: '100%' }}>
                {/* Barra de progreso de revisión */}
                <div style={{
                  marginBottom: tokens.spacing.md,
                  padding: tokens.spacing.md,
                  backgroundColor: theme.cardBg,
                  borderRadius: tokens.borderRadius.md,
                  border: `${tokens.borderWidth.thin} solid ${theme.border}`
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: tokens.spacing.sm
                  }}>
                    <span style={{
                      color: theme.text,
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.semibold
                    }}>
                      📊 Progreso de revisión
                    </span>
                    <span style={{
                      color: progressPercent === 100 ? theme.primary : theme.lightText,
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.bold
                    }}>
                      {reviewedCount}/{totalCards} {progressPercent === 100 ? '✅' : `(${progressPercent}%)`}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: theme.border,
                    borderRadius: tokens.borderRadius.full,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      backgroundColor: progressPercent === 100 ? theme.primary : theme.secondary,
                      borderRadius: tokens.borderRadius.full,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: tokens.spacing.md,
                  gap: tokens.spacing.sm
                }}>
                  <button
                    onClick={() => {
                      const prev = Math.max(0, safeIndex - 1);
                      setCurrentCardIndex(prev);
                      markAsReviewed(prev);
                    }}
                    disabled={safeIndex === 0}
                    style={{
                      backgroundColor: 'transparent',
                      color: theme.text,
                      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
                      borderRadius: tokens.borderRadius.md,
                      padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                      cursor: safeIndex === 0 ? 'default' : 'pointer',
                      fontSize: tokens.fontSize.sm,
                      minHeight: tokens.components.button.minHeight
                    }}
                  >
                    ◀ Anterior
                  </button>
                  <span style={{ color: theme.lightText, fontSize: tokens.fontSize.sm }}>
                    {safeIndex + 1} / {tarjetas.length}
                  </span>
                  <button
                    onClick={() => {
                      const next = Math.min(tarjetas.length - 1, safeIndex + 1);
                      setCurrentCardIndex(next);
                      markAsReviewed(next);
                    }}
                    disabled={safeIndex >= tarjetas.length - 1}
                    style={{
                      backgroundColor: 'transparent',
                      color: theme.text,
                      border: `${tokens.borderWidth.normal} solid ${theme.border}`,
                      borderRadius: tokens.borderRadius.md,
                      padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                      cursor: safeIndex >= tarjetas.length - 1 ? 'default' : 'pointer',
                      fontSize: tokens.fontSize.sm,
                      minHeight: tokens.components.button.minHeight
                    }}
                  >
                    Siguiente ▶
                  </button>
                </div>
                <Tarjeta
                  key={`tarjeta-${safeIndex}`}
                  card={tarjetas[safeIndex]}
                  theme={theme}
                  isMobile={true}
                />
              </div>
            ) : (
              tarjetas.map((t, i) => (
                <Tarjeta key={i} card={t} theme={theme} isMobile={isMobile} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Componente principal para renderizar notas (schema genérico del backend)
 * 
 * NOTA: Las vistas tipo-específicas (NotasNarrativo, NotasPoetico, NotasFilosofico, 
 * NotasEnsayo) fueron eliminadas porque el backend siempre devuelve el schema genérico
 * validado por Zod: { resumen, notas[], preguntas[], tarjetas[] }.
 * Si en el futuro el backend soporte schemas diferenciados, se pueden reintroducir.
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

  return <NotasGenericas data={notas} theme={theme} />;
});

export default NotasContenido;
