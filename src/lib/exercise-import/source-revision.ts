import { createHash } from "node:crypto";

/** Content freshness for generated import exercises. */
export function exerciseImportSourceRevision(input: {
  extractedText: string | null;
  additionalInstructions?: string | null;
  studyLanguage: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        extractedText: input.extractedText?.normalize("NFC").trim() ?? "",
        additionalInstructions:
          input.additionalInstructions?.normalize("NFC").trim() ?? "",
        studyLanguage: input.studyLanguage,
      }),
    )
    .digest("hex");
}
