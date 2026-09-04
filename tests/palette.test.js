import { describe, expect, it } from "vitest";
import { fuzzyMatch, paletteItems, looksLikeUrl } from "../extension/src/palette.js";

describe("looksLikeUrl", () => {
  it("accepts a host with a dot", () => {
    expect(looksLikeUrl("example.com")).toBe(true);
  });

  it("accepts a full http URL", () => {
    expect(looksLikeUrl("https://example.com/path")).toBe(true);
  });

  it("rejects a plain search phrase", () => {
    expect(looksLikeUrl("how to boil water")).toBe(false);
  });

  it("accepts localhost", () => {
    expect(looksLikeUrl("localhost:3000")).toBe(true);
  });
});

describe("fuzzyMatch", () => {
  const tabs = [
    { id: 1, title: "Inbox — Gmail", url: "https://mail.google.com" },
    { id: 2, title: "Apple Developer", url: "https://developer.apple.com" },
    { id: 3, title: "Safari Keys GitHub", url: "https://github.com/example/safari-keys" },
  ];

  it("ranks a consecutive title match first", () => {
    const ranked = fuzzyMatch("gmail", tabs);
    expect(ranked[0].item.id).toBe(1);
  });

  it("matches characters as a subsequence", () => {
    const ranked = fuzzyMatch("apdev", tabs);
    expect(ranked.some((row) => row.item.id === 2)).toBe(true);
  });

  it("returns all items for an empty query", () => {
    expect(fuzzyMatch("", tabs).map((row) => row.item.id)).toEqual([1, 2, 3]);
  });

  it("drops items that do not match", () => {
    expect(fuzzyMatch("zzzz", tabs)).toEqual([]);
  });
});

describe("paletteItems", () => {
  const tabs = [{ id: 1, title: "Example", url: "https://example.com/" }];

  it("includes open tabs for the open palette", () => {
    const items = paletteItems("exa", tabs, "open");
    expect(items.some((item) => item.kind === "tab" && item.tabId === 1)).toBe(true);
  });

  it("offers to open a typed URL", () => {
    const items = paletteItems("https://apple.com", tabs, "open");
    expect(items.some((item) => item.kind === "url" && item.url === "https://apple.com")).toBe(true);
  });

  it("offers a web search for a non-URL query", () => {
    const items = paletteItems("boiling point", tabs, "open");
    expect(items.some((item) => item.kind === "search")).toBe(true);
  });

  it("only lists tabs in tabs mode", () => {
    const items = paletteItems("exa", tabs, "tabs");
    expect(items.every((item) => item.kind === "tab")).toBe(true);
    expect(items).not.toHaveLength(0);
  });
});
