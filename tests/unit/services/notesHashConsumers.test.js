import openAINotesService from '../../../src/services/notes/OpenAINotesService';
import storageService from '../../../src/services/notes/StorageService';

describe('notes hash consumers', () => {
  const sampleText = 'Inicio ' + 'contenido '.repeat(200) + ' cierre';

  test('StorageService genera ids legacy estables', () => {
    const first = storageService.generarIdTexto(sampleText);
    const second = storageService.generarIdTexto(sampleText);

    expect(first).toBe(second);
    expect(first).toMatch(/^texto_\d+$/);
  });

  test('StorageService conserva hash base36 legacy del texto completo', () => {
    const hash = storageService.generarHashTexto(sampleText);

    expect(hash).toMatch(/^[0-9a-z]+$/);
    expect(hash).toBe(storageService.generarHashTexto(sampleText));
  });

  test('OpenAINotesService genera claves de cache estables con prefijo y longitud', () => {
    const key = openAINotesService.generateCacheKey('tipo', sampleText);

    expect(key).toBe(openAINotesService.generateCacheKey('tipo', sampleText));
    expect(key).toMatch(new RegExp(`^tipo_\\d+_${sampleText.length}$`));
  });
});