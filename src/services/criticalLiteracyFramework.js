/**
 * Marco Teórico de Literacidad Crítica
 * Sistema integral para análisis crítico de textos basado en pedagogía transformadora
 */

// I. LECTURA "SOBRE LAS LÍNEAS" - Contenido Explícito
const LECTURA_LITERAL = {
  dimensiones: [
    {
      id: 'idea_principal',
      pregunta_base: '¿Cuál es la idea principal o fuerza del texto en su conjunto?',
      variaciones: [
        '¿Cuál es el mensaje central que busca transmitir este texto sobre {tema}?',
        '¿Qué tesis o argumento principal defiende el autor respecto a {contexto}?'
      ]
    },
    {
      id: 'ideas_secundarias',
      pregunta_base: '¿Cuáles son las ideas secundarias?',
      variaciones: [
        '¿Qué argumentos de apoyo utiliza el autor para sostener su posición sobre {tema}?',
        '¿Cuáles son los subtemas o aspectos específicos que desarrolla?'
      ]
    },
    {
      id: 'informacion_explicita',
      pregunta_base: '¿Qué conocimientos o información se presentan de manera explícita?',
      variaciones: [
        '¿Qué datos, cifras o evidencias concretas presenta el texto sobre {tema}?',
        '¿Qué hechos específicos se mencionan y cómo se relacionan entre sí?'
      ]
    },
    {
      id: 'lenguaje_clave',
      pregunta_base: '¿Qué palabras o frases clave se utilizan y cuál es su significado literal?',
      variaciones: [
        '¿Qué términos específicos sobre {tema} utiliza el autor y cómo los define?',
        '¿Qué conceptos centrales aparecen repetidamente y por qué son importantes?'
      ]
    }
  ]
};

// II. LECTURA "ENTRE LÍNEAS" - Interpretación e Inferencias
const LECTURA_INFERENCIAL = {
  dimensiones: [
    {
      id: 'inferencias_implicitas',
      pregunta_base: '¿Qué se puede deducir o inferir del texto que no se dice explícitamente?',
      variaciones: [
        '¿Qué asume el autor que ya sabemos sobre {tema} sin decirlo directamente?',
        '¿Qué consecuencias o implicaciones se derivan de lo planteado sobre {contexto}?'
      ]
    },
    {
      id: 'presuposiciones_ironias',
      pregunta_base: '¿Qué presuposiciones, ironías o dobles sentidos se identifican?',
      variaciones: [
        '¿Qué dice el autor "entre líneas" sobre {tema} que no expresa abiertamente?',
        '¿Hay contradicciones o tensiones no resueltas en el planteamiento?'
      ]
    },
    {
      id: 'conexion_experiencias',
      pregunta_base: '¿Cómo se relaciona con mis experiencias personales y conocimientos previos?',
      variaciones: [
        '¿Cómo mi experiencia como {identidad} me ayuda a entender este texto sobre {tema}?',
        '¿Qué elementos resuenan o contrastan con mi propia vivencia de {contexto}?'
      ]
    },
    {
      id: 'estructura_genero',
      pregunta_base: '¿Cómo influye la estructura del género textual en la presentación de ideas?',
      variaciones: [
        '¿Cómo el hecho de ser un {genero_textual} afecta la manera de presentar {tema}?',
        '¿Qué convenciones del género utiliza o rompe el autor para transmitir su mensaje?'
      ]
    }
  ]
};

