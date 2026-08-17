"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  createActiveWorkspaceTag,
  deleteActiveWorkspaceTag,
  updateActiveWorkspaceTag,
} from "@/lib/actions/workspaces";
import {
  customTagKey,
  findCustomTagName,
  getCustomTagName,
  getTagLabel,
  isCustomTagKey,
  isValidCustomTagName,
  listTagOptions,
  TAG_PICKER_GROUPS,
  uniqueCustomTagNames,
  type VocabularyTagGroup,
  type VocabularyTagOption,
} from "@/lib/vocabulary-tags";

export { getTagLabel };

type TagMultiSelectProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  customTags: string[];
  onCustomTagsChange: (tags: string[]) => void;
};

const GROUP_ORDER: VocabularyTagGroup[] = [...TAG_PICKER_GROUPS, "custom"];

function tagMatchesQuery(
  option: VocabularyTagOption,
  query: string,
  label: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    label.toLowerCase().includes(q) ||
    option.id.toLowerCase().includes(q) ||
    (isCustomTagKey(option.id) &&
      getCustomTagName(option.id).toLowerCase().includes(q))
  );
}

function findExactTagMatch(
  options: VocabularyTagOption[],
  query: string,
  getLabel: (option: VocabularyTagOption) => string,
): VocabularyTagOption | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  return options.find((option) => {
    const label = getLabel(option).toLowerCase();
    if (label === q || option.id.toLowerCase() === q) return true;
    return (
      isCustomTagKey(option.id) && getCustomTagName(option.id).toLowerCase() === q
    );
  });
}

