"use server";

import { getTranslations } from "next-intl/server";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import { normalizePartOfSpeechKey } from "@/lib/vocabulary/export/group-rows";
import { isKnownTheoryCategory } from "@/lib/theory/content";
import { searchWorkspace } from "@/lib/search/run";
import type { SearchLabels, SearchResult, SearchResultType } from "@/lib/search/types";

const POS_SET = new Set<string>(PARTS_OF_SPEECH);
const NAV_TYPES = new Set([
  "vocabulary",
  "theory",
  "writing",
  "listening",
  "speaking",
  "inbox",
]);

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function searchWorkspaceContent(
  query: string,
): Promise<SearchResult[]> {
  const [tSearch, tNav, tTheory, tTags] = await Promise.all([
    getTranslations("search"),
    getTranslations("nav"),
    getTranslations("theory"),
    getTranslations("tags"),
  ]);

  const labels: SearchLabels = {
    typeLabel: (type: SearchResultType) => {
      if (type === "folder") return tSearch("types.folder");
      if (type === "exercise") return tNav("exercises");
      if (NAV_TYPES.has(type)) return tNav(type);
      return type;
    },
    posGroup: (pos) => {
      const key = normalizePartOfSpeechKey(pos);
      if (key && POS_SET.has(key)) {
        return tSearch(`posGroups.${key as (typeof PARTS_OF_SPEECH)[number]}`);
      }
      return titleCase(pos);
    },
    posSingular: (pos) => {
      const key = normalizePartOfSpeechKey(pos);
      if (key && POS_SET.has(key)) {
        return tTags(`pos.${key as (typeof PARTS_OF_SPEECH)[number]}`);
      }
      return titleCase(pos);
    },
    theoryCategory: (category) => {
      if (isKnownTheoryCategory(category)) {
        return tTheory(`categories.${category}`);
      }
      return category;
    },
    folderNoun: tSearch("types.folder"),
    sectionLabel: (section) => {
      if (section === "writing" || section === "listening" || section === "theory") {
        return tNav(section);
      }
      return titleCase(section);
    },
  };

  return searchWorkspace(query, labels);
}