// III. LECTURA "TRAS LAS LÍNEAS" - Contexto, Ideología e Intencionalidad
const LECTURA_CRITICA = {
  dimensiones: [
    {
      id: 'autor_audiencia',
      pregunta_base: '¿Quién escribe y lee el texto?',
      variaciones: [
        '¿Desde qué posición social, cultural y económica escribe el autor sobre {tema}?',
        '¿A qué audiencia específica se dirige y cómo esto influye en el mensaje?',
        '¿Qué autoridad o credibilidad tiene el autor para hablar de {contexto}?'
      ]
    },
    {
      id: 'intencionalidad_proposito',
      pregunta_base: '¿Cuál es la intencionalidad o el propósito del autor?',
      variaciones: [
        '¿Qué busca lograr el autor al escribir sobre {tema} de esta manera?',
        '¿A quién beneficia este discurso sobre {contexto} y por qué?'
      ]
    },
    {
      id: 'voces_silenciadas',
      pregunta_base: '¿Qué voces están incorporadas o silenciadas en el texto?',
      variaciones: [
        '¿Qué perspectivas sobre {tema} están ausentes en este texto y por qué?',
        '¿Cómo podrían responder a este texto las comunidades directamente afectadas por {contexto}?',
        '¿Qué grupos sociales no tienen voz en esta discusión sobre {tema}?'
      ]
    },
    {
      id: 'valores_ideologias',
      pregunta_base: '¿Qué valores, actitudes, opiniones e ideologías subyacen en el texto?',
      variaciones: [
        '¿Qué sistema de creencias sobre {tema} presenta el autor como "natural" o incuestionable?',
        '¿Cómo refleja este texto las ideologías dominantes sobre {contexto}?',
        '¿Qué sesgos culturales, de género, raza o clase se manifiestan en el tratamiento de {tema}?'
      ]
    },
    {
      id: 'posicionamiento_lector',
      pregunta_base: '¿Cómo posiciona el texto al lector?',
      variaciones: [
        '¿Qué tipo de lector asume el autor que eres cuando habla de {tema}?',
        '¿Cómo te invita a pensar y sentir sobre {contexto}?'
      ]
    },
    {
      id: 'inclusion_exclusion',
      pregunta_base: '¿Qué información se incluye y cuál se excluye? ¿Por qué?',
      variaciones: [
        '¿Qué aspectos de {tema} se omiten deliberadamente y qué intereses sirve esta omisión?',
        '¿Qué consecuencias tiene presentar {contexto} desde esta perspectiva limitada?'
      ]
    },
    {
      id: 'contexto_sociocultural',
      pregunta_base: '¿Cuál es el contexto sociocultural, histórico e ideológico de creación?',
      variaciones: [
        '¿Cómo influye el momento histórico en que se escribió este texto sobre {tema}?',
        '¿Qué condiciones sociales y políticas rodean la producción de este discurso sobre {contexto}?'
      ]
    },
    {
      id: 'relaciones_poder',
      pregunta_base: '¿Cómo se manifiestan las relaciones de poder en el discurso?',
      variaciones: [
        '¿Cómo se construye y mantiene el poder a través de este discurso sobre {tema}?',
        '¿Qué jerarquías sociales se refuerzan o desafían en el tratamiento de {contexto}?'
      ]
    }
  ]
};

// IV. EVALUACIÓN Y VERIFICACIÓN DE LA INFORMACIÓN
const EVALUACION_CRITICA = {
  dimensiones: [
    {
      id: 'naturaleza_informacion',
      pregunta_base: '¿Cuál es la naturaleza de la información (hecho u opinión)?',
      variaciones: [
        '¿Qué partes del texto sobre {tema} presentan hechos verificables y cuáles opiniones?',
        '¿Cómo distinguir entre evidencia objetiva y interpretación subjetiva en {contexto}?'
      ]
    },
    {
      id: 'veracidad_fiabilidad',
      pregunta_base: '¿Es veraz y fiable la información presentada?',
      variaciones: [
        '¿Qué evidencias respaldan las afirmaciones sobre {tema}?',
        '¿Cuáles son las fuentes de información y qué credibilidad tienen?'
      ]
    },
    {
      id: 'calidad_argumentativa',
      pregunta_base: '¿Cuál es la calidad argumentativa del texto?',
      variaciones: [
        '¿Los argumentos sobre {tema} siguen una lógica coherente?',
        '¿Qué falacias o debilidades argumentativas identificas en el tratamiento de {contexto}?'
      ]
    },
    {
      id: 'contraste_fuentes',
      pregunta_base: '¿Cómo contrastar esta información con otras fuentes y enfoques?',
      variaciones: [
        '¿Qué otras fuentes sobre {tema} podrían ofrecer perspectivas diferentes?',
        '¿Cómo buscarías información alternativa sobre {contexto} de comunidades marginalizadas?'
      ]
    }
  ]
};

