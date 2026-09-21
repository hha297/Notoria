"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { updateAiPreferencesAction } from "@/lib/actions/ai-preferences";
import {
  DEFAULT_AI_PREFERENCES,
  type AiPreferences,
  type AiPreferencesUpdate,
  aiSuggestionsAllowed,
  shouldAutoApplyAiContentChange,
  shouldConfirmAiContentChange,
} from "@/lib/ai/preferences";

type AiPreferencesContextValue = {
  preferences: AiPreferences;
  ready: boolean;
  suggestionsAllowed: boolean;
  shouldConfirmContentChange: boolean;
  shouldAutoApplyContentChange: boolean;
  updatePreferences: (update: AiPreferencesUpdate) => Promise<void>;
};

const AiPreferencesContext = createContext<AiPreferencesContextValue | null>(
  null,
);

export function AiPreferencesProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: AiPreferences | null;
}) {
  const t = useTranslations("settings.ai");
  const [local, setLocal] = useState<AiPreferences | null>(null);
  const preferences = local ?? initial ?? DEFAULT_AI_PREFERENCES;

  const updatePreferences = useCallback(
    async (update: AiPreferencesUpdate) => {
      const previous = preferences;
      const optimistic = { ...previous, ...update };
      setLocal(optimistic);
      try {
        const saved = await updateAiPreferencesAction(update);
        setLocal(saved);
      } catch {
        setLocal(previous);
        toast.error(t("saveFailed"));
      }
    },
    [preferences, t],
  );

  const value = useMemo<AiPreferencesContextValue>(
    () => ({
      preferences,
      ready: true,
      suggestionsAllowed: aiSuggestionsAllowed(preferences),
      shouldConfirmContentChange: shouldConfirmAiContentChange(preferences),
      shouldAutoApplyContentChange: shouldAutoApplyAiContentChange(preferences),
      updatePreferences,
    }),
    [preferences, updatePreferences],
  );

  return (
    <AiPreferencesContext.Provider value={value}>
      {children}
    </AiPreferencesContext.Provider>
  );
}

export function useAiPreferences() {
  const ctx = useContext(AiPreferencesContext);
  if (!ctx) {
    return {
      preferences: DEFAULT_AI_PREFERENCES,
      ready: false,
      suggestionsAllowed: true,
      shouldConfirmContentChange: true,
      shouldAutoApplyContentChange: false,
      updatePreferences: async () => {},
    } satisfies AiPreferencesContextValue;
  }
  return ctx;
}
