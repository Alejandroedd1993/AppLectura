import React, { useMemo, useState, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

const Box = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1rem;
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const Title = styled.h4`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 1rem;
`;

const TipsToggle = styled.button`
  background: ${props => props.$active ? props.theme.primary + '20' : 'transparent'};
  border: 1px solid ${props => props.$active ? props.theme.primary : props.theme.border};
  color: ${props => props.$active ? props.theme.primary : props.theme.textMuted};
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.primary};
    color: ${props => props.theme.primary};
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 240px;
  padding: 1rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
  margin-top: 0.75rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.primary}20;
  }

  &::placeholder {
    color: ${props => props.theme.textMuted};
  }
`;

// 🆕 Contador de requisitos en tiempo real
const StatsBar = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
`;

const StatPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    if (props.$status === 'ok') return props.theme.success + '20';
    if (props.$status === 'warning') return (props.theme.warning || '#f59e0b') + '20';
    return props.theme.textMuted + '15';
  }};
  color: ${props => {
    if (props.$status === 'ok') return props.theme.success;
    if (props.$status === 'warning') return props.theme.warning || '#f59e0b';
    return props.theme.textMuted;
  }};
  border: 1px solid ${props => {
    if (props.$status === 'ok') return props.theme.success + '40';
    if (props.$status === 'warning') return (props.theme.warning || '#f59e0b') + '40';
    return props.theme.border;
  }};
  transition: all 0.2s ease;
`;

const StatIcon = styled.span`
  font-size: 0.9rem;
`;

// 🆕 Panel de tips contextuales
const fadeIn = keyframes`
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 300px; }
`;

const TipsPanel = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: ${props => props.theme.primary}08;
  border: 1px solid ${props => props.theme.primary}30;
  border-radius: 8px;
  animation: ${fadeIn} 0.3s ease-out;
  overflow: hidden;
`;

const TipItem = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${props => props.theme.surface};
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: ${props => props.theme.text};
  line-height: 1.4;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const TipIcon = styled.span`
  flex-shrink: 0;
`;

const TipText = styled.span`
  flex: 1;
`;

// 🆕 Panel de citas guardadas
const CitationsPanel = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.primary}30;
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
`;

const CitationsPanelTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const CitationsLabel = styled.div`
  font-weight: 700;
  font-size: 0.85rem;
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const CitationCount = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
`;

const CitationItem = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.5rem;
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  color: ${props => props.theme.text};
  line-height: 1.4;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CitationText = styled.div`
  flex: 1;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CitationTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
  background: ${props => {
    switch (props.$tipo) {
      case 'reflexion': return '#8b5cf620';
      case 'comentario': return '#f59e0b20';
      case 'pregunta': return '#ef444420';
      default: return props.theme.primary + '20';
    }
  }};
  color: ${props => {
    switch (props.$tipo) {
      case 'reflexion': return '#8b5cf6';
      case 'comentario': return '#f59e0b';
      case 'pregunta': return '#ef4444';
      default: return props.theme.primary;
    }
  }};
  border: 1px solid ${props => {
    switch (props.$tipo) {
      case 'reflexion': return '#8b5cf640';
      case 'comentario': return '#f59e0b40';
      case 'pregunta': return '#ef444440';
      default: return props.theme.primary + '40';
    }
  }};
`;

const CitationReference = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.textMuted};
  margin-top: 0.2rem;
  font-style: normal;
`;

const InsertButton = styled.button`
  flex-shrink: 0;
  background: ${props => props.theme.primary}15;
  color: ${props => props.theme.primary};
  border: 1px solid ${props => props.theme.primary}40;
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${props => props.theme.primary}25;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CitationsToggle = styled.button`
  background: ${props => props.$active ? props.theme.primary + '20' : 'transparent'};
  border: 1px solid ${props => props.$active ? props.theme.primary : props.theme.border};
  color: ${props => props.$active ? props.theme.primary : props.theme.textMuted};
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.primary};
    color: ${props => props.theme.primary};
  }
`;

const EmptyCitations = styled.div`
  color: ${props => props.theme.textMuted};
  font-size: 0.85rem;
  text-align: center;
  padding: 0.75rem;
`;

// Helpers para estadísticas
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

function countParagraphs(text) {
  if (!text || typeof text !== 'string') return 0;
  return text
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0).length;
}

function countQuotes(text) {
  if (!text || typeof text !== 'string') return 0;
  // Soporta comillas dobles "..." y angulares «...»
  const doubleQuotes = text.match(/"([^"]{10,})"/g) || [];
  const angularQuotes = text.match(/«([^»]{10,})»/g) || [];
  return doubleQuotes.length + angularQuotes.length;
}

function hasArtifactReference(text) {
  if (!text || typeof text !== 'string') return false;
  return /\b(resumen|mapa|análisis|analisis|respuesta|artefacto|bitácora|bitacora)\b/i.test(text);
}

// Requisitos del ensayo
const MIN_WORDS = 800;
const MAX_WORDS = 1200;
const MIN_CITATIONS = 3;
const MIN_PARAGRAPHS = 5;

