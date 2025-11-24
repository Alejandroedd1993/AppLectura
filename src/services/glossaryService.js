import { chatCompletion, extractContent } from './unifiedAiService';

/**
 * Genera definición individual de un término usando IA (FORMATO COMPLETO PARA PDF)
 * @param {string} term - Término a definir
 * @param {string} fullText - Texto completo para contexto (no snippet)
 * @returns {Promise<Object>} - Término con definición Y contexto completo
 */
async function generateTermDefinition(term, fullText) {
  try {
    const prompt = `Eres un asistente educativo especializado en explicar conceptos de manera clara y contextual.

TÉRMINO A DEFINIR: "${term}"

CONTEXTO (extracto del texto donde aparece):
${fullText.substring(0, 1500)}...

TAREA: Proporciona una definición educativa del término "${term}" considerando su uso específico en este contexto.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin \`\`\`json) con esta estructura exacta:
{
  "definicion": "Definición clara y concisa del término (2-3 oraciones)",
  "contexto_en_texto": "Explica cómo se usa este término en el texto analizado (1-2 oraciones completas)",
  "categoria": "Concepto|Técnico|Académico|Cultural|Filosófico",
  "nivel_complejidad": "Básico|Intermedio|Avanzado"
}

IMPORTANTE: 
- La definición debe ser educativa y accesible
- El contexto debe explicar el USO del término en este texto específico
- NO uses markdown
- SOLO el objeto JSON`;

    const data = await chatCompletion({
      provider: 'deepseek',
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
      timeoutMs: 20000 // 20s por término individual
    });

    const content = extractContent(data);
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    return {
      definicion: parsed.definicion || `Término académico relevante en este contexto.`,
      contexto: parsed.contexto_en_texto || 'Aparece en el texto analizado.',
      categoria: parsed.categoria || 'Académico',
      nivel_complejidad: parsed.nivel_complejidad || 'Intermedio'
    };
  } catch (error) {
    console.warn(`⚠️ No se pudo generar definición IA para "${term}":`, error.message);
    return {
      definicion: `Término académico o técnico que aparece en el texto analizado.`,
      contexto: 'Consulta el texto original para ver el contexto completo.',
      categoria: 'Académico',
      nivel_complejidad: 'Intermedio'
    };
  }
}

/**
 * Genera un glosario completo de términos complejos del texto usando IA
 * 
 * @param {string} fullText - Texto completo a analizar
 * @param {number} minComplexity - Nivel mínimo de complejidad (1-10)
 * @returns {Promise<Array>} - Array de términos con definiciones
 */
export async function generateGlossary(fullText, _minComplexity = 5) {
  try {
    console.log('📚 [GlossaryService] Generando glosario desde backend...');
    
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    // Llamar al backend en vez de hacer la llamada directamente
    const response = await fetch(`${BACKEND_URL}/api/analysis/glossary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: fullText,
        maxTerms: 8 // 6-10 términos
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [GlossaryService] ${data.terms.length} términos generados`);
    
    // Mapear al formato esperado por el frontend
    const glossaryTerms = data.terms.map(term => ({
      termino: term.term,
      definicion: term.definition,
      contexto: term.usage || 'Ver texto completo',
      nivel_complejidad: term.difficulty || 'Intermedio',
      categoria: 'Académico'
    }));

    console.log(`✅ Glosario generado exitosamente con ${glossaryTerms.length} términos`);
    return glossaryTerms;

  } catch (error) {
    console.error('❌ Error generando glosario:', error.message);
    
    // Fallback: retornar array vacío
    return [];
  }
}

/**
 * Genera glosario básico sin IA (fallback) - AHORA CON DEFINICIONES IA
 */
