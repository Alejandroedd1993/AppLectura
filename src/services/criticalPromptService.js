/**
 * Servicio de Prompts Especializados para Análisis de Literacidad Crítica
 * Genera prompts contextualizados para diferentes modelos de IA
 */

/**
 * Genera prompt especializado para análisis de literacidad crítica
 */
export function generarPromptLiteracidadCritica(texto, contexto, dimensionObjetivo = null) {
  const promptBase = construirPromptBase(contexto);
  const instruccionesEspecificas = generarInstruccionesEspecificas(contexto, dimensionObjetivo);
  const ejemplosContextuales = seleccionarEjemplosContextuales(contexto);
  
  return `${promptBase}

${instruccionesEspecificas}

TEXTO A ANALIZAR:
"""
${texto}
"""

${ejemplosContextuales}

FORMATO DE RESPUESTA REQUERIDO:
{
  "analisis_contexto": {
    "temas_identificados": ["tema1", "tema2", "tema3"],
    "genero_textual": "tipo de texto detectado",
    "perspectivas_presentes": ["perspectiva1", "perspectiva2"],
    "voces_representadas": ["voz1", "voz2"],
    "voces_silenciadas": ["voz_ausente1", "voz_ausente2"]
  },
  "preguntas_criticas": {
    "lectura_literal": [
      {
        "pregunta": "pregunta específica al texto",
        "justificacion": "por qué es relevante para este texto",
        "elementos_clave": ["elemento1", "elemento2"]
      }
    ],
    "lectura_inferencial": [...],
    "lectura_critica": [...],
    "evaluacion_critica": [...],
    "praxis_transformadora": [...]
  },
  "sugerencias_pedagogicas": {
    "nivel_complejidad": "básico|intermedio|avanzado",
    "estrategias_recomendadas": ["estrategia1", "estrategia2"],
    "conexiones_curriculares": ["area1", "area2"]
  }
}`;
}

/**
 * Construye el prompt base según el contexto detectado
 */
function construirPromptBase(contexto) {
  const complejidad = contexto.complejidadCritica || 'intermedio';
  const genero = contexto.generoTextual || 'texto general';
  const categorias = contexto.categorias?.map(cat => cat.categoria).join(', ') || 'general';
  
  return `Actúa como un especialista en literacidad crítica y pedagogía freireana. Tu tarea es analizar el siguiente texto desde una perspectiva de literacidad crítica auténtica, no superficial.

CONTEXTO DETECTADO:
- Tipo de texto: ${genero}
- Categorías temáticas: ${categorias}
- Nivel de complejidad: ${complejidad}
- Temas principales: ${contexto.temasPrincipales?.join(', ') || 'por determinar'}

PRINCIPIOS PEDAGÓGICOS A APLICAR:
1. Lectura crítica del mundo y la palabra (Paulo Freire)
2. Cuestionamiento de las relaciones de poder en los textos
3. Identificación de voces presentes y silenciadas
4. Conexión entre texto y realidad sociocultural del estudiante
5. Desarrollo de conciencia crítica y praxis transformadora
6. Reconocimiento de ideologías y valores implícitos
7. Promoción del diálogo problematizador`;
}

/**
 * Genera instrucciones específicas según la dimensión objetivo
 */
