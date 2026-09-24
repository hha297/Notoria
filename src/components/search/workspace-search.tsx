"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Dumbbell,
  Folder,
  Headphones,
  Inbox,
  Languages,
  LoaderCircle,
  PenLine,
  Search,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { HighlightedText } from "@/components/search/highlighted-text";
import { Input } from "@/components/ui/input";
import { useAppShortcut } from "@/hooks/use-app-shortcut";
import { searchWorkspaceContent } from "@/lib/actions/search";
import {
  formatChord,
  getShortcutChord,
  subscribeShortcutsChanged,
} from "@/lib/preferences/shortcuts";
import { queryKeys } from "@/lib/query/keys";
import type { SearchResult, SearchResultType } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<SearchResultType, LucideIcon> = {
  vocabulary: Languages,
  theory: BookOpen,
  writing: PenLine,
  listening: Headphones,
  speaking: Video,
  folder: Folder,
  exercise: Dumbbell,
  inbox: Inbox,
};

const DEBOUNCE_MS = 200;

type WorkspaceSearchProps = {
  workspaceId: string;
  compact?: boolean;
};

export function WorkspaceSearch({ workspaceId, compact = false }: WorkspaceSearchProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const [searchShortcutLabel, setSearchShortcutLabel] = useState("Ctrl + K");

  useEffect(() => {
    setIsMac(/mac/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    function syncLabel() {
      setSearchShortcutLabel(
        formatChord(getShortcutChord("openSearch"), isMac ? "mac" : "other"),
      );
    }
    syncLabel();
    return subscribeShortcutsChanged(syncLabel);
  }, [isMac]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  const query = debounced;
  const { data, isFetching, isError } = useQuery({
    queryKey: queryKeys.search.query(workspaceId, query),
    queryFn: () => searchWorkspaceContent(query),
    enabled: Boolean(workspaceId && query),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const results = useMemo(
    () => (query ? (data ?? []) : []),
    [data, query],
  );

  const pendingEnter = useRef(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  useEffect(() => {
    if (!pendingEnter.current || isFetching || results.length === 0) return;
    const selected = results[activeIndex] ?? results[0];
    pendingEnter.current = false;
    if (selected) router.push(selected.href);
  }, [activeIndex, isFetching, results, router]);

  useAppShortcut(
    "openSearch",
    () => {
      inputRef.current?.focus();
      setOpen(true);
    },
    { enableOnFormTags: true },
  );

  const showPanel = open;
  const showEmptyHint = open && !value.trim();
  const showLoading = Boolean(query) && isFetching && data === undefined;
  const showNoResults =
    Boolean(query) && !isFetching && !isError && results.length === 0;
  const activeId =
    results[activeIndex] != null ? `${listId}-${results[activeIndex]!.id}` : undefined;

  function openResult(result: SearchResult) {
    router.push(result.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      pendingEnter.current = false;
      if (value) {
        event.preventDefault();
        setValue("");
        setDebounced("");
        return;
      }
      inputRef.current?.blur();
      setOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const immediate = value.trim();
      if (!immediate) return;
      pendingEnter.current = true;
      if (immediate !== debounced) {
        setDebounced(immediate);
      }
      const selected = results[activeIndex];
      if (selected && immediate === query && !isFetching) {
        pendingEnter.current = false;
        openResult(selected);
      }
      return;
    }

    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            pendingEnter.current = false;
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          className={cn(
            "rounded-md border-hairline-cloud bg-surface-elevated pr-20 pl-10 shadow-none",
            compact && "h-10",
          )}
        />
        <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5">
          {value ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setValue("");
                setDebounced("");
                inputRef.current?.focus();
              }}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
              aria-label={t("clear")}
            >
              <X className="size-4" />
            </button>
          ) : null}
          {isFetching && query ? (
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <kbd className="hidden rounded-md border border-hairline-cloud bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-block">
              {searchShortcutLabel}
            </kbd>
          )}
        </div>
      </div>

      {showPanel ? (
        <div
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-hairline-cloud bg-popover shadow-[0_1px_2px_rgba(35,37,29,0.06)]"
          onMouseDown={(event) => event.preventDefault()}
        >
          {showEmptyHint ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("emptyHint")}
            </p>
          ) : null}

          {showLoading ? (
            <div className="space-y-3 px-4 py-4" aria-hidden>
              <div className="h-12 animate-pulse rounded-lg bg-muted" />
              <div className="h-12 animate-pulse rounded-lg bg-muted" />
              <div className="h-12 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : null}

          {isError && results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-destructive">{t("failed")}</p>
          ) : null}

          {showNoResults ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("noResults", { query })}
            </p>
          ) : null}

          {results.length > 0 && query ? (
            <ul
              id={listId}
              role="listbox"
              aria-label={t("resultsLabel")}
              className="max-h-[min(28rem,70vh)] overflow-y-auto py-1"
            >
              {results.map((result, index) => {
                const Icon = TYPE_ICONS[result.type];
                const active = index === activeIndex;
                return (
                  <li key={`${result.type}:${result.id}`} role="none">
                    <Link
                      id={`${listId}-${result.id}`}
                      role="option"
                      aria-selected={active}
                      href={result.href}
                      className={cn(
                        "flex gap-3 px-4 py-2.5 transition-colors",
                        active ? "bg-muted/80" : "hover:bg-muted/50",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-ink">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          <HighlightedText text={result.title} query={query} />
                        </span>
                        <span className="mt-0.5 inline-flex max-w-full truncate rounded-full bg-muted px-2 py-px text-[11px] font-medium text-muted-foreground">
                          {result.collection}
                        </span>
                        {result.subtitle ? (
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            <HighlightedText text={result.subtitle} query={query} />
                          </span>
                        ) : null}
                        {result.snippet ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            <HighlightedText text={result.snippet} query={query} />
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
