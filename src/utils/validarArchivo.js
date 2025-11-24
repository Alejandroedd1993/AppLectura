import { estimarTiemposProcesamiento } from './textUtils';

/**
 * Utilidades para validación y procesamiento seguro de archivos
 * 
 * Este módulo proporciona herramientas para:
 * - Validar tipos, tamaños y seguridad de archivos
 * - Extraer información básica sobre archivos
 * - Estimar tiempo de procesamiento
 * - Verificar compatibilidad con la aplicación
 * 
 * @module validarArchivo
 * @version 1.5.0
 */

/**
 * Configuración predeterminada para validación de archivos
 */
export const ARCHIVOS_CONFIG = {
  // Tamaños máximos
  MAX_SIZE_PDF: 10 * 1024 * 1024,      // 10MB para PDF
  MAX_SIZE_TEXT: 10 * 1024 * 1024,     // 10MB para archivos de texto
  MAX_SIZE_EBOOK: 10 * 1024 * 1024,    // 10MB para ebooks
  
  // Tipos MIME permitidos y sus extensiones
  TIPOS_PERMITIDOS: {
    // Archivos de texto
    'text/plain': { 
      extension: '.txt', 
      categoria: 'texto',
      descripcion: 'Archivo de texto plano'
    },
    'text/markdown': { 
      extension: '.md', 
      categoria: 'texto',
      descripcion: 'Documento Markdown'
    },
    'text/csv': { 
      extension: '.csv', 
      categoria: 'datos',
      descripcion: 'Archivo CSV'
    },
    // Documentos
    'application/pdf': { 
      extension: '.pdf', 
      categoria: 'documento',
      descripcion: 'Documento PDF'
    },
    'application/rtf': { 
      extension: '.rtf', 
      categoria: 'documento',
      descripcion: 'Documento de texto enriquecido'
    },
    'application/msword': { 
      extension: '.doc', 
      categoria: 'documento',
      descripcion: 'Documento Word'
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
      extension: '.docx', 
      categoria: 'documento',
      descripcion: 'Documento Word'
    },
    // Ebooks
    'application/epub+zip': { 
      extension: '.epub', 
      categoria: 'ebook',
      descripcion: 'Libro electrónico EPUB'
    },
    'application/x-mobipocket-ebook': { 
      extension: '.mobi', 
      categoria: 'ebook',
      descripcion: 'Libro electrónico MOBI'
    }
  },
  
  // Extensiones adicionales que no siempre tienen el tipo MIME correcto
  EXTENSIONES_ADICIONALES: [
    '.epub', '.mobi', '.txt', '.md', '.rtf', '.doc', '.docx', '.pdf'
  ]
};

/**
 * Función principal para validar archivos antes de ser procesados
 * 
 * @param {File} file - El archivo a validar
 * @param {Object} [opciones] - Opciones de validación personalizadas
 * @param {Object} [opciones.tiposPermitidos] - Objeto con tipos permitidos (usa ARCHIVOS_CONFIG.TIPOS_PERMITIDOS si no se especifica)
 * @param {boolean} [opciones.pdfJsLoaded] - Indica si PDF.js ha sido cargado
 * @param {number} [opciones.maxSize] - Tamaño máximo del archivo en bytes (por defecto usa tamaños de ARCHIVOS_CONFIG)
 * @param {function} [opciones.handleError] - Función para mostrar errores de validación
 * @param {boolean} [opciones.validacionEstricta] - Si es true, valida más estrictamente el contenido
 * @returns {Object} - Objeto con resultado de validación: {valido: boolean, error: string, tipoArchivo: string, extension: string}
 */
