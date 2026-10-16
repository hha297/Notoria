"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import detailStyles from "@/components/style/workspace/detail.module.css";
import { mx } from "@/lib/css-module";
import {
  formatOpenAiTranscript,
  parseOpenAiTranscriptState,
  type OpenAiTranscriptStatus,
} from "@/lib/speaking/openai-transcript";
import type { SpeakingStatus } from "@/db/schema";

export type SpeakingTranscriptPanelProps = {
  transcript: string | null;
  transcriptDebug: unknown;
  sessionStatus: SpeakingStatus;
};

export type TranscriptViewPhase =
  | "loading"
  | "finalizing"
  | "ready"
  | "error"
  | "empty"
  | "hidden";

export function resolveTranscriptView(input: {
  transcript: string | null;
  transcriptDebug: unknown;
  sessionStatus: SpeakingStatus;
}): {
  phase: TranscriptViewPhase;
  text: string;
  openaiStatus: OpenAiTranscriptStatus | null;
} {
  const openai = parseOpenAiTranscriptState(input.transcriptDebug);
  const fromEntries =
    openai && openai.entries.length > 0
      ? formatOpenAiTranscript(openai)
      : "";
  const text = fromEntries.trim() || input.transcript?.trim() || "";
  const openaiStatus = openai?.status ?? null;

  if (
    input.sessionStatus === "upcoming" ||
    input.sessionStatus === "active"
  ) {
    return { phase: "hidden", text: "", openaiStatus };
  }

  if (openaiStatus === "error") {
    return {
      phase: text ? "error" : "error",
      text,
      openaiStatus,
    };
  }

  if (
    openaiStatus === "collecting" ||
    openaiStatus === "finalizing"
  ) {
    if (text) {
      return { phase: "finalizing", text, openaiStatus };
    }
    return { phase: "loading", text: "", openaiStatus };
  }

  if (openaiStatus === "ready") {
    return {
      phase: text ? "ready" : "empty",
      text,
      openaiStatus,
    };
  }

  // Legacy Stream sessions (no OpenAI structured state).
  if (text) {
    return { phase: "ready", text, openaiStatus: null };
  }

  if (input.sessionStatus === "processing") {
    return { phase: "loading", text: "", openaiStatus: null };
  }

  if (input.sessionStatus === "completed" || input.sessionStatus === "cancelled") {
    return { phase: "empty", text: "", openaiStatus: null };
  }

  return { phase: "hidden", text: "", openaiStatus: null };
}

export function SpeakingTranscriptPanel({
  transcript,
  transcriptDebug,
  sessionStatus,
}: SpeakingTranscriptPanelProps) {
  const t = useTranslations("speaking");
  const view = resolveTranscriptView({
    transcript,
    transcriptDebug,
    sessionStatus,
  });

  if (view.phase === "hidden") return null;

  return (
    <div className={mx(detailStyles, "panel")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={mx(detailStyles, "panelTitle")}>
          {t("transcriptTitle")}
        </h2>
        {view.phase === "finalizing" ? (
          <p
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-3.5 animate-spin" />
            {t("transcriptFinalizing")}
          </p>
        ) : null}
        {view.phase === "error" ? (
          <p className="text-xs text-destructive" role="status">
            {t("transcriptError")}
          </p>
        ) : null}
      </div>

      {view.phase === "loading" ? (
        <div
          className={mx(detailStyles, "status")}
          role="status"
          style={{ marginTop: "0.75rem" }}
        >
          <Loader2 className="size-4 animate-spin" />
          <div>
            <p className={mx(detailStyles, "panelTitle")}>
              {t("transcriptLoadingTitle")}
            </p>
            <p className={mx(detailStyles, "panelLede")}>
              {t("transcriptLoadingDescription")}
            </p>
          </div>
        </div>
      ) : view.phase === "empty" ? (
        <p className={mx(detailStyles, "panelLede")} style={{ marginTop: "0.5rem" }}>
          {t("transcriptEmpty")}
        </p>
      ) : (
        <div className={mx(detailStyles, "panelBody")} style={{ marginTop: "0.5rem" }}>
          <pre className="max-h-112 overflow-auto whitespace-pre-wrap rounded-lg bg-[color-mix(in_oklab,var(--surface-muted)_55%,transparent)] p-4 text-sm leading-relaxed text-ink">
            {view.text}
          </pre>
          {view.phase === "error" && !view.text ? (
            <p className={mx(detailStyles, "panelLede")} style={{ marginTop: "0.5rem" }}>
              {t("transcriptEmpty")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
