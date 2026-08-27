// ============================================================
// AssurZen PDF Builder — helpers partagés
// Utilisé par l'Edge Function generer-pdf
// Basé sur pdf-lib (pure JS, compatible Deno)
// ============================================================

import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, degrees } from 'https://esm.sh/pdf-lib@1.17.1';

// ── Palette AssurZen ─────────────────────────────────────────
export const COLORS = {
  navy:       rgb(0.039, 0.086, 0.157),   // #0A1628
  navyMid:    rgb(0.075, 0.133, 0.251),   // #132240
  green:      rgb(0.000, 0.784, 0.459),   // #00C875
  greenDark:  rgb(0.000, 0.639, 0.369),   // #00A35E
  amber:      rgb(1.000, 0.690, 0.125),   // #FFB020
  white:      rgb(1, 1, 1),
  black:      rgb(0, 0, 0),
  gray100:    rgb(0.961, 0.961, 0.961),
  gray300:    rgb(0.800, 0.800, 0.800),
  gray500:    rgb(0.420, 0.482, 0.553),   // #6B7A8D
  gray700:    rgb(0.220, 0.267, 0.329),
  red:        rgb(0.859, 0.149, 0.149),
};

// ── Page size A4 ─────────────────────────────────────────────
export const A4 = { width: 595.28, height: 841.89 };
export const MARGIN = 48;
export const CONTENT_WIDTH = A4.width - MARGIN * 2;

// ── Fonts loader ─────────────────────────────────────────────
export async function loadFonts(doc: PDFDocument) {
  const [regular, bold, italic] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique),
  ]);
  return { regular, bold, italic };
}

export type Fonts = Awaited<ReturnType<typeof loadFonts>>;

// ── Text helper ───────────────────────────────────────────────
export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: {
    font: PDFFont;
    size?: number;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  }
) {
  const { font, size = 10, color = COLORS.black, maxWidth } = opts;
  let displayText = String(text ?? '');

  // Truncate if too wide
  if (maxWidth) {
    while (displayText.length > 3 && font.widthOfTextAtSize(displayText, size) > maxWidth) {
      displayText = displayText.slice(0, -1);
    }
    if (displayText !== String(text ?? '')) displayText += '…';
  }

  page.drawText(displayText, { x, y, font, size, color });
}

// ── Multi-line text ───────────────────────────────────────────
export function drawMultilineText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: { font: PDFFont; size?: number; color?: ReturnType<typeof rgb>; lineHeight?: number; maxWidth: number }
): number {
  const { font, size = 10, color = COLORS.gray700, lineHeight = 14, maxWidth } = opts;
  const words = String(text ?? '').split(' ');
  let line = '';
  let curY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      drawText(page, line, x, curY, { font, size, color });
      curY -= lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    drawText(page, line, x, curY, { font, size, color });
    curY -= lineHeight;
  }
  return curY; // returns new Y position
}

// ── Rectangle ────────────────────────────────────────────────
export function drawRect(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  color: ReturnType<typeof rgb>,
  borderColor?: ReturnType<typeof rgb>,
  borderWidth = 1
) {
  page.drawRectangle({
    x, y, width: w, height: h,
    color,
    borderColor,
    borderWidth: borderColor ? borderWidth : 0,
  });
}

// ── Horizontal rule ───────────────────────────────────────────
export function drawHRule(page: PDFPage, y: number, color = COLORS.gray300) {
  page.drawLine({
    start: { x: MARGIN, y },
    end:   { x: A4.width - MARGIN, y },
    thickness: 0.5,
    color,
  });
}

// ── Header commun AssurZen ────────────────────────────────────
export function drawHeader(
  page: PDFPage,
  fonts: Fonts,
  opts: { title: string; subtitle?: string; docNumber?: string; date?: string }
) {
  const { title, subtitle, docNumber, date } = opts;

  // Navy band
  drawRect(page, 0, A4.height - 90, A4.width, 90, COLORS.navy);

  // Green accent bar
  drawRect(page, 0, A4.height - 90, 6, 90, COLORS.green);

  // Logo text
  drawText(page, 'AssurZen', MARGIN, A4.height - 32, {
    font: fonts.bold, size: 22, color: COLORS.green,
  });
  drawText(page, 'ERP Assurance', MARGIN, A4.height - 48, {
    font: fonts.regular, size: 9, color: COLORS.white,
  });

  // Document title (right-aligned)
  const titleW = fonts.bold.widthOfTextAtSize(title, 16);
  drawText(page, title, A4.width - MARGIN - titleW, A4.height - 32, {
    font: fonts.bold, size: 16, color: COLORS.white,
  });

  if (subtitle) {
    const subW = fonts.regular.widthOfTextAtSize(subtitle, 9);
    drawText(page, subtitle, A4.width - MARGIN - subW, A4.height - 50, {
      font: fonts.regular, size: 9, color: COLORS.gray300,
    });
  }

  if (docNumber) {
    drawText(page, docNumber, MARGIN, A4.height - 72, {
      font: fonts.regular, size: 8, color: COLORS.gray300,
    });
  }
  if (date) {
    const dateW = fonts.regular.widthOfTextAtSize(date, 8);
    drawText(page, date, A4.width - MARGIN - dateW, A4.height - 72, {
      font: fonts.regular, size: 8, color: COLORS.gray300,
    });
  }
}

