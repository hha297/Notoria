/**
 * Studio activity previews — study-language side only.
 * Meaning glosses (MC options, match right) come from next-intl / web locale via t().
 */

export type ActivityPreviewSamples = {
  flashcardWord: string;
  /** Word shown as the MC stem (workspace study language). */
  mcPromptWord: string;
  fillBlankBefore: string;
  fillBlankAfter: string;
  matchLeft: string;
  matchLeftB: string;
  formChips: readonly [string, string, string];
};

const PREVIEW_BY_LANGUAGE: Record<string, ActivityPreviewSamples> = {
  fi: {
    flashcardWord: "suomalainen",
    mcPromptWord: "suomalainen",
    fillBlankBefore: "Minulla on uusi ",
    fillBlankAfter: ".",
    matchLeft: "talo",
    matchLeftB: "koti",
    formChips: ["minä", "asun", "Suomessa"],
  },
  en: {
    flashcardWord: "beautiful",
    mcPromptWord: "beautiful",
    fillBlankBefore: "I have a new ",
    fillBlankAfter: ".",
    matchLeft: "house",
    matchLeftB: "home",
    formChips: ["I", "live", "in Finland"],
  },
  vi: {
    flashcardWord: "xinh đẹp",
    mcPromptWord: "xinh đẹp",
    fillBlankBefore: "Tôi có một ",
    fillBlankAfter: " mới.",
    matchLeft: "nhà",
    matchLeftB: "nhà ở",
    formChips: ["Tôi", "sống", "ở Phần Lan"],
  },
};

const FALLBACK_LANGUAGE = "en";

export function getActivityPreviewSamples(
  workspaceLanguage: string | null | undefined,
): ActivityPreviewSamples {
  const code = workspaceLanguage?.trim().toLowerCase() || FALLBACK_LANGUAGE;
  return PREVIEW_BY_LANGUAGE[code] ?? PREVIEW_BY_LANGUAGE[FALLBACK_LANGUAGE]!;
}
