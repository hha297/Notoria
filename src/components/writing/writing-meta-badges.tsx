"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";
import { type TagTone } from "@/lib/vocabulary-tags";
import { type WritingMeta } from "@/lib/writing/meta";

type WritingMetaBadgesProps = {
  meta: WritingMeta;
};

type MetaBadge = {
  key: string;
  label: string;
  tone: TagTone;
};

export function WritingMetaBadges({ meta }: WritingMetaBadgesProps) {
  const tMeta = useTranslations("writing.meta");
  const tTags = useTranslations("tags");

  const badges: MetaBadge[] = [];

  if (meta.cefrLevel) {
    badges.push({
      key: `cefr-${meta.cefrLevel}`,
      label: tMeta(`cefr.${meta.cefrLevel}`),
      tone: "difficulty",
    });
  }

  if (meta.topic) {
    badges.push({
      key: `topic-${meta.topic}`,
      label: resolveTopicLabel(meta.topic, (key) => tTags(key)),
      tone: "topic",
    });
  }

  if (meta.formality) {
    badges.push({
      key: `formality-${meta.formality}`,
      label: tMeta(`formality.${meta.formality}`),
      tone: "formality",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <Badge
          key={badge.key}
          variant="outline"
          data-tag-tone={badge.tone}
          className="tag-chip"
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}
