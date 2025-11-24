
// Estrategia DeepSeek: aquí podrías llamar a la API real si cuentas con clave en el backend.
// De momento, devolvemos un JSON estructurado mínimo como placeholder válido.

export async function deepseekStrategy(prompt) {
  // TODO: Integrar cliente real de DeepSeek cuando se habilite.
  // Simular análisis a partir del prompt (recorte simple para demo)
  const resumen = prompt.length > 400 ? prompt.slice(0, 400) + '…' : prompt;
  return JSON.stringify({
    resumen,
    ideasPrincipales: [
      "Síntesis inicial del texto a partir del análisis automático",
      "Aspectos clave identificados a nivel superficial"
    ],
    analisisEstilistico: {
      tono: "informativo",
      sentimiento: "neutral",
      estilo: "estándar",
      publicoObjetivo: "general"
    },
    preguntasReflexion: [
      "¿Qué intención principal parece tener el autor en este fragmento?",
      "¿Qué evidencia textual respalda la idea central?",
      "¿Cómo conectarías este contenido con otros conocimientos?"
    ],
    vocabulario: [
      { palabra: "análisis", definicion: "Se menciona en contexto de evaluación del texto" },
      { palabra: "texto", definicion: "Elemento bajo estudio en el análisis" }
    ],
    complejidad: "intermedio",
    temas: ["Análisis general", "Contenido", "Evidencia"]
  });
}
