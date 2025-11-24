/**
 * Detección heurística de tablas en PDFs y generación de miniaturas.
 *
 * Enfoque MVP:
 * - Usa pdfjs-dist para extraer textContent con posiciones por página.
 * - Agrupa por líneas (Y similar) y detecta bloques con apariencia tabular
 *   (muchos tokens alineados en X u operadores separadores '|' ';' tabs).
 * - Renderiza la página y recorta la región aproximada para devolver miniaturas.
 * - Si el PDF es escaneado (sin textContent útil), devuelve miniaturas de página completas como fallback.
 */

export async function detectTablesAndThumbnails(pdfBuffer, options = {}) {
  const { maxPages = 5, scale = 1.5, regionPadding = 8, thumbnailMaxWidth = 600 } = options;

  let pdfjsLib;
  let createCanvas;
  try {
    ({ default: pdfjsLib } = await import('pdfjs-dist/legacy/build/pdf.js'));
  } catch (e) {
    throw new Error('Dependencia faltante: pdfjs-dist. Instálala con: npm install pdfjs-dist');
  }
  try {
    ({ createCanvas } = await import('@napi-rs/canvas'));
  } catch (e) {
    throw new Error('Dependencia faltante: @napi-rs/canvas. Instálala con: npm install @napi-rs/canvas');
  }

  const loadingTask = pdfjsLib.getDocument({
    data: pdfBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pagesToProcess = Math.min(totalPages, Math.max(1, maxPages));

  const results = [];
  let foundAnyText = false;

  for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    let textContent;
    try {
      textContent = await page.getTextContent();
    } catch {
      textContent = null;
    }

    const tokens = textContent?.items || [];
    if (tokens.length > 0) foundAnyText = true;

    // Agrupar por líneas con tolerancia en Y
    const lines = [];
    const yTolerance = 2.5; // px
    tokens.forEach((item) => {
      const tx = item.transform; // [ a b c d e f ]
      const x = tx[4];
      const y = tx[5];
      // Buscar línea existente cercana en Y
      let line = lines.find((ln) => Math.abs(ln.y - y) <= yTolerance);
      if (!line) {
        line = { y, items: [] };
        lines.push(line);
      }
      line.items.push({ x, y, str: item.str || '' });
    });
    // Ordenar elementos por X
    lines.forEach((ln) => ln.items.sort((a, b) => a.x - b.x));
    // Ordenar líneas por Y descendente (PDF coords usualmente origen abajo)
    lines.sort((a, b) => b.y - a.y);

    // Heurística de línea tipo tabla: >= 3 items, gaps relativamente uniformes o texto con separadores
    const isTableLikeLine = (ln) => {
      if (!ln || ln.items.length < 3) return false;
      const raw = ln.items.map((i) => i.str).join(' ').trim();
      if (/\|/.test(raw) || /\t/.test(raw) || /;/.test(raw)) return true;
      // Chequear uniformidad de gaps
      const gaps = [];
      for (let i = 1; i < ln.items.length; i++) gaps.push(ln.items[i].x - ln.items[i - 1].x);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance = gaps.reduce((a, g) => a + Math.abs(g - avg), 0) / gaps.length;
      return variance < avg * 0.6; // bastante uniformes
    };

    // Detectar runs consecutivos de líneas tabla-like y crear bboxes
    const regions = [];
    let run = [];
    lines.forEach((ln) => {
      if (isTableLikeLine(ln)) {
        run.push(ln);
      } else {
        if (run.length >= 3) {
          regions.push(run);
        }
        run = [];
      }
    });
    if (run.length >= 3) regions.push(run);

    // Calcular cajas y generar miniaturas recortadas
    const pageCanvas = createCanvas(viewport.width, viewport.height);
    const ctx = pageCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const pageThumbs = [];
    for (const reg of regions) {
      const xs = reg.flatMap((ln) => ln.items.map((i) => i.x));
      const ys = reg.flatMap((ln) => ln.items.map((i) => i.y));
      let minX = Math.max(0, Math.min(...xs) - regionPadding);
      let maxX = Math.min(viewport.width, Math.max(...xs) + regionPadding);
      let minY = Math.max(0, Math.min(...ys) - regionPadding);
      let maxY = Math.min(viewport.height, Math.max(...ys) + regionPadding);

      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);

      const outW = Math.min(thumbnailMaxWidth, w);
      const scaleCrop = outW / w;
      const outH = Math.round(h * scaleCrop);

      const cropCanvas = createCanvas(outW, outH);
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(pageCanvas, minX, viewport.height - maxY, w, h, 0, 0, outW, outH);
      const png = cropCanvas.toBuffer('image/png');
      const base64 = `data:image/png;base64,${png.toString('base64')}`;
      pageThumbs.push({ bbox: { minX, minY, maxX, maxY }, image: base64 });
    }

    results.push({ page: pageNum, width: viewport.width, height: viewport.height, tables: pageThumbs });
  }

  // Fallback: si no hubo texto posicional, devolver miniaturas de página completas
  if (!foundAnyText) {
    const thumbs = [];
    for (let pageNum = 1; pageNum <= Math.min(totalPages, 3); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      // Redimensionar a ancho menor
      const targetW = 600;
      const ratio = targetW / viewport.width;
      const out = createCanvas(targetW, Math.round(viewport.height * ratio));
      const octx = out.getContext('2d');
      octx.drawImage(canvas, 0, 0, viewport.width, viewport.height, 0, 0, out.width, out.height);
      const png = out.toBuffer('image/png');
      thumbs.push({ page: pageNum, image: `data:image/png;base64,${png.toString('base64')}` });
    }
    return { pages: totalPages, fallback: true, results: thumbs };
  }

  return { pages: totalPages, fallback: false, results };
}

export default { detectTablesAndThumbnails };
