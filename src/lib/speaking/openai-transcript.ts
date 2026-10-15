/**
 * Production OpenAI Realtime transcript capture for Speaking sessions.
 * Structured entries live in `speaking_sessions.transcript_debug` (jsonb);
 * formatted text is mirrored to `speaking_sessions.transcript` for feedback.
 */

export type OpenAiTranscriptStatus =
  | "collecting"
  | "finalizing"
  | "ready"
  | "error";

export type OpenAiTranscriptRole = "user" | "tutor";

/** How much of a tutor turn was actually played to the learner. */
export type TutorPlaybackStatus =
  | "spoken"
  | "truncated"
  | "cancelled"
  | "unknown";

export type OpenAiTranscriptEntry = {
  id: string;
  role: OpenAiTranscriptRole;
  text: string;
  itemId: string | null;
  previousItemId: string | null;
  responseId: string | null;
  eventType: string;
  status: "ok" | "failed";
  errorMessage: string | null;
  /** Tutor-only: interrupted / cancelled playback when known. */
  playbackStatus: TutorPlaybackStatus | null;
  receivedAt: string;
};

export type OpenAiTranscriptState = {
  status: OpenAiTranscriptStatus;
  entries: OpenAiTranscriptEntry[];
  errorMessage: string | null;
  updatedAt: string;
};

/** ISO-639-1 codes accepted by OpenAI gpt-4o-transcribe / Realtime input transcription. */
const OPENAI_TRANSCRIBE_LANGUAGES = new Set([
  "af",
  "ar",
  "hy",
  "az",
  "be",
  "bs",
  "bg",
  "ca",
  "zh",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fi",
  "fr",
  "gl",
  "de",
  "el",
  "he",
  "hi",
  "hu",
  "is",
  "id",
  "it",
  "ja",
  "kn",
  "kk",
  "ko",
  "lv",
  "lt",
  "mk",
  "ms",
  "mr",
  "mi",
  "ne",
  "no",
  "fa",
  "pl",
  "pt",
  "ro",
  "ru",
  "sr",
  "sk",
  "sl",
  "es",
  "sw",
  "sv",
  "tl",
  "ta",
  "th",
  "tr",
  "uk",
  "ur",
  "vi",
  "cy",
]);

/**
 * Returns a validated ISO-639-1 code for OpenAI input transcription, or
 * undefined when the workspace language is unsupported (omit language hint).
 */
export function openAiTranscriptionLanguage(
  languageCode: string | null | undefined,
): string | undefined {
  const code = languageCode?.trim().toLowerCase().split(/[-_]/)[0];
  if (code && OPENAI_TRANSCRIBE_LANGUAGES.has(code)) return code;
  return undefined;
}

function nowIso() {
  return new Date().toISOString();
}

export function emptyOpenAiTranscriptState(
  status: OpenAiTranscriptStatus = "collecting",
): OpenAiTranscriptState {
  return {
    status,
    entries: [],
    errorMessage: null,
    updatedAt: nowIso(),
  };
}

export function parseOpenAiTranscriptState(
  value: unknown,
): OpenAiTranscriptState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  // Production shape
  if (Array.isArray(record.entries) && typeof record.status === "string") {
    return value as OpenAiTranscriptState;
  }
  // Legacy debug envelope { openai: {...}, stream: {...} }
  const nested = record.openai;
  if (nested && typeof nested === "object" && Array.isArray((nested as OpenAiTranscriptState).entries)) {
    return nested as OpenAiTranscriptState;
  }
  return null;
}

