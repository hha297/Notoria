"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import {
  toggleMultiFilterValue,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import type { WritingMode } from "@/lib/writing/content";
import { cn } from "@/lib/utils";

export type WritingChipOption = {
  value: string;
  label: ReactNode;
  kind?: WritingMode;
};

type WritingChipPickerProps = {
  labelId: string;
  label: string;
  value: string;
  options: WritingChipOption[];
  onChange: (value: string) => void;
};

/** Single-select chips — same control used on the writing create/edit sheet. */
export function WritingChipPicker({
  labelId,
  label,
  value,
  options,
  onChange,
}: WritingChipPickerProps) {
  return (
    <div className="space-y-2">
      <Label id={labelId}>{label}</Label>
      <div
        className="writing-chip-picker"
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-writing-kind={option.kind}
              className={cn("writing-chip", selected && "is-active")}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type WritingFilterChipPickerProps = {
  labelId: string;
  label: string;
  allLabel: string;
  values: MultiFilterValue;
  options: WritingChipOption[];
  onChange: (values: MultiFilterValue) => void;
};

/** Multi-select filter chips with an “All” reset chip when nothing is selected. */
export function WritingFilterChipPicker({
  labelId,
  label,
  allLabel,
  values,
  options,
  onChange,
}: WritingFilterChipPickerProps) {
  const allSelected = values.length === 0;

  return (
    <div className="space-y-2">
      <Label id={labelId}>{label}</Label>
      <div
        className="writing-chip-picker"
        role="group"
        aria-labelledby={labelId}
      >
        <button
          type="button"
          className={cn("writing-chip", allSelected && "is-active")}
          aria-pressed={allSelected}
          onClick={() => onChange([])}
        >
          {allLabel}
        </button>
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              data-writing-kind={option.kind}
              className={cn("writing-chip", selected && "is-active")}
              onClick={() =>
                onChange(toggleMultiFilterValue(values, option.value))
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
