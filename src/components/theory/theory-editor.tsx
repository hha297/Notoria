"use client";

import type { JSONContent } from "@tiptap/react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Textarea } from "@/components/ui/textarea";
import { createTheoryNote, updateTheoryNote } from "@/lib/actions/theory";
import {
  THEORY_CATEGORIES,
  isKnownTheoryCategory,
  parseTheoryContent,
  serializeTheoryContent,
} from "@/lib/theory/content";
import {
  THEORY_DESCRIPTION_MAX,
  type TheoryFormErrorCode,
} from "@/schemas/theory";

type TheoryEditorProps = {
  previewHref?: string;
  folderId?: string | null;
  initialData?: {
    id: string;
    title: string;
    content: unknown;
  };
};

const AUTOSAVE_MS = 1500;

export function TheoryEditor({ previewHref, folderId = null, initialData }: TheoryEditorProps) {
  const router = useRouter();
  const t = useTranslations("theory");
  const tCommon = useTranslations("common");
  const parsed = parseTheoryContent(initialData?.content);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [category, setCategory] = useState(parsed.category);
  const [description, setDescription] = useState(parsed.description);
  const [doc, setDoc] = useState<JSONContent>(parsed.doc);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({
    title,
    category,
    description,
    doc,
    id: initialData?.id,
  });

  useEffect(() => {
    latestRef.current = {
      title,
      category,
      description,
      doc,
      id: initialData?.id,
    };
  }, [title, category, description, doc, initialData?.id]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  function buildPayload() {
    return {
      title: title.trim(),
      category,
      description: description.trim(),
      content: serializeTheoryContent({
        kind: "theory",
        version: 1,
        category,
        description: description.trim(),
        doc,
      }),
    };
  }

  function scheduleAutosave() {
    if (!initialData?.id || previewHref) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void runAutosave();
    }, AUTOSAVE_MS);
  }

  async function runAutosave() {
    const current = latestRef.current;
    if (!current.id || !current.title.trim()) return;
    if (current.description.trim().length > THEORY_DESCRIPTION_MAX) return;

    setIsAutosaving(true);
    try {
      await updateTheoryNote(current.id, {
        title: current.title.trim(),
        category: current.category,
        description: current.description.trim(),
        content: serializeTheoryContent({
          kind: "theory",
          version: 1,
          category: current.category,
          description: current.description.trim(),
          doc: current.doc,
        }),
      });
    } catch {
      // Autosave failures are silent
    } finally {
      setIsAutosaving(false);
    }
  }

  function actionErrorMessage(
    code: TheoryFormErrorCode | "NOT_FOUND" | "SAVE_FAILED",
  ) {
    switch (code) {
      case "TITLE_REQUIRED":
        return t("titleRequired");
      case "DESCRIPTION_TOO_LONG":
        return t("descriptionTooLong", { max: THEORY_DESCRIPTION_MAX });
      case "CATEGORY_INVALID":
        return t("categoryInvalid");
      case "NOT_FOUND":
        return t("notFound");
      default:
        return t("saveFailed");
    }
  }

  async function persist() {
    if (!title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }

    if (description.trim().length > THEORY_DESCRIPTION_MAX) {
      toast.error(
        t("descriptionTooLong", { max: THEORY_DESCRIPTION_MAX }),
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (initialData?.id) {
        const result = await updateTheoryNote(initialData.id, payload);
        if (!result.ok) {
          toast.error(actionErrorMessage(result.code));
          return;
        }
        toast.success(t("saved"));
        router.replace("/theory");
      } else {
        const created = await createTheoryNote(payload, { folderId });
        if (!created.ok) {
          toast.error(actionErrorMessage(created.code));
          return;
        }
        toast.success(t("created"));
        router.replace("/theory");
      }
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="space-y-2 border-b border-hairline-cloud px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 md:px-8 md:pt-8 md:pb-6">
          <CardTitle className="heading-md text-ink">
            {initialData ? t("editTitle") : t("newTitle")}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed sm:text-base">
            {t("formDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <div className="space-y-2">
            <Label htmlFor="theory-title">{t("documentTitle")}</Label>
            <Input
              id="theory-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                scheduleAutosave();
              }}
              placeholder={t("titlePlaceholder")}
              className="h-10"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="theory-category">{t("categoryLabel")}</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  if (!value) return;
                  setCategory(value);
                  scheduleAutosave();
                }}
              >
                <SelectTrigger
                  id="theory-category"
                  className="h-10! w-full rounded-md bg-background px-3 py-0 data-[size=default]:h-10!"
                >
                  <SelectValue>
                    {isKnownTheoryCategory(category)
                      ? t(`categories.${category}`)
                      : category}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {THEORY_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`categories.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="theory-description">
                {t("summaryLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({tCommon("optional")})
                </span>
              </Label>
              <span
                className={
                  description.length > THEORY_DESCRIPTION_MAX
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {description.length}/{THEORY_DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="theory-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                scheduleAutosave();
              }}
              placeholder={t("summaryPlaceholder")}
              maxLength={THEORY_DESCRIPTION_MAX}
              rows={3}
              className="min-h-20 resize-y"
              aria-invalid={
                description.length > THEORY_DESCRIPTION_MAX ? true : undefined
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{t("content")}</Label>
            <RichTextEditor
              content={doc}
              placeholder={t("contentPlaceholder")}
              onChange={(next) => {
                setDoc(next);
                scheduleAutosave();
              }}
              onImageUploadPendingChange={setImageUploading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {previewHref
            ? t("editSaveHint")
            : isAutosaving
              ? t("autosaving")
              : initialData
                ? t("autosaveReady")
                : t("autosavePending")}
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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
            onClick={() => persist()}
            disabled={isSaving || imageUploading}
            size="lg"
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {tCommon("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
