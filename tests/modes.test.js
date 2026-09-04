import { describe, expect, it } from "vitest";
import { DEFAULT_MAPPINGS } from "../extension/src/mappings.js";
import { createKeyState } from "../extension/src/keymap.js";
import { createSession, isEditable, reduce } from "../extension/src/modes.js";

function key(name) {
  return { keyName: name };
}

describe("isEditable", () => {
  it("treats text inputs as editable", () => {
    expect(isEditable({ tagName: "INPUT", type: "text", isContentEditable: false })).toBe(true);
  });

  it("does not treat checkbox inputs as editable", () => {
    expect(isEditable({ tagName: "INPUT", type: "checkbox", isContentEditable: false })).toBe(false);
  });

  it("treats textareas as editable", () => {
    expect(isEditable({ tagName: "TEXTAREA", isContentEditable: false })).toBe(true);
  });

  it("treats contenteditable as editable", () => {
    expect(isEditable({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("does not treat buttons as editable", () => {
    expect(isEditable({ tagName: "BUTTON", isContentEditable: false })).toBe(false);
  });
});

describe("reduce", () => {
  const ctx = { mappings: DEFAULT_MAPPINGS, isEditable: false };

  it("starts in normal mode", () => {
    expect(createSession().mode).toBe("normal");
  });

  it("emits a scroll command from normal mode", () => {
    const { session, action } = reduce(createSession(), key("j"), ctx);
    expect(session.mode).toBe("normal");
    expect(action).toEqual({ type: "command", command: "scrollDown", count: 1 });
  });

  it("enters insert mode on i", () => {
    const { session, action } = reduce(createSession(), key("i"), ctx);
    expect(session.mode).toBe("insert");
    expect(action.type).toBe("command");
    expect(action.command).toBe("enterInsert");
  });

  it("passes keys through in insert mode", () => {
    let { session } = reduce(createSession(), key("i"), ctx);
    const next = reduce(session, key("j"), ctx);
    expect(next.action).toEqual({ type: "pass" });
    expect(next.session.mode).toBe("insert");
  });

  it("leaves insert mode on Escape", () => {
    let { session } = reduce(createSession(), key("i"), ctx);
    const next = reduce(session, key("Escape"), ctx);
    expect(next.session.mode).toBe("normal");
    expect(next.action).toEqual({ type: "exitInsert" });
  });

  it("auto-enters insert when focus is already editable", () => {
    const next = reduce(createSession(), key("a"), { ...ctx, isEditable: true });
    expect(next.session.mode).toBe("insert");
    expect(next.action).toEqual({ type: "pass" });
  });

  it("still handles Escape when focus is editable", () => {
    const next = reduce(createSession(), key("Escape"), { ...ctx, isEditable: true });
    expect(next.session.mode).toBe("normal");
    expect(next.action.type).toBe("exitInsert");
  });

  it("enters hints mode on f", () => {
    const next = reduce(createSession(), key("f"), ctx);
    expect(next.session.mode).toBe("hints");
    expect(next.action).toEqual({ type: "command", command: "hintCurrentTab", count: 1 });
  });

  it("enters palette mode on o", () => {
    const next = reduce(createSession(), key("o"), ctx);
    expect(next.session.mode).toBe("palette");
    expect(next.action.command).toBe("paletteOpen");
  });

  it("enters help mode on ?", () => {
    const next = reduce(createSession(), key("?"), ctx);
    expect(next.session.mode).toBe("help");
    expect(next.action.command).toBe("help");
  });

  it("closes help on Escape", () => {
    let { session } = reduce(createSession(), key("?"), ctx);
    const next = reduce(session, key("Escape"), ctx);
    expect(next.session.mode).toBe("normal");
    expect(next.action).toEqual({ type: "closeOverlay" });
  });

  it("passes unbound keys in normal mode", () => {
    const next = reduce(createSession(), key("q"), ctx);
    expect(next.action).toEqual({ type: "pass" });
  });

  it("keeps pending chords from emitting a command", () => {
    const next = reduce(createSession(), key("g"), ctx);
    expect(next.action).toEqual({ type: "pending" });
    expect(next.session.keyState.prefix).toBe("g");
  });
});
