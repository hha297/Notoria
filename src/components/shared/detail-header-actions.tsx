"use client";

import type { LucideIcon } from "lucide-react";
import { Lock, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import detailStyles from "@/components/style/workspace/detail.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export type DetailOverflowItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** When true, free users see a lock affordance and open upgrade instead. */
  requiresPro?: boolean;
  /** Extra classes for the wide (desktop) button, e.g. route-quiet-action. */
  className?: string;
  /** data-route-action for quiet-action styling on desktop. */
  routeAction?: string;
};

type DetailHeaderActionsProps = {
  /** Always-visible primary control(s), typically Edit. */
  primary?: ReactNode;
  /** Secondary actions — full row on sm+, overflow menu on narrow screens. */
  items?: DetailOverflowItem[];
  /** Optional always-visible controls that stay outside the overflow. */
  leading?: ReactNode;
  className?: string;
};

/**
 * Detail page action cluster: full buttons on wider screens, compact overflow on mobile.
 */
export function DetailHeaderActions({
  primary,
  items = [],
  leading,
  className,
}: DetailHeaderActionsProps) {
  const t = useTranslations("common");
  const { hasProAccess, openUpgrade } = useProAccess();

  function runItem(item: DetailOverflowItem) {
    if (item.disabled) return;
    if (item.requiresPro && !hasProAccess) {
      openUpgrade();
      return;
    }
    item.onSelect();
  }

  return (
    <div className={cn(mx(detailStyles, "actions"), className)}>
      {leading}

      <div className={mx(detailStyles, "actionsWide")}>
        {items.map((item) => {
          const Icon = item.icon;
          const locked = Boolean(item.requiresPro && !hasProAccess && !item.disabled);
          return (
            <Button
              key={item.id}
              type="button"
              variant={item.destructive ? "destructive" : "outline"}
              disabled={item.disabled}
              aria-disabled={locked || item.disabled || undefined}
              onClick={() => runItem(item)}
              className={cn(locked && lockedFeatureClassName, item.className)}
              data-route-action={item.routeAction}
            >
              {locked ? <Lock className="size-4" /> : Icon ? <Icon className="size-4" /> : null}
              {item.label}
            </Button>
          );
        })}
      </div>

      {primary}

      {items.length > 0 ? (
        <div className={mx(detailStyles, "actionsNarrow")}>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("moreActions")}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "size-9 shrink-0",
              )}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {items.map((item, index) => {
                const Icon = item.icon;
                const locked = Boolean(
                  item.requiresPro && !hasProAccess && !item.disabled,
                );
                const prevDestructive = items[index - 1]?.destructive;
                return (
                  <div key={item.id}>
                    {item.destructive && !prevDestructive ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    <DropdownMenuItem
                      disabled={item.disabled}
                      variant={item.destructive ? "destructive" : "default"}
                      className="cursor-pointer"
                      onClick={() => runItem(item)}
                    >
                      {locked ? (
                        <Lock className="size-4" />
                      ) : Icon ? (
                        <Icon className="size-4" />
                      ) : null}
                      {item.label}
                    </DropdownMenuItem>
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}
