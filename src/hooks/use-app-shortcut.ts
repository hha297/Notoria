"use client";

import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  areShortcutsEnabled,
  chordToHotkey,
  getShortcutChords,
  subscribeShortcutsChanged,
  type ShortcutId,
} from "@/lib/preferences/shortcuts";

type UseAppShortcutOptions = {
  enabled?: boolean;
  enableOnFormTags?: boolean;
  preventDefault?: boolean;
};

/**
 * Binds a global app shortcut from the preferences registry.
 * Supports multiple chords per action. Re-subscribes when Settings remaps keys.
 */
export function useAppShortcut(
  id: ShortcutId,
  handler: (event: KeyboardEvent) => void,
  options: UseAppShortcutOptions = {},
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const [hotkeys, setHotkeys] = useState(() =>
    getShortcutChords(id).map(chordToHotkey).filter(Boolean).join(","),
  );
  const [shortcutsOn, setShortcutsOn] = useState(true);

  useEffect(() => {
    function sync() {
      setHotkeys(
        getShortcutChords(id).map(chordToHotkey).filter(Boolean).join(","),
      );
      setShortcutsOn(areShortcutsEnabled());
    }
    sync();
    return subscribeShortcutsChanged(sync);
  }, [id]);

  useHotkeys(
    hotkeys,
    (event) => {
      if (options.preventDefault !== false) {
        event.preventDefault();
      }
      handlerRef.current(event);
    },
    {
      enabled: shortcutsOn && options.enabled !== false && Boolean(hotkeys),
      enableOnFormTags: options.enableOnFormTags ?? false,
    },
    [
      hotkeys,
      options.enableOnFormTags,
      options.enabled,
      options.preventDefault,
      shortcutsOn,
    ],
  );
}
