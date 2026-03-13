/**
 * @file Módulo centralizado para el procesamiento de archivos.
 * @module fileProcessor
 * @version 1.0.0
 *
 * ADVERTENCIA DE SEGURIDAD: El procesamiento de PDFs en el cliente (navegador) con pdfjs-dist
 * puede presentar riesgos de seguridad (ejecución de código malicioso, XSS) si se cargan
 * archivos PDF de fuentes no confiables. Aunque pdfjs-dist está diseñado para ser seguro,
 * la mejor práctica para PDFs no confiables es procesarlos en un entorno de servidor sandboxed.
 * Este módulo se enfoca en la extracción de texto, que es menos riesgosa que el renderizado completo.
 */

import mammoth from 'mammoth';
import { checkBackendAvailability, processPdfWithBackend } from './backendUtils';

import logger from './logger';
// Configurar el worker de PDF.js para que se cargue localmente
// pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Procesa un archivo .txt y devuelve su contenido como texto.
 * @param {File} file - El archivo a procesar.
 * @returns {Promise<string>} El contenido del archivo.
 */
async function procesarTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (err) => reject(new Error(`Error al leer el archivo TXT: ${err.message || 'Error desconocido'}`));
    reader.readAsText(file);
  });
}

/**
 * Procesa un archivo .docx y devuelve su contenido como texto.
 * @param {File} file - El archivo a procesar.
 * @returns {Promise<string>} El contenido del archivo.
 */
async function procesarDocx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (err) {
    throw new Error(`Error al procesar archivo DOCX: ${err.message || 'Error desconocido'}`);
  }
}

/**
 * Procesa un archivo .pdf enviándolo al backend para extracción de texto.
 * @param {File} file - El archivo a procesar.
 * @param {function} onProgress - Callback para reportar el progreso (no usado directamente aquí, pero mantenido para compatibilidad).
 * @returns {Promise<string>} El contenido del archivo.
 */
async function procesarPdf(file, onProgress) {
  try {
    // Verificar backend y usar util centralizado
    const online = await checkBackendAvailability();
    if (!online) throw new Error('Backend no disponible');
    const text = await processPdfWithBackend(file);
    return text;
  } catch (error) {
    logger.warn('🔄 Backend no disponible, usando procesamiento local del PDF:', error.message);
    
    // Fallback: Procesar PDF localmente (modo simulado)
    if (onProgress) onProgress(0.1);
    
    // Simulamos un procesamiento exitoso con información básica del archivo
    const mockText = `📄 **Archivo PDF procesado localmente**

**Nombre del archivo:** ${file.name}
**Tamaño:** ${(file.size / 1024 / 1024).toFixed(2)} MB
**Fecha de carga:** ${new Date().toLocaleString()}

---

**🔧 Modo de demostración activo**

Este es contenido simulado ya que el servidor backend no está disponible. 

**Para activar el procesamiento completo de PDFs:**
1. Inicia el servidor backend en puerto 3001
2. O usa archivos TXT/DOCX que se procesan localmente

**Mientras tanto, puedes:**
- ✅ Probar la lectura interactiva 
- ✅ Explorar las opciones de configuración centralizada
- ✅ Cargar archivos TXT o DOCX para procesamiento completo

¡Inicia el servidor backend para experimentar el procesamiento completo de PDFs!`;

    if (onProgress) onProgress(1.0);
    return mockText;
  }
}

/**
 * Función principal que recibe un archivo y lo procesa según su tipo.
 * Incluye análisis estructural con IA para documentos académicos.
 * @param {File} file - El archivo a procesar.
 * @param {object} options - Opciones como callbacks de progreso.
 * @returns {Promise<string|Object>} El texto extraído o un objeto con texto + estructura.
 */
export const procesarArchivo = async (file, options = {}) => {
  const { onProgress, analyzeStructure: _analyzeStructure = true } = options;
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  let extractedText = '';

  // 1. Extraer texto según tipo de archivo
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    extractedText = await procesarTxt(file);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    extractedText = await procesarDocx(file);
  } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    extractedText = await procesarPdf(file, onProgress);
  } else {
    throw new Error('Formato de archivo no soportado');
  }

  // 2. ✅ ANÁLISIS LOCAL - Sin IA, solo procesamiento heurístico robusto
  logger.log('📖 Usando procesamiento local sin IA (más rápido y confiable)');
  
  // Retornar texto limpio para procesamiento universal
  return extractedText;
};
