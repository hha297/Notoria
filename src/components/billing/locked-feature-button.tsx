"use client";

import { Lock } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";
import { planGrantsFeature, type FeatureId } from "@/lib/billing/plans";

type LockedFeatureButtonProps = ComponentProps<typeof Button> & {
  /** Explicit lock override. Prefer `feature` when possible. */
  locked?: boolean;
  /** Entitlement feature — lock state derives from planGrantsFeature(plan, feature). */
  feature?: FeatureId;
  icon?: React.ReactNode;
};

export function LockedFeatureButton({
  locked,
  feature,
  icon,
  children,
  onClick,
  className,
  disabled,
  ...props
}: LockedFeatureButtonProps) {
  const { hasProAccess, openUpgrade, plan } = useProAccess();
  const isLocked = Boolean(
    !disabled &&
      (locked ??
        (feature ? !planGrantsFeature(plan, feature) : !hasProAccess)),
  );

  return (
    <Button
      {...props}
      disabled={disabled}
      aria-disabled={isLocked || disabled || undefined}
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
