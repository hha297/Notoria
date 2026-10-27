type ExerciseDraftIdentity = {
  scope: string;
  config: string;
};

async function requestDraft<T>(
  action: "load" | "save" | "delete",
  identity: ExerciseDraftIdentity,
  payload?: T[],
): Promise<T[] | null> {
  try {
    const response = await fetch("/api/ai/exercise-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...identity, payload }),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as {
      ok?: boolean;
      payload?: T[] | null;
    };
    return action === "load" && result.ok ? (result.payload ?? null) : null;
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
