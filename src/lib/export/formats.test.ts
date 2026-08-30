import { describe, expect, it } from "vitest";
import {
  DOCUMENT_EXPORT_FORMATS,
  getDefaultExportFormat,
  VOCABULARY_EXPORT_FORMATS,
} from "@/lib/export/formats";

describe("export format defaults", () => {
  it("defaults Pro users to PDF", () => {
    expect(getDefaultExportFormat(true, VOCABULARY_EXPORT_FORMATS)).toBe("pdf");
    expect(getDefaultExportFormat(true, DOCUMENT_EXPORT_FORMATS)).toBe("pdf");
  });

  it("defaults Free users to CSV when available", () => {
    expect(getDefaultExportFormat(false, VOCABULARY_EXPORT_FORMATS)).toBe("csv");
  });

  it("defaults Free users to PDF when CSV is unavailable", () => {
    expect(getDefaultExportFormat(false, DOCUMENT_EXPORT_FORMATS)).toBe("pdf");
  });

  it("keeps canonical vocabulary format order", () => {
    expect(VOCABULARY_EXPORT_FORMATS).toEqual(["pdf", "docx", "csv"]);
  });

  it("keeps canonical document format order", () => {
    expect(DOCUMENT_EXPORT_FORMATS).toEqual(["pdf", "docx"]);
  });
});
