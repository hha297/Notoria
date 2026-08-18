"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CapitalizedInput } from "@/components/form/capitalized-text";
import { createSynonymWord } from "@/lib/actions/vocabulary";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";
import {
  normalizeVocabularyWord,
  type VocabularySynonymRef,
} from "@/lib/vocabulary/synonyms";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import { cn } from "@/lib/utils";

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
  const tPos = useTranslations("tags.pos");
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
          ? (createPartOfSpeech as (typeof PARTS_OF_SPEECH)[number])
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
    <div className="space-y-2">
      <Label htmlFor="synonyms-search">
        {t("synonyms")}{" "}
        <span className="font-normal text-muted-foreground">
          ({tCommon("optional")})
        </span>
      </Label>

      <div className="overflow-hidden rounded-lg border border-hairline-cloud bg-card">
        <div className="flex items-start gap-2 px-3 py-2">
          <div
            className="flex min-h-10 min-w-0 flex-1 cursor-text flex-wrap items-center gap-1.5"
            onClick={() => inputRef.current?.focus()}
          >
            {value.map((synonym) => (
              <Badge
                key={synonym.id}
                variant="secondary"
                className="h-6 gap-0.5 pr-1"
              >
                <Link
                  href={`/vocabulary/${synonym.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {synonym.word}
                </Link>
                <button
                  type="button"
                  className="rounded-sm p-0.5 text-on-primary/70 transition-colors hover:text-on-primary"
                  aria-label={t("synonymsRemove", { word: synonym.word })}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSynonym(synonym.id);
                  }}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <CapitalizedInput
              id="synonyms-search"
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={
                value.length === 0
                  ? t("synonymsSearch")
                  : t("synonymsSelect")
              }
              className="h-7 min-w-32 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:shadow-none"
              disabled={isCreating}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1.5 shrink-0"
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

        <div className="border-t border-hairline-cloud">
          <ScrollArea className="h-48">
            <div className="space-y-1 px-3 py-3">
              {queryIsCurrentWord ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {t("synonymsCannotLinkSelf")}
                </p>
              ) : null}

              {canCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 text-ink"
                  onClick={() => openCreate()}
                  disabled={isCreating}
                >
                  <Plus className="size-4" />
                  {t("synonymsAddNew", { word: query.trim() })}
                </Button>
              ) : null}

              {filtered.length === 0 && !canCreate && !queryIsCurrentWord ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {t("synonymsNoResults")}
                </p>
              ) : (
                filtered.map((option) => {
                  const checked = selectedIds.has(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60",
                        checked && "bg-accent-lime/10",
                      )}
                      onClick={() => selectSynonym(option)}
                    >
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate font-medium",
                          checked ? "text-ink" : "text-ink/90",
                        )}
                      >
                        {option.word}
                      </span>
                      {option.meaning ? (
                        <span className="max-w-[55%] shrink-0 truncate text-xs text-muted-foreground">
                          {option.meaning}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
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
              <Select
                value={createPartOfSpeech}
                onValueChange={(value) => setCreatePartOfSpeech(value ?? "")}
                disabled={isCreating}
              >
                <SelectTrigger className="h-10! w-full rounded-md bg-background px-3 py-0 data-[size=default]:h-10!">
                  <SelectValue placeholder={t("partOfSpeechPlaceholder")}>
                    {createPartOfSpeech &&
                    PARTS_OF_SPEECH.includes(
                      createPartOfSpeech as (typeof PARTS_OF_SPEECH)[number],
                    )
                      ? tPos(
                          createPartOfSpeech as (typeof PARTS_OF_SPEECH)[number],
                        )
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PARTS_OF_SPEECH.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {tPos(pos)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
