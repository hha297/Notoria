"use server";

import { isPaidDocumentFormat, ProAccessError } from "@/lib/auth/paid-access";
import { requireProAccess } from "@/lib/auth/pro-access";
import { getCurrentUserId } from "@/lib/auth/session";

export async function assertPaidDocumentExport(format: string) {
  try {
    if (!isPaidDocumentFormat(format)) {
      await getCurrentUserId();
      return { ok: true as const };
    }

    await requireProAccess();
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ProAccessError) {
      return { ok: false as const, code: "PRO_REQUIRED" as const };
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false as const, code: "UNAUTHORIZED" as const };
    }
    return { ok: false as const, code: "PRO_REQUIRED" as const };
  }
}
