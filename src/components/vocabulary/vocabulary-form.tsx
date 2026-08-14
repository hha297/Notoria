"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlignLeft, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Editor, JSONContent } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  SortableExamples,
  type ExampleItem,
} from "@/components/vocabulary/sortable-examples";
import {
  SortableMeanings,
  type MeaningItem,
} from "@/components/vocabulary/sortable-meanings";
import { TagMultiSelect } from "@/components/vocabulary/tag-multi-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CapitalizedInput } from "@/components/form/capitalized-text";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  checkVocabularyWordExists,
  createVocabularyWord,
  updateVocabularyWord,
} from "@/lib/actions/vocabulary";
import {
  formatNotesDoc,
  isNotesDocEmpty,
  parseVocabularyNotes,
  serializeVocabularyNotes,
} from "@/lib/vocabulary/notes-content";
import {
  countPrimaryMeanings,
  MAX_PRIMARY_MEANINGS,
} from "@/lib/vocabulary/primary-meanings";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";
import {
  getCustomTagName,
  isCustomTagKey,
  normalizeWordTags,
  PARTS_OF_SPEECH,
  uniqueCustomTagNames,
} from "@/lib/vocabulary-tags";
import {
  vocabularyFormClientSchema,
  type VocabularyFormValues,
} from "@/schemas/vocabulary";

type VocabularyFormClientValues = Omit<
  VocabularyFormValues,
  "meanings" | "examples" | "tags"
>;

type VocabularyFormProps = {
  /** When set, Cancel returns here and Save navigates here after persisting. */
  previewHref?: string;
  existingCustomTags?: string[];
  initialData?: {
    id: string;
    word: string;
    partOfSpeech?: string | null;
    synonyms?: string | null;
    notes?: string | null;
    meanings: Array<{
      id: string;
      meaning: string;
      isPrimary?: boolean;
      sortOrder: number;
    }>;
    examples: Array<{
      id: string;
      sentence: string;
      meaning?: string | null;
      notes?: string | null;
      sortOrder: number;
    }>;
    tags: Array<{
      tag: string;
    }>;
  };
};

type WordCheckStatus = "idle" | "checking" | "duplicate" | "unique" | "error";

const WORD_CHECK_DEBOUNCE_MS = 400;

function normalizeWordInput(word: string) {
  return word.trim().toLowerCase();
}

function createDefaultMeanings(): MeaningItem[] {
  return [
    {
      id: "new-meaning-0",
      meaning: "",
      isPrimary: true,
      sortOrder: 0,
    },
  ];
}

function createDefaultExamples(): ExampleItem[] {
  return [
    {
      id: "new-example-0",
      sentence: "",
      meaning: "",
      notes: "",
      sortOrder: 0,
    },
  ];
}

function getInitialExamples(
  examples?: Array<{
    id: string;
    sentence: string;
    meaning?: string | null;
    notes?: string | null;
    sortOrder: number;
  }>,
): ExampleItem[] {
  if (!examples?.length) {
    return createDefaultExamples();
  }

  return examples.map((example) => ({
    id: example.id,
    sentence: example.sentence,
    meaning: example.meaning ?? "",
    notes: example.notes ?? "",
    sortOrder: example.sortOrder,
  }));
}

function getInitialCustomTags(
  existingCustomTags: string[] | undefined,
  tags: Array<{ tag: string }> | undefined,
): string[] {
  const fromWord = tags
    ?.map((tag) => tag.tag)
    .filter(isCustomTagKey)
    .map(getCustomTagName) ?? [];

  return uniqueCustomTagNames([...(existingCustomTags ?? []), ...fromWord]);
}

