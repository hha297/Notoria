"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Mutation lock that stays engaged after a successful leave navigation.
 * Call `release()` only when staying on the page (validation/error).
 */
export function useMutationLock() {
  const lockRef = useRef(false);
  const [isPending, setIsPending] = useState(false);

  const tryBegin = useCallback(() => {
    if (lockRef.current) return false;
    lockRef.current = true;
    setIsPending(true);
    return true;
  }, []);

  const release = useCallback(() => {
    lockRef.current = false;
    setIsPending(false);
  }, []);

  return { isPending, tryBegin, release };
}
