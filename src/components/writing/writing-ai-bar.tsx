"use client";

import type { Editor } from "@tiptap/react";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { useAiPreferences } from "@/components/providers/ai-preferences-provider";
import { WritingAiPanel } from "@/components/writing/writing-ai-panel";
import { Button } from "@/components/ui/button";
import { requestWritingAi } from "@/lib/writing/ai-client";
import type { WritingAiAction, WritingAiSuggestion } from "@/lib/writing/ai-types";
import { replaceInEditor } from "@/lib/writing/ai-apply";
import {
  attributeSuggestionsToQuestions,
  type QuestionAiFeedbackMap,
} from "@/lib/writing/ai-question-feedback";
import type { WritingEditorState } from "@/lib/writing/content";
import {
  lastSentence,
  writingEditorPlainText,
} from "@/lib/writing/plain-text";

type WritingAiBarProps = {
  language: string;
  title: string;
  editorState: WritingEditorState;
  editor: Editor | null;
  onQuestionFeedbackChange: (next: QuestionAiFeedbackMap) => void;
};

function selectedEditorText(editor: Editor | null) {
  if (!editor) return "";
  const { from, to } = editor.state.selection;
  if (from === to) return "";
  return editor.state.doc.textBetween(from, to, " ").trim();
}

function selectedTextForAction(
  action: WritingAiAction,
  editor: Editor | null,
  content: string,
) {
  const selected = selectedEditorText(editor);
  if (action === "improve") return selected || lastSentence(content);
  if (action === "correct") return selected || null;
  return null;
}

export function WritingAiBar({
  language,
  title,
  editorState,
  editor,
  onQuestionFeedbackChange,
}: WritingAiBarProps) {
  const t = useTranslations("writing.ai");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();
  const {
    preferences,
    shouldAutoApplyContentChange,
  } = useAiPreferences();
  const [selectedAction, setSelectedAction] = useState<WritingAiAction>("check");
  const [pendingAction, setPendingAction] = useState<WritingAiAction | null>(null);
  const [documentSuggestions, setDocumentSuggestions] = useState<
    WritingAiSuggestion[]
  >([]);

  const content = writingEditorPlainText(editorState);
  const isChecking = pendingAction !== null;
  const isQuestionSet = editorState.mode === "question_set";

  async function runAction(action: WritingAiAction) {
    setSelectedAction(action);
    if (!preferences.enabled) {
      toast.message(t("disabled"));
      return;
    }
    if (!content.trim()) {
      toast.error(t("empty"));
      return;
    }

    setPendingAction(action);
    if (isQuestionSet) {
      onQuestionFeedbackChange({});
    } else {
      setDocumentSuggestions([]);
    }

    try {
      const result = await requestWritingAi({
        action,
        content,
        selectedText: selectedTextForAction(action, editor, content),
        language,
        level: editorState.meta.cefrLevel ?? null,
        topic: editorState.meta.topic ?? null,
        formality: editorState.meta.formality ?? null,
        title: title.trim() || null,
      });

      if (!result.ok) {
        if (result.code === "AI_QUOTA_EXCEEDED") {
          toast.error(tBilling("quotaExceeded"));
          openUpgrade();
          return;
        }
        if (result.code === "AI_FORBIDDEN") {
          openUpgrade();
          return;
        }
        if (result.code === "AI_DISABLED") {
          toast.message(t("disabled"));
          return;
        }
        toast.error(t("unavailable"));
        return;
      }

      const suggestions = result.result.suggestions;

      if (isQuestionSet) {
        onQuestionFeedbackChange(
          attributeSuggestionsToQuestions(
            editorState.sections,
            suggestions,
          ),
        );
      } else if (shouldAutoApplyContentChange && editor) {
        for (const suggestion of suggestions) {
          replaceInEditor(editor, suggestion.original, suggestion.replacement);
        }
        setDocumentSuggestions([]);
      } else {
        setDocumentSuggestions(suggestions);
      }

      if (suggestions.length === 0) {
        toast.message(
          action === "improve"
            ? t("noImprove")
            : action === "correct"
              ? t("noGrammar")
              : t("noIssues"),
        );
      }
    } catch {
      toast.error(t("unavailable"));
    } finally {
      setPendingAction(null);
    }
  }

  function applyDocumentSuggestion(suggestion: WritingAiSuggestion) {
    if (
      !editor ||
      !replaceInEditor(editor, suggestion.original, suggestion.replacement)
    ) {
      toast.error(t("applyFailed"));
      return;
    }
    setDocumentSuggestions((current) =>
      current.filter((item) => item.id !== suggestion.id),
    );
  }

  const actions: Array<{ action: WritingAiAction; label: string }> = [
    { action: "check", label: t("check") },
    { action: "improve", label: t("improve") },
    { action: "correct", label: t("grammar") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((item) => (
          <Button
            key={item.action}
            type="button"
            size="sm"
            variant={item.action === selectedAction ? "default" : "outline"}
            aria-pressed={item.action === selectedAction}
            disabled={isChecking}
            onClick={() => void runAction(item.action)}
          >
            {isChecking && pendingAction === item.action ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {item.label}
          </Button>
        ))}
      </div>

      {isChecking ? (
        <p
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-3 animate-spin" />
          {pendingAction === "improve"
            ? t("checkingImprove")
            : pendingAction === "correct"
              ? t("checkingGrammar")
              : t("checking")}
        </p>
      ) : null}

      {!isQuestionSet && !isChecking ? (
        <WritingAiPanel
          suggestions={documentSuggestions}
          onApply={applyDocumentSuggestion}
          onSkip={(id) =>
            setDocumentSuggestions((current) =>
              current.filter((item) => (item.id ?? item.original) !== id),
            )
          }
        />
      ) : null}
    </div>
  );
}
