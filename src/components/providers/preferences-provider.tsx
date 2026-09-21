"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import {
  applyReduceMotionToDocument,
  getReduceMotionPreference,
  resolveFramerReducedMotion,
  setReduceMotionPreference,
  type ReduceMotionPreference,
} from "@/lib/preferences/app-preferences";

type PreferencesContextValue = {
  reduceMotion: ReduceMotionPreference;
  setReduceMotion: (value: ReduceMotionPreference) => void;
  ready: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotionState] =
    useState<ReduceMotionPreference>("system");
  const [ready, setReady] = useState(false);
  const systemPrefersReduce = useReducedMotion();

  useEffect(() => {
    setReduceMotionState(getReduceMotionPreference());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyReduceMotionToDocument(
      reduceMotion,
      Boolean(systemPrefersReduce),
    );
  }, [ready, reduceMotion, systemPrefersReduce]);

  const setReduceMotion = useCallback((value: ReduceMotionPreference) => {
    setReduceMotionState(value);
    setReduceMotionPreference(value);
  }, []);

  const value = useMemo(
    () => ({ reduceMotion, setReduceMotion, ready }),
    [reduceMotion, setReduceMotion, ready],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <MotionConfig reducedMotion={resolveFramerReducedMotion(reduceMotion)}>
        {children}
      </MotionConfig>
    </PreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used within PreferencesProvider");
  }
  return context;
}
