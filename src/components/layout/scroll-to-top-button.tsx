"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Show after the user has scrolled this far on the active scroll root. */
const SHOW_AFTER_PX = 400;
/** Hide again once they return this close to the top (light hysteresis). */
const HIDE_BELOW_PX = 160;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function documentScrollTop(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function scrollRoots(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-scroll-root]"),
  );
}

type ScrollTarget = Window | HTMLElement;

function readScrollTop(target: ScrollTarget): number {
  if (target === window) return documentScrollTop();
  return (target as HTMLElement).scrollTop;
}

/**
 * Prefer the scroll root the user is actually using (most scrolled).
 * Falls back to the document.
 */
function resolveActiveScrollTarget(): ScrollTarget {
  let best: { top: number; target: ScrollTarget } = {
    top: documentScrollTop(),
    target: window,
  };
  for (const root of scrollRoots()) {
    const style = window.getComputedStyle(root);
    const canScroll =
      /(auto|scroll|overlay)/.test(style.overflowY) ||
      root.scrollHeight > root.clientHeight + 1;
    if (!canScroll) continue;
    if (root.scrollTop >= best.top) {
      best = { top: root.scrollTop, target: root };
    }
  }
  return best.target;
}

/** Height of sticky/fixed bottom chrome that would collide with the FAB. */
function measureBottomClearance(): number {
  const nodes = document.querySelectorAll<HTMLElement>(
    "[data-scroll-top-clearance]",
  );
  let clearance = 0;
  const viewportBottom = window.innerHeight;
  for (const node of nodes) {
    if (node.getAttribute("aria-hidden") === "true") continue;
    const rect = node.getBoundingClientRect();
    if (rect.height <= 0) continue;
    if (rect.bottom < viewportBottom - 4) continue;
    if (rect.top >= viewportBottom) continue;
    clearance = Math.max(clearance, viewportBottom - rect.top);
  }
  return clearance;
}

function scrollTargetToTop(target: ScrollTarget) {
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  if (target === window) {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  (target as HTMLElement).scrollTo({ top: 0, behavior });
}

/**
 * App-wide floating control — one instance in the root layout.
 * Sticky footers opt in with `data-scroll-top-clearance`.
 * Nested scroll panes opt in with `data-scroll-root`.
 */
export function ScrollToTopButton() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [clearance, setClearance] = useState(0);
  const rootsRef = useRef<HTMLElement[]>([]);

  const sync = useCallback(() => {
    const target = resolveActiveScrollTarget();
    const top = readScrollTop(target);
    setVisible((wasVisible) => {
      if (wasVisible) return top > HIDE_BELOW_PX;
      return top >= SHOW_AFTER_PX;
    });
    setClearance(measureBottomClearance());
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset when the route changes so a deep scroll on page A doesn't flash on page B.
  useEffect(() => {
    setVisible(false);
    setClearance(0);
    const frame = window.requestAnimationFrame(() => sync());
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, sync]);

  useEffect(() => {
    if (!mounted) return;

    const onScrollOrResize = () => sync();

    const bindRoots = () => {
      for (const root of rootsRef.current) {
        root.removeEventListener("scroll", onScrollOrResize);
      }
      rootsRef.current = scrollRoots();
      for (const root of rootsRef.current) {
        root.addEventListener("scroll", onScrollOrResize, { passive: true });
      }
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    bindRoots();

    const observer = new MutationObserver(() => {
      bindRoots();
      sync();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-scroll-top-clearance", "data-scroll-root"],
    });

    sync();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      for (const root of rootsRef.current) {
        root.removeEventListener("scroll", onScrollOrResize);
      }
      observer.disconnect();
    };
  }, [mounted, pathname, sync]);

  if (!mounted) return null;

  const label = t("scrollToTop");

  return createPortal(
    <div
      className="pointer-events-none fixed z-[35]"
      style={{
        right: "calc(1rem + env(safe-area-inset-right, 0px))",
        bottom: `calc(1rem + env(safe-area-inset-bottom, 0px) + ${clearance}px)`,
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={label}
              tabIndex={visible ? 0 : -1}
              aria-hidden={!visible}
              onClick={() => {
                const target = resolveActiveScrollTarget();
                scrollTargetToTop(target);
                if (target !== window && documentScrollTop() > 0) {
                  scrollTargetToTop(window);
                }
              }}
              className={cn(
                "pointer-events-auto flex size-11 items-center justify-center rounded-[var(--radius-lg)] border border-(--page-accent-border)",
                "bg-surface text-(--page-accent) shadow-[0_8px_24px_color-mix(in_oklab,var(--ink)_16%,transparent)]",
                "transition-[opacity,transform,background-color,box-shadow,border-color] duration-200 ease-out",
                "hover:border-(--page-accent) hover:bg-(--page-accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--page-accent)/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "motion-reduce:transition-none dark:bg-surface-elevated",
                visible
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-2 scale-95 opacity-0",
              )}
            />
          }
        >
          <ArrowUp className="size-5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="left">{label}</TooltipContent>
      </Tooltip>
    </div>,
    document.body,
  );
}
