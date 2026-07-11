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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createExercise,
  updateExercise,
} from "@/lib/actions/exercises";
import type { ExerciseFormValues } from "@/schemas/exercise";

type ExerciseEditorProps = {
  initialData?: {
    id: string;
    title: string;
    type: ExerciseFormValues["type"];
    content: JSONContent;
  };
};

const exerciseTypes: Array<{
  value: ExerciseFormValues["type"];
  label: string;
}> = [
  { value: "QUESTIONS", label: "Questions" },
  { value: "FILL_BLANK", label: "Fill in the blank" },
  { value: "TRANSLATION", label: "Translation" },
  { value: "WRITING", label: "Writing" },
  { value: "READING", label: "Reading" },
  { value: "GRAMMAR_DRILL", label: "Grammar drill" },
];

export function ExerciseEditor({ initialData }: ExerciseEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [type, setType] = useState<ExerciseFormValues["type"]>(
    initialData?.type ?? "QUESTIONS",
  );
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
    <div className="space-y-6">
      <Card className="card-surface gap-0 py-0 ring-0">
        <CardHeader>
          <CardTitle>{initialData ? "Edit exercise" : "New exercise"}</CardTitle>
          <CardDescription>
            Build rich exercises with headings, checklists, tables and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Tell about yourself"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setType(value as ExerciseFormValues["type"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {exerciseTypes.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <RichTextEditor
        content={content}
        placeholder="Missä synnyit?&#10;&#10;Millainen perhe sinulla on?&#10;&#10;Mikä on ammattisi?"
        onChange={setContent}
        onAutosave={initialData?.id ? handleAutosave : undefined}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isAutosaving ? "Autosaving..." : initialData ? "Changes autosave" : "Save to enable autosave"}
        </p>
        <Button onClick={() => persistExercise(true)} disabled={isSaving}>
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