async function generateFallbackGlossary(text) {
  console.log('🔄 Generando glosario fallback con definiciones IA...');
  
  // Lista COMPLETA de palabras obvias/comunes a excluir
  const stopwords = [
    // Adverbios terminados en -mente (obvios)
    'absolutamente', 'actualmente', 'adecuadamente', 'ampliamente', 'anteriormente',
    'básicamente', 'claramente', 'completamente', 'constantemente', 'correctamente',
    'definitivamente', 'directamente', 'especialmente', 'específicamente', 'exactamente',
    'exclusivamente', 'finalmente', 'frecuentemente', 'fundamentalmente', 'generalmente',
    'gradualmente', 'igualmente', 'inicialmente', 'intelectualmente', 'intensamente',
    'internamente', 'lógicamente', 'naturalmente', 'necesariamente', 'normalmente',
    'objetivamente', 'obviamente', 'ocasionalmente', 'originalmente', 'particularmente',
    'perfectamente', 'personalmente', 'políticamente', 'posteriormente', 'prácticamente',
    'precisamente', 'previamente', 'principalmente', 'probablemente', 'progresivamente',
    'proporcionalmente', 'realmente', 'recientemente', 'relativamente', 'rápidamente',
    'seriamente', 'significativamente', 'simplemente', 'sistemáticamente', 'solamente',
    'suficientemente', 'técnicamente', 'temporalmente', 'totalmente', 'tradicionalmente',
    'típicamente', 'últimamente', 'únicamente', 'usualmente', 'visualmente',
    
    // Sustantivos comunes abstractos
    'actividad', 'actividades', 'aspecto', 'aspectos', 'atención', 'cambio', 'cambios',
    'capacidad', 'capacidades', 'característica', 'características', 'caso', 'casos',
    'condición', 'condiciones', 'conocimiento', 'conocimientos', 'consecuencia', 'consecuencias',
    'contexto', 'cuestión', 'cuestiones', 'desarrollo', 'diferencia', 'diferencias',
    'dificultad', 'dificultades', 'elemento', 'elementos', 'ejemplo', 'ejemplos',
    'experiencia', 'experiencias', 'factor', 'factores', 'forma', 'formas',
    'función', 'funciones', 'habilidad', 'habilidades', 'importancia', 'información',
    'manera', 'maneras', 'medio', 'medios', 'modelo', 'modelos', 'momento', 'momentos',
    'necesidad', 'necesidades', 'nivel', 'niveles', 'objetivo', 'objetivos',
    'oportunidad', 'oportunidades', 'orden', 'parte', 'partes', 'período', 'períodos',
    'posibilidad', 'posibilidades', 'presencia', 'problema', 'problemas', 'procedimiento',
    'proceso', 'procesos', 'producto', 'productos', 'proyecto', 'proyectos',
    'punto', 'puntos', 'razón', 'razones', 'recurso', 'recursos', 'relación', 'relaciones',
    'representación', 'representaciones', 'requisito', 'requisitos', 'responsabilidad',
    'responsabilidades', 'resultado', 'resultados', 'sentido', 'servicio', 'servicios',
    'significado', 'sistema', 'sistemas', 'situación', 'situaciones', 'solución', 'soluciones',
    'tendencia', 'tendencias', 'término', 'términos', 'tiempo', 'tipo', 'tipos',
    'trabajo', 'trabajos', 'utilización', 'valor', 'valores', 'ventaja', 'ventajas',
    
    // Adjetivos comunes
    'adecuado', 'anterior', 'diferente', 'diversos', 'efectivo', 'específico',
    'general', 'importante', 'necesario', 'nuevo', 'particular', 'posible',
    'presente', 'principal', 'propio', 'público', 'siguiente', 'social'
  ];
  
  // Normalizar espaciado (evitar palabras pegadas como "Instruccionespara")
  const normalizedText = text
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2') // Separar minúscula-mayúscula
    .replace(/\s+/g, ' '); // Normalizar múltiples espacios
  
  // Extraer SOLO palabras reales (sin números, guiones, códigos)
  const words = normalizedText
    .toLowerCase()
    .replace(/[^\wáéíóúñü\s]/g, ' ') // Mantener solo letras y espacios
    .split(/\s+/)
    .filter(w => {
      // FILTROS ESTRICTOS para evitar basura:
      if (w.length < 7 || w.length > 18) return false; // Palabras técnicas suelen tener 7-18 letras
      if (/\d/.test(w)) return false;                  // Sin números
      if (/_/.test(w)) return false;                   // Sin guiones bajos (código)
      if (!/^[a-záéíóúñü]+$/i.test(w)) return false;   // SOLO letras españolas
      
      // Excluir stopwords (palabras obvias)
      if (stopwords.includes(w)) return false;
      
      // Excluir palabras que terminan en -mente (adverbios obvios)
      if (w.endsWith('mente') && w.length > 10) return false;
      
      return true;
    });

  // Contar frecuencia
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Tomar las 6 palabras más largas y poco frecuentes (más selectivo)
  const uniqueWords = Array.from(new Set(words))
    .filter(w => frequency[w] <= 2) // Aparece máximo 2 veces (más selectivo)
    .sort((a, b) => b.length - a.length)
    .slice(0, 6); // Reducido a 6 términos selectos

  if (uniqueWords.length === 0) {
    console.log('⚠️ No se encontraron términos válidos en el texto');
    return [];
  }

  console.log(`🔍 Generando definiciones con IA para ${uniqueWords.length} términos...`);

  // Generar definiciones con IA para cada término en paralelo
  const termsWithDefinitions = await Promise.all(
    uniqueWords.map(async (word, index) => {
      const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
      
      // IMPORTANTE: Pasar texto COMPLETO para que la IA genere contexto explicativo
      // (no solo el snippet, sino una explicación de cómo se usa el término)
      const aiDefinition = await generateTermDefinition(capitalizedWord, text);
      
      return {
        id: `term_fallback_${index}`,
        termino: capitalizedWord,
        definicion: aiDefinition.definicion,
        contexto: aiDefinition.contexto,  // ← Ahora es explicación generada por IA
        nivel_complejidad: aiDefinition.nivel_complejidad,
        categoria: aiDefinition.categoria,
        agregado_manualmente: false
      };
    })
  );

  console.log(`✅ Definiciones generadas para ${termsWithDefinitions.length} términos`);
  return termsWithDefinitions;
}

