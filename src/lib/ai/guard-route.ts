import { NextResponse } from "next/server";
import {
  AiAssistanceDisabledError,
  requireAiAssistanceEnabled,
} from "@/lib/ai/preferences-server";
import type { AiPreferences } from "@/lib/ai/preferences";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import {
  consumeUsage,
  requireFeature,
} from "@/lib/billing/entitlements";
import {
  PremiumRequiredError,
  ProRequiredError,
  QuotaExceededError,
} from "@/lib/billing/errors";
import type { FeatureId, QuotaFeatureId } from "@/lib/billing/plans";
import {
  finalizeUsageReservation,
  refundUsageReservation,
} from "@/lib/billing/usage";

export type MeteredAiAccess = {
  ok: true;
  preferences: AiPreferences;
  reservationId: string | null;
};

export type MeteredAiAccessWithUser = MeteredAiAccess & {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUserRecord>>>;
};

async function unauthorized() {
  return NextResponse.json(
    { ok: false, code: "AI_FORBIDDEN" },
    { status: 401 },
  );
}

async function preferencesOrResponse(): Promise<
  | { ok: true; preferences: AiPreferences; user: NonNullable<Awaited<ReturnType<typeof getCurrentUserRecord>>> }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUserRecord();
  if (!user) {
    return { ok: false, response: await unauthorized() };
  }
  try {
    const preferences = await requireAiAssistanceEnabled();
    return { ok: true, preferences, user };
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, code: "AI_DISABLED" },
          { status: 403 },
        ),
      };
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, response: await unauthorized() };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "AI_UNAVAILABLE" },
        { status: 500 },
      ),
    };
  }
}

/** Authenticated user with AI assistance enabled. Does not check plan or quota. */
export async function guardAiEnabled(): Promise<
  | { ok: true; preferences: AiPreferences }
  | { ok: false; response: NextResponse }
> {
  const access = await preferencesOrResponse();
  if (!access.ok) return access;
  return { ok: true, preferences: access.preferences };
}

/** Capability gates such as PDF export. Keeps AI_FORBIDDEN for existing clients. */
export async function guardProFeature(feature: FeatureId): Promise<
  | { ok: true; preferences: AiPreferences }
  | { ok: false; response: NextResponse }
> {
  const access = await preferencesOrResponse();
  if (!access.ok) return access;
  try {
    await requireFeature(access.user, feature);
    return { ok: true, preferences: access.preferences };
  } catch (error) {
    if (error instanceof ProRequiredError || error instanceof PremiumRequiredError) {
      const { feature, currentPlan, requiredPlan } = error.body;
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            code: "AI_FORBIDDEN",
            feature,
            currentPlan,
            requiredPlan,
          },
          { status: 403 },
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "AI_UNAVAILABLE" },
        { status: 500 },
      ),
    };
  }
}

/** Reserves one Free quota unit. Pro and Premium skip the write. */
export async function guardMeteredAi(
  feature: QuotaFeatureId,
): Promise<MeteredAiAccess | { ok: false; response: NextResponse }> {
  const access = await preferencesOrResponse();
  if (!access.ok) return access;
  try {
    const reservation = await consumeUsage(access.user, feature);
    return {
      ok: true,
      preferences: access.preferences,
      reservationId: reservation.reservationId,
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return {
        ok: false,
        response: NextResponse.json(error.body, { status: 402 }),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "AI_UNAVAILABLE" },
        { status: 500 },
      ),
    };
  }
}

/**
 * Premium Learning Coach chat: capability gate first, then daily message quota.
 * Free/Pro get PREMIUM_REQUIRED — never a Free-style quota toast for this surface.
 */
export async function guardPremiumCoachChat(): Promise<
  MeteredAiAccessWithUser | { ok: false; response: NextResponse }
> {
  const access = await preferencesOrResponse();
  if (!access.ok) return access;
  try {
    await requireFeature(access.user, "ai_learning_coach");
    const reservation = await consumeUsage(
      access.user,
      "ai_learning_coach_chat",
    );
    return {
      ok: true,
      preferences: access.preferences,
      reservationId: reservation.reservationId,
      user: access.user,
    };
  } catch (error) {
    if (error instanceof PremiumRequiredError || error instanceof ProRequiredError) {
      return {
        ok: false,
        response: NextResponse.json(error.body, { status: 403 }),
      };
    }
    if (error instanceof QuotaExceededError) {
      return {
        ok: false,
        response: NextResponse.json(error.body, { status: 402 }),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "AI_UNAVAILABLE" },
        { status: 500 },
      ),
    };
  }
}

export async function settleMeteredAi(
  access: { reservationId: string | null },
  succeeded: boolean,
) {
  if (!access.reservationId) return;
  if (succeeded) {
    await finalizeUsageReservation(access.reservationId);
  } else {
    await refundUsageReservation(access.reservationId);
  }
}
