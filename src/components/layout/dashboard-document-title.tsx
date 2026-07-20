"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/** Updates the browser tab title when the dashboard route changes. */
export function DashboardDocumentTitle() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tVocab = useTranslations("vocabulary");
  const tWriting = useTranslations("writing");
  const tExercises = useTranslations("exercises");
  const tFlashcards = useTranslations("flashcards");

  const title = useMemo(() => {
    if (pathname === "/") return tNav("dashboard");
    if (pathname === "/account" || pathname.startsWith("/account/")) {
      return tNav("account");
    }

    if (pathname === "/vocabulary/new") return tVocab("addWord");
    if (/^\/vocabulary\/[^/]+$/.test(pathname)) return tVocab("editWord");
    if (pathname === "/vocabulary" || pathname.startsWith("/vocabulary/")) {
      return tNav("vocabulary");
    }

    if (pathname === "/writing/new") return tWriting("newTitle");
    if (/^\/writing\/[^/]+$/.test(pathname)) return tWriting("editTitle");
    if (pathname === "/writing" || pathname.startsWith("/writing/")) {
      return tNav("writing");
    }

    if (pathname === "/exercises/flashcard") return tFlashcards("title");
    if (pathname === "/exercises/fill-in-blank") {
      return tExercises("types.fill-in-blank.label");
    }
    if (pathname === "/exercises/multiple-choice") {
      return tExercises("types.multiple-choice.label");
    }
    if (pathname === "/exercises/match-pairs") {
      return tExercises("types.match-pairs.label");
    }
    if (pathname === "/exercises/type-answer") {
      return tExercises("types.type-answer.label");
    }
    if (pathname === "/exercises/writing") return tWriting("newTitle");
    if (pathname === "/exercises" || pathname.startsWith("/exercises/")) {
      return tNav("exercises");
    }

    return "Notoria";
  }, [pathname, tExercises, tFlashcards, tNav, tVocab, tWriting]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
