/**
 * Utilidad para detectar tipos de párrafos en documentos
 * Separado para mejor mantenibilidad y testing
 */

// Palabras clave académicas (100+)
const ACADEMIC_KEYWORDS = [
  'resumen', 'abstract', 'summary', 'sumario',
  'introducción', 'introduction', 'introduccion', 'intro',
  'objetivos', 'objectives', 'objetivo', 'goal', 'goals',
  'metodología', 'methodology', 'metodologia', 'método', 'method', 'métodos', 'methods',
  'resultados', 'results', 'resultado', 'result', 'findings', 'hallazgos',
  'conclusiones', 'conclusions', 'conclusión', 'conclusion',
  'discusión', 'discussion', 'discusion',
  'referencias', 'references', 'bibliografía', 'bibliography', 'bibliografia',
  'palabras clave', 'keywords', 'key words',
  'anexos', 'appendix', 'apéndice', 'apendices',
  'capítulo', 'chapter', 'sección', 'section',
  'parte', 'part', 'unidad', 'unit'
];

/**
 * Detecta si un párrafo es una sección académica
 */
export function detectAcademicSection(text) {
  const trimmed = text.trim().toLowerCase();
  
  // Debe ser relativamente corto para ser un título
  if (trimmed.length > 300) return null;
  
  // Buscar palabra clave al inicio del texto
  for (const keyword of ACADEMIC_KEYWORDS) {
    if (trimmed.startsWith(keyword)) {
      // Validar que no es parte de una oración larga
      const hasLongSentence = trimmed.split('.').some(s => s.trim().length > 150);
      if (!hasLongSentence) {
        console.log('✅ [detectAcademicSection] Sección encontrada:', keyword, '| Preview:', text.substring(0, 50));
        return {
          type: 'section-header',
          keyword,
          fullText: text.trim()
        };
      }
    }
  }
  
  return null;
}

/**
 * Detecta el tipo de un párrafo
 */
export function detectParagraphType(text) {
  if (!text || typeof text !== 'string') return 'p';
  
  const trimmed = text.trim();
  if (!trimmed) return 'p';
  
  // 1. SECCIONES ACADÉMICAS (prioridad máxima)
  const academicSection = detectAcademicSection(trimmed);
  if (academicSection) {
    return {
      type: 'section-header',
      category: academicSection.keyword.replace(/\s+/g, '_'),
      fullTitle: academicSection.fullText
    };
  }
  
  // 2. TÍTULOS EN MAYÚSCULAS
  const isAllCaps = trimmed === trimmed.toUpperCase() && 
                     /[A-ZÁÉÍÓÚÑ]/.test(trimmed) && 
                     trimmed.length > 3 && 
                     trimmed.length < 150;
  if (isAllCaps) {
    console.log('✅ [detectParagraphType] Título en mayúsculas:', trimmed.substring(0, 50));
    return { type: 'h1' };
  }
  
  // 3. LISTAS CON VIÑETAS
  const bulletPattern = /^[\-\*\•\◦\▪\‣►▸▹◆◇○●□■✓✗✔✘➢➤➜➝]\s+/;
  if (bulletPattern.test(trimmed)) {
    return { type: 'list-item', bullet: true };
  }
  
  // 4. LISTAS NUMERADAS
  const numberedPattern = /^([\d]+|[a-z]|[ivxlcdm]+)[\.\)]\s+/i;
  if (numberedPattern.test(trimmed)) {
    const marker = trimmed.match(numberedPattern)[0];
    return { type: 'list-item', bullet: false, marker };
  }
  
  // 5. CITAS O BLOCKQUOTES
  if (trimmed.startsWith('>')) {
    return { type: 'blockquote' };
  }
  
  // 6. NOTAS AL PIE
  const footnotePattern = /^[\[\(]?\d+[\]\)]?\s*[:\-–—]?\s+/;
  if (footnotePattern.test(trimmed) && trimmed.length < 300) {
    return { type: 'footnote' };
  }
  
  // 7. TÍTULOS NUMERADOS (1. Título, I. Título, etc.)
  const isShort = trimmed.length < 120;
  const noPeriod = !trimmed.endsWith('.');
  const startsWithNumber = /^[\d]+[\.\)]\s+[A-ZÁÉÍÓÚÑ]/.test(trimmed);
  const startsWithRoman = /^[IVX]+[\.\)]\s+/.test(trimmed);
  
  if ((startsWithNumber || startsWithRoman) && isShort && noPeriod) {
    return { type: 'h2' };
  }
  
  // 8. TÍTULOS CORTOS (empiezan con mayúscula, sin punto final)
  if (isShort && noPeriod && /^[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
    return { type: 'h3' };
  }
  
  // 9. PÁRRAFO NORMAL
  return { type: 'p' };
}

export default { detectParagraphType, detectAcademicSection };