// 🆕 Generador de tips contextuales
function generateTips(stats, text) {
  const tips = [];
  
  // Tips basados en palabras
  if (stats.words === 0) {
    tips.push({ icon: '✏️', text: 'Comienza con una introducción que presente tu tesis principal sobre la lectura.' });
  } else if (stats.words < 200) {
    tips.push({ icon: '📝', text: 'Buen inicio. Desarrolla tu argumento central y conecta con el texto original.' });
  } else if (stats.words < MIN_WORDS * 0.5) {
    tips.push({ icon: '📖', text: 'Añade más desarrollo. Considera incluir ejemplos del texto y tu análisis crítico.' });
  } else if (stats.words < MIN_WORDS) {
    tips.push({ icon: '🎯', text: `Faltan ${MIN_WORDS - stats.words} palabras. Profundiza en tus argumentos o añade una contraargumentación.` });
  } else if (stats.words > MAX_WORDS) {
    tips.push({ icon: '✂️', text: `Excedes el límite por ${stats.words - MAX_WORDS} palabras. Sintetiza ideas redundantes.` });
  }
  
  // Tips basados en citas
  if (stats.quotesCount === 0 && stats.words > 100) {
    tips.push({ icon: '💬', text: 'Incluye citas textuales del texto entre comillas ("..." o «...») para sustentar tus ideas.' });
  } else if (stats.quotesCount < MIN_CITATIONS && stats.words > 300) {
    tips.push({ icon: '📚', text: `Necesitas ${MIN_CITATIONS - stats.quotesCount} cita(s) más. Usa evidencia textual para fortalecer argumentos.` });
  }
  
  // Tips basados en párrafos
  if (stats.paragraphs < 3 && stats.words > 200) {
    tips.push({ icon: '¶', text: 'Separa tus ideas en párrafos (usa líneas en blanco). Estructura: intro → desarrollo → conclusión.' });
  } else if (stats.paragraphs < MIN_PARAGRAPHS && stats.words > 500) {
    tips.push({ icon: '🏗️', text: `Organiza mejor: necesitas al menos ${MIN_PARAGRAPHS} párrafos para una estructura clara.` });
  }
  
  // Tips sobre referencias a artefactos
  if (!hasArtifactReference(text) && stats.words > 400) {
    tips.push({ icon: '🔗', text: 'Conecta tu ensayo con tus artefactos formativos (resumen, mapa, análisis previos).' });
  }
  
  // Tip final si todo está bien
  if (tips.length === 0 && stats.words >= MIN_WORDS && stats.words <= MAX_WORDS) {
    tips.push({ icon: '✅', text: '¡Excelente! Tu ensayo cumple los requisitos. Revisa coherencia y envía cuando estés listo.' });
  }
  
  return tips.slice(0, 3); // Máximo 3 tips a la vez
}

