import { describe, expect, it } from "vitest";
import {
  buildTipTapTableFromMatrix,
  parseTextToTable,
} from "@/lib/editor/selection-to-table";

describe("parseTextToTable", () => {
  it("parses pipe-separated rows", () => {
    const parsed = parseTextToTable("A | B\nC | D");
    expect(parsed).toEqual({
      columnCount: 2,
      rows: [
        ["A", "B"],
        ["C", "D"],
      ],
    });
  });

  it("parses a multi-column pipe table dynamically", () => {
    const parsed = parseTextToTable(
      "Name | Meaning | Example | Note\nw1 | hello | Hi! | n1\nw2 | bye | Bye! | n2",
    );
    expect(parsed?.columnCount).toBe(4);
    expect(parsed?.rows).toHaveLength(3);
    expect(parsed?.rows[0]).toEqual(["Name", "Meaning", "Example", "Note"]);
  });

  it("parses tab-separated rows", () => {
    const parsed = parseTextToTable("A\tB\tC\nD\tE\tF");
    expect(parsed).toEqual({
      columnCount: 3,
      rows: [
        ["A", "B", "C"],
        ["D", "E", "F"],
      ],
    });
  });

  it("parses multi-space separated rows", () => {
    const parsed = parseTextToTable("Name    Meaning    Example\nword1   hello      Hello!");
    expect(parsed?.columnCount).toBe(3);
    expect(parsed?.rows[0]).toEqual(["Name", "Meaning", "Example"]);
    expect(parsed?.rows[1]).toEqual(["word1", "hello", "Hello!"]);
  });

  it("returns null for non-tabular prose", () => {
    expect(
      parseTextToTable(
        "This is a normal sentence.\nAnother sentence follows here.",
      ),
    ).toBeNull();
  });

  it("returns null for a single-column list", () => {
    expect(parseTextToTable("Apple\nBanana\nOrange")).toBeNull();
  });
});

describe("buildTipTapTableFromMatrix", () => {
  it("builds a TipTap table with a header row", () => {
    const table = buildTipTapTableFromMatrix(
      [
        ["A", "B"],
        ["C", "D"],
      ],
      { withHeaderRow: true },
    );

    expect(table.type).toBe("table");
    expect(table.content).toHaveLength(2);
    expect(table.content?.[0]?.content?.[0]?.type).toBe("tableHeader");
    expect(table.content?.[1]?.content?.[0]?.type).toBe("tableCell");
    expect(
      table.content?.[0]?.content?.[0]?.content?.[0]?.content?.[0],
    ).toMatchObject({ type: "text", text: "A" });
    expect(
      table.content?.[1]?.content?.[1]?.content?.[0]?.content?.[0],
    ).toMatchObject({ type: "text", text: "D" });
  });
});
