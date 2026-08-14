"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Focus a dynamically added field by id after it mounts.
 * Call `requestFocus(id)` when creating the item, then pass
 * `ref={bindRef(id)}` to the input that should receive focus.
 */
export function useFocusNewItem<T extends HTMLElement = HTMLElement>() {
  const pendingIdRef = useRef<string | null>(null);
  const nodesRef = useRef(new Map<string, T>());
  const [focusNonce, setFocusNonce] = useState(0);

  const requestFocus = useCallback((id: string) => {
    pendingIdRef.current = id;
    setFocusNonce((value) => value + 1);
  }, []);

  const bindRef = useCallback((id: string) => {
    return (node: T | null) => {
      if (node) {
        nodesRef.current.set(id, node);
        return;
      }
      nodesRef.current.delete(id);
    };
  }, []);

  useLayoutEffect(() => {
    const id = pendingIdRef.current;
    if (!id) return;

    const node = nodesRef.current.get(id);
    if (!node) return;

    pendingIdRef.current = null;
    node.focus();
  }, [focusNonce]);

  return { requestFocus, bindRef };
}
