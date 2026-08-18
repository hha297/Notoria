export const SPEAKING_TUTOR_NAME = "Notoria Tutor";

const STREAM_TRANSCRIPTION_LANGUAGES = new Set([
  "auto",
  "en",
  "fr",
  "es",
  "de",
  "it",
  "nl",
  "pt",
  "pl",
  "ca",
  "cs",
  "da",
  "el",
  "fi",
  "id",
  "ja",
  "ru",
  "sv",
  "ta",
  "th",
  "tr",
  "hu",
  "ro",
  "zh",
  "ar",
  "hi",
  "hr",
  "ko",
  "ms",
  "no",
  "uk",
  "bg",
  "et",
  "sl",
  "sk",
]);

export function speakingTutorUserId(sessionId: string) {
  return `tutor-${sessionId}`;
}

export function isSpeakingTutorUserId(userId: string | undefined | null) {
  return Boolean(userId?.startsWith("tutor-"));
}

export function speakingAvatarUri(
  seed: string,
  variant: "initials" | "bottts" = "initials",
) {
  const encoded = encodeURIComponent(seed);
  if (variant === "bottts") {
    return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encoded}`;
  }
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encoded}`;
}

export function streamTranscriptionLanguage(languageCode: string | null | undefined) {
  const code = languageCode?.trim().toLowerCase();
  if (code && STREAM_TRANSCRIPTION_LANGUAGES.has(code)) {
    return code;
  }
  return "auto";
}
