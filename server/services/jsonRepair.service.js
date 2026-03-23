/**
 * Intenta reparar JSON truncado o malformado.
 * Mantiene la semántica legacy usada por preLectura.
 *
 * @param {string} jsonString
 * @returns {any | null}
 */
export function tryRepairJSON(jsonString) {
  let repaired = String(jsonString ?? '').trim();

  if (!repaired) return null;

  if (repaired.startsWith('```json')) {
    repaired = repaired.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  }
  if (repaired.startsWith('```')) {
    repaired = repaired.replace(/```\n?/g, '').replace(/```\n?$/g, '');
  }

  repaired = repaired.trim();

  if (repaired.length > 0 && !['}', ']'].includes(repaired[repaired.length - 1])) {
    const lastCloseBrace = repaired.lastIndexOf('}');
    const lastCloseBracket = repaired.lastIndexOf(']');
    const cutoff = Math.max(lastCloseBrace, lastCloseBracket);

    if (cutoff > repaired.length - 100 && cutoff > 0) {
      // Mantener comportamiento legacy: no cortar agresivamente, intentar cierre conservador.
    }
  }

  try {
    return JSON.parse(repaired);
  } catch {
    console.log('🔧 [JSON Repair] Intento de reparación estándar...');
  }

  const stack = [];
  let inString = false;
  let escape = false;
  let finalRepaired = '';

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    finalRepaired += char;

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '}') stack.pop();
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === ']') stack.pop();
      }
    }
  }

  if (inString) {
    finalRepaired += '"';
  }

  finalRepaired = finalRepaired.replace(/,\s*$/, '');

  while (stack.length > 0) {
    finalRepaired += stack.pop();
  }

  console.log('🔧 [JSON Repair] Resultado intentado (últimos 50 chars):', finalRepaired.slice(-50));

  try {
    return JSON.parse(finalRepaired);
  } catch {
    console.log('❌ [JSON Repair] Falló reparación por pila, intentando método fallback...');
    try {
      const openBrackets = (finalRepaired.match(/\[/g) || []).length;
      const closeBrackets = (finalRepaired.match(/\]/g) || []).length;
      const openBraces = (finalRepaired.match(/\{/g) || []).length;
      const closeBraces = (finalRepaired.match(/\}/g) || []).length;

      for (let i = 0; i < openBrackets - closeBrackets; i++) finalRepaired += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) finalRepaired += '}';

      return JSON.parse(finalRepaired);
    } catch (error) {
      console.error('❌ [JSON Repair] Falló reparación definitiva:', error.message);
      return null;
    }
  }
}