export function normalizeUniqueName(value: string) {
  return value.trim().toLowerCase();
}

export function isUniqueNameTaken(
  candidate: string,
  occupied: Iterable<string>,
) {
  const key = normalizeUniqueName(candidate);
  if (!key) return false;
  for (const name of occupied) {
    if (normalizeUniqueName(name) === key) return true;
  }
  return false;
}

export function nextAvailableName(
  base: string,
  occupied: Iterable<string>,
) {
  const trimmed = base.trim();
  if (!trimmed) return base;
  if (!isUniqueNameTaken(trimmed, occupied)) return trimmed;

  let n = 2;
  while (isUniqueNameTaken(`${trimmed} ${n}`, occupied)) {
    n += 1;
  }
  return `${trimmed} ${n}`;
}
