"use client";

import type { JSONContent } from "@tiptap/react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
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
import { createExercise, updateExercise } from "@/lib/actions/exercises";
import type { ExerciseFormValues } from "@/schemas/exercise";

type WritingExerciseEditorProps = {
  exerciseType: ExerciseFormValues["type"];
  initialData?: {
    id: string;
    title: string;
    type: ExerciseFormValues["type"];
    content: JSONContent;
  };
};

export function WritingExerciseEditor({
  exerciseType,
  initialData,
}: WritingExerciseEditorProps) {
  const router = useRouter();
  const type = initialData?.type ?? exerciseType;
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState<JSONContent>(
    initialData?.content ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);

  async function persistExercise(showToast = true) {
    if (!title.trim()) {
      if (showToast) toast.error("Title is required");
      return;
    }

    setIsSaving(true);

    try {
      const payload: ExerciseFormValues = {
        title: title.trim(),
        type,
        content: content as Record<string, unknown>,
      };

      if (initialData?.id) {
        await updateExercise(initialData.id, payload);
        if (showToast) toast.success("Exercise saved");
        router.refresh();
      } else {
        const exercise = await createExercise(payload);
        if (showToast) toast.success("Exercise created");
        router.push(`/exercises/${exercise.id}`);
      }
    } catch (error) {
      if (showToast) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save exercise",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAutosave(nextContent: JSONContent) {
    if (!initialData?.id || !title.trim()) return;

    setContent(nextContent);
    setIsAutosaving(true);

    try {
      await updateExercise(initialData.id, {
        title: title.trim(),
        type,
        content: nextContent as Record<string, unknown>,
      });
    } catch {
      // Autosave failures are silent; manual save still available
    } finally {
      setIsAutosaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="space-y-2 border-b border-hairline-cloud px-8 pt-8 pb-6">
          <CardTitle className="heading-md text-ink">
            {initialData ? "Edit exercise" : "New exercise"}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Add a title and write your exercise content below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 px-8 py-8">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Exercise title"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              content={content}
              placeholder="Start writing your exercise content here..."
              onChange={setContent}
              onAutosave={initialData?.id ? handleAutosave : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isAutosaving
            ? "Autosaving..."
            : initialData
              ? "Changes autosave"
              : "Save to enable autosave"}
        </p>
        <Button onClick={() => persistExercise(true)} disabled={isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save exercise
        </Button>
      </div>
    </div>
  );
}