// V. ACCIÓN Y TRANSFORMACIÓN SOCIAL - Praxis Crítica
const PRAXIS_TRANSFORMADORA = {
  dimensiones: [
    {
      id: 'materializacion_analisis',
      pregunta_base: '¿Cómo materializar los resultados del análisis en acciones concretas?',
      variaciones: [
        '¿Qué acciones específicas podrías tomar para abordar los problemas sobre {tema} identificados en el texto?',
        '¿Cómo tu análisis de {contexto} se traduce en compromiso social real?'
      ]
    },
    {
      id: 'soluciones_creativas',
      pregunta_base: '¿Qué soluciones creativas propones para los problemas sociales planteados?',
      variaciones: [
        '¿Cómo podrías contribuir a resolver los conflictos sobre {tema} desde tu posición?',
        '¿Qué alternativas innovadoras propones para transformar {contexto}?'
      ]
    },
    {
      id: 'ideario_politico',
      pregunta_base: '¿Cómo configura este análisis un ideario político y cultural más justo?',
      variaciones: [
        '¿Cómo este texto sobre {tema} fortalece o desafía tus valores de justicia social?',
        '¿Qué principios éticos extraes para tu participación ciudadana en {contexto}?'
      ]
    },
    {
      id: 'impacto_areas_vida',
      pregunta_base: '¿Cómo impacta el conocimiento adquirido en otras áreas de tu vida?',
      variaciones: [
        '¿Cómo aplicarás este entendimiento sobre {tema} en tu vida profesional y personal?',
        '¿De qué manera este análisis transforma tu forma de relacionarte con {contexto}?'
      ]
    },
    {
      id: 'participacion_democratica',
      pregunta_base: '¿Cómo participar activamente promoviendo cambios democráticos?',
      variaciones: [
        '¿Qué espacios democráticos puedes utilizar para abordar {tema}?',
        '¿Cómo podrías organizar o apoyar iniciativas comunitarias relacionadas con {contexto}?'
      ]
    },
    {
      id: 'solidaridad_alteridad',
      pregunta_base: '¿Cómo contribuir a la colectividad desde la alteridad y empatía?',
      variaciones: [
        '¿Cómo puedes aliarte con quienes más sufren las consecuencias de {tema}?',
        '¿De qué manera tu privilegio puede servir para amplificar voces silenciadas sobre {contexto}?'
      ]
    },
    {
      id: 'autocritica_dialectica',
      pregunta_base: '¿Cómo examinar tus propios procesos de manera dialéctica?',
      variaciones: [
        '¿Qué sesgos propios descubres al analizar {tema} y cómo los enfrentas?',
        '¿Cómo tu posición social influye en tu interpretación de {contexto}?'
      ]
    }
  ]
};

// VI. LITERACIDAD DIGITAL Y IA
const LITERACIDAD_DIGITAL = {
  dimensiones: [
    {
      id: 'lectura_digital',
      pregunta_base: '¿Cómo se diferencia la lectura en internet?',
      variaciones: [
        '¿Cómo el formato digital influye en tu comprensión de {tema}?',
        '¿Qué elementos del diseño web afectan tu interpretación de {contexto}?'
      ]
    },
    {
      id: 'poder_digital',
      pregunta_base: '¿Cómo investigar las relaciones de poder en textos digitales?',
      variaciones: [
        '¿Quién controla la plataforma donde aparece este contenido sobre {tema}?',
        '¿Cómo los algoritmos influyen en qué ves sobre {contexto}?'
      ]
    },
    {
      id: 'rediseno_digital',
      pregunta_base: '¿Cómo rediseñar producciones digitales para otros intereses?',
      variaciones: [
        '¿Cómo crearías contenido alternativo sobre {tema} que incluya voces marginalizadas?',
        '¿Qué plataformas digitales podrías usar para democratizar información sobre {contexto}?'
      ]
    },
    {
      id: 'sesgos_algoritmicos',
      pregunta_base: '¿Qué sesgos algorítmicos identificas y cuáles son sus consecuencias?',
      variaciones: [
        '¿Cómo los algoritmos de búsqueda pueden sesgar información sobre {tema}?',
        '¿Qué grupos se ven perjudicados por los sesgos en sistemas de IA relacionados con {contexto}?'
      ]
    },
    {
      id: 'evaluacion_ia',
      pregunta_base: '¿Cómo evaluar críticamente las respuestas de IA?',
      variaciones: [
        '¿Qué limitaciones tiene la IA para analizar {tema} desde perspectivas marginalizadas?',
        '¿Cómo verificar que la información de IA sobre {contexto} no reproduce sesgos dominantes?'
      ]
    }
  ]
};

