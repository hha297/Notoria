"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  VocabularyAiChecking,
  VocabularyAiSuggestionCard,
} from "@/components/vocabulary/ai-suggestion-card";
import { CapitalizedInput } from "@/components/form/capitalized-text";
import { Button } from "@/components/ui/button";
import { useFocusNewItem } from "@/hooks/use-focus-new-item";
import { useMounted } from "@/hooks/use-mounted";
import {
  countPrimaryMeanings,
  MAX_PRIMARY_MEANINGS,
} from "@/lib/vocabulary/primary-meanings";
import { cn } from "@/lib/utils";
import { validateVocabularyMeaning } from "@/lib/actions/vocabulary-ai";
import { sanitizeMeaningSuggestions } from "@/lib/vocabulary/ai-sanitize";
import type { VocabularyMeaningResult } from "@/lib/vocabulary/ai-types";

const MEANING_DEBOUNCE_MS = 400;

export type MeaningItem = {
  id: string;
  meaning: string;
  isPrimary: boolean;
  sortOrder: number;
};

type SortableMeaningsProps = {
  meanings: MeaningItem[];
  onChange: (meanings: MeaningItem[]) => void;
  ai?: {
    enabled: boolean;
    word: string;
    language: string;
    partOfSpeech?: string | null;
    examples: string[];
  };
};

function MeaningRowShell({
  item,
  index,
  onUpdate,
  onBlur,
  onTogglePrimary,
  onRemove,
  canRemove,
  canMarkPrimary,
  placeholder,
  primaryLabel,
  secondaryLabel,
  dragHandle,
  inputRef,
  aiFooter,
}: {
  item: MeaningItem;
  index: number;
  onUpdate: (id: string, meaning: string) => void;
  onBlur?: (id: string) => void;
  onTogglePrimary: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  canMarkPrimary: boolean;
  placeholder: string;
  primaryLabel: string;
  secondaryLabel: string;
  dragHandle: ReactNode;
  inputRef?: (node: HTMLInputElement | null) => void;
  aiFooter?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-card p-2",
          item.isPrimary
            ? "border-accent-lime/50 bg-accent-lime/5"
            : "border-hairline-cloud opacity-90",
        )}
      >
        {dragHandle}
        <span className="w-6 text-sm font-medium text-muted-foreground">
          {index + 1}.
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onTogglePrimary(item.id)}
          disabled={!item.isPrimary && !canMarkPrimary}
          aria-pressed={item.isPrimary}
          aria-label={item.isPrimary ? primaryLabel : secondaryLabel}
          title={item.isPrimary ? primaryLabel : secondaryLabel}
          className={cn(
            "shrink-0",
            item.isPrimary
              ? "text-accent-lime hover:text-accent-lime"
              : "text-muted-foreground",
          )}
        >
          <Star
            className={cn("size-4", item.isPrimary && "fill-current")}
          />
        </Button>
        <CapitalizedInput
          ref={inputRef}
          value={item.meaning}
          onChange={(event) => onUpdate(item.id, event.target.value)}
          onBlur={() => onBlur?.(item.id)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(item.id)}
          disabled={!canRemove}
          aria-label="Remove meaning"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {aiFooter}
    </div>
  );
}

