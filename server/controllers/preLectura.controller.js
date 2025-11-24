/**
 * Controlador para análisis de Pre-lectura con RAG
 * Orquesta análisis académico completo con enriquecimiento web
 */

import axios from 'axios';

/**
 * Endpoint: POST /api/analysis/prelecture
 * Body: { text: string, metadata?: object }
 * 
 * Realiza análisis completo unificado:
 * 1. Detección inteligente de necesidad de búsqueda web
 * 2. Enriquecimiento RAG (si aplica)
 * 3. Análisis académico con IA (4 fases)
 * 4. Estructuración para Pre-lectura + Análisis Crítico
 */
export async function analyzePreLecture(req, res) {
  const startTime = Date.now();
  let responseSent = false; // Flag para evitar doble respuesta
  
  // Aumentar timeout a 120 segundos
  req.setTimeout(120000);
  res.setTimeout(120000);
  
  try {
    const { text, metadata = {} } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length < 100) {
      return res.status(400).json({
        error: 'Texto inválido o muy corto (mínimo 100 caracteres)'
      });
    }

    console.log('📊 [PreLectura Controller] Iniciando análisis completo...');
    console.log(`   Longitud texto: ${text.length} caracteres`);

    // ============================================================
    // FASE 1: DETECCIÓN DE NECESIDAD DE BÚSQUEDA WEB
    // ============================================================
    const searchDecision = detectWebSearchNeed(text, metadata);
    console.log(`🔍 [PreLectura] Búsqueda web: ${searchDecision.needsWeb ? 'SÍ' : 'NO'} (${(searchDecision.confidence * 100).toFixed(1)}%)`);

    let webContext = null;
    let webEnriched = false;

    // ============================================================
    // FASE 2: ENRIQUECIMIENTO RAG (si es necesario)
    // ============================================================
    // TEMPORALMENTE DESHABILITADO hasta obtener API key válida de Tavily
    const ENABLE_WEB_SEARCH = false;
    
    if (ENABLE_WEB_SEARCH && searchDecision.needsWeb && process.env.TAVILY_API_KEY) {
      try {
        console.log('🌐 [PreLectura] Ejecutando búsquedas web...');
        webContext = await performWebSearch(text, searchDecision);
        webEnriched = true;
        console.log(`✅ [PreLectura] ${webContext.sources.length} fuentes obtenidas`);
      } catch (webError) {
        console.warn('⚠️ [PreLectura] Error en búsqueda web, continuando sin RAG:', webError.message);
      }
    } else {
      console.log('ℹ️ [PreLectura] Búsqueda web deshabilitada (análisis offline)');
    }

    // ============================================================
    // FASE 3: CONSTRUCCIÓN DE PROMPT UNIFICADO
    // ============================================================
    const prompt = buildUnifiedPrompt(text, webContext, webEnriched);
    console.log(`📝 [PreLectura] Prompt construido: ${prompt.length} caracteres`);

    // ============================================================
    // FASE 4: ANÁLISIS CON IA (DeepSeek)
    // ============================================================
    console.log('🤖 [PreLectura] Llamando a DeepSeek...');
    const aiResponse = await callDeepSeekAnalysis(prompt);
    
    // ============================================================
    // FASE 5: ESTRUCTURACIÓN FINAL
    // ============================================================
    console.log('🔧 [PreLectura] Iniciando estructuración final...');
    let analysis;
    try {
      analysis = await parseAndStructureAnalysis(aiResponse, webContext, webEnriched, startTime, text);
      console.log('✅ [PreLectura] Estructuración completada');
    } catch (parseError) {
      console.error('❌ [PreLectura] Error en parseAndStructureAnalysis:', parseError.message);
      console.error('❌ Stack:', parseError.stack);
      throw parseError;
    }
    
    console.log(`✅ [PreLectura] Análisis completo en ${Date.now() - startTime}ms`);
    
    if (!responseSent) {
      responseSent = true;
      res.json(analysis);
    }

  } catch (error) {
    console.error('❌ [PreLectura Controller] Error:', error);
    
    // Solo enviar respuesta si no se ha enviado ya
    if (!responseSent) {
      responseSent = true;
      // Análisis fallback básico
      res.status(500).json({
        error: 'Error en análisis',
        message: error.message,
        fallback: createFallbackAnalysis(req.body.text, Date.now() - startTime)
      });
    }
  }
}

/**
 * Detecta si el texto requiere búsqueda web
 */
function detectWebSearchNeed(text, metadata) {
  const indicators = {
    recent_dates: /202[3-5]|2024|2025/gi.test(text),
    statistics: /\d+%|\d+\.\d+%/g.test(text),
    locations: /(Ecuador|Colombia|Perú|Argentina|Chile)/gi.test(text),
    news_genre: metadata.genero_textual === 'noticia',
    current_events: /(crisis|reforma|elecciones|pandemia)/gi.test(text)
  };

  const score = Object.values(indicators).filter(Boolean).length / Object.keys(indicators).length;
  const needsWeb = score >= 0.4; // 40% threshold

  return {
    needsWeb,
    confidence: score,
    reasons: Object.entries(indicators).filter(([_, value]) => value).map(([key]) => key)
  };
}

