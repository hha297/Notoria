import { getCurrentProAccess, requireProAccess } from "@/lib/auth/pro-access";
import { hasProAccess, ProAccessError } from "@/lib/auth/paid-access";

export class AiAccessError extends ProAccessError {
  constructor() {
    super("AI_FORBIDDEN");
    this.name = "AiAccessError";
  }
}

export { hasProAccess as hasAiAccess };

export async function getCurrentAiAccess() {
  const { hasProAccess: canUseAi } = await getCurrentProAccess();
  return { canUseAi };
}

export async function requireAiAccess() {
  try {
    return await requireProAccess();
  } catch (error) {
    if (error instanceof ProAccessError) {
      throw new AiAccessError();
    }
    throw error;
  }
}
