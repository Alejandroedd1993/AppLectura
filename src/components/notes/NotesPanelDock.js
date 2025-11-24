import React, { useState } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  position: fixed;
  top: 60px;
  right: 20px;
  width: 320px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: ${p => p.theme?.surface || '#fff'};
  border: 1px solid ${p => p.theme?.border || '#ccc'};
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0,0,0,.15);
  z-index: 1700;
  overflow: hidden;
`;

const Header = styled.div`
  padding: .55rem .75rem;
  background: ${p => p.theme?.primary || '#2563eb'};
  color: #fff;
  font-size: .7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: .6rem .65rem .75rem;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  background: ${p => p.theme?.background || '#f8f9fb'};
`;

const Item = styled.div`
  background: ${p => p.theme?.surface || '#fff'};
  border: 1px solid ${p => p.theme?.border || '#ddd'};
  border-radius: 8px;
  padding: .5rem .55rem .6rem;
  font-size: .65rem;
  line-height: 1.3;
  position: relative;
`;

const Actions = styled.div`
  display: flex;
  gap: .35rem;
  margin-top: .4rem;
`;

const SmallBtn = styled.button`
  background: ${p => p.$danger ? (p.theme?.danger || '#b91c1c') : (p.theme?.primary || '#2563eb')};
  color: #fff;
  border: none;
  font-size: .55rem;
  padding: .3rem .5rem;
  border-radius: 4px;
  cursor: pointer;
  &:hover { opacity:.85; }
`;

const Empty = styled.div`
  font-size: .6rem;
  opacity: .7;
  text-align: center;
  padding: .75rem 0 .5rem;
`;

const Form = styled.form`
  padding: .45rem .55rem .55rem;
  border-top: 1px solid ${p => p.theme?.border || '#ddd'};
  background: ${p => p.theme?.surface || '#fff'};
  display: flex;
  flex-direction: column;
  gap: .4rem;
`;

const TextArea = styled.textarea`
  resize: vertical;
  min-height: 52px;
  max-height: 140px;
  font-size: .6rem;
  line-height: 1.25;
  border: 1px solid ${p => p.theme?.border || '#ccc'};
  border-radius: 6px;
  padding: .4rem .45rem;
  background: ${p => p.theme?.inputBg || '#fff'};
  color: ${p => p.theme?.text || '#222'};
`;

export const NOTE_MAX_CHARS = 500;

export default function NotesPanelDock({ notesApi, onClose }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    if (text.length > NOTE_MAX_CHARS) { alert('Nota demasiado larga (máx 500 caracteres)'); return; }
    notesApi.createNote(text, { createdAt: Date.now(), kind:'note' });
    setValue('');
  };

  const handleExport = () => {
    const exp = notesApi.exportNotes();
    if (!exp) return;
    const blob = new Blob([exp], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'notas-lectura.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel>
      <Header>
        <span>📝 Notas ({notesApi.notes.length})</span>
        <button onClick={onClose} style={{ background:'transparent', color:'#fff', border:'none', cursor:'pointer', fontSize:'.7rem' }}>✖</button>
      </Header>
      <List>
        {notesApi.notes.length === 0 && <Empty>Sin notas aún.</Empty>}
        {notesApi.notes.map(n => (
          <Item key={n.id}>
            <div style={{ whiteSpace:'pre-wrap' }}>{n.text}</div>
            <Actions>
              <SmallBtn $danger onClick={() => notesApi.removeNote(n.id)}>Borrar</SmallBtn>
            </Actions>
          </Item>
        ))}
      </List>
      <Form onSubmit={handleSubmit}>
        <TextArea value={value} onChange={(e) => setValue(e.target.value.slice(0, NOTE_MAX_CHARS + 20))} placeholder="Escribe una nota..." />
        <div style={{ display:'flex', gap:'.4rem' }}>
          <SmallBtn type="submit" style={{ flex:1 }}>Guardar</SmallBtn>
          <SmallBtn type="button" onClick={handleExport}>Exportar</SmallBtn>
        </div>
      </Form>
    </Panel>
  );
}