/**
 * Ejecuta búsquedas web con Tavily
 */
async function performWebSearch(text, searchDecision) {
  const queries = generateSearchQueries(text, searchDecision.reasons);
  const searchPromises = queries.slice(0, 3).map(query => 
    searchTavily(query)
  );

  const results = await Promise.all(searchPromises);
  const allSources = results.flat();

  return {
    sources: allSources.slice(0, 8),
    key_findings: extractKeyFindings(allSources).slice(0, 5),
    categories: ['context', 'statistics', 'news']
  };
}

/**
 * Genera queries de búsqueda inteligentes
 */
function generateSearchQueries(text, reasons) {
  const queries = [];
  const textPreview = text.substring(0, 200);

  if (reasons.includes('recent_dates') || reasons.includes('current_events')) {
    queries.push(`${textPreview.split(' ').slice(0, 5).join(' ')} noticias 2024 2025`);
  }

  if (reasons.includes('statistics')) {
    queries.push(`${textPreview.split(' ').slice(0, 5).join(' ')} estadísticas datos oficiales`);
  }

  if (reasons.includes('locations')) {
    const match = text.match(/(Ecuador|Colombia|Perú|Argentina|Chile)/i);
    if (match) {
      queries.push(`${match[0]} contexto actual ${new Date().getFullYear()}`);
    }
  }

  return queries.length > 0 ? queries : [`${textPreview.split(' ').slice(0, 10).join(' ')}`];
}

/**
 * Busca en Tavily AI
 */
async function searchTavily(query) {
  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        query,
        search_depth: 'basic',
        max_results: 3
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          api_key: process.env.TAVILY_API_KEY
        },
        timeout: 10000
      }
    );

    return (response.data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.substring(0, 200) || '',
      score: r.score || 0.5
    }));
  } catch (error) {
    console.warn('⚠️ Tavily search failed:', error.message);
    return [];
  }
}

/**
 * Extrae hallazgos clave de las fuentes
 */
function extractKeyFindings(sources) {
  return sources
    .sort((a, b) => b.score - a.score)
    .map(s => s.snippet)
    .filter(Boolean);
}

/**
 * Construye el prompt unificado para IA
 */
