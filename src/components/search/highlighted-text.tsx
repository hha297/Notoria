import { splitHighlight } from "@/lib/search/snippet";
import { cn } from "@/lib/utils";

type HighlightedTextProps = {
  text: string;
  query: string;
  className?: string;
};

export function HighlightedText({ text, query, className }: HighlightedTextProps) {
  const parts = splitHighlight(text, query);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={`${part.text}-${index}`}
            className="rounded-[2px] bg-accent-lime/70 px-0.5 text-ink"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}