function generarInstruccionesEspecificas(contexto, dimensionObjetivo) {
  const instruccionesBase = `
INSTRUCCIONES ESPECÍFICAS:

1. ANÁLISIS CONTEXTUAL:
   - Identifica los temas centrales y su relevancia sociocultural
   - Detecta el posicionamiento ideológico del texto
   - Reconoce las perspectivas representadas y ausentes
   - Analiza el contexto de producción y recepción`;

  const instruccionesEspecificas = {
    'lectura_literal': `
2. ENFOQUE EN LECTURA LITERAL CRÍTICA:
   - Genera preguntas que vayan más allá de la mera extracción de información
   - Conecta la información explícita con contextos socioculturales
   - Identifica el lenguaje clave que revela posiciones ideológicas
   - Pregunta por los datos y hechos que el texto presenta como "naturales"`,

    'lectura_inferencial': `
2. ENFOQUE EN LECTURA INFERENCIAL CRÍTICA:
   - Desarrolla preguntas sobre presuposiciones e implicaciones
   - Explora las conexiones con experiencias y conocimientos del lector
   - Identifica ironías, contradicciones y omisiones significativas
   - Analiza cómo la estructura del texto refuerza ciertos mensajes`,

    'lectura_critica': `
2. ENFOQUE EN LECTURA CRÍTICA PROFUNDA:
   - Cuestiona las intenciones del autor y el contexto de producción
   - Identifica voces marginadas y perspectivas excluidas
   - Analiza las relaciones de poder implícitas en el texto
   - Examina cómo el texto posiciona al lector
   - Explora valores e ideologías subyacentes`,

    'evaluacion_critica': `
2. ENFOQUE EN EVALUACIÓN CRÍTICA:
   - Desarrolla criterios para evaluar la calidad y veracidad
   - Promueve el contraste con múltiples fuentes y perspectivas
   - Analiza la calidad de los argumentos y evidencias
   - Evalúa el impacto social y político del discurso`,

    'praxis_transformadora': `
2. ENFOQUE EN PRAXIS TRANSFORMADORA:
   - Conecta el análisis con posibilidades de acción social
   - Promueve soluciones creativas a problemas identificados
   - Desarrolla el ideario político personal del estudiante
   - Fomenta la participación democrática y la solidaridad
   - Estimula la autocrítica y el pensamiento dialéctico`
  };

  const instruccionEspecifica = dimensionObjetivo ? 
    instruccionesEspecificas[dimensionObjetivo] : `
2. ENFOQUE INTEGRAL:
   - Abarca todas las dimensiones de la literacidad crítica
   - Asegura progresión desde lo literal hasta la praxis
   - Conecta cada nivel con los principios freireanos
   - Promueve el diálogo problematizador en cada dimensión`;

  return instruccionesBase + instruccionEspecifica;
}

/**
 * Selecciona ejemplos contextuales según el tipo de texto y categorías
 */
function seleccionarEjemplosContextuales(contexto) {
  const ejemplos = {
    'artículo periodístico': `
EJEMPLO DE PREGUNTA CRÍTICA PARA ARTÍCULOS PERIODÍSTICOS:
- Literal: "¿Qué fuentes cita el artículo y cuáles omite?"
- Inferencial: "¿Qué perspectivas quedan implícitas en la selección de testimonios?"
- Crítica: "¿Cómo refleja este artículo las relaciones de poder en los medios de comunicación?"
- Evaluación: "¿Qué intereses podrían estar representados en la línea editorial del medio?"
- Praxis: "¿Cómo podríamos contrastar esta información con fuentes alternativas?"`,

    'ensayo': `
EJEMPLO DE PREGUNTA CRÍTICA PARA ENSAYOS:
- Literal: "¿Cuáles son las tesis centrales que el autor presenta como verdades?"
- Inferencial: "¿Qué experiencias de vida podrían haber influido en estas ideas?"
- Crítica: "¿Desde qué posición social y cultural escribe el autor?"
- Evaluación: "¿Qué evidencias respaldan o contradicen estos argumentos?"
- Praxis: "¿Cómo se relacionan estas ideas con nuestra realidad local?"`,

    'texto académico': `
EJEMPLO DE PREGUNTA CRÍTICA PARA TEXTOS ACADÉMICOS:
- Literal: "¿Qué metodología y marcos teóricos emplea el estudio?"
- Inferencial: "¿Qué sesgos podrían estar presentes en el diseño de la investigación?"
- Crítica: "¿A quién beneficia el conocimiento producido por esta investigación?"
- Evaluación: "¿Cómo se comparan estos hallazgos con estudios de contextos similares?"
- Praxis: "¿Qué implicaciones tiene esta investigación para las políticas públicas?"`,

    'narrativa': `
EJEMPLO DE PREGUNTA CRÍTICA PARA NARRATIVAS:
- Literal: "¿Qué eventos y personajes son centrales en la historia?"
- Inferencial: "¿Qué valores y normas sociales se transmiten implícitamente?"
- Crítica: "¿Qué modelos de masculinidad/feminidad presenta el texto?"
- Evaluación: "¿Cómo se compara esta representación con otras narrativas del contexto?"
- Praxis: "¿Qué narrativas alternativas podríamos construir sobre estos mismos temas?"`
  };

  const genero = contexto.generoTextual || 'texto general';
  const ejemploSeleccionado = ejemplos[genero] || ejemplos['ensayo'];
  
  return `
EJEMPLOS DE ENFOQUE CRÍTICO:
${ejemploSeleccionado}

RECUERDA: Cada pregunta debe conectar el texto con la realidad sociocultural del estudiante y promover la conciencia crítica, no solo la comprensión superficial.`;
}