function buildUnifiedPrompt(text, webContext, webEnriched) {
  let prompt = `Eres un experto en análisis de textos académicos con formación en pedagogía crítica y literacidad crítica. 
Analiza el siguiente texto siguiendo un modelo académico estructurado de 4 fases, enfocado en comprensión analítica, 
argumentación crítica y análisis ideológico-discursivo.

TEXTO A ANALIZAR:
${text}

`;

  if (webEnriched && webContext) {
    prompt += `
CONTEXTO WEB ACTUALIZADO (para enriquecer tu análisis):
${webContext.key_findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Fuentes: ${webContext.sources.map(s => s.url).join(', ')}

`;
  }

  prompt += `
Responde con este JSON exacto (sin markdown, sin \`\`\`json):
{
  "metadata": {
    "genero_textual": "tipo de texto (ensayo, artículo académico, noticia, etc.)",
    "proposito_comunicativo": "propósito principal (informar, persuadir, exponer, criticar, etc.)",
    "tipologia_textual": "tipología (narrativo, expositivo, argumentativo, etc.)",
    "autor": "autor si se menciona explícitamente o 'No identificado'",
    "audiencia_objetivo": "¿A quién se dirige este texto? (estudiantes, académicos, público general, especialistas, etc.) - INFIERE basándote en el registro y complejidad",
    "contexto_historico": "¿Hay referencias temporales, históricas o contextuales relevantes? Si el texto menciona épocas, fechas o contextos históricos, descríbelos brevemente. Si no, null."
  },
  "argumentation": {
    "tesis_central": "tesis principal que el autor defiende (cita textual si es posible)",
    "hipotesis_secundarias": ["hipótesis 1", "hipótesis 2"],
    "argumentos_principales": [
      {
        "argumento": "texto del argumento",
        "tipo": "metodológico|contextual|epistemológico|empírico|teórico",
        "solidez": "alta|media|baja",
        "evidencia": "¿Qué evidencia o fundamentos utiliza este argumento? (citas, datos, teorías, ejemplos)"
      }
    ],
    "tipo_argumentacion": "analítica-crítica|descriptiva|deductiva|inductiva|analógica",
    "tipo_razonamiento": "lógico-reflexivo|empírico|por autoridad|por analogía|dialéctico",
    "estructura_logica": {
      "premisas_principales": ["premisa 1", "premisa 2"],
      "conclusiones": ["conclusión 1", "conclusión 2"],
      "cadena_argumentativa": "Describe cómo se construye la cadena argumentativa: ¿cómo las premisas llevan a las conclusiones?"
    },
    "fortalezas_argumentativas": "¿Qué hace que los argumentos sean convincentes? (uso de evidencia, coherencia lógica, autoridad, etc.)",
    "limitaciones_o_fallos": "¿Qué limitaciones, debilidades o posibles fallos lógicos (falacias) tiene la argumentación? (sé objetivo, no evaluativo - solo identifica)"
  },
  "linguistics": {
    "tipo_estructura": "estructura del texto (cronológica, causa-efecto, problema-solución, comparación-contraste, deductiva, inductiva, etc.)",
    "registro_linguistico": "registro usado (formal académico, formal general, informal, técnico, etc.)",
    "nivel_complejidad": "básico|intermedio|avanzado",
    "coherencia_cohesion": "evaluación de la coherencia y cohesión textual (cómo se conectan las ideas)",
    "analisis_sintactico": {
      "tipo_oraciones": "¿Predominan oraciones simples, complejas o compuestas? ¿Hay uso extenso de subordinadas?",
      "longitud_promedio": "corto|medio|largo",
      "complejidad_sintactica": "simple|moderada|alta"
    },
    "conectores_discursivos": {
      "causales": ["ejemplos de conectores causales encontrados: porque, ya que, debido a, etc."],
      "concesivos": ["ejemplos: aunque, a pesar de, sin embargo, etc."],
      "temporales": ["ejemplos: después, mientras, durante, etc."],
      "comparativos": ["ejemplos: así como, de igual manera, por el contrario, etc."],
      "funcion": "¿Cómo funcionan estos conectores para construir el sentido del texto?"
    },
    "lexico_especializado": {
      "campo_semantico": "¿Qué campo semántico predomina? (político, científico, filosófico, literario, etc.)",
      "terminos_tecnicos": ["término 1", "término 2"],
      "densidad_conceptual": "baja|media|alta"
    },
    "tono_y_modalidad": {
      "tono": "objetivo|subjetivo|asertivo|dubitativo|crítico|neutro|exhortativo",
      "modalidad": "¿Qué tipo de actos de habla predominan? (afirmativos, interrogativos, imperativos, exhortativos)",
      "distancia_epistemica": "¿El autor muestra certeza o incertidumbre sobre sus afirmaciones? (seguro|moderado|cauto)"
    },
    "figuras_retoricas": [
      {"tipo": "metáfora", "ejemplo": "cita exacta del fragmento del texto original donde aparece esta metáfora"},
      {"tipo": "hipérbole", "ejemplo": "cita exacta del fragmento del texto original donde aparece esta hipérbole"},
      {"tipo": "personificación", "ejemplo": "cita exacta del fragmento del texto original donde aparece"}
    ]
  },
  "critical": {
    "resumen": "resumen conciso del contenido esencial (2-3 oraciones)",
    "temas_principales": ["tema 1", "tema 2", "tema 3"],
    "contexto_critico": "análisis crítico basado en literacidad crítica: identifica voces representadas, voces silenciadas, marco ideológico, relaciones de poder implícitas",
    "mcqQuestions": [
      {
        "nivel": 1,
        "tipo_bloom": "comprension",
        "pregunta": "Pregunta de comprensión literal específica del texto",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 0,
        "explicacion": "Explicación de por qué esta es la respuesta correcta con referencia al texto"
      },
      {
        "nivel": 2,
        "tipo_bloom": "analisis",
        "pregunta": "Pregunta de análisis inferencial",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 1,
        "explicacion": "Explicación con evidencia textual"
      },
      {
        "nivel": 3,
        "tipo_bloom": "evaluacion",
        "pregunta": "Pregunta de pensamiento crítico",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 2,
        "explicacion": "Explicación con análisis crítico"
      }
    ],
    "synthesisQuestions": [
      {
        "tipo": "sintesis_principal",
        "pregunta": "¿Cuál es la idea principal del texto y cómo la desarrolla el autor?",
        "guia": "Responde en 100-150 palabras. Identifica la tesis central y menciona 2-3 argumentos clave.",
        "palabras_objetivo": 150
      },
      {
        "tipo": "conexion_personal",
        "pregunta": "¿Cómo se relaciona este texto con tu experiencia o contexto actual?",
        "guia": "Responde en 100-150 palabras. Establece al menos una conexión específica con tu vida o entorno.",
        "palabras_objetivo": 150
      }
    ]
  }
}

INSTRUCCIONES CRÍTICAS:

**PARA "figuras_retoricas":**
- FORMATO OBLIGATORIO: Cada elemento DEBE ser un objeto con "tipo" y "ejemplo" (fragmento LITERAL del texto)
- NO uses formato de string simple como ["metáfora", "hipérbole"]
- Solo incluye figuras que REALMENTE existen en el texto

**PARA "audiencia_objetivo":**
- Infiere basándote en: registro lingüístico, complejidad, jerga especializada, tipo de conocimiento asumido
- Ejemplos: "estudiantes universitarios", "académicos especializados", "público general", "tomadores de decisiones"

**PARA "estructura_logica":**
- Identifica las premisas fundamentales que sostienen la argumentación
- Muestra cómo se conectan lógicamente para llegar a conclusiones
- Describe el flujo argumentativo (ej: "El autor parte de X, luego establece Y, por lo tanto concluye Z")

**PARA "limitaciones_o_fallos":**
- Sé objetivo y descriptivo, NO evaluativo
- Solo identifica posibles: generalizaciones apresuradas, falta de evidencia, argumentos circulares, falacias lógicas
- NO califiques ni juzgues, solo documenta lo observado

**PARA "tono_y_modalidad":**
- Analiza la actitud del autor: ¿es seguro de sus afirmaciones? ¿muestra dudas? ¿exhorta o solo informa?
- Identifica actos de habla: afirmaciones, preguntas, órdenes, exhortaciones

**PARA "contexto_critico":**
- Aplica principios de literacidad crítica: ¿qué voces están representadas? ¿cuáles ausentes?
- ¿Qué relaciones de poder se reproducen en el discurso?
- ¿Qué marco ideológico subyacente se puede identificar?

**PARA "mcqQuestions":**
- Genera EXACTAMENTE 5 preguntas de opción múltiple basadas EN ESTE TEXTO ESPECÍFICO
- Distribución de niveles Bloom:
  * Nivel 1 (2 preguntas): Comprensión literal (recordar hechos, identificar ideas explícitas)
  * Nivel 2 (2 preguntas): Análisis inferencial (interpretar, relacionar conceptos)
  * Nivel 3 (1 pregunta): Pensamiento crítico (evaluar argumentos, identificar sesgos)
- Cada pregunta DEBE:
  * Ser específica al contenido del texto (NO genérica)
  * Tener 4 opciones de respuesta (A, B, C, D)
  * Indicar respuesta_correcta como índice (0=A, 1=B, 2=C, 3=D)
  * Incluir "explicacion" con evidencia textual de por qué es correcta
- Las opciones distractoras deben ser plausibles pero incorrectas

**PARA "synthesisQuestions":**
- Genera EXACTAMENTE 2 preguntas de síntesis cortas (100-150 palabras)
- Pregunta 1: "sintesis_principal" → Identificar tesis central y argumentos clave
- Pregunta 2: "conexion_personal" → Relacionar con experiencia o contexto del estudiante
- Cada pregunta debe incluir:
  * Pregunta clara y específica al texto
  * "guia" con instrucciones de qué incluir en la respuesta
  * "palabras_objetivo": 150

IMPORTANTE: Todas las preguntas deben estar fundamentadas en evidencia textual. Si algo no está en el texto, no lo inventes.`;

  return prompt;
}

