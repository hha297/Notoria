"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createVocabularyWord,
  updateVocabularyWord,
} from "@/lib/actions/vocabulary";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";
import {
  getCustomTagName,
  isCustomTagKey,
  PARTS_OF_SPEECH,
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
  initialData?: {
    id: string;
    word: string;
    partOfSpeech?: string | null;
    notes?: string | null;
    meanings: Array<{
      id: string;
      meaning: string;
      sortOrder: number;
    }>;
    examples: Array<{
      id: string;
      sentence: string;
      sortOrder: number;
    }>;
    tags: Array<{
      tag: string;
    }>;
  };
};

function createDefaultMeanings(): MeaningItem[] {
  return [
    {
      id: "new-meaning-0",
      meaning: "",
      sortOrder: 0,
    },
  ];
}

function createDefaultExamples(): ExampleItem[] {
  return [
    {
      id: "new-example-0",
      sentence: "",
      sortOrder: 0,
    },
  ];
}

function getInitialExamples(
  examples?: Array<{ id: string; sentence: string; sortOrder: number }>,
): ExampleItem[] {
  if (!examples?.length) {
    return createDefaultExamples();
  }

  return examples.map((example) => ({
    id: example.id,
    sentence: example.sentence,
    sortOrder: example.sortOrder,
  }));
}

function getInitialSessionCustomTags(
  tags: Array<{ tag: string }> | undefined,
): string[] {
  if (!tags) {
    return [];
  }

  return tags
    .map((tag) => tag.tag)
    .filter(isCustomTagKey)
    .map(getCustomTagName)
    .sort((a, b) => a.localeCompare(b));
}

export function VocabularyForm({ initialData }: VocabularyFormProps) {
  const router = useRouter();
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");
  const [isSaving, setIsSaving] = useState(false);
  const [meanings, setMeanings] = useState<MeaningItem[]>(
    initialData?.meanings.map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      sortOrder: meaning.sortOrder,
    })) ?? createDefaultMeanings(),
  );
  const [examples, setExamples] = useState<ExampleItem[]>(() =>
    getInitialExamples(initialData?.examples),
  );
  const [tags, setTags] = useState<string[]>(
    initialData?.tags.map((tag) => tag.tag) ?? [],
  );
  const [sessionCustomTags, setSessionCustomTags] = useState<string[]>(() =>
    getInitialSessionCustomTags(initialData?.tags),
  );

  const form = useForm<VocabularyFormClientValues>({
    resolver: zodResolver(vocabularyFormClientSchema),
    defaultValues: {
      word: initialData?.word ?? "",
      partOfSpeech:
        (initialData?.partOfSpeech as VocabularyFormClientValues["partOfSpeech"]) ??
        undefined,
      notes: initialData?.notes ?? "",
    },
  });

  async function onSubmit(values: VocabularyFormClientValues) {
    const filledMeanings = meanings
      .map((item, index) => ({
        id: item.id,
        meaning: item.meaning.trim(),
        sortOrder: index,
      }))
      .filter((item) => item.meaning.length > 0);

    if (filledMeanings.length === 0) {
      toast.error(t("meaningRequired"));
      return;
    }

    const filledExamples = examples
      .map((item, index) => ({
        id: item.id,
        sentence: item.sentence.trim(),
        sortOrder: index,
      }))
      .filter((item) => item.sentence.length > 0);

    setIsSaving(true);

    try {
      const payload = {
        ...values,
        meanings: filledMeanings,
        examples: filledExamples,
        tags,
      };

      if (initialData?.id) {
        await updateVocabularyWord(initialData.id, payload);
        toast.success(t("updated"));
        router.push("/vocabulary");
      } else {
        await createVocabularyWord(payload);
        toast.success(t("saved"));
        router.push("/vocabulary");
      }
    } catch (error) {
      if (error instanceof Error && error.message === VOCABULARY_WORD_EXISTS) {
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
              <Input
                id="word"
                placeholder={t("wordPlaceholder")}
                className="h-10"
                {...form.register("word")}
              />
              {form.formState.errors.word && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.word.message}
                </p>
              )}
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
            sessionCustomTags={sessionCustomTags}
            onSessionCustomTagsChange={setSessionCustomTags}
          />

          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("notesPlaceholder")}
              rows={4}
              className="min-h-28 resize-y"
              suppressHydrationWarning
              {...form.register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-stretch sm:justify-end">
        <Button
          type="submit"
          disabled={isSaving}
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
