import { describe, expect, it } from "vitest";
import { pickAiContextualTargets } from "@/lib/exercises/contextual-mix";
import { countAiContextualItems } from "@/lib/exercises/difficulty";

describe("contextual mix", () => {
  it("picks unique word targets without changing the pool size beyond the ratio", () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      id: `q-${index}`,
      wordId: `w-${index}`,
    }));

    const targets = pickAiContextualTargets(items, "medium", (item) => item.wordId);
    expect(targets).toHaveLength(countAiContextualItems(10, "medium"));
    expect(new Set(targets.map((item) => item.wordId)).size).toBe(targets.length);
  });

  it("dedupes by word id before applying the ratio", () => {
    const items = [
      { id: "a", wordId: "1" },
      { id: "b", wordId: "1" },
      { id: "c", wordId: "2" },
      { id: "d", wordId: "3" },
    ];
    const targets = pickAiContextualTargets(items, "intensive", (item) => item.wordId);
    expect(targets.length).toBeLessThanOrEqual(3);
    expect(new Set(targets.map((item) => item.wordId)).size).toBe(targets.length);
  });
});
