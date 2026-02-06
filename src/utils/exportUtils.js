/**
 * @file Módulo con utilidades para exportar datos en PDF.
 * @module exportUtils
 * @version 3.0.0 - Visualización mejorada con labels legibles y objetos formateados
 */

// ─── Campos internos/técnicos a excluir de las exportaciones ─────────
const INTERNAL_FIELDS = new Set([
  '_isPreliminary', 'currentTextoId', 'web_enriched', '_raw', '_cached',
  '_timestamp', '_hash', '_version', '_id', '_source',
  // sync / ids técnicos (ruido para el usuario)
  'syncType', 'sourceCourseId', 'userId', 'textId', 'textoId', 'lastSync',
  'SyncType', 'SourceCourseId', 'UserId', 'TextId', 'TextoId', 'LastSync',
]);

// ─── Mapeo de nombres técnicos → etiquetas legibles ─────────────────
const FIELD_LABELS = {
  // Fase I
  autor: 'Autor',
  audiencia_objetivo: 'Audiencia objetivo',
  genero_textual: 'Genero textual',
  proposito_comunicativo: 'Proposito comunicativo',
  tipologia_textual: 'Tipologia textual',
  contexto_historico: 'Contexto historico',
  fuente_publicacion: 'Fuente de publicacion',
  fecha_publicacion: 'Fecha de publicacion',
  // Fase II
  tesis_central: 'Tesis central',
  argumentos_principales: 'Argumentos principales',
  estructura_logica: 'Estructura logica',
  fortalezas_argumentativas: 'Fortalezas argumentativas',
  limitaciones_o_fallos: 'Limitaciones o fallos',
  hipotesis_secundarias: 'Hipotesis secundarias',
  tipo_argumentacion: 'Tipo de argumentacion',
  tipo_razonamiento: 'Tipo de razonamiento',
  cadena_argumentativa: 'Cadena argumentativa',
  premisas_principales: 'Premisas principales',
  conclusiones: 'Conclusiones',
  // Fase III
  analisis_sintactico: 'Analisis sintactico',
  coherencia_cohesion: 'Coherencia y cohesion',
  conectores_discursivos: 'Conectores discursivos',
  figuras_retoricas: 'Figuras retoricas',
  lexico_especializado: 'Lexico especializado',
  nivel_complejidad: 'Nivel de complejidad',
  registro_linguistico: 'Registro linguistico',
  tipo_estructura: 'Tipo de estructura',
  tono_y_modalidad: 'Tono y modalidad',
  complejidad_sintactica: 'Complejidad sintactica',
  longitud_promedio: 'Longitud promedio',
  tipo_oraciones: 'Tipo de oraciones',
  campo_semantico: 'Campo semantico',
  densidad_conceptual: 'Densidad conceptual',
  terminos_tecnicos: 'Terminos tecnicos',
  distancia_epistemica: 'Distancia epistemica',
  modalidad: 'Modalidad',
  tono: 'Tono',
  funcion: 'Funcion',
  // Fase IV (ACD)
  ideologia_subyacente: 'Ideologia subyacente',
  marcadores_criticos: 'Marcadores criticos',
  voces_representadas: 'Voces representadas',
  voces_silenciadas: 'Voces silenciadas',
  complejidad_critica: 'Complejidad critica',
  contraste_web: 'Contraste web',
  poder: 'Poder',
  sesgos: 'Sesgos',
  datos_verificados: 'Datos verificados',
  texto_actualizado: 'Texto actualizado',
  // Progreso (camelCase/PascalCase)
  lastResetAt: 'Ultimo reinicio',
  LastResetAt: 'Ultimo reinicio',
  lastActivity: 'Ultima actividad',
  LastActivity: 'Ultima actividad',
  ultimaActividad: 'Ultima actividad',
  UltimaActividad: 'Ultima actividad',
  promedioGlobal: 'Promedio global',
  PromedioGlobal: 'Promedio global',
  ultimaPuntuacion: 'Ultima puntuacion',
  UltimaPuntuacion: 'Ultima puntuacion',
  porcentaje: 'Progreso (%)',
  Porcentaje: 'Progreso (%)',
  activitiesProgress: 'Actividades',
  ActivitiesProgress: 'Actividades',
  id: 'ID',
  Id: 'ID',
};

