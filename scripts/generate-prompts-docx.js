/**
 * Genera DOCX del documento de prompts para expertos en pedagogía.
 * 
 * Formato: Arial, todo negro, títulos 14pt, cuerpo 12pt, sin negritas de énfasis.
 * Uso: node scripts/generate-prompts-docx.js
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, convertInchesToTwip, TabStopPosition, TabStopType,
  Header, Footer, PageNumber
} = require('docx');
const fs = require('fs');
const path = require('path');

const FONT = 'Arial';
const COLOR = '000000';
const BODY_SIZE = 24;     // 12pt * 2
const TITLE_SIZE = 28;    // 14pt * 2
const CODE_SIZE = 20;     // 10pt * 2
const SMALL_SIZE = 20;    // 10pt * 2

// ═══════════════════════════════════════════════════════════
// MARKDOWN PARSER
// ═══════════════════════════════════════════════════════════

function readMarkdown() {
  const mdPath = path.join(__dirname, '..', 'PROMPTS_DISENO_IA_TUTOR_Y_ARTEFACTOS.md');
  return fs.readFileSync(mdPath, 'utf-8');
}

/**
 * Strip markdown bold/italic markers and link syntax from text.
 * Returns plain text (no emphasis in final doc per user request).
 */
function stripMd(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g, '$1')        // *italic*
    .replace(/`([^`]+)`/g, '$1')        // `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url)
    .replace(/^\s*>\s?/gm, '')          // blockquote >
    .trim();
}

/** Create a text run with standard formatting */
function textRun(text, opts = {}) {
  return new TextRun({
    text: text,
    font: opts.font || FONT,
    size: opts.size || BODY_SIZE,
    color: COLOR,
    bold: opts.bold || false,
    italics: opts.italics || false,
    break: opts.break,
  });
}

/** Create a standard body paragraph */
function bodyParagraph(text, opts = {}) {
  const clean = stripMd(text);
  if (!clean) return null;
  return new Paragraph({
    spacing: { after: 120, before: opts.before || 0, line: 276 },
    indent: opts.indent ? { left: convertInchesToTwip(0.3) } : undefined,
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    children: [textRun(clean, { size: opts.size || BODY_SIZE })],
  });
}

/** Create a heading paragraph */
function heading(text, level) {
  const clean = stripMd(text);
  return new Paragraph({
    spacing: { before: level <= 2 ? 360 : 240, after: 120, line: 276 },
    children: [textRun(clean, { size: TITLE_SIZE, bold: true })],
  });
}

/** Parse a markdown table into rows of cells */
function parseTableRows(lines) {
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    // Skip separator rows like |---|---|
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;
    const cells = trimmed.split('|').slice(1, -1).map(c => stripMd(c.trim()));
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/** Build a docx Table from parsed rows */
function buildTable(rows) {
  if (rows.length === 0) return null;
  const maxCols = Math.max(...rows.map(r => r.length));
  const colWidth = Math.floor(9000 / maxCols);

  const tableRows = rows.map((row, rowIdx) => {
    const cells = [];
    for (let i = 0; i < maxCols; i++) {
      const cellText = (row[i] || '').trim();
      const isHeader = rowIdx === 0;
      cells.push(
        new TableCell({
          width: { size: colWidth, type: WidthType.DXA },
          shading: isHeader
            ? { fill: 'D9D9D9', type: ShadingType.CLEAR }
            : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
          },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [textRun(cellText, { size: BODY_SIZE })],
            })
          ],
        })
      );
    }
    return new TableRow({ children: cells });
  });

  return new Table({
    rows: tableRows,
    width: { size: 9000, type: WidthType.DXA },
  });
}

/** Build code block paragraphs (prompt fragments) with light gray background */
function buildCodeBlock(lines) {
  const paragraphs = [];
  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 0, line: 240 },
        shading: { fill: 'F2F2F2', type: ShadingType.CLEAR },
        indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
        children: [
          textRun(line || ' ', { size: CODE_SIZE, font: 'Consolas' }),
        ],
      })
    );
  }
  // Add small spacer after code block
  paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  return paragraphs;
}

/** Build a blockquote paragraph */
function buildBlockquote(text) {
  const clean = stripMd(text);
  if (!clean) return null;
  return new Paragraph({
    spacing: { after: 120, before: 60, line: 276 },
    indent: { left: convertInchesToTwip(0.4) },
    border: {
      left: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 8 },
    },
    children: [textRun(clean, { size: BODY_SIZE, italics: true })],
  });
}

