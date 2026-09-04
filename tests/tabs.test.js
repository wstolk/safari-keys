import { describe, expect, it } from "vitest";
import { nextTabIndex, collectClosedTab, restoreClosedTab } from "../extension/src/tabs.js";

describe("nextTabIndex", () => {
  const tabs = [
    { id: 1, index: 0 },
    { id: 2, index: 1 },
    { id: 3, index: 2 },
  ];

  it("moves left and wraps", () => {
    expect(nextTabIndex(tabs, 1, -1)).toBe(0);
    expect(nextTabIndex(tabs, 0, -1)).toBe(2);
  });

  it("moves right and wraps", () => {
    expect(nextTabIndex(tabs, 2, 1)).toBe(0);
    expect(nextTabIndex(tabs, 0, 1)).toBe(1);
  });

  it("honors a count", () => {
    expect(nextTabIndex(tabs, 0, 2)).toBe(2);
  });
});

describe("closed tab stack", () => {
  it("restores the most recently closed tab first", () => {
    let stack = [];
    stack = collectClosedTab(stack, { url: "https://a.example", title: "A" });
    stack = collectClosedTab(stack, { url: "https://b.example", title: "B" });
    const first = restoreClosedTab(stack);
    expect(first.tab.url).toBe("https://b.example");
    const second = restoreClosedTab(first.stack);
    expect(second.tab.url).toBe("https://a.example");
    expect(restoreClosedTab(second.stack).tab).toBe(null);
  });

  it("caps the stack at 50", () => {
    let stack = [];
    for (let i = 0; i < 60; i++) {
      stack = collectClosedTab(stack, { url: `https://x.example/${i}` });
    }
    expect(stack).toHaveLength(50);
    expect(stack[0].url).toBe("https://x.example/10");
  });
});