/**
 * Genera prompt específico para diferentes proveedores de IA
 */
export function generarPromptPorProveedor(texto, contexto, proveedor = 'general') {
  const prompts = {
    'openai': generarPromptOpenAI(texto, contexto),
    'deepseek': generarPromptDeepSeek(texto, contexto),
    'gemini': generarPromptGemini(texto, contexto)
  };
  
  return prompts[proveedor] || generarPromptLiteracidadCritica(texto, contexto);
}

/**
 * Prompt optimizado para OpenAI GPT
 */
function generarPromptOpenAI(texto, contexto) {
  return `# Especialista en Literacidad Crítica - Análisis Pedagógico

## Misión
Analizar el texto desde principios freireanos de literacidad crítica, generando preguntas que desarrollen conciencia crítica y praxis transformadora.

## Contexto del Texto
- **Género**: ${contexto.generoTextual}
- **Temas**: ${contexto.temasPrincipales?.join(', ')}
- **Complejidad**: ${contexto.complejidadCritica}

## Texto a Analizar
\`\`\`
${texto}
\`\`\`

## Proceso de Análisis

### 1. Análisis Contextual
Identifica:
- Posicionamiento ideológico del texto
- Voces representadas y silenciadas  
- Relaciones de poder implícitas
- Conexiones socioculturales

### 2. Generación de Preguntas Críticas
Para cada dimensión, crea 2-3 preguntas específicas:

**Lectura Literal Crítica**: Preguntas que conecten información explícita con contextos socioculturales
**Lectura Inferencial**: Preguntas sobre presuposiciones y conexiones experienciales  
**Lectura Crítica**: Preguntas sobre intencionalidad, voces excluidas y relaciones de poder
**Evaluación Crítica**: Preguntas sobre veracidad, calidad argumentativa y contraste de fuentes
**Praxis Transformadora**: Preguntas sobre posibilidades de acción y transformación social

### 3. Formato de Respuesta
Responde en JSON estructurado con análisis_contexto, preguntas_criticas y sugerencias_pedagogicas.`;
}

/**
 * Prompt optimizado para DeepSeek
 */
function generarPromptDeepSeek(texto, contexto) {
  return `SISTEMA: Eres un especialista en pedagogía crítica y literacidad freireana. Analiza textos para desarrollar conciencia crítica auténtica.

TAREA: Analizar el siguiente texto y generar preguntas de literacidad crítica contextualizadas.

CONTEXTO:
- Tipo: ${contexto.generoTextual}
- Temas: ${contexto.temasPrincipales?.join(', ')}  
- Nivel: ${contexto.complejidadCritica}

PRINCIPIOS:
1. Lectura crítica del mundo y la palabra
2. Cuestionamiento de relaciones de poder
3. Identificación de voces silenciadas
4. Conexión texto-realidad sociocultural
5. Desarrollo de praxis transformadora

TEXTO:
${texto}

INSTRUCCIONES:
1. Analiza el posicionamiento ideológico del texto
2. Identifica voces presentes y ausentes
3. Genera preguntas críticas específicas para cada dimensión:
   - Literal crítica (2 preguntas)
   - Inferencial (2 preguntas)  
   - Crítica (3 preguntas)
   - Evaluación (2 preguntas)
   - Praxis (2 preguntas)

4. Cada pregunta debe ser específica al texto analizado
5. Conectar con la realidad del estudiante
6. Promover diálogo problematizador

FORMATO: JSON con análisis_contexto, preguntas_criticas, sugerencias_pedagogicas`;
}

/**
 * Prompt optimizado para Gemini
 */  
