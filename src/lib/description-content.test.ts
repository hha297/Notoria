import { describe, expect, it } from "vitest";
import {
  descriptionDocToStored,
  descriptionToPlainText,
  normalizeDescription,
  parseDescription,
} from "@/lib/description-content";

describe("description-content", () => {
  it("round-trips plain text with newlines and dash bullets", () => {
    const raw = [
      "First paragraph.",
      "",
      "Kerro esimerkiksi",
      "- Mikä sinua kiinnostaa?",
      "- Mitä tykkäät tehdä?",
    ].join("\n");

    const stored = descriptionDocToStored(parseDescription(raw));
    expect(stored).toContain("First paragraph.");
    expect(stored).toContain("- Mikä sinua kiinnostaa?");
    expect(stored).toContain("- Mitä tykkäät tehdä?");
    expect(stored.split("\n").length).toBeGreaterThan(3);
  });

  it("normalizes for dirty comparison", () => {
    const a = "Hello\n- one\n- two";
    const b = descriptionDocToStored(parseDescription(a));
    expect(normalizeDescription(a)).toBe(normalizeDescription(b));
  });

  it("flattens tipTap json to plain text for export", () => {
    const doc = parseDescription("- Alpha\n- Beta");
    const json = JSON.stringify(doc);
    expect(descriptionToPlainText(json)).toContain("- Alpha");
    expect(descriptionToPlainText(json)).toContain("- Beta");
  });
});
