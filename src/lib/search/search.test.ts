import { describe, expect, it } from "vitest";
import { prepareSearchQuery, toPrefixTsQuery, tokenizeSearchQuery } from "@/lib/search/query";
import { combineRank, SEARCH_RANK, titleRank } from "@/lib/search/ranking";
import { excerptAround, pickSnippet, splitHighlight } from "@/lib/search/snippet";
import { presentSearchHit } from "@/lib/search/present";
import { SEARCH_RESULT_TYPES, type SearchLabels } from "@/lib/search/types";

const labels: SearchLabels = {
  typeLabel: (type) =>
    ({
      vocabulary: "Vocabulary",
      theory: "Theory",
      writing: "Writing",
      listening: "Listening",
      speaking: "Speaking",
      folder: "Folder",
      exercise: "Exercise",
      inbox: "Capture",
    })[type],
  posGroup: (pos) => ({ noun: "Nouns", adjective: "Adjectives" }[pos] ?? pos),
  posSingular: (pos) => ({ noun: "Noun", adjective: "Adjective" }[pos] ?? pos),
  theoryCategory: (category) =>
    ({ grammar: "Grammar", vocabulary: "Vocabulary" }[category] ?? category),
  folderNoun: "Folder",
  sectionLabel: (section) => ({ theory: "Theory", writing: "Writing" }[section] ?? section),
};

describe("prepareSearchQuery", () => {
  it("builds a prefix tsquery for partial Finnish tokens", () => {
    const prepared = prepareSearchQuery("  Kompar  ");
    expect(prepared?.normalized).toBe("kompar");
    expect(prepared?.like).toBe("%kompar%");
    expect(prepared?.tsQuery).toBe("kompar:*");
    expect(tokenizeSearchQuery("Adjektiivien komparatiivi")).toEqual([
      "adjektiivien",
      "komparatiivi",
    ]);
    expect(toPrefixTsQuery(["välivuosi"])).toBe("välivuosi:*");
  });

  it("returns null for punctuation-only input", () => {
    expect(prepareSearchQuery("%%%")).toBeNull();
    expect(prepareSearchQuery("   ")).toBeNull();
  });
});

describe("ranking", () => {
  it("prefers exact title matches over body mentions", () => {
    const query = prepareSearchQuery("välivuosi")!;
    const exact = combineRank({
      title: titleRank("Välivuosi", query),
      metadata: false,
      body: false,
    });
    const body = combineRank({
      title: titleRank("Random note", query),
      metadata: false,
      body: true,
    });
    expect(exact).toBe(SEARCH_RANK.exactTitle);
    expect(body).toBe(SEARCH_RANK.body);
    expect(exact).toBeGreaterThan(body);
    expect(titleRank("Välivuosi gap", query)).toBe(SEARCH_RANK.prefixTitle);
  });
});

describe("snippets and highlighting", () => {
  it("excerpts around the match and highlights it", () => {
    const text = "In Finnish, adjectives can be compared using -mpi.";
    expect(excerptAround(text, "compared", 40)).toContain("compared");
    expect(splitHighlight("Välivuosi", "väli")).toEqual([
      { text: "Väli", match: true },
      { text: "vuosi", match: false },
    ]);
    expect(
      pickSnippet("gap", "Välivuosi", ["Year off · Gap year", "a year between studies"]),
    ).toContain("Gap year");
  });
});

describe("presentSearchHit", () => {
  it("shows type and POS group so the user knows where the result belongs", () => {
    const result = presentSearchHit(
      {
        type: "vocabulary",
        id: "1",
        title: "Välivuosi",
        subtitle: "A2",
        group: "noun",
        groupKind: "pos",
        snippetCandidates: ["Year off · Gap year"],
        href: "/vocabulary/1",
        score: 100,
      },
      "välivuosi",
      labels,
    );

    expect(result.collection).toBe("Vocabulary · Nouns");
    expect(result.subtitle).toBe("Noun · A2");
    expect(result.snippet).toBe("Year off · Gap year");
    expect(result.href).toBe("/vocabulary/1");
  });

  it("labels theory with category or folder", () => {
    const result = presentSearchHit(
      {
        type: "theory",
        id: "2",
        title: "Comparative of Adjectives",
        subtitle: "Adjektiivien komparatiivi",
        group: "grammar",
        groupKind: "category",
        snippetCandidates: ["adjectives can be compared using"],
        href: "/theory/2",
        score: 85,
      },
      "kompar",
      labels,
    );
    expect(result.collection).toBe("Theory · Grammar");
    expect(result.href).toBe("/theory/2");
  });
});

describe("search result types", () => {
  it("lists every supported content type for the unified result model", () => {
    expect(SEARCH_RESULT_TYPES).toEqual([
      "vocabulary",
      "theory",
      "writing",
      "listening",
      "speaking",
      "folder",
      "exercise",
      "inbox",
    ]);
  });
});
