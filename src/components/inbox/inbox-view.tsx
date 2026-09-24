"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Check, Inbox, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { InboxCaptureDialog } from "@/components/inbox/inbox-capture-dialog";
import { InboxItemActions } from "@/components/inbox/inbox-item-actions";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "@/components/style/inbox/inbox.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export type InboxListItem = {
  id: string;
  content: string;
  note: string | null;
  source: string | null;
  status: "unprocessed" | "processed";
  createdAt: string;
};

type InboxFilter = "unprocessed" | "processed";
type InboxSort = "newest" | "oldest" | "nameAsc" | "nameDesc";

const SORT_OPTIONS: InboxSort[] = [
  "newest",
  "oldest",
  "nameAsc",
  "nameDesc",
];

type InboxViewProps = {
  items: InboxListItem[];
  initialFilter: InboxFilter;
};

export function InboxView({ items, initialFilter }: InboxViewProps) {
  const t = useTranslations("inbox");
  const [filter, setFilter] = useState<InboxFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<InboxSort>("newest");
  const [captureOpen, setCaptureOpen] = useState(false);

  const sortLabel = (value: InboxSort) => {
    switch (value) {
      case "oldest":
        return t("sortOldest");
      case "nameAsc":
        return t("sortNameAsc");
      case "nameDesc":
        return t("sortNameDesc");
      case "newest":
      default:
        return t("sortNewest");
    }
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (item.status !== filter) return false;
      if (!query) return true;
      return (
        item.content.toLowerCase().includes(query) ||
        (item.note?.toLowerCase().includes(query) ?? false) ||
        (item.source?.toLowerCase().includes(query) ?? false)
      );
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "nameAsc":
          return a.content.localeCompare(b.content, undefined, {
            sensitivity: "base",
          });
        case "nameDesc":
          return b.content.localeCompare(a.content, undefined, {
            sensitivity: "base",
          });
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
    return sorted;
  }, [items, filter, search, sort]);

  const tabCounts = useMemo(
    () => ({
      unprocessed: items.filter((item) => item.status === "unprocessed").length,
      processed: items.filter((item) => item.status === "processed").length,
    }),
    [items],
  );

  const emptyBecauseSearch = visible.length === 0 && search.trim().length > 0;

  return (
    <PageShell className={mx(styles, "inbox-shell")}>
      <div
        className={cn(
          "writing-atelier inbox-atelier flex flex-col gap-10 lg:gap-12",
          mx(styles, "inbox-atelier"),
        )}
      >
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
          <div className="writing-hero-actions">
            <ShowTutorialButton section="inbox" autoOpenIfIncomplete />
            <Button
              type="button"
              data-tutorial="inbox-capture"
              onClick={() => setCaptureOpen(true)}
            >
              <Plus className="size-4" />
              {t("capture")}
            </Button>
          </div>
        </header>

        <div
          className={mx(styles, "inbox-toolbar")}
          data-tutorial="inbox-filters"
        >
          <div className={mx(styles, "inbox-tabs")} role="tablist">
            {(
              [
                ["unprocessed", "filterUnprocessed"],
                ["processed", "filterProcessed"],
              ] as const
            ).map(([value, labelKey]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                data-active={filter === value || undefined}
                className={mx(styles, "inbox-tab")}
                onClick={() => setFilter(value)}
              >
                <span>{t(labelKey)}</span>
                <span className={mx(styles, "inbox-tab-count")}>
                  {tabCounts[value]}
                </span>
              </button>
            ))}
          </div>

          <div className={mx(styles, "inbox-tools")}>
            <div
              className={cn(
                "writing-spine-search-wrap",
                mx(styles, "inbox-search"),
              )}
              data-tutorial="inbox-search"
            >
              <Search className="writing-spine-search-icon" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className={cn(
                  "writing-spine-search",
                  mx(styles, "inbox-search-input"),
                )}
                aria-label={t("searchPlaceholder")}
              />
            </div>

            <div className={mx(styles, "inbox-sort")} data-tutorial="inbox-sort">
              <Select
                value={sort}
                onValueChange={(value) => {
                  if (
                    value === "newest" ||
                    value === "oldest" ||
                    value === "nameAsc" ||
                    value === "nameDesc"
                  ) {
                    setSort(value);
                  }
                }}
              >
                <SelectTrigger
                  className={mx(styles, "inbox-sort-trigger")}
                  aria-label={t("sortBy")}
                >
                  <SelectValue>{sortLabel(sort)}</SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  sideOffset={8}
                  className={mx(styles, "inbox-sort-menu")}
                >
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      className={mx(styles, "inbox-sort-option")}
                      data-selected={sort === option || undefined}
                    >
                      <span className={mx(styles, "inbox-sort-option-label")}>
                        {sortLabel(option)}
                      </span>
                      {sort === option ? (
                        <Check
                          className={mx(styles, "inbox-sort-option-check")}
                          aria-hidden
                        />
                      ) : (
                        <span
                          className={mx(styles, "inbox-sort-option-spacer")}
                          aria-hidden
                        />
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <div
            className={mx(styles, "inbox-empty")}
            data-tutorial="inbox-list"
          >
            <span className={mx(styles, "inbox-empty-icon")}>
              <Inbox className="size-5" aria-hidden />
            </span>
            <p className={mx(styles, "inbox-empty-title")}>
              {emptyBecauseSearch
                ? t("noResultsTitle")
                : filter === "unprocessed"
                  ? t("emptyTitle")
                  : t("emptyProcessedTitle")}
            </p>
            <p className={mx(styles, "inbox-empty-body")}>
              {emptyBecauseSearch
                ? t("noResultsDescription")
                : filter === "unprocessed"
                  ? t("emptyDescription")
                  : t("emptyProcessedDescription")}
            </p>
            {!emptyBecauseSearch && filter === "unprocessed" ? (
              <Button type="button" onClick={() => setCaptureOpen(true)}>
                <Plus className="size-4" />
                {t("capture")}
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className={mx(styles, "inbox-list")} data-tutorial="inbox-list">
            {visible.map((item, index) => (
              <li
                key={item.id}
                data-status={item.status}
                className={mx(styles, "inbox-card")}
                data-tutorial={index === 0 ? "inbox-process" : undefined}
              >
                <div className={mx(styles, "inbox-card-row")}>
                  <div className={mx(styles, "inbox-card-body")}>
                    <p className={mx(styles, "inbox-card-title")}>
                      {item.content}
                    </p>
                    {item.note ? (
                      <p className={mx(styles, "inbox-card-note")}>{item.note}</p>
                    ) : null}
                    <div className={mx(styles, "inbox-card-meta")}>
                      <time dateTime={item.createdAt}>
                        {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </time>
                      <span aria-hidden>·</span>
                      <span>
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {item.source ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            {t("sourcePrefix", { source: item.source })}
                          </span>
                        </>
                      ) : null}
                      {item.status === "processed" ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className={mx(styles, "inbox-card-badge")}>
                            {t("statusProcessed")}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <InboxItemActions id={item.id} status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <InboxCaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} />
    </PageShell>
  );
}
