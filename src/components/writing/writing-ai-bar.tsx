"use client";

import type { Editor } from "@tiptap/react";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import { WritingAiPanel } from "@/components/writing/writing-ai-panel";
import { Button } from "@/components/ui/button";
import { requestWritingAi } from "@/lib/writing/ai-client";
import type { WritingAiAction, WritingAiSuggestion } from "@/lib/writing/ai-types";
import { replaceInEditor, replaceInQuestionSet } from "@/lib/writing/ai-apply";
import type { WritingEditorState } from "@/lib/writing/content";
import {
  lastSentence,
  writingEditorPlainText,
} from "@/lib/writing/plain-text";

type WritingAiBarProps = {
  canUseAi: boolean;
  language: string;
  title: string;
  editorState: WritingEditorState;
  editor: Editor | null;
  onEditorStateChange: (state: WritingEditorState) => void;
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
  canUseAi,
  language,
  title,
  editorState,
  editor,
  onEditorStateChange,
}: WritingAiBarProps) {
  const t = useTranslations("writing.ai");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<WritingAiAction>("check");
  const [pendingAction, setPendingAction] = useState<WritingAiAction | null>(null);
  const [suggestions, setSuggestions] = useState<WritingAiSuggestion[]>([]);

  const content = writingEditorPlainText(editorState);
  const isChecking = pendingAction !== null;

  function requireAccess() {
    if (canUseAi) return true;
    setUpgradeOpen(true);
    return false;
  }

  async function runAction(action: WritingAiAction) {
    setSelectedAction(action);
    if (!requireAccess()) return;
    if (!content.trim()) {
      toast.error(t("empty"));
      return;
    }

    setPendingAction(action);
    setSuggestions([]);

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
        toast.error(
          result.code === "AI_FORBIDDEN" ? t("forbidden") : t("unavailable"),
        );
        return;
      }

      setSuggestions(result.result.suggestions);

      if (result.result.suggestions.length === 0) {
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

  function applySuggestion(suggestion: WritingAiSuggestion) {
    if (editorState.mode === "rich_document") {
      if (!editor || !replaceInEditor(editor, suggestion.original, suggestion.replacement)) {
        toast.error(t("applyFailed"));
        return;
      }
    } else {
      const next = replaceInQuestionSet(
        editorState,
        suggestion.original,
        suggestion.replacement,
      );
      if (!next.replaced) {
        toast.error(t("applyFailed"));
        return;
      }
      onEditorStateChange(next.state);
    }

    setSuggestions((current) =>
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
            {canUseAi ? (
              <Sparkles className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            {item.label}
          </Button>
        ))}
      </div>

      {!canUseAi ? (
        <p className="text-xs text-muted-foreground">{t("upgradeHint")}</p>
      ) : null}

      {isChecking ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
          <Loader2 className="size-3 animate-spin" />
          {pendingAction === "improve"
            ? t("checkingImprove")
            : pendingAction === "correct"
              ? t("checkingGrammar")
              : t("checking")}
        </p>
      ) : (
        <WritingAiPanel
          suggestions={suggestions}
          onApply={applySuggestion}
          onSkip={(id) =>
            setSuggestions((current) => current.filter((item) => item.id !== id))
          }
        />
      )}

      <ProUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
