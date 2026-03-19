/**
 * Controlador para generación de glosario dinámico
 */

import axios from 'axios';
import { sendError } from '../utils/responseHelpers.js';
import { sendValidationError } from '../utils/validationError.js';

/**
 * Genera glosario de términos clave del texto
 * POST /api/analysis/glossary
 * Body: { text: string, maxTerms?: number }
 */
export async function generateGlossary(req, res) {
  const startTime = Date.now();
  let responseSent = false;
  
  // Timeout de 90 segundos
  req.setTimeout(90000);
  res.setTimeout(90000);
  
  try {
    const { text, maxTerms = 6 } = req.body || {};
    
    if (!text || typeof text !== 'string' || text.trim().length < 200) {
      return sendValidationError(res, {
        error: 'Texto invalido o muy corto',
        mensaje: 'Se requieren al menos 200 caracteres para generar glosario.',
        codigo: 'INVALID_GLOSSARY_INPUT'
      });
    }

    console.log(`📚 [Glossary Controller] Generando glosario (max ${maxTerms} términos)...`);
    console.log(`   Longitud texto: ${text.length} caracteres`);

    // Extraer términos clave candidatos
    const candidateTerms = extractCandidateTerms(text);
    console.log(`   Términos candidatos: ${candidateTerms.length}`);

    // Seleccionar los mejores términos
    const selectedTerms = selectBestTerms(candidateTerms, text, maxTerms);
    console.log(`   Términos seleccionados: ${selectedTerms.length}`);

    // Generar definiciones con DeepSeek
    const glossary = await generateDefinitions(selectedTerms, text);

    const result = {
      terms: glossary,
      metadata: {
        total_terms: glossary.length,
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ [Glossary] Glosario generado en ${Date.now() - startTime}ms`);
    
    if (!responseSent) {
      responseSent = true;
      res.json(result);
    }

  } catch (error) {
    console.error('❌ [Glossary Controller] Error:', error);
    
    if (!responseSent) {
      responseSent = true;
      return sendError(res, 500, {
        error: 'Error generando glosario',
        mensaje: 'No se pudo generar el glosario en este momento.',
        codigo: 'GLOSSARY_GENERATION_ERROR',
        terms: []
      });
    }
  }
}

/**
 * Extrae términos candidatos del texto con mejor criterio
 */
function extractCandidateTerms(text) {
  // Palabras capitalizadas (posibles términos técnicos o nombres propios)
  const capitalizedRegex = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{4,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}){0,2}\b/g;
  const capitalizedTerms = [...new Set(text.match(capitalizedRegex) || [])];

  // Términos entre comillas (conceptos importantes)
  const quotedRegex = /"([^"]{5,50})"|'([^']{5,50})'/g;
  const quotedTerms = [];
  let match;
  while ((match = quotedRegex.exec(text)) !== null) {
    quotedTerms.push(match[1] || match[2]);
  }

  // Palabras técnicas/académicas por sufijos (priorizar estas)
  const technicalSuffixes = ['ción', 'sión', 'dad', 'tad', 'miento', 'ismo', 'logía', 'grafía', 'nomía', 'sofía', 'arquía', 'arquía', 'cracia', 'patía', 'tecnia', 'escopia'];
  const technicalTerms = [];
  const words = text.match(/\b\w{7,}\b/gi) || [];
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (technicalSuffixes.some(suffix => lowerWord.endsWith(suffix))) {
      technicalTerms.push(word);
    }
  }

  // Palabras con prefijos técnicos
  const technicalPrefixes = ['auto', 'bi', 'co', 'des', 'extra', 'inter', 'multi', 'pre', 'post', 'semi', 'sub', 'super', 'trans', 'meta', 'para', 'proto'];
  const prefixedTerms = [];
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (technicalPrefixes.some(prefix => lowerWord.startsWith(prefix) && lowerWord.length > prefix.length + 3)) {
      prefixedTerms.push(word);
    }
  }

  // Lista de frases comunes a excluir (no son términos complejos)
  const commonPhrases = new Set([
    'pero prefiero la', 'después de años', 'nuestro país no', 'por eso levanto', 
    'ya basta de', 'nos llamarán', 'prefiero la radicalidad', 'te llamé mil',
    'me muero de', 'en este texto', 'el autor dice', 'como se puede',
    'es importante', 'se debe', 'hay que', 'también es', 'pero también',
    'sin embargo', 'por lo tanto', 'de esta manera', 'en consecuencia'
  ]);

  // --- Detectar nombres propios (autor, fuente, editorial) para excluirlos ---
  // Nombres de persona: 2-4 palabras capitalizadas consecutivas (ej: "Elias Vante Fuente")
  const properNameRegex = /\b(?:Dr\.?\s+|Prof\.?\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b/g;
  const properNames = new Set();
  let nameMatch;
  while ((nameMatch = properNameRegex.exec(text)) !== null) {
    const name = nameMatch[1].trim();
    // Añadir nombre completo y cada parte
    properNames.add(name.toLowerCase());
    name.split(/\s+/).forEach(part => {
      if (part.length > 2) properNames.add(part.toLowerCase());
    });
  }
  // También detectar lo que viene después de "Autor:", "Fuente:", "por " seguido de mayúsculas
  const authorPatterns = /(?:Autor|Fuente|escrito por|según|señala|afirma|plantea|argumenta)[:.]?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})/gi;
  while ((nameMatch = authorPatterns.exec(text)) !== null) {
    const name = nameMatch[1].trim();
    properNames.add(name.toLowerCase());
    name.split(/\s+/).forEach(part => {
      if (part.length > 2) properNames.add(part.toLowerCase());
    });
  }

  // Combinar y filtrar
  const allTerms = [
    ...capitalizedTerms,
    ...quotedTerms,
    ...new Set(technicalTerms),
    ...new Set(prefixedTerms)
  ].filter(term => {
    if (!term) return false;
    const trimmed = term.trim();
    
    // Longitud mínima/máxima
    if (trimmed.length < 5 || trimmed.length > 50) return false;
    
    // Excluir artículos/determinantes al inicio
    if (/^(Este|Esta|Estos|Estas|El|La|Los|Las|Un|Una|Unos|Unas|Por|Para|Con|Sin|Del|De|En|Es|Son|Están|Está|Pero|Después|Nuestro|Como|También)\s/i.test(trimmed)) {
      return false;
    }
    
    // Excluir frases comunes
    const lowerTrimmed = trimmed.toLowerCase();
    if (commonPhrases.has(lowerTrimmed)) return false;
    
    // Excluir frases que empiezan con palabras funcionales muy comunes
    const functionalWords = /^(pero|después|nuestro|porque|aunque|también|además|incluso|sin embargo|no obstante)\s/i;
    if (functionalWords.test(trimmed)) return false;

    // Excluir nombres propios detectados (autores, personas, fuentes)
    if (properNames.has(lowerTrimmed)) return false;
    // Si el término es multi-palabra y TODAS las palabras son nombres propios → excluir
    const termParts = lowerTrimmed.split(/\s+/);
    if (termParts.length > 1 && termParts.every(p => properNames.has(p))) return false;
    // Si una sola palabra capitalizada coincide con nombre propio detectado → excluir
    if (termParts.length === 1 && properNames.has(lowerTrimmed) && /^[A-ZÁÉÍÓÚÑ]/.test(trimmed)) return false;
    
    // Preferir palabras únicas o términos técnicos sobre frases
    // Si tiene más de 3 palabras y no termina en sufijo académico, probablemente es una frase común
    const words = trimmed.split(/\s+/);
    if (words.length > 3) {
      const lastWord = words[words.length - 1].toLowerCase();
      const hasAcademicSuffix = ['ción', 'sión', 'dad', 'tad', 'miento', 'ismo', 'logía', 'grafía'].some(s => lastWord.endsWith(s));
      if (!hasAcademicSuffix) return false; // Frases largas sin sufijos académicos = probablemente comunes
    }
    
    return true;
  });

  return [...new Set(allTerms)];
}

/**
 * Diccionario de palabras comunes en español (excluir del glosario)
 */
const COMMON_SPANISH_WORDS = new Set([
  // Sustantivos comunes
  'información', 'situación', 'realidad', 'problema', 'solución', 'concepto', 'aspecto', 'actividad',
  'sociedad', 'persona', 'personas', 'gobierno', 'sistema', 'proceso', 'cambio', 'momento',
  'tiempo', 'día', 'año', 'años', 'parte', 'manera', 'forma', 'vez', 'veces',
  'mundo', 'país', 'países', 'ciudad', 'ciudades', 'estado', 'estados', 'grupo', 'grupos',
  // Sustantivos comunes que estaban colándose en el glosario
  'necesidad', 'pensamiento', 'almacenamiento', 'pasividad', 'conocimiento', 'sentimiento',
  'movimiento', 'crecimiento', 'nacimiento', 'tratamiento', 'comportamiento', 'funcionamiento',
  'rendimiento', 'seguimiento', 'mantenimiento', 'establecimiento', 'reconocimiento', 'procedimiento',
  'entendimiento', 'razonamiento', 'planteamiento', 'descubrimiento', 'acontecimiento',
  'capacidad', 'posibilidad', 'responsabilidad', 'oportunidad', 'comunidad', 'identidad',
  'seguridad', 'autoridad', 'voluntad', 'libertad', 'verdad', 'igualdad', 'calidad',
  'cantidad', 'realidad', 'humanidad', 'dignidad', 'sociedad', 'propiedad', 'enfermedad',
  'actividad', 'dificultad', 'diversidad', 'universidad', 'curiosidad', 'novedad',
  'opinión', 'educación', 'evaluación', 'investigación', 'comunicación', 'organización',
  'participación', 'presentación', 'preparación', 'orientación', 'motivación', 'población',
  'imaginación', 'generación', 'ocupación', 'observación', 'adaptación',
  'resultado', 'significado', 'contenido', 'sentido', 'acuerdo', 'recuerdo',
  'lectura', 'escritura', 'estructura', 'cultura', 'naturaleza', 'enseñanza',
  'aprendizaje', 'lenguaje', 'mensaje', 'paisaje', 'personaje', 'abordaje',
  // Adjetivos comunes
  'importante', 'principal', 'grande', 'grandes', 'pequeño', 'pequeños', 'bueno', 'buenos',
  'nuevo', 'nuevos', 'diferente', 'diferentes', 'general', 'generales', 'especial', 'especiales',
  'necesario', 'posible', 'público', 'social', 'digital', 'crítico', 'propio',
  // Verbos comunes (formas infinitivo)
  'tener', 'haber', 'hacer', 'decir', 'estar', 'ser', 'poder', 'saber', 'ver', 'dar',
  'pasar', 'deber', 'querer', 'llegar', 'llevar', 'encontrar', 'llamar', 'parecer'
]);

/**
 * Selecciona los mejores términos basándose en relevancia temática + complejidad
 * NUEVA VERSIÓN: Prioriza términos centrales al tema sobre solo dificultad léxica
 */
function selectBestTerms(candidates, text, maxTerms) {
  // Calcular frecuencia de cada término
  const frequencyMap = {};
  const textLower = text.toLowerCase();
  
  candidates.forEach(term => {
    const termLower = term.toLowerCase();
    const regex = new RegExp('\\b' + termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    frequencyMap[term] = (text.match(regex) || []).length;
  });

  // Extraer palabras de alta frecuencia del texto (temas centrales)
  const allWords = textLower.match(/\b[a-záéíóúñü]{4,}\b/g) || [];
  const wordFreq = {};
  allWords.forEach(w => {
    if (!COMMON_SPANISH_WORDS.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  });
  
  // Top 20 palabras más frecuentes = temas centrales del texto
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  // Calcular score HÍBRIDO: relevancia temática (40%) + complejidad léxica (60%)
  const scored = candidates.map(term => {
    const termLower = term.toLowerCase().trim();
    const frequency = frequencyMap[term] || 1;
    let thematicScore = 0;  // Relevancia al tema (0-40 puntos)
    let complexityScore = 0; // Complejidad léxica (0-60 puntos)

    // ============================================================
    // PARTE 1: RELEVANCIA TEMÁTICA (40% del score total)
    // ============================================================
    
    // 1A. Co-ocurrencia con palabras temáticas centrales (+20 puntos)
    const termWords = termLower.split(/\s+/);
    const thematicOverlap = termWords.filter(w => topWords.includes(w)).length;
    thematicScore += Math.min(thematicOverlap * 10, 20);

    // 1B. Frecuencia óptima para conceptos clave (2-6 apariciones = +15 puntos)
    if (frequency >= 2 && frequency <= 6) {
      thematicScore += 15;
    } else if (frequency === 1) {
      thematicScore += 5; // Término único pero puede ser relevante
    } else if (frequency > 10) {
      thematicScore -= 5; // Muy común, probablemente no es concepto clave
    }

    // 1C. Términos entre comillas o al inicio de párrafos (+10 puntos)
    const inQuotes = text.includes(`"${term}"`) || text.includes(`'${term}'`);
    if (inQuotes) thematicScore += 10;

    const startsParagraph = new RegExp(`\\n\\s*${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text);
    if (startsParagraph) thematicScore += 5;

    // ============================================================
    // PARTE 2: COMPLEJIDAD LÉXICA (60% del score total)
    // ============================================================

    // 2A. Sufijos académicos/técnicos REALES (+30 puntos)
    const academicSuffixes = ['logía', 'grafía', 'nomía', 'sofía', 'cracia', 'patía', 'tecnia'];
    const moderateSuffixes = ['ción', 'sión', 'miento', 'ismo', 'dad', 'tad'];
    
    if (academicSuffixes.some(suffix => termLower.endsWith(suffix))) {
      complexityScore += 30; // Fuertemente académico
    } else if (moderateSuffixes.some(suffix => termLower.endsWith(suffix))) {
      complexityScore += 15; // Moderadamente técnico
    }

    // 2B. Prefijos técnicos (+12 puntos)
    const technicalPrefixes = ['bio', 'geo', 'hidro', 'termo', 'psico', 'neuro', 'cardio', 'meta', 'proto'];
    if (technicalPrefixes.some(prefix => termLower.startsWith(prefix))) {
      complexityScore += 12;
    }

    // 2C. Longitud (palabras largas tienden a ser más técnicas, +10 puntos max)
    complexityScore += Math.min(term.length * 0.8, 10);

    // 2D. Términos compuestos o con guiones (+8 puntos)
    if (term.includes('-') || term.split(/\s+/).length > 1) {
      complexityScore += 8;
    }

    // ============================================================
    // PARTE 3: PENALIZACIONES
    // ============================================================

    // PENALIZAR palabras comunes en español (-35 puntos)
    if (COMMON_SPANISH_WORDS.has(termLower)) {
      complexityScore -= 35;
    }
    // PENALIZAR cada palabra del término que sea común
    for (const w of termWords) {
      if (COMMON_SPANISH_WORDS.has(w) && termWords.length === 1) {
        complexityScore -= 25; // Término de una sola palabra común = muy penalizado
      }
    }

    // PENALIZAR nombres propios simples cortos (-20 puntos)
    if (/^[A-Z]/.test(term) && term.length < 8 && !term.includes(' ')) {
      complexityScore -= 20;
    }

    // PENALIZAR términos que son solo una palabra básica sin sufijo técnico (-15 puntos)
    if (termWords.length === 1 && complexityScore < 15 && thematicScore < 15) {
      complexityScore -= 15;
    }

    // PENALIZAR frecuencia muy alta (>15 apariciones = palabra común, no técnica)
    if (frequency > 15) {
      complexityScore -= 10;
    }

    // Score final = temático (40%) + complejidad (60%)
    const finalScore = thematicScore + complexityScore;

    return { 
      term, 
      score: finalScore,
      frequency,
      thematicScore,
      complexityScore,
      // Debugging
      _details: {
        length: term.length,
        hasAcademicSuffix: academicSuffixes.some(s => termLower.endsWith(s)),
        thematicOverlap,
        isCommon: COMMON_SPANISH_WORDS.has(termLower)
      }
    };
  });

  // Filtrar términos con score insuficiente (mínimo 5 para evitar términos básicos)
  const validScored = scored.filter(item => item.score >= 5);

  // Ordenar por score total descendente
  validScored.sort((a, b) => b.score - a.score);

  // Log para debugging
  console.log(`📊 [Glossary] Top términos seleccionados:`);
  validScored.slice(0, maxTerms).forEach((item, idx) => {
    console.log(`   ${idx + 1}. "${item.term}" (score: ${item.score.toFixed(1)}, freq: ${item.frequency})`);
  });

  return validScored.slice(0, maxTerms).map(item => item.term);
}

/**
 * Genera definiciones para los términos seleccionados
 */
async function generateDefinitions(terms, context) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY no configurada');
  }

  const contextPreview = context.substring(0, 1000);
  
  const prompt = `Eres un experto en educación y terminología académica. Genera definiciones claras y concisas para los siguientes términos extraídos de un texto académico.

CONTEXTO DEL TEXTO:
${contextPreview}

TÉRMINOS A DEFINIR:
${terms.map((t, i) => `${i + 1}. ${t}`).join('\n')}

INSTRUCCIONES IMPORTANTES:
- Si algún término es un nombre propio de persona (autor, investigador, político), NO lo incluyas en la respuesta.
- Si algún término es vocabulario cotidiano/básico (ej: "necesidad", "pensamiento", "almacenamiento"), NO lo incluyas.
- Solo incluye términos genuinamente técnicos, académicos o especializados que un estudiante necesitaría consultar.
- Si descartas un término, no lo reemplaces con otro.

Responde SOLO con JSON válido (sin markdown, sin \`\`\`json):
{
  "terms": [
    {
      "term": "término exacto",
      "definition": "definición clara y educativa (max 150 palabras)",
      "difficulty": "básico|intermedio|avanzado",
      "usage": "ejemplo de uso en contexto (1 oración)"
    }
  ]
}`;

  try {
    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto pedagogo. Respondes SOLO con JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const content = response.data.choices[0].message.content;
    
    // Limpiar respuesta
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }

    const parsed = JSON.parse(cleaned);
    
    // Validar estructura de respuesta
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Respuesta de API no es un objeto válido');
    }
    
    // Soportar múltiples formatos de respuesta
    const termsArray = parsed.terms || parsed.definitions || parsed.glossary || [];
    
    if (!Array.isArray(termsArray)) {
      throw new Error(`Estructura de respuesta inesperada. Se esperaba un array en 'terms', 'definitions' o 'glossary', pero se recibió: ${Object.keys(parsed).join(', ')}`);
    }
    
    return termsArray;

  } catch (error) {
    console.error('❌ Error generando definiciones:', error.message);
    
    // Fallback: términos sin definición
    return terms.map(term => ({
      term,
      definition: 'Definición no disponible temporalmente',
      difficulty: 'intermedio',
      usage: ''
    }));
  }
}
