"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { composerStyles } from "@/components/vocabulary/vocabulary-composer";
import { mx } from "@/lib/css-module";
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
  listBuiltinTagOptions,
  listCustomTagOptions,
  TAG_PICKER_GROUPS,
  uniqueCustomTagNames,
  type VocabularyTagOption,
} from "@/lib/vocabulary-tags";

export { getTagLabel };

type TagMultiSelectProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  customTags: string[];
  onCustomTagsChange: (tags: string[]) => void;
};

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
    getCustomTagName(option.id).toLowerCase().includes(q)
  );
}

function findExactCustomMatch(
  options: VocabularyTagOption[],
  query: string,
  getLabel: (option: VocabularyTagOption) => string,
): VocabularyTagOption | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  return options.find((option) => {
    const label = getLabel(option).toLowerCase();
    return (
      label === q ||
      option.id.toLowerCase() === q ||
      getCustomTagName(option.id).toLowerCase() === q
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

  const builtinGroups = useMemo(() => {
    const options = listBuiltinTagOptions();
    return TAG_PICKER_GROUPS.map((group) => ({
      group,
      options: options.filter((option) => option.group === group),
    })).filter((item) => item.options.length > 0);
  }, []);

  const customOptions = useMemo(
    () => listCustomTagOptions(customTags),
    [customTags],
  );

  const filteredCustom = useMemo(() => {
    return customOptions.filter((option) =>
      tagMatchesQuery(option, query, optionLabel(option)),
    );
  }, [customOptions, query, t]);

  const exactMatch = findExactCustomMatch(customOptions, query, optionLabel);
  const canCreate = isValidCustomTagName(query) && !exactMatch && !busy;
  const canSubmitQuery =
    Boolean(query.trim()) && !busy && (canCreate || Boolean(exactMatch));

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
      if (filteredCustom.length === 1 && !canCreate) {
        selectTag(filteredCustom[0]!.id);
        return;
      }
      if (isValidCustomTagName(query)) {
        void handleCreateFromQuery();
      }
      return;
    }

    if (event.key === "Backspace" && query.length === 0) {
      const lastCustom = [...value].reverse().find((tag) => isCustomTagKey(tag));
      if (lastCustom) {
        onChange(value.filter((tag) => tag !== lastCustom));
      }
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

  const selectedCustom = value.filter((tag) => isCustomTagKey(tag));

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Label
          className={mx(
            composerStyles,
            "vocab-composer-kicker text-[0.68rem] font-semibold tracking-[0.18em] uppercase",
          )}
        >
          {tv("tags")}
        </Label>
        <div className={mx(composerStyles, "vocab-chip-board")}>
          <div
            className={mx(
              composerStyles,
              "vocab-composer-panel space-y-3.5 p-3.5",
            )}
          >
            {builtinGroups.map((item) => (
              <div key={item.group} className={mx(composerStyles, "vocab-chip-group")}>
                <p
                  className={mx(
                    composerStyles,
                    "vocab-composer-kicker text-[0.62rem] font-semibold tracking-[0.16em] uppercase opacity-80",
                  )}
                >
                  {t(`groups.${item.group}`)}
                </p>
                <div className={mx(composerStyles, "vocab-chip-row")}>
                  {item.options.map((option) => {
                    const checked = value.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        id={`tag-${option.id}`}
                        data-active={checked}
                        disabled={busy}
                        className={mx(composerStyles, "vocab-chip")}
                        onClick={() => toggleTag(option.id)}
                      >
                        {optionLabel(option)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label
          htmlFor="custom-tags-search"
          className={mx(
            composerStyles,
            "vocab-composer-kicker text-[0.68rem] font-semibold tracking-[0.18em] uppercase",
          )}
        >
          {t("groups.custom")}{" "}
          <span className="font-normal tracking-normal text-muted-foreground normal-case">
            ({tCommon("optional")})
          </span>
        </Label>

        {selectedCustom.length > 0 ? (
          <div className={mx(composerStyles, "vocab-chip-row")}>
            {selectedCustom.map((tag) => (
              <span
                key={tag}
                data-active="true"
                className={mx(composerStyles, "vocab-chip")}
              >
                {getTagLabel(tag, (key) => t(key))}
                <button
                  type="button"
                  className={mx(composerStyles, "vocab-chip-remove")}
                  aria-label={`Remove ${getTagLabel(tag, (key) => t(key))}`}
                  disabled={busy}
                  onClick={() => setTagChecked(tag, false)}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className={mx(composerStyles, "vocab-search-shell")}>
          <Input
            id="custom-tags-search"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={tv("searchOrCreateTags")}
            className={mx(
              composerStyles,
              "vocab-composer-field vocab-search-field h-11!",
            )}
            disabled={busy}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={mx(composerStyles, "vocab-composer-add h-11 shrink-0")}
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

        <div className={mx(composerStyles, "vocab-suggest")}>
          {canCreate ? (
            <button
              type="button"
              className={mx(composerStyles, "vocab-suggest-item")}
              onClick={() => void handleCreateFromQuery()}
              disabled={busy}
            >
              <Plus className="size-4 shrink-0 text-(--composer-accent)" />
              <span className={mx(composerStyles, "vocab-suggest-title")}>
                {tv("createTag", { name: query.trim() })}
              </span>
            </button>
          ) : null}

          {filteredCustom.length === 0 && !canCreate ? (
            <p className={mx(composerStyles, "vocab-suggest-empty")}>
              {customOptions.length === 0
                ? tSettings("noCustomTags")
                : tv("noMatchingTags")}
            </p>
          ) : (
            filteredCustom.map((option) => {
              const checked = value.includes(option.id);
              return (
                <div
                  key={option.id}
                  data-active={checked}
                  className={mx(composerStyles, "vocab-suggest-item")}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center text-left"
                    onClick={() => toggleTag(option.id)}
                    disabled={busy}
                  >
                    <span className={mx(composerStyles, "vocab-suggest-title")}>
                      {optionLabel(option)}
                    </span>
                  </button>
                  <div className={mx(composerStyles, "vocab-suggest-actions")}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className={mx(
                        composerStyles,
                        "vocab-suggest-action",
                      )}
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
                      className={mx(
                        composerStyles,
                        "vocab-suggest-action vocab-suggest-action-danger",
                      )}
                      aria-label={tCommon("delete")}
                      disabled={busy}
                      onClick={() =>
                        setDeletingTag(getCustomTagName(option.id))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
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
              className={mx(composerStyles, "vocab-composer-field")}
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
