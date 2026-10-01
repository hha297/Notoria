"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import styles from "@/components/style/reading/practice.module.css";
import { mx } from "@/lib/css-module";

type ReadingPassageTextProps = {
  body: string;
  className?: string;
};

type SelectionState = {
  text: string;
  sentence: string;
  top: number;
  left: number;
};

export function ReadingPassageText({ body, className }: ReadingPassageTextProps) {
  const t = useTranslations("reading");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  useEffect(() => {
    function clearIfOutside() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null);
      }
    }

    document.addEventListener("selectionchange", clearIfOutside);
    return () => document.removeEventListener("selectionchange", clearIfOutside);
  }, []);

  function handleMouseUp() {
    const root = containerRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null);
      return;
    }

    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (!text || text.length > 80) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const sentence =
      body
        .split(/(?<=[.!?。！？])\s+/)
        .find((part) => part.includes(text))
        ?.trim() ?? text;

    const rect = range.getBoundingClientRect();
    setSelection({
      text: text.split(/\s+/).slice(0, 4).join(" "),
      sentence: sentence.slice(0, 280),
      top: rect.top + window.scrollY - 44,
      left: Math.min(
        Math.max(12, rect.left + window.scrollX + rect.width / 2 - 70),
        window.scrollX + window.innerWidth - 160,
      ),
    });
  }

  function openVocabulary() {
    if (!selection) return;
    const params = new URLSearchParams({
      prefill: selection.text,
      note: selection.sentence,
    });
    setSelection(null);
    router.push(`/vocabulary/new?${params.toString()}`);
  }

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        onMouseUp={handleMouseUp}
        onKeyUp={handleMouseUp}
      >
        <p className={mx(styles, "passageBody")}>{body}</p>
        <p className={mx(styles, "passageHint")}>{t("vocabHint")}</p>
      </div>
      {selection ? (
        <div
          className={mx(styles, "selectionBar")}
          style={{ top: selection.top, left: selection.left }}
        >
          <Button size="sm" variant="secondary" onClick={openVocabulary}>
            <BookPlus className="size-3.5" />
            {t("addToVocabulary")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
