"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import styles from "@/components/style/coach/coach.module.css";
import {
  MAX_COACH_CHAT_HISTORY,
  type CoachChatAction,
  type CoachSuggestedPrompt,
} from "@/lib/billing/coach-chat";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatTurn = {
  id: string;
  role: ChatRole;
  content: string;
  actions?: CoachChatAction[];
  failed?: boolean;
};

type ApiOk = {
  ok: true;
  message: string;
  actions: CoachChatAction[];
  emptyContext?: boolean;
};

type ApiErr = {
  ok: false;
  code?: string;
  feature?: string;
  resetAt?: string;
};

type CoachAskPanelProps = {
  suggestedPrompts: CoachSuggestedPrompt[];
  emptyContext: boolean;
  /** Optional question to send once on mount (e.g. from progress CTA). */
  seedQuestion?: string | null;
};

export function CoachAskPanel({
  suggestedPrompts,
  emptyContext,
  seedQuestion = null,
}: CoachAskPanelProps) {
  const t = useTranslations("coach.ask");
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [errorKind, setErrorKind] = useState<
    null | "quota" | "premium" | "unavailable" | "generic"
  >(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || sending) return;

    setErrorKind(null);
    setLastFailedMessage(null);
    setDraft("");

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };
    setTurns((prev) => [...prev, userTurn]);
    setSending(true);

    const history = [...turns, userTurn]
      .filter((turn) => !turn.failed)
      .slice(-MAX_COACH_CHAT_HISTORY)
      .slice(0, -1)
      .map((turn) => ({ role: turn.role, content: turn.content }));

    try {
      const response = await fetch("/api/ai/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = (await response.json()) as ApiOk | ApiErr;

      if (!response.ok || !data.ok) {
        const code = !data.ok ? data.code : undefined;
        if (code === "AI_QUOTA_EXCEEDED") {
          setErrorKind("quota");
        } else if (code === "PREMIUM_REQUIRED") {
          setErrorKind("premium");
        } else {
          setErrorKind("unavailable");
        }
        setLastFailedMessage(message);
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === userTurn.id ? { ...turn, failed: true } : turn,
          ),
        );
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.message,
          actions: data.actions,
        },
      ]);

      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch {
      setErrorKind("generic");
      setLastFailedMessage(message);
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === userTurn.id ? { ...turn, failed: true } : turn,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!seedQuestion || seededRef.current) return;
    seededRef.current = true;
    void sendMessage(seedQuestion);
    // Intentionally once on mount for deep-link / progress CTA.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  const promptLabels: Record<string, string> = {
    practice_today: t("prompts.practice_today"),
    struggling_words: t("prompts.struggling_words"),
    practice_weak: t("prompts.practice_weak"),
    review_first: t("prompts.review_first"),
    neglecting: t("prompts.neglecting"),
    improve_speaking: t("prompts.improve_speaking"),
    study_20: t("prompts.study_20"),
    getting_started: t("prompts.getting_started"),
    am_i_improving: t("prompts.am_i_improving"),
    what_changed: t("prompts.what_changed"),
  };

  return (
    <section
      id="coach-ask"
      className={mx(styles, "coach-section coach-ask")}
      aria-labelledby="coach-ask-heading"
    >
      <div>
        <p className={mx(styles, "coach-section-label")}>{t("label")}</p>
        <h2 className={mx(styles, "coach-section-title")} id="coach-ask-heading">
          {t("title")}
        </h2>
        <p className={mx(styles, "coach-ask-lede")}>{t("description")}</p>
      </div>

      {emptyContext && turns.length === 0 ? (
        <p className={mx(styles, "coach-ask-ready")}>{t("emptyReady")}</p>
      ) : null}

      {suggestedPrompts.length > 0 && turns.length === 0 ? (
        <div className={mx(styles, "coach-ask-prompts")} role="group" aria-label={t("promptsLabel")}>
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              className={mx(styles, "coach-ask-prompt")}
              disabled={sending}
              onClick={() => void sendMessage(promptLabels[prompt.messageKey] ?? "")}
            >
              {promptLabels[prompt.messageKey]}
            </button>
          ))}
        </div>
      ) : null}

      {turns.length > 0 ? (
        <div
          ref={listRef}
          className={mx(styles, "coach-ask-thread")}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={cn(
                mx(styles, "coach-ask-bubble"),
                turn.role === "user"
                  ? mx(styles, "coach-ask-bubble-user")
                  : mx(styles, "coach-ask-bubble-coach"),
                turn.failed && mx(styles, "coach-ask-bubble-failed"),
              )}
            >
              <p className={mx(styles, "coach-ask-bubble-role")}>
                {turn.role === "user" ? t("you") : t("coach")}
              </p>
              <div className={mx(styles, "coach-ask-bubble-body")}>
                {turn.content.split("\n").map((line, index) => (
                  <p key={`${turn.id}-${index}`}>{line || "\u00a0"}</p>
                ))}
              </div>
              {turn.actions && turn.actions.length > 0 ? (
                <div className={mx(styles, "coach-ask-actions")}>
                  {turn.actions.map((action) => (
                    <Link
                      key={`${turn.id}-${action.type}`}
                      href={action.href}
                      className={mx(styles, "coach-ask-action")}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {sending ? (
            <p className={mx(styles, "coach-ask-thinking")} aria-live="polite">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("thinking")}
            </p>
          ) : null}
        </div>
      ) : null}

      {errorKind ? (
        <div className={mx(styles, "coach-ask-error")} role="alert">
          <p>
            {errorKind === "quota"
              ? t("errorQuota")
              : errorKind === "premium"
                ? t("errorPremium")
                : t("errorUnavailable")}
          </p>
          {lastFailedMessage && errorKind !== "quota" && errorKind !== "premium" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="route-quiet-action"
              onClick={() => void sendMessage(lastFailedMessage)}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              {t("retry")}
            </Button>
          ) : null}
          {errorKind === "premium" ? (
            <Link
              href="/account"
              className={buttonVariants({ size: "sm" })}
            >
              {t("upgrade")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <form
        className={mx(styles, "coach-ask-composer")}
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(draft);
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          {t("placeholder")}
        </label>
        <Textarea
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          rows={2}
          disabled={sending}
          className={mx(styles, "coach-ask-input")}
          aria-describedby={`${inputId}-hint`}
        />
        <p id={`${inputId}-hint`} className="sr-only">
          {t("inputHint")}
        </p>
        <Button
          type="submit"
          size="icon"
          disabled={sending || !draft.trim()}
          aria-label={t("send")}
          className={mx(styles, "coach-ask-send")}
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="size-4" aria-hidden />
          )}
        </Button>
      </form>
    </section>
  );
}
