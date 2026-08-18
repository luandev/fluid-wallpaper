import { createItemId } from "../app/config";

export type NamedItem = {
  id: string;
  name: string;
};

export function copyName(name: string, existing: ReadonlyArray<{ name: string }>): string {
  const used = new Set(existing.map((item) => item.name));
  const base = name.replace(/\s+copy(?:\s+\d+)?$/i, "").trim() || "Item";
  const clipped = base.slice(0, 24);
  let candidate = `${clipped} copy`.slice(0, 32);
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${clipped} copy ${n}`.slice(0, 32);
    n += 1;
  }
  return candidate;
}

export function duplicateById<T extends NamedItem>(
  items: readonly T[],
  id: string,
  prefix: string,
  cap: number,
): { items: T[]; copy: T } | undefined {
  if (items.length >= cap) {
    return undefined;
  }
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) {
    return undefined;
  }
  const source = items[index];
  const copy = {
    ...source,
    id: createItemId(prefix),
    name: copyName(source.name, items),
  };
  return {
    copy,
    items: [...items.slice(0, index + 1), copy, ...items.slice(index + 1)],
  };
}
