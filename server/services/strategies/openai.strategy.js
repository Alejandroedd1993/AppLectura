
import { openai } from '../../config/apiClients.js';
import { settings } from '../../config/settings.js';

/**
 * Estrategia de análisis de texto utilizando la API de OpenAI.
 * @param {string} prompt - El prompt para enviar a la API.
 * @returns {Promise<string>} El contenido del mensaje de respuesta de la API.
 * @throws {Error} Si la solicitud a la API falla.
 */
export async function openaiStrategy(prompt) {
  const completion = await openai.chat.completions.create({
    model: settings.openai.model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: "json_object" }, // Clave para asegurar la respuesta en JSON
    temperature: 0.7,
  });
  return completion.choices[0].message.content;
}
