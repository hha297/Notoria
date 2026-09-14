export type VocabularyExportPhase = "preparing" | "generating" | "saving";

export type VocabularyExportProgress = {
  phase: VocabularyExportPhase;
  current: number;
  total: number;
};

export type VocabularyExportProgressHandler = (
  progress: VocabularyExportProgress,
) => void;

export async function yieldToMain() {
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
      return;
    }
    setTimeout(resolve, 0);
  });
}

export function reportProgress(
  onProgress: VocabularyExportProgressHandler | undefined,
  progress: VocabularyExportProgress,
) {
  onProgress?.(progress);
}
