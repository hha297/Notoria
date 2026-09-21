"use client";

import { LayoutGrid, LayoutList } from "lucide-react";
import { useTranslations } from "next-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { VocabularyViewMode } from "@/lib/vocabulary/types";

type VocabularyViewModeToggleProps = {
  value: VocabularyViewMode;
  onChange: (value: VocabularyViewMode) => void;
  className?: string;
};

export function VocabularyViewModeToggle({
  value,
  onChange,
  className,
}: VocabularyViewModeToggleProps) {
  const t = useTranslations("vocabulary");

  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => {
        const picked = next[0];
        if (picked === "list" || picked === "cards") {
          onChange(picked);
        }
      }}
      variant="default"
      spacing={0}
      aria-label={t("viewMode")}
      className={cn("route-view-toggle vocab-view-toggle", className)}
    >
      <ToggleGroupItem
        value="list"
        aria-label={t("viewList")}
        className="route-view-toggle-item vocab-view-toggle-item"
      >
        <LayoutList className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="cards"
        aria-label={t("viewCards")}
        className="route-view-toggle-item vocab-view-toggle-item"
      >
        <LayoutGrid className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
