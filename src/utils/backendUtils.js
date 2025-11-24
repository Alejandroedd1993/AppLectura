/**
 * Utilidades para verificar y manejar la conectividad del backend
 */

import { fetchWithTimeout } from './netUtils';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

/**
 * Verifica si el servidor backend está disponible
 * @returns {Promise<boolean>} true si el backend está disponible
 */
export const checkBackendAvailability = async () => {
  console.log('🔍 Verificando disponibilidad del backend en:', BACKEND_URL);
  
  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    }, 5000);
    console.log('✅ Respuesta del backend:', response.status, response.ok);
    return response.ok;
  } catch (error) {
    console.error('❌ Backend no disponible:', error.message);
    return false;
  }
};

/**
 * Procesa un archivo PDF usando el backend
 * @param {File} file - El archivo PDF a procesar
 * @returns {Promise<string>} El texto extraído del PDF
 */
export const processPdfWithBackend = async (file) => {
  console.log('🔄 Iniciando procesamiento de PDF:', file.name, 'Tamaño:', file.size, 'bytes');
  
  const formData = new FormData();
  formData.append('pdfFile', file);

  const response = await fetchWithTimeout(`${BACKEND_URL}/api/process-pdf`, {
    method: 'POST',
    body: formData,
  }, 60000);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error del servidor: ${response.status}`);
  }

  const result = await response.json();
  const extractedText = result.text || result.content || '';
  
  console.log('✅ Texto recibido del backend, longitud:', extractedText.length, 'caracteres');
  console.log('📖 Primeros 200 caracteres:', extractedText.substring(0, 200) + '...');
  console.log('📚 Últimos 200 caracteres:', extractedText.length > 200 ? '...' + extractedText.substring(extractedText.length - 200) : extractedText);
  
  return extractedText;
};

/**
 * Obtiene la URL base del backend
 * @returns {string} La URL del backend
 */
export const getBackendUrl = () => BACKEND_URL;
