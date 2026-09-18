import { DEFAULT_MAPPINGS, HELP_SECTIONS } from "./mappings.js";
import { eventToKey } from "./keymap.js";
import { createSession, isEditable, reduce } from "./modes.js";
import { defaultSettings, isExcluded, normalizeSettings } from "./settings.js";
import { createScroller } from "./scroll.js";
import { extensionApi } from "./browser.js";
import { isEscape } from "./keys.js";
import { runCommand } from "./commands.js";
import { handleHintKey } from "./hint-mode.js";
import { handlePaletteKey } from "./palette-mode.js";
import { clearRoot, renderHelp, showHud } from "./overlay.js";

const browser = extensionApi();
const runtime = {
  settings: defaultSettings,
  session: createSession(),
  hintSession: null,
  paletteSession: null,
};
const motion = createScroller();

function currentTarget() {
  return document.activeElement;
}

async function loadSettings() {
  try {
    const stored = await browser.runtime.sendMessage({ type: "getSettings" });
    runtime.settings = normalizeSettings(stored);
  } catch {
    runtime.settings = defaultSettings;
  }
}

function closeOverlays() {
  runtime.hintSession = null;
  runtime.paletteSession = null;
  runtime.session = createSession();
  clearRoot(document);
}

function onKeyDown(event) {
  if (event.defaultPrevented || event.isComposing || window !== window.top) {
    return;
  }
  if (isExcluded(location.hostname, runtime.settings.excludedHosts)) {
    return;
  }

  if (runtime.session.mode === "hints") {
    handleHintKey(runtime, event, { closeOverlays, browser });
    return;
  }
  if (runtime.session.mode === "palette") {
    handlePaletteKey(runtime, event, { closeOverlays, browser });
    return;
  }
  if (runtime.session.mode === "help") {
    if (isEscape(event)) {
      event.preventDefault();
      event.stopPropagation();
      closeOverlays();
    }
    return;
  }

  const keyName = eventToKey(event);
  if (keyName === null) {
    return;
  }

  const { session: next, action } = reduce(
    runtime.session,
    { keyName },
    { mappings: DEFAULT_MAPPINGS, isEditable: isEditable(currentTarget()) },
  );
  runtime.session = next;

  if (action.type === "pass" || action.type === "pending") {
    return;
  }
  if (action.type === "exitInsert") {
    event.preventDefault();
    event.stopPropagation();
    currentTarget()?.blur?.();
    showHud(document, "Normal");
    return;
  }
  if (action.type === "closeOverlay") {
    event.preventDefault();
    closeOverlays();
    return;
  }
  if (action.type === "command") {
    event.preventDefault();
    event.stopPropagation();
    runCommand(action.command, action.count, { runtime, motion, browser });
  }
}

function bindKeys() {
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("blur", () => {
    if (runtime.session.mode === "normal") {
      runtime.session = createSession();
    }
  });
}

async function boot() {
  if (window !== window.top) {
    return;
  }
  await loadSettings();
  bindKeys();
  browser.storage?.onChanged?.addListener(() => {
    loadSettings();
  });
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "settingsUpdated") {
      runtime.settings = normalizeSettings(message.settings);
    }
    if (message?.type === "showHelp") {
      runtime.session = { ...createSession(), mode: "help" };
      renderHelp(document, HELP_SECTIONS);
    }
  });
}

boot();
