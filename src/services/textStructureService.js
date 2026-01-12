/**
 * @file Servicio para análisis estructural de textos con IA
 * @module textStructureService
 * 
 * Este servicio analiza textos académicos/documentales y detecta su estructura
 * semántica usando IA, identificando encabezados, secciones, listas, énfasis, etc.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

/**
 * Analiza la estructura de un texto usando IA
 * @param {string} text - Texto plano a analizar
 * @param {Object} options - Opciones de análisis
 * @returns {Promise<Object>} Texto con metadata estructural
 */
export async function analyzeTextStructure(text, options = {}) {
  const {
    maxLength = 15000, // REDUCIDO: Limitar a 15K para análisis rápido
    detectSections: _detectSections = true,
    detectEmphasis: _detectEmphasis = true,
    detectLists: _detectLists = true,
    language: _language = 'es',
    timeout = 30000 // 30 segundos timeout
  } = options;

  // Si el texto es muy corto, no necesita análisis estructural
  if (!text || text.length < 100) {
    return {
      text,
      structure: [],
      needsStructure: false
    };
  }

  // Truncar agresivamente para evitar timeouts (solo primeros párrafos)
  const textToAnalyze = text.length > maxLength 
    ? text.substring(0, maxLength) + '...'
    : text;
  
  console.log(`📊 Analizando ${textToAnalyze.length} caracteres (original: ${text.length})`);

  const prompt = `Analiza este texto académico e identifica su estructura.

FORMATO DE RESPUESTA: Devuelve SOLO un objeto JSON válido. No agregues texto antes o después del JSON.

TEXTO A ANALIZAR:
"""
${textToAnalyze}
"""

IDENTIFICA:
- Secciones académicas (Resumen, Introducción, Metodología, Resultados, Conclusiones, Referencias)
- Títulos y subtítulos
- Listas numeradas o con viñetas
- Citas textuales
- Notas al pie

FORMATO JSON REQUERIDO:
{
  "sections": [
    {
      "type": "section-header",
      "level": 1,
      "text": "Resumen",
      "startIndex": 0,
      "endIndex": 7,
      "category": "resumen"
    }
  ],
  "elements": [
    {
      "type": "paragraph",
      "text": "contenido del párrafo",
      "startIndex": 10,
      "endIndex": 100,
      "metadata": {}
    }
  ]
}

IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin markdown, sin explicaciones adicionales.`;

  try {
    // Crear AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${BACKEND_URL}/api/chat/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        provider: 'deepseek', // Usar DeepSeek por defecto (más económico y sin necesitar API key)
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de estructura documental. Respondes SOLO con JSON válido, sin texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Baja temperatura para respuestas consistentes
        max_tokens: 1500 // Reducido para respuestas más rápidas
      })
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error en análisis estructural: ${response.status} - ${errorData.error || 'Error desconocido'}`);
    }

    const data = await response.json();
    // El backend devuelve { content, finish_reason, usage }
    const aiResponse = data.content || '';

    if (!aiResponse || aiResponse.length < 10) {
      console.warn('⚠️ IA devolvió respuesta vacía o muy corta');
      return {
        text,
        structure: [],
        needsStructure: false,
        error: 'Respuesta IA vacía'
      };
    }

    // Extraer JSON de la respuesta (puede venir con markdown)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ IA no devolvió JSON válido, usando estructura básica');
      console.log('Respuesta IA recibida:', aiResponse.substring(0, 200));
      return {
        text,
        structure: [],
        needsStructure: false,
        error: 'No se pudo parsear respuesta IA'
      };
    }

    const structureData = JSON.parse(jsonMatch[0]);

    return {
      text,
      structure: {
        sections: structureData.sections || [],
        elements: structureData.elements || []
      },
      needsStructure: true,
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('⏱️ Timeout en análisis estructural (30s excedidos)');
    } else {
      console.error('❌ Error en análisis estructural con IA:', error.message);
    }
    
    // Fallback: devolver texto sin estructura (usará heurísticas)
    return {
      text,
      structure: [],
      needsStructure: false,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

/**
 * Aplica la estructura detectada por IA al texto para renderizado
 * @param {string} text - Texto original
 * @param {Object} structure - Estructura detectada por IA
 * @returns {Array} Segmentos de texto con metadata para renderizado
 */
export function applyStructureToText(text, structure) {
  if (!structure || !structure.sections || !structure.elements) {
    return [{ type: 'paragraph', text, metadata: {} }];
  }

  const segments = [];
  const allElements = [
    ...structure.sections.map(s => ({ ...s, isSection: true })),
    ...structure.elements
  ].sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

  let currentIndex = 0;

  for (const element of allElements) {
    const start = element.startIndex || currentIndex;
    const end = element.endIndex || start + element.text.length;

    // Agregar texto entre elementos si hay gap
    if (start > currentIndex) {
      const gapText = text.substring(currentIndex, start).trim();
      if (gapText) {
        segments.push({
          type: 'paragraph',
          text: gapText,
          metadata: {}
        });
      }
    }

    // Agregar elemento detectado
    segments.push({
      type: element.type,
      text: element.text || text.substring(start, end),
      metadata: {
        level: element.level,
        category: element.category,
        isSection: element.isSection,
        ...element.metadata
      }
    });

    currentIndex = end;
  }

  // Agregar texto restante
  if (currentIndex < text.length) {
    const remaining = text.substring(currentIndex).trim();
    if (remaining) {
      segments.push({
        type: 'paragraph',
        text: remaining,
        metadata: {}
      });
    }
  }

  return segments;
}

/**
 * Detecta si un texto necesita análisis estructural
 * (textos académicos, documentos formales, etc.)
 */
export function needsStructuralAnalysis(text) {
  if (!text || text.length < 500) return false;

  // Palabras clave que indican texto académico/formal
  const academicKeywords = [
    'resumen', 'abstract', 'introducción', 'metodología', 
    'resultados', 'conclusiones', 'referencias', 'objetivos',
    'marco teórico', 'discusión', 'análisis'
  ];

  const lowerText = text.toLowerCase();
  const hasAcademicTerms = academicKeywords.some(keyword => 
    lowerText.includes(keyword)
  );

  // Si tiene términos académicos y es largo, necesita análisis
  return hasAcademicTerms && text.length > 1000;
}

export default {
  analyzeTextStructure,
  applyStructureToText,
  needsStructuralAnalysis
};
