/**
 * Script para generar el documento DOCX profesional de AppLectura
 * para evaluación por panel de expertos.
 * 
 * Uso: node scripts/generate-docx.js
 * Salida: DESCRIPCION_APPLECTURA_EXPERTOS.docx en el escritorio
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, TabStopPosition, TabStopType, Header, Footer,
  ImageRun, NumberFormat, LevelFormat, convertInchesToTwip,
  TableOfContents, StyleLevel, PageNumber
} = require('docx');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// PALETA DE COLORES (alineada con AppLectura)
// ═══════════════════════════════════════════════════════════
const COLORS = {
  navy: '1A2744',
  accentBlue: '3190FC',
  darkText: '2D3748',
  bodyText: '4A5568',
  lightGray: 'F7FAFC',
  tableHeader: '1A2744',
  tableHeaderText: 'FFFFFF',
  tableAltRow: 'F0F4F8',
  tableBorder: 'CBD5E0',
  dimLabel: '718096',
  white: 'FFFFFF',
  green: '38A169',
  orange: 'DD6B20',
  divider: 'E2E8F0',
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/** Crea un párrafo de texto con formato rico (soporta **bold** e *italic*) */
function richParagraph(text, options = {}) {
  const runs = [];
  // Parse **bold** and *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // **bold**
      runs.push(new TextRun({ text: match[2], bold: true, font: 'Calibri', size: options.size || 22, color: options.color || COLORS.bodyText }));
    } else if (match[3]) {
      // *italic*
      runs.push(new TextRun({ text: match[3], italics: true, font: 'Calibri', size: options.size || 22, color: options.color || COLORS.bodyText }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: 'Calibri', size: options.size || 22, color: options.color || COLORS.bodyText, ...options.runOptions }));
    }
  }
  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun({ text, font: 'Calibri', size: options.size || 22, color: options.color || COLORS.bodyText })],
    spacing: { after: options.spacingAfter ?? 120, before: options.spacingBefore ?? 0, line: options.lineSpacing ?? 276 },
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    indent: options.indent,
    ...(options.paragraphOptions || {}),
  });
}

/** Crea un bullet point con formato rico */
function bullet(text, level = 0) {
  const runs = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, font: 'Calibri', size: 22, color: COLORS.bodyText }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true, font: 'Calibri', size: 22, color: COLORS.bodyText }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: 'Calibri', size: 22, color: COLORS.bodyText }));
    }
  }
  return new Paragraph({
    children: runs,
    bullet: { level },
    spacing: { after: 60, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

/** Sub-bullet con texto detallado (nivel 1) */
function subBullet(text) {
  return bullet(text, 1);
}

/** Heading personalizado */
function heading(text, level = HeadingLevel.HEADING_1) {
  const sizes = {
    [HeadingLevel.HEADING_1]: 32,
    [HeadingLevel.HEADING_2]: 28,
    [HeadingLevel.HEADING_3]: 24,
  };
  const spacings = {
    [HeadingLevel.HEADING_1]: { before: 360, after: 200 },
    [HeadingLevel.HEADING_2]: { before: 300, after: 160 },
    [HeadingLevel.HEADING_3]: { before: 240, after: 120 },
  };
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        font: 'Calibri',
        size: sizes[level] || 24,
        color: COLORS.navy,
      }),
    ],
    heading: level,
    spacing: spacings[level] || { before: 240, after: 120 },
  });
}

/** Crea línea divisoria */
function divider() {
  return new Paragraph({
    children: [],
    border: { bottom: { color: COLORS.divider, style: BorderStyle.SINGLE, size: 6, space: 1 } },
    spacing: { before: 200, after: 200 },
  });
}

/** Crea tabla profesional con header */
function createTable(headers, rows, options = {}) {
  const colWidths = options.colWidths;

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, font: 'Calibri', size: 20, color: COLORS.tableHeaderText })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 },
      })],
      shading: { type: ShadingType.CLEAR, fill: COLORS.tableHeader },
      verticalAlign: 'center',
      ...(colWidths ? { width: { size: colWidths[i], type: WidthType.PERCENTAGE } } : {}),
    })),
  });

  const dataRows = rows.map((row, rowIdx) =>
    new TableRow({
      children: row.map((cell, i) => {
        const runs = [];
        const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
        let match;
        const cellText = String(cell);
        while ((match = regex.exec(cellText)) !== null) {
          if (match[2]) {
            runs.push(new TextRun({ text: match[2], bold: true, font: 'Calibri', size: 20, color: COLORS.darkText }));
          } else if (match[3]) {
            runs.push(new TextRun({ text: match[3], italics: true, font: 'Calibri', size: 20, color: COLORS.darkText }));
          } else if (match[4]) {
            runs.push(new TextRun({ text: match[4], font: 'Calibri', size: 20, color: COLORS.darkText }));
          }
        }
        return new TableCell({
          children: [new Paragraph({
            children: runs,
            spacing: { before: 40, after: 40 },
            alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.LEFT,
          })],
          shading: rowIdx % 2 === 1 ? { type: ShadingType.CLEAR, fill: COLORS.tableAltRow } : undefined,
          verticalAlign: 'center',
          ...(colWidths ? { width: { size: colWidths[i], type: WidthType.PERCENTAGE } } : {}),
        });
      }),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
    },
  });
}

/** Espacio vacío */
function spacer(size = 100) {
  return new Paragraph({ children: [], spacing: { before: size, after: size } });
}

