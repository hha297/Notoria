"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Check, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { MatchPairItem } from "@/lib/exercises/match-pairs";
import featureStyles from "@/components/style/exercises/session.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type MeaningTile = {
  wordId: string;
  meaning: string;
};

type MatchPairsStageProps = {
  roundKey: string;
  wordColumn: MatchPairItem[];
  meaningColumn: MeaningTile[];
  selectedWordId: string | null;
  matchedIds: Set<string>;
  wrongId: string | null;
  /** When true, round is finished — tiles stay visible but inactive. */
  roundLocked?: boolean;
  onWordClick: (wordId: string) => void;
  onMeaningClick: (wordId: string) => void;
};

const PAIR_COLORS = [
  "var(--module-vocab-fg)",
  "var(--module-listen-fg)",
  "var(--module-theory-fg)",
  "var(--module-writing-fg)",
  "var(--module-speak-fg)",
  "var(--module-exercise-fg)",
  "color-mix(in oklab, var(--module-vocab-fg) 55%, var(--module-listen-fg))",
  "color-mix(in oklab, var(--module-theory-fg) 55%, var(--module-exercise-fg))",
  "color-mix(in oklab, var(--module-writing-fg) 55%, var(--module-listen-fg))",
  "color-mix(in oklab, var(--success) 70%, var(--module-speak-fg))",
] as const;

function pairAccent(index: number) {
  return PAIR_COLORS[index % PAIR_COLORS.length];
}

export function MatchPairsStage({
  roundKey,
  wordColumn,
  meaningColumn,
  selectedWordId,
  matchedIds,
  wrongId,
  roundLocked = false,
  onWordClick,
  onMeaningClick,
}: MatchPairsStageProps) {
  const t = useTranslations("exercises.matchPairs");
  const tType = useTranslations("exercises.types.match-pairs");
  const reduceMotion = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const waiting = Boolean(selectedWordId) && !roundLocked;
  const matchedOrder = Array.from(matchedIds);
  const pairNumber = (wordId: string) => {
    const index = matchedOrder.indexOf(wordId);
    return index >= 0 ? index + 1 : null;
  };
  const pairColor = (wordId: string) => {
    const index = matchedOrder.indexOf(wordId);
    return index >= 0 ? pairAccent(index) : null;
  };

  return (
    <motion.div
      key={roundKey}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
      }
      className="relative mx-auto w-full min-w-0 max-w-4xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-40 bg-[radial-gradient(ellipse_at_top,var(--exercise-accent-soft),transparent_72%)] opacity-90 dark:opacity-70"
      />

      <div className="relative">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {tType("label")}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t("hint")}
            </p>
          </div>
          <p
            className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground sm:text-sm"
            aria-live="polite"
          >
            {t("progress", {
              matched: matchedIds.size,
              total: wordColumn.length,
            })}
          </p>
        </header>

        {/*
          Mobile + desktop: two columns side by side.
          Connector lines only from md up (hidden on narrow screens).
        */}
        <div
          ref={boardRef}
          className="relative mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3 md:mt-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-0"
        >
          <MatchColumn title={t("words")}>
            {wordColumn.map((item) => (
              <MatchTile
                key={`w-${item.wordId}`}
                wordId={item.wordId}
                label={item.word}
                side="word"
                selected={selectedWordId === item.wordId}
                matched={matchedIds.has(item.wordId)}
                wrong={wrongId !== null && selectedWordId === item.wordId}
                pairing={false}
                waiting={false}
                locked={roundLocked}
                pairNumber={pairNumber(item.wordId)}
                pairColor={pairColor(item.wordId)}
                reduceMotion={Boolean(reduceMotion)}
                onClick={() => onWordClick(item.wordId)}
              />
            ))}
          </MatchColumn>

          <BoardGutter active={waiting} />

          <MatchColumn title={t("meanings")}>
            {meaningColumn.map((item) => (
              <MatchTile
                key={`m-${item.wordId}-${item.meaning}`}
                wordId={item.wordId}
                label={item.meaning}
                side="meaning"
                selected={false}
                matched={matchedIds.has(item.wordId)}
                wrong={wrongId === item.wordId}
                pairing={waiting && !matchedIds.has(item.wordId)}
                waiting={waiting}
                locked={roundLocked}
                pairNumber={pairNumber(item.wordId)}
                pairColor={pairColor(item.wordId)}
                reduceMotion={Boolean(reduceMotion)}
                onClick={() => onMeaningClick(item.wordId)}
              />
            ))}
          </MatchColumn>

          <MatchPairLines
            boardRef={boardRef}
            matchedOrder={matchedOrder}
            reduceMotion={Boolean(reduceMotion)}
          />
        </div>
      </div>
    </motion.div>
  );
}

function MatchColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="relative z-20 min-w-0">
      <p className="mb-2 text-[0.62rem] font-semibold tracking-[0.16em] text-(--exercise-accent) uppercase sm:mb-3 sm:text-[0.68rem] sm:tracking-[0.18em] md:mb-4">
        {title}
      </p>
      <div role="group" aria-label={title} className="flex flex-col gap-1.5 sm:gap-2">
        {children}
      </div>
    </section>
  );
}

function BoardGutter({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="relative z-0 hidden items-stretch px-5 py-0 md:flex lg:px-8"
    >
      <div className="relative flex w-px flex-1 flex-col items-center">
        <span
          className={cn(
            "w-px flex-1 bg-linear-to-b from-hairline-cloud via-hairline-cloud to-transparent",
            active && "via-(--exercise-accent)/55",
          )}
        />
        <span
          className={cn(
            "my-3 size-1.5 rotate-45 border border-hairline-cloud bg-surface-elevated transition-colors duration-200",
            active && "border-(--exercise-accent) bg-(--exercise-accent)",
          )}
        />
        <span
          className={cn(
            "w-px flex-1 bg-linear-to-b from-transparent via-hairline-cloud to-hairline-cloud",
            active && "via-(--exercise-accent)/55",
          )}
        />
      </div>
    </div>
  );
}

type Connector = {
  id: string;
  d: string;
  color: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

function connectorPath(
  word: DOMRect,
  meaning: DOMRect,
  board: DOMRect,
): { d: string; start: { x: number; y: number }; end: { x: number; y: number } } {
  const wordMid = {
    x: word.left - board.left + word.width / 2,
    y: word.top - board.top + word.height / 2,
  };
  const meaningMid = {
    x: meaning.left - board.left + meaning.width / 2,
    y: meaning.top - board.top + meaning.height / 2,
  };

  // Desktop is always side-by-side; attach to facing edges so lines never
  // cross through card text.
  const wordOnLeft = wordMid.x < meaningMid.x;
  const start = {
    x: wordOnLeft ? word.right - board.left : word.left - board.left,
    y: wordMid.y,
  };
  const end = {
    x: wordOnLeft ? meaning.left - board.left : meaning.right - board.left,
    y: meaningMid.y,
  };
  const pull = Math.max(28, Math.abs(end.x - start.x) * 0.42);
  const dir = start.x < end.x ? 1 : -1;
  return {
    start,
    end,
    d: `M ${start.x} ${start.y} C ${start.x + pull * dir} ${start.y}, ${end.x - pull * dir} ${end.y}, ${end.x} ${end.y}`,
  };
}

function MatchPairLines({
  boardRef,
  matchedOrder,
  reduceMotion,
}: {
  boardRef: RefObject<HTMLDivElement | null>;
  matchedOrder: string[];
  reduceMotion: boolean;
}) {
  const [lines, setLines] = useState<Connector[]>([]);
  const [enabled, setEnabled] = useState(false);

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board || !enabled) {
      setLines([]);
      return;
    }
    const boardBox = board.getBoundingClientRect();
    const next: Connector[] = [];

    for (const [index, wordId] of matchedOrder.entries()) {
      const word = board.querySelector<HTMLElement>(
        `[data-match-tile="word"][data-word-id="${CSS.escape(wordId)}"]`,
      );
      const meaning = board.querySelector<HTMLElement>(
        `[data-match-tile="meaning"][data-word-id="${CSS.escape(wordId)}"]`,
      );
      if (!word || !meaning) continue;
      const path = connectorPath(
        word.getBoundingClientRect(),
        meaning.getBoundingClientRect(),
        boardBox,
      );
      next.push({
        id: wordId,
        color: pairAccent(index),
        ...path,
      });
    }

    setLines(next);
  }, [boardRef, enabled, matchedOrder]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const syncEnabled = () => setEnabled(mq.matches);
    syncEnabled();
    mq.addEventListener("change", syncEnabled);
    return () => mq.removeEventListener("change", syncEnabled);
  }, []);

  useLayoutEffect(() => {
    measure();
    const board = boardRef.current;
    if (!board || !enabled) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(board);
    board.querySelectorAll("[data-match-tile]").forEach((node) => {
      observer.observe(node);
    });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [boardRef, enabled, matchedOrder, measure]);

  if (!enabled || lines.length === 0) return null;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 hidden overflow-visible md:block"
    >
      {lines.map((line) => (
        <g key={line.id}>
          <motion.path
            d={line.d}
            fill="none"
            stroke={line.color}
            strokeWidth={2}
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.85 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
            }
          />
          <circle cx={line.start.x} cy={line.start.y} r={3} fill={line.color} />
          <circle cx={line.end.x} cy={line.end.y} r={3} fill={line.color} />
        </g>
      ))}
    </svg>
  );
}

