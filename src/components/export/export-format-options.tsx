"use client";

import { Lock } from "lucide-react";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { isPaidDocumentFormat } from "@/lib/auth/paid-access";
import type { ExportFormatId } from "@/lib/export/formats";
import { cn } from "@/lib/utils";

type ExportFormatOptionsProps = {
  idPrefix: string;
  name: string;
  formats: readonly ExportFormatId[];
  value: ExportFormatId;
  onChange: (format: ExportFormatId) => void;
  hasProAccess: boolean;
  onLockedSelect: () => void;
  labels: Partial<Record<ExportFormatId, string>>;
  compact?: boolean;
};

function isFormatLocked(format: ExportFormatId, hasProAccess: boolean) {
  return !hasProAccess && isPaidDocumentFormat(format);
}

export function ExportFormatOptions({
  idPrefix,
  name,
  formats,
  value,
  onChange,
  hasProAccess,
  onLockedSelect,
  labels,
  compact = false,
}: ExportFormatOptionsProps) {
  return (
    <div className={cn("grid gap-2", compact && "grid-cols-3 gap-1.5")}>
      {formats.map((format) => {
        const locked = isFormatLocked(format, hasProAccess);
        const id = `${idPrefix}-${format}`;
        const label = labels[format] ?? format.toUpperCase();

        return (
          <label
            key={format}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              compact && "justify-center gap-1.5 px-2 py-2",
              value === format
                ? "border-accent-lime/50 bg-accent-lime/10 text-ink"
                : "border-hairline-cloud hover:bg-muted/40",
              locked && lockedFeatureClassName,
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={format}
              checked={value === format}
              onChange={() => {
                if (locked) {
                  onLockedSelect();
                  return;
                }
                onChange(format);
              }}
              className={cn(
                "size-4 accent-[var(--accent-lime)]",
                compact && "sr-only",
              )}
            />
            {locked ? <Lock className="size-3.5 text-muted-foreground" /> : null}
            <span className="font-medium">{label}</span>
          </label>
        );
      })}
    </div>
  );
}
