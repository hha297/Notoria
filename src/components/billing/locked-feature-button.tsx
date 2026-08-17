"use client";

import { Lock } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";

type LockedFeatureButtonProps = ComponentProps<typeof Button> & {
  locked?: boolean;
  icon?: React.ReactNode;
};

export function LockedFeatureButton({
  locked,
  icon,
  children,
  onClick,
  className,
  ...props
}: LockedFeatureButtonProps) {
  const { hasProAccess, openUpgrade } = useProAccess();
  const isLocked = locked ?? !hasProAccess;

  return (
    <Button
      {...props}
      aria-disabled={isLocked || undefined}
      className={cn(isLocked && lockedFeatureClassName, className)}
      onClick={(event) => {
        if (isLocked) {
          event.preventDefault();
          openUpgrade();
          return;
        }
        onClick?.(event);
      }}
    >
      {isLocked ? <Lock className="size-4" /> : icon}
      {children}
    </Button>
  );
}
