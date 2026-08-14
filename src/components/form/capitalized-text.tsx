"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { applyCapitalizeFirstLetter } from "@/lib/text/capitalize-first-letter";

export function CapitalizedInput({
  onChange,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      onChange={(event) => applyCapitalizeFirstLetter(event, onChange)}
    />
  );
}

export function CapitalizedTextarea({
  onChange,
  ...props
}: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      onChange={(event) => applyCapitalizeFirstLetter(event, onChange)}
    />
  );
}
