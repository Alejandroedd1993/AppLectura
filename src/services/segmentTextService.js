// Servicio de segmentación unificada de texto
// Objetivo: reemplazar lógicas divergentes (regex simple vs chunking de 800 chars)
// Estrategia: 1) Pre-normaliza 2) Detecta párrafos naturales 3) Fusiona párrafos muy cortos 4) Fallback a chunking si excede límites

/**
 * @typedef {Object} Paragraph
 * @property {string} id Hash corto estable (en base a índice y contenido parcial)
 * @property {number} index Índice secuencial
 * @property {number} startChar Offset inicial en el texto original
 * @property {number} endChar Offset final (no inclusivo)
 * @property {string} content Contenido limpio del párrafo
 */

const DEFAULTS = {
  minParagraphLen: 25,      // Párrafos demasiado pequeños se intentan fusionar
  maxParagraphLen: 900,     // Si un párrafo supera esto se trocea
  hardChunkLen: 800,        // Longitud objetivo al trocear
  mergeSoftThreshold: 60,   // Si dos consecutivos son pequeños, se fusionan
  strategy: 'hybrid'        // 'hybrid' | 'simple' | 'hard-chunk'
};

/** Normaliza espacios y saltos de línea */
function normalize(raw) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Genera hash corto no criptográfico */
function shortHash(str) {
  let h = 0; for (let i = 0; i < str.length && i < 120; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h.toString(36);
}

/**
 * Segmenta texto en párrafos semánticos; si no es viable, cae a chunking.
 * @param {string} raw Texto original
 * @param {Partial<typeof DEFAULTS>} options Opciones
 * @returns {Paragraph[]} Lista de objetos paragraph normalizados
 */
export function segmentText(raw, options = {}) {
  if (!raw || !raw.trim()) return [];
  const cfg = { ...DEFAULTS, ...options };
  const text = normalize(raw);
  if (!text) return [];

  // Paso 1: división tentativa por doble salto o punto seguido de salto
  let parts = text
    .split(/\n\n+|(?<=[.!?])\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Paso 2: fusionar párrafos muy cortos contiguos
  const fused = [];
  for (let i = 0; i < parts.length; i++) {
    const current = parts[i];
    if (current.length < cfg.minParagraphLen && fused.length > 0) {
      const prev = fused[fused.length - 1];
      if ((prev.length + current.length) < cfg.mergeSoftThreshold) {
        fused[fused.length - 1] = prev + ' ' + current;
        continue;
      }
    }
    fused.push(current);
  }

  // Paso 3: trocear párrafos excesivamente largos respetando límites de palabra
  const finalParas = [];
  fused.forEach(p => {
    if (p.length <= cfg.maxParagraphLen) { finalParas.push(p); return; }
    // Troceo inteligente: cortar cercano a límite en un espacio o punto
    let remaining = p;
    while (remaining.length > cfg.hardChunkLen) {
      let sliceIdx = remaining.lastIndexOf(' ', cfg.hardChunkLen - 20);
      if (sliceIdx < cfg.hardChunkLen * 0.5) sliceIdx = cfg.hardChunkLen; // fallback duro
      finalParas.push(remaining.slice(0, sliceIdx).trim());
      remaining = remaining.slice(sliceIdx).trim();
    }
    if (remaining.length) finalParas.push(remaining);
  });

  // Paso 4: construir objetos con offsets
  const paragraphs = [];
  let cursor = 0;
  finalParas.forEach((content, idx) => {
    const indexInRaw = raw.indexOf(content.slice(0, 20)); // aproximación
    const startChar = indexInRaw > -1 ? indexInRaw : cursor;
    const endChar = startChar + content.length;
    cursor = endChar;
    paragraphs.push({
      id: shortHash(idx + '_' + content),
      index: idx,
      startChar,
      endChar,
      content
    });
  });

  return paragraphs;
}

/** Utilidad para obtener hash global del texto (reuse en storage keys) */
export function hashText(raw) { return shortHash(normalize(raw)); }

// Sencilla caché en memoria (evita recalcular en vistas múltiples)
const _cache = new Map();
export function getSegmentedCached(raw, opts) {
  const key = hashText(raw) + ':' + (opts?.strategy || 'hybrid');
  if (_cache.has(key)) return _cache.get(key);
  const seg = segmentText(raw, opts);
  _cache.set(key, seg);
  return seg;
}
