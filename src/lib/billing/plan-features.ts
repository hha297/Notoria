/**
 * Canonical plan comparison metadata for pricing UI and upgrade modal.
 * Display values derive from FREE_DAILY_QUOTAS / getFeatureAccess — do not
 * duplicate limits as prose elsewhere.
 */

import {
  PREMIUM_COACH_CHAT_DAILY,
  VISIBLE_PREMIUM_FEATURES,
  getFeatureAccess,
  type CapabilityFeatureId,
  type PlanId,
  type QuotaFeatureId,
} from "@/lib/billing/plans";

export type PlanFeatureCategory =
  | "core"
  | "ai"
  | "export"
  | "personalized";

export type PlanCellDisplay =
  | { kind: "included" }
  | { kind: "unavailable" }
  | { kind: "quota"; limit: number }
  | { kind: "unlimited" }
  | { kind: "limited" };

export type PlanComparisonRow = {
  id: string;
  category: PlanFeatureCategory;
  /** next-intl key under billing.features.* */
  nameKey: string;
  cells: Record<PlanId, PlanCellDisplay>;
  /** When set, row only appears if the Premium capability is in VISIBLE_PREMIUM_FEATURES. */
  premiumCapability?: CapabilityFeatureId;
};

function quota(limit: number): PlanCellDisplay {
  return { kind: "quota", limit };
}

function yes(): PlanCellDisplay {
  return { kind: "included" };
}

function no(): PlanCellDisplay {
  return { kind: "unavailable" };
}

function unlimited(): PlanCellDisplay {
  return { kind: "unlimited" };
}

function cellForQuota(plan: PlanId, feature: QuotaFeatureId): PlanCellDisplay {
  const access = getFeatureAccess(plan, feature);
  if (access.kind !== "quota") return no();
  if (access.limit === null) return unlimited();
  if (access.limit <= 0) return no();
  return quota(access.limit);
}

function quotaRow(
  id: QuotaFeatureId,
  nameKey: string,
): PlanComparisonRow {
  return {
    id,
    category: "ai",
    nameKey,
    cells: {
      free: cellForQuota("free", id),
      pro: cellForQuota("pro", id),
      premium: cellForQuota("premium", id),
    },
  };
}

/**
 * Full matrix. Premium-only rows are filtered by VISIBLE_PREMIUM_FEATURES at
 * read time so scaffolded capabilities never appear in marketing.
 *
 * Speaking and Listening modules are on all plans; AI tutor/transcript quotas
 * are the Free limits under AI tools.
 */
const ALL_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    id: "vocabulary",
    category: "core",
    nameKey: "vocabulary",
    cells: { free: yes(), pro: yes(), premium: yes() },
  },
  {
    id: "exercises",
    category: "core",
    nameKey: "exercises",
    cells: { free: yes(), pro: yes(), premium: yes() },
  },
  {
    id: "theory",
    category: "core",
    nameKey: "theory",
    cells: { free: yes(), pro: yes(), premium: yes() },
  },
  {
    id: "workspace",
    category: "core",
    nameKey: "workspace",
    cells: { free: yes(), pro: yes(), premium: yes() },
  },
  {
    id: "listening",
    category: "core",
    nameKey: "listening",
    // Module is open on Free; AI transcript is metered separately under AI tools.
    cells: { free: yes(), pro: yes(), premium: yes() },
  },
  {
    id: "speaking",
    category: "core",
    nameKey: "speaking",
    // Module is open on Free; live tutor calls meter ai_meeting under AI tools.
    cells: { free: yes(), pro: yes(), premium: yes() },
  },
  // Speaking sessions consume ai_meeting — one marketing row.
  quotaRow("ai_meeting", "aiSpeakingTutor"),
  quotaRow("ai_listening_transcript", "aiListeningTranscript"),
  quotaRow("ai_exercise", "aiExercise"),
  quotaRow("ai_vocabulary", "aiVocabulary"),
  quotaRow("ai_writing", "aiWritingSupport"),
  {
    id: "pdf_export",
    category: "export",
    nameKey: "pdfDocxExport",
    cells: { free: no(), pro: yes(), premium: yes() },
  },
  {
    id: "ai_learning_coach",
    category: "personalized",
    nameKey: "learningCoach",
    premiumCapability: "ai_learning_coach",
    cells: { free: no(), pro: no(), premium: yes() },
  },
  {
    id: "ask_learning_coach",
    category: "personalized",
    nameKey: "askLearningCoach",
    premiumCapability: "ai_learning_coach",
    cells: {
      free: no(),
      pro: no(),
      premium: quota(PREMIUM_COACH_CHAT_DAILY),
    },
  },
  {
    id: "personal_learning_profile",
    category: "personalized",
    nameKey: "learningProfile",
    premiumCapability: "personal_learning_profile",
    cells: { free: no(), pro: no(), premium: yes() },
  },
  {
    id: "adaptive_daily_practice",
    category: "personalized",
    nameKey: "adaptiveDailyPractice",
    premiumCapability: "adaptive_daily_practice",
    cells: { free: no(), pro: no(), premium: yes() },
  },
  {
    id: "practice_from_mistakes",
    category: "personalized",
    nameKey: "practiceFromMistakes",
    premiumCapability: "practice_from_mistakes",
    cells: { free: no(), pro: no(), premium: yes() },
  },
  {
    id: "weekly_learning_review",
    category: "personalized",
    nameKey: "weeklyLearningReview",
    premiumCapability: "weekly_learning_review",
    cells: { free: no(), pro: no(), premium: yes() },
  },
  {
    id: "personal_learning_path",
    category: "personalized",
    nameKey: "personalizedRecommendations",
    premiumCapability: "personal_learning_path",
    cells: { free: no(), pro: no(), premium: yes() },
  },
  {
    id: "cross_module_ai",
    category: "personalized",
    nameKey: "crossModuleIntelligence",
    premiumCapability: "cross_module_ai",
    cells: { free: no(), pro: no(), premium: yes() },
  },
];

const VISIBLE_PREMIUM = new Set<string>(VISIBLE_PREMIUM_FEATURES);

export function getPlanComparisonRows(options?: {
  /** When true, only Premium-only personalized rows (for Pro users). */
  premiumDeltaOnly?: boolean;
}): PlanComparisonRow[] {
  const rows = ALL_COMPARISON_ROWS.filter((row) => {
    if (!row.premiumCapability) return true;
    return VISIBLE_PREMIUM.has(row.premiumCapability);
  });

  if (options?.premiumDeltaOnly) {
    return rows.filter((row) => row.category === "personalized");
  }
  return rows;
}

export const PLAN_FEATURE_CATEGORIES: PlanFeatureCategory[] = [
  "core",
  "ai",
  "export",
  "personalized",
];

export function formatPlanCell(
  cell: PlanCellDisplay,
  labels: {
    included: string;
    unavailable: string;
    unlimited: string;
    limited: string;
    perDay: (n: number) => string;
  },
): string {
  switch (cell.kind) {
    case "included":
      return labels.included;
    case "unavailable":
      return labels.unavailable;
    case "unlimited":
      return labels.unlimited;
    case "limited":
      return labels.limited;
    case "quota":
      return labels.perDay(cell.limit);
    default: {
      const _exhaustive: never = cell;
      return _exhaustive;
    }
  }
}
