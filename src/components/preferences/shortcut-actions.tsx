"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAppShortcut } from "@/hooks/use-app-shortcut";
import type { ShortcutId } from "@/lib/preferences/shortcuts";

type ShortcutActionHandler = () => void;

type ShortcutActionsContextValue = {
  register: (id: ShortcutId, handler: ShortcutActionHandler) => () => void;
  run: (id: ShortcutId) => boolean;
};

const ShortcutActionsContext =
  createContext<ShortcutActionsContextValue | null>(null);

/**
 * Pages/editors register real handlers while mounted.
 * Settings lists registry actions; chords only fire when a handler is active.
 */
export function ShortcutActionsProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef(
    new Map<ShortcutId, Set<ShortcutActionHandler>>(),
  );

  const register = useCallback(
    (id: ShortcutId, handler: ShortcutActionHandler) => {
      let set = handlersRef.current.get(id);
      if (!set) {
        set = new Set();
        handlersRef.current.set(id, set);
      }
      set.add(handler);
      return () => {
        set!.delete(handler);
        if (set!.size === 0) {
          handlersRef.current.delete(id);
        }
      };
    },
    [],
  );

  const run = useCallback((id: ShortcutId) => {
    const set = handlersRef.current.get(id);
    if (!set || set.size === 0) return false;
    const handlers = [...set];
    handlers[handlers.length - 1]!();
    return true;
  }, []);

  useEffect(() => {
    const unsubBack = register("goBack", () => {
      window.history.back();
    });
    const unsubForward = register("goForward", () => {
      window.history.forward();
    });
    return () => {
      unsubBack();
      unsubForward();
    };
  }, [register]);

  return (
    <ShortcutActionsContext.Provider value={{ register, run }}>
      {children}
      <ShortcutActionsBinder />
    </ShortcutActionsContext.Provider>
  );
}

/** Register a context-aware handler for a built-in app action. */
export function useRegisterShortcutAction(
  id: ShortcutId,
  handler: ShortcutActionHandler,
  enabled = true,
) {
  const ctx = useContext(ShortcutActionsContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.register(id, () => {
      handlerRef.current();
    });
  }, [ctx, enabled, id]);
}

function ShortcutActionsBinder() {
  const ctx = useContext(ShortcutActionsContext);
  const runRef = useRef(ctx?.run);
  runRef.current = ctx?.run;

  function dispatch(id: ShortcutId) {
    runRef.current?.(id);
  }

  useAppShortcut("quickSave", () => dispatch("quickSave"));
  useAppShortcut("quickEdit", () => dispatch("quickEdit"));
  useAppShortcut("quickView", () => dispatch("quickView"));
  useAppShortcut("download", () => dispatch("download"));
  useAppShortcut("deleteItem", () => dispatch("deleteItem"));
  useAppShortcut("createNew", () => dispatch("createNew"));
  useAppShortcut("goBack", () => dispatch("goBack"));
  useAppShortcut("goForward", () => dispatch("goForward"));

  return null;
}
