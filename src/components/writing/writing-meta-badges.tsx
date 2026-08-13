"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  isKnownWritingTopic,
  type WritingMeta,
} from "@/lib/writing/meta";

type WritingMetaBadgesProps = {
  meta: WritingMeta;
};

export function WritingMetaBadges({ meta }: WritingMetaBadgesProps) {
  const t = useTranslations("writing.meta");

  const badges: string[] = [];

  if (meta.cefrLevel) {
    badges.push(t(`cefr.${meta.cefrLevel}`));
  }

  if (meta.topic) {
    badges.push(
      isKnownWritingTopic(meta.topic)
        ? t(`topics.${meta.topic}`)
        : meta.topic,
    );
  }

  if (meta.formality) {
    badges.push(t(`formality.${meta.formality}`));
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
