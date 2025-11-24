import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import useStudyItems from '../hooks/useStudyItems';

const Container = styled.div`
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-top: 1.25rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  align-items: center;
`;

const Select = styled.select`
  background: ${p => p.theme.cardBg};
  border: 1px solid ${p => p.theme.border};
  color: ${p => p.theme.text};
  font-size: 0.7rem;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
`;

const ToggleBtn = styled.button`
  background: ${p => p.$active ? p.theme.primary : p.theme.cardBg};
  border: 1px solid ${p => p.theme.border};
  color: ${p => p.$active ? '#fff' : p.theme.text};
  font-size: 0.65rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

const ProgressBarOuter = styled.div`
  width: 100%;
  height: 6px;
  background: ${p => p.theme.border};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressBarInner = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${p => p.theme.primary}, ${p => p.theme.secondary});
  width: ${p => p.$pct}%;
  transition: width 0.4s ease;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 260px;
  overflow-y: auto;
`;

const Item = styled.li`
  background: ${p => p.theme.cardBg};
  border: 1px solid ${p => p.theme.border};
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Content = styled.div`
  font-size: 0.85rem;
  line-height: 1.3;
  color: ${p => p.theme.text};
`;

const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  opacity: 0.8;
  color: ${p => p.theme.textMuted};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const QualityBtn = styled.button`
  background: ${p => p.$q >= 4 ? p.theme.primary : p.$q <=1 ? p.theme.danger || '#c0392b' : p.theme.surfaceHover};
  border: none;
  color: #fff;
  padding: 0.3rem 0.5rem;
  font-size: 0.65rem;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.9;
  &:hover { opacity: 1; }
`;

/**
 * PanelStudyItems - interfaz mínima para practicar items generados automáticamente.
 * Permite marcar calidad (0-5) para reprogramar el siguiente intervalo.
 */
export default function PanelStudyItems({ texto, theme }) {
  const { dueItems, items, reviewItem } = useStudyItems(texto);
  const [dimensionFilter, setDimensionFilter] = useState('all');
  const [showReviewed, setShowReviewed] = useState(false);

  const dimensions = useMemo(() => {
    const set = new Set(items.map(i => i.dimension));
    return Array.from(set).sort();
  }, [items]);

  const reviewedCount = useMemo(() => items.filter(i => i.reviewCount > 0).length, [items]);
  const progressPct = useMemo(() => items.length ? (reviewedCount / items.length) * 100 : 0, [items, reviewedCount]);

  // Filtrado de items a mostrar (pendientes o todos si showReviewed)
  const baseList = useMemo(() => {
    const pool = showReviewed ? items : dueItems;
    return pool.filter(i => dimensionFilter === 'all' || i.dimension === dimensionFilter);
  }, [items, dueItems, showReviewed, dimensionFilter]);

  if (!texto || !items.length) return null;

  return (
    <Container theme={theme}>
      <Header>
        <h4 style={{ margin: 0, fontSize: '0.95rem', color: theme.text }}>🧠 Repaso Espaciado</h4>
        <span style={{ fontSize: '0.65rem', color: theme.textMuted }}>{dueItems.length} pendientes / {items.length} total</span>
      </Header>
      <ProgressBarOuter theme={theme}>
        <ProgressBarInner theme={theme} $pct={progressPct} />
      </ProgressBarOuter>
      <Toolbar>
        <Select
          theme={theme}
          value={dimensionFilter}
          onChange={e => setDimensionFilter(e.target.value)}
        >
          <option value="all">Todas las dimensiones</option>
          {dimensions.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <ToggleBtn
          type="button"
          theme={theme}
            $active={showReviewed}
          onClick={() => setShowReviewed(s => !s)}
        >{showReviewed ? 'Mostrar pendientes' : 'Ver todos'}</ToggleBtn>
      </Toolbar>
      {baseList.length === 0 && (
        <div style={{ fontSize: '0.7rem', color: theme.textMuted, padding: '0.25rem 0' }}>
          {showReviewed ? 'No hay items revisados en este filtro.' : 'No hay items pendientes en este filtro.'}
        </div>
      )}
      <List>
        {baseList.slice(0, 18).map(it => (
          <Item key={it.itemId} theme={theme}>
            <Content>{it.content}</Content>
            <Meta theme={theme}>
              <span>{it.dimension}</span>
              <span>EF {it.ef.toFixed(2)} · R{it.repetition}</span>
            </Meta>
            <Actions>
              {[0,1,2,3,4,5].map(q => (
                <QualityBtn
                  key={q}
                  theme={theme}
                  $q={q}
                  onClick={() => reviewItem(it.itemId, q)}
                  title={`Calidad ${q}`}
                >{q}</QualityBtn>
              ))}
            </Actions>
          </Item>
        ))}
      </List>
    </Container>
  );
}