export default function EnsayoEditor({ theme, value, onChange, disabled = false, citations = [], onInsertCitation }) {
  const [showTips, setShowTips] = useState(true);
  const [showCitations, setShowCitations] = useState(false);
  const textareaRef = useRef(null);
  const [cursorSelection, setCursorSelection] = useState({ start: 0, end: 0 });

  const handleCursorChange = (event) => {
    const start = event?.target?.selectionStart ?? 0;
    const end = event?.target?.selectionEnd ?? start;
    setCursorSelection({ start, end });
  };
  
  const stats = useMemo(() => {
    const words = countWords(value);
    const paragraphs = countParagraphs(value);
    const quotesCount = countQuotes(value);

    return {
      words,
      paragraphs,
      quotesCount,
      // Estados: 'pending' (vacío/bajo), 'warning' (cerca), 'ok' (cumple)
      wordsStatus: words === 0 ? 'pending' 
        : words < MIN_WORDS * 0.8 ? 'pending'
        : words < MIN_WORDS ? 'warning'
        : words <= MAX_WORDS ? 'ok'
        : 'warning', // excede máximo
      paragraphsStatus: paragraphs === 0 ? 'pending'
        : paragraphs < MIN_PARAGRAPHS ? 'pending'
        : 'ok',
      citationsStatus: quotesCount === 0 ? 'pending'
        : quotesCount < MIN_CITATIONS ? 'pending'
        : 'ok'
    };
  }, [value]);

  const tips = useMemo(() => generateTips(stats, value), [stats, value]);

  const wordsLabel = useMemo(() => {
    if (stats.words === 0) return `0/${MIN_WORDS}–${MAX_WORDS}`;
    if (stats.words < MIN_WORDS) return `${stats.words}/${MIN_WORDS} mín.`;
    if (stats.words > MAX_WORDS) return `${stats.words}/${MAX_WORDS} máx.`;
    return `${stats.words} ✓`;
  }, [stats.words]);

  return (
    <Box theme={theme} role="region" aria-label="Editor del Ensayo Integrador">
      <TitleRow>
        <Title theme={theme}>✍️ Ensayo</Title>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {citations.length > 0 && (
            <CitationsToggle
              theme={theme}
              $active={showCitations}
              onClick={() => setShowCitations(!showCitations)}
              type="button"
            >
              � Cuaderno ({citations.length}) {showCitations ? '▲' : '▼'}
            </CitationsToggle>
          )}
          <TipsToggle 
            theme={theme} 
            $active={showTips}
            onClick={() => setShowTips(!showTips)}
            type="button"
          >
            💡 Tips {showTips ? 'ON' : 'OFF'}
          </TipsToggle>
        </div>
      </TitleRow>
      <Textarea
        ref={textareaRef}
        theme={theme}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onClick={handleCursorChange}
        onKeyUp={handleCursorChange}
        onSelect={handleCursorChange}
        placeholder="Escribe aquí tu Ensayo Integrador…"
        disabled={disabled}
      />

      {/* 🆕 Panel del Cuaderno de Lectura */}
      {showCitations && citations.length > 0 && (
        <CitationsPanel theme={theme}>
          <CitationsPanelTitle>
            <CitationsLabel theme={theme}>
              📓 Cuaderno de Lectura
              <CitationCount theme={theme}>{citations.length}</CitationCount>
            </CitationsLabel>
          </CitationsPanelTitle>
          {citations.map((cit) => {
            const tipo = cit.tipo || 'cita';
            const tipoIcons = { cita: '📌', reflexion: '💭', comentario: '📝', pregunta: '❓' };
            const tipoLabels = { cita: 'Cita', reflexion: 'Reflexión', comentario: 'Comentario', pregunta: 'Pregunta' };
            const isInsertable = tipo !== 'pregunta';
            return (
              <CitationItem key={cit.id} theme={theme}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                    <CitationTypeBadge theme={theme} $tipo={tipo}>
                      {tipoIcons[tipo]} {tipoLabels[tipo]}
                    </CitationTypeBadge>
                  </div>
                  <CitationText>
                    {tipo === 'cita' ? `«${cit.texto}»` : cit.texto}
                  </CitationText>
                  {cit.nota && tipo !== 'cita' && (
                    <CitationReference theme={theme}>
                      📎 Sobre: «{cit.nota.length > 60 ? cit.nota.substring(0, 60) + '…' : cit.nota}»
                    </CitationReference>
                  )}
                </div>
                {isInsertable && (
                  <InsertButton
                    theme={theme}
                    type="button"
                    onClick={() => {
                      const selection = {
                        start: cursorSelection?.start ?? 0,
                        end: cursorSelection?.end ?? (cursorSelection?.start ?? 0)
                      };
                      onInsertCitation?.(cit.texto, selection, tipo);

                      const insertedText = tipo === 'cita' ? `«${cit.texto}»` : cit.texto;
                      const nextPos = (selection.start || 0) + insertedText.length;
                      requestAnimationFrame(() => {
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                          textareaRef.current.setSelectionRange(nextPos, nextPos);
                          setCursorSelection({ start: nextPos, end: nextPos });
                        }
                      });
                    }}
                    disabled={disabled}
                    title={tipo === 'cita' ? 'Insertar cita textual' : 'Insertar en el ensayo'}
                  >
                    ➕ Insertar
                  </InsertButton>
                )}
              </CitationItem>
            );
          })}
        </CitationsPanel>
      )}

      {showCitations && citations.length === 0 && (
        <CitationsPanel theme={theme}>
          <EmptyCitations theme={theme}>
            No tienes notas aún. En la pestaña de Lectura, selecciona texto y usa 📌 Cita o 📓 Anotar.
          </EmptyCitations>
        </CitationsPanel>
      )}
      
      {/* 🆕 Barra de estadísticas en tiempo real */}
      <StatsBar theme={theme}>
        <StatPill theme={theme} $status={stats.wordsStatus} title={`Rango requerido: ${MIN_WORDS}–${MAX_WORDS} palabras`}>
          <StatIcon>📝</StatIcon>
          Palabras: {wordsLabel}
        </StatPill>
        <StatPill theme={theme} $status={stats.citationsStatus} title={`Mínimo ${MIN_CITATIONS} citas entre comillas ("..." o «...»)`}>
          <StatIcon>💬</StatIcon>
          Citas: {stats.quotesCount}/{MIN_CITATIONS}
        </StatPill>
        <StatPill theme={theme} $status={stats.paragraphsStatus} title={`Mínimo ${MIN_PARAGRAPHS} párrafos separados por líneas en blanco`}>
          <StatIcon>¶</StatIcon>
          Párrafos: {stats.paragraphs}/{MIN_PARAGRAPHS}
        </StatPill>
      </StatsBar>
      
      {/* 🆕 Panel de tips contextuales */}
      {showTips && tips.length > 0 && (
        <TipsPanel theme={theme}>
          {tips.map((tip, idx) => (
            <TipItem key={idx} theme={theme}>
              <TipIcon>{tip.icon}</TipIcon>
              <TipText>{tip.text}</TipText>
            </TipItem>
          ))}
        </TipsPanel>
      )}
    </Box>
  );
}