// VII. METACOGNICIÓN Y ROL ESTUDIANTE/DOCENTE
const METACOGNICION_CRITICA = {
  dimensiones: [
    {
      id: 'autocontrol_lectura',
      pregunta_base: '¿Cómo fomentar objetivos y hábitos de lectura crítica?',
      variaciones: [
        '¿Qué estrategias usas para mantener una perspectiva crítica al leer sobre {tema}?',
        '¿Cómo evalúas tu propio progreso en el análisis crítico de {contexto}?'
      ]
    },
    {
      id: 'reflexion_procesos',
      pregunta_base: '¿Cómo reflexionar sobre mis propios procesos de pensamiento?',
      variaciones: [
        '¿Qué sesgos cognitivos podrían estar influyendo en tu análisis de {tema}?',
        '¿Cómo tu identidad y experiencias moldean tu interpretación de {contexto}?'
      ]
    },
    {
      id: 'dialogo_autentico',
      pregunta_base: '¿Qué ambiente se necesita para debatir sin temor?',
      variaciones: [
        '¿Cómo crear espacios seguros para discutir perspectivas controversiales sobre {tema}?',
        '¿Qué condiciones permiten cuestionar narrativas dominantes sobre {contexto}?'
      ]
    },
    {
      id: 'transicion_niveles',
      pregunta_base: '¿Cómo transitar de lectura literal a niveles superiores?',
      variaciones: [
        '¿Qué herramientas te ayudan a profundizar más allá de lo evidente en {tema}?',
        '¿Cómo desarrollar la capacidad de ver conexiones sistémicas en {contexto}?'
      ]
    }
  ]
};

// SISTEMA INTEGRADO DE LITERACIDAD CRÍTICA
export const MARCO_LITERACIDAD_CRITICA = {
  LECTURA_LITERAL,
  LECTURA_INFERENCIAL,  
  LECTURA_CRITICA,
  EVALUACION_CRITICA,
  PRAXIS_TRANSFORMADORA,
  LITERACIDAD_DIGITAL,
  METACOGNICION_CRITICA
};

// CATEGORÍAS PARA SELECCIÓN CONTEXTUALIZADA
export const CATEGORIAS_ANALISIS = {
  SOCIAL_POLITICO: ['poder', 'justicia', 'desigualdad', 'política', 'democracia', 'ciudadanía'],
  CULTURAL_IDENTIDAD: ['cultura', 'identidad', 'género', 'raza', 'etnia', 'diversidad'],
  ECONOMICO: ['economía', 'trabajo', 'pobreza', 'desarrollo', 'recursos', 'capitalismo'],
  EDUCATIVO: ['educación', 'aprendizaje', 'escuela', 'conocimiento', 'pedagogía'],
  TECNOLOGICO: ['tecnología', 'digital', 'internet', 'inteligencia artificial', 'algoritmos'],
  AMBIENTAL: ['ambiente', 'naturaleza', 'clima', 'sostenibilidad', 'ecología'],
  SALUD: ['salud', 'medicina', 'bienestar', 'pandemia', 'sistema sanitario']
};

export default MARCO_LITERACIDAD_CRITICA;