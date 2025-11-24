/**
 * Generador Inteligente de Preguntas de Literacidad Crítica
 * Selecciona y contextualiza preguntas basadas en el contenido específico del texto
 */

import { MARCO_LITERACIDAD_CRITICA, CATEGORIAS_ANALISIS } from './criticalLiteracyFramework.js';

/**
 * Detecta temas y contextos en el texto para contextualización
 */
export function detectarContextoTexto(texto, analisisIA = null) {
  const textoLower = texto.toLowerCase();
  
  // Detectar categorías temáticas
  const categoriasDetectadas = [];
  
  Object.entries(CATEGORIAS_ANALISIS).forEach(([categoria, keywords]) => {
    const coincidencias = keywords.filter(keyword => 
      textoLower.includes(keyword) || 
      (analisisIA?.temas && analisisIA.temas.some(tema => 
        tema.toLowerCase().includes(keyword)
      ))
    );
    
    if (coincidencias.length > 0) {
      categoriasDetectadas.push({
        categoria,
        relevancia: coincidencias.length,
        palabrasClave: coincidencias
      });
    }
  });

  // Extraer temas específicos del análisis de IA o del texto
  const temasEspecificos = analisisIA?.temas || 
    extraerTemasBasicos(texto);

  // Detectar género textual
  const generoTextual = detectarGeneroTextual(texto);

  // Detectar marcadores de perspectiva crítica
  const marcadoresCriticos = detectarMarcadoresCriticos(texto);

  return {
    categorias: categoriasDetectadas.sort((a, b) => b.relevancia - a.relevancia),
    temasPrincipales: temasEspecificos.slice(0, 3),
    generoTextual,
    marcadoresCriticos,
    complejidadCritica: calcularComplejidadCritica(texto, categoriasDetectadas)
  };
}

/**
 * Extrae temas básicos del texto usando análisis léxico
 */
function extraerTemasBasicos(texto) {
  // Implementación similar a extractSimpleTopics pero más sofisticada
  const palabrasComunes = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'con', 'por', 'para', 
    'que', 'es', 'son', 'se', 'su', 'sus', 'le', 'les', 'me', 'te', 'nos', 'lo', 
    'ya', 'si', 'no', 'como', 'más', 'muy', 'todo', 'toda', 'todos', 'todas', 
    'este', 'esta', 'esto', 'estos', 'estas', 'fue', 'ser', 'estar', 'tener', 'hacer'
  ]);
  
  const oraciones = texto.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const temas = [];
  
  // Buscar patrones temáticos en las primeras oraciones
  oraciones.slice(0, 5).forEach(oracion => {
    const palabras = oracion.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !palabrasComunes.has(word));
    
    palabras.slice(0, 2).forEach(palabra => {
      if (!temas.includes(palabra)) {
        temas.push(palabra);
      }
    });
  });
  
  return temas.slice(0, 5);
}

/**
 * Detecta el género textual aproximado
 */
function detectarGeneroTextual(texto) {
  const textoLower = texto.toLowerCase();
  
  // Marcadores por género
  const generos = {
    'ensayo': ['considero', 'pienso', 'reflexión', 'análisis', 'propongo'],
    'artículo periodístico': ['según', 'fuentes', 'declaró', 'informó', 'acontecimiento'],
    'artículo de opinión': ['opino', 'creo', 'considero', 'mi punto de vista', 'desde mi perspectiva'],
    'texto académico': ['investigación', 'estudio', 'metodología', 'hipótesis', 'conclusión'],
    'narrativa': ['era', 'había', 'entonces', 'después', 'mientras'],
    'manifiesto': ['debemos', 'es necesario', 'exigimos', 'demandamos', 'llamamos'],
    'reporte': ['datos', 'estadísticas', 'porcentaje', 'cifras', 'información']
  };
  
  let mejorGenero = 'texto general';
  let mayorCoincidencias = 0;
  
  Object.entries(generos).forEach(([genero, marcadores]) => {
    const coincidencias = marcadores.filter(marcador => 
      textoLower.includes(marcador)
    ).length;
    
    if (coincidencias > mayorCoincidencias) {
      mayorCoincidencias = coincidencias;
      mejorGenero = genero;
    }
  });
  
  return mejorGenero;
}

/**
 * Detecta marcadores que sugieren perspectivas críticas o sesgos
 */
function detectarMarcadoresCriticos(texto) {
  const textoLower = texto.toLowerCase();
  
  const marcadores = {
    sesgos_posibles: [
      'obviamente', 'naturalmente', 'es evidente', 'todos sabemos', 
      'siempre', 'nunca', 'los expertos dicen', 'está comprobado'
    ],
    perspectiva_dominante: [
      'desarrollo', 'progreso', 'civilización', 'modernización', 
      'eficiencia', 'competitividad', 'crecimiento'
    ],
    voces_autoridad: [
      'estudios demuestran', 'expertos confirman', 'investigaciones revelan',
      'autoridades señalan', 'especialistas indican'
    ],
    lenguaje_exclusion: [
      'ellos', 'esos grupos', 'esa gente', 'los otros', 
      'minorías', 'sectores vulnerables'
    ]
  };
  
  const detectados = {};
  
  Object.entries(marcadores).forEach(([categoria, lista]) => {
    const encontrados = lista.filter(marcador => 
      textoLower.includes(marcador)
    );
    if (encontrados.length > 0) {
      detectados[categoria] = encontrados;
    }
  });
  
  return detectados;
}

