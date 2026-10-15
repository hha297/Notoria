/**
 * Stream Dashboard checklist (call type `default`) — required alongside code:
 * 1. Limits → max_duration_seconds = 1800 (matches SPEAKING_MAX_SESSION_SECONDS)
 * 2. Disable JoinEndedCall for the ordinary `user` role
 * 3. Restrict JoinCall to call members when possible
 * 4. Do not grant learners UpdateCallSettings / EndCall / admin
 * 5. Webhooks: session_started, participant_left, session_ended, transcription_ready
 * 6. Optional: session inactivity_timeout_seconds (5–900) after last participant leaves
 */
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