function replaceSelectedTag(tags: string[], fromKey: string, toKey: string) {
  const next = tags.map((tag) =>
    tag.toLowerCase() === fromKey.toLowerCase() ? toKey : tag,
  );
  const seen = new Set<string>();
  return next.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function TagMultiSelect({
  value,
  onChange,
  customTags,
  onCustomTagsChange,
}: TagMultiSelectProps) {
  const t = useTranslations("tags");
  const tv = useTranslations("vocabulary");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const busy = isCreating || isSavingEdit || isDeleting;

  function optionLabel(option: VocabularyTagOption) {
    return getTagLabel(option.id, (key) => t(key));
  }

  const options = useMemo(() => listTagOptions(customTags), [customTags]);

  const filtered = useMemo(() => {
    return options.filter((option) =>
      tagMatchesQuery(option, query, optionLabel(option)),
    );
  }, [options, query, t]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      options: filtered.filter((option) => option.group === group),
    })).filter((item) => item.options.length > 0);
  }, [filtered]);

  const exactMatch = findExactTagMatch(options, query, optionLabel);
  const canCreate = isValidCustomTagName(query) && !exactMatch && !busy;
  const canSubmitQuery = Boolean(query.trim()) && !busy && (canCreate || Boolean(exactMatch));

  function setTagChecked(tag: string, checked: boolean) {
    if (checked) {
      if (!value.includes(tag)) {
        onChange([...value, tag]);
      }
      return;
    }

    onChange(value.filter((item) => item !== tag));
  }

  function selectTag(tag: string) {
    setTagChecked(tag, true);
    setQuery("");
    inputRef.current?.focus();
  }

  function toggleTag(tag: string) {
    setTagChecked(tag, !value.includes(tag));
    setQuery("");
    inputRef.current?.focus();
  }

  async function handleCreateFromQuery() {
    const name = query.trim();
    if (!isValidCustomTagName(name)) return;

    const existingCustom = findCustomTagName(customTags, name);
    if (existingCustom) {
      selectTag(customTagKey(existingCustom));
      return;
    }

    if (exactMatch) {
      selectTag(exactMatch.id);
      return;
    }

    setIsCreating(true);
    try {
      const result = await createActiveWorkspaceTag(name);
      const canonical = result.tag.name;
      onCustomTagsChange(uniqueCustomTagNames([...customTags, canonical]));
      selectTag(customTagKey(canonical));

      if (result.created) {
        toast.success(tSettings("tagCreated"));
      } else {
        toast.message(tSettings("tagExists"));
      }
    } catch (error) {
      if (error instanceof Error && error.message === "TAG_EXISTS") {
        toast.error(tSettings("tagExists"));
        return;
      }
      toast.error(tErrors("generic"));
    } finally {
      setIsCreating(false);
      inputRef.current?.focus();
    }
  }

  function handleAdd() {
    if (exactMatch) {
      selectTag(exactMatch.id);
      return;
    }
    if (isValidCustomTagName(query)) {
      void handleCreateFromQuery();
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (exactMatch) {
        selectTag(exactMatch.id);
        return;
      }
      if (filtered.length === 1 && !canCreate) {
        selectTag(filtered[0]!.id);
        return;
      }
      if (isValidCustomTagName(query)) {
        void handleCreateFromQuery();
      }
      return;
    }

    if (event.key === "Backspace" && query.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function openEdit(option: VocabularyTagOption) {
    setEditingTag(getCustomTagName(option.id));
    setEditName(getCustomTagName(option.id));
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editingTag) return;
    const nextName = editName.trim();
    if (!isValidCustomTagName(nextName)) {
      setEditError(tSettings("tagNameRequired"));
      return;
    }

    const duplicate = findCustomTagName(customTags, nextName);
    if (duplicate && duplicate.toLowerCase() !== editingTag.toLowerCase()) {
      setEditError(tSettings("tagExists"));
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await updateActiveWorkspaceTag(editingTag, nextName);
      const fromKey = customTagKey(editingTag);
      const toKey = customTagKey(updated.name);
      onCustomTagsChange(
        uniqueCustomTagNames(
          customTags.map((name) =>
            name.toLowerCase() === editingTag.toLowerCase() ? updated.name : name,
          ),
        ),
      );
      onChange(replaceSelectedTag(value, fromKey, toKey));
      toast.success(tSettings("tagUpdated"));
      setEditingTag(null);
    } catch (error) {
      if (error instanceof Error && error.message === "TAG_EXISTS") {
        setEditError(tSettings("tagExists"));
        return;
      }
      toast.error(tErrors("generic"));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTag) return;
    setIsDeleting(true);
    try {
      await deleteActiveWorkspaceTag(deletingTag);
      const removedKey = customTagKey(deletingTag);
      onCustomTagsChange(
        customTags.filter(
          (name) => name.toLowerCase() !== deletingTag.toLowerCase(),
        ),
      );
      onChange(
        value.filter((tag) => tag.toLowerCase() !== removedKey.toLowerCase()),
      );
      toast.success(tSettings("tagDeleted"));
      setDeletingTag(null);
    } catch {
      toast.error(tErrors("generic"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{tv("tags")}</label>

      <div className="overflow-hidden rounded-lg border border-hairline-cloud bg-card">
        <div className="flex items-start gap-2 px-3 py-2">
          <div
            className="flex min-h-10 min-w-0 flex-1 cursor-text flex-wrap items-center gap-1.5"
            onClick={() => inputRef.current?.focus()}
          >
            {value.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="h-6 gap-0.5 pr-1"
              >
                {getTagLabel(tag, (key) => t(key))}
                <button
                  type="button"
                  className="rounded-sm p-0.5 text-on-primary/70 transition-colors hover:text-on-primary"
                  aria-label={`Remove ${getTagLabel(tag, (key) => t(key))}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setTagChecked(tag, false);
                  }}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={
                value.length === 0 ? tv("searchOrCreateTags") : tv("selectTags")
              }
              className="h-7 min-w-32 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:shadow-none"
              disabled={busy}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1.5 shrink-0"
            onClick={handleAdd}
            disabled={!canSubmitQuery}
          >
            {isCreating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {tv("addCustomTag")}
          </Button>
        </div>

        <div className="border-t border-hairline-cloud">
          <ScrollArea className="h-56">
            <div className="space-y-3 px-3 py-3">
              {canCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 text-ink"
                  onClick={() => void handleCreateFromQuery()}
                  disabled={busy}
                >
                  <Plus className="size-4" />
                  {tv("createTag", { name: query.trim() })}
                </Button>
              ) : null}

              {grouped.length === 0 && !canCreate ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {tv("noMatchingTags")}
                </p>
              ) : (
                grouped.map((item) => (
                  <div key={item.group} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`groups.${item.group}`)}
                    </p>
                    <div className="grid gap-0.5 sm:grid-cols-2">
                      {item.options.map((option) => {
                        const checked = value.includes(option.id);
                        const isCustom = option.group === "custom";
                        return (
                          <div
                            key={option.id}
                            className={cn(
                              "flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60",
                              checked && "bg-accent-lime/10",
                            )}
                          >
                            <label
                              htmlFor={`tag-${option.id}`}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-1 py-1 text-sm"
                            >
                              <input
                                id={`tag-${option.id}`}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTag(option.id)}
                                disabled={busy}
                                className="size-3.5 shrink-0 rounded border-input accent-accent-lime"
                              />
                              <span
                                className={cn(
                                  "truncate",
                                  checked
                                    ? "font-medium text-ink"
                                    : "text-muted-foreground",
                                )}
                              >
                                {optionLabel(option)}
                              </span>
                            </label>
                            {isCustom ? (
                              <div className="flex shrink-0 items-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground"
                                  aria-label={tSettings("renameTag")}
                                  disabled={busy}
                                  onClick={() => openEdit(option)}
                                >
                                  <Pencil />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground hover:text-destructive"
                                  aria-label={tCommon("delete")}
                                  disabled={busy}
                                  onClick={() =>
                                    setDeletingTag(getCustomTagName(option.id))
                                  }
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog
        open={editingTag !== null}
        onOpenChange={(open) => {
          if (isSavingEdit) return;
          if (!open) setEditingTag(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tSettings("editTagTitle")}</DialogTitle>
            <DialogDescription>{tSettings("editTagDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-custom-tag">{tSettings("tagName")}</Label>
            <Input
              id="rename-custom-tag"
              value={editName}
              onChange={(event) => {
                setEditName(event.target.value);
                setEditError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSaveEdit();
                }
              }}
              maxLength={40}
              aria-invalid={editError ? true : undefined}
              disabled={isSavingEdit}
            />
            {editError ? (
              <p className="text-sm text-destructive">{editError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingTag(null)}
              disabled={isSavingEdit}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {tSettings("renameTag")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingTag !== null}
        onOpenChange={(open) => {
          if (isDeleting) return;
          if (!open) setDeletingTag(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tSettings("deleteTagTitle")}</DialogTitle>
            <DialogDescription>
              {tSettings("deleteTagDescription", { name: deletingTag ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTag(null)}
              disabled={isDeleting}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
