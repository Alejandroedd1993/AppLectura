/**
 * Servicio de análisis de texto con DeepSeek
 */

import { getAnalysisPrompt } from '../prompts/analysis.prompt.js';

/**
 * Analiza texto utilizando la API de DeepSeek
 * @param {string} texto - El texto a analizar
 * @returns {Promise<object>} El análisis completo del texto
 */
export async function analizarTextoConDeepSeek(texto) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log('🔥 Iniciando análisis con DeepSeek...');
    
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY no configurada');
    }
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un analista educativo. Responde estrictamente en JSON válido con la estructura solicitada.'
          },
          {
            role: 'user',
            content: getAnalysisPrompt(texto)
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error de DeepSeek API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('Respuesta vacía de DeepSeek API');
    }

    console.log('✅ Análisis con DeepSeek completado');
    
    // Parsear la respuesta JSON
    try {
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.warn('No se pudo parsear JSON de DeepSeek, devolviendo análisis básico');
      return {
        resumen: analysisText.slice(0, 500),
        ideasPrincipales: ['Análisis generado por DeepSeek'],
        analisisEstilistico: {
          tono: 'Informativo',
          sentimiento: 'Neutral',
          estilo: 'Estándar',
          publicoObjetivo: 'General'
        },
        preguntasReflexion: [
          '¿Cuáles son los puntos clave del texto?',
          '¿Qué propósito tiene este contenido?',
          '¿Cómo se puede aplicar esta información?'
        ],
        vocabulario: [
          { palabra: 'análisis', definicion: 'Examen detallado de una cosa para conocer sus características' },
          { palabra: 'texto', definicion: 'Conjunto de palabras que componen un escrito' }
        ],
        complejidad: 'Intermedio',
        temas: ['análisis', 'texto', 'contenido'],
        conclusiones: ['Texto analizado exitosamente con DeepSeek'],
        estadisticas: {
          palabras: texto.split(/\s+/).length,
          oraciones: texto.split(/[.!?]+/).filter(s => s.trim()).length,
          parrafos: texto.split(/\n\s*\n/).filter(p => p.trim()).length
        }
      };
    }

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout en análisis con DeepSeek');
    }
    
    console.error('❌ Error en análisis con DeepSeek:', error);
    throw new Error(`Error al comunicarse con DeepSeek: ${error.message}`);
  }
}
