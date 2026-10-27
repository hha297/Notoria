const EDITABLE_CHARACTER = /[\p{L}\p{N}]/u;
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

export function slotCharacters(value: string) {
  return [...GRAPHEME_SEGMENTER.segment(value.normalize("NFC"))].map(
    ({ segment }) => segment,
  );
}

export function editableAnswerCharacters(value: string) {
  return slotCharacters(value).filter((character) =>
    EDITABLE_CHARACTER.test(character),
  );
}

export function answerSlotLength(value: string) {
  return editableAnswerCharacters(value).length;
}

export function slotAnswers(answers: readonly string[]) {
  const unique = new Map<string, string>();
  for (const answer of answers) {
    const normalized = answer.trim().normalize("NFC");
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, normalized);
  }
  return [...unique.values()].sort(
    (left, right) => answerSlotLength(left) - answerSlotLength(right),
  );
}

export function maximumAnswerSlotLength(answers: readonly string[]) {
  return Math.max(0, ...slotAnswers(answers).map(answerSlotLength));
}

export function isSlotAnswerComplete(
  value: unknown,
  answers: readonly string[],
) {
  if (typeof value !== "string") return false;
  const length = answerSlotLength(value);
  return (
    length > 0 &&
    slotAnswers(answers).some((answer) => answerSlotLength(answer) === length)
  );
}

export function templateForSlotValue(
  value: string,
  answers: readonly string[],
) {
  const candidates = slotAnswers(answers);
  const length = answerSlotLength(value);
  return (
    candidates.find((answer) => answerSlotLength(answer) >= length) ??
    candidates.at(-1) ??
    ""
  );
}

export function formatSlotValue(rawValue: string, answers: readonly string[]) {
  const entered = editableAnswerCharacters(rawValue);
  if (entered.length === 0) return "";
  const maximum = maximumAnswerSlotLength(answers);
  const accepted = entered.slice(0, maximum);
  const template = templateForSlotValue(accepted.join(""), answers);
  let cursor = 0;

  return slotCharacters(template)
    .map((character) => {
      if (!EDITABLE_CHARACTER.test(character)) return character;
      const enteredCharacter = accepted[cursor];
      cursor += 1;
      return enteredCharacter ?? "";
    })
    .join("")
    .trimEnd();
}

export function slotDisplayParts(value: string, answers: readonly string[]) {
  const entered = editableAnswerCharacters(value);
  const template = templateForSlotValue(value, answers);
  let cursor = 0;

  return slotCharacters(template).map((character) => {
    if (!EDITABLE_CHARACTER.test(character)) {
      return { editable: false as const, character, entered: "" };
    }
    const enteredCharacter = entered[cursor] ?? "";
    cursor += 1;
    return { editable: true as const, character: "", entered: enteredCharacter };
  });
}
