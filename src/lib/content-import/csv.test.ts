import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/content-import/csv";
import { suggestColumnMappings } from "@/lib/content-import/map-columns";
import { mapVocabRows } from "@/lib/content-import/map-vocab";

describe("content-import csv", () => {
  it("parses quoted cells and maps flexible headers", () => {
    const csv = [
      "Finnish word,English meaning,Type,Sentence",
      'talo,house,noun,"Minulla on talo."',
      "kirja,book,noun,Luen kirjaa.",
    ].join("\n");

    const parsed = parseCsv(csv);
    expect(parsed.headers[0]).toMatch(/finnish/i);

    const mappings = suggestColumnMappings(parsed.headers, "vocabulary");
    const fields = mappings.map((m) => m.field);
    expect(fields).toContain("word");
    expect(fields).toContain("meaning");
    expect(fields).toContain("partOfSpeech");
    expect(fields).toContain("example");

    const drafts = mapVocabRows(parsed.rows, mappings);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.status).toBe("ready");
    expect(drafts[0]?.word).toBe("talo");
    expect(drafts[0]?.meanings).toEqual(["house"]);
  });

  it("skips a Notoria-style meta first line", () => {
    const csv = [
      "Vocabulary,Workspace,3 words",
      "Word,Meaning",
      "koira,dog",
    ].join("\n");
    const parsed = parseCsv(csv);
    expect(parsed.headers[0]?.toLowerCase()).toBe("word");
    expect(parsed.rows[0]?.[0]).toBe("koira");
  });
});
