/**
 * Realiza un análisis básico de un texto sin utilizar APIs externas.
 * @param {string} texto - El texto a analizar.
 * @returns {object} Un objeto con estadísticas básicas y un análisis simple del texto.
 */
export function analizarTextoBasico(texto) {
  try {
    console.log("Realizando análisis básico del texto...");
    
    const palabras = texto.split(/\s+/).filter(p => p.length > 0);
    const oraciones = texto.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const parrafos = texto.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const longitudPromedioPalabras = palabras.reduce((sum, word) => sum + word.length, 0) / palabras.length;
    const longitudPromedioOraciones = palabras.length / oraciones.length;
    
    let complejidad = "básico";
    if (longitudPromedioPalabras > 6 || longitudPromedioOraciones > 20) {
      complejidad = "avanzado";
    } else if (longitudPromedioPalabras > 5 || longitudPromedioOraciones > 15) {
      complejidad = "intermedio";
    }
    
    const palabrasComunes = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "a", "de", "en", "que", "por", "con", "para", "se", "su", "sus", "al", "del", "lo", "es", "son"]);
    const frecuencia = {};
    palabras.forEach(palabra => {
      palabra = palabra.toLowerCase().replace(/[.,;:?!()]/g, '');
      if (palabra.length > 3 && !palabrasComunes.has(palabra)) {
        frecuencia[palabra] = (frecuencia[palabra] || 0) + 1;
      }
    });
    
    const palabrasFrecuentes = Object.entries(frecuencia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([palabra, freq]) => ({
        palabra,
        definicion: `Aparece ${freq} ${freq === 1 ? 'vez' : 'veces'} en el texto`
      }));
    
    let tono = "descriptivo";
    let estilo = "informal";
    let sentimiento = "neutral";
    
    if ((texto.match(/\!/g) || []).length > texto.length / 500) {
      tono = "exclamativo";
    } else if ((texto.match(/\?/g) || []).length > texto.length / 500) {
      tono = "interrogativo";
    }
    
    const palabrasFormalidad = ["por consiguiente", "por lo tanto", "en consecuencia", "no obstante", "sin embargo", "cabe destacar", "es preciso", "se considera"];
    if (palabrasFormalidad.some(p => texto.toLowerCase().includes(p))) {
      estilo = "formal";
    }
    
    // Ideas principales: primeras oraciones de los primeros párrafos
    const ideasPrincipales = parrafos
      .slice(0, Math.min(3, parrafos.length))
      .map((p, i) => {
        const m = p.match(/^[^.!?]{20,200}[.!?]/);
        return m ? m[0].trim() : (p.slice(0, 120) + (p.length > 120 ? '…' : ''));
      });

    // Temas: a partir de palabras frecuentes no triviales
    const temas = Object.entries(frecuencia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

    // Preguntas de reflexión con anclaje a temas (si existen)
    const preguntasReflexion = [
      temas[0] ? `¿Cómo se desarrolla el tema de "${temas[0]}" a lo largo del texto?` : "¿Cuál es el propósito principal del texto?",
      temas[1] ? `¿Qué evidencias ofrece el autor sobre "${temas[1]}"?` : "¿Qué ideas o conceptos clave presenta?",
      "¿Qué conexiones puedes hacer con conocimientos o experiencias previas?"
    ];

    return {
      resumen: texto.length > 500 ? texto.substring(0, 500) + "..." : texto,
      ideasPrincipales: ideasPrincipales.length ? ideasPrincipales : ["Resumen ejecutivo no disponible"],
      analisisEstilistico: {
        tono,
        sentimiento,
        estilo,
        publicoObjetivo: "general"
      },
      preguntasReflexion,
      vocabulario: palabrasFrecuentes,
      complejidad,
      temas: temas.length ? temas : ["Análisis general"]
    };
  } catch (error) {
    console.error("Error en analizarTextoBasico:", error);
    throw error;
  }
}