import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { parseCsv } from "@/lib/content-import/csv";
import {
  detectContentFormat,
  titleFromFilename,
} from "@/lib/content-import/detect";
import type {
  ContentExtract,
  ContentImportFormat,
} from "@/lib/content-import/types";

export class ContentImportExtractError extends Error {
  code:
    | "UNSUPPORTED_FORMAT"
    | "LEGACY_DOC"
    | "EMPTY_FILE"
    | "PARSE_FAILED"
    | "FILE_TOO_LARGE";

  constructor(
    code: ContentImportExtractError["code"],
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ContentImportExtractError";
    this.code = code;
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    const rawText =
      typeof result.text === "string" ? result.text : String(result.text ?? "");
    return rawText
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    throw new ContentImportExtractError("PARSE_FAILED");
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    throw new ContentImportExtractError("PARSE_FAILED");
  }
}

export async function extractContentFromBuffer(input: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string | null;
}): Promise<{ format: ContentImportFormat; extract: ContentExtract }> {
  const format = detectContentFormat({
    name: input.fileName,
    type: input.mimeType,
  });

  if (!format) {
    const ext = input.fileName.split(".").pop()?.toLowerCase();
    if (ext === "doc") {
      throw new ContentImportExtractError(
        "LEGACY_DOC",
        "Old .doc Word files aren't supported. Save as .docx or PDF and try again.",
      );
    }
    throw new ContentImportExtractError(
      "UNSUPPORTED_FORMAT",
      "Use a CSV, PDF, DOCX, or plain text file.",
    );
  }

  if (format === "csv") {
    const text = input.buffer.toString("utf8");
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      throw new ContentImportExtractError(
        "EMPTY_FILE",
        "We couldn't find any columns in this CSV.",
      );
    }
    return {
      format,
      extract: {
        kind: "tabular",
        headers: parsed.headers,
        rows: parsed.rows,
        headerRowIndex: parsed.headerRowIndex,
      },
    };
  }

  let text = "";
  if (format === "pdf") {
    text = await extractPdfText(input.buffer);
  } else if (format === "docx") {
    text = await extractDocxText(input.buffer);
  } else {
    text = input.buffer.toString("utf8").trim();
  }

  if (!text) {
    throw new ContentImportExtractError(
      "EMPTY_FILE",
      "We couldn't find readable text in this file.",
    );
  }

  // If a "txt" file looks like CSV, treat it as tabular
  if (format === "txt" && text.includes(",") && text.includes("\n")) {
    const parsed = parseCsv(text);
    if (parsed.headers.length >= 2 && parsed.rows.length > 0) {
      return {
        format: "csv",
        extract: {
          kind: "tabular",
          headers: parsed.headers,
          rows: parsed.rows,
          headerRowIndex: parsed.headerRowIndex,
        },
      };
    }
  }

  return {
    format,
    extract: {
      kind: "text",
      text,
      titleHint: titleFromFilename(input.fileName),
    },
  };
}
