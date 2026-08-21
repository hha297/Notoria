"use client";

import { useCallback, useEffect, useState } from "react";
import { HINT_COUNTDOWN_SECONDS } from "@/lib/exercises/hint";

export function useTimedHint(answered: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(HINT_COUNTDOWN_SECONDS);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (answered) return;
    if (secondsLeft <= 0) {
      setShown(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [answered, secondsLeft]);

  const showNow = useCallback(() => {
    setShown(true);
  }, []);

  const hintVisible = shown || (secondsLeft <= 0 && !answered);
  const canRevealAnswer = hintVisible && !answered;

  return { secondsLeft, shown, showNow, hintVisible, canRevealAnswer };
}
