import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import OpenAI from "openai";
import {
  cloudinaryResourceTypeForMime,
  downloadCloudinaryAsset,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { ExerciseImportError } from "@/lib/exercise-import/errors";
import type {
  ExtractedContent,
  ImportSourceInput,
} from "@/lib/exercise-import/types";
import {
  isDocumentMime,
  isImageMime,
  isPlainTextMime,
} from "@/lib/exercise-import/utils";

/**
 * Content extraction interface — swap/add parsers without changing the pipeline.
 */
export type ContentExtractor = {
  id: string;
  canHandle: (input: ImportSourceInput) => boolean;
  extract: (input: ImportSourceInput) => Promise<ExtractedContent>;
};

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const LEGACY_DOC_MIME = "application/msword";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ExerciseImportError("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 90_000 });
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFileBuffer(input: {
  fileUrl: string;
  filePublicId?: string | null;
  mimeType?: string | null;
}): Promise<Buffer> {
  // Prefer authenticated Cloudinary download: public PDF/ZIP CDN URLs are often
  // blocked on free Cloudinary plans even after a successful upload.
  if (input.filePublicId && isCloudinaryConfigured()) {
    try {
      return await downloadCloudinaryAsset({
        publicId: input.filePublicId,
        resourceType: cloudinaryResourceTypeForMime(input.mimeType),
        fallbackUrl: input.fileUrl,
      });
    } catch (error) {
      console.error("[exercise-import] Cloudinary asset download failed", {
        publicId: input.filePublicId,
        reason: error,
      });
      throw new ExerciseImportError("PROCESSING_FAILED");
    }
  }

  const response = await fetch(input.fileUrl);
  if (!response.ok) {
    console.error("[exercise-import] Public file fetch failed", {
      status: response.status,
      url: input.fileUrl,
    });
    throw new ExerciseImportError("PROCESSING_FAILED");
  }
  return Buffer.from(await response.arrayBuffer());
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
    throw new ExerciseImportError("UNSUPPORTED_PARSE");
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    throw new ExerciseImportError("UNSUPPORTED_PARSE");
  }
}

const imageExtractor: ContentExtractor = {
  id: "image-vision",
  canHandle(input) {
    return (
      (input.kind === "image" || input.kind === "file") &&
      Boolean(input.mimeType && isImageMime(input.mimeType))
    );
  },
  async extract(input) {
    if (input.kind === "url") {
      throw new ExerciseImportError("INVALID_FILE");
    }
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 12_000,
      messages: [
        {
          role: "system",
          content: `Extract ALL readable learning content from the image as plain text only.

Rules:
- Extract the FULL page: theory/explanations AND every exercise section (Tehtävä, Bài tập, tables, verb lists, example sentences).
- Do not stop after the theory section — continue through all tasks and examples visible in the image.
- Preserve structure: titles, instructions, numbered/lettered lists (a. b. c.), and tables.
- Put the worksheet TITLE and the main INSTRUCTION lines clearly before tables/lists.
- Tables → GitHub-flavored markdown tables. Keep every column header. Empty cells must be literally empty or "(blank)" — never invent answers.
- Lists like "a. kaunis:" keep the label, cue word, and any trailing colon/line exactly; do not invent example sentences.
- Copy printed example verb forms and sentences faithfully (they are needed for practice generation).
- Do not invent words, forms, sentences, or instructions that are not clearly visible.
- Ignore handwriting unless it is clearly part of a printed answer key (prefer leaving blanks empty).
- Keep original language(s). No commentary.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the complete page: theory + all exercises/examples. Preserve tables and list order. Leave empty answer cells as (blank).",
            },
            {
              type: "image_url",
              image_url: { url: input.fileUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new ExerciseImportError("EMPTY_CONTENT");
    }
    return { text, method: "vision" };
  },
};

const plainTextExtractor: ContentExtractor = {
  id: "plain-text",
  canHandle(input) {
    return (
      (input.kind === "image" || input.kind === "file") &&
      Boolean(input.mimeType && isPlainTextMime(input.mimeType))
    );
  },
  async extract(input) {
    if (input.kind === "url") {
      throw new ExerciseImportError("INVALID_FILE");
    }
    const buffer = await fetchFileBuffer({
      fileUrl: input.fileUrl,
      filePublicId: input.filePublicId,
      mimeType: input.mimeType,
    });
    const text = buffer.toString("utf8").trim();
    if (!text) {
      throw new ExerciseImportError("EMPTY_CONTENT");
    }
    return { text: text.slice(0, 50_000), method: "plain_text" };
  },
};

const documentExtractor: ContentExtractor = {
  id: "document-parser",
  canHandle(input) {
    return (
      (input.kind === "image" || input.kind === "file") &&
      Boolean(input.mimeType && isDocumentMime(input.mimeType))
    );
  },
  async extract(input) {
    if (input.kind === "url") {
      throw new ExerciseImportError("INVALID_FILE");
    }

    const mime = (input.mimeType ?? "").toLowerCase();

    // Legacy binary .doc is not supported — use .docx instead.
    if (mime === LEGACY_DOC_MIME) {
      throw new ExerciseImportError("UNSUPPORTED_PARSE");
    }

    const buffer = await fetchFileBuffer({
      fileUrl: input.fileUrl,
      filePublicId: input.filePublicId,
      mimeType: input.mimeType,
    });
    let text = "";

    if (mime === PDF_MIME) {
      text = await extractPdfText(buffer);
    } else if (mime === DOCX_MIME) {
      text = await extractDocxText(buffer);
    } else {
      throw new ExerciseImportError("INVALID_FILE_TYPE");
    }

    if (!text || text.length < 20) {
      throw new ExerciseImportError("EMPTY_CONTENT");
    }

    return { text: text.slice(0, 50_000), method: "parser" };
  },
};

const urlExtractor: ContentExtractor = {
  id: "url-html",
  canHandle(input) {
    return input.kind === "url";
  },
  async extract(input) {
    if (input.kind !== "url") {
      throw new ExerciseImportError("INVALID_URL");
    }
    let response: Response;
    try {
      response = await fetch(input.sourceUrl, {
        headers: {
          "User-Agent": "NotoriaImportBot/1.0",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new ExerciseImportError("URL_FETCH_FAILED");
    }

    if (!response.ok) {
      throw new ExerciseImportError("URL_FETCH_FAILED");
    }

    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    const text = contentType.includes("text/html")
      ? stripHtml(raw)
      : raw.trim();

    if (!text || text.length < 40) {
      throw new ExerciseImportError("EMPTY_CONTENT");
    }

    return { text: text.slice(0, 50_000), method: "url_html" };
  },
};

const EXTRACTORS: ContentExtractor[] = [
  imageExtractor,
  plainTextExtractor,
  documentExtractor,
  urlExtractor,
];

export async function extractImportContent(
  input: ImportSourceInput,
): Promise<ExtractedContent> {
  const extractor = EXTRACTORS.find((item) => item.canHandle(input));
  if (!extractor) {
    throw new ExerciseImportError("INVALID_FILE_TYPE");
  }
  return extractor.extract(input);
}
