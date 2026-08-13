"use client";

import { useCallback, useEffect, useState } from "react";
import { HINT_COUNTDOWN_SECONDS } from "@/lib/exercises/hint";

export function useTimedHint(answered: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(HINT_COUNTDOWN_SECONDS);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown || answered) return;
    if (secondsLeft <= 0) {
      setShown(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [answered, secondsLeft, shown]);

  const showNow = useCallback(() => {
    setShown(true);
  }, []);

  return { secondsLeft, shown, showNow };
}