export function validarArchivo(file, opciones = {}) {
  // Resultado por defecto
  const resultado = {
    valido: false,
    error: null,
    tipoArchivo: null,
    extension: null,
    tamanioMB: 0,
    categoria: null,
    nombreNormalizado: null
  };
  
  // Validar que file existe y es un objeto File
  if (!file || !(file instanceof File)) {
    resultado.error = 'Archivo inválido o no proporcionado';
    return resultado;
  }
  
  // Extraer opciones o usar valores por defecto
  const tiposPermitidos = opciones.tiposPermitidos || ARCHIVOS_CONFIG.TIPOS_PERMITIDOS;
  const pdfJsLoaded = opciones.pdfJsLoaded !== undefined ? opciones.pdfJsLoaded : true;
  const handleError = opciones.handleError || console.error;
  
  // Información básica del archivo
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  const fileExtension = '.' + fileName.split('.').pop();
  const fileSize = file.size;
  const fileSizeMB = Math.round((fileSize / (1024 * 1024)) * 10) / 10; // Tamaño en MB con 1 decimal
  
  // Completar información de resultado
  resultado.tipoArchivo = fileType;
  resultado.extension = fileExtension;
  resultado.tamanioMB = fileSizeMB;
  resultado.nombreNormalizado = normalizarNombreArchivo(fileName);
  
  // Determinar la categoría del archivo
  const categoriaInfo = determinarCategoriaArchivo(fileName, fileType, tiposPermitidos);
  resultado.categoria = categoriaInfo.categoria;
  
  // 1. Validar tipo de archivo
  const tipoPermitido = categoriaInfo.permitido;
  if (!tipoPermitido) {
    const extensionesPermitidas = Object.values(tiposPermitidos)
      .map(tipo => tipo.extension)
      .filter((ext, i, arr) => arr.indexOf(ext) === i) // Eliminar duplicados
      .join(', ');
    
    resultado.error = `Tipo de archivo no permitido. Los formatos aceptados son: ${extensionesPermitidas}`;
    handleError(resultado.error);
    return resultado;
  }
  
  // 2. Validar tamaño máximo según el tipo de archivo
  let maxSize;
  if (opciones.maxSize) {
    maxSize = opciones.maxSize;
  } else {
    // Seleccionar tamaño máximo según categoría
    if (resultado.categoria === 'documento' && fileExtension === '.pdf') {
      maxSize = ARCHIVOS_CONFIG.MAX_SIZE_PDF;
    } else if (resultado.categoria === 'texto') {
      maxSize = ARCHIVOS_CONFIG.MAX_SIZE_TEXT;
    } else if (resultado.categoria === 'ebook') {
      maxSize = ARCHIVOS_CONFIG.MAX_SIZE_EBOOK;
    } else {
      maxSize = ARCHIVOS_CONFIG.MAX_SIZE_TEXT; // Valor por defecto
    }
  }
  
  if (fileSize > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    resultado.error = `El archivo es demasiado grande (${fileSizeMB}MB). El límite es de ${maxSizeMB}MB para archivos ${resultado.categoria}.`;
    handleError(resultado.error);
    return resultado;
  }
  
  // 3. Validar disponibilidad de bibliotecas especiales
  if ((fileType === 'application/pdf' || fileExtension === '.pdf') && !pdfJsLoaded) {
    resultado.error = 'No se puede procesar PDF: PDF.js no está disponible';
    handleError(resultado.error);
    return resultado;
  }
  
  // 4. Validaciones adicionales específicas por tipo
  if (opciones.validacionEstricta) {
    // Para PDFs, verificar que no esté protegido o dañado
    if (fileExtension === '.pdf') {
      // Esta validación requeriría leer el contenido del archivo
      // Se implementaría con FileReader para examinar las primeras bytes
      // Por ahora es una reserva para futuras implementaciones
    }
    
    // Para documentos Word, verificar que no tengan macros
    if (fileExtension === '.doc' || fileExtension === '.docx') {
      // Esta validación requeriría analizar la estructura del archivo
      // Por ahora es una reserva para futuras implementaciones
    }
  }
  
  // Si llegamos aquí, el archivo es válido
  resultado.valido = true;
  return resultado;
}

/**
 * Determina la categoría de un archivo y si está permitido
 * @param {string} fileName - Nombre del archivo
 * @param {string} fileType - Tipo MIME del archivo
 * @param {Object} tiposPermitidos - Objeto con los tipos permitidos
 * @returns {Object} - {categoria: string, permitido: boolean}
 */
function determinarCategoriaArchivo(fileName, fileType, tiposPermitidos) {
  // Verificar por tipo MIME
  if (tiposPermitidos[fileType]) {
    return {
      categoria: tiposPermitidos[fileType].categoria,
      permitido: true
    };
  }
  
  // Si el tipo MIME no está en la lista o es genérico, verificar extensión
  const extension = '.' + fileName.split('.').pop().toLowerCase();
  
  // Buscar en los tipos permitidos por extensión
  for (const tipo of Object.values(tiposPermitidos)) {
    if (tipo.extension === extension) {
      return {
        categoria: tipo.categoria,
        permitido: true
      };
    }
  }
  
  // Verificar si es una de las extensiones adicionales
  if (ARCHIVOS_CONFIG.EXTENSIONES_ADICIONALES.includes(extension)) {
    // Determinar categoría por extensión
    if (['.epub', '.mobi'].includes(extension)) {
      return { categoria: 'ebook', permitido: true };
    }
    if (['.pdf', '.doc', '.docx', '.rtf'].includes(extension)) {
      return { categoria: 'documento', permitido: true };
    }
    if (['.txt', '.md'].includes(extension)) {
      return { categoria: 'texto', permitido: true };
    }
  }
  
  // No permitido o no categorizado
  return {
    categoria: 'desconocido',
    permitido: false
  };
}

