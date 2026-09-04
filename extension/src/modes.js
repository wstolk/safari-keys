import { createKeyState, interpretKey } from "./keymap.js";

const INSERT_COMMANDS = new Set(["enterInsert", "focusFirstInput"]);
const HINT_COMMANDS = new Set(["hintCurrentTab", "hintNewTab"]);
const PALETTE_COMMANDS = new Set(["paletteOpen", "paletteOpenNewTab", "paletteTabs"]);
const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "radio",
  "file",
  "submit",
  "reset",
  "image",
  "range",
  "color",
  "hidden",
]);

export function createSession() {
  return { mode: "normal", keyState: createKeyState() };
}

export function isEditable(el) {
  if (!el) {
    return false;
  }
  if (el.isContentEditable) {
    return true;
  }
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (tag === "INPUT") {
    const type = (el.type || "text").toLowerCase();
    return !NON_TEXT_INPUTS.has(type);
  }
  return false;
}

export function reduce(session, event, context) {
  const keyName = event.keyName;

  if (session.mode === "insert") {
    if (keyName === "Escape") {
      return { session: createSession(), action: { type: "exitInsert" } };
    }
    return { session, action: { type: "pass" } };
  }

  if (session.mode === "hints" || session.mode === "palette" || session.mode === "help") {
    if (keyName === "Escape") {
      return { session: createSession(), action: { type: "closeOverlay" } };
    }
    return { session, action: { type: "overlayKey", keyName } };
  }

  if (context.isEditable && keyName !== "Escape") {
    return {
      session: { mode: "insert", keyState: createKeyState() },
      action: { type: "pass" },
    };
  }

  if (context.isEditable && keyName === "Escape") {
    return { session: createSession(), action: { type: "exitInsert" } };
  }

  const result = interpretKey(session.keyState, keyName, context.mappings);

  if (result.status === "pending") {
    return {
      session: { mode: "normal", keyState: result.state },
      action: { type: "pending" },
    };
  }

  if (result.status === "escape") {
    return { session: createSession(), action: { type: "closeOverlay" } };
  }

  if (result.status === "unbound") {
    return { session: createSession(), action: { type: "pass" } };
  }

  const command = result.command;
  let mode = "normal";
  if (INSERT_COMMANDS.has(command)) {
    mode = "insert";
  } else if (HINT_COMMANDS.has(command)) {
    mode = "hints";
  } else if (PALETTE_COMMANDS.has(command)) {
    mode = "palette";
  } else if (command === "help") {
    mode = "help";
  }

  return {
    session: { mode, keyState: createKeyState() },
    action: { type: "command", command, count: result.count },
  };
}
