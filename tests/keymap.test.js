import { describe, expect, it } from "vitest";
import {
  createKeyState,
  eventToKey,
  interpretKey,
} from "../extension/src/keymap.js";
import { DEFAULT_MAPPINGS } from "../extension/src/mappings.js";

describe("eventToKey", () => {
  it("maps a lowercase letter to itself", () => {
    expect(eventToKey({ key: "j", ctrlKey: false, metaKey: false, altKey: false })).toBe("j");
  });

  it("keeps shifted letters as their key value", () => {
    expect(eventToKey({ key: "J", ctrlKey: false, metaKey: false, altKey: false })).toBe("J");
  });

  it("treats Ctrl-[ as Escape", () => {
    expect(eventToKey({ key: "[", ctrlKey: true, metaKey: false, altKey: false })).toBe("Escape");
  });

  it("returns Escape for the Escape key", () => {
    expect(eventToKey({ key: "Escape", ctrlKey: false, metaKey: false, altKey: false })).toBe("Escape");
  });

  it("returns null for Command-modified keys so the browser can handle them", () => {
    expect(eventToKey({ key: "r", ctrlKey: false, metaKey: true, altKey: false })).toBe(null);
  });

  it("returns null for Ctrl except Ctrl-[", () => {
    expect(eventToKey({ key: "c", ctrlKey: true, metaKey: false, altKey: false })).toBe(null);
  });

  it("returns null for Alt-modified keys", () => {
    expect(eventToKey({ key: "f", ctrlKey: false, metaKey: false, altKey: true })).toBe(null);
  });
});

describe("interpretKey", () => {
  it("matches a single-key command", () => {
    const result = interpretKey(createKeyState(), "j", DEFAULT_MAPPINGS);
    expect(result.status).toBe("command");
    expect(result.command).toBe("scrollDown");
    expect(result.count).toBe(1);
  });

  it("collects a count prefix before the command", () => {
    let state = createKeyState();
    let result = interpretKey(state, "5", DEFAULT_MAPPINGS);
    expect(result.status).toBe("pending");
    result = interpretKey(result.state, "j", DEFAULT_MAPPINGS);
    expect(result.status).toBe("command");
    expect(result.command).toBe("scrollDown");
    expect(result.count).toBe(5);
  });

  it("collects multi-digit counts", () => {
    let result = interpretKey(createKeyState(), "1", DEFAULT_MAPPINGS);
    result = interpretKey(result.state, "2", DEFAULT_MAPPINGS);
    result = interpretKey(result.state, "j", DEFAULT_MAPPINGS);
    expect(result.command).toBe("scrollDown");
    expect(result.count).toBe(12);
  });

  it("does not treat a leading 0 as a count", () => {
    const result = interpretKey(createKeyState(), "0", DEFAULT_MAPPINGS);
    expect(result.status).toBe("unbound");
  });

  it("matches two-key chords like gg", () => {
    let result = interpretKey(createKeyState(), "g", DEFAULT_MAPPINGS);
    expect(result.status).toBe("pending");
    result = interpretKey(result.state, "g", DEFAULT_MAPPINGS);
    expect(result.status).toBe("command");
    expect(result.command).toBe("scrollToTop");
  });

  it("matches g0 as first tab, not a count", () => {
    let result = interpretKey(createKeyState(), "g", DEFAULT_MAPPINGS);
    result = interpretKey(result.state, "0", DEFAULT_MAPPINGS);
    expect(result.status).toBe("command");
    expect(result.command).toBe("firstTab");
  });

  it("matches g$", () => {
    let result = interpretKey(createKeyState(), "g", DEFAULT_MAPPINGS);
    result = interpretKey(result.state, "$", DEFAULT_MAPPINGS);
    expect(result.command).toBe("lastTab");
  });

  it("resets on Escape", () => {
    let result = interpretKey(createKeyState(), "g", DEFAULT_MAPPINGS);
    result = interpretKey(result.state, "Escape", DEFAULT_MAPPINGS);
    expect(result.status).toBe("escape");
    expect(result.state.prefix).toBe("");
    expect(result.state.count).toBe(null);
  });

  it("returns unbound and resets when a prefix is followed by a dead end", () => {
    let result = interpretKey(createKeyState(), "g", DEFAULT_MAPPINGS);
    result = interpretKey(result.state, "z", DEFAULT_MAPPINGS);
    expect(result.status).toBe("unbound");
    expect(result.state.prefix).toBe("");
  });

  it("matches shifted single keys like J", () => {
    const result = interpretKey(createKeyState(), "J", DEFAULT_MAPPINGS);
    expect(result.command).toBe("tabLeft");
  });
});
