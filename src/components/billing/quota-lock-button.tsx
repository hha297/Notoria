"use client";

import type { ComponentProps, ReactNode } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<typeof Button>;

type QuotaLockButtonProps = Omit<ButtonProps, "children"> & {
  locked: boolean;
  lockMessage: string;
  /** Shown when not locked (and not pending). */
  icon?: ReactNode;
  pending?: boolean;
  children: ReactNode;
};

/**
 * Quota-aware button: when locked, shows Lock icon, disables click, and
 * surfaces the limit message in a hover tooltip (no inline banner).
 */
export function QuotaLockButton({
  locked,
  lockMessage,
  icon,
  pending = false,
  disabled,
  className,
  children,
  onClick,
  ...props
}: QuotaLockButtonProps) {
  const isDisabled = Boolean(disabled || locked || pending);

  const button = (
    <Button
      {...props}
      className={cn(
        locked && "shadow-none !shadow-none",
        className,
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={locked ? undefined : onClick}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : locked ? (
        <Lock className="size-4" />
      ) : (
        icon
      )}
      {children}
    </Button>
  );

  if (!locked) return button;

  // Wrap: disabled buttons do not receive pointer events for tooltips.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex max-w-full cursor-not-allowed" />
        }
      >
        {button}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left">
        {lockMessage}
      </TooltipContent>
    </Tooltip>
  );
}