/**
 * Calcula el nivel de complejidad para análisis crítico
 */
function calcularComplejidadCritica(texto, categorias) {
  let puntuacion = 0;
  
  // Longitud y estructura
  if (texto.length > 1000) puntuacion += 1;
  if (texto.split(/[.!?]+/).length > 10) puntuacion += 1;
  
  // Diversidad temática
  if (categorias.length > 2) puntuacion += 1;
  if (categorias.length > 4) puntuacion += 1;
  
  // Presencia de múltiples perspectivas
  const indicadoresPerspectivas = ['por un lado', 'sin embargo', 'no obstante', 'aunque', 'pero'];
  const perspectivas = indicadoresPerspectivas.filter(ind => 
    texto.toLowerCase().includes(ind)
  ).length;
  if (perspectivas > 1) puntuacion += 1;
  
  if (puntuacion <= 2) return 'básico';
  if (puntuacion <= 4) return 'intermedio';
  return 'avanzado';
}

/**
 * Selecciona preguntas contextualizadas basadas en el análisis del texto
 */
export function generarPreguntasContextualizadas(contexto, numPreguntasPorDimension = 2) {
  const preguntasSeleccionadas = {};
  
  // Seleccionar dimensiones basadas en el contexto y complejidad
  const dimensionesRelevantes = seleccionarDimensiones(contexto);
  
  dimensionesRelevantes.forEach(dimension => {
    preguntasSeleccionadas[dimension.nombre] = seleccionarPreguntasDimension(
      dimension.marco, 
      contexto, 
      numPreguntasPorDimension
    );
  });
  
  return preguntasSeleccionadas;
}

/**
 * Selecciona las dimensiones más relevantes según el contexto
 */
function seleccionarDimensiones(contexto) {
  const dimensiones = [
    { nombre: 'literal', marco: MARCO_LITERACIDAD_CRITICA.LECTURA_LITERAL, prioridad: 10 },
    { nombre: 'inferencial', marco: MARCO_LITERACIDAD_CRITICA.LECTURA_INFERENCIAL, prioridad: 9 },
    { nombre: 'critica', marco: MARCO_LITERACIDAD_CRITICA.LECTURA_CRITICA, prioridad: 10 },
    { nombre: 'evaluacion', marco: MARCO_LITERACIDAD_CRITICA.EVALUACION_CRITICA, prioridad: 8 },
    { nombre: 'praxis', marco: MARCO_LITERACIDAD_CRITICA.PRAXIS_TRANSFORMADORA, prioridad: 9 },
    { nombre: 'digital', marco: MARCO_LITERACIDAD_CRITICA.LITERACIDAD_DIGITAL, prioridad: 6 },
    { nombre: 'metacognicion', marco: MARCO_LITERACIDAD_CRITICA.METACOGNICION_CRITICA, prioridad: 7 }
  ];
  
  // Ajustar prioridades según contexto
  if (contexto.categorias.some(cat => cat.categoria === 'TECNOLOGICO')) {
    const digitalDim = dimensiones.find(d => d.nombre === 'digital');
    if (digitalDim) digitalDim.prioridad += 3;
  }
  
  if (contexto.categorias.some(cat => cat.categoria === 'SOCIAL_POLITICO')) {
    const praxisDim = dimensiones.find(d => d.nombre === 'praxis');
    if (praxisDim) praxisDim.prioridad += 2;
  }
  
  if (contexto.complejidadCritica === 'avanzado') {
    const criticaDim = dimensiones.find(d => d.nombre === 'critica');
    if (criticaDim) criticaDim.prioridad += 2;
  }
  
  // Seleccionar las 5 dimensiones con mayor prioridad
  return dimensiones
    .sort((a, b) => b.prioridad - a.prioridad)
    .slice(0, 5);
}

/**
 * Selecciona preguntas específicas de una dimensión
 */
function seleccionarPreguntasDimension(marco, contexto, numPreguntas) {
  const preguntasContextualizadas = [];
  
  // Seleccionar las dimensiones más relevantes del marco
  const dimensionesRelevantes = marco.dimensiones
    .sort(() => Math.random() - 0.5) // Aleatorizar para variedad
    .slice(0, numPreguntas);
  
  dimensionesRelevantes.forEach(dimension => {
    // Seleccionar variación más apropiada
    const variacionSeleccionada = seleccionarMejorVariacion(dimension, contexto);
    
    preguntasContextualizadas.push({
      id: dimension.id,
      pregunta: variacionSeleccionada,
      categoria: obtenerCategoriaPedagogica(dimension.id),
      nivelCritico: calcularNivelCritico(dimension.id)
    });
  });
  
  return preguntasContextualizadas;
}

/**
 * Selecciona la mejor variación de pregunta según el contexto
 */
