"use client";

import { Loader2, Lock, RotateCcw, Sparkles } from "lucide-react";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SessionCompleteCardProps = {
  title: string;
  scoreLabel?: string;
  tryAgainLabel: string;
  onTryAgain: () => void;
  extraAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    locked?: boolean;
  };
};

export function SessionCompleteCard({
  title,
  scoreLabel,
  tryAgainLabel,
  onTryAgain,
  extraAction,
}: SessionCompleteCardProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[#b8d96a] bg-[#f4fae0] p-5 text-center sm:p-8">
      <p className="font-heading text-xl font-medium text-[#4a6b0a]">{title}</p>
      {scoreLabel && (
        <p className="mt-2 text-sm font-medium text-[#4a6b0a]/80">{scoreLabel}</p>
      )}
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button type="button" onClick={onTryAgain} disabled={extraAction?.loading}>
          <RotateCcw className="size-4" />
          {tryAgainLabel}
        </Button>
        {extraAction ? (
          <Button
            type="button"
            variant="outline"
            aria-disabled={extraAction.locked || undefined}
            onClick={extraAction.onClick}
            disabled={!extraAction.locked && (extraAction.disabled || extraAction.loading)}
            className={cn(extraAction.locked && lockedFeatureClassName)}
          >
            {extraAction.loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : extraAction.locked ? (
              <Lock className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {extraAction.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