type ItemMeta = {
  itemId: string;
  role: OpenAiTranscriptRole | null;
  previousItemId: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function roleFromItem(
  item: Record<string, unknown> | null,
): OpenAiTranscriptRole | null {
  const role = asString(item?.role);
  if (role === "user") return "user";
  if (role === "assistant") return "tutor";
  return null;
}

/**
 * Reconstruct conversation order from previous_item_id chains.
 * Entries without item links keep relative receivedAt order among orphans.
 */
export function orderOpenAiTranscriptEntries(
  entries: OpenAiTranscriptEntry[],
): OpenAiTranscriptEntry[] {
  if (entries.length <= 1) return entries;

  const byItem = new Map<string, OpenAiTranscriptEntry>();
  for (const entry of entries) {
    if (!entry.itemId) continue;
    const existing = byItem.get(entry.itemId);
    if (!existing || entry.receivedAt >= existing.receivedAt) {
      byItem.set(entry.itemId, entry);
    }
  }

  const withItems = [...byItem.values()];
  const orphans = entries.filter((entry) => !entry.itemId);

  if (withItems.length === 0) {
    return [...entries].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  }

  const children = new Map<string | null, OpenAiTranscriptEntry[]>();
  for (const entry of withItems) {
    const key = entry.previousItemId;
    const list = children.get(key) ?? [];
    list.push(entry);
    children.set(key, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  }

  const ordered: OpenAiTranscriptEntry[] = [];
  const seen = new Set<string>();

  function walk(itemId: string | null) {
    const next = children.get(itemId) ?? [];
    for (const entry of next) {
      if (!entry.itemId || seen.has(entry.itemId)) continue;
      seen.add(entry.itemId);
      ordered.push(entry);
      walk(entry.itemId);
    }
  }

  walk(null);

  const remaining = withItems
    .filter((entry) => entry.itemId && !seen.has(entry.itemId))
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  ordered.push(...remaining);

  orphans.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  if (orphans.length === 0) return ordered;

  const merged = [...ordered, ...orphans].sort((a, b) =>
    a.receivedAt.localeCompare(b.receivedAt),
  );
  const index = new Map(ordered.map((entry, i) => [entry.id, i]));
  return merged.sort((a, b) => {
    const ai = index.get(a.id);
    const bi = index.get(b.id);
    if (ai != null && bi != null && a.receivedAt === b.receivedAt) {
      return ai - bi;
    }
    return a.receivedAt.localeCompare(b.receivedAt);
  });
}

/** Formatted transcript for UI + feedback (matches legacy Learner / Notoria Tutor labels). */
export function formatOpenAiTranscript(state: OpenAiTranscriptState): string {
  return orderOpenAiTranscriptEntries(state.entries)
    .map((entry) => {
      const speaker = entry.role === "tutor" ? "Notoria Tutor" : "Learner";
      if (entry.status === "failed") {
        return `${speaker}: [transcription failed${entry.errorMessage ? `: ${entry.errorMessage}` : ""}]`;
      }
      if (
        entry.role === "tutor" &&
        (entry.playbackStatus === "truncated" ||
          entry.playbackStatus === "cancelled")
      ) {
        const tag =
          entry.playbackStatus === "truncated" ? "interrupted" : "cancelled";
        const text = entry.text.trim();
        return text
          ? `${speaker}: ${text} [${tag}]`
          : `${speaker}: [${tag} — no spoken audio]`;
      }
      return `${speaker}: ${entry.text}`;
    })
    .join("\n");
}

export class OpenAiTranscriptCollector {
  private readonly items = new Map<string, ItemMeta>();
  private readonly entries = new Map<string, OpenAiTranscriptEntry>();
  private readonly truncatedItems = new Set<string>();
  private readonly cancelledResponses = new Set<string>();
  private status: OpenAiTranscriptStatus = "collecting";
  private errorMessage: string | null = null;
  private dirty = false;

  consumeDirty() {
    const was = this.dirty;
    this.dirty = false;
    return was;
  }

  snapshot(): OpenAiTranscriptState {
    return {
      status: this.status,
      entries: orderOpenAiTranscriptEntries([...this.entries.values()]),
      errorMessage: this.errorMessage,
      updatedAt: nowIso(),
    };
  }

  markFinalizing() {
    if (this.status === "ready" || this.status === "error") return;
    this.status = "finalizing";
    this.dirty = true;
  }

  markReady() {
    if (this.status === "error") return;
    this.status = "ready";
    this.dirty = true;
  }

  markError(message: string) {
    this.status = "error";
    this.errorMessage = message;
    this.dirty = true;
  }

  /** Handle a raw OpenAI Realtime server event (`event.type`, not `server.*`). */
  handleServerEvent(event: unknown) {
    const record = asRecord(event);
    if (!record) return;
    const type = asString(record.type);
    if (!type) return;

    if (
      type === "conversation.item.created" ||
      type === "conversation.item.added"
    ) {
      this.rememberItem(record);
      return;
    }

    if (type === "conversation.item.truncated") {
      const itemId = asString(record.item_id);
      if (itemId) {
        this.truncatedItems.add(itemId);
        this.markTutorPlayback(itemId, null, "truncated");
      }
      return;
    }

    if (type === "response.cancelled") {
      const responseId =
        asString(record.response_id) ??
        asString(asRecord(record.response)?.id);
      if (responseId) {
        this.cancelledResponses.add(responseId);
        this.markTutorPlayback(null, responseId, "cancelled");
      }
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      this.upsertUserTranscript(record, "ok");
      return;
    }

    if (type === "conversation.item.input_audio_transcription.failed") {
      this.upsertUserTranscript(record, "failed");
      return;
    }

    if (type === "response.output_audio_transcript.done") {
      this.upsertTutorTranscript(record);
      return;
    }

    if (type === "error") {
      const err = asRecord(record.error);
      const message =
        asString(err?.message) ?? asString(record.message) ?? "OpenAI error";
      if (this.entries.size === 0) {
        this.errorMessage = message;
        this.dirty = true;
      }
    }
  }

  private markTutorPlayback(
    itemId: string | null,
    responseId: string | null,
    playbackStatus: TutorPlaybackStatus,
  ) {
    for (const [key, entry] of this.entries) {
      if (entry.role !== "tutor") continue;
      if (
        (itemId && entry.itemId === itemId) ||
        (responseId && entry.responseId === responseId)
      ) {
        this.entries.set(key, { ...entry, playbackStatus });
        this.dirty = true;
      }
    }
  }

  private rememberItem(record: Record<string, unknown>) {
    const item = asRecord(record.item);
    const itemId = asString(item?.id) ?? asString(record.item_id);
    if (!itemId) return;
    const previousItemId =
      asString(item?.previous_item_id) ?? asString(record.previous_item_id);
    const role = roleFromItem(item);
    this.items.set(itemId, {
      itemId,
      role,
      previousItemId,
    });
    this.dirty = true;
  }

  private upsertUserTranscript(
    record: Record<string, unknown>,
    status: "ok" | "failed",
  ) {
    const itemId = asString(record.item_id);
    const eventId = asString(record.event_id);
    const id = eventId ?? (itemId ? `user:${itemId}` : null);
    if (!id) return;

    const meta = itemId ? this.items.get(itemId) : undefined;
    const transcript = asString(record.transcript) ?? "";
    const err = asRecord(record.error);
    const errorMessage =
      status === "failed"
        ? (asString(err?.message) ?? asString(record.message) ?? "failed")
        : null;

    this.entries.set(id, {
      id,
      role: "user",
      text: transcript,
      itemId,
      previousItemId: meta?.previousItemId ?? null,
      responseId: null,
      eventType:
        status === "failed"
          ? "conversation.item.input_audio_transcription.failed"
          : "conversation.item.input_audio_transcription.completed",
      status,
      errorMessage,
      playbackStatus: null,
      receivedAt: nowIso(),
    });
    this.dirty = true;
  }

  private upsertTutorTranscript(record: Record<string, unknown>) {
    const itemId = asString(record.item_id);
    const responseId = asString(record.response_id);
    const eventId = asString(record.event_id);
    const id =
      eventId ??
      (itemId
        ? `tutor:${itemId}`
        : responseId
          ? `tutor-response:${responseId}`
          : null);
    if (!id) return;

    const meta = itemId ? this.items.get(itemId) : undefined;
    const transcript = asString(record.transcript) ?? "";
    if (!transcript && !itemId) return;

    let playbackStatus: TutorPlaybackStatus = "spoken";
    if (itemId && this.truncatedItems.has(itemId)) {
      playbackStatus = "truncated";
    } else if (responseId && this.cancelledResponses.has(responseId)) {
      playbackStatus = "cancelled";
    }

    this.entries.set(id, {
      id,
      role: "tutor",
      text: transcript,
      itemId,
      previousItemId: meta?.previousItemId ?? null,
      responseId,
      eventType: "response.output_audio_transcript.done",
      status: "ok",
      errorMessage: null,
      playbackStatus,
      receivedAt: nowIso(),
    });
    this.dirty = true;
  }
}
