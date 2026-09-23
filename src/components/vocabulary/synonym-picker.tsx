"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CapitalizedInput } from "@/components/form/capitalized-text";
import { PartOfSpeechSelect, type PartOfSpeechValue } from "@/components/vocabulary/part-of-speech-select";
import { composerStyles } from "@/components/vocabulary/vocabulary-composer";
import { createSynonymWord } from "@/lib/actions/vocabulary";
import { mx } from "@/lib/css-module";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";
import {
  normalizeVocabularyWord,
  type VocabularySynonymRef,
} from "@/lib/vocabulary/synonyms";

type SynonymPickerProps = {
  value: VocabularySynonymRef[];
  onChange: (synonyms: VocabularySynonymRef[]) => void;
  options: VocabularySynonymRef[];
  onOptionsChange: (options: VocabularySynonymRef[]) => void;
  currentWordId?: string;
  currentWord?: string;
};

export function SynonymPicker({
  value,
  onChange,
  options,
  onOptionsChange,
  currentWordId,
  currentWord,
}: SynonymPickerProps) {
  const t = useTranslations("vocabulary");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createWord, setCreateWord] = useState("");
  const [createMeaning, setCreateMeaning] = useState("");
  const [createPartOfSpeech, setCreatePartOfSpeech] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedIds = useMemo(
    () => new Set(value.map((item) => item.id)),
    [value],
  );
  const normalizedCurrent = normalizeVocabularyWord(currentWord ?? "");
  const normalizedQuery = normalizeVocabularyWord(query);

  const filtered = useMemo(() => {
    return options.filter((option) => {
      if (option.id === currentWordId) return false;
      if (
        !currentWordId &&
        normalizedCurrent &&
        normalizeVocabularyWord(option.word) === normalizedCurrent
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        normalizeVocabularyWord(option.word).includes(normalizedQuery) ||
        (option.meaning ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [options, currentWordId, normalizedCurrent, normalizedQuery]);

  const exactMatch = options.find(
    (option) => normalizeVocabularyWord(option.word) === normalizedQuery,
  );
  const queryIsCurrentWord =
    Boolean(normalizedQuery) &&
    ((Boolean(currentWordId) && exactMatch?.id === currentWordId) ||
      (Boolean(normalizedCurrent) && normalizedQuery === normalizedCurrent));
  const canCreate =
    Boolean(normalizedQuery) &&
    !exactMatch &&
    !queryIsCurrentWord &&
    !isCreating;

  function selectSynonym(option: VocabularySynonymRef) {
    if (option.id === currentWordId) {
      toast.error(t("synonymsCannotLinkSelf"));
      return;
    }
    if (selectedIds.has(option.id)) {
      removeSynonym(option.id);
      setQuery("");
      inputRef.current?.focus();
      return;
    }

    onChange([...value, option]);
    setQuery("");
    inputRef.current?.focus();
  }

  function removeSynonym(id: string) {
    onChange(value.filter((item) => item.id !== id));
  }

  function openCreate(word = query.trim()) {
    if (!word.trim()) return;
    if (normalizeVocabularyWord(word) === normalizedCurrent) {
      toast.error(t("synonymsCannotLinkSelf"));
      return;
    }
    setCreateWord(word.trim());
    setCreateMeaning("");
    setCreatePartOfSpeech("");
    setCreateOpen(true);
  }

  async function handleCreate() {
    const word = createWord.trim();
    const meaning = createMeaning.trim();
    if (!word || !meaning) return;

    if (normalizeVocabularyWord(word) === normalizedCurrent) {
      toast.error(t("synonymsCannotLinkSelf"));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createSynonymWord({
        word,
        meaning,
        partOfSpeech: createPartOfSpeech
          ? (createPartOfSpeech as PartOfSpeechValue)
          : undefined,
      });

      if (result.word.id === currentWordId) {
        toast.error(t("synonymsCannotLinkSelf"));
        setCreateOpen(false);
        return;
      }

      if (!options.some((option) => option.id === result.word.id)) {
        onOptionsChange([...options, result.word]);
      }

      const alreadySelected = selectedIds.has(result.word.id);
      if (!alreadySelected) {
        onChange([...value, result.word]);
      }

      if (alreadySelected) {
        toast.message(t("synonymsAlreadyLinked"));
      } else {
        toast.success(t("synonymsCreated"));
      }
      setCreateOpen(false);
      setQuery("");
      inputRef.current?.focus();
    } catch (error) {
      if (error instanceof Error && error.message === VOCABULARY_WORD_EXISTS) {
        toast.error(t("wordExists"));
        return;
      }
      toast.error(error instanceof Error ? error.message : tErrors("generic"));
    } finally {
      setIsCreating(false);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (queryIsCurrentWord) {
        toast.error(t("synonymsCannotLinkSelf"));
        return;
      }
      if (exactMatch) {
        selectSynonym(exactMatch);
        return;
      }
      if (filtered.length === 1) {
        selectSynonym(filtered[0]!);
        return;
      }
      if (canCreate) {
        openCreate();
      }
      return;
    }

    if (event.key === "Backspace" && query.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-4">
      <Label
        htmlFor="synonyms-search"
        className={mx(
          composerStyles,
          "vocab-composer-kicker text-[0.68rem] font-semibold tracking-[0.18em] uppercase",
        )}
      >
        {t("synonyms")}{" "}
        <span className="font-normal tracking-normal text-muted-foreground normal-case">
          ({tCommon("optional")})
        </span>
      </Label>

      {value.length > 0 ? (
        <div className={mx(composerStyles, "vocab-chip-row")}>
          {value.map((synonym) => (
            <span
              key={synonym.id}
              data-active="true"
              className={mx(composerStyles, "vocab-chip")}
            >
              <Link
                href={`/vocabulary/${synonym.id}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {synonym.word}
              </Link>
              <button
                type="button"
                className={mx(composerStyles, "vocab-chip-remove")}
                aria-label={t("synonymsRemove", { word: synonym.word })}
                onClick={() => removeSynonym(synonym.id)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className={mx(composerStyles, "vocab-search-shell")}>
        <CapitalizedInput
          id="synonyms-search"
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={
            value.length === 0 ? t("synonymsSearch") : t("synonymsSelect")
          }
          className={mx(
            composerStyles,
            "vocab-composer-field vocab-search-field h-11!",
          )}
          disabled={isCreating}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={mx(composerStyles, "vocab-composer-add h-11 shrink-0")}
          onClick={() => {
            if (exactMatch && !queryIsCurrentWord) {
              selectSynonym(exactMatch);
              return;
            }
            if (canCreate) openCreate();
          }}
          disabled={!normalizedQuery || queryIsCurrentWord || isCreating}
        >
          {isCreating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          {t("addCustomTag")}
        </Button>
      </div>

      <div className={mx(composerStyles, "vocab-suggest")}>
        {queryIsCurrentWord ? (
          <p className={mx(composerStyles, "vocab-suggest-empty")}>
            {t("synonymsCannotLinkSelf")}
          </p>
        ) : null}

        {canCreate ? (
          <button
            type="button"
            className={mx(composerStyles, "vocab-suggest-item")}
            onClick={() => openCreate()}
            disabled={isCreating}
          >
            <Plus className="size-4 shrink-0 text-(--composer-accent)" />
            <span className={mx(composerStyles, "vocab-suggest-title")}>
              {t("synonymsAddNew", { word: query.trim() })}
            </span>
          </button>
        ) : null}

        {filtered.length === 0 && !canCreate && !queryIsCurrentWord ? (
          <p className={mx(composerStyles, "vocab-suggest-empty")}>
            {t("synonymsNoResults")}
          </p>
        ) : (
          filtered.map((option) => {
            const checked = selectedIds.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                data-active={checked}
                className={mx(composerStyles, "vocab-suggest-item")}
                onClick={() => selectSynonym(option)}
              >
                <span className={mx(composerStyles, "vocab-suggest-title")}>
                  {option.word}
                </span>
                {option.meaning ? (
                  <span className={mx(composerStyles, "vocab-suggest-meta")}>
                    {option.meaning}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (isCreating) return;
          setCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("synonymsCreateTitle")}</DialogTitle>
            <DialogDescription>
              {t("synonymsCreateDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="synonym-new-word">{t("word")}</Label>
              <CapitalizedInput
                id="synonym-new-word"
                value={createWord}
                onChange={(event) => setCreateWord(event.target.value)}
                placeholder={t("wordPlaceholder")}
                className={mx(composerStyles, "vocab-composer-field")}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="synonym-new-meaning">{t("synonymsMeaning")}</Label>
              <CapitalizedInput
                id="synonym-new-meaning"
                value={createMeaning}
                onChange={(event) => setCreateMeaning(event.target.value)}
                placeholder={t("synonymsMeaningPlaceholder")}
                className={mx(composerStyles, "vocab-composer-field")}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("partOfSpeech")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({tCommon("optional")})
                </span>
              </Label>
              <PartOfSpeechSelect
                size="compact"
                value={createPartOfSpeech}
                disabled={isCreating}
                onChange={(value) => setCreatePartOfSpeech(value ?? "")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isCreating}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={
                isCreating || !createWord.trim() || !createMeaning.trim()
              }
            >
              {isCreating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t("saveWord")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
