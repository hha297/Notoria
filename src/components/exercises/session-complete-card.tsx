"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SessionCompleteCardProps = {
  title: string;
  scoreLabel?: string;
  tryAgainLabel: string;
  onTryAgain: () => void;
};

export function SessionCompleteCard({
  title,
  scoreLabel,
  tryAgainLabel,
  onTryAgain,
}: SessionCompleteCardProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[#b8d96a] bg-[#f4fae0] p-8 text-center">
      <p className="font-heading text-xl font-medium text-[#4a6b0a]">{title}</p>
      {scoreLabel && (
        <p className="mt-2 text-sm font-medium text-[#4a6b0a]/80">{scoreLabel}</p>
      )}
      <Button type="button" className="mt-6" onClick={onTryAgain}>
        <RotateCcw className="size-4" />
        {tryAgainLabel}
      </Button>
    </div>
  );
}
