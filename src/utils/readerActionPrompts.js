// Mapea acciones del visor (reader-action) a prompts pedagógicos no evaluativos.
// Separado para facilitar pruebas y evolución.

export const ACTION_PROMPTS = {
  explain: (fragment) => `Eres un tutor claro y amable. Explica el fragmento sin evaluar ni calificar. Sé breve (máx. 6 frases) y evita abrir temas nuevos. Fragmento: "${fragment}"`,
  summarize: (fragment) => `Resume el fragmento en 2-4 frases, manteniendo ideas clave y tono original. No añadas preguntas ni temas nuevos. Fragmento: "${fragment}"`,
  question: (fragment) => `Escribe una sola pregunta desafiante sobre el fragmento y sugiere una posible respuesta razonada en una frase. Formato: Pregunta -> Posible respuesta. Fragmento: "${fragment}"`,
  deep: (fragment) => `Analiza en 4-6 frases las implicaciones y causas del fragmento. Mantén el foco y no generes preguntas ni temas adicionales. Fragmento: "${fragment}"`
};

export function buildPromptFromAction(action, text) {
  const builder = ACTION_PROMPTS[action];
  return builder ? builder(text) : null;
}
