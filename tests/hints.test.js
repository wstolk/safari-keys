import { describe, expect, it } from "vitest";
import { generateHintLabels, filterHints, pickHint } from "../extension/src/hints.js";

describe("generateHintLabels", () => {
  it("returns an empty list for zero targets", () => {
    expect(generateHintLabels(0, "sadfjkl")).toEqual([]);
  });

  it("uses single characters when there are few enough targets", () => {
    expect(generateHintLabels(3, "sad")).toEqual(["s", "a", "d"]);
  });

  it("uses uniform codes of the shortest length that can cover the count", () => {
    const two = generateHintLabels(4, "ab");
    expect(two).toHaveLength(4);
    expect(two.every((label) => label.length === 2)).toBe(true);

    const three = generateHintLabels(5, "ab");
    expect(three).toHaveLength(5);
    expect(new Set(three).size).toBe(5);
    expect(three.every((label) => label.length === 3)).toBe(true);
  });

  it("never repeats a label", () => {
    const labels = generateHintLabels(40, "sadfjklewcmpgh");
    expect(new Set(labels).size).toBe(40);
  });
});

describe("filterHints", () => {
  const labels = ["s", "sa", "ad", "f"];

  it("returns all labels when nothing has been typed", () => {
    expect(filterHints(labels, "")).toEqual(labels);
  });

  it("keeps labels that start with the typed prefix", () => {
    expect(filterHints(labels, "s")).toEqual(["s", "sa"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterHints(labels, "z")).toEqual([]);
  });
});

describe("pickHint", () => {
  it("returns the unique exact match", () => {
    expect(pickHint(["s", "sa"], "s")).toBe("s");
  });

  it("returns the only remaining prefix match when it is unique", () => {
    expect(pickHint(["sa", "ad"], "s")).toBe("sa");
  });

  it("returns null when more than one label still matches", () => {
    expect(pickHint(["s", "sa"], "")).toBe(null);
  });
});
