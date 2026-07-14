"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BUILTIN_TAG_GROUPS,
  customTagKey,
  getTagLabel,
  type TagGroupKey,
} from "@/lib/vocabulary-tags";

export { getTagLabel };

type TagMultiSelectProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  sessionCustomTags: string[];
  onSessionCustomTagsChange: (tags: string[]) => void;
};

function TagCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
        checked && "bg-accent-lime/10",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 rounded border-input accent-accent-lime"
      />
      <span className={cn(checked ? "font-medium text-ink" : "text-muted-foreground")}>
        {label}
      </span>
    </label>
  );
}

export function TagMultiSelect({
  value,
  onChange,
  sessionCustomTags,
  onSessionCustomTagsChange,
}: TagMultiSelectProps) {
  const t = useTranslations("tags");
  const tv = useTranslations("vocabulary");
  const [open, setOpen] = useState(true);
  const [newTagName, setNewTagName] = useState("");

  function setTagChecked(tag: string, checked: boolean) {
    if (checked) {
      if (!value.includes(tag)) {
        onChange([...value, tag]);
      }
      return;
    }

    onChange(value.filter((item) => item !== tag));
  }

  function handleAddCustomTag() {
    const name = newTagName.trim();
    if (!name) {
      return;
    }

    const key = customTagKey(name);
    const nextCustomTags = sessionCustomTags.includes(name)
      ? sessionCustomTags
      : [...sessionCustomTags, name].sort((a, b) => a.localeCompare(b));

    onSessionCustomTagsChange(nextCustomTags);

    if (!value.includes(key)) {
      onChange([...value, key]);
    }

    setNewTagName("");
  }

  function renderGroup(group: TagGroupKey) {
    const tags = BUILTIN_TAG_GROUPS[group];

    return (
      <div key={group} className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t(`groups.${group}`)}
        </p>
        <div className="grid gap-0.5 sm:grid-cols-2">
          {tags.map((tag) => (
            <TagCheckbox
              key={tag.id}
              id={`tag-${group}-${tag.id}`}
              label={t(`${group}.${tag.id}`)}
              checked={value.includes(tag.id)}
              onChange={(checked) => setTagChecked(tag.id, checked)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-medium">{tv("tags")}</label>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.map((tag) => (
              <Badge key={tag} variant="secondary">
                {getTagLabel(tag, (key) => t(key))}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline-cloud bg-card">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-muted/40"
        >
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
          {tv("selectTags")}
        </button>

        {open && (
          <div className="space-y-4 border-t border-hairline-cloud px-4 py-4">
            {(
              ["difficulty", "topic", "grammar", "learningStatus"] as TagGroupKey[]
            ).map(renderGroup)}

            {sessionCustomTags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("groups.custom")}
                </p>
                <div className="grid gap-0.5 sm:grid-cols-2">
                  {sessionCustomTags.map((name) => {
                    const key = customTagKey(name);
                    return (
                      <TagCheckbox
                        key={name}
                        id={`tag-custom-${name}`}
                        label={name}
                        checked={value.includes(key)}
                        onChange={(checked) => setTagChecked(key, checked)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 border-t border-hairline-cloud pt-4">
              <Input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder={tv("createCustomTag")}
                className="flex-1"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddCustomTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomTag}
                disabled={!newTagName.trim()}
              >
                <Plus className="size-4" />
                {tv("addCustomTag")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
