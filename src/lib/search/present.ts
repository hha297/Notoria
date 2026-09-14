import { isKnownTheoryCategory } from "@/lib/theory/content";
import { pickSnippet } from "@/lib/search/snippet";
import type { SearchHit, SearchLabels, SearchResult } from "@/lib/search/types";

function formatGroup(hit: SearchHit, labels: SearchLabels): string | null {
  if (!hit.group) return null;

  switch (hit.groupKind) {
    case "pos":
      return labels.posGroup(hit.group);
    case "category":
      return isKnownTheoryCategory(hit.group)
        ? labels.theoryCategory(hit.group)
        : hit.group;
    case "folder":
      return hit.group;
    case "section":
      return labels.folderNoun;
    default:
      return hit.group;
  }
}

export function presentSearchHit(
  hit: SearchHit,
  query: string,
  labels: SearchLabels,
): SearchResult {
  const group = formatGroup(hit, labels);
  const typeLabel =
    hit.groupKind === "section" && hit.group
      ? labels.sectionLabel(hit.group)
      : labels.typeLabel(hit.type);
  const collection = group ? `${typeLabel} · ${group}` : typeLabel;

  let subtitle = hit.subtitle?.trim() || null;
  if (hit.type === "vocabulary" && hit.groupKind === "pos" && hit.group) {
    const posLabel = labels.posSingular(hit.group);
    subtitle = subtitle ? `${posLabel} · ${subtitle}` : posLabel;
  }

  const snippet = pickSnippet(query, hit.title, [
    subtitle,
    ...hit.snippetCandidates,
  ]);
  const snippetIsSubtitle =
    snippet != null &&
    subtitle != null &&
    snippet.replace(/^…|…$/g, "").trim().toLocaleLowerCase() ===
      subtitle.toLocaleLowerCase();

  return {
    type: hit.type,
    id: hit.id,
    title: hit.title,
    subtitle,
    collection,
    snippet: snippetIsSubtitle
      ? pickSnippet(query, hit.title, hit.snippetCandidates)
      : snippet,
    href: hit.href,
  };
}