// ── Footer commun ─────────────────────────────────────────────
export function drawFooter(page: PDFPage, fonts: Fonts, pageNum?: number, total?: number) {
  const y = 28;
  drawHRule(page, y + 14);

  drawText(page, 'AssurZen — Document généré automatiquement — Valable avec tampon et signature', MARGIN, y, {
    font: fonts.italic, size: 7, color: COLORS.gray500,
  });

  if (pageNum && total) {
    const pg = `Page ${pageNum}/${total}`;
    const pgW = fonts.regular.widthOfTextAtSize(pg, 8);
    drawText(page, pg, A4.width - MARGIN - pgW, y, {
      font: fonts.regular, size: 8, color: COLORS.gray500,
    });
  }
}

// ── Info block (label + value pairs) ─────────────────────────
export function drawInfoBlock(
  page: PDFPage,
  fonts: Fonts,
  items: Array<[string, string]>,
  x: number,
  startY: number,
  colWidth: number,
  lineH = 16
): number {
  let y = startY;
  for (const [label, value] of items) {
    drawText(page, label, x, y, { font: fonts.regular, size: 8, color: COLORS.gray500 });
    drawText(page, value || '—', x, y - 11, { font: fonts.bold, size: 9, color: COLORS.gray700, maxWidth: colWidth });
    y -= lineH * 2;
  }
  return y;
}

// ── 2-column section ─────────────────────────────────────────
export function drawTwoColSection(
  page: PDFPage,
  fonts: Fonts,
  title: string,
  leftItems: Array<[string, string]>,
  rightItems: Array<[string, string]>,
  startY: number
): number {
  // Title bar
  drawRect(page, MARGIN, startY - 4, CONTENT_WIDTH, 20, COLORS.navy);
  drawText(page, title, MARGIN + 8, startY + 4, { font: fonts.bold, size: 9, color: COLORS.white });

  const y2 = startY - 30;
  const halfW = CONTENT_WIDTH / 2 - 8;
  const lEnd = drawInfoBlock(page, fonts, leftItems,  MARGIN, y2, halfW);
  const rEnd = drawInfoBlock(page, fonts, rightItems, MARGIN + CONTENT_WIDTH / 2, y2, halfW);
  return Math.min(lEnd, rEnd) - 8;
}

// ── Table ─────────────────────────────────────────────────────
export function drawTable(
  page: PDFPage,
  fonts: Fonts,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  startY: number,
  rowH = 20
): number {
  let y = startY;

  // Header row
  drawRect(page, MARGIN, y - rowH + 4, CONTENT_WIDTH, rowH, COLORS.navyMid);
  let x = MARGIN + 6;
  for (let i = 0; i < headers.length; i++) {
    drawText(page, headers[i], x, y - 10, { font: fonts.bold, size: 8, color: COLORS.white });
    x += colWidths[i];
  }
  y -= rowH;

  // Data rows
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const bg = ri % 2 === 0 ? COLORS.gray100 : COLORS.white;
    drawRect(page, MARGIN, y - rowH + 4, CONTENT_WIDTH, rowH, bg, COLORS.gray300, 0.3);

    x = MARGIN + 6;
    for (let ci = 0; ci < row.length; ci++) {
      drawText(page, row[ci] ?? '—', x, y - 11, {
        font: ci === 0 ? fonts.bold : fonts.regular,
        size: 8,
        color: COLORS.gray700,
        maxWidth: colWidths[ci] - 4,
      });
      x += colWidths[ci];
    }
    y -= rowH;
  }

  return y - 4;
}

// ── Stamp zone (signature + cachet) ──────────────────────────
export function drawStampZone(page: PDFPage, fonts: Fonts, y: number) {
  const boxW = 180;
  const boxH = 70;
  const rightX = A4.width - MARGIN - boxW;

  drawRect(page, rightX, y - boxH, boxW, boxH, COLORS.white, COLORS.gray300);
  drawText(page, 'Signature et cachet de l\'assureur', rightX + 10, y - 14, {
    font: fonts.italic, size: 7, color: COLORS.gray500,
  });

  // Left: date
  drawRect(page, MARGIN, y - boxH, boxW, boxH, COLORS.white, COLORS.gray300);
  drawText(page, 'Date et signature du souscripteur', MARGIN + 10, y - 14, {
    font: fonts.italic, size: 7, color: COLORS.gray500,
  });
}

// ── Watermark SPECIMEN ────────────────────────────────────────
export function drawWatermark(page: PDFPage, fonts: Fonts) {
  page.drawText('SPECIMEN', {
    x: 140, y: 380,
    font: fonts.bold, size: 72,
    color: rgb(0.9, 0.9, 0.9),
    rotate: degrees(35),
    opacity: 0.15,
  });
}

// ── Format helpers ────────────────────────────────────────────
export function fmtCurrency(n: number, devise = 'FCFA') {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' ' + devise;
}

export function fmtDate(d: string) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    .format(new Date(d));
}

export function fmtDateShort(d: string) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(d));
}