/**
 * Llama a DeepSeek para análisis
 */
async function callDeepSeekAnalysis(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY no configurada');
  }

  const response = await axios.post(
    `${baseURL}/chat/completions`,
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en análisis académico de textos. Respondes SOLO con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120 segundos (textos largos requieren más tiempo)
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Detecta Y extrae figuras retóricas con ejemplos usando OpenAI
 * OpenAI hace TODO: detectar figuras + extraer fragmentos del texto
 */
async function detectAndExtractFigurasRetoricas(textoOriginal) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    console.log('⚠️ [OpenAI] API Key no configurada, saltando figuras retóricas...');
    return [];
  }

  console.log(`🎨 [OpenAI] Detectando y extrayendo figuras retóricas del texto...`);
  console.log(`🔍 [DEBUG] Longitud del texto: ${textoOriginal.length} caracteres`);
  console.log(`🔍 [DEBUG] API Key configurada: ${apiKey ? 'SÍ' : 'NO'}`);

  try {
    // Detectar tipo de texto para ajustar la búsqueda
    const textoPreview = textoOriginal.substring(0, 1000).toLowerCase();
    const esLiterario = /(poesía|poema|verso|verso|narrativa|cuento|novela|literario)/i.test(textoOriginal) ||
                       /(metáfora|símil|comparación|figura)/i.test(textoOriginal) ||
                       textoOriginal.split(/\n/).length > 30; // Muchas líneas = posiblemente poético
    
    const esAcademico = /(estudio|investigación|análisis|teoría|metodología|hipótesis|conclusión|referencias|bibliografía)/i.test(textoOriginal) ||
                       textoOriginal.length > 2000; // Textos largos suelen ser académicos
    
    const esArgumentativo = /(por tanto|sin embargo|no obstante|además|porque|debido a|por lo tanto)/i.test(textoOriginal);

    const prompt = `Eres un experto en retórica y análisis literario con formación universitaria en lingüística y literatura.
Tu tarea es identificar EXCLUSIVAMENTE las figuras retóricas que REALMENTE están presentes en el texto.

═══════════════════════════════════════════════════════════════
TEXTO A ANALIZAR:
═══════════════════════════════════════════════════════════════
${textoOriginal.substring(0, 4000)}
═══════════════════════════════════════════════════════════════

🎯 CONTEXTO DEL TEXTO:
- Tipo detectado: ${esLiterario ? 'Probablemente literario/poético' : esAcademico ? 'Probablemente académico/expositivo' : esArgumentativo ? 'Probablemente argumentativo/periodístico' : 'Indeterminado'}
- ${esAcademico ? '⚠️ IMPORTANTE: Los textos académicos raramente tienen figuras retóricas. Solo identifica figuras si son OBVIAS e INEQUÍVOCAS.' : ''}
- ${esLiterario ? '✅ Los textos literarios pueden tener más figuras retóricas. Busca con cuidado pero sin forzar.' : ''}

🚫 CRÍTICO: LO QUE NO ES UNA FIGURA RETÓRICA (NO INCLUIR):
1. **Expresiones comunes/cotidianas** → "estar en las nubes" (no es metáfora, es frase hecha)
2. **Comparaciones literales** → "es grande como una casa" (si es literal, NO es símil retórico)
3. **Datos numéricos** → "mil personas" (aunque sea número alto, NO es hipérbole si es real)
4. **Hechos objetivos** → "el agua moja" (NO es personificación si es realidad física)
5. **Adjetivos normales** → "casa grande" (NO es epíteto, es solo descripción)
6. **Frases coloquiales** → "me muero de risa" (aunque suene exagerado, NO es hipérbole si es expresión común)
7. **Expresiones técnicas** → "el sistema operativo" (NO es metonimia si es término técnico correcto)
8. **Comparaciones explícitas con "como" que son descriptivas** → "blanco como el papel" (si solo describe color, NO es símil retórico)

✅ SOLO INCLUIR FIGURAS RETÓRICAS CUANDO:
- Hay un uso INTENCIONAL y ARTÍSTICO del lenguaje
- La figura añade SIGNIFICADO o ÉNFASIS más allá de lo literal
- Es evidente que el autor usa recursos literarios conscientemente
- El ejemplo es CLARAMENTE retórico y no solo descriptivo/informativo

🎯 ESTRATEGIA DE BÚSQUEDA PRECISA:
1. Lee el texto COMPLETO prestando atención al REGISTRO (académico vs literario)
2. ${esAcademico ? 'Sé MUY CONSERVADOR: los textos académicos casi nunca tienen figuras retóricas reales.' : 'Busca figuras retóricas si el texto es literario/poético.'}
3. Identifica SOLO figuras OBVIAS e INEQUÍVOCAS
4. NO fuerces encontrar figuras - es mejor tener 0 figuras que 1 falsa
5. Si dudas si algo es una figura retórica o solo lenguaje descriptivo normal → NO LA INCLUYAS
6. Verifica que el ejemplo sea REALMENTE retórico y no solo una descripción común

📚 TIPOS DE FIGURAS (busca cada uno específicamente):

**COMPARACIONES Y METÁFORAS:**
- **Metáfora**: Identificación directa SIN "como/parece" → "tus ojos son luceros", "el tiempo es oro"
- **Comparación/Símil**: Usa "como", "parece", "cual", "semejante" → "blanco como nieve", "parece un ángel"

**PERSONIFICACIÓN Y HUMANIZACIÓN:**
- **Personificación**: Lo no-humano con acciones humanas → "la luna sonríe", "el viento canta", "la muerte llama"
- **Prosopopeya**: Dar voz a lo inanimado → "la piedra habla", "el silencio grita"

**REPETICIONES (busca patrones):**
- **Anáfora**: MISMA palabra/frase al INICIO → "Cada día... Cada noche... Cada hora"
- **Epífora**: MISMA palabra/frase al FINAL → "...sin ti. ...sin ti. ...sin ti"
- **Aliteración**: Repetir sonidos consonantes → "el ruido con que rueda la ronca tempestad"
- **Polisíndeton**: Repetir conjunciones → "y canta y ríe y llora y baila"
- **Asíndeton**: Omitir conjunciones → "vine, vi, vencí"

**EXAGERACIONES Y CONTRADICCIONES:**
- **Hipérbole**: Exageración evidente → "te llamé mil veces", "me muero de hambre", "llorar ríos"
- **Paradoja**: Contradicción con sentido → "vivo sin vivir", "silencio estruendoso"
- **Antítesis**: Contraste de opuestos → "fuego y hielo", "luz y oscuridad", "amor y odio"
- **Oxímoron**: Opuestos juntos → "dulce tormento", "brillante oscuridad"

**TRANSFERENCIAS DE SIGNIFICADO:**
- **Metonimia**: Nombrar por relación → "leer a Cervantes" (sus obras), "la Corona" (el rey)
- **Sinécdoque**: Parte por todo → "tiene 20 primaveras" (años), "pan" (comida en general)
- **Sinestesia**: Mezclar sentidos → "color chillón", "sabor áspero", "voz dulce", "fragancia suave"

**ADORNOS Y ÉNFASIS:**
- **Epíteto**: Adjetivo que resalta lo obvio → "blanca nieve", "verde prado", "fría nieve"
- **Hipérbaton**: Alterar orden normal → "del salón en el ángulo oscuro" (en vez de "en el ángulo oscuro del salón")

🔍 INSTRUCCIONES DE EXTRACCIÓN:
- Copia el fragmento EXACTO del texto (mínimo 4-6 palabras de contexto)
- Proporciona los índices de inicio (start) y fin (end) del fragmento en el texto original
- Asigna un nivel de confianza (confidence) de 0 a 1 según tu certeza
- NO inventes ni modifiques nada
- Si UNA FRASE tiene MÚLTIPLES figuras diferentes, identifícalas TODAS por separado
- Busca PRIMERO una de cada tipo antes de repetir el mismo tipo

📋 FORMATO DE SALIDA (JSON válido sin markdown, sin \`\`\`):
{
  "figuras_retoricas": [
    {
      "tipo": "metáfora",
      "ejemplo": "texto literal exacto aquí",
      "start": 145,
      "end": 168,
      "confidence": 0.95,
      "justificacion": "breve explicación de por qué es esta figura (máx 1 línea)"
    },
    {
      "tipo": "personificación",
      "ejemplo": "otro texto literal",
      "start": 280,
      "end": 310,
      "confidence": 0.88,
      "justificacion": "razón breve"
    }
  ]
}

NOTAS SOBRE CAMPOS:
- start/end: índices de caracteres en el texto original (cuenta desde 0)
- confidence: 0.0-1.0 (0.9+ = muy seguro, 0.7-0.9 = seguro, <0.7 = dudoso)
- justificacion: 1 línea máximo explicando por qué identificaste esta figura

🎯 OBJETIVO: Identifica SOLO las figuras retóricas que REALMENTE están presentes en el texto.
- Si el texto es académico/expositivo, es normal que tenga pocas o ninguna figura retórica
- Si el texto es literario/poético, entonces busca más exhaustivamente
- NO inventes figuras para cumplir una cuota. La calidad > cantidad.
- Si no encuentras figuras retóricas CON CONFIDENCE >= 0.7, retorna un array vacío []
- Prioriza figuras con alta confidence (>0.85) sobre cantidad`;

    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Eres un profesor universitario especializado en retórica clásica y análisis estilístico con maestría en lingüística.

MISIÓN CRÍTICA: Identificar SOLO las figuras retóricas que REALMENTE existen en el texto.

REGLAS DE ORO:
1. PRECISIÓN > CANTIDAD: Es mejor 0 figuras que 1 falsa
2. NO inventes figuras - Si dudas, NO la incluyas
3. Los textos académicos/expositivos RARAMENTE tienen figuras retóricas reales
4. Las expresiones comunes/cotidianas NO son figuras retóricas
5. Las comparaciones literales/descriptivas NO son símiles retóricos
6. Copia fragmentos LITERALES del texto original, sin modificaciones
7. Si el texto es académico y no encuentras figuras OBVIAS → retorna []
8. La validación posterior eliminará falsos positivos - sé conservador

FALSOS POSITIVOS COMUNES A EVITAR:
- Frases hechas/cotidianas ("estar en las nubes", "me muero de risa")
- Descripciones literales ("grande como una casa" si es literal)
- Datos numéricos objetivos (aunque sean altos)
- Términos técnicos correctos
- Adjetivos descriptivos normales
- Comparaciones que solo describen (no añaden significado artístico)

Si no encuentras figuras retóricas REALES e INEQUÍVOCAS, retorna un array vacío [].`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Baja temperatura para mayor precisión y evitar inventar figuras
        max_tokens: 3500 // Aumentado para permitir lista más larga de figuras
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 40000
      }
    );

    let content = response.data.choices[0].message.content.trim();
    console.log('🔍 [DEBUG] Respuesta de OpenAI recibida, longitud:', content.length);
    
    // Limpiar markdown si existe
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }
    if (content.startsWith('```')) {
      content = content.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    const result = JSON.parse(content);
    const figuras = result.figuras_retoricas || [];
    
    console.log(`✅ [OpenAI] Detectadas ${figuras.length} figuras retóricas inicialmente`);
    
    // 🔍 VALIDACIÓN POST-DETECCIÓN: Verificar que los ejemplos existen en el texto
    const figurasValidadas = validateRhetoricalFigures(figuras, textoOriginal);
    
    console.log(`✅ [Validación] ${figurasValidadas.length} figuras validadas (${figuras.length - figurasValidadas.length} eliminadas por no existir en el texto)`);
    
    // Log de muestra para verificar
    if (figurasValidadas.length > 0) {
      console.log(`   Ejemplo válido: ${figurasValidadas[0].tipo} → "${figurasValidadas[0].ejemplo.substring(0, 50)}..."`);
    }
    
    return figurasValidadas;

  } catch (error) {
    console.error('❌ [OpenAI] Error detectando figuras retóricas:', error.message);
    if (error.response?.data) {
      console.error('   Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    // Fallback: array vacío
    return [];
  }
}

/**
 * Normaliza texto para comparación (elimina puntuación, espacios múltiples, lowercase)
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,;:!?¡¿()\[\]{}""''—–\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida que las figuras retóricas detectadas realmente existan en el texto original
 * VERSIÓN PERMISIVA: Acepta figuras legítimas sin filtros excesivos
 * @param {Array} figuras - Array de figuras con {tipo, ejemplo, start?, end?, confidence?}
 * @param {string} textoOriginal - Texto completo original
 * @returns {Array} Figuras validadas
 */
function validateRhetoricalFigures(figuras, textoOriginal) {
  if (!figuras || figuras.length === 0) {
    return [];
  }

  const textoNorm = normalizeText(textoOriginal);
  const validated = [];

  for (const figura of figuras) {
    if (!figura.tipo) {
      console.log(`⚠️ [Validación] Figura sin tipo, descartada`);
      continue;
    }

    const ejemplo = (figura.ejemplo || '').trim();
    
    // Si no tiene ejemplo pero tiene alta confianza, aceptar
    if (!ejemplo) {
      const confidence = figura.confidence || 0;
      if (confidence >= 0.85) {
        validated.push(figura);
        console.log(`✅ [Validación] Figura sin ejemplo aceptada por alta confianza: ${figura.tipo} (${(confidence * 100).toFixed(0)}%)`);
      } else {
        console.log(`⚠️ [Validación] Figura sin ejemplo y baja confianza descartada: ${figura.tipo}`);
      }
      continue;
    }

    // OPCIÓN 1: Si tiene offsets (start/end), validar directamente
    let validatedByOffset = false;
    if (typeof figura.start === 'number' && typeof figura.end === 'number') {
      try {
        const fragmento = textoOriginal.slice(figura.start, figura.end);
        const fragmentoNorm = normalizeText(fragmento);
        const ejemploNorm = normalizeText(ejemplo);
        
        if (fragmentoNorm.includes(ejemploNorm) || ejemploNorm.includes(fragmentoNorm)) {
          validated.push(figura);
          console.log(`✅ [Validación] Figura válida por offsets: ${figura.tipo} [${figura.start}-${figura.end}]`);
          validatedByOffset = true;
        }
      } catch (err) {
        console.log(`⚠️ [Validación] Error con offsets en figura: ${figura.tipo}, intentando otros métodos`);
      }
    }
    
    // Si ya se validó por offset, continuar con la siguiente figura
    if (validatedByOffset) continue;

    // OPCIÓN 2: Búsqueda exacta normalizada (sin offsets)
    const ejemploNorm = normalizeText(ejemplo);
    if (textoNorm.includes(ejemploNorm)) {
      validated.push(figura);
      console.log(`✅ [Validación] Figura válida por coincidencia exacta: ${figura.tipo} → "${ejemplo.substring(0, 40)}..."`);
      continue;
    }

    // OPCIÓN 3: Fuzzy matching PERMISIVO (para casos con variaciones)
    const palabrasEjemplo = ejemploNorm.split(/\s+/).filter(p => p.length > 2);
    if (palabrasEjemplo.length === 0) {
      console.log(`⚠️ [Validación] Ejemplo sin palabras válidas: "${ejemplo}", descartado`);
      continue;
    }

    const palabrasEncontradas = palabrasEjemplo.filter(palabra => 
      textoNorm.includes(palabra)
    );
    const ratio = palabrasEncontradas.length / palabrasEjemplo.length;

    // Threshold reducido de 85% a 60% para ser más permisivo
    if (ratio >= 0.6) {
      validated.push(figura);
      console.log(`✅ [Validación] Figura válida por fuzzy match: ${figura.tipo} (${(ratio * 100).toFixed(0)}% palabras coinciden)`);
      continue;
    }

    // Si llegamos aquí, la figura no pasó ninguna validación
    console.log(`⚠️ [Validación] Figura descartada: ${figura.tipo} (ratio: ${(ratio * 100).toFixed(0)}%) → "${ejemplo.substring(0, 40)}..."`);
  }

  console.log(`📊 [Validación] Resultado: ${validated.length}/${figuras.length} figuras validadas`);
  return validated;
}

/**
 * Parsea y estructura el análisis
 */
async function parseAndStructureAnalysis(aiResponse, webContext, webEnriched, startTime, textoOriginal) {
  console.log('🔧 [parseAndStructureAnalysis] INICIANDO...');
  console.log('🔧 [DEBUG] textoOriginal length:', textoOriginal?.length || 'undefined');
  
  // Limpiar respuesta (remover markdown si existe)
  let cleaned = aiResponse.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  }

  const parsed = JSON.parse(cleaned);

  // ============================================================
  // DETECCIÓN Y EXTRACCIÓN COMPLETA DE FIGURAS RETÓRICAS CON OPENAI
  // OpenAI hace TODO: detectar + extraer fragmentos del texto original
  // ============================================================
  let linguisticsEnriched = parsed.linguistics || {};
  
  // Reemplazar completamente las figuras retóricas con detección de OpenAI
  console.log('🎨 [Figuras Retóricas] Detectando y extrayendo con OpenAI...');
  const figurasConEjemplos = await detectAndExtractFigurasRetoricas(textoOriginal);
  
  console.log('🔍 [DEBUG] Resultado de OpenAI:', JSON.stringify(figurasConEjemplos, null, 2));
  
  if (figurasConEjemplos && figurasConEjemplos.length > 0) {
    linguisticsEnriched.figuras_retoricas = figurasConEjemplos;
    console.log(`✅ [Figuras Retóricas] ${figurasConEjemplos.length} figuras detectadas y extraídas correctamente`);
  } else {
    // Si OpenAI falla o no encuentra, mantener lo que DeepSeek detectó (si existe)
    console.log('⚠️ [Figuras Retóricas] OpenAI no detectó figuras, manteniendo resultado de DeepSeek');
    console.log('🔍 [DEBUG] Figuras de DeepSeek:', linguisticsEnriched.figuras_retoricas);
    if (!linguisticsEnriched.figuras_retoricas) {
      linguisticsEnriched.figuras_retoricas = [];
    }
  }

  // 🆕 Extraer y estructurar critical con MCQ y Synthesis Questions
  const criticalData = parsed.critical || {};
  
  // Validar y estructurar mcqQuestions
  if (!criticalData.mcqQuestions || !Array.isArray(criticalData.mcqQuestions)) {
    console.log('⚠️ [parseAndStructureAnalysis] mcqQuestions no encontrado, inicializando como []');
    criticalData.mcqQuestions = [];
  } else {
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.mcqQuestions.length} preguntas MCQ encontradas`);
    // Validar estructura de cada MCQ
    criticalData.mcqQuestions = criticalData.mcqQuestions.map((q, idx) => {
      if (!q || typeof q !== 'object' || !Array.isArray(q.opciones) || q.opciones.length !== 4) {
        console.warn(`⚠️ [parseAndStructureAnalysis] MCQ ${idx} inválida, omitiendo`);
        return null;
      }
      return {
        nivel: q.nivel || 1,
        tipo_bloom: q.tipo_bloom || 'comprension',
        pregunta: q.pregunta || '',
        opciones: q.opciones,
        respuesta_correcta: typeof q.respuesta_correcta === 'number' ? q.respuesta_correcta : 0,
        explicacion: q.explicacion || ''
      };
    }).filter(q => q !== null);
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.mcqQuestions.length} MCQ validadas`);
  }
  
  // Validar y estructurar synthesisQuestions
  if (!criticalData.synthesisQuestions || !Array.isArray(criticalData.synthesisQuestions)) {
    console.log('⚠️ [parseAndStructureAnalysis] synthesisQuestions no encontrado, inicializando como []');
    criticalData.synthesisQuestions = [];
  } else {
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.synthesisQuestions.length} preguntas de síntesis encontradas`);
    // Validar estructura de cada pregunta de síntesis
    criticalData.synthesisQuestions = criticalData.synthesisQuestions.map((q, idx) => {
      if (!q || typeof q !== 'object') {
        console.warn(`⚠️ [parseAndStructureAnalysis] Pregunta síntesis ${idx} inválida, omitiendo`);
        return null;
      }
      return {
        tipo: q.tipo || 'sintesis',
        pregunta: q.pregunta || '',
        guia: q.guia || '',
        palabras_objetivo: q.palabras_objetivo || 150
      };
    }).filter(q => q !== null);
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.synthesisQuestions.length} preguntas síntesis validadas`);
  }

  return {
    prelecture: {
      metadata: parsed.metadata || {},
      argumentation: parsed.argumentation || {},
      linguistics: linguisticsEnriched,
      web_sources: webEnriched && webContext ? webContext.sources : [],
      web_summary: webEnriched && webContext ? webContext.key_findings : []
    },
    critical: criticalData,
    metadata: {
      document_id: `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      analysis_timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      web_enriched: webEnriched,
      web_sources_count: webEnriched && webContext ? webContext.sources.length : 0,
      provider: 'deepseek',
      version: '3.0-rag-backend'
    }
  };
}

/**
 * Crea análisis fallback en caso de error
 */
function createFallbackAnalysis(text, processingTime) {
  return {
    prelecture: {
      metadata: {
        genero_textual: 'No identificado',
        proposito_comunicativo: 'No determinado',
        tipologia_textual: 'No identificado',
        autor: 'No identificado'
      },
      argumentation: {
        tesis_central: 'No disponible (error en análisis)',
        hipotesis_secundarias: [],
        argumentos_principales: [],
        tipo_argumentacion: 'No identificado',
        tipo_razonamiento: 'No identificado'
      },
      linguistics: {
        tipo_estructura: 'No identificado',
        registro_linguistico: 'No identificado',
        nivel_complejidad: 'intermedio',
        coherencia_cohesion: 'No evaluado',
        figuras_retoricas: []
      },
      web_sources: [],
      web_summary: []
    },
    critical: {
      resumen: 'Análisis no disponible temporalmente',
      temas_principales: [],
      contexto_critico: 'Error en procesamiento'
    },
    metadata: {
      document_id: `doc_fallback_${Date.now()}`,
      analysis_timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      web_enriched: false,
      web_sources_count: 0,
      provider: 'fallback',
      version: '3.0-fallback'
    }
  };
}
