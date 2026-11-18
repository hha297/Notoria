type ExampleLike = {
  id: string;
  meaningId?: string | null;
  sortOrder: number;
};

function isUnassigned(meaningId: string | null | undefined) {
  return meaningId == null || meaningId === "";
}

/** Replace the example subset for one sense (or unassigned) while keeping others. */
export function replaceExamplesForMeaning<T extends ExampleLike>(
  all: T[],
  meaningId: string | null,
  nextForGroup: T[],
): T[] {
  const others = all.filter((example) =>
    meaningId == null
      ? !isUnassigned(example.meaningId)
      : example.meaningId !== meaningId,
  );

  const stamped = nextForGroup.map((example, index) => ({
    ...example,
    meaningId,
    sortOrder: index,
  }));

  return [...others, ...stamped];
}

export function assignExampleMeaning<T extends ExampleLike>(
  all: T[],
  exampleId: string,
  meaningId: string | null,
): T[] {
  return all.map((example) =>
    example.id === exampleId ? { ...example, meaningId } : example,
  );
}

export function unassignExamplesForMeaning<T extends ExampleLike>(
  all: T[],
  meaningId: string,
): T[] {
  return all.map((example) =>
    example.meaningId === meaningId
      ? { ...example, meaningId: null }
      : example,
  );
}
