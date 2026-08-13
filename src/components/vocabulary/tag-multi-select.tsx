"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { createActiveWorkspaceTag } from "@/lib/actions/workspaces";
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

export function TagMultiSelect({
  value,
  onChange,
  customTags,
  onCustomTagsChange,
}: TagMultiSelectProps) {
  const t = useTranslations("tags");
  const tv = useTranslations("vocabulary");
  const tSettings = useTranslations("settings");
  const tErrors = useTranslations("errors");
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
  const canCreate =
    isValidCustomTagName(query) && !exactMatch && !isCreating;

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

      if (!result.created) {
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

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{tv("tags")}</label>

      <div className="overflow-hidden rounded-lg border border-hairline-cloud bg-card">
        <div
          className="flex min-h-10 cursor-text flex-wrap items-center gap-1.5 px-3 py-2"
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
            disabled={isCreating}
          />
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
                  disabled={isCreating}
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
                        return (
                          <label
                            key={option.id}
                            htmlFor={`tag-${option.id}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
                              checked && "bg-accent-lime/10",
                            )}
                          >
                            <input
                              id={`tag-${option.id}`}
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTag(option.id)}
                              className="size-3.5 rounded border-input accent-accent-lime"
                            />
                            <span
                              className={cn(
                                checked
                                  ? "font-medium text-ink"
                                  : "text-muted-foreground",
                              )}
                            >
                              {optionLabel(option)}
                            </span>
                          </label>
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
    </div>
  );
}
