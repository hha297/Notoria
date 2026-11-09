import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { highlightTermsInText } from "@/lib/flashcards/highlight-lemma";

function toHtml(node: ReactNode) {
  return renderToStaticMarkup(createElement("span", null, node));
}

describe("highlightTermsInText", () => {
  it("highlights the longest matching phrase", () => {
    const html = toHtml(
      highlightTermsInText(
        "Does the baby look more like the dad or the mom?",
        ["look", "look more like"],
      ),
    );
    expect(html).toContain("look more like");
    expect(html).toContain("<strong");
  });

  it("expands a leading article around a gloss match", () => {
    const html = toHtml(
      highlightTermsInText("He is the best runner in the world.", ["best"]),
    );
    expect(html).toContain(">the best<");
  });

  it("matches gloss tokens across a short gap", () => {
    const html = toHtml(
      highlightTermsInText(
        "Does the baby look more like the dad or the mom?",
        ["look like"],
      ),
    );
    expect(html).toContain(">look more like<");
  });

  it("drops trailing gloss words that are absent from the translation", () => {
    const html = toHtml(
      highlightTermsInText(
        "Does the baby look more like the dad or the mom?",
        ["look like someone"],
      ),
    );
    expect(html).toContain(">look more like<");
  });

  it("returns plain text when nothing matches", () => {
    expect(
      highlightTermsInText("No overlap here.", ["näköinen", "resembling"]),
    ).toBe("No overlap here.");
  });
});
