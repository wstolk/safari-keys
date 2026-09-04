import { describe, expect, it } from "vitest";
import { isExcluded, defaultSettings, normalizeSettings } from "../extension/src/settings.js";
import { scrollDelta } from "../extension/src/scroll.js";

describe("isExcluded", () => {
  it("matches an exact host", () => {
    expect(isExcluded("github.com", ["github.com"])).toBe(true);
  });

  it("matches a subdomain of an excluded host", () => {
    expect(isExcluded("gist.github.com", ["github.com"])).toBe(true);
  });

  it("does not match a different host that merely shares a suffix string", () => {
    expect(isExcluded("notgithub.com", ["github.com"])).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isExcluded("GitHub.com", ["github.com"])).toBe(true);
  });
});

describe("normalizeSettings", () => {
  it("fills in defaults for missing fields", () => {
    const settings = normalizeSettings({});
    expect(settings.hintCharacters).toBe(defaultSettings.hintCharacters);
    expect(settings.scrollStep).toBe(defaultSettings.scrollStep);
    expect(settings.smoothScroll).toBe(defaultSettings.smoothScroll);
    expect(settings.excludedHosts).toEqual([]);
  });

  it("keeps provided values", () => {
    const settings = normalizeSettings({
      hintCharacters: "abc",
      scrollStep: 40,
      smoothScroll: false,
      excludedHosts: ["example.com"],
    });
    expect(settings.hintCharacters).toBe("abc");
    expect(settings.scrollStep).toBe(40);
    expect(settings.smoothScroll).toBe(false);
    expect(settings.excludedHosts).toEqual(["example.com"]);
  });
});

describe("scrollDelta", () => {
  it("multiplies step by count for line scrolls", () => {
    expect(scrollDelta("down", { scrollStep: 60, pageHeight: 800 }, 3)).toEqual({ x: 0, y: 180 });
    expect(scrollDelta("up", { scrollStep: 60, pageHeight: 800 }, 2)).toEqual({ x: 0, y: -120 });
    expect(scrollDelta("left", { scrollStep: 60, pageHeight: 800 }, 1)).toEqual({ x: -60, y: 0 });
    expect(scrollDelta("right", { scrollStep: 60, pageHeight: 800 }, 1)).toEqual({ x: 60, y: 0 });
  });

  it("scrolls half the page for page commands", () => {
    expect(scrollDelta("pageDown", { scrollStep: 60, pageHeight: 800 }, 1)).toEqual({ x: 0, y: 400 });
    expect(scrollDelta("pageUp", { scrollStep: 60, pageHeight: 800 }, 2)).toEqual({ x: 0, y: -800 });
  });
});
