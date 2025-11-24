/**
 * @file Módulo con utilidades para exportar datos.
 * @module exportUtils
 * @version 1.2.0
 */

/**
 * Construye y exporta los resultados de un análisis a un archivo JSON.
 *
 * @param {object} analisis - El objeto principal del análisis.
 * @param {object} metadata - Metadatos adicionales para incluir en la exportación.
 * @returns {{success: boolean, message?: string, error?: string}} Un objeto indicando el resultado.
 */
export const exportarResultados = (analisis, metadata = {}) => {
  if (!analisis) {
    return { success: false, error: 'No hay datos de análisis para exportar.' };
  }

  try {
    const dataToExport = {
      analisis,
      metadata: {
        fechaAnalisis: new Date().toISOString(),
        ...metadata
      }
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const fileName = `analisis_${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    document.body.appendChild(linkElement); // Necesario para Firefox
    linkElement.click();
    document.body.removeChild(linkElement);
    return { success: true, message: 'Exportación iniciada.' };
  } catch (error) {
    console.error("Error al exportar análisis como JSON:", error);
    return { success: false, error: 'No se pudo generar el archivo de exportación.' };
  }
};