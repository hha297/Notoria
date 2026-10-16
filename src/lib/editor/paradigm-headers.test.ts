import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  PARADIGM_CASE_CANONICAL,
  PARADIGM_HEADER_CANONICAL,
  canonicalizeParadigmCase,
  canonicalizeParadigmCaseRows,
  canonicalizeParadigmHeader,
  canonicalizeParadigmHeaderRow,
  canonicalizeParadigmHeadersInDoc,
  localizeParadigmCase,
  localizeParadigmHeader,
  localizeParadigmHeadersInDoc,
  resolveParadigmCaseKey,
  resolveParadigmHeaderKey,
  type ParadigmUiLabels,
} from "@/lib/editor/paradigm-headers";

const FI_LABELS: ParadigmUiLabels = {
  headers: {
    case: "Sijamuoto",
    singular: "Yksikkö",
    plural: "Monikko",
  },
  cases: {
    nominative: "Nominatiivi",
    genitive: "Genetiivi",
    partitive: "Partitiivi",
    accusative: "Akkusatiivi",
    inessive: "Inessiivi",
    elative: "Elatiivi",
    illative: "Illatiivi",
    adessive: "Adessiivi",
    ablative: "Ablatiivi",
    allative: "Allatiivi",
    essive: "Essiivi",
    translative: "Translatiivi",
    instructive: "Instruktiivi",
    abessive: "Abessiivi",
    comitative: "Komitatiivi",
  },
};

function headerDoc(headers: string[], caseLabel = "Nominative"): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: headers.map((text) => ({
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text, marks: [{ type: "bold" }] }],
                },
              ],
            })),
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: caseLabel,
                        marks: [{ type: "bold" }],
                      },
                    ],
                  },
                ],
              },
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "tavallinen" }],
                  },
                ],
              },
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "tavalliset" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function readHeaderTexts(doc: JSONContent): string[] {
  const row = doc.content?.[0]?.content?.[0];
  return (row?.content ?? []).map((cell) => {
    const text = cell.content?.[0]?.content?.[0];
    return text?.type === "text" ? (text.text ?? "") : "";
  });
}

function readFirstCaseLabel(doc: JSONContent): string {
  const cell = doc.content?.[0]?.content?.[1]?.content?.[0];
  const text = cell?.content?.[0]?.content?.[0];
  return text?.type === "text" ? (text.text ?? "") : "";
}

describe("paradigm header keys", () => {
  it("resolves English and Finnish aliases to stable keys", () => {
    expect(resolveParadigmHeaderKey("Case")).toBe("case");
    expect(resolveParadigmHeaderKey("singular")).toBe("singular");
    expect(resolveParadigmHeaderKey("Sijamuoto")).toBe("case");
    expect(resolveParadigmHeaderKey("Yksikkö")).toBe("singular");
    expect(resolveParadigmHeaderKey("Monikko")).toBe("plural");
    expect(resolveParadigmHeaderKey("Category")).toBeNull();
  });

  it("canonicalizes and localizes without touching unrelated headers", () => {
    expect(canonicalizeParadigmHeader("sijamuoto")).toBe(
      PARADIGM_HEADER_CANONICAL.case,
    );
    expect(localizeParadigmHeader("Case", FI_LABELS.headers)).toBe("Sijamuoto");
    expect(localizeParadigmHeader("Category", FI_LABELS.headers)).toBe(
      "Category",
    );
    expect(canonicalizeParadigmHeaderRow(["Case", "Singular", "Plural"])).toEqual([
      "Case",
      "Singular",
      "Plural",
    ]);
  });
});

describe("paradigm case labels", () => {
  it("resolves mixed English/Finnish case aliases", () => {
    expect(resolveParadigmCaseKey("Nominative")).toBe("nominative");
    expect(resolveParadigmCaseKey("Genitive")).toBe("genitive");
    expect(resolveParadigmCaseKey("Partitive")).toBe("partitive");
    expect(resolveParadigmCaseKey("Inessiivi")).toBe("inessive");
    expect(resolveParadigmCaseKey("Elatiivi")).toBe("elative");
    expect(resolveParadigmCaseKey("Instruktiivi")).toBe("instructive");
    expect(resolveParadigmCaseKey("Present")).toBeNull();
  });

  it("canonicalizes and localizes case row labels", () => {
    expect(canonicalizeParadigmCase("nominatiivi")).toBe(
      PARADIGM_CASE_CANONICAL.nominative,
    );
    expect(canonicalizeParadigmCase("Inessiivi")).toBe("Inessive");
    expect(localizeParadigmCase("Nominative", FI_LABELS.cases)).toBe(
      "Nominatiivi",
    );
    expect(localizeParadigmCase("Inessive", FI_LABELS.cases)).toBe("Inessiivi");
    expect(
      canonicalizeParadigmCaseRows([
        ["Nominatiivi", "a", "b"],
        ["Inessiivi", "c", "d"],
      ]),
    ).toEqual([
      ["Nominative", "a", "b"],
      ["Inessive", "c", "d"],
    ]);
  });

  it("rewrites TipTap table headers and first-column case labels", () => {
    const english = headerDoc(["Case", "Singular", "Plural"], "Nominative");
    const localized = localizeParadigmHeadersInDoc(english, FI_LABELS);
    expect(readHeaderTexts(localized)).toEqual([
      "Sijamuoto",
      "Yksikkö",
      "Monikko",
    ]);
    expect(readFirstCaseLabel(localized)).toBe("Nominatiivi");

    const mixed = headerDoc(["Case", "Singular", "Plural"], "Inessiivi");
    const normalized = localizeParadigmHeadersInDoc(
      canonicalizeParadigmHeadersInDoc(mixed, FI_LABELS),
      FI_LABELS,
    );
    expect(readFirstCaseLabel(normalized)).toBe("Inessiivi");

    const roundTrip = canonicalizeParadigmHeadersInDoc(localized, FI_LABELS);
    expect(readHeaderTexts(roundTrip)).toEqual(["Case", "Singular", "Plural"]);
    expect(readFirstCaseLabel(roundTrip)).toBe("Nominative");

    const wordForm =
      localized.content?.[0]?.content?.[1]?.content?.[1]?.content?.[0]
        ?.content?.[0];
    expect(wordForm).toMatchObject({ type: "text", text: "tavallinen" });
  });
});
