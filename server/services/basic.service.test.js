
import { analizarTextoBasico } from './basic.service.js';

describe('Servicio de Análisis Básico', () => {

  test('Debe calcular la complejidad como "básico" para un texto simple', () => {
    const texto = 'Este es un texto muy simple de leer.';
    const resultado = analizarTextoBasico(texto);
    expect(resultado.complejidad).toBe('básico');
  });

  test('Debe calcular la complejidad como "intermedio" para un texto más largo', () => {
    const texto = 'Este es un texto con oraciones un poco más elaboradas, lo que debería incrementar la complejidad general del análisis.';
    const resultado = analizarTextoBasico(texto);
    expect(resultado.complejidad).toBe('intermedio');
  });

  test('Debe calcular la complejidad como "avanzado" para un texto con palabras largas y oraciones complejas', () => {
    const texto = 'La desoxirribonucleoproteína es una macromolécula fundamental. La elucidación de su estructura tridimensional constituyó un hito.';
    const resultado = analizarTextoBasico(texto);
    expect(resultado.complejidad).toBe('avanzado');
  });

  test('Debe identificar las palabras más frecuentes correctamente', () => {
    const texto = 'Prueba prueba prueba, palabra palabra, otra.';
    const resultado = analizarTextoBasico(texto);
    const palabrasVocabulario = resultado.vocabulario.map(v => v.palabra);
    expect(palabrasVocabulario).toContain('prueba');
    expect(palabrasVocabulario).toContain('palabra');
  });

  test('Debe devolver un resumen truncado para textos largos', () => {
    const textoLargo = 'a'.repeat(600);
    const resultado = analizarTextoBasico(textoLargo);
    expect(resultado.resumen.length).toBe(503);
    expect(resultado.resumen.endsWith('...')).toBe(true);
  });

});