export function VocabularyForm({
  initialData,
  previewHref,
  existingCustomTags,
}: VocabularyFormProps) {
  const router = useRouter();
  const t = useTranslations("vocabulary");
  const tCommon = useTranslations("common");
  const tPos = useTranslations("tags.pos");
  const [isSaving, setIsSaving] = useState(false);
  const [wordCheckStatus, setWordCheckStatus] =
    useState<WordCheckStatus>("idle");
  const [meanings, setMeanings] = useState<MeaningItem[]>(
    initialData?.meanings.map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      isPrimary: meaning.isPrimary ?? true,
      sortOrder: meaning.sortOrder,
    })) ?? createDefaultMeanings(),
  );
  const [examples, setExamples] = useState<ExampleItem[]>(() =>
    getInitialExamples(initialData?.examples),
  );
  const [tags, setTags] = useState<string[]>(() =>
    normalizeWordTags(
      initialData?.tags.map((tag) => tag.tag) ?? [],
      existingCustomTags,
    ),
  );
  const [customTags, setCustomTags] = useState<string[]>(() =>
    getInitialCustomTags(existingCustomTags, initialData?.tags),
  );

  const form = useForm<VocabularyFormClientValues>({
    resolver: zodResolver(vocabularyFormClientSchema),
    defaultValues: {
      word: initialData?.word ?? "",
      partOfSpeech:
        (initialData?.partOfSpeech as VocabularyFormClientValues["partOfSpeech"]) ??
        undefined,
      synonyms: initialData?.synonyms ?? "",
      notes: serializeVocabularyNotes(
        parseVocabularyNotes(initialData?.notes ?? ""),
      ),
    },
  });

  const [notesDoc, setNotesDoc] = useState<JSONContent>(() =>
    parseVocabularyNotes(initialData?.notes ?? ""),
  );
  const notesEditorRef = useRef<Editor | null>(null);

  const watchedWord = form.watch("word");
  const wordCheckRequestId = useRef(0);
  const initialNormalizedWord = initialData
    ? normalizeWordInput(initialData.word)
    : "";

  useEffect(() => {
    const normalized = normalizeWordInput(watchedWord ?? "");

    if (!normalized) {
      wordCheckRequestId.current += 1;
      setWordCheckStatus("idle");
      return;
    }

    // Editing the same word as before is always allowed.
    if (initialData?.id && normalized === initialNormalizedWord) {
      wordCheckRequestId.current += 1;
      setWordCheckStatus("unique");
      return;
    }

    const requestId = ++wordCheckRequestId.current;
    setWordCheckStatus("checking");

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await checkVocabularyWordExists(
            normalized,
            initialData?.id,
          );
          if (requestId !== wordCheckRequestId.current) return;
          setWordCheckStatus(result.exists ? "duplicate" : "unique");
        } catch {
          if (requestId !== wordCheckRequestId.current) return;
          // Do not block save on network/check failure.
          setWordCheckStatus("error");
        }
      })();
    }, WORD_CHECK_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [watchedWord, initialData?.id, initialNormalizedWord]);

  async function onSubmit(values: VocabularyFormClientValues) {
    if (wordCheckStatus === "duplicate" || wordCheckStatus === "checking") {
      return;
    }

    const filledMeanings = meanings
      .map((item, index) => ({
        id: item.id,
        meaning: item.meaning.trim(),
        isPrimary: item.isPrimary,
        sortOrder: index,
      }))
      .filter((item) => item.meaning.length > 0);

    if (filledMeanings.length === 0) {
      toast.error(t("meaningRequired"));
      return;
    }

    const primaryCount = countPrimaryMeanings(filledMeanings);
    if (primaryCount < 1) {
      toast.error(t("primaryMeaningRequired"));
      return;
    }
    if (primaryCount > MAX_PRIMARY_MEANINGS) {
      toast.error(t("primaryMeaningLimit", { max: MAX_PRIMARY_MEANINGS }));
      return;
    }

    const filledExamples = examples
      .map((item, index) => ({
        id: item.id,
        sentence: item.sentence.trim(),
        meaning: item.meaning.trim(),
        notes: item.notes.trim(),
        sortOrder: index,
      }))
      .filter((item) => item.sentence.length > 0);

    setIsSaving(true);

    try {
      const payload = {
        ...values,
        meanings: filledMeanings,
        examples: filledExamples,
        tags: normalizeWordTags(tags, customTags),
      };

      if (initialData?.id) {
        await updateVocabularyWord(initialData.id, payload);
        toast.success(t("updated"));
        router.replace("/vocabulary");
      } else {
        await createVocabularyWord(payload);
        toast.success(t("saved"));
        router.replace("/vocabulary");
      }
    } catch (error) {
      if (error instanceof Error && error.message === VOCABULARY_WORD_EXISTS) {
        setWordCheckStatus("duplicate");
        toast.error(t("wordExists"));
        return;
      }

      toast.error(
        error instanceof Error ? error.message : t("meaningRequired"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const selectedPartOfSpeech = form.watch("partOfSpeech");
  const isDuplicate = wordCheckStatus === "duplicate";
  const isCheckingWord = wordCheckStatus === "checking";
  const saveDisabled = isSaving || isDuplicate || isCheckingWord;
  const formatNotesDisabled = isNotesDocEmpty(notesDoc);

  function handleNotesChange(doc: JSONContent) {
    setNotesDoc(doc);
    form.setValue("notes", serializeVocabularyNotes(doc), {
      shouldDirty: true,
      shouldTouch: true,
    });
  }

  function handleFormatNotes() {
    if (isNotesDocEmpty(notesDoc)) return;

    const formatted = formatNotesDoc(notesDoc);
    if (JSON.stringify(formatted) === JSON.stringify(notesDoc)) {
      toast.message(t("formatNotesUnchanged"));
      return;
    }

    setNotesDoc(formatted);
    form.setValue("notes", serializeVocabularyNotes(formatted), {
      shouldDirty: true,
      shouldTouch: true,
    });
    notesEditorRef.current?.commands.setContent(formatted);
    toast.success(t("formatNotesSuccess"));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="space-y-2 border-b border-hairline-cloud px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 md:px-8 md:pt-8 md:pb-6">
          <CardTitle className="heading-md text-ink">
            {initialData ? t("editWord") : t("newWord")}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed sm:text-base">
            {t("formDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="word">{t("word")}</Label>
              <div className="relative">
                <CapitalizedInput
                  id="word"
                  placeholder={t("wordPlaceholder")}
                  className="h-10 pr-10"
                  aria-invalid={isDuplicate || undefined}
                  aria-describedby={
                    isDuplicate || wordCheckStatus === "error" || isCheckingWord
                      ? "word-duplicate-status"
                      : undefined
                  }
                  {...form.register("word")}
                />
                {isCheckingWord ? (
                  <Loader2
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
              </div>
              {form.formState.errors.word ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.word.message}
                </p>
              ) : null}
              {isCheckingWord ? (
                <p
                  id="word-duplicate-status"
                  className="text-sm text-muted-foreground"
                >
                  {t("wordExistsChecking")}
                </p>
              ) : null}
              {isDuplicate ? (
                <p
                  id="word-duplicate-status"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {t("wordExists")}
                </p>
              ) : null}
              {wordCheckStatus === "error" ? (
                <p
                  id="word-duplicate-status"
                  className="text-sm text-muted-foreground"
                  role="status"
                >
                  {t("wordExistsCheckFailed")}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t("partOfSpeech")}</Label>
              <Select
                value={form.watch("partOfSpeech") ?? ""}
                onValueChange={(value) =>
                  form.setValue(
                    "partOfSpeech",
                    value
                      ? (value as VocabularyFormClientValues["partOfSpeech"])
                      : undefined,
                  )
                }
              >
                <SelectTrigger className="h-10! w-full rounded-md bg-background px-3 py-0 data-[size=default]:h-10!">
                  <SelectValue placeholder={t("partOfSpeechPlaceholder")}>
                    {selectedPartOfSpeech &&
                    PARTS_OF_SPEECH.includes(
                      selectedPartOfSpeech as (typeof PARTS_OF_SPEECH)[number],
                    )
                      ? tPos(
                          selectedPartOfSpeech as (typeof PARTS_OF_SPEECH)[number],
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

          <SortableMeanings meanings={meanings} onChange={setMeanings} />
          <SortableExamples examples={examples} onChange={setExamples} />
          <TagMultiSelect
            value={tags}
            onChange={setTags}
            customTags={customTags}
            onCustomTagsChange={setCustomTags}
          />

          <div className="space-y-2">
            <Label htmlFor="synonyms">
              {t("synonyms")}{" "}
              <span className="font-normal text-muted-foreground">
                ({tCommon("optional")})
              </span>
            </Label>
            <CapitalizedInput
              id="synonyms"
              placeholder={t("synonymsPlaceholder")}
              className="h-10"
              {...form.register("synonyms")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="notes-editor">{t("notes")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                disabled={formatNotesDisabled}
                onClick={handleFormatNotes}
              >
                <AlignLeft className="size-3.5" />
                {t("formatNotes")}
              </Button>
            </div>
            <div id="notes-editor">
              <RichTextEditor
                content={notesDoc}
                placeholder={t("notesPlaceholder")}
                variant="notes"
                onChange={handleNotesChange}
                onEditorReady={(editor) => {
                  notesEditorRef.current = editor;
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {previewHref ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.replace(previewHref)}
            disabled={isSaving}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {tCommon("cancel")}
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={saveDisabled}
          size="lg"
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {initialData ? t("updateWord") : t("saveWord")}
        </Button>
      </div>
    </form>
  );
}