function generarPromptGemini(texto, contexto) {
  return `**Rol**: Especialista en Literacidad Crítica y Pedagogía Freireana

**Objetivo**: Analizar el texto proporcionado para desarrollar preguntas de literacidad crítica auténtica que promuevan conciencia crítica y praxis transformadora.

**Contexto del Análisis**:
- Género textual: ${contexto.generoTextual}
- Temas principales: ${contexto.temasPrincipales?.join(', ')}
- Complejidad crítica: ${contexto.complejidadCritica}

**Marco Teórico**: 
Pedagogía crítica freireana enfocada en la lectura crítica del mundo y la palabra, cuestionamiento de estructuras de poder, y desarrollo de conciencia crítica.

**Texto para Análisis**:
\`\`\`
${texto}
\`\`\`

**Proceso de Análisis**:

1. **Contextualización Crítica**
   - Identificar posicionamiento ideológico
   - Reconocer voces representadas y marginadas
   - Analizar relaciones de poder implícitas

2. **Generación de Preguntas por Dimensión**
   
   **Literal Crítica**: Conectar información explícita con contextos socioculturales
   
   **Inferencial**: Explorar presuposiciones y conexiones experienciales
   
   **Crítica**: Cuestionar intencionalidad, exclusiones y relaciones de poder
   
   **Evaluación**: Analizar veracidad, argumentos y fuentes
   
   **Praxis**: Promover reflexión sobre acción transformadora

**Formato de Respuesta**: JSON estructurado con análisis contextual, preguntas categorizadas y sugerencias pedagógicas.

**Criterio de Calidad**: Cada pregunta debe ser específica al texto, contextualmente relevante y promotora del diálogo crítico.`;
}

/**
 * Valida y ajusta la respuesta de IA según estándares pedagógicos
 */
export function validarRespuestaIA(respuestaIA, contextoOriginal) {
  const validacion = {
    esValida: true,
    advertencias: [],
    sugerenciasMejora: []
  };
  
  // Verificar estructura de respuesta
  if (!respuestaIA.preguntas_criticas) {
    validacion.esValida = false;
    validacion.advertencias.push("Falta la sección de preguntas críticas");
  }
  
  // Verificar calidad pedagógica de las preguntas
  if (respuestaIA.preguntas_criticas) {
    Object.entries(respuestaIA.preguntas_criticas).forEach(([dimension, preguntas]) => {
      preguntas.forEach((pregunta, index) => {
        // Verificar que las preguntas sean específicas al texto
        if (esGenericaOSuperficial(pregunta.pregunta)) {
          validacion.sugerenciasMejora.push(
            `Pregunta ${dimension}[${index}] parece genérica. Contextualizarla más al texto específico.`
          );
        }
        
        // Verificar enfoque crítico auténtico
        if (!tienePerspectivaCritica(pregunta.pregunta)) {
          validacion.sugerenciasMejora.push(
            `Pregunta ${dimension}[${index}] necesita mayor profundidad crítica.`
          );
        }
      });
    });
  }
  
  return validacion;
}

/**
 * Detecta si una pregunta es genérica o superficial
 */
function esGenericaOSuperficial(pregunta) {
  const marcadoresGenericos = [
    '¿qué opinas sobre',
    '¿cuál es tu punto de vista',
    '¿estás de acuerdo',
    '¿qué piensas de',
    'en tu opinión'
  ];
  
  const preguntaLower = pregunta.toLowerCase();
  return marcadoresGenericos.some(marcador => 
    preguntaLower.includes(marcador)
  );
}

/**
 * Verifica si una pregunta tiene perspectiva crítica auténtica
 */
function tienePerspectivaCritica(pregunta) {
  const marcadoresCriticos = [
    'qué voces',
    'qué perspectivas',
    'quién se beneficia',
    'qué intereses',
    'cómo se relaciona con el poder',
    'qué ausencias',
    'qué presuposiciones',
    'desde qué posición',
    'cómo podríamos transformar',
    'qué alternativas'
  ];
  
  const preguntaLower = pregunta.toLowerCase();
  return marcadoresCriticos.some(marcador => 
    preguntaLower.includes(marcador)
  );
}

export default {
  generarPromptLiteracidadCritica,
  generarPromptPorProveedor,
  validarRespuestaIA
};