"use client";

import { FileSpreadsheet, FileText, FileType, Lock } from "lucide-react";
import type { ReactNode } from "react";
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
  hints?: Partial<Record<ExportFormatId, string>>;
};

function isFormatLocked(format: ExportFormatId, hasProAccess: boolean) {
  return !hasProAccess && isPaidDocumentFormat(format);
}

function formatIcon(format: ExportFormatId) {
  if (format === "csv") return FileSpreadsheet;
  if (format === "docx") return FileType;
  return FileText;
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
  hints,
}: ExportFormatOptionsProps) {
  return (
    <div
      className="export-format-grid"
      role="radiogroup"
      data-export-group={name}
      style={{
        gridTemplateColumns: `repeat(${Math.min(formats.length, 3)}, minmax(0, 1fr))`,
      }}
    >
      {formats.map((format) => {
        const locked = isFormatLocked(format, hasProAccess);
        const selected = value === format;
        const id = `${idPrefix}-${format}`;
        const label = labels[format] ?? format.toUpperCase();
        const hint = hints?.[format];
        const Icon = formatIcon(format);

        return (
          <button
            key={format}
            id={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            data-export-format={format}
            className={cn(
              "export-format-chip",
              selected && "is-active",
              locked && lockedFeatureClassName,
            )}
            onClick={() => {
              if (locked) {
                onLockedSelect();
                return;
              }
              onChange(format);
            }}
          >
            <span className="export-format-icon">
              {locked ? <Lock className="size-4" /> : <Icon className="size-4" />}
            </span>
            <span className="export-format-name">{label}</span>
            {hint ? <span className="export-format-hint">{hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ExportOptionChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn("export-option-chip", checked && "is-on")}
      onClick={() => onChange(!checked)}
    >
      <span className="export-option-dot" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
