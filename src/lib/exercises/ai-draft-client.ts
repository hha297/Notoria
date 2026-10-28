type ExerciseDraftIdentity = {
  scope: string;
  config: string;
};
type ExerciseBatchSlot = "active" | "upcoming";

async function requestDraft<T>(
  action: "load" | "save" | "delete" | "claim",
  identity: ExerciseDraftIdentity,
  payload?: T[],
  slot: ExerciseBatchSlot = "active",
): Promise<T[] | null> {
  try {
    const response = await fetch("/api/ai/exercise-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...identity, payload, slot }),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as {
      ok?: boolean;
      payload?: T[] | null;
    };
    return (action === "load" || action === "claim") && result.ok
      ? (result.payload ?? null)
      : null;
  } catch {
    // Draft persistence must never block exercise generation or submission.
    return null;
  }
}

export function loadExerciseDraft<T>(identity: ExerciseDraftIdentity) {
  return requestDraft<T>("load", identity);
}

export function saveExerciseDraft<T>(
  identity: ExerciseDraftIdentity,
  payload: T[],
) {
  return requestDraft("save", identity, payload);
}

export function deleteExerciseDraft(identity: ExerciseDraftIdentity) {
  return requestDraft("delete", identity);
}

export function loadUpcomingExerciseBatch<T>(identity: ExerciseDraftIdentity) {
  return requestDraft<T>("load", identity, undefined, "upcoming");
}

export function claimUpcomingExerciseBatch<T>(identity: ExerciseDraftIdentity) {
  return requestDraft<T>("claim", identity, undefined, "upcoming");
}

export function saveUpcomingExerciseBatch<T>(
  identity: ExerciseDraftIdentity,
  payload: T[],
) {
  return requestDraft("save", identity, payload, "upcoming");
}
