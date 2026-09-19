"use client";

import { BookOpen, CalendarPlus, Languages, WholeWord } from "lucide-react";
import { useTranslations } from "next-intl";

type VocabularyStatsProps = {
  total: number;
  nouns: number;
  verbs: number;
  recent: number;
};

export function VocabularyStats({
  total,
  nouns,
  verbs,
  recent,
}: VocabularyStatsProps) {
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");

  const items = [
    {
      label: t("stats.total"),
      value: total,
      icon: BookOpen,
    },
    {
      label: tPos("noun"),
      value: nouns,
      icon: WholeWord,
    },
    {
      label: tPos("verb"),
      value: verbs,
      icon: Languages,
    },
    {
      label: t("stats.recent"),
      value: recent,
      icon: CalendarPlus,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="studio-stat rounded-xl border border-hairline-cloud px-4 py-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              {item.label}
            </p>
            <item.icon
              className="size-4 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
          </div>
          <p className="mt-2 font-heading text-2xl font-semibold leading-none tracking-tight text-ink">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