function seleccionarMejorVariacion(dimension, contexto) {
  // Si hay variaciones específicas, elegir la más contextualizada
  if (dimension.variaciones && dimension.variaciones.length > 0) {
    const variacionContextual = dimension.variaciones.find(variacion => {
      // Buscar variaciones que puedan usar los temas detectados
      return variacion.includes('{tema}') || variacion.includes('{contexto}');
    });
    
    if (variacionContextual) {
      return contextualizarPregunta(variacionContextual, contexto);
    }
    
    // Si no hay contextual, usar la primera variación
    return dimension.variaciones[0];
  }
  
  // Usar la pregunta base contextualizada
  return contextualizarPregunta(dimension.pregunta_base, contexto);
}

/**
 * Reemplaza placeholders con información específica del texto
 */
function contextualizarPregunta(pregunta, contexto) {
  let preguntaContextualizada = pregunta;
  
  // Reemplazar {tema} con el tema principal detectado
  if (contexto.temasPrincipales && contexto.temasPrincipales.length > 0) {
    const temaPrincipal = contexto.temasPrincipales[0];
    preguntaContextualizada = preguntaContextualizada.replace(/{tema}/g, temaPrincipal);
  }
  
  // Reemplazar {contexto} con la categoría principal
  if (contexto.categorias && contexto.categorias.length > 0) {
    const categoriaPrincipal = contexto.categorias[0].categoria.toLowerCase().replace('_', ' ');
    preguntaContextualizada = preguntaContextualizada.replace(/{contexto}/g, categoriaPrincipal);
  }
  
  // Reemplazar {genero_textual} 
  if (contexto.generoTextual) {
    preguntaContextualizada = preguntaContextualizada.replace(/{genero_textual}/g, contexto.generoTextual);
  }
  
  // Si quedan placeholders sin reemplazar, usar términos genéricos
  preguntaContextualizada = preguntaContextualizada
    .replace(/{tema}/g, 'este tema')
    .replace(/{contexto}/g, 'este contexto')
    .replace(/{genero_textual}/g, 'este tipo de texto')
    .replace(/{identidad}/g, 'tu identidad');
  
  return preguntaContextualizada;
}

/**
 * Asigna categoría pedagógica para UI
 */
function obtenerCategoriaPedagogica(dimensionId) {
  const categorias = {
    // Literal
    'idea_principal': 'comprension',
    'ideas_secundarias': 'comprension', 
    'informacion_explicita': 'comprension',
    'lenguaje_clave': 'comprension',
    
    // Inferencial  
    'inferencias_implicitas': 'analisis',
    'presuposiciones_ironias': 'analisis',
    'conexion_experiencias': 'analisis',
    'estructura_genero': 'analisis',
    
    // Crítica
    'autor_audiencia': 'critica',
    'intencionalidad_proposito': 'critica',
    'voces_silenciadas': 'critica',
    'valores_ideologias': 'critica',
    'posicionamiento_lector': 'critica',
    'inclusion_exclusion': 'critica',
    'contexto_sociocultural': 'critica',
    'relaciones_poder': 'critica',
    
    // Evaluación
    'naturaleza_informacion': 'evaluacion',
    'veracidad_fiabilidad': 'evaluacion',
    'calidad_argumentativa': 'evaluacion',
    'contraste_fuentes': 'evaluacion',
    
    // Praxis
    'materializacion_analisis': 'transformacion',
    'soluciones_creativas': 'transformacion',
    'ideario_politico': 'transformacion',
    'impacto_areas_vida': 'transformacion',
    'participacion_democratica': 'transformacion',
    'solidaridad_alteridad': 'transformacion',
    'autocritica_dialectica': 'transformacion'
  };
  
  return categorias[dimensionId] || 'general';
}

/**
 * Calcula nivel de dificultad crítica
 */
function calcularNivelCritico(dimensionId) {
  const niveles = {
    // Nivel 1: Comprensión básica
    'idea_principal': 1,
    'ideas_secundarias': 1,
    'informacion_explicita': 1,
    
    // Nivel 2: Análisis e interpretación
    'lenguaje_clave': 2,
    'inferencias_implicitas': 2,
    'conexion_experiencias': 2,
    'estructura_genero': 2,
    
    // Nivel 3: Crítica y contextualización  
    'presuposiciones_ironias': 3,
    'autor_audiencia': 3,
    'intencionalidad_proposito': 3,
    'valores_ideologias': 3,
    'contexto_sociocultural': 3,
    
    // Nivel 4: Evaluación avanzada
    'voces_silenciadas': 4,
    'posicionamiento_lector': 4,
    'inclusion_exclusion': 4,
    'relaciones_poder': 4,
    'naturaleza_informacion': 4,
    'calidad_argumentativa': 4,
    
    // Nivel 5: Transformación y praxis
    'materializacion_analisis': 5,
    'soluciones_creativas': 5,
    'ideario_politico': 5,
    'participacion_democratica': 5,
    'autocritica_dialectica': 5
  };
  
  return niveles[dimensionId] || 3;
}

export default {
  detectarContextoTexto,
  generarPreguntasContextualizadas
};