"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  SortableMeanings,
  type MeaningItem,
} from "@/components/vocabulary/sortable-meanings";
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
      word: initialData?.word ?? "",
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="space-y-2 border-b border-hairline-cloud px-8 pt-8 pb-6">
          <CardTitle className="heading-md text-ink">
            {initialData ? "Edit word" : "New word"}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Add a word and one or more meanings. Drag meanings to reorder.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 px-8 py-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="word">Word</Label>
              <Input
                id="word"
                placeholder="e.g. Koira"
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
              <Label htmlFor="partOfSpeech">Part of speech</Label>
              <Input
                id="partOfSpeech"
                placeholder="noun, verb..."
                className="h-10"
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
              rows={4}
              className="min-h-28 resize-y"
              {...form.register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} size="lg">
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
