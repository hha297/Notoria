import { NextResponse } from "next/server";
import {
  AiAccessError,
  AiAssistanceDisabledError,
  requireAiAccess,
} from "@/lib/auth/ai-access";
import type { AiPreferences } from "@/lib/ai/preferences";

export async function guardAiRoute(): Promise<
  | { ok: true; preferences: AiPreferences }
  | { ok: false; response: NextResponse }
> {
  try {
    const { preferences } = await requireAiAccess();
    return { ok: true, preferences };
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
    if (error instanceof AiAccessError) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, code: "AI_FORBIDDEN" },
          { status: 403 },
        ),
      };
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, code: "AI_FORBIDDEN" },
          { status: 401 },
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
