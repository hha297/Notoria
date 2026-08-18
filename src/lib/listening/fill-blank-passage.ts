export function formatFillBlankSegment(input: {
  speaker?: string | null;
  sentenceWithBlanks: string;
}) {
  const text = input.sentenceWithBlanks.replace(/\s+$/g, "").replace(/^\s+/, "");
  const speaker = input.speaker?.trim();
  return speaker ? `${speaker}: ${text}` : text;
}

function joinFillBlankSegments(segments: string[]) {
  if (segments.some((segment) => segment.includes("\n"))) {
    return segments.join("\n\n");
  }
  return segments.join(" ");
}

export function mergeFillBlankQuestions(
  questions: Array<{
    speaker?: string | null;
    sentenceWithBlanks: string;
    blanks: string[];
  }>,
) {
  if (questions.length === 0) {
    return null;
  }

  if (questions.length === 1) {
    const question = questions[0]!;
    return {
      sentenceWithBlanks: question.sentenceWithBlanks,
      blanks: question.blanks,
      speaker: question.speaker?.trim() || undefined,
    };
  }

  return {
    sentenceWithBlanks: joinFillBlankSegments(
      questions.map((question) => formatFillBlankSegment(question)),
    ),
    blanks: questions.flatMap((question) => question.blanks),
    speaker: undefined,
  };
}
