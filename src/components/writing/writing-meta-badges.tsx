"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";
import { type WritingMeta } from "@/lib/writing/meta";

type WritingMetaBadgesProps = {
  meta: WritingMeta;
};

export function WritingMetaBadges({ meta }: WritingMetaBadgesProps) {
  const tMeta = useTranslations("writing.meta");
  const tTags = useTranslations("tags");

  const badges: string[] = [];

  if (meta.cefrLevel) {
    badges.push(tMeta(`cefr.${meta.cefrLevel}`));
  }

  if (meta.topic) {
    badges.push(resolveTopicLabel(meta.topic, (key) => tTags(key)));
  }

  if (meta.formality) {
    badges.push(tMeta(`formality.${meta.formality}`));
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((label) => (
        <Badge key={label} variant="outline">
          {label}
        </Badge>
      ))}
    </div>
  );
}
