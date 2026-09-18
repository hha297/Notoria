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
      variant="outline"
      spacing={0}
      aria-label={t("viewMode")}
      className={cn(
        "h-10 shrink-0 rounded-md border border-input p-0.5",
        className,
      )}
    >
      <ToggleGroupItem
        value="list"
        aria-label={t("viewList")}
        className="h-9 cursor-pointer gap-1.5 rounded-[5px] border-0 px-2.5 text-xs font-semibold data-[state=on]:bg-muted data-[state=on]:text-ink data-[state=on]:shadow-none sm:px-3"
      >
        <LayoutList className="size-4" />
        <span className="hidden sm:inline">{t("viewList")}</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="cards"
        aria-label={t("viewCards")}
        className="h-9 cursor-pointer gap-1.5 rounded-[5px] border-0 px-2.5 text-xs font-semibold data-[state=on]:bg-muted data-[state=on]:text-ink data-[state=on]:shadow-none sm:px-3"
      >
        <LayoutGrid className="size-4" />
        <span className="hidden sm:inline">{t("viewCards")}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
