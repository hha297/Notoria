"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { MatchPairItem } from "@/lib/exercises/match-pairs";
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
  onWordClick,
  onMeaningClick,
}: MatchPairsStageProps) {
  const t = useTranslations("exercises.matchPairs");
  const tType = useTranslations("exercises.types.match-pairs");
  const reduceMotion = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const waiting = Boolean(selectedWordId);
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

        <div
          ref={boardRef}
          className="relative mt-8 grid grid-cols-1 gap-8 md:mt-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-0"
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
      <p className="mb-3 text-[0.68rem] font-semibold tracking-[0.18em] text-(--exercise-accent) uppercase md:mb-4">
        {title}
      </p>
      <div role="group" aria-label={title} className="flex flex-col gap-2">
        {children}
      </div>
    </section>
  );
}

function BoardGutter({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="relative z-0 flex items-center px-1 py-1 md:items-stretch md:px-5 md:py-0 lg:px-8"
    >
      <div className="relative flex h-px w-full flex-row items-center md:h-auto md:w-px md:flex-1 md:flex-col">
        <span
          className={cn(
            "h-px flex-1 bg-linear-to-r from-transparent via-hairline-cloud to-hairline-cloud md:h-auto md:w-px md:bg-linear-to-b md:from-hairline-cloud md:via-hairline-cloud md:to-transparent",
            active && "via-(--exercise-accent)/55 md:via-(--exercise-accent)/55",
          )}
        />
        <span
          className={cn(
            "mx-3 size-1.5 rotate-45 border border-hairline-cloud bg-surface-elevated transition-colors duration-200 md:mx-0 md:my-3",
            active && "border-(--exercise-accent) bg-(--exercise-accent)",
          )}
        />
        <span
          className={cn(
            "h-px flex-1 bg-linear-to-r from-hairline-cloud via-hairline-cloud to-transparent md:h-auto md:w-px md:bg-linear-to-b md:from-transparent md:via-hairline-cloud md:to-hairline-cloud",
            active && "via-(--exercise-accent)/55 md:via-(--exercise-accent)/55",
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
  const sideBySide =
    Math.abs(wordMid.x - meaningMid.x) > Math.abs(wordMid.y - meaningMid.y);

  if (sideBySide) {
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

  const wordOnTop = wordMid.y < meaningMid.y;
  const start = {
    x: wordMid.x,
    y: wordOnTop ? word.bottom - board.top : word.top - board.top,
  };
  const end = {
    x: meaningMid.x,
    y: wordOnTop ? meaning.top - board.top : meaning.bottom - board.top,
  };
  const pull = Math.max(22, Math.abs(end.y - start.y) * 0.38);
  const dir = start.y < end.y ? 1 : -1;
  return {
    start,
    end,
    d: `M ${start.x} ${start.y} C ${start.x} ${start.y + pull * dir}, ${end.x} ${end.y - pull * dir}, ${end.x} ${end.y}`,
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

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) {
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
  }, [boardRef, matchedOrder]);

  useLayoutEffect(() => {
    measure();
    const board = boardRef.current;
    if (!board) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(board);
    board.querySelectorAll("[data-match-tile]").forEach((node) => {
      observer.observe(node);
    });
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [boardRef, matchedOrder, measure]);

  if (lines.length === 0) return null;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
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
            animate={{ pathLength: 1, opacity: 0.9 }}
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
  pairNumber: number | null;
  pairColor: string | null;
  reduceMotion: boolean;
  onClick: () => void;
}) {
  const mark =
    pairNumber != null ? String(pairNumber).padStart(2, "0") : null;
  const idleMeaning = side === "meaning" && !waiting && !matched && !wrong;

  return (
    <motion.button
      type="button"
      disabled={matched}
      onClick={onClick}
      aria-pressed={selected}
      aria-disabled={matched}
      data-match-tile={side}
      data-word-id={wordId}
      whileHover={reduceMotion || matched ? undefined : { y: -1 }}
      whileTap={reduceMotion || matched ? undefined : { scale: 0.985 }}
      animate={
        reduceMotion
          ? undefined
          : {
              opacity: matched ? 0.82 : idleMeaning ? 0.72 : 1,
            }
      }
      transition={{ duration: 0.16 }}
      className={cn(
        "relative flex min-h-14 w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden border px-3.5 py-3 text-left",
        "sm:min-h-14 sm:px-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-default",
        !matched &&
          !selected &&
          !wrong &&
          !pairing &&
          "border-hairline-cloud bg-surface-elevated shadow-sm shadow-ink/4 hover:border-(--exercise-accent)/50 hover:bg-(--exercise-accent-soft)/55",
        pairing &&
          !wrong &&
          "border-(--exercise-accent)/45 bg-surface-elevated shadow-sm shadow-ink/4 hover:border-(--exercise-accent) hover:bg-(--exercise-accent-soft)/80",
        selected &&
          !wrong &&
          "border-(--exercise-accent) bg-(--exercise-accent-soft) shadow-sm",
        matched && "bg-surface-elevated text-muted-foreground",
        wrong && !reduceMotion && "feedback-error exercise-shake",
        wrong && reduceMotion && "feedback-error",
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
          side === "word" ? "left-0 md:right-0 md:left-auto" : "left-0",
          selected && !wrong && "bg-(--exercise-accent)",
          pairing && !wrong && "bg-(--exercise-accent)/55",
          wrong && "bg-error",
          !selected && !pairing && !matched && !wrong && "bg-transparent",
        )}
        style={matched && pairColor ? { backgroundColor: pairColor } : undefined}
      />

      {mark ? (
        <span
          className={cn(
            "font-mono text-[0.65rem] tracking-[0.16em] tabular-nums",
            side === "word" && "md:order-2 md:ml-auto",
          )}
          style={pairColor ? { color: pairColor } : undefined}
        >
          {mark}
        </span>
      ) : null}

      <span
        className={cn(
          "min-w-0 flex-1 font-heading text-[0.98rem] leading-snug font-semibold tracking-tight wrap-anywhere sm:text-[1.05rem]",
          matched && "font-medium",
          side === "word" && mark && "md:order-1",
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}
