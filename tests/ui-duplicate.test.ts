import { describe, expect, it } from "vitest";
import { duplicateById } from "../src/ui/duplicateItem";

describe("duplicateById", () => {
  it("inserts a copy with a new id and name after the source", () => {
    const items = [
      { id: "a", name: "Crimson", value: 1 },
      { id: "b", name: "Charcoal", value: 2 },
    ];
    const next = duplicateById(items, "a", "mat", 4);
    expect(next).toBeDefined();
    expect(next?.items).toHaveLength(3);
    expect(next?.copy.id).not.toBe("a");
    expect(next?.copy.name).toBe("Crimson copy");
    expect(next?.copy.value).toBe(1);
    expect(next?.items.map((item) => item.name)).toEqual(["Crimson", "Crimson copy", "Charcoal"]);
  });

  it("rejects when at cap or the id is missing", () => {
    const items = [
      { id: "a", name: "One" },
      { id: "b", name: "Two" },
    ];
    expect(duplicateById(items, "a", "mat", 2)).toBeUndefined();
    expect(duplicateById(items, "missing", "mat", 8)).toBeUndefined();
  });
});
