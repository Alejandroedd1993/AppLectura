/**
 * Utilidades para verificar y manejar la conectividad del backend
 */

import { fetchWithTimeout } from './netUtils';
import logger from './logger';
import { buildBackendError, unwrapBackendSuccessPayload } from '../services/unifiedAiService';
import { BACKEND_URL, buildBackendUrl } from '../config/backend';
import { getFirebaseAuthHeader } from './backendRequest';

/**
 * Verifica si el servidor backend está disponible
 * @returns {Promise<boolean>} true si el backend está disponible
 */
export const checkBackendAvailability = async () => {
  logger.log('🔍 Verificando disponibilidad del backend en:', BACKEND_URL);
  
  try {
    const response = await fetchWithTimeout(buildBackendUrl('/api/health'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    }, 5000);
    logger.log('✅ Respuesta del backend:', response.status, response.ok);
    return response.ok;
  } catch (error) {
    logger.error('❌ Backend no disponible:', error.message);
    return false;
  }
};

/**
 * Procesa un archivo PDF usando el backend
 * @param {File} file - El archivo PDF a procesar
 * @returns {Promise<string>} El texto extraído del PDF
 */
export const processPdfWithBackend = async (file) => {
  logger.log('🔄 Iniciando procesamiento de PDF:', file.name, 'Tamaño:', file.size, 'bytes');
  
  const formData = new FormData();
  formData.append('pdfFile', file);

  const authHeader = await getFirebaseAuthHeader();

  const response = await fetchWithTimeout(buildBackendUrl('/api/process-pdf'), {
    method: 'POST',
    headers: {
      ...authHeader
    },
    body: formData,
  }, 60000);

  if (!response.ok) {
    throw await buildBackendError(response, {
      fallbackMessage: `Error del servidor: ${response.status}`
    });
  }

  const result = unwrapBackendSuccessPayload(await response.json());
  const extractedText = result.text || result.content || '';
  
  logger.log('✅ Texto recibido del backend, longitud:', extractedText.length, 'caracteres');
  logger.log('📖 Primeros 200 caracteres:', extractedText.substring(0, 200) + '...');
  logger.log('📚 Últimos 200 caracteres:', extractedText.length > 200 ? '...' + extractedText.substring(extractedText.length - 200) : extractedText);
  
  return extractedText;
};

export const getBackendUrl = () => BACKEND_URL;
