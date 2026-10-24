"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
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
import {
  dismissSearchPanel,
  shouldApplyPendingEnterNavigation,
} from "@/lib/search/panel-state";
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
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const [searchShortcutLabel, setSearchShortcutLabel] = useState("Ctrl + K");
  const pendingEnter = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

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

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  function closeSearch() {
    const next = dismissSearchPanel({
      open: openRef.current,
      pendingEnter: pendingEnter.current,
    });
    pendingEnter.current = next.pendingEnter;
    setOpen(next.open);
    if (!value.trim()) setMobileExpanded(false);
    if (document.activeElement === inputRef.current) {
      inputRef.current?.blur();
    }
  }

  /** Mobile: leave expanded search and restore Menu · Search · Workspace. */
  function dismissMobileSearch() {
    pendingEnter.current = false;
    setValue("");
    setDebounced("");
    setOpen(false);
    setMobileExpanded(false);
    if (document.activeElement === inputRef.current) {
      inputRef.current?.blur();
    }
  }

  const showMobileTrigger =
    compact && !mobileExpanded && !value.trim() && !open;

  function openResult(result: SearchResult) {
    closeSearch();
    setMobileExpanded(false);
    router.push(result.href);
  }

  useEffect(() => {
    if (!pendingEnter.current || isFetching || results.length === 0) return;
    if (!shouldApplyPendingEnterNavigation(openRef.current)) {
      pendingEnter.current = false;
      return;
    }
    const selected = results[activeIndex] ?? results[0];
    pendingEnter.current = false;
    if (selected) openResult(selected);
    // openResult closes via controlled state; omit from deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [activeIndex, isFetching, results]);

  // Belt-and-suspenders: close the panel after client navigations.
  useEffect(() => {
    if (openRef.current) {
      closeSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname-driven dismiss
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) return;
      if (!root.contains(event.target)) {
        closeSearch();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useAppShortcut(
    "openSearch",
    () => {
      setMobileExpanded(true);
      setOpen(true);
      window.requestAnimationFrame(() => inputRef.current?.focus());
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

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      pendingEnter.current = false;
      if (compact && mobileExpanded) {
        dismissMobileSearch();
        return;
      }
      if (value) {
        setValue("");
        setDebounced("");
        return;
      }
      closeSearch();
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

  const mobileSearchActive = compact && mobileExpanded;

  return (
    <div
      ref={rootRef}
      data-mobile-search={mobileSearchActive ? "" : undefined}
      className={cn(
        "relative min-w-0",
        "max-sm:transition-[flex-grow,flex-basis,width,max-width,opacity] max-sm:duration-300 max-sm:ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        /* Collapsed mobile: icon only. Expanded / desktop: fill remaining chrome. */
        showMobileTrigger
          ? "w-9 shrink-0 sm:w-full sm:flex-1 sm:basis-0"
          : "w-full min-w-0 flex-1 basis-0 sm:flex-none",
      )}
    >
      {showMobileTrigger ? (
        <button
          type="button"
          className="studio-chrome-control control-surface inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-page-accent-border text-muted-foreground sm:hidden"
          aria-label={t("placeholder")}
          onClick={() => {
            setMobileExpanded(true);
            setOpen(true);
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <Search className="size-4" />
        </button>
      ) : null}

      <div
        className={cn(
          "relative w-full",
          showMobileTrigger && "hidden sm:block",
          !showMobileTrigger &&
            compact &&
            "max-sm:animate-in max-sm:fade-in-0 max-sm:duration-300 motion-reduce:animate-none",
        )}
      >
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
            mobileSearchActive ? "left-2.5" : "left-3",
          )}
        />
        <Input
          ref={inputRef}
          value={value}
          enterKeyHint="search"
          onChange={(event) => {
            pendingEnter.current = false;
            setValue(event.target.value);
            setOpen(true);
            setMobileExpanded(true);
          }}
          onFocus={() => {
            setOpen(true);
            setMobileExpanded(true);
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
            "control-surface w-full rounded-md border-page-accent-border shadow-none",
            mobileSearchActive ? "pl-9 pr-10" : "pl-10 pr-20",
            compact
              ? "studio-chrome-control h-9 sm:h-10"
              : "h-10",
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 flex -translate-y-1/2 items-center gap-1",
            mobileSearchActive ? "right-1.5" : "right-2 sm:right-3 sm:gap-1.5",
          )}
        >
          {mobileSearchActive ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={dismissMobileSearch}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors btn-ghost-surface sm:hidden"
              aria-label={t("clear")}
            >
              <X className="size-4" />
            </button>
          ) : null}
          {value ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setValue("");
                setDebounced("");
                inputRef.current?.focus();
              }}
              className={cn(
                "rounded-md p-1 text-muted-foreground transition-colors btn-ghost-surface",
                mobileSearchActive && "max-sm:hidden",
              )}
              aria-label={t("clear")}
            >
              <X className="size-4" />
            </button>
          ) : null}
          {isFetching && query ? (
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <kbd className="control-surface hidden rounded-md border border-page-accent-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-block">
              {searchShortcutLabel}
            </kbd>
          )}
        </div>
      </div>

      {showPanel ? (
        <div
          className="menu-surface absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-page-accent-border shadow-[0_1px_2px_rgba(35,37,29,0.06)]"
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
                        active
                          ? "menu-item-surface"
                          : "hover:bg-[image:var(--menu-item-hover)]",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => closeSearch()}
                    >
                      <span className="control-surface mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          <HighlightedText text={result.title} query={query} />
                        </span>
                        <span className="control-surface mt-0.5 inline-flex max-w-full truncate rounded-full px-2 py-px text-[11px] font-medium text-muted-foreground">
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
