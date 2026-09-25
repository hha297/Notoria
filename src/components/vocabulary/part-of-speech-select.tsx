"use client";

import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import styles from "@/components/style/vocabulary/composer.module.css";
import { mx } from "@/lib/css-module";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import { cn } from "@/lib/utils";

export type PartOfSpeechValue = (typeof PARTS_OF_SPEECH)[number];

type PartOfSpeechSelectProps = {
  value?: string | null;
  onChange: (value: PartOfSpeechValue | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: "composer" | "compact";
  className?: string;
  id?: string;
};

function isKnownPos(value: string | null | undefined): value is PartOfSpeechValue {
  return Boolean(
    value && PARTS_OF_SPEECH.includes(value as PartOfSpeechValue),
  );
}

export function PartOfSpeechSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  size = "composer",
  className,
  id,
}: PartOfSpeechSelectProps) {
  const tPos = useTranslations("tags.pos");
  const t = useTranslations("vocabulary");
  const known = isKnownPos(value) ? value : null;
  const label = known ? tPos(known) : null;
  const resolvedPlaceholder = placeholder ?? t("partOfSpeechPlaceholder");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        disabled={disabled}
        data-vocab-pos={known ?? "none"}
        data-size={size}
        className={cn(
          mx(styles, "vocab-pos-trigger"),
          size === "composer" && mx(styles, "vocab-composer-control"),
          className,
        )}
      >
        <span className={mx(styles, "vocab-pos-swatch")} aria-hidden />
        <span className={mx(styles, "vocab-pos-trigger-copy")}>
          <span
            className={cn(
              mx(styles, "vocab-pos-trigger-value"),
              !label && mx(styles, "vocab-pos-trigger-placeholder"),
            )}
          >
            {label ?? resolvedPlaceholder}
          </span>
        </span>
        <ChevronDown
          className={mx(styles, "vocab-pos-chevron")}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={mx(styles, "vocab-pos-menu")}
      >
        <div className={mx(styles, "vocab-pos-grid")} role="none">
          {PARTS_OF_SPEECH.map((pos) => {
            const selected = known === pos;
            return (
              <DropdownMenuItem
                key={pos}
                data-vocab-pos={pos}
                data-selected={selected || undefined}
                className={mx(styles, "vocab-pos-option")}
                onClick={() => onChange(pos)}
              >
                <span className={mx(styles, "vocab-pos-option-dot")} aria-hidden />
                <span className={mx(styles, "vocab-pos-option-label")}>
                  {tPos(pos)}
                </span>
                {selected ? (
                  <Check
                    className={mx(styles, "vocab-pos-option-check")}
                    aria-hidden
                  />
                ) : (
                  <span className={mx(styles, "vocab-pos-option-check-spacer")} aria-hidden />
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
