/**
 * Utilidades para encriptar y desencriptar información sensible
 * 
 * NOTA DE SEGURIDAD: Esta implementación ofrece una seguridad básica para
 * proteger claves API contra inspecciones casuales. Para una aplicación
 * de producción con requisitos de seguridad estrictos, se recomienda
 * manejar las claves API exclusivamente en el backend.
 */

// Clave de encriptación basada en el dominio + un valor fijo
const getEncryptionKey = () => {
  const domain = window.location.hostname;
  const fixedSalt = 'AppLectura2025';
  return `${domain}:${fixedSalt}`;
};

/**
 * Encripta una clave API usando un algoritmo más seguro que simple base64
 * @param {string} key - Clave API a encriptar
 * @returns {string} Clave encriptada
 */
export const encryptApiKey = (key) => {
  if (!key || typeof key !== 'string') return '';
  
  try {
    // Usar una clave de encriptación que combine dominio + salt fijo
    const encryptionKey = getEncryptionKey();
    
    // Algoritmo XOR simple con la clave de encriptación
    let result = '';
    for (let i = 0; i < key.length; i++) {
      // XOR entre el caracter de la clave y el caracter correspondiente de encryptionKey
      const keyChar = key.charCodeAt(i);
      const saltChar = encryptionKey.charCodeAt(i % encryptionKey.length);
      const encryptedChar = keyChar ^ saltChar;
      
      // Convertir a hexadecimal y asegurar que tiene 2 dígitos
      const hexChar = encryptedChar.toString(16).padStart(2, '0');
      result += hexChar;
    }
    
    // Añadir un checksum simple para verificación
    const checksum = calculateChecksum(key);
    
    // Codificar en base64 para facilitar el almacenamiento
    return btoa(`${result}:${checksum}`);
  } catch (error) {
    console.error('Error al encriptar clave API:', error);
    // En caso de error, devolver una versión base64 simple (fallback)
    return btoa(key);
  }
};

/**
 * Desencripta una clave API previamente encriptada
 * @param {string} encryptedKey - Clave encriptada
 * @returns {string} Clave original o string vacío en caso de error
 */
export const decryptApiKey = (encryptedKey) => {
  if (!encryptedKey) return '';
  
  try {
    // Decodificar base64
    const decoded = atob(encryptedKey);
    
    // Verificar si tiene el formato esperado (con checksum)
    if (!decoded.includes(':')) {
      // Formato antiguo o fallback, solo decodificar base64
      return decoded;
    }
    
    // Separar datos y checksum
    const [data, checksum] = decoded.split(':');
    
    // Usar la misma clave de encriptación
    const encryptionKey = getEncryptionKey();
    
    // Decodificar los caracteres hexadecimales
    let result = '';
    for (let i = 0; i < data.length; i += 2) {
      // Tomar 2 caracteres hexadecimales
      const hex = data.substring(i, i + 2);
      // Convertir de hex a decimal
      const charCode = parseInt(hex, 16);
      // Aplicar XOR inverso
      const saltChar = encryptionKey.charCodeAt((i/2) % encryptionKey.length);
      const originalChar = charCode ^ saltChar;
      // Convertir a carácter
      result += String.fromCharCode(originalChar);
    }
    
    // Verificar checksum (opcional)
    const expectedChecksum = calculateChecksum(result);
    if (checksum !== expectedChecksum) {
      console.warn('Advertencia: El checksum no coincide. La clave podría estar corrupta.');
    }
    
    return result;
  } catch (error) {
    console.error('Error al desencriptar clave:', error);
    return '';
  }
};

/**
 * Guarda una configuración de claves API en localStorage de forma segura.
 * Itera sobre un objeto de configuración y guarda cada clave encriptada.
 * @param {object} config - Objeto con las claves API, ej: { openai: 'sk-...', gemini: '...' }.
 * @returns {{success: boolean, error?: string}} Un objeto indicando el resultado.
 */
export const guardarConfiguracionAPI = (config) => {
  try {
    if (!config || typeof config !== 'object') throw new Error("Configuración inválida.");

    Object.entries(config).forEach(([api, key]) => {
      const storageKey = `user_${api}_api_key`;
      if (key && typeof key === 'string' && key.trim()) {
        localStorage.setItem(storageKey, encryptApiKey(key));
      } else {
        localStorage.removeItem(storageKey);
      }
    });
    return { success: true, message: "Configuración guardada." };
  } catch (error) {
    console.error('Error al guardar configuración de API:', error);
    return { success: false, error: 'No se pudo guardar la configuración.' };
  }
};

/**
 * Obtiene y desencripta una clave API específica desde localStorage.
 * @param {string} api - El nombre de la API (ej. 'openai').
 * @returns {{success: boolean, data?: string, error?: string}} La clave o un error.
 */
export const obtenerClaveAPI = (api) => {
  try {
    const encryptedKey = localStorage.getItem(`user_${api}_api_key`);
    const decryptedKey = encryptedKey ? decryptApiKey(encryptedKey) : '';
    return { success: true, data: decryptedKey };
  } catch (error) {
    console.error(`Error al obtener configuración para ${api}:`, error);
    return { success: false, error: 'No se pudo obtener la clave API.' };
  }
};

/**
 * Obtiene toda la configuración de APIs disponibles.
 * @returns {Object} Objeto con todas las claves API configuradas.
 */
export const obtenerConfiguracionAPI = () => {
  try {
    const apis = ['openai', 'gemini'];
    const configuracion = {};
    
    apis.forEach(api => {
      const resultado = obtenerClaveAPI(api);
      if (resultado.success && resultado.data && resultado.data.trim()) {
        configuracion[api] = resultado.data;
      }
    });
    
    console.log('Configuración obtenida:', configuracion);
    return configuracion;
  } catch (error) {
    console.error('Error al obtener configuración completa:', error);
    return {};
  }
};

/**
 * Calcula un checksum simple para verificación
 * @param {string} text - Texto para calcular el checksum
 * @returns {string} Checksum calculado
 */
const calculateChecksum = (text) => {
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += text.charCodeAt(i);
  }
  return (sum % 997).toString(16); // Usar un número primo para el módulo
};

/**
 * Verifica si una clave parece ser válida basándose en su formato
 * @param {string} key - Clave API a verificar
 * @param {string} type - Tipo de clave ('openai' o 'gemini')
 * @returns {boolean} True si la clave parece válida
 */
export const isValidApiKey = (key, type) => {
  if (!key || typeof key !== 'string') return false;
  
  // Eliminar espacios en blanco
  const cleanKey = key.trim();
  
  // Patrones para diferentes tipos de API keys
  const patterns = {
    openai: /^sk-[A-Za-z0-9]{32,}$/,
    gemini: /^AIza[A-Za-z0-9_-]{35,}$/
  };
  
  return patterns[type] ? patterns[type].test(cleanKey) : false;
};

/**
 * Ofusca parcialmente una clave API para mostrar en la UI
 * @param {string} key - Clave API completa
 * @returns {string} Clave parcialmente ofuscada (ej: sk-***********ABC)
 */
export const obfuscateApiKey = (key) => {
  if (!key || typeof key !== 'string') return '';
  
  if (key.length < 8) return '********';
  
  // Mostrar primeros 4 y últimos 4 caracteres
  const prefix = key.substring(0, 4);
  const suffix = key.substring(key.length - 4);
  const stars = '*'.repeat(Math.min(key.length - 8, 10));
  
  return `${prefix}${stars}${suffix}`;
};