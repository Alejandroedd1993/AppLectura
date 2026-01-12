import React, { useMemo, useState } from 'react';
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
  if (stats.citations === 0 && stats.words > 100) {
    tips.push({ icon: '💬', text: 'Incluye citas textuales del texto entre comillas ("..." o «...») para sustentar tus ideas.' });
  } else if (stats.citations < MIN_CITATIONS && stats.words > 300) {
    tips.push({ icon: '📚', text: `Necesitas ${MIN_CITATIONS - stats.citations} cita(s) más. Usa evidencia textual para fortalecer argumentos.` });
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

export default function EnsayoEditor({ theme, value, onChange, disabled = false }) {
  const [showTips, setShowTips] = useState(true);
  
  const stats = useMemo(() => {
    const words = countWords(value);
    const paragraphs = countParagraphs(value);
    const citations = countQuotes(value);

    return {
      words,
      paragraphs,
      citations,
      // Estados: 'pending' (vacío/bajo), 'warning' (cerca), 'ok' (cumple)
      wordsStatus: words === 0 ? 'pending' 
        : words < MIN_WORDS * 0.8 ? 'pending'
        : words < MIN_WORDS ? 'warning'
        : words <= MAX_WORDS ? 'ok'
        : 'warning', // excede máximo
      paragraphsStatus: paragraphs === 0 ? 'pending'
        : paragraphs < MIN_PARAGRAPHS ? 'pending'
        : 'ok',
      citationsStatus: citations === 0 ? 'pending'
        : citations < MIN_CITATIONS ? 'pending'
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
        <TipsToggle 
          theme={theme} 
          $active={showTips}
          onClick={() => setShowTips(!showTips)}
          type="button"
        >
          💡 Tips {showTips ? 'ON' : 'OFF'}
        </TipsToggle>
      </TitleRow>
      <Textarea
        theme={theme}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Escribe aquí tu Ensayo Integrador…"
        disabled={disabled}
      />
      
      {/* 🆕 Barra de estadísticas en tiempo real */}
      <StatsBar theme={theme}>
        <StatPill theme={theme} $status={stats.wordsStatus} title={`Rango requerido: ${MIN_WORDS}–${MAX_WORDS} palabras`}>
          <StatIcon>📝</StatIcon>
          Palabras: {wordsLabel}
        </StatPill>
        <StatPill theme={theme} $status={stats.citationsStatus} title={`Mínimo ${MIN_CITATIONS} citas entre comillas ("..." o «...»)`}>
          <StatIcon>💬</StatIcon>
          Citas: {stats.citations}/{MIN_CITATIONS}
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
