import { buildPromptFromAction } from '../../src/utils/readerActionPrompts';

describe('buildPromptFromAction', () => {
  it('genera prompt para explain', () => {
    const p = buildPromptFromAction('explain', 'El átomo es...');
    expect(p).toMatch(/Explica/);
    expect(p).toMatch(/El átomo/);
  });
  it('retorna null si acción desconocida', () => {
    expect(buildPromptFromAction('foo', 'x')).toBeNull();
  });
});
