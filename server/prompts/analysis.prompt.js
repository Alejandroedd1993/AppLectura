
export function getAnalysisPrompt(texto) {
  return `
Analiza el siguiente texto y proporciona un análisis completo:
"""${texto}"""

Genera un análisis detallado que incluya:

1. Un resumen conciso del texto (máximo 3 párrafos).
2. Las ideas principales (entre 3-5 puntos).
3. Un análisis estilístico con estos elementos:
   - Tono (descriptivo/narrativo/persuasivo/etc)
   - Sentimiento (positivo/negativo/neutral/etc)
   - Estilo (formal/informal/técnico/poético/etc)
   - Público objetivo (general/académico/infantil/etc)
4. 3-5 preguntas de reflexión sobre el texto.
5. 5-10 palabras o términos destacables con sus definiciones.
6. Una evaluación de la complejidad del texto (básico/intermedio/avanzado).
7. Los temas clave tratados en el texto (3-5 temas).

Tu respuesta debe estar estructurada en formato JSON siguiendo exactamente esta estructura:
{
  "resumen": "texto del resumen...",
  "ideasPrincipales": ["idea 1", "idea 2", "idea 3", ...],
  "analisisEstilistico": {
    "tono": "valor",
    "sentimiento": "valor",
    "estilo": "valor",
    "publicoObjetivo": "valor"
  },
  "preguntasReflexion": ["¿Pregunta 1?", "¿Pregunta 2?", ...],
  "vocabulario": [
    {"palabra": "término1", "definicion": "definición del término1"},
    {"palabra": "término2", "definicion": "definición del término2"},
    ...
  ],
  "complejidad": "valor",
  "temas": ["tema1", "tema2", ...]
}
`;
}
