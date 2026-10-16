import { describe, expect, it } from "vitest";
import {
  EXERCISE_ACCENT_MODULE,
  exerciseDetailSlugFromPath,
} from "@/lib/exercise-accents";
import { EXERCISE_TYPES } from "@/lib/exercise-types";

describe("exerciseDetailSlugFromPath", () => {
  it("returns null on the exercises overview and unrelated routes", () => {
    expect(exerciseDetailSlugFromPath("/exercises")).toBeNull();
    expect(exerciseDetailSlugFromPath("/vocabulary")).toBeNull();
    expect(exerciseDetailSlugFromPath("/")).toBeNull();
  });

  it("resolves each vocabulary exercise detail slug", () => {
    for (const { slug } of EXERCISE_TYPES) {
      expect(exerciseDetailSlugFromPath(`/exercises/${slug}`)).toBe(slug);
      expect(exerciseDetailSlugFromPath(`/exercises/${slug}/extra`)).toBe(slug);
    }
  });

  it("resolves theory and import detail routes", () => {
    expect(exerciseDetailSlugFromPath("/exercises/theory")).toBe("theory");
    expect(exerciseDetailSlugFromPath("/exercises/import/abc")).toBe("import");
  });
});

describe("EXERCISE_ACCENT_MODULE", () => {
  it("maps every overview exercise to a module token family", () => {
    expect(EXERCISE_ACCENT_MODULE.flashcard).toBe("exercise");
    expect(EXERCISE_ACCENT_MODULE["fill-in-blank"]).toBe("listen");
    expect(EXERCISE_ACCENT_MODULE["multiple-choice"]).toBe("theory");
    expect(EXERCISE_ACCENT_MODULE["match-pairs"]).toBe("vocab");
    expect(EXERCISE_ACCENT_MODULE["type-answer"]).toBe("writing");
    expect(EXERCISE_ACCENT_MODULE["form-sentence"]).toBe("speak");
    expect(Object.keys(EXERCISE_ACCENT_MODULE).sort()).toEqual(
      EXERCISE_TYPES.map((item) => item.slug).sort(),
    );
  });
});