/** Convierte snake_case a un label legible */
const humanizeKey = (key) => {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const base = String(key)
    .replace(/^_+/, '')
    // snake_case
    .replace(/_/g, ' ')
    // camelCase / PascalCase -> espacios antes de mayúsculas
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return base.replace(/\b\w/g, c => c.toUpperCase());
};

const isFirestoreTimestampLike = (v) => {
  if (!v || typeof v !== 'object') return false;
  // formato que aparece en tu captura: { type: 'firestore/timestamp/1.0', seconds, nanoseconds }
  if (v.type === 'firestore/timestamp/1.0' && typeof v.seconds === 'number') return true;
  // formato habitual de Firestore SDK: { seconds, nanoseconds }
  if (typeof v.seconds === 'number' && typeof v.nanoseconds === 'number') return true;
  return false;
};

const formatTimestamp = (v) => {
  try {
    const ms = (v.seconds * 1000) + Math.floor((v.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('es-ES');
  } catch {
    return null;
  }
};

/** Verifica si un campo debe excluirse */
const shouldSkipField = (key, value) => {
  if (INTERNAL_FIELDS.has(key)) return true;
  if (key.startsWith('_')) return true;
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  // Omitir objetos donde todos los valores son null
  if (typeof value === 'object' && !Array.isArray(value)) {
    const vals = Object.values(value);
    if (vals.length > 0 && vals.every(v => v === null || v === undefined || v === '')) return true;
  }
  return false;
};

/**
 * Compatibilidad: redirige a exportación PDF.
 */
export const exportarResultados = (analisis, metadata = {}) => {
  exportarResultadosPDF(analisis, metadata);
  return { success: true, message: 'Exportacion PDF iniciada.' };
};

// ─── PDF Builder base (compartido por ambas funciones) ───────────────
const createPDFBuilder = (jsPDF) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const lineColor = [180, 180, 180]; // gris claro
  const accentColor = [49, 144, 252]; // azul primario #3190FC

  const addPageIfNeeded = (needed = 8) => {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = margin;
    }
  };

  const drawLine = (color = lineColor, width = 0.3) => {
    addPageIfNeeded(4);
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3;
  };

  const addMainTitle = (text) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(String(text), contentWidth);
    lines.forEach(line => {
      addPageIfNeeded(10);
      doc.text(line, margin, y);
      y += 8;
    });
    y += 1;
    drawLine(accentColor, 0.6);
    y += 2;
  };

  const addDate = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Exportado: ${new Date().toLocaleString('es-ES')}`, margin, y);
    y += 6;
    doc.setTextColor(30, 30, 30);
  };

  const addSectionHeader = (text) => {
    y += 4;
    addPageIfNeeded(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...accentColor);
    doc.text(text, margin, y);
    y += 2;
    drawLine(accentColor, 0.4);
    doc.setTextColor(30, 30, 30);
    y += 1;
  };

  const addSubHeader = (text) => {
    y += 2;
    addPageIfNeeded(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(text, margin + 3, y);
    y += 5;
    doc.setTextColor(30, 30, 30);
  };

  const addLabel = (label, indent = 0) => {
    addPageIfNeeded(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(`${label}:`, margin + indent, y);
    y += 5;
    doc.setTextColor(30, 30, 30);
  };

  const addText = (text, indent = 0) => {
    if (!text) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const maxW = contentWidth - indent;
    const lines = doc.splitTextToSize(String(text), maxW);
    lines.forEach(line => {
      addPageIfNeeded(5);
      doc.text(line, margin + indent, y);
      y += 4.5;
    });
    y += 2;
    doc.setTextColor(30, 30, 30);
  };

  const addBullet = (text, indent = 6) => {
    if (!text) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const bullet = '\u2022 ';
    const maxW = contentWidth - indent - 4;
    const lines = doc.splitTextToSize(bullet + String(text), maxW);
    lines.forEach((line, i) => {
      addPageIfNeeded(5);
      doc.text(i === 0 ? line : '  ' + line, margin + indent, y);
      y += 4.5;
    });
    y += 1;
  };

  const addLabeledValue = (label, value, indent = 3) => {
    addPageIfNeeded(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    const labelStr = `${label}: `;
    doc.text(labelStr, margin + indent, y);
    const labelWidth = doc.getTextWidth(labelStr);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const maxW = contentWidth - indent - labelWidth;
    const valueStr = String(value ?? '');
    if (doc.getTextWidth(valueStr) <= maxW) {
      doc.text(valueStr, margin + indent + labelWidth, y);
      y += 5;
    } else {
      y += 5;
      addText(valueStr, indent + 2);
    }
    doc.setTextColor(30, 30, 30);
  };

  /**
   * Renderiza un valor de forma inteligente:
   * - string/number → inline
   * - array de strings → bullets
   * - array de objects → cada uno como sub-bloque
   * - object → sub-labels
   */
  const MAX_DEPTH = 4;
  const MAX_OBJECT_KEYS = 24;
  const MAX_ARRAY_ITEMS = 10;
  const MAX_STRING_LEN = 900;

  const truncateString = (s) => {
    const str = String(s ?? '');
    if (str.length <= MAX_STRING_LEN) return str;
    return str.slice(0, MAX_STRING_LEN) + ' ...[truncado]';
  };

  const renderSmartValue = (key, value, indent = 3, depth = 0) => {
    const label = humanizeKey(key);

    // Timestamp Firestore
    if (isFirestoreTimestampLike(value)) {
      const formatted = formatTimestamp(value);
      if (formatted) {
        addLabeledValue(label, formatted, indent);
        return;
      }
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      addLabeledValue(label, truncateString(value), indent);
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return;
      addLabel(label, indent);
      const slice = value.slice(0, MAX_ARRAY_ITEMS);
      slice.forEach(item => {
        if (typeof item === 'string' || typeof item === 'number') {
          addBullet(truncateString(item), indent + 4);
        } else if (typeof item === 'object' && item !== null) {
          // Array de objetos: render cada propiedad como sub-bullet
          const parts = Object.entries(item)
            .filter(([k, v]) => !shouldSkipField(k, v))
            .map(([k, v]) => {
              const l = humanizeKey(k);
              if (isFirestoreTimestampLike(v)) {
                const formatted = formatTimestamp(v);
                return `${l}: ${formatted || ''}`;
              }
              if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return `${l}: ${truncateString(v)}`;
              if (Array.isArray(v)) return `${l}: ${truncateString(v.filter(Boolean).join(', '))}`;
              if (typeof v === 'object' && v !== null) return `${l}: (${Object.keys(v).length} campos)`;
              return `${l}: ${truncateString(v)}`;
            });
          if (parts.length === 1) {
            addBullet(parts[0], indent + 4);
          } else {
            parts.forEach(p => addBullet(p, indent + 4));
            y += 1;
          }
        }
      });
      if (value.length > MAX_ARRAY_ITEMS) {
        addBullet(`... y ${value.length - MAX_ARRAY_ITEMS} mas`, indent + 4);
      }
      y += 1;
      return;
    }

    if (typeof value === 'object' && value !== null) {
      if (depth >= MAX_DEPTH) {
        addLabeledValue(label, `(${Object.keys(value).length} campos)`, indent);
        return;
      }

      addLabel(label, indent);
      const entries = Object.entries(value).filter(([k, v]) => !shouldSkipField(k, v));
      const slice = entries.slice(0, MAX_OBJECT_KEYS);
      slice.forEach(([k, v]) => {
        if (shouldSkipField(k, v)) return;
        renderSmartValue(k, v, indent + 4, depth + 1);
      });
      if (entries.length > MAX_OBJECT_KEYS) {
        addBullet(`... y ${entries.length - MAX_OBJECT_KEYS} campos mas`, indent + 4);
      }
      return;
    }
  };

  return { doc, addPageIfNeeded, addMainTitle, addDate, addSectionHeader, addSubHeader,
    addLabel, addText, addBullet, addLabeledValue, renderSmartValue, drawLine,
    margin, contentWidth, getY: () => y, setY: (val) => { y = val; } };
};

/**
 * Helper genérico para exportar cualquier dato estructurado como PDF.
 */
export const exportGenericPDF = async ({ title, sections = [], fileName = 'export.pdf' }) => {
  try {
    const { jsPDF } = await import('jspdf');
    const b = createPDFBuilder(jsPDF);

    b.addMainTitle(title);
    b.addDate();

    for (const sec of sections) {
      if (sec.heading) {
        b.addSectionHeader(sec.heading);
      }

      if (sec.text) {
        b.addText(sec.text, 3);
      }

      if (sec.keyValues && typeof sec.keyValues === 'object') {
        Object.entries(sec.keyValues).forEach(([key, value]) => {
          if (shouldSkipField(key, value)) return;
          b.renderSmartValue(key, value, 3);
        });
      }

      if (sec.list && Array.isArray(sec.list)) {
        sec.list.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            const parts = Object.entries(item).filter(([k, v]) => !shouldSkipField(k, v))
              .map(([k, v]) => `${humanizeKey(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
            parts.forEach(p => b.addBullet(p, 6));
          } else {
            b.addBullet(String(item), 6);
          }
        });
      }

      if (sec.table) {
        const { headers = [], rows = [] } = sec.table;
        const colW = b.contentWidth / Math.max(headers.length, 1);
        b.doc.setFont('helvetica', 'bold');
        b.doc.setFontSize(9);
        b.doc.setTextColor(70, 70, 70);
        b.addPageIfNeeded(8);
        const yPos = b.getY();
        headers.forEach((h, i) => {
          b.doc.text(String(h).slice(0, 30), b.margin + i * colW, yPos);
        });
        b.setY(yPos + 5);
        b.drawLine();
        b.doc.setFont('helvetica', 'normal');
        b.doc.setTextColor(40, 40, 40);
        rows.forEach(row => {
          b.addPageIfNeeded(6);
          const ry = b.getY();
          row.forEach((cell, i) => {
            b.doc.text(String(cell ?? '').slice(0, 35), b.margin + i * colW, ry);
          });
          b.setY(ry + 4.5);
        });
        b.setY(b.getY() + 3);
      }
    }

    b.doc.save(fileName);
    return { success: true };
  } catch (error) {
    console.error('Error generando PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Exporta los resultados de análisis de prelectura a un PDF bien formateado.
 */
export const exportarResultadosPDF = async (analisis, metadata = {}) => {
  if (!analisis) {
    return { success: false, error: 'No hay datos de analisis para exportar.' };
  }

  try {
    const { jsPDF } = await import('jspdf');
    const b = createPDFBuilder(jsPDF);

    const prelecture = analisis.prelecture || analisis;
    const { metadata: meta = {}, argumentation = {}, linguistics = {}, web_summary, web_sources } = prelecture || {};
    const acdData = analisis.critical?.contexto_critico || {};

    // ─── Título ──────────────────────────────────────────────────────
    b.addMainTitle('Analisis Academico - Prelectura');
    b.addDate();

    if (meta.autor) {
      b.addLabeledValue('Autor', meta.autor);
    }

    // ─── Fase I: Contextualización ───────────────────────────────────
    b.addSectionHeader('Fase I: Contextualizacion');
    const fase1Fields = ['genero_textual', 'tipologia_textual', 'proposito_comunicativo', 'audiencia_objetivo',
      'contexto_historico', 'fuente_publicacion', 'fecha_publicacion'];
    fase1Fields.forEach(field => {
      if (meta[field] && !shouldSkipField(field, meta[field])) {
        b.addLabeledValue(humanizeKey(field), meta[field]);
      }
    });
    // Render any remaining meta fields not in fase1Fields
    Object.entries(meta).forEach(([k, v]) => {
      if (fase1Fields.includes(k) || k === 'autor' || shouldSkipField(k, v)) return;
      b.renderSmartValue(k, v);
    });

    // ─── Fase II: Contenido y Argumentación ──────────────────────────
    if (Object.keys(argumentation).length > 0) {
      b.addSectionHeader('Fase II: Contenido y Argumentacion');

      // Tesis central (prioritaria)
      if (argumentation.tesis_central) {
        b.addLabel('Tesis central', 3);
        b.addText(argumentation.tesis_central, 5);
      }

      // Estructura lógica
      if (argumentation.estructura_logica) {
        const el = argumentation.estructura_logica;
        if (typeof el === 'object') {
          b.addLabel('Estructura logica', 3);
          if (el.cadena_argumentativa) {
            b.addSubHeader('Cadena argumentativa');
            b.addText(el.cadena_argumentativa, 5);
          }
          if (el.premisas_principales && Array.isArray(el.premisas_principales)) {
            b.addSubHeader('Premisas principales');
            el.premisas_principales.forEach(p => b.addBullet(p, 8));
          }
          if (el.conclusiones && Array.isArray(el.conclusiones)) {
            b.addSubHeader('Conclusiones');
            el.conclusiones.forEach(c => b.addBullet(c, 8));
          }
          // Otras propiedades no cubiertas
          Object.entries(el).forEach(([k, v]) => {
            if (['cadena_argumentativa', 'premisas_principales', 'conclusiones'].includes(k)) return;
            if (shouldSkipField(k, v)) return;
            b.renderSmartValue(k, v, 5);
          });
        } else {
          b.addLabeledValue('Estructura logica', el);
        }
      }

      // Argumentos principales
      if (argumentation.argumentos_principales) {
        b.addLabel('Argumentos principales', 3);
        const args = argumentation.argumentos_principales;
        if (Array.isArray(args)) {
          args.forEach((arg, idx) => {
            if (typeof arg === 'object' && arg !== null) {
              const title = arg.argumento || arg.titulo || arg.claim || `Argumento ${idx + 1}`;
              b.addSubHeader(`${idx + 1}. ${title}`);
              Object.entries(arg).forEach(([k, v]) => {
                if (['argumento', 'titulo', 'claim'].includes(k) || shouldSkipField(k, v)) return;
                b.renderSmartValue(k, v, 8);
              });
            } else {
              b.addBullet(String(arg), 6);
            }
          });
        }
      }

      // Campos simples de Fase II
      const fase2Simple = ['tipo_argumentacion', 'tipo_razonamiento', 'fortalezas_argumentativas',
        'limitaciones_o_fallos', 'hipotesis_secundarias'];
      fase2Simple.forEach(field => {
        if (!argumentation[field] || shouldSkipField(field, argumentation[field])) return;
        b.renderSmartValue(field, argumentation[field]);
      });

      // Otros campos no cubiertos
      const fase2Covered = new Set(['tesis_central', 'estructura_logica', 'argumentos_principales', ...fase2Simple]);
      Object.entries(argumentation).forEach(([k, v]) => {
        if (fase2Covered.has(k) || shouldSkipField(k, v)) return;
        b.renderSmartValue(k, v);
      });
    }

    // ─── Fase III: Análisis Formal y Lingüístico ─────────────────────
    if (Object.keys(linguistics).length > 0) {
      b.addSectionHeader('Fase III: Analisis Formal y Linguistico');

      // Campos que son objetos complejos - renderizar con sub-estructura
      Object.entries(linguistics).forEach(([k, v]) => {
        if (shouldSkipField(k, v)) return;
        b.renderSmartValue(k, v);
      });
    }

    // ─── Fase IV: Análisis Ideológico-Discursivo (ACD) ───────────────
    if (acdData && Object.keys(acdData).filter(k => !shouldSkipField(k, acdData[k])).length > 0) {
      b.addSectionHeader('Fase IV: Analisis Ideologico-Discursivo (ACD)');
      Object.entries(acdData).forEach(([k, v]) => {
        if (shouldSkipField(k, v)) return;
        b.renderSmartValue(k, v);
      });
    }

    // ─── Fuentes Web ─────────────────────────────────────────────────
    if (web_summary || (web_sources && web_sources.length > 0)) {
      b.addSectionHeader('Fuentes Web Consultadas');
      if (web_summary) {
        b.addText(Array.isArray(web_summary) ? web_summary.filter(Boolean).join(' ') : web_summary, 3);
      }
      if (Array.isArray(web_sources)) {
        web_sources.forEach((source, idx) => {
          const title = source.title || 'Fuente';
          const url = source.url ? ` - ${source.url}` : '';
          b.addBullet(`${title}${url}`, 6);
        });
      }
    }

    const fileName = `analisis_prelectura_${new Date().toISOString().slice(0, 10)}.pdf`;
    b.doc.save(fileName);

    return { success: true, message: 'Exportacion PDF iniciada.' };
  } catch (error) {
    console.error('Error al exportar analisis como PDF:', error);
    return { success: false, error: 'No se pudo generar el PDF.' };
  }
};