function SortableMeaningRow({
  item,
  index,
  onUpdate,
  onBlur,
  onTogglePrimary,
  onRemove,
  canRemove,
  canMarkPrimary,
  placeholder,
  primaryLabel,
  secondaryLabel,
  inputRef,
  aiFooter,
}: {
  item: MeaningItem;
  index: number;
  onUpdate: (id: string, meaning: string) => void;
  onBlur?: (id: string) => void;
  onTogglePrimary: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  canMarkPrimary: boolean;
  placeholder: string;
  primaryLabel: string;
  secondaryLabel: string;
  inputRef?: (node: HTMLInputElement | null) => void;
  aiFooter?: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-60 shadow-md")}
    >
      <MeaningRowShell
        item={item}
        index={index}
        onUpdate={onUpdate}
        onBlur={onBlur}
        onTogglePrimary={onTogglePrimary}
        onRemove={onRemove}
        canRemove={canRemove}
        canMarkPrimary={canMarkPrimary}
        placeholder={placeholder}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        inputRef={inputRef}
        aiFooter={aiFooter}
        dragHandle={
          <button
            type="button"
            className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

export function SortableMeanings({
  meanings,
  onChange,
  ai,
}: SortableMeaningsProps) {
  const mounted = useMounted();
  const t = useTranslations("vocabulary");
  const { requestFocus, bindRef } = useFocusNewItem<HTMLInputElement>();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [aiState, setAiState] = useState<
    Record<string, { checking: boolean; result: VocabularyMeaningResult | null }>
  >({});
  const meaningsRef = useRef(meanings);
  const aiRef = useRef(ai);
  const checkGeneration = useRef<Record<string, number>>({});
  const debounceTimers = useRef<Record<string, number>>({});
  const inFlightKey = useRef<Record<string, string>>({});
  const skipped = useRef(new Set<string>());
  const lastChecked = useRef(new Set<string>());
  const lastSeenText = useRef<Record<string, string>>({});
  const checkQueue = useRef<string[]>([]);
  const drainingQueue = useRef(false);
  meaningsRef.current = meanings;
  aiRef.current = ai;

  const primaryCount = countPrimaryMeanings(meanings);
  const canMarkPrimary = primaryCount < MAX_PRIMARY_MEANINGS;

  function checkKey(id: string, meaning: string, word: string) {
    const language = aiRef.current?.language ?? "";
    const partOfSpeech = aiRef.current?.partOfSpeech ?? "";
    return `${id}|${meaning.trim().toLowerCase()}|${word.trim().toLowerCase()}|${language}|${partOfSpeech}`;
  }

  function clearAi(id: string) {
    setAiState((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function cancelMeaningCheck(id: string) {
    window.clearTimeout(debounceTimers.current[id]);
    checkGeneration.current[id] = (checkGeneration.current[id] ?? 0) + 1;
    delete inFlightKey.current[id];
    checkQueue.current = checkQueue.current.filter((queuedId) => queuedId !== id);
  }

  async function runMeaningCheck(id: string) {
    const aiNow = aiRef.current;
    const list = meaningsRef.current;
    const item = list.find((meaning) => meaning.id === id);
    const word = aiNow?.word.trim() ?? "";
    const meaning = item?.meaning.trim() ?? "";

    if (!aiNow?.enabled || !item || !word || meaning.length < 2) {
      clearAi(id);
      return;
    }

    const key = checkKey(id, meaning, word);
    if (skipped.current.has(key) || lastChecked.current.has(key)) {
      clearAi(id);
      return;
    }
    if (inFlightKey.current[id] === key) {
      return;
    }

    const generation = checkGeneration.current[id] ?? 0;
    inFlightKey.current[id] = key;
    setAiState((current) => ({
      ...current,
      [id]: { checking: true, result: null },
    }));

    try {
      const result = await validateVocabularyMeaning({
        word,
        meaning,
        language: aiNow.language,
        partOfSpeech: aiNow.partOfSpeech ?? null,
        examples: aiNow.examples,
      });

      if (checkGeneration.current[id] !== generation) return;

      if (!result.ok) {
        clearAi(id);
        return;
      }

      lastChecked.current.add(key);

      if (result.result.isLikelyCorrect === true) {
        clearAi(id);
        return;
      }

      if (result.result.isLikelyCorrect !== false) {
        clearAi(id);
        return;
      }

      setAiState((current) => ({
        ...current,
        [id]: { checking: false, result: result.result },
      }));
    } catch {
      if (checkGeneration.current[id] !== generation) return;
      clearAi(id);
    } finally {
      if (
        checkGeneration.current[id] === generation &&
        inFlightKey.current[id] === key
      ) {
        delete inFlightKey.current[id];
      }
    }
  }

  const runMeaningCheckRef = useRef(runMeaningCheck);
  runMeaningCheckRef.current = runMeaningCheck;

  async function drainCheckQueue() {
    if (drainingQueue.current) return;
    drainingQueue.current = true;
    try {
      while (checkQueue.current.length > 0) {
        const id = checkQueue.current.shift();
        if (!id) continue;
        await runMeaningCheckRef.current(id);
      }
    } finally {
      drainingQueue.current = false;
      if (checkQueue.current.length > 0) {
        void drainCheckQueue();
      }
    }
  }

  function enqueueMeaningCheck(id: string) {
    if (!checkQueue.current.includes(id)) {
      checkQueue.current.push(id);
    }
    setAiState((current) => ({
      ...current,
      [id]: { checking: true, result: current[id]?.result ?? null },
    }));
    void drainCheckQueue();
  }

  function scheduleMeaningCheck(id: string, delay = MEANING_DEBOUNCE_MS) {
    if (!aiRef.current?.enabled) return;
    window.clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = window.setTimeout(() => {
      enqueueMeaningCheck(id);
    }, delay);
  }

  useEffect(() => {
    if (!ai?.enabled || !ai.word.trim()) return;

    for (const item of meanings) {
      const text = item.meaning.trim();
      const previous = lastSeenText.current[item.id];
      if (text === previous) continue;
      lastSeenText.current[item.id] = text;

      if (text.length < 2) {
        window.clearTimeout(debounceTimers.current[item.id]);
        continue;
      }

      const key = checkKey(item.id, text, ai.word);
      if (skipped.current.has(key) || lastChecked.current.has(key)) continue;
      scheduleMeaningCheck(item.id);
    }
  }, [meanings, ai?.enabled, ai?.word, ai?.language, ai?.partOfSpeech]);

  useEffect(() => {
    if (!ai?.enabled) return;

    const word = ai.word.trim();
    if (!word) return;

    for (const item of meaningsRef.current) {
      if (item.meaning.trim().length < 2) continue;
      const key = checkKey(item.id, item.meaning, word);
      if (skipped.current.has(key) || lastChecked.current.has(key)) continue;
      scheduleMeaningCheck(item.id);
    }
  }, [ai?.enabled, ai?.word, ai?.language, ai?.partOfSpeech]);

  function updateMeaning(id: string, meaning: string) {
    cancelMeaningCheck(id);
    clearAi(id);
    onChange(
      meanings.map((item) =>
        item.id === id ? { ...item, meaning } : item,
      ),
    );
    scheduleMeaningCheck(id);
  }

  function handleMeaningBlur(id: string) {
    scheduleMeaningCheck(id, 150);
  }

  function skipAi(id: string, meaning: string) {
    skipped.current.add(checkKey(id, meaning, ai?.word ?? ""));
    cancelMeaningCheck(id);
    clearAi(id);
  }

  function acceptAi(id: string, nextMeaning: string) {
    skipped.current.add(checkKey(id, nextMeaning, ai?.word ?? ""));
    lastChecked.current.add(checkKey(id, nextMeaning, ai?.word ?? ""));
    cancelMeaningCheck(id);
    clearAi(id);
    onChange(
      meanings.map((item) =>
        item.id === id ? { ...item, meaning: nextMeaning } : item,
      ),
    );
  }

  function meaningAiFooter(item: MeaningItem) {
    const state = aiState[item.id];
    if (!ai?.enabled) return null;
    if (state?.checking) {
      return <VocabularyAiChecking />;
    }
    if (!state?.result || state.result.isLikelyCorrect !== false) return null;

    const suggestion = sanitizeMeaningSuggestions(
      ai.word,
      item.meaning,
      state.result.suggestions,
      {
        wordLanguage: state.result.wordLanguage,
        meaningLanguage: state.result.meaningLanguage,
      },
    )[0];

    return (
      <VocabularyAiSuggestionCard
        body={
          state.result.explanation?.trim() ||
          t("aiMeaningMismatch", {
            meaning: item.meaning.trim(),
            word: ai.word.trim(),
          })
        }
        suggestionLabel={suggestion?.meaning}
        acceptLabel={
          suggestion
            ? t("aiUseWord", { word: suggestion.meaning })
            : undefined
        }
        onAccept={
          suggestion
            ? () => acceptAi(item.id, suggestion.meaning)
            : undefined
        }
        onSkip={() => skipAi(item.id, item.meaning)}
      />
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = meanings.findIndex((item) => item.id === active.id);
    const newIndex = meanings.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(meanings, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        sortOrder: index,
      }),
    );

    onChange(reordered);
  }

  function addMeaning() {
    const id = crypto.randomUUID();
    requestFocus(id);
    onChange([
      ...meanings,
      {
        id,
        meaning: "",
        isPrimary: primaryCount === 0,
        sortOrder: meanings.length,
      },
    ]);
  }

  function togglePrimary(id: string) {
    const target = meanings.find((item) => item.id === id);
    if (!target) return;

    if (target.isPrimary) {
      if (primaryCount <= 1) {
        toast.error(t("primaryMeaningRequired"));
        return;
      }
      onChange(
        meanings.map((item) =>
          item.id === id ? { ...item, isPrimary: false } : item,
        ),
      );
      return;
    }

    if (!canMarkPrimary) {
      toast.error(t("primaryMeaningLimit", { max: MAX_PRIMARY_MEANINGS }));
      return;
    }

    onChange(
      meanings.map((item) =>
        item.id === id ? { ...item, isPrimary: true } : item,
      ),
    );
  }

  function removeMeaning(id: string) {
    const remaining = meanings.filter((item) => item.id !== id);
    if (
      remaining.length > 0 &&
      countPrimaryMeanings(remaining) === 0
    ) {
      remaining[0] = { ...remaining[0]!, isPrimary: true };
    }

    onChange(
      remaining.map((item, index) => ({ ...item, sortOrder: index })),
    );
  }

  const list = (
    <div className="space-y-2">
      {meanings.map((item, index) =>
        mounted ? (
          <SortableMeaningRow
            key={item.id}
            item={item}
            index={index}
            onUpdate={updateMeaning}
            onBlur={handleMeaningBlur}
            onTogglePrimary={togglePrimary}
            onRemove={removeMeaning}
            canRemove={meanings.length > 1}
            canMarkPrimary={canMarkPrimary}
            placeholder={t("meaningPlaceholder")}
            primaryLabel={t("primaryMeaning")}
            secondaryLabel={t("markAsPrimary")}
            inputRef={bindRef(item.id)}
            aiFooter={meaningAiFooter(item)}
          />
        ) : (
          <MeaningRowShell
            key={item.id}
            item={item}
            index={index}
            onUpdate={updateMeaning}
            onBlur={handleMeaningBlur}
            onTogglePrimary={togglePrimary}
            onRemove={removeMeaning}
            canRemove={meanings.length > 1}
            canMarkPrimary={canMarkPrimary}
            placeholder={t("meaningPlaceholder")}
            primaryLabel={t("primaryMeaning")}
            secondaryLabel={t("markAsPrimary")}
            inputRef={bindRef(item.id)}
            aiFooter={meaningAiFooter(item)}
            dragHandle={
              <span className="rounded-md p-1 text-muted-foreground">
                <GripVertical className="size-4" />
              </span>
            }
          />
        ),
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <label className="text-sm font-medium">{t("meanings")}</label>
          <p className="text-xs text-muted-foreground">
            {t("primaryMeaningHint", { max: MAX_PRIMARY_MEANINGS })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addMeaning}>
          <Plus className="size-4" />
          {t("addMeaning")}
        </Button>
      </div>

      {mounted ? (
        <DndContext
          id="vocabulary-meanings"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={meanings.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}
    </div>
  );
}
