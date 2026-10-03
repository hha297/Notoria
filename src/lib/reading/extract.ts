import mammoth from "mammoth";
import OpenAI from "openai";
import {
  extractText,
  getDocumentProxy,
  renderPageAsImage,
} from "unpdf";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import { ReadingError } from "@/lib/reading/errors";
import {
  MAX_READING_FILE_SIZE_BYTES,
  READING_DOCX_MIME,
  READING_PDF_MIME,
  resolveReadingMimeType,
} from "@/lib/reading/storage";
import type { ReadingExtractedDocument } from "@/lib/reading/types";
import {
  countWords,
  MAX_PASSAGE_CHARS,
  normalizePassageBody,
  suggestedTitleFromFilename,
} from "@/lib/reading/utils";

const LEGACY_DOC_MIME = "application/msword";
const MIN_EXTRACTED_CHARS = 40;
const MAX_OCR_PAGES = 8;
const OCR_SCALE = 1.4;

export const READING_MAX_UPLOAD_BYTES = MAX_READING_FILE_SIZE_BYTES;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ReadingError("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 120_000 });
}

async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    const rawText =
      typeof result.text === "string" ? result.text : String(result.text ?? "");
    return {
      text: normalizePassageBody(rawText),
      pageCount: pdf.numPages,
    };
  } catch {
    throw new ReadingError("UNSUPPORTED_PARSE");
  }
}

async function ocrPdfPage(
  client: OpenAI,
  imageDataUrl: string,
  pageNumber: number,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4_000,
    messages: [
      {
        role: "system",
        content: await aiSystemPrompt(
          `You OCR a scanned PDF page for a language-learning app.

Rules:
- Extract ALL readable printed text as plain text only.
- Preserve reading order and paragraph breaks.
- Keep headings, lists, and short line breaks when visible.
- Do not invent missing words or translate.
- Ignore decorative marks and page chrome.
- Output text only — no commentary.`,
          { responseStyle: true },
        ),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `OCR page ${pageNumber}. Return the page text only.`,
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl, detail: "high" },
          },
        ],
      },
    ],
  });

  return normalizePassageBody(completion.choices[0]?.message?.content ?? "");
}

async function extractPdfWithOcr(buffer: Buffer): Promise<string> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch {
    throw new ReadingError("UNSUPPORTED_PARSE");
  }

  const pageCount = Math.min(pdf.numPages || 0, MAX_OCR_PAGES);
  if (pageCount < 1) {
    throw new ReadingError("SCANNED_PDF");
  }

  let client: OpenAI;
  try {
    client = getOpenAIClient();
  } catch {
    throw new ReadingError("SCANNED_PDF");
  }

  const parts: string[] = [];
  for (let page = 1; page <= pageCount; page += 1) {
    try {
      const dataUrl = await renderPageAsImage(pdf, page, {
        canvasImport: () => import("@napi-rs/canvas"),
        scale: OCR_SCALE,
        toDataURL: true,
      });
      const pageText = await ocrPdfPage(client, dataUrl, page);
      if (pageText) parts.push(pageText);
    } catch (error) {
      if (error instanceof ReadingError) throw error;
      // Continue other pages; fail only if nothing usable remains.
    }
  }

  const merged = normalizePassageBody(parts.join("\n\n"));
  if (!merged || merged.length < MIN_EXTRACTED_CHARS) {
    throw new ReadingError("SCANNED_PDF");
  }
  return merged;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return normalizePassageBody(result.value);
  } catch {
    throw new ReadingError("UNSUPPORTED_PARSE");
  }
}

export async function extractReadingDocument(input: {
  buffer: Buffer;
  filename: string;
  mimeType?: string | null;
}): Promise<
  ReadingExtractedDocument & { usedOcr?: boolean; truncated?: boolean }
> {
  if (!input.buffer.length) {
    throw new ReadingError("INVALID_FILE");
  }
  if (input.buffer.byteLength > MAX_READING_FILE_SIZE_BYTES) {
    throw new ReadingError("FILE_TOO_LARGE");
  }

  if (
    input.filename.toLowerCase().endsWith(".doc") ||
    (input.mimeType ?? "").toLowerCase() === LEGACY_DOC_MIME
  ) {
    throw new ReadingError("UNSUPPORTED_PARSE");
  }

  const mime = resolveReadingMimeType(input.filename, input.mimeType);
  if (!mime) {
    throw new ReadingError("INVALID_FILE_TYPE");
  }

  let text = "";
  let sourceType: "pdf" | "docx";
  let usedOcr = false;

  if (mime === READING_PDF_MIME) {
    sourceType = "pdf";
    const extracted = await extractPdfText(input.buffer);
    text = extracted.text;
    if (!text || text.length < MIN_EXTRACTED_CHARS) {
      text = await extractPdfWithOcr(input.buffer);
      usedOcr = true;
    }
  } else {
    text = await extractDocxText(input.buffer);
    sourceType = "docx";
    if (!text || text.length < MIN_EXTRACTED_CHARS) {
      throw new ReadingError("EMPTY_CONTENT");
    }
  }

  const truncated = text.length > MAX_PASSAGE_CHARS;
  const body = text.slice(0, MAX_PASSAGE_CHARS);
  return {
    text: body,
    sourceType,
    sourceFilename: input.filename.slice(0, 200),
    suggestedTitle: suggestedTitleFromFilename(input.filename),
    wordCount: countWords(body),
    usedOcr,
    truncated,
  };
}