/**
 * Agrega un término manualmente al glosario
 * 
 * @param {Array} currentGlossary - Glosario actual
 * @param {object} newTerm - Nuevo término { termino, definicion, contexto, nivel_complejidad, categoria }
 * @returns {Array} - Glosario actualizado
 */
export function addTermToGlossary(currentGlossary, newTerm) {
  const id = `term_manual_${Date.now()}`;
  
  return [
    ...currentGlossary,
    {
      id,
      termino: newTerm.termino || '',
      definicion: newTerm.definicion || '',
      contexto: newTerm.contexto || '',
      nivel_complejidad: newTerm.nivel_complejidad || 'Intermedio',
      categoria: newTerm.categoria || 'Otro',
      agregado_manualmente: true
    }
  ];
}

/**
 * Elimina un término del glosario
 * 
 * @param {Array} currentGlossary - Glosario actual
 * @param {string} termId - ID del término a eliminar
 * @returns {Array} - Glosario actualizado
 */
export function removeTermFromGlossary(currentGlossary, termId) {
  return currentGlossary.filter(term => term.id !== termId);
}

/**
 * Filtra glosario por búsqueda
 * 
 * @param {Array} glossary - Glosario completo
 * @param {string} searchQuery - Texto de búsqueda
 * @returns {Array} - Términos filtrados
 */
export function filterGlossary(glossary, searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') {
    return glossary;
  }

  const query = searchQuery.toLowerCase().trim();
  
  return glossary.filter(term => 
    term.termino.toLowerCase().includes(query) ||
    term.definicion.toLowerCase().includes(query) ||
    term.categoria.toLowerCase().includes(query)
  );
}

/**
 * Ordena glosario alfabéticamente
 * 
 * @param {Array} glossary - Glosario a ordenar
 * @param {boolean} ascending - true para A-Z, false para Z-A
 * @returns {Array} - Glosario ordenado
 */
export function sortGlossaryAlphabetically(glossary, ascending = true) {
  const sorted = [...glossary].sort((a, b) => {
    const termA = a.termino.toLowerCase();
    const termB = b.termino.toLowerCase();
    return ascending ? termA.localeCompare(termB) : termB.localeCompare(termA);
  });
  
  return sorted;
}

/**
 * Exporta glosario como texto formateado
 * 
 * @param {Array} glossary - Glosario a exportar
 * @returns {string} - Texto formateado
 */
export function exportGlossaryAsText(glossary) {
  const sorted = sortGlossaryAlphabetically(glossary, true);
  
  let text = '📚 GLOSARIO DE TÉRMINOS\n';
  text += '═'.repeat(60) + '\n\n';
  
  sorted.forEach((term, index) => {
    text += `${index + 1}. ${term.termino.toUpperCase()}\n`;
    text += `   Categoría: ${term.categoria}\n`;
    text += `   Nivel: ${term.nivel_complejidad}\n\n`;
    text += `   Definición:\n   ${term.definicion}\n\n`;
    
    if (term.contexto && term.contexto !== 'Contexto no especificado') {
      text += `   En este texto:\n   ${term.contexto}\n\n`;
    }
    
    text += '─'.repeat(60) + '\n\n';
  });
  
  text += `\nTotal de términos: ${glossary.length}\n`;
  text += `Generado: ${new Date().toLocaleString('es-ES')}\n`;
  
  return text;
}

/**
 * Descarga glosario como archivo TXT
 * 
 * @param {Array} glossary - Glosario a descargar
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export function downloadGlossaryAsFile(glossary, filename = 'glosario') {
  const text = exportGlossaryAsText(glossary);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  console.log(`📥 Glosario descargado: ${link.download}`);
}
