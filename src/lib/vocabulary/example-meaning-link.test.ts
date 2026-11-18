import { describe, expect, it } from "vitest";
import {
  buildMeaningIdRemap,
  remapExampleMeaningId,
} from "@/lib/vocabulary/example-meaning-link";

describe("example-meaning-link", () => {
  it("maps client meaning ids to inserted db ids by index", () => {
    const map = buildMeaningIdRemap(
      ["client-a", "client-b"],
      ["db-a", "db-b"],
    );
    expect(map.get("client-a")).toBe("db-a");
    expect(map.get("client-b")).toBe("db-b");
  });

  it("remaps known ids and leaves unknown / null as null", () => {
    const map = buildMeaningIdRemap(["client-a"], ["db-a"]);
    expect(remapExampleMeaningId("client-a", map)).toBe("db-a");
    expect(remapExampleMeaningId("missing", map)).toBeNull();
    expect(remapExampleMeaningId(null, map)).toBeNull();
    expect(remapExampleMeaningId(undefined, map)).toBeNull();
  });
});
