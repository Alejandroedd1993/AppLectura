import { generateBasicAnalysis, mergeAnalysis } from '../../../src/services/basicAnalysisService';

describe('basicAnalysisService', () => {
  const sampleText = [
    'La metodologia del estudio presenta una hipotesis inicial y luego desarrolla un analisis.',
    'Por lo tanto, el texto propone una conclusion apoyada en evidencia y explicacion detallada.',
    'Finalmente, el autor ofrece ejemplos, resultados y una sintesis del problema tratado.'
  ].join(' ');

  test('generateBasicAnalysis produce un document_id estable con formato legacy', () => {
    const first = generateBasicAnalysis(sampleText);
    const second = generateBasicAnalysis(sampleText);

    expect(first.metadata.document_id).toBe(second.metadata.document_id);
    expect(first.metadata.document_id).toMatch(new RegExp(`^basic_\\d+_${sampleText.length}$`));
  });

  test('mergeAnalysis preserva el profundo y marca origen combinado', () => {
    const basic = generateBasicAnalysis(sampleText);
    const deep = {
      prelecture: { metadata: { genero_textual: 'Ensayo académico' } },
      metadata: { provider: 'deepseek' }
    };

    const merged = mergeAnalysis(basic, deep);

    expect(merged.prelecture.metadata.genero_textual).toBe('Ensayo académico');
    expect(merged.metadata._mergedFrom).toBe('basic+deep');
    expect(merged.metadata._isPreliminary).toBe(false);
  });
});