

import { gemini } from '../../config/apiClients.js';
import { settings } from '../../config/settings.js';

/**
 * Estrategia de análisis de texto utilizando la API de Gemini.
 * @param {string} prompt - El prompt para enviar a la API.
 * @returns {Promise<string>} El texto de la respuesta de la API.
 * @throws {Error} Si la API no está configurada o la solicitud falla.
 */
export async function geminiStrategy(prompt) {
  if (!gemini) {
    throw new Error("API Key de Gemini no configurada");
  }

  // Modificación específica para Gemini para asegurar que devuelva solo JSON.
  const modifiedPrompt = `${prompt}\nIMPORTANTE: Tu respuesta debe contener ÚNICAMENTE el JSON, sin texto adicional antes o después.`;

  const model = gemini.getGenerativeModel({ model: settings.gemini.model });
  const result = await model.generateContent(modifiedPrompt);
  const response = result.response;
  return response.text();
}

