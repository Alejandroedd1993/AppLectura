/**
 * Normaliza un texto (para búsquedas/comparaciones):
 * - elimina acentos
 * - convierte a minúsculas
 * - recorta espacios
 */
export const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Limpieza conservadora para visualización: mantiene mayúsculas/acentos,
 * unifica saltos de línea y elimina espacios redundantes sin alterar el estilo original.
 */
export const limpiarTextoConservador = (texto) => {
  if (!texto) return '';
  let t = texto.toString();
  // Unificar saltos de línea a \n
  t = t.replace(/\r\n?/g, '\n');
  // Recortar espacios al inicio/fin de cada línea
  t = t.split('\n').map((l) => l.replace(/\s+$/g, '').replace(/^\s+/g, '')).join('\n');
  // Reducir líneas en blanco consecutivas a una sola
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
};

/**
 * Une cortes por guionado de fin de línea: "educa-\nción" -> "educación"
 * Sólo aplica si después del guion la siguiente línea comienza en minúscula.
 */
const unirGuionadoEOL = (linea, siguienteLinea) => {
  if (!linea || !siguienteLinea) return null;
  // Aproximación compatible: letra/numero latino + guion al final
  const endsWithHyphen = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]-$/.test(linea.trim());
  // Comienza con minúscula (ASCII + latin-1: ß-ö, ø-ÿ)
  const nextStartsLower = /^[a-z\u00DF-\u00F6\u00F8-\u00FF]/.test(siguienteLinea.trim());
  if (endsWithHyphen && nextStartsLower) {
    return linea.trim().slice(0, -1) + siguienteLinea.trim();
  }
  return null;
};

/**
 * Heurísticas para detectar encabezados y listas; devuelve bloques estructurados.
 * type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'hr'
 */
export const segmentarTextoEnBloques = (texto) => {
  const t = limpiarTextoConservador(texto);
  const lines = t.split('\n');
  const blocks = [];
  let buffer = [];

  const flushParagraph = () => {
    if (!buffer.length) return;
    const joined = buffer.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (joined) blocks.push({ type: 'p', text: joined });
    buffer = [];
  };

  const isAllCaps = (s) => s.length > 3 && s === s.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(s);
  const isLikelyTitleCase = (s) => /^[A-ZÁÉÍÓÚÑ][^.!?]{2,80}$/.test(s) && !/[.:]$/.test(s);
  const isSectionWord = (s) => /^(RESUMEN|ABSTRACT|INTRODUCCIÓN|METODOLOGÍA|MARCO TEÓRICO|RESULTADOS|DISCUSIÓN|CONCLUSIÓN|CONCLUSIONES|REFERENCIAS|BIBLIOGRAFÍA)\b/i.test(s);
  const numberedHeading = (s) => s.match(/^(\d+)(?:\.(\d+))*(\)|\.|\s)\s+(.+)/);
  const isListItem = (s) => /^([\-\u2022\u25E6\u25CF]\s+|\d+\)\s+|\d+\.\s+)/.test(s);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { // separador de párrafo
      flushParagraph();
      continue;
    }

    // Unir guionado EOL con la siguiente línea
    const merged = unirGuionadoEOL(trimmed, lines[i + 1]);
    if (merged) {
      buffer.push(merged);
      i += 1; // saltar la siguiente
      continue;
    }

    // Detectar listas bullet/numéricas
    if (isListItem(trimmed)) {
      flushParagraph();
      // Remover marcador de lista al guardar el texto
      const text = trimmed.replace(/^([\-\u2022\u25E6\u25CF]\s+|\d+\)\s+|\d+\.\s+)/, '').trim();
      blocks.push({ type: 'li', text });
      continue;
    }

    // Detectar encabezados numéricos
    const numMatch = numberedHeading(trimmed);
    if (numMatch) {
      flushParagraph();
      const depth = (numMatch[0].match(/\./g) || []).length + (numMatch[0].includes(')') ? 1 : 0);
      const text = trimmed.replace(/^(\d+(?:\.\d+)*)[\)\.]?\s+/, '');
      const type = depth >= 2 ? 'h3' : 'h2';
      blocks.push({ type, text });
      continue;
    }

    // Detectar encabezados por palabras clave o estilo
    if (isSectionWord(trimmed) || isAllCaps(trimmed) || isLikelyTitleCase(trimmed)) {
      // Si es la primera línea no vacía, tratar como h1, si no h2
      const nonEmptySoFar = blocks.some(b => b.type !== 'hr');
      const type = nonEmptySoFar ? (isSectionWord(trimmed) ? 'h2' : 'h2') : 'h1';
      flushParagraph();
      blocks.push({ type, text: trimmed });
      continue;
    }

    // Acumular en el párrafo actual
    // Insertar espacio si corresponde
    const needsSpace = buffer.length > 0 && !/[\-–—]\s*$/.test(buffer[buffer.length - 1]) && !/^\s*[;:,\.\)]/.test(trimmed);
    buffer.push(needsSpace ? ` ${trimmed}` : trimmed);
  }
  flushParagraph();

  // Post-procesar: agrupar li consecutivos bajo un bloque de lista
  const grouped = [];
  let listBuf = [];
  for (const b of blocks) {
    if (b.type === 'li') {
      listBuf.push(b);
    } else {
      if (listBuf.length) {
        grouped.push({ type: 'ul', items: listBuf.map(i => i.text) });
        listBuf = [];
      }
      grouped.push(b);
    }
  }
  if (listBuf.length) grouped.push({ type: 'ul', items: listBuf.map(i => i.text) });

  return grouped;
};
