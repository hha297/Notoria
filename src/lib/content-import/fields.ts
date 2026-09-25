import type {
  ContentImportTarget,
  DocumentImportField,
  ImportFieldId,
  VocabImportField,
} from "@/lib/content-import/types";

export type FieldDef = {
  id: ImportFieldId;
  required: boolean;
  /** Lowercase aliases for fuzzy header matching. */
  aliases: string[];
};

const VOCAB_FIELDS: FieldDef[] = [
  {
    id: "word",
    required: true,
    aliases: [
      "word",
      "term",
      "lemma",
      "vocabulary",
      "finnish",
      "finnish word",
      "target",
      "target word",
      "expression",
      "phrase",
      "headword",
      "front",
    ],
  },
  {
    id: "meaning",
    required: true,
    aliases: [
      "meaning",
      "meanings",
      "definition",
      "definitions",
      "translation",
      "translations",
      "english",
      "english meaning",
      "gloss",
      "back",
      "sense",
    ],
  },
  {
    id: "partOfSpeech",
    required: false,
    aliases: [
      "part of speech",
      "partofspeech",
      "pos",
      "type",
      "word type",
      "word class",
      "category",
    ],
  },
  {
    id: "example",
    required: false,
    aliases: [
      "example",
      "examples",
      "sentence",
      "sentences",
      "example sentence",
      "sample",
      "usage",
    ],
  },
  {
    id: "tags",
    required: false,
    aliases: ["tags", "tag", "labels", "topics", "topic"],
  },
  {
    id: "notes",
    required: false,
    aliases: ["notes", "note", "comment", "comments", "hint", "mnemonic"],
  },
];

const DOCUMENT_FIELDS: FieldDef[] = [
  {
    id: "title",
    required: true,
    aliases: ["title", "name", "heading", "subject", "topic"],
  },
  {
    id: "content",
    required: true,
    aliases: [
      "content",
      "body",
      "text",
      "notes",
      "note",
      "description",
      "writing",
      "theory",
      "document",
    ],
  },
  {
    id: "category",
    required: false,
    aliases: ["category", "type", "section", "kind"],
  },
];

export function fieldsForTarget(target: ContentImportTarget): FieldDef[] {
  return target === "vocabulary" ? VOCAB_FIELDS : DOCUMENT_FIELDS;
}

export function requiredFieldsForTarget(
  target: ContentImportTarget,
): ImportFieldId[] {
  return fieldsForTarget(target)
    .filter((f) => f.required)
    .map((f) => f.id);
}

export function isVocabField(id: ImportFieldId): id is VocabImportField {
  return (
    id === "word" ||
    id === "meaning" ||
    id === "partOfSpeech" ||
    id === "example" ||
    id === "tags" ||
    id === "notes" ||
    id === "ignore"
  );
}

export function isDocumentField(id: ImportFieldId): id is DocumentImportField {
  return id === "title" || id === "content" || id === "category" || id === "ignore";
}

export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/\\|]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