/** Salto de página */
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ═══════════════════════════════════════════════════════════
// PORTADA
// ═══════════════════════════════════════════════════════════
function buildCoverPage() {
  return [
    spacer(600),
    new Paragraph({
      children: [new TextRun({ text: '📖', font: 'Segoe UI Emoji', size: 80 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'AppLectura', bold: true, font: 'Calibri', size: 56, color: COLORS.navy })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Asistente de Lectura y Comprensión', font: 'Calibri', size: 32, color: COLORS.accentBlue })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Potenciado por Inteligencia Artificial', font: 'Calibri', size: 32, color: COLORS.accentBlue })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    divider(),
    new Paragraph({
      children: [new TextRun({ text: 'Documento Descriptivo para Evaluación por Expertos', bold: true, font: 'Calibri', size: 28, color: COLORS.navy })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Versión: ', font: 'Calibri', size: 22, color: COLORS.dimLabel }),
        new TextRun({ text: '1.0', bold: true, font: 'Calibri', size: 22, color: COLORS.darkText }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Fecha: ', font: 'Calibri', size: 22, color: COLORS.dimLabel }),
        new TextRun({ text: 'Febrero 2026', bold: true, font: 'Calibri', size: 22, color: COLORS.darkText }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Plataforma: ', font: 'Calibri', size: 22, color: COLORS.dimLabel }),
        new TextRun({ text: 'https://applectura-cb058.web.app', bold: true, font: 'Calibri', size: 22, color: COLORS.accentBlue }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    spacer(300),
    new Paragraph({
      children: [new TextRun({ text: 'Donde la inteligencia artificial se pone al servicio de la lectura crítica.', italics: true, font: 'Calibri', size: 20, color: COLORS.dimLabel })],
      alignment: AlignmentType.CENTER,
    }),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════
// TABLA DE CONTENIDOS
// ═══════════════════════════════════════════════════════════
function buildTOC() {
  return [
    heading('Tabla de Contenidos', HeadingLevel.HEADING_1),
    spacer(60),
    ...[
      '1.  Presentación General',
      '2.  Fundamento Pedagógico',
      '3.  Arquitectura Tecnológica',
      '4.  Roles de Usuario',
      '5.  Flujo del Estudiante',
      '6.  Módulo 1 — Lectura Guiada y Tutor IA',
      '7.  Módulo 2 — Análisis del Texto',
      '8.  Módulo 3 — Actividades',
      '9.  Módulo 4 — Notas de Estudio',
      '10. Módulo 5 — Evaluación',
      '11. Sistema de Recompensas y Gamificación',
      '12. Panel Docente',
      '13. Inteligencia Artificial — Arquitectura y Proveedores',
      '14. Accesibilidad, Rendimiento y Experiencia de Usuario',
      '15. Infraestructura y Despliegue',
      '16. Resumen de Funcionalidades',
    ].map(item => richParagraph(item, { size: 22, spacingAfter: 80, color: COLORS.darkText })),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════
// SECCIONES DE CONTENIDO
// ═══════════════════════════════════════════════════════════

function section1() {
  return [
    heading('1. Presentación General', HeadingLevel.HEADING_1),
    richParagraph('**AppLectura** es una aplicación web educativa diseñada para fortalecer las competencias de comprensión lectora y pensamiento crítico en contextos académicos. La plataforma integra inteligencia artificial generativa como herramienta pedagógica, operando bajo el principio de *human on the loop*, donde la IA actúa como mediadora del aprendizaje mientras el docente mantiene supervisión y control sobre el proceso evaluativo.'),
    richParagraph('La aplicación está orientada a estudiantes de educación superior y ofrece un recorrido pedagógico estructurado que va desde la lectura guiada hasta la evaluación formal, pasando por el análisis textual profundo, la producción de artefactos de aprendizaje y la práctica deliberada.'),
    spacer(60),
    heading('Propósito Central', HeadingLevel.HEADING_3),
    richParagraph('Transformar la lectura académica de un acto pasivo a un proceso activo de construcción de conocimiento, mediante:'),
    bullet('**Acompañamiento inteligente** no evaluativo durante la lectura (Tutor IA)'),
    bullet('**Análisis multidimensional** del texto desde distintas perspectivas críticas'),
    bullet('**Producción guiada** de artefactos académicos con retroalimentación inmediata'),
    bullet('**Evaluación criterial** basada en una rúbrica de literacidad crítica'),
    bullet('**Supervisión docente** con métricas granulares y capacidad de intervención'),
    pageBreak(),
  ];
}

function section2() {
  return [
    heading('2. Fundamento Pedagógico', HeadingLevel.HEADING_1),
    richParagraph('AppLectura se sustenta en un marco teórico que integra múltiples enfoques pedagógicos:'),

    heading('2.1 Taxonomía de Bloom Revisada', HeadingLevel.HEADING_2),
    richParagraph('El sistema clasifica las interacciones del estudiante en seis niveles cognitivos progresivos:'),
    createTable(
      ['Nivel', 'Categoría', 'Descripción', 'Puntos'],
      [
        ['1', 'Recordar', 'Recuperación de información textual', '2'],
        ['2', 'Comprender', 'Explicación e interpretación', '4'],
        ['3', 'Aplicar', 'Uso del conocimiento en contextos nuevos', '8'],
        ['4', 'Analizar', 'Descomposición y relación de elementos', '15'],
        ['5', 'Evaluar (ACD)', 'Juicio crítico y análisis del discurso', '25'],
        ['6', 'Crear', 'Producción original e integración', '40'],
      ],
      { colWidths: [8, 15, 57, 10] }
    ),
    spacer(60),
    richParagraph('Un detector integrado en el tutor IA identifica automáticamente el nivel cognitivo de las preguntas del estudiante y sugiere andamiaje hacia el nivel inmediato superior (ZDP+1), siguiendo el principio vigotskiano de la Zona de Desarrollo Próximo.'),

    heading('2.2 Análisis Crítico del Discurso (ACD)', HeadingLevel.HEADING_2),
    richParagraph('La plataforma incorpora un motor de análisis discursivo que guía al estudiante en la identificación de:'),
    bullet('Marcos ideológicos y posicionamientos del autor'),
    bullet('Estrategias retóricas y recursos argumentativos'),
    bullet('Voces presentes y silenciadas en el texto'),
    bullet('Relaciones de poder implícitas en el discurso'),

    heading('2.3 Rúbrica de Literacidad Crítica', HeadingLevel.HEADING_2),
    richParagraph('La evaluación se estructura en torno a cinco dimensiones, cada una con criterios específicos y cuatro niveles de desempeño (Insuficiente, Básico, Adecuado, Avanzado):'),
    createTable(
      ['Dimensión', 'Competencia Evaluada'],
      [
        ['**Comprensión Analítica**', 'Capacidad de identificar estructura, tesis, argumentos y relaciones textuales'],
        ['**Análisis Ideológico-Discursivo (ACD)**', 'Identificación de recursos discursivos, sesgos y posicionamientos'],
        ['**Contextualización Socio-histórica**', 'Relación del texto con su contexto de producción y actores sociales'],
        ['**Argumentación y Contraargumento**', 'Construcción de posiciones fundamentadas con evidencia textual'],
        ['**Ética IA y Metacognición**', 'Reflexión sobre el propio proceso de aprendizaje y el uso ético de la IA'],
      ],
      { colWidths: [35, 65] }
    ),

    heading('2.4 Método Socrático', HeadingLevel.HEADING_2),
    richParagraph('El tutor IA implementa un enfoque socrático: no proporciona respuestas directas, sino que formula preguntas que guían al estudiante hacia la construcción autónoma del conocimiento. Cada respuesta del tutor incluye una pregunta de seguimiento que invita a profundizar.'),

    heading('2.5 Detección Emocional', HeadingLevel.HEADING_2),
    richParagraph('El sistema detecta señales emocionales en las interacciones del estudiante — confusión, frustración, curiosidad, insight — y adapta su respuesta pedagógica en consecuencia, ofreciendo mayor andamiaje cuando detecta dificultad o ampliando el desafío cuando detecta dominio.'),
    pageBreak(),
  ];
}

function section3() {
  return [
    heading('3. Arquitectura Tecnológica', HeadingLevel.HEADING_1),

    heading('3.1 Stack Tecnológico', HeadingLevel.HEADING_2),
    createTable(
      ['Capa', 'Tecnologías'],
      [
        ['**Frontend**', 'React 18.2 · styled-components · framer-motion · react-virtuoso · recharts · jsPDF · xlsx · Firebase Auth · Firestore (offline) · Firebase Storage'],
        ['**Backend**', 'Express.js · Node.js · pdf-parse · OCR · Mammoth (DOCX) · SSE Streaming · Zod Validation · Rate Limiting'],
        ['**Proveedores IA**', 'OpenAI (GPT-4o-mini) · DeepSeek · Google Gemini'],
        ['**Búsqueda Web**', 'Tavily · Serper · Bing (con fallback encadenado)'],
        ['**Infraestructura**', 'Firebase Hosting (frontend) · Render (backend) · Firestore (base de datos) · Firebase Storage (archivos)'],
      ],
      { colWidths: [20, 80] }
    ),

    heading('3.2 Decisiones Técnicas Clave', HeadingLevel.HEADING_2),
    bullet('**Persistencia offline**: Firestore con IndexedDB permite que la aplicación funcione sin conexión, sincronizando datos cuando se restaura la conectividad.'),
    bullet('**Virtualización de textos**: Los textos extensos (más de 400 párrafos) se renderizan con virtualización para mantener fluidez en la interfaz.'),
    bullet('**Streaming en tiempo real**: Las respuestas del tutor IA se transmiten mediante Server-Sent Events (SSE), mostrando la respuesta progresivamente al estudiante.'),
    bullet('**Merge inteligente de sesiones**: Algoritmo de resolución de conflictos cuando el estudiante trabaja desde múltiples dispositivos, priorizando la versión con mayor progreso.'),
    bullet('**Multi-proveedor IA con fallback**: Si un proveedor falla, el sistema redirige automáticamente a otro, garantizando disponibilidad continua.'),
    pageBreak(),
  ];
}

function section4() {
  return [
    heading('4. Roles de Usuario', HeadingLevel.HEADING_1),

    heading('4.1 Estudiante', HeadingLevel.HEADING_2),
    richParagraph('El estudiante accede a la plataforma y puede operar en dos modalidades:'),
    bullet('**Análisis libre**: Carga textos propios (PDF, TXT, DOCX) y utiliza todas las herramientas de la plataforma sin necesidad de estar inscrito en un curso. Ideal para estudio autónomo.'),
    bullet('**Curso asignado**: Se une a un curso mediante un código de acceso proporcionado por el docente. Accede a lecturas preconfiguradas y su progreso es visible para el docente.'),

    heading('4.2 Docente', HeadingLevel.HEADING_2),
    richParagraph('El docente gestiona cursos, sube textos, asigna lecturas, monitorea el progreso de sus estudiantes y puede intervenir en el proceso evaluativo. Opera desde un panel de gestión dedicado con acceso a métricas en tiempo real.'),

    heading('4.3 Autenticación', HeadingLevel.HEADING_2),
    bullet('Registro e inicio de sesión con **correo electrónico y contraseña**'),
    bullet('Inicio de sesión con **Google**'),
    bullet('Recuperación de contraseña por correo electrónico'),
    bullet('Limpieza automática de datos locales al cambiar de usuario (prevención de contaminación de datos)'),
    pageBreak(),
  ];
}

function section5() {
  return [
    heading('5. Flujo del Estudiante', HeadingLevel.HEADING_1),
    richParagraph('El recorrido pedagógico del estudiante sigue una secuencia intencionada que va desde el ingreso hasta la evaluación, pasando por cinco pestañas que estructuran el proceso de aprendizaje:'),
    spacer(40),
    richParagraph('**Ingreso (Login) → Dashboard Estudiante → Selección de Lectura → Recorrido Pedagógico**', { alignment: AlignmentType.CENTER, color: COLORS.navy }),
    spacer(40),
    richParagraph('El recorrido pedagógico se organiza en 5 pestañas:'),
    bullet('**① Lectura Guiada + Tutor IA** — Lectura del texto con acompañamiento conversacional'),
    bullet('**② Análisis del Texto** — Análisis académico en 4 fases'),
    bullet('**③ Actividades** — Preparación (MCQ), Práctica (opcional) y 5 Artefactos de aprendizaje'),
    bullet('**④ Notas de Estudio** — Generación IA + Repetición Espaciada SM-2'),
    bullet('**⑤ Evaluación** — Evaluación criterial por las 5 dimensiones'),

    heading('Dashboard del Estudiante', HeadingLevel.HEADING_3),
    richParagraph('Al ingresar, el estudiante encuentra:'),
    bullet('**Encabezado** con su nombre, puntos acumulados, racha diaria y logros'),
    bullet('**Análisis libre**: Sección para cargar textos propios y analizarlos sin restricciones'),
    bullet('**Unirse a un curso**: Campo para ingresar el código de acceso proporcionado por el docente'),
    bullet('**Mis cursos**: Lista de cursos inscritos con lecturas asignadas y porcentaje de progreso por texto'),
    bullet('**Historial de sesiones**: Acceso a "partidas guardadas" con posibilidad de continuar donde se dejó (*Smart Resume*)'),
    pageBreak(),
  ];
}

function section6() {
  return [
    heading('6. Módulo 1 — Lectura Guiada y Tutor IA', HeadingLevel.HEADING_1),

    heading('6.1 Visor de Texto', HeadingLevel.HEADING_2),
    richParagraph('El visor de lectura es el espacio central de la aplicación. Presenta el texto con las siguientes funcionalidades:'),
    bullet('**Barra de metadatos (MetaBar)**: Muestra conteo de párrafos, palabras y tiempo estimado de lectura'),
    bullet('**Control de tamaño de fuente**: Ajustable de 12px a 22px para adaptarse a las necesidades del lector'),
    bullet('**Detección inteligente de estructura**: Identifica automáticamente títulos (h1, h2, h3) y organiza visualmente los párrafos'),
    bullet('**Buscador interno**: Permite buscar términos dentro del texto con navegación entre coincidencias'),
    bullet('**Selección contextual**: Al seleccionar un fragmento de texto, aparece un menú con acciones:'),
    subBullet('*Explicar*: Envía el fragmento al tutor para obtener una explicación'),
    subBullet('*Guardar cita*: Almacena la selección como cita para uso posterior en artefactos'),
    subBullet('*Notas*: Asocia una anotación personal al fragmento'),
    subBullet('*Copiar*: Copia el texto al portapapeles'),
    bullet('**Modo enfoque**: Oculta la navegación y elementos secundarios para una lectura sin distracciones'),
    bullet('**Tracking de tiempo de lectura**: Registra el tiempo efectivo dedicado a la lectura'),

    heading('6.2 Tutor IA', HeadingLevel.HEADING_2),
    richParagraph('El tutor es un asistente conversacional no evaluativo que acompaña al estudiante durante la lectura:'),
    bullet('**Método socrático**: Responde con preguntas orientadoras en lugar de respuestas directas, promoviendo la construcción autónoma del conocimiento'),
    bullet('**Consciencia contextual**: Tiene acceso al texto cargado y puede referirse a secciones específicas'),
    bullet('**Detección de nivel Bloom**: Identifica automáticamente el nivel cognitivo de las preguntas del estudiante y sugiere progresión'),
    bullet('**Zona de Desarrollo Próximo**: Ofrece andamiaje adaptado al nivel actual del estudiante, empujando hacia el nivel inmediato superior'),
    bullet('**Detección emocional**: Reconoce señales de confusión, frustración, curiosidad o insight y adapta su tono y profundidad'),
    bullet('**Búsqueda web integrada**: El estudiante puede activar la función "Con Web" para enriquecer las respuestas del tutor con información actualizada de internet (utiliza Tavily, Serper o Bing con fallback encadenado)'),
    bullet('**Streaming en tiempo real**: Las respuestas se muestran progresivamente mediante SSE, evitando esperas prolongadas'),
    bullet('**Configuraciones ajustables**:'),
    subBullet('*Longitud de respuesta*: Controla cuán extensas son las respuestas del tutor'),
    subBullet('*Creatividad*: Ajusta el parámetro de temperatura del modelo IA'),
    subBullet('*Seguimiento de preguntas*: Activa o desactiva las preguntas de seguimiento automáticas'),
    bullet('**Persistencia de conversación**: El historial del chat se preserva por sesión de lectura y puede recuperarse al volver al texto'),
    bullet('**Filtro de contenido**: Sistema automático de detección de lenguaje inapropiado'),

    heading('6.3 Panel Expandible', HeadingLevel.HEADING_2),
    richParagraph('El tutor se presenta como un panel lateral (o inferior en móvil) que puede:'),
    bullet('Expandirse a pantalla completa para conversaciones extensas'),
    bullet('Contraerse para priorizar la lectura del texto'),
    bullet('Redimensionarse según preferencia del usuario'),
    pageBreak(),
  ];
}

function section7() {
  return [
    heading('7. Módulo 2 — Análisis del Texto', HeadingLevel.HEADING_1),
    richParagraph('La segunda pestaña proporciona un análisis académico profundo del texto en cuatro fases progresivas:'),

    heading('7.1 Fases de Análisis', HeadingLevel.HEADING_2),
    createTable(
      ['Fase', 'Nombre', 'Enfoque'],
      [
        ['I', '**Contextualización**', 'Identifica el género textual, la audiencia, el propósito comunicativo y el contexto de producción'],
        ['II', '**Contenido y Argumentación**', 'Analiza la organización del texto, la tesis central, los argumentos principales y la evidencia utilizada'],
        ['III', '**Análisis Formal y Lingüístico**', 'Examina estructura formal, recursos retóricos, estrategias discursivas y elementos lingüísticos'],
        ['IV', '**Análisis Ideológico-Discursivo (ACD)**', 'Examina sesgos, perspectivas, voces silenciadas, relaciones de poder e implicaciones ideológicas'],
      ],
      { colWidths: [8, 25, 67] }
    ),

    heading('7.2 Características del Módulo', HeadingLevel.HEADING_2),
    bullet('**Generación automática con IA**: El análisis se genera al cargar el texto, utilizando el proveedor IA configurado'),
    bullet('**Glosario dinámico**: Los términos técnicos y especializados aparecen como elementos clickeables. Al hacer clic, se despliega una definición generada por IA y almacenada en caché (24 horas)'),
    bullet('**Secciones colapsables**: Cada fase puede expandirse o contraerse individualmente, con opción de expandir/contraer todas'),
    bullet('**Exportación a PDF**: Los resultados del análisis pueden descargarse como documento PDF formateado'),
    bullet('**Caché inteligente**: Los análisis se almacenan para evitar regeneración innecesaria, con migración automática de formatos legacy'),
    bullet('**Estrategias de análisis**: El backend soporta diferentes estrategias (inteligente, alternada, debate) que determinan cómo los proveedores IA colaboran en el análisis'),
    bullet('**Fallback sin IA**: En caso de fallo de todos los proveedores, un servicio básico genera un análisis estructural del texto sin IA'),
    pageBreak(),
  ];
}

function section8() {
  return [
    heading('8. Módulo 3 — Actividades', HeadingLevel.HEADING_1),
    richParagraph('El módulo de actividades constituye el núcleo formativo de la aplicación, organizado en tres secciones secuenciales:'),

    heading('8.1 Preparación (Checkpoint)', HeadingLevel.HEADING_2),
    richParagraph('Antes de acceder a los artefactos, el estudiante debe completar una fase de preparación que verifica la lectura del texto:'),
    bullet('**Preguntas de opción múltiple**: Generadas automáticamente por IA a partir del contenido del texto, verifican comprensión literal e inferencial'),
    bullet('**Preguntas abiertas de contextualización**: El estudiante debe demostrar comprensión del contexto del texto con respuestas escritas, evaluadas por IA'),
    bullet('**Desbloqueo progresivo**: Solo al completar satisfactoriamente la preparación se habilitan los artefactos de aprendizaje'),

    heading('8.2 Práctica Guiada (Opcional)', HeadingLevel.HEADING_2),
    richParagraph('Un espacio no calificado donde el estudiante puede ejercitar antes de enfrentar los artefactos formales:'),
    bullet('**Tres niveles de dificultad**: Fácil, Intermedio y Difícil, con complejidad cognitiva creciente'),
    bullet('**Cinco dimensiones disponibles**: El estudiante elige en qué dimensión desea practicar'),
    bullet('**Retroalimentación inmediata**: La IA evalúa la respuesta y ofrece orientación sin asignar calificación formal'),
    bullet('**Puntos de bonificación**: Aunque no es calificado, la práctica otorga puntos en el sistema de recompensas como incentivo'),
    bullet('**Historial de práctica**: Se registran los intentos para que el estudiante pueda ver su evolución'),

    heading('8.3 Artefactos de Aprendizaje (5 Dimensiones)', HeadingLevel.HEADING_2),
    richParagraph('Cada dimensión de la rúbrica de literacidad crítica tiene un artefacto académico asociado:'),
    createTable(
      ['#', 'Dimensión', 'Artefacto', 'Descripción'],
      [
        ['1', 'Comprensión Analítica', '**Resumen Académico**', 'El estudiante redacta un resumen que demuestre comprensión estructural y temática del texto, identificando tesis, argumentos y conclusiones'],
        ['2', 'Análisis Ideológico-Discursivo (ACD)', '**Tabla ACD**', 'Identificación sistemática de recursos retóricos, posicionamientos ideológicos, sesgos y estrategias argumentativas del autor'],
        ['3', 'Contextualización', '**Mapa de Actores**', 'Representación de los actores sociales involucrados, sus relaciones, intereses y el contexto socio-histórico del texto'],
        ['4', 'Argumentación', '**Respuesta Argumentativa**', 'Construcción de una posición fundamentada con evidencia textual, incluyendo contraargumentos y réplicas'],
        ['5', 'Ética IA y Metacognición', '**Bitácora Ética IA**', 'Reflexión sobre el uso ético de la IA en el proceso de aprendizaje y metacognición sobre el propio proceso lector'],
      ],
      { colWidths: [5, 20, 15, 60] }
    ),

    heading('8.4 Características de los Artefactos', HeadingLevel.HEADING_2),
    richParagraph('Cada artefacto comparte un diseño consistente:'),
    bullet('**Área de escritura** con guías contextuales y preguntas orientadoras específicas de cada dimensión'),
    bullet('**Panel de citas textuales**: Acceso a las citas guardadas durante la lectura para fundamentar la escritura con evidencia'),
    bullet('**Auto-guardado**: Los borradores se guardan automáticamente para prevenir pérdida de trabajo'),
    bullet('**Evaluación dual IA**: Los artefactos son evaluados por dos proveedores IA independientes con prompts criteriales específicos, generando una evaluación más robusta'),
    bullet('**Retroalimentación estructurada**: Cada evaluación incluye:'),
    subBullet('Puntuación (escala 1-10, normalizada a nivel 1-4)'),
    subBullet('Fortalezas identificadas'),
    subBullet('Áreas de mejora'),
    subBullet('Siguientes pasos sugeridos'),
    bullet('**Historial de intentos**: Se preservan todos los envíos del estudiante con sus respectivas evaluaciones'),
    bullet('**Rate limiting**: Control de frecuencia de envíos para prevenir abuso'),
    bullet('**Banner de override docente**: Cuando el docente ha intervenido en la calificación, se muestra un indicador visual'),

    heading('8.5 Sección de Progreso', HeadingLevel.HEADING_2),
    bullet('**Dashboard visual**: Panel con el estado de cada dimensión (no iniciado, en progreso, completado)'),
    bullet('**Recomendaciones**: El sistema marca las dimensiones donde el estudiante tiene mayor oportunidad de mejora'),
    bullet('**Exportación**: Posibilidad de descargar el progreso completo en formato PDF o Excel'),
    bullet('**Reset de progreso**: Opción de reiniciar con confirmación explícita'),
    pageBreak(),
  ];
}

function section9() {
  return [
    heading('9. Módulo 4 — Notas de Estudio', HeadingLevel.HEADING_1),

    heading('9.1 Generación con IA', HeadingLevel.HEADING_2),
    richParagraph('El sistema genera notas de estudio personalizadas a partir del texto cargado:'),
    bullet('**Configuración personalizable**:'),
    subBullet('Tipo de texto (narrativo, argumentativo, expositivo, etc.)'),
    subBullet('Duración de estudio deseada'),
    subBullet('Número de tarjetas a generar'),
    subBullet('Nivel académico del estudiante'),
    bullet('**Contexto enriquecido**: Las notas incorporan información del análisis previo y las interacciones del estudiante para mayor relevancia'),
    bullet('**Multi-proveedor**: Generación mediante OpenAI, DeepSeek o Gemini con fallback automático'),

    heading('9.2 Repetición Espaciada (Algoritmo SM-2)', HeadingLevel.HEADING_2),
    richParagraph('La plataforma implementa el algoritmo SM-2 (SuperMemo 2) para optimizar la retención a largo plazo:'),
    bullet('**Intervalos crecientes**: Las tarjetas se presentan con espaciamiento progresivo basado en la calidad de la respuesta del estudiante'),
    bullet('**Escala de calidad 0-5**: El estudiante autoevalúa cuánto recuerda, lo cual ajusta el próximo intervalo'),
    bullet('**Cronograma de repaso**: 6 sesiones escalonadas desde repaso inmediato hasta 30 días'),
    bullet('**Factor de facilidad adaptativo**: Cada tarjeta ajusta dinámicamente su intervalo según el rendimiento histórico (mínimo 1.3)'),
    bullet('**Items de repaso**: Panel con tarjetas pendientes de revisión, marcables como completadas'),
    pageBreak(),
  ];
}

function section10() {
  return [
    heading('10. Módulo 5 — Evaluación', HeadingLevel.HEADING_1),

    heading('10.1 Evaluación Criterial', HeadingLevel.HEADING_2),
    richParagraph('La evaluación formal opera bajo el paradigma criterial, no normativo:'),
    bullet('**Generación de preguntas por IA**: Preguntas abiertas alineadas con cada dimensión de la rúbrica'),
    bullet('**Evaluación automatizada**: La respuesta del estudiante es evaluada por IA con criterios específicos'),
    bullet('**Feedback multidimensional**: Para cada dimensión se reporta:'),
    subBullet('Puntuación 1-10 normalizada a nivel 1-4'),
    subBullet('Fortalezas'),
    subBullet('Áreas de mejora'),
    subBullet('Pasos siguientes'),

    heading('10.2 Dashboard de Rúbricas', HeadingLevel.HEADING_2),
    richParagraph('Panel visual que muestra el progreso acumulado del estudiante en cada dimensión de la rúbrica de literacidad crítica, permitiendo identificar fortalezas y áreas de oportunidad.'),

    heading('10.3 Ensayo Integrador', HeadingLevel.HEADING_2),
    richParagraph('Evaluación sumativa que requiere que el estudiante integre las cinco dimensiones en una producción textual cohesiva, demostrando su capacidad de síntesis y pensamiento crítico.'),

    heading('10.4 Prerrequisitos', HeadingLevel.HEADING_2),
    richParagraph('Un checklist verifica que el estudiante haya completado las fases previas antes de acceder a la evaluación formal, garantizando un recorrido pedagógico completo.'),
    pageBreak(),
  ];
}

function section11() {
  return [
    heading('11. Sistema de Recompensas y Gamificación', HeadingLevel.HEADING_1),

    heading('11.1 Puntos Exponenciales', HeadingLevel.HEADING_2),
    richParagraph('El sistema de puntos está alineado con la taxonomía de Bloom, incentivando interacciones de mayor complejidad cognitiva:'),
    createTable(
      ['Nivel Bloom', 'Puntos', 'Ejemplo de Acción'],
      [
        ['Recordar', '2', 'Pregunta literal sobre el texto'],
        ['Comprender', '4', 'Solicitar explicación de un concepto'],
        ['Aplicar', '8', 'Conectar el texto con un caso real'],
        ['Analizar', '15', 'Descomponer la argumentación del autor'],
        ['Evaluar', '25', 'Emitir juicio crítico fundamentado'],
        ['Crear', '40', 'Proponer una perspectiva original'],
      ],
      { colWidths: [20, 12, 68] }
    ),

    heading('11.2 Eventos Recompensados (37 tipos)', HeadingLevel.HEADING_2),
    richParagraph('Se otorgan puntos por una variedad de acciones pedagógicas:'),
    bullet('Preguntas al tutor clasificadas por nivel Bloom'),
    bullet('Análisis crítico del discurso'),
    bullet('Completar evaluaciones'),
    bullet('Guardar citas y anotaciones'),
    bullet('Activar búsqueda web'),
    bullet('Completar actividades y artefactos'),
    bullet('Práctica deliberada en los tres niveles'),
    bullet('Completar el checkpoint de preparación'),

    heading('11.3 Racha Diaria', HeadingLevel.HEADING_2),
    richParagraph('Un sistema de multiplicadores recompensa la consistencia:'),
    createTable(
      ['Días Consecutivos', 'Multiplicador'],
      [
        ['3 días', '+20%'],
        ['7 días', '+50%'],
        ['14 días', '+100%'],
        ['21 días', '+150%'],
        ['30 días', '+200%'],
      ],
      { colWidths: [50, 50] }
    ),

    heading('11.4 Logros (Achievements)', HeadingLevel.HEADING_2),
    richParagraph('Hitos pedagógicos que reconocen avances significativos:'),
    bullet('**Dimensión Desbloqueada** (40 pts): Completar una dimensión de la rúbrica'),
    bullet('**⭐ Excelencia Crítica** (100 pts): Obtener la máxima calificación en un artefacto'),
    bullet('Otros hitos relacionados con consistencia, exploración y profundidad'),

    heading('11.5 Protección Anti-farming', HeadingLevel.HEADING_2),
    bullet('**Límite diario** por tipo de evento para evitar acumulación artificial'),
    bullet('**Deduplicación**: No se otorgan puntos duplicados por la misma acción'),
    bullet('**Cooldowns**: Períodos mínimos entre acciones recompensadas del mismo tipo'),

    heading('11.6 Interfaz de Recompensas', HeadingLevel.HEADING_2),
    bullet('**Encabezado global**: Muestra puntos totales, racha actual con emoji dinámico y badge de logros'),
    bullet('**Panel de analíticas**: Vista detallada con distribución de puntos, estadísticas por categoría y progreso temporal'),
    pageBreak(),
  ];
}

function section12() {
  return [
    heading('12. Panel Docente', HeadingLevel.HEADING_1),

    heading('12.1 Gestión de Cursos', HeadingLevel.HEADING_2),
    bullet('**Crear cursos** con nombre, período académico y descripción'),
    bullet('**Código de acceso único**: Se genera automáticamente un código alfanumérico de 6 caracteres (sin caracteres ambiguos) que los estudiantes usan para inscribirse'),
    bullet('**Aprobación de estudiantes**: Configurable como automática o manual'),
    bullet('**Configuración de ponderación**: El docente define el peso de la evaluación formativa vs. sumativa (por defecto 70%/30%)'),
    bullet('**Eliminación de cursos** con confirmación'),

    heading('12.2 Gestión de Textos', HeadingLevel.HEADING_2),
    bullet('**Subir documentos**: Soporte para PDF, TXT y DOCX con metadata (título, autor, género textual)'),
    bullet('**Procesamiento inteligente**: Los PDFs se procesan con extracción de texto y OCR como fallback para documentos escaneados'),
    bullet('**Asignar lecturas a cursos**: Con fecha límite y notas opcionales para los estudiantes'),
    bullet('**Habilitar/deshabilitar lecturas** sin eliminarlas'),

    heading('12.3 Monitoreo de Estudiantes', HeadingLevel.HEADING_2),
    bullet('**Dashboard de métricas**: Vista agregada del progreso por curso y por lectura'),
    bullet('**Vista expandida por estudiante**: Detalle individual con:'),
    subBullet('Estado de cada artefacto (no iniciado, en progreso, completado)'),
    subBullet('Puntuaciones obtenidas por dimensión'),
    subBullet('Tiempo dedicado a la lectura'),
    subBullet('Historial de intentos por artefacto'),
    bullet('**Métricas en tiempo real**: Las actualizaciones de progreso se reflejan inmediatamente gracias a suscripciones en tiempo real de Firestore'),

    heading('12.4 Intervención Docente (Human on the Loop)', HeadingLevel.HEADING_2),
    bullet('**Override de calificación**: El docente puede modificar cualquier calificación asignada por la IA, añadiendo un comentario explicativo y la razón del cambio. La calificación del docente prevalece sobre la de la IA'),
    bullet('**Reset de artefactos**: Posibilidad de reiniciar un artefacto específico o todos los artefactos de un estudiante, otorgando una nueva oportunidad'),
    bullet('**Comentarios**: Canal de comunicación directa con el estudiante sobre su desempeño'),

    heading('12.5 Exportación', HeadingLevel.HEADING_2),
    bullet('Exportación de resultados y métricas del curso'),
    bullet('Vista de actividad detallada por estudiante'),
    pageBreak(),
  ];
}

function section13() {
  return [
    heading('13. Inteligencia Artificial — Arquitectura y Proveedores', HeadingLevel.HEADING_1),

    heading('13.1 Proveedores Integrados', HeadingLevel.HEADING_2),
    createTable(
      ['Proveedor', 'Modelo Principal', 'Usos'],
      [
        ['**OpenAI**', 'GPT-4o-mini', 'Chat, evaluación, notas, análisis'],
        ['**DeepSeek**', 'deepseek-chat', 'Chat, evaluación, análisis'],
        ['**Google Gemini**', 'gemini-2.0-flash', 'Análisis, notas'],
      ],
      { colWidths: [20, 25, 55] }
    ),

    heading('13.2 Estrategia de Resiliencia', HeadingLevel.HEADING_2),
    bullet('**Fallback encadenado**: Si un proveedor falla, el sistema redirige automáticamente al siguiente'),
    bullet('**Retry con backoff exponencial**: Reintentos automáticos con intervalos crecientes ante errores temporales'),
    bullet('**Caché de respuestas**: Las respuestas del chat se almacenan en caché para evitar llamadas duplicadas'),
    bullet('**Validación de esquemas (Zod)**: Las respuestas de la IA se validan contra esquemas estructurados para garantizar formato correcto'),

    heading('13.3 Búsqueda Web', HeadingLevel.HEADING_2),
    richParagraph('La funcionalidad de búsqueda web permite enriquecer las respuestas del tutor con información actualizada:'),
    createTable(
      ['Proveedor', 'Prioridad', 'Descripción'],
      [
        ['**Tavily**', '1ª opción', 'Motor de búsqueda optimizado para IA'],
        ['**Serper**', '2ª opción', 'API de Google Search'],
        ['**Bing**', '3ª opción', 'API de Microsoft Bing'],
        ['**Simulada**', 'Fallback', 'Respuesta básica sin búsqueda real'],
      ],
      { colWidths: [20, 15, 65] }
    ),
    spacer(40),
    richParagraph('Los resultados se normalizan (título, URL, snippet, score de relevancia) y se inyectan como contexto en el prompt del tutor.'),

    heading('13.4 Modos de IA', HeadingLevel.HEADING_2),
    richParagraph('La aplicación implementa dos modos claramente diferenciados:'),
    bullet('**Modo Tutor** (no evaluativo): Acompaña, guía y sugiere sin calificar. Usa método socrático y se adapta al nivel del estudiante'),
    bullet('**Modo Evaluador** (criterial): Evalúa formalmente las respuestas del estudiante contra la rúbrica de literacidad crítica, asignando puntuaciones y retroalimentación estructurada'),
    pageBreak(),
  ];
}

function section14() {
  return [
    heading('14. Accesibilidad, Rendimiento y Experiencia de Usuario', HeadingLevel.HEADING_1),

    heading('14.1 Diseño Responsivo', HeadingLevel.HEADING_2),
    bullet('**Breakpoints adaptativos**: 640px (móvil), 768px (tablet), 1200px (escritorio)'),
    bullet('**Touch targets**: Mínimo 44px para elementos interactivos en dispositivos táctiles'),
    bullet('**Safe area**: Compatibilidad con notch y barra inferior de dispositivos móviles'),
    bullet('**Altura dinámica**: Uso de 100dvh para altura real en navegadores móviles'),

    heading('14.2 Rendimiento', HeadingLevel.HEADING_2),
    bullet('**Lazy loading**: Todos los módulos principales se cargan bajo demanda'),
    bullet('**React.memo**: Memoización de componentes para evitar re-renderizados innecesarios'),
    bullet('**Virtualización**: Textos extensos renderizan solo los párrafos visibles'),
    bullet('**Separación de contexto**: El estado global distingue valores estables (callbacks) de valores dinámicos (datos) para minimizar propagación de actualizaciones'),

    heading('14.3 Modo Oscuro / Claro', HeadingLevel.HEADING_2),
    bullet('**Tema completo**: Paleta de colores, sombras, contrastes y elementos semánticos para ambos modos'),
    bullet('**Persistencia**: La preferencia se guarda en localStorage con fallback a la preferencia del sistema operativo'),
    bullet('**Contraste WCAG AA**: Ratio mínimo de 4.8:1 para texto secundario'),

    heading('14.4 Experiencia de Usuario', HeadingLevel.HEADING_2),
    bullet('**Animaciones con framer-motion**: Transiciones fluidas entre estados y componentes'),
    bullet('**Respeto por prefers-reduced-motion**: Las animaciones se desactivan para usuarios que lo soliciten'),
    bullet('**Auto-guardado**: Todos los borradores se preservan automáticamente'),
    bullet('**Indicadores de estado**: Feedback visual claro para carga, éxito, error y progreso'),
    bullet('**Sidebar colapsable**: Panel lateral de carga de texto que se oculta automáticamente en pantallas pequeñas'),
    pageBreak(),
  ];
}

function section15() {
  return [
    heading('15. Infraestructura y Despliegue', HeadingLevel.HEADING_1),

    heading('15.1 Frontend', HeadingLevel.HEADING_2),
    bullet('**Hosting**: Firebase Hosting con CDN global'),
    bullet('**Dominio**: applectura-cb058.web.app'),
    bullet('**Build**: Create React App con configuración personalizada'),

    heading('15.2 Backend', HeadingLevel.HEADING_2),
    bullet('**Hosting**: Render (servicio web)'),
    bullet('**Puerto**: 3001'),
    bullet('**CORS**: Configuración dinámica para localhost, Firebase Hosting y Render'),
    bullet('**Rate limiting**: Protección contra abuso de endpoints'),

    heading('15.3 Base de Datos (Firestore)', HeadingLevel.HEADING_2),
    richParagraph('Colecciones principales:'),
    createTable(
      ['Colección', 'Propósito'],
      [
        ['users', 'Datos de usuario (nombre, rol, email)'],
        ['↳ users/{uid}/sessions', 'Sesiones de trabajo con estado completo (subcolección)'],
        ['↳ users/{uid}/draftBackups', 'Respaldos de borradores de artefactos (subcolección)'],
        ['textos', 'Textos subidos por docentes con metadata'],
        ['courses', 'Cursos con código, lecturas asignadas, configuración'],
        ['↳ courses/{id}/students', 'Estudiantes inscritos en el curso (subcolección)'],
        ['courseCodes', 'Mapeo de código → ID de curso (lookup rápido)'],
        ['students', 'Relación estudiante-curso con progreso'],
        ['↳ students/{id}/progress', 'Progreso detallado por texto (subcolección)'],
        ['evaluaciones', 'Evaluaciones almacenadas'],
        ['active_sessions', 'Sesiones activas en tiempo real'],
      ],
      { colWidths: [35, 65] }
    ),

    heading('15.4 Almacenamiento', HeadingLevel.HEADING_2),
    bullet('**Firebase Storage**: Para documentos PDF, TXT y DOCX subidos por docentes'),
    bullet('**Límites**: 50MB máximo por archivo'),
    bullet('**Formatos**: .pdf, .txt, .docx'),

    heading('15.5 Seguridad', HeadingLevel.HEADING_2),
    bullet('**Reglas de Firestore**: Control de acceso por rol y propiedad del documento'),
    bullet('**Autenticación obligatoria**: Todas las rutas protegidas requieren sesión activa'),
    bullet('**Limpieza de datos**: Al cerrar sesión o cambiar de usuario, se eliminan datos sensibles del almacenamiento local'),
    bullet('**Filtro de contenido**: Detección automática de lenguaje inapropiado en las interacciones con el tutor'),
    pageBreak(),
  ];
}

function section16() {
  return [
    heading('16. Resumen de Funcionalidades', HeadingLevel.HEADING_1),

    heading('Funcionalidades del Estudiante', HeadingLevel.HEADING_2),
    createTable(
      ['Categoría', 'Funcionalidad'],
      [
        ['**Lectura**', 'Visor de texto con estructura inteligente, control de fuente, modo enfoque, buscador interno, tracking de tiempo'],
        ['**Interacción Textual**', 'Selección contextual (explicar, citar, anotar, copiar), glosario dinámico'],
        ['**Tutor IA**', 'Chat socrático no-evaluativo, búsqueda web, detección de Bloom, ZDP+1, detección emocional, streaming'],
        ['**Análisis**', 'Análisis en 4 fases (contextualización, contenido, formal-lingüístico, ideológico-discursivo ACD), exportación PDF'],
        ['**Actividades**', 'Checkpoint MCQ, práctica en 3 niveles, 5 artefactos con evaluación dual IA'],
        ['**Notas**', 'Generación IA personalizable, repetición espaciada SM-2, cronograma de repaso'],
        ['**Evaluación**', 'Evaluación criterial por dimensión, dashboard de rúbrica, ensayo integrador'],
        ['**Gamificación**', 'Puntos Bloom, racha diaria, logros, analíticas de progreso'],
        ['**Gestión**', 'Inscripción a cursos, historial de sesiones, Smart Resume, análisis libre'],
      ],
      { colWidths: [20, 80] }
    ),

    spacer(100),
    heading('Funcionalidades del Docente', HeadingLevel.HEADING_2),
    createTable(
      ['Categoría', 'Funcionalidad'],
      [
        ['**Cursos**', 'Crear, configurar, eliminar cursos con código de acceso único'],
        ['**Textos**', 'Subir PDF/TXT/DOCX, asignar a cursos con fecha límite'],
        ['**Estudiantes**', 'Aprobar inscripciones, monitorear progreso, eliminar'],
        ['**Métricas**', 'Dashboard en tiempo real, vista por curso y por estudiante'],
        ['**Intervención**', 'Override de calificación, reset de artefactos, comentarios'],
        ['**Configuración**', 'Ponderación formativa/sumativa, auto-approve'],
      ],
      { colWidths: [20, 80] }
    ),

    spacer(100),
    heading('Capacidades Técnicas', HeadingLevel.HEADING_2),
    createTable(
      ['Categoría', 'Capacidad'],
      [
        ['**IA**', 'Multi-proveedor (OpenAI, DeepSeek, Gemini) con fallback'],
        ['**Búsqueda**', 'Web search integrado (Tavily, Serper, Bing)'],
        ['**Documentos**', 'PDF (con OCR), TXT, DOCX'],
        ['**Offline**', 'Persistencia Firestore con IndexedDB'],
        ['**Rendimiento**', 'Virtualización, lazy loading, memoización'],
        ['**Responsive**', 'Diseño adaptativo para móvil, tablet y escritorio'],
        ['**Temas**', 'Modo oscuro/claro con persistencia'],
        ['**Datos**', 'Sync en tiempo real, merge inteligente, exportación PDF/Excel'],
        ['**Seguridad**', 'Auth Firebase, reglas Firestore, rate limiting, filtro de contenido'],
      ],
      { colWidths: [20, 80] }
    ),
    spacer(200),
    divider(),
    new Paragraph({
      children: [new TextRun({ text: 'AppLectura — Donde la inteligencia artificial se pone al servicio de la lectura crítica.', italics: true, font: 'Calibri', size: 22, color: COLORS.dimLabel })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    }),
  ];
}

// ═══════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════
async function generateDocument() {
  console.log('🔨 Generando documento DOCX...\n');

  const doc = new Document({
    creator: 'AppLectura',
    title: 'AppLectura — Documento Descriptivo para Evaluación por Expertos',
    description: 'Descripción completa de la aplicación AppLectura para panel de expertos',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: COLORS.bodyText },
          paragraph: { spacing: { line: 276 } },
        },
        heading1: {
          run: { font: 'Calibri', size: 32, bold: true, color: COLORS.navy },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        heading2: {
          run: { font: 'Calibri', size: 28, bold: true, color: COLORS.navy },
          paragraph: { spacing: { before: 300, after: 160 } },
        },
        heading3: {
          run: { font: 'Calibri', size: 24, bold: true, color: COLORS.navy },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      },
    },
    numbering: {
      config: [{
        reference: 'default-bullet',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(1.0), hanging: convertInchesToTwip(0.25) } } } },
        ],
      }],
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1.2),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'AppLectura — Documento Descriptivo para Evaluación por Expertos', font: 'Calibri', size: 16, color: COLORS.dimLabel, italics: true }),
              ],
              alignment: AlignmentType.RIGHT,
              border: { bottom: { color: COLORS.divider, style: BorderStyle.SINGLE, size: 4, space: 4 } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Página ', font: 'Calibri', size: 16, color: COLORS.dimLabel }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 16, color: COLORS.dimLabel }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { color: COLORS.divider, style: BorderStyle.SINGLE, size: 4, space: 4 } },
            }),
          ],
        }),
      },
      children: [
        ...buildCoverPage(),
        ...buildTOC(),
        ...section1(),
        ...section2(),
        ...section3(),
        ...section4(),
        ...section5(),
        ...section6(),
        ...section7(),
        ...section8(),
        ...section9(),
        ...section10(),
        ...section11(),
        ...section12(),
        ...section13(),
        ...section14(),
        ...section15(),
        ...section16(),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join('C:\\Users\\User\\Desktop', 'AppLectura_Descripcion_Expertos.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Documento generado exitosamente:`);
  console.log(`   📄 ${outputPath}`);
  console.log(`   📏 ${(buffer.length / 1024).toFixed(0)} KB`);
  console.log(`   📑 16 secciones | ~30 páginas`);
}

generateDocument().catch(err => {
  console.error('❌ Error generando documento:', err.message);
  process.exit(1);
});
