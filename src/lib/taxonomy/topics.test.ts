import { describe, expect, it } from "vitest";
import {
  canonicalizeTopicId,
  canonicalizeUsageId,
  DEFAULT_TOPIC_ID,
  TOPIC_IDS,
  USAGE_IDS,
} from "@/lib/taxonomy/topics";
import {
  canonicalizeTagId,
  getTagGroupForId,
  normalizeWordTags,
} from "@/lib/vocabulary-tags";

describe("topic / usage taxonomy", () => {
  it("exposes the YKI-aligned topic list with stable ids", () => {
    expect(TOPIC_IDS).toEqual([
      "everyday_life",
      "home_housing",
      "food_drink",
      "travel",
      "transport_mobility",
      "work_working_life",
      "education_studying",
      "health_wellbeing",
      "services_shopping",
      "people_family_relationships",
      "feelings_opinions_experiences",
      "culture_leisure",
      "nature_environment",
      "society_community",
    ]);
    expect(DEFAULT_TOPIC_ID).toBe("everyday_life");
    expect(USAGE_IDS).toEqual([
      "formal",
      "informal",
      "spoken",
      "slang",
      "academic",
      "idiom",
    ]);
  });

  it("maps legacy ids and display labels to canonical topic ids", () => {
    expect(canonicalizeTopicId("Koti")).toBe("home_housing");
    expect(canonicalizeTopicId("home")).toBe("home_housing");
    expect(canonicalizeTopicId("Perhe")).toBe("people_family_relationships");
    expect(canonicalizeTopicId("family")).toBe("people_family_relationships");
    expect(canonicalizeTopicId("people")).toBe("people_family_relationships");
    expect(canonicalizeTopicId("Matkailu")).toBe("travel");
    expect(canonicalizeTopicId("Liikenne ja liikkuminen")).toBe(
      "transport_mobility",
    );
    expect(canonicalizeTopicId("Yhteiskunta ja yhteisö")).toBe(
      "society_community",
    );
    expect(canonicalizeTopicId("daily")).toBe("everyday_life");
    expect(canonicalizeTopicId("Nhà ở và sinh hoạt")).toBe("home_housing");
  });

  it("maps usage display labels to canonical usage ids", () => {
    expect(canonicalizeUsageId("Puhekieli")).toBe("spoken");
    expect(canonicalizeUsageId("Spoken / Colloquial")).toBe("spoken");
    expect(canonicalizeUsageId("Akateeminen")).toBe("academic");
  });

  it("normalizes mixed stored tags without losing known ids", () => {
    expect(
      normalizeWordTags(["Koti", "home", "Perhe", "Puhekieli", "formal", "a1"]),
    ).toEqual([
      "home_housing",
      "people_family_relationships",
      "spoken",
      "formal",
      "a1",
    ]);
  });

  it("canonicalizes tags and keeps custom tags", () => {
    expect(canonicalizeTagId("Matkailu")).toBe("travel");
    expect(canonicalizeTagId("custom:My Tag")).toBe("custom:My Tag");
    expect(getTagGroupForId("spoken")).toBe("grammar");
    expect(getTagGroupForId("nature_environment")).toBe("topic");
  });
});
