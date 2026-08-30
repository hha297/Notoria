"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { findTutorialTarget } from "@/lib/onboarding/tutorial-targets";

function isMostlyVisible(rect: DOMRect) {
  const margin = 8;
  return (
    rect.top >= margin &&
    rect.left >= margin &&
    rect.bottom <= window.innerHeight - margin &&
    rect.right <= window.innerWidth - margin
  );
}

export function useTutorialTarget(
  targetId: string | undefined,
  active: boolean,
  remeasureKey = 0,
) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [missing, setMissing] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    if (!targetId) {
      setRect(null);
      setMissing(false);
      return;
    }

    const element = findTutorialTarget(targetId);
    if (!element) {
      setRect(null);
      setMissing(true);
      return;
    }

    setMissing(false);
    setRect(element.getBoundingClientRect());
  }, [targetId]);

  useEffect(() => {
    if (!active || !targetId) {
      setRect(null);
      setMissing(false);
      return;
    }

    let cancelled = false;

    const runMeasure = (scrollIfNeeded: boolean) => {
      if (cancelled) return;

      const element = findTutorialTarget(targetId);
      if (!element) {
        setRect(null);
        setMissing(true);
        return;
      }

      if (scrollIfNeeded) {
        const current = element.getBoundingClientRect();
        if (!isMostlyVisible(current)) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          window.clearTimeout(scrollTimeoutRef.current ?? undefined);
          scrollTimeoutRef.current = window.setTimeout(() => {
            if (!cancelled) measure();
          }, 350);
          return;
        }
      }

      measure();
    };

    runMeasure(true);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearTimeout(scrollTimeoutRef.current ?? undefined);
    };
  }, [active, targetId, measure, remeasureKey]);

  return { rect, missing };
}