/** Build bullet list item */
function buildBulletItem(text, level = 0) {
  const clean = stripMd(text);
  return new Paragraph({
    spacing: { after: 60, line: 276 },
    indent: { left: convertInchesToTwip(0.3 + level * 0.3), hanging: convertInchesToTwip(0.2) },
    children: [
      textRun('• ', { size: BODY_SIZE }),
      textRun(clean, { size: BODY_SIZE }),
    ],
  });
}

/** Build numbered list item */
function buildNumberedItem(text, number) {
  const clean = stripMd(text);
  return new Paragraph({
    spacing: { after: 60, line: 276 },
    indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.25) },
    children: [
      textRun(`${number}. `, { size: BODY_SIZE }),
      textRun(clean, { size: BODY_SIZE }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// MAIN DOCUMENT BUILDER
// ═══════════════════════════════════════════════════════════

function buildDocument() {
  const md = readMarkdown();
  const lines = md.split('\n');
  const children = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed || trimmed === '---' || trimmed === '````' || trimmed === '````markdown') {
      i++;
      continue;
    }

    // ── Headings ──
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      children.push(heading(trimmed.replace(/^#\s+/, ''), 1));
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      children.push(heading(trimmed.replace(/^##\s+/, ''), 2));
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      children.push(heading(trimmed.replace(/^###\s+/, ''), 3));
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      children.push(heading(trimmed.replace(/^####\s+/, ''), 4));
      i++;
      continue;
    }

    // ── Code blocks ──
    if (trimmed.startsWith('```')) {
      i++; // skip opening ```
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      children.push(...buildCodeBlock(codeLines));
      continue;
    }

    // ── Tables ──
    if (trimmed.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseTableRows(tableLines);
      const table = buildTable(rows);
      if (table) {
        children.push(table);
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }
      continue;
    }

    // ── Blockquotes (possibly multi-line) ──
    if (trimmed.startsWith('>')) {
      let quoteText = '';
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const qLine = lines[i].trim().replace(/^>\s?/, '');
        // Handle numbered items inside blockquotes
        quoteText += (quoteText ? ' ' : '') + qLine;
        i++;
      }
      const bq = buildBlockquote(quoteText);
      if (bq) children.push(bq);
      continue;
    }

    // ── Bullet lists ──
    if (/^[-*]\s/.test(trimmed)) {
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        const bulletLine = lines[i];
        const level = bulletLine.match(/^(\s*)/)[1].length >= 2 ? 1 : 0;
        const text = bulletLine.replace(/^\s*[-*]\s+/, '');
        children.push(buildBulletItem(text, level));
        i++;
      }
      continue;
    }

    // ── Numbered lists ──
    if (/^\d+\.\s/.test(trimmed)) {
      let num = 1;
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^\d+\.\s+/, '');
        children.push(buildNumberedItem(text, num));
        num++;
        i++;
      }
      continue;
    }

    // ── Regular paragraph ──
    // Collect continuation lines (non-empty, non-special)
    let paraText = trimmed;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('---') &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !/^\d+\.\s/.test(lines[i].trim())
    ) {
      paraText += ' ' + lines[i].trim();
      i++;
    }
    const p = bodyParagraph(paraText);
    if (p) children.push(p);
  }

  // ── Build final document ──
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: BODY_SIZE,
            color: COLOR,
          },
          paragraph: {
            spacing: { line: 276 },
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.18),
            right: convertInchesToTwip(1.18),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                textRun('AppLectura — Diseño de Prompts de IA', { size: SMALL_SIZE, italics: true }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                textRun('Página ', { size: SMALL_SIZE }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: FONT,
                  size: SMALL_SIZE,
                  color: COLOR,
                }),
                textRun(' de ', { size: SMALL_SIZE }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  font: FONT,
                  size: SMALL_SIZE,
                  color: COLOR,
                }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });

  return doc;
}

// ═══════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('Generando DOCX...');
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);

  const desktopPath = path.join(require('os').homedir(), 'Desktop');
  const outPath = path.join(desktopPath, 'PROMPTS_DISENO_IA_TUTOR_Y_ARTEFACTOS.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Documento generado: ${outPath}`);
  console.log(`   Tamaño: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
