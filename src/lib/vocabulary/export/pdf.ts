import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFFont,
  PDFHexString,
  PDFName,
  PDFPage,
  rgb,
  type RGB,
} from "pdf-lib";
import { joinMeanings, joinTags } from "@/lib/vocabulary/export/build-document";
import { groupVocabularyExportRows } from "@/lib/vocabulary/export/group-rows";
import type {
  ExportTextRun,
  NoteBlock,
} from "@/lib/vocabulary/export/note-blocks";
import {
  reportProgress,
  yieldToMain,
  type VocabularyExportProgressHandler,
} from "@/lib/vocabulary/export/progress";
import type {
  VocabularyExportDocument,
  VocabularyExportLabels,
  VocabularyExportOptions,
  VocabularyExportRow,
} from "@/lib/vocabulary/export/types";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";
import { PRINT_RGB } from "@/lib/export/print-theme";

function toRgb(parts: readonly [number, number, number]) {
  return rgb(parts[0] / 255, parts[1] / 255, parts[2] / 255);
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 44;
const MARGIN_BOTTOM = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const YIELD_EVERY = 20;

const INK = toRgb(PRINT_RGB.ink);
const MUTED = toRgb(PRINT_RGB.muted);
const HAIRLINE = toRgb(PRINT_RGB.hairline);
const HEADER_FILL = toRgb(PRINT_RGB.ledeWash);
const RULE = toRgb(PRINT_RGB.rule);
const ACCENT = toRgb(PRINT_RGB.accent.vocabulary);
const PAPER = toRgb(PRINT_RGB.paper);
const FOOTER = toRgb(PRINT_RGB.footer);

const FONT_FILES = {
  regular: "IBMPlexSans-Regular.ttf",
  italic: "IBMPlexSans-Italic.ttf",
  bold: "IBMPlexSans-Bold.ttf",
  boldItalic: "IBMPlexSans-BoldItalic.ttf",
} as const;

type FontSet = {
  regular: PDFFont;
  italic: PDFFont;
  bold: PDFFont;
  boldItalic: PDFFont;
};

type LinePart = {
  text: string;
  font: PDFFont;
  width: number;
};

let fontBytesPromise: Promise<
  Record<keyof typeof FONT_FILES, Uint8Array>
> | null = null;

async function readFontFile(filename: string): Promise<Uint8Array> {
  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return new Uint8Array(
      await readFile(join(process.cwd(), "public/fonts", filename)),
    );
  }

  const response = await fetch(`${window.location.origin}/fonts/${filename}`);
  if (!response.ok) {
    throw new Error(`Font load failed: ${filename} (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function loadFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = (async () => {
      const [regular, italic, bold, boldItalic] = await Promise.all([
        readFontFile(FONT_FILES.regular),
        readFontFile(FONT_FILES.italic),
        readFontFile(FONT_FILES.bold),
        readFontFile(FONT_FILES.boldItalic),
      ]);
      return { regular, italic, bold, boldItalic };
    })().catch((error) => {
      fontBytesPromise = null;
      throw error;
    });
  }
  return fontBytesPromise;
}

async function embedFonts(pdf: PDFDocument): Promise<FontSet> {
  pdf.registerFontkit(fontkit);
  const bytes = await loadFontBytes();
  const [regular, italic, bold, boldItalic] = await Promise.all([
    pdf.embedFont(bytes.regular, { subset: true }),
    pdf.embedFont(bytes.italic, { subset: true }),
    pdf.embedFont(bytes.bold, { subset: true }),
    pdf.embedFont(bytes.boldItalic, { subset: true }),
  ]);
  return { regular, italic, bold, boldItalic };
}

function pickFont(fonts: FontSet, run: Pick<ExportTextRun, "bold" | "italic">) {
  if (run.bold && run.italic) return fonts.boldItalic;
  if (run.bold) return fonts.bold;
  if (run.italic) return fonts.italic;
  return fonts.regular;
}

function wrapPlain(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const clean = sanitizeExportText(text);
  if (!clean) return [];
  const paragraphs = clean.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
        continue;
      }
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }
      let chunk = "";
      for (const char of word) {
        const trial = chunk + char;
        if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
          chunk = trial;
        } else {
          if (chunk) lines.push(chunk);
          chunk = char;
        }
      }
      current = chunk;
    }
    if (current) lines.push(current);
  }

  return lines;
}

function wrapRuns(
  runs: ExportTextRun[],
  fonts: FontSet,
  size: number,
  maxWidth: number,
): LinePart[][] {
  const lines: LinePart[][] = [[]];
  let lineWidth = 0;

  const pushPart = (text: string, font: PDFFont) => {
    if (!text) return;
    const width = font.widthOfTextAtSize(text, size);
    const line = lines[lines.length - 1]!;
    line.push({ text, font, width });
    lineWidth += width;
  };

  const breakLine = () => {
    lines.push([]);
    lineWidth = 0;
  };

  for (const run of runs) {
    const font = pickFont(fonts, run);
    const pieces = sanitizeExportText(run.text).split(/(\n)/);
    for (const piece of pieces) {
      if (piece === "\n") {
        breakLine();
        continue;
      }
      const tokens = piece.split(/(\s+)/);
      for (const token of tokens) {
        if (!token) continue;
        const width = font.widthOfTextAtSize(token, size);
        if (lineWidth > 0 && lineWidth + width > maxWidth) {
          breakLine();
          const trimmed = token.replace(/^\s+/, "");
          if (!trimmed) continue;
          const trimmedWidth = font.widthOfTextAtSize(trimmed, size);
          if (trimmedWidth <= maxWidth) {
            pushPart(trimmed, font);
            continue;
          }
        }
        if (width > maxWidth && !/^\s+$/.test(token)) {
          let chunk = "";
          for (const char of token) {
            const trial = chunk + char;
            if (font.widthOfTextAtSize(trial, size) <= maxWidth || !chunk) {
              chunk = trial;
            } else {
              pushPart(chunk, font);
              breakLine();
              chunk = char;
            }
          }
          if (chunk) pushPart(chunk, font);
          continue;
        }
        pushPart(token, font);
      }
    }
  }

  return lines.filter((line, index) => line.length > 0 || index === 0);
}

class PdfWriter {
  page: PDFPage;
  y: number;

  constructor(
    private readonly pdf: PDFDocument,
    private readonly fonts: FontSet,
  ) {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.paintPaper();
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  remaining() {
    return this.y - MARGIN_BOTTOM;
  }

  ensureSpace(height: number) {
    if (height <= this.remaining()) return;
    this.newPage();
  }

  bookmarkDest() {
    return { page: this.page, y: this.y };
  }

  paintPaper() {
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: PAPER,
    });
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.paintPaper();
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  drawLine(color: RGB = HAIRLINE, thickness = 0.6) {
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN_X, y: this.y },
      thickness,
      color,
    });
  }

  advance(amount: number) {
    this.y -= amount;
  }

  drawPlain(
    text: string,
    opts: {
      font?: PDFFont;
      size: number;
      color?: RGB;
      lineHeight?: number;
      width?: number;
      x?: number;
    },
  ) {
    const font = opts.font ?? this.fonts.regular;
    const lineHeight = opts.lineHeight ?? opts.size * 1.35;
    const width = opts.width ?? CONTENT_WIDTH;
    const x = opts.x ?? MARGIN_X;
    const lines = wrapPlain(text, font, opts.size, width);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x,
        y: this.y - opts.size,
        size: opts.size,
        font,
        color: opts.color ?? INK,
      });
      this.y -= lineHeight;
    }
  }

  drawRuns(
    runs: ExportTextRun[],
    opts: {
      size: number;
      color?: RGB;
      lineHeight?: number;
      width?: number;
      x?: number;
    },
  ) {
    const lineHeight = opts.lineHeight ?? opts.size * 1.4;
    const width = opts.width ?? CONTENT_WIDTH;
    const x = opts.x ?? MARGIN_X;
    const lines = wrapRuns(runs, this.fonts, opts.size, width);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      let cursor = x;
      for (const part of line) {
        this.page.drawText(part.text, {
          x: cursor,
          y: this.y - opts.size,
          size: opts.size,
          font: part.font,
          color: opts.color ?? INK,
        });
        cursor += part.width;
      }
      this.y -= lineHeight;
    }
  }
}

function headingSize(level: number) {
  if (level <= 1) return 11;
  if (level === 2) return 10;
  return 9;
}

function metaLine(row: VocabularyExportRow, options: VocabularyExportOptions) {
  const parts: string[] = [];
  if (options.includePartOfSpeech && row.partOfSpeech.trim()) {
    parts.push(row.partOfSpeech.trim());
  }
  if (options.includeTags) {
    const tags = joinTags(row.tags);
    if (tags) parts.push(tags);
  }
  if (options.includeLastUpdated && row.updatedAt.trim()) {
    parts.push(row.updatedAt.trim());
  }
  return parts.join("   ·   ");
}

function drawTable(
  writer: PdfWriter,
  fonts: FontSet,
  rows: ExportTextRun[][][],
) {
  const colCount = Math.max(1, ...rows.map((row) => row.length));
  const colWidth = CONTENT_WIDTH / colCount;
  const size = colCount > 6 ? 7 : 8;
  const padX = 5;
  const padY = 4;
  const lineHeight = size * 1.3;
  const innerWidth = Math.max(24, colWidth - padX * 2);

  const wrapped = rows.map((row) =>
    Array.from({ length: colCount }, (_, index) =>
      wrapRuns(row[index] ?? [], fonts, size, innerWidth),
    ),
  );

  wrapped.forEach((row, rowIndex) => {
    const rowHeight =
      Math.max(...row.map((cell) => Math.max(cell.length, 1))) * lineHeight +
      padY * 2;
    writer.ensureSpace(rowHeight);
    const top = writer.y;
    const bottom = top - rowHeight;

    writer.page.drawRectangle({
      x: MARGIN_X,
      y: bottom,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: rowIndex === 0 ? HEADER_FILL : undefined,
      borderColor: HAIRLINE,
      borderWidth: 0.6,
    });

    for (let col = 1; col < colCount; col += 1) {
      const x = MARGIN_X + col * colWidth;
      writer.page.drawLine({
        start: { x, y: top },
        end: { x, y: bottom },
        thickness: 0.6,
        color: HAIRLINE,
      });
    }

    row.forEach((cell, col) => {
      let textY = top - padY - size;
      const x = MARGIN_X + col * colWidth + padX;
      for (const line of cell) {
        let cursor = x;
        for (const part of line) {
          writer.page.drawText(part.text, {
            x: cursor,
            y: textY,
            size,
            font: rowIndex === 0 ? fonts.bold : part.font,
            color: INK,
          });
          cursor += part.width;
        }
        textY -= lineHeight;
      }
    });

    writer.advance(rowHeight);
  });
}

function drawNoteBlocks(
  writer: PdfWriter,
  fonts: FontSet,
  blocks: NoteBlock[],
) {
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        writer.advance(4);
        writer.drawRuns(block.runs, {
          size: headingSize(block.level),
          lineHeight: headingSize(block.level) * 1.3,
        });
        writer.advance(2);
        break;
      case "paragraph":
        writer.drawRuns(block.runs, { size: 9, lineHeight: 13 });
        writer.advance(3);
        break;
      case "list":
        block.items.forEach((item, index) => {
          const marker = block.ordered ? `${index + 1}.` : "•";
          writer.ensureSpace(13);
          writer.page.drawText(marker, {
            x: MARGIN_X,
            y: writer.y - 9,
            size: 9,
            font: fonts.regular,
            color: MUTED,
          });
          const savedY = writer.y;
          writer.drawRuns(item, {
            size: 9,
            lineHeight: 13,
            x: MARGIN_X + 14,
            width: CONTENT_WIDTH - 14,
          });
          if (writer.y === savedY) writer.advance(13);
        });
        writer.advance(3);
        break;
      case "table":
        writer.advance(2);
        drawTable(writer, fonts, block.rows);
        writer.advance(8);
        break;
      case "code":
        writer.drawPlain(block.text, {
          size: 8,
          color: MUTED,
          lineHeight: 11,
        });
        writer.advance(4);
        break;
      case "rule":
        writer.advance(4);
        writer.drawLine(HAIRLINE);
        writer.advance(8);
        break;
    }
  }
}

function drawEntry(
  writer: PdfWriter,
  fonts: FontSet,
  row: VocabularyExportRow,
  options: VocabularyExportOptions,
  labels: VocabularyExportLabels,
) {
  const word = sanitizeExportText(row.word) || "—";
  const meta = metaLine(row, options);
  const meanings = joinMeanings(row.meanings);
  const headerHeight = 18 + (meta ? 12 : 0) + (meanings ? 14 : 0) + 8;
  writer.ensureSpace(Math.min(headerHeight, 72));

  writer.drawPlain(word, {
    font: fonts.bold,
    size: 13,
    color: INK,
    lineHeight: 16,
  });
  if (meta) {
    writer.drawPlain(meta, {
      size: 8,
      color: MUTED,
      lineHeight: 11,
    });
  }
  if (meanings) {
    writer.advance(2);
    writer.drawPlain(meanings, {
      size: 10,
      lineHeight: 14,
    });
  }

  if (options.includeNotes && row.noteBlocks.length) {
    writer.advance(5);
    writer.drawPlain(sanitizeExportText(labels.notesHeading), {
      font: fonts.bold,
      size: 8,
      color: ACCENT,
      lineHeight: 11,
    });
    writer.advance(1);
    drawNoteBlocks(writer, fonts, row.noteBlocks);
  }
}

function drawCover(
  writer: PdfWriter,
  fonts: FontSet,
  document: VocabularyExportDocument,
  labels: VocabularyExportLabels,
) {
  writer.drawPlain(sanitizeExportText(labels.documentHeading), {
    font: fonts.bold,
    size: 9,
    color: ACCENT,
    lineHeight: 12,
  });
  writer.advance(6);
  const workspace = sanitizeExportText(document.workspaceName);
  if (workspace) {
    writer.drawPlain(workspace, {
      font: fonts.bold,
      size: 22,
      lineHeight: 26,
    });
    writer.advance(4);
  }
  writer.drawPlain(sanitizeExportText(labels.wordCount), {
    size: 10,
    color: MUTED,
    lineHeight: 14,
  });
  writer.advance(10);
  writer.drawLine(ACCENT, 2);
  writer.advance(16);
}

function drawPosSection(
  writer: PdfWriter,
  fonts: FontSet,
  title: string,
  countLabel: string,
) {
  writer.ensureSpace(52);
  const dest = writer.bookmarkDest();
  writer.drawPlain(sanitizeExportText(title).toLocaleUpperCase(), {
    font: fonts.bold,
    size: 9,
    color: ACCENT,
    lineHeight: 13,
  });
  writer.drawPlain(sanitizeExportText(countLabel), {
    size: 8,
    color: MUTED,
    lineHeight: 11,
  });
  writer.advance(8);
  return dest;
}

function applyPdfOutline(
  pdf: PDFDocument,
  rootTitle: string,
  root: { page: PDFPage; y: number },
  sections: Array<{ title: string; page: PDFPage; y: number }>,
) {
  if (!sections.length) return;

  const context = pdf.context;
  const outlinesRef = context.nextRef();
  const rootRef = context.nextRef();
  const sectionRefs = sections.map(() => context.nextRef());
  const firstSection = sectionRefs[0]!;
  const lastSection = sectionRefs[sectionRefs.length - 1]!;

  context.assign(
    rootRef,
    context.obj({
      Title: PDFHexString.fromText(rootTitle),
      Parent: outlinesRef,
      Dest: [root.page.ref, "XYZ", null, root.y, null],
      Count: sections.length,
      First: firstSection,
      Last: lastSection,
    }),
  );

  sections.forEach((section, index) => {
    context.assign(
      sectionRefs[index]!,
      context.obj({
        Title: PDFHexString.fromText(section.title),
        Parent: rootRef,
        Dest: [section.page.ref, "XYZ", null, section.y, null],
        ...(index > 0 ? { Prev: sectionRefs[index - 1] } : {}),
        ...(index < sectionRefs.length - 1
          ? { Next: sectionRefs[index + 1] }
          : {}),
      }),
    );
  });

  context.assign(
    outlinesRef,
    context.obj({
      Type: "Outlines",
      First: rootRef,
      Last: rootRef,
      Count: sections.length + 1,
    }),
  );
  pdf.catalog.set(PDFName.of("Outlines"), outlinesRef);
}

function stampFooters(pdf: PDFDocument, fonts: FontSet) {
  const pages = pdf.getPages();
  const total = pages.length;
  pages.forEach((page, index) => {
    const label = `Notoria  ·  ${index + 1} / ${total}`;
    const width = fonts.regular.widthOfTextAtSize(label, 8);
    page.drawText(label, {
      x: (PAGE_WIDTH - width) / 2,
      y: 24,
      size: 8,
      font: fonts.regular,
      color: FOOTER,
    });
  });
}

export async function generateVocabularyPdfBlob(
  document: VocabularyExportDocument,
  labels: VocabularyExportLabels,
  options: VocabularyExportOptions,
  onProgress?: VocabularyExportProgressHandler,
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(labels.documentHeading);
  pdf.setCreator("Notoria");
  const fonts = await embedFonts(pdf);
  const writer = new PdfWriter(pdf, fonts);
  const coverDest = writer.bookmarkDest();

  reportProgress(onProgress, {
    phase: "generating",
    current: 0,
    total: document.rows.length,
  });

  drawCover(writer, fonts, document, labels);

  const groups = groupVocabularyExportRows(
    document.rows,
    labels.uncategorizedPos ?? "—",
  );
  const formatCount =
    labels.formatWordCount ?? ((count: number) => String(count));
  const sectionBookmarks: Array<{
    title: string;
    page: PDFPage;
    y: number;
  }> = [];
  let rendered = 0;

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex]!;
    if (groupIndex > 0) writer.advance(8);
    const dest = drawPosSection(
      writer,
      fonts,
      group.title,
      formatCount(group.items.length),
    );
    sectionBookmarks.push({
      title: group.title,
      page: dest.page,
      y: dest.y,
    });

    for (let index = 0; index < group.items.length; index += 1) {
      if (index > 0) {
        writer.advance(3);
        writer.drawLine(RULE, 0.4);
        writer.advance(8);
      }
      drawEntry(writer, fonts, group.items[index]!, options, labels);
      rendered += 1;

      if (rendered % YIELD_EVERY === 0 || rendered === document.rows.length) {
        reportProgress(onProgress, {
          phase: "generating",
          current: rendered,
          total: document.rows.length,
        });
        await yieldToMain();
      }
    }
  }

  applyPdfOutline(
    pdf,
    sanitizeExportText(labels.documentHeading) || "Vocabulary",
    coverDest,
    sectionBookmarks,
  );

  stampFooters(pdf, fonts);
  reportProgress(onProgress, {
    phase: "saving",
    current: document.rows.length,
    total: document.rows.length,
  });
  const bytes = await pdf.save();
  const payload = new Uint8Array(bytes.byteLength);
  payload.set(bytes);
  return new Blob([payload], { type: "application/pdf" });
}