/**
 * Normaliza el nombre de un archivo para hacerlo más amigable
 * @param {string} nombreArchivo - Nombre original del archivo
 * @returns {string} - Nombre normalizado
 */
export function normalizarNombreArchivo(nombreArchivo) {
  if (!nombreArchivo) return '';
  
  // Extraer nombre base sin extensión
  const partes = nombreArchivo.split('.');
  const extension = partes.length > 1 ? '.' + partes.pop() : '';
  let nombre = partes.join('.');
  
  // Eliminar caracteres no deseados
  nombre = nombre
    .replace(/[_-]+/g, ' ')         // Reemplazar guiones y underscores por espacios
    .replace(/\s+/g, ' ')           // Normalizar espacios múltiples
    .replace(/^\d+\s*[-_]?\s*/g, '') // Quitar números al inicio (ej: "01 - Documento")
    .trim();
  
  // Capitalizar primera letra de cada palabra importante
  nombre = nombre.replace(/\b([a-z])/g, (match) => match.toUpperCase());
  
  // Truncar si es demasiado largo
  const MAX_LENGTH = 50;
  if (nombre.length > MAX_LENGTH) {
    nombre = nombre.substring(0, MAX_LENGTH) + '...';
  }
  
  return nombre + extension.toLowerCase();
}

/**
 * Extrae metadatos básicos del nombre y tipo de archivo
 * @param {File} file - El archivo a analizar
 * @returns {Object} - Metadatos extraídos
 */
export function extraerMetadatosBasicos(file) {
  if (!file) return {};
  
  const fileName = file.name;
  const fileType = file.type;
  const extension = '.' + fileName.split('.').pop().toLowerCase();
  const tamañoMB = Math.round((file.size / (1024 * 1024)) * 10) / 10;
  
  // Metadatos comunes
  const metadatos = {
    nombre: fileName,
    nombreNormalizado: normalizarNombreArchivo(fileName),
    tipo: fileType,
    extension: extension,
    tamaño: file.size,
    tamañoFormateado: `${tamañoMB} MB`,
    fechaSubida: new Date().toISOString()
  };
  
  // Intentar extraer información específica del nombre
  // Ejemplos: posible autor, año, edición, etc.
  const patronesMetadatos = [
    { patron: /\(([^)]+)\)/, tipo: 'información', campo: 'informacionAdicional' },
    { patron: /\[([^\]]+)\]/, tipo: 'etiqueta', campo: 'etiquetas' },
    { patron: /(\d{4})/, tipo: 'año', campo: 'añoPosible' }
  ];
  
  for (const { patron, tipo, campo } of patronesMetadatos) {
    const matches = [...fileName.matchAll(new RegExp(patron.source, 'g'))];
    if (matches.length > 0) {
      // Si hay múltiples coincidencias para etiquetas, guardarlas todas
      if (tipo === 'etiqueta') {
        metadatos[campo] = matches.map(m => m[1].trim());
      } else {
        // Para otros tipos, usar la primera coincidencia
        metadatos[campo] = matches[0][1].trim();
      }
    }
  }
  
  // Añadir tiempo estimado de procesamiento
  const segundos = estimarTiemposProcesamiento({ tamañoArchivo: file.size }).archivo || 1;
  
  let nivel;
  if (segundos < 5) nivel = 'muy rápido';
  else if (segundos < 15) nivel = 'rápido';
  else if (segundos < 30) nivel = 'moderado';
  else if (segundos < 60) nivel = 'lento';
  else nivel = 'muy lento';

  metadatos.tiempoProcesamiento = { segundos, nivel };
  
  return metadatos;
}

export default { 
  validarArchivo, 
  normalizarNombreArchivo, 
  extraerMetadatosBasicos,
  ARCHIVOS_CONFIG
};