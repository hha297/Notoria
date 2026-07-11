"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createVocabularyWord,
  updateVocabularyWord,
} from "@/lib/actions/vocabulary";
import {
  vocabularyFormClientSchema,
  type VocabularyFormValues,
} from "@/schemas/vocabulary";

type VocabularyFormClientValues = Omit<VocabularyFormValues, "meanings">;
import {
  SortableMeanings,
  type MeaningItem,
} from "@/components/vocabulary/sortable-meanings";

type VocabularyFormProps = {
  initialData?: {
    id: string;
    language: string;
    word: string;
    pronunciation?: string | null;
    ipa?: string | null;
    partOfSpeech?: string | null;
    notes?: string | null;
    meanings: Array<{
      id: string;
      meaning: string;
      sortOrder: number;
    }>;
  };
};

function createDefaultMeanings(): MeaningItem[] {
  return [
    {
      id: crypto.randomUUID(),
      meaning: "",
      sortOrder: 0,
    },
  ];
}

export function VocabularyForm({ initialData }: VocabularyFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [meanings, setMeanings] = useState<MeaningItem[]>(
    initialData?.meanings.map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      sortOrder: meaning.sortOrder,
    })) ?? createDefaultMeanings(),
  );

  const form = useForm<VocabularyFormClientValues>({
    resolver: zodResolver(vocabularyFormClientSchema),
    defaultValues: {
      language: initialData?.language ?? "fi",
      word: initialData?.word ?? "",
      pronunciation: initialData?.pronunciation ?? "",
      ipa: initialData?.ipa ?? "",
      partOfSpeech: initialData?.partOfSpeech ?? "",
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
      toast.error("Add at least one meaning");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        ...values,
        meanings: filledMeanings,
      };

      if (initialData?.id) {
        await updateVocabularyWord(initialData.id, payload);
        toast.success("Word updated");
        router.refresh();
      } else {
        const word = await createVocabularyWord(payload);
        toast.success("Word saved");
        router.push(`/vocabulary/${word.id}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save word",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="card-surface gap-0 py-0 ring-0">
        <CardHeader>
          <CardTitle>{initialData ? "Edit word" : "New word"}</CardTitle>
          <CardDescription>
            Add a word and one or more meanings. Drag meanings to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="word">Word</Label>
              <Input
                id="word"
                placeholder="e.g. Koira"
                {...form.register("word")}
              />
              {form.formState.errors.word && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.word.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input id="language" placeholder="fi" {...form.register("language")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pronunciation">Pronunciation</Label>
              <Input
                id="pronunciation"
                placeholder="Optional"
                {...form.register("pronunciation")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partOfSpeech">Part of speech</Label>
              <Input
                id="partOfSpeech"
                placeholder="noun, verb..."
                {...form.register("partOfSpeech")}
              />
            </div>
          </div>

          <SortableMeanings meanings={meanings} onChange={setMeanings} />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Mnemonics, usage tips..."
              rows={3}
              {...form.register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {initialData ? "Update word" : "Save word"}
        </Button>
      </div>
    </form>
  );
}
