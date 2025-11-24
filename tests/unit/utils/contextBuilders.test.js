import { buildContextFromFullText, buildContextFromParagraphSelection, buildTutorContext, buildReadingWorkspaceContext } from '../../../src/utils/contextBuilders';

describe('contextBuilders', () => {
  const sampleText = 'A'.repeat(500) + 'FIN';

  test('buildContextFromFullText sin truncamiento', () => {
    const ctx = buildContextFromFullText('Texto corto', 100);
    expect(ctx).toMatch(/Texto completo del documento/);
    expect(ctx).toMatch(/Texto corto/);
  });

  test('buildContextFromFullText con truncamiento', () => {
    const long = 'X'.repeat(120);
    const ctx = buildContextFromFullText(long, 50);
    expect(ctx).toMatch(/truncado a 50/);
    expect(ctx).toMatch(/NOTA/);
  });

  test('buildContextFromParagraphSelection devuelve contexto con marcado >>>', () => {
    const parrafos = [
      { contenido: 'P0 lorem ipsum' },
      { contenido: 'P1 contenido clave' },
      { contenido: 'P2 final' }
    ];
    const ctx = buildContextFromParagraphSelection(parrafos, 1, 500);
    expect(ctx).toMatch(/Párrafo específico seleccionado/);
    expect(ctx).toMatch(/>>> P1 contenido clave/);
  });

  test('buildTutorContext usa selección cuando existe', () => {
    const parrafos = [ { contenido: 'Alpha' }, { contenido: 'Beta' } ];
    const ctx = buildTutorContext({ texto: 'TOTAL', parrafos, selectedIndex: 0 });
    expect(ctx).toMatch(/Alpha/);
    expect(ctx).toMatch(/Párrafo específico seleccionado/);
  });

  test('buildTutorContext cae a full text cuando no hay selección', () => {
    const ctx = buildTutorContext({ texto: 'Texto base', parrafos: [], selectedIndex: null });
    expect(ctx).toMatch(/Texto completo del documento/);
  });

  test('buildReadingWorkspaceContext truncamiento 4000', () => {
    const long = 'Z'.repeat(4500);
    const ctx = buildReadingWorkspaceContext(long, 4000);
    expect(ctx).toMatch(/Texto base para contextualizar/);
    expect(ctx).toMatch(/\[Texto truncado\]/);
  });
});
