"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { crumbDropId, ROOT_DROP_ID } from "@/lib/folders/dnd-ids";
import { folderHref } from "@/lib/folders/paths";
import { buildBreadcrumbs } from "@/lib/folders/tree";
import type { FolderListItem, FolderSection } from "@/lib/folders/types";
import { cn } from "@/lib/utils";

type FolderBreadcrumbsProps = {
  section: FolderSection;
  folders: FolderListItem[];
  currentFolderId: string | null;
};

function Crumb({
  href,
  label,
  dropId,
  current,
}: {
  href: string;
  label: string;
  dropId: string;
  current: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled: current,
    data: { folderId: dropId === ROOT_DROP_ID ? null : dropId.slice("crumb:".length) },
  });

  if (current) {
    return (
      <span className="truncate font-medium text-ink" aria-current="page">
        {label}
      </span>
    );
  }

  return (
    <Link
      ref={setNodeRef}
      href={href}
      className={cn(
        "truncate rounded-md px-1 py-0.5 text-muted-foreground transition-colors hover:text-ink",
        isOver && "bg-accent-lime/30 text-ink",
      )}
    >
      {label}
    </Link>
  );
}

export function FolderBreadcrumbs({
  section,
  folders,
  currentFolderId,
}: FolderBreadcrumbsProps) {
  const t = useTranslations("folders");
  const crumbs = buildBreadcrumbs(folders, currentFolderId);

  if (!currentFolderId) {
    return null;
  }

  return (
    <nav aria-label={t("breadcrumbs")} className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      <Crumb
        href={folderHref(section, null)}
        label={t("root")}
        dropId={ROOT_DROP_ID}
        current={false}
      />
      {crumbs.map((crumb, index) => (
        <span key={crumb.id} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          <Crumb
            href={folderHref(section, crumb.id)}
            label={crumb.name}
            dropId={crumbDropId(crumb.id)}
            current={index === crumbs.length - 1}
          />
        </span>
      ))}
    </nav>
  );
}
