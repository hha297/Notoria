import { describe, expect, it } from "vitest";
import { parseInflectionPairs } from "@/lib/editor/format/detect/inflection";

describe("parseInflectionPairs", () => {
  it("splits multiple case/value pairs on the same lines", () => {
    const rows = parseInflectionPairs(
      [
        "Monikko elämäntavat Genetiivi elämäntavan",
        "Monikon genetiivi elämäntapojen Partitiivi elämäntapaa",
      ].join(" "),
    );

    const byCase = Object.fromEntries(
      rows.map((row) => [row.caseId, row]),
    );

    expect(byCase.nominatiivi?.plural).toBe("elämäntavat");
    expect(byCase.genetiivi?.singular).toBe("elämäntavan");
    expect(byCase.genetiivi?.plural).toBe("elämäntapojen");
    expect(byCase.partitiivi?.singular).toBe("elämäntapaa");
    expect(byCase.nominatiivi?.singular).toBeUndefined();
  });
});
