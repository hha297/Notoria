"use client";

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
    { label: t("stats.total"), value: total },
    { label: tPos("noun"), value: nouns },
    { label: tPos("verb"), value: verbs },
    { label: t("stats.recent"), value: recent },
  ];

  return (
    <ul className="vocab-canopy" aria-label={t("stats.total")}>
      {items.map((item) => (
        <li key={item.label} className="vocab-canopy-item">
          <span className="vocab-canopy-value">{item.value}</span>
          <span className="vocab-canopy-label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
