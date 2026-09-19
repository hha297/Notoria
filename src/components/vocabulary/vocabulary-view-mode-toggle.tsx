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
        className="size-9 cursor-pointer rounded-[5px] border-0 px-0 data-[state=on]:bg-muted data-[state=on]:text-ink data-[state=on]:shadow-none"
      >
        <LayoutList className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="cards"
        aria-label={t("viewCards")}
        className="size-9 cursor-pointer rounded-[5px] border-0 px-0 data-[state=on]:bg-muted data-[state=on]:text-ink data-[state=on]:shadow-none"
      >
        <LayoutGrid className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