function MatchTile({
  wordId,
  label,
  side,
  selected,
  matched,
  wrong,
  pairing,
  waiting,
  locked,
  pairNumber,
  pairColor,
  reduceMotion,
  onClick,
}: {
  wordId: string;
  label: string;
  side: "word" | "meaning";
  selected: boolean;
  matched: boolean;
  wrong: boolean;
  pairing: boolean;
  waiting: boolean;
  locked: boolean;
  pairNumber: number | null;
  pairColor: string | null;
  reduceMotion: boolean;
  onClick: () => void;
}) {
  const mark =
    pairNumber != null ? String(pairNumber).padStart(2, "0") : null;
  const idleMeaning = side === "meaning" && !waiting && !matched && !wrong;
  const inactive = matched || locked;

  return (
    <motion.button
      type="button"
      disabled={inactive}
      onClick={onClick}
      aria-pressed={selected}
      aria-disabled={inactive}
      data-match-tile={side}
      data-word-id={wordId}
      whileHover={reduceMotion || inactive ? undefined : { y: -1 }}
      whileTap={reduceMotion || inactive ? undefined : { scale: 0.985 }}
      animate={
        reduceMotion
          ? undefined
          : {
              opacity: matched ? 0.88 : idleMeaning ? 0.78 : 1,
            }
      }
      transition={{ duration: 0.16 }}
      className={cn(
        "relative flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden border px-2.5 py-2.5 text-left sm:min-h-14 sm:gap-3 sm:px-3.5 sm:py-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-default",
        !matched &&
          !selected &&
          !wrong &&
          !pairing &&
          "border-hairline-cloud control-surface shadow-sm shadow-ink/4 hover:border-(--exercise-accent)/50 hover:bg-(--exercise-accent-soft)/55",
        pairing &&
          !wrong &&
          "border-(--exercise-accent)/45 control-surface shadow-sm shadow-ink/4 hover:border-(--exercise-accent) hover:bg-(--exercise-accent-soft)/80",
        selected &&
          !wrong &&
          "border-(--exercise-accent) [background-image:none] bg-[color-mix(in_oklab,var(--exercise-accent)_24%,var(--exercise-accent-soft))] shadow-sm",
        matched && "control-surface text-muted-foreground",
        wrong && !reduceMotion && mx(featureStyles, "feedback-error exercise-shake"),
        wrong && reduceMotion && mx(featureStyles, "feedback-error"),
        idleMeaning && reduceMotion && "opacity-70",
      )}
      style={
        matched && pairColor
          ? { borderColor: pairColor }
          : undefined
      }
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 w-0.75",
          side === "word" ? "left-0" : "left-0",
          selected && !wrong && "bg-(--exercise-accent)",
          pairing && !wrong && "bg-(--exercise-accent)/55",
          wrong && "bg-error",
          !selected && !pairing && !matched && !wrong && "bg-transparent",
        )}
        style={matched && pairColor ? { backgroundColor: pairColor } : undefined}
      />

      {matched ? (
        <span
          className="flex shrink-0 items-center gap-1"
          style={pairColor ? { color: pairColor } : undefined}
        >
          <span
            aria-hidden
            className="flex size-5 items-center justify-center rounded-full"
            style={
              pairColor
                ? {
                    backgroundColor: `color-mix(in oklab, ${pairColor} 18%, transparent)`,
                  }
                : undefined
            }
          >
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
          {mark ? (
            <span className="font-mono text-[0.65rem] leading-none tracking-[0.14em] tabular-nums">
              {mark}
            </span>
          ) : null}
        </span>
      ) : wrong ? (
        <span
          aria-hidden
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-error/15 text-error"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-hairline-cloud",
            selected && "border-(--exercise-accent) bg-(--exercise-accent)/35",
            pairing && "border-(--exercise-accent)/55",
          )}
        />
      )}

      <span
        className={cn(
          "min-w-0 flex-1 font-heading text-[0.9rem] leading-snug font-semibold tracking-tight wrap-anywhere sm:text-[0.98rem] md:text-[1.05rem]",
          matched && "font-medium",
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}
