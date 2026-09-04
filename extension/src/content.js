import { DEFAULT_MAPPINGS, HELP_SECTIONS } from "./mappings.js";
import { eventToKey } from "./keymap.js";
import { createSession, isEditable, reduce } from "./modes.js";
import { defaultSettings, isExcluded, normalizeSettings } from "./settings.js";
import { createScroller, findScrollableElement, scrollDelta } from "./scroll.js";
import {
  activateHint,
  collectClickable,
  filterHints,
  generateHintLabels,
  pickHint,
} from "./hints.js";
import { paletteItems } from "./palette.js";
import {
  clearRoot,
  renderHelp,
  renderHints,
  renderPalette,
  showHud,
} from "./overlay.js";

const browser = globalThis.browser ?? globalThis.chrome ?? {
  runtime: {
    sendMessage: async () => ({}),
    onMessage: { addListener() {} },
  },
  storage: { onChanged: { addListener() {} } },
};

let settings = defaultSettings;
let session = createSession();
let hintSession = null;
let paletteSession = null;
const motion = createScroller();

function scrollingElement() {
  return findScrollableElement(document, window);
}

function currentTarget() {
  return document.activeElement;
}

async function loadSettings() {
  try {
    const stored = await browser.runtime.sendMessage({ type: "getSettings" });
    settings = normalizeSettings(stored);
  } catch {
    settings = defaultSettings;
  }
}

function bindKeys() {
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("blur", () => {
    if (session.mode === "normal") {
      session = createSession();
    }
  });
}

function onKeyDown(event) {
  if (event.defaultPrevented || event.isComposing) {
    return;
  }
  if (window !== window.top) {
    return;
  }
  if (isExcluded(location.hostname, settings.excludedHosts)) {
    return;
  }

  if (session.mode === "hints") {
    handleHintKey(event);
    return;
  }
  if (session.mode === "palette") {
    handlePaletteKey(event);
    return;
  }
  if (session.mode === "help") {
    if (event.key === "Escape" || (event.ctrlKey && event.key === "[")) {
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
    session,
    { keyName },
    { mappings: DEFAULT_MAPPINGS, isEditable: isEditable(currentTarget()) },
  );
  session = next;

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
    runCommand(action.command, action.count);
  }
}

function closeOverlays() {
  hintSession = null;
  paletteSession = null;
  session = createSession();
  clearRoot(document);
}

function runCommand(command, count) {
  const smooth = settings.smoothScroll;
  const scroller = scrollingElement();
  const metrics = {
    scrollStep: settings.scrollStep,
    pageHeight: scroller?.clientHeight || window.innerHeight,
  };

  switch (command) {
    case "scrollDown":
      motion.queue(scroller, scrollDelta("down", metrics, count), smooth);
      break;
    case "scrollUp":
      motion.queue(scroller, scrollDelta("up", metrics, count), smooth);
      break;
    case "scrollLeft":
      motion.queue(scroller, scrollDelta("left", metrics, count), smooth);
      break;
    case "scrollRight":
      motion.queue(scroller, scrollDelta("right", metrics, count), smooth);
      break;
    case "scrollPageDown":
      motion.queue(scroller, scrollDelta("pageDown", metrics, count), smooth);
      break;
    case "scrollPageUp":
      motion.queue(scroller, scrollDelta("pageUp", metrics, count), smooth);
      break;
    case "scrollToTop":
      motion.jumpTo(scroller, 0, smooth);
      break;
    case "scrollToBottom":
      motion.jumpTo(scroller, scroller.scrollHeight, smooth);
      break;
    case "reload":
      location.reload();
      break;
    case "enterInsert":
      showHud(document, "Insert");
      break;
    case "focusFirstInput":
      focusNthInput(count);
      break;
    case "hintCurrentTab":
      startHints(false);
      break;
    case "hintNewTab":
      startHints(true);
      break;
    case "help":
      renderHelp(document, HELP_SECTIONS);
      break;
    case "paletteOpen":
      openPalette("open", false);
      break;
    case "paletteOpenNewTab":
      openPalette("open", true);
      break;
    case "paletteTabs":
      openPalette("tabs", false);
      break;
    case "yankUrl":
      navigator.clipboard.writeText(location.href).then(() => showHud(document, "Copied URL"));
      break;
    case "openClipboard":
    case "openClipboardNewTab":
      navigator.clipboard.readText().then((text) => {
        const trimmed = text.trim();
        if (!trimmed) {
          showHud(document, "Clipboard is empty");
          return;
        }
        const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        browser.runtime.sendMessage({
          type: "openUrl",
          url,
          newTab: command === "openClipboardNewTab",
        });
      }).catch(() => showHud(document, "Couldn’t read clipboard"));
      break;
    case "tabLeft":
    case "tabRight":
    case "firstTab":
    case "lastTab":
    case "newTab":
    case "duplicateTab":
    case "closeTab":
    case "restoreTab":
    case "goBack":
    case "goForward":
      browser.runtime.sendMessage({ type: command, count, url: location.href }).catch(() => {});
      if (command === "yankUrl") {
        showHud(document, "Copied URL");
      }
      break;
    default:
      break;
  }
}

function focusNthInput(count) {
  const nodes = collectClickable(document, window).filter((el) => isEditable(el));
  const el = nodes[Math.max(0, count - 1)];
  if (el) {
    el.focus();
    showHud(document, "Insert");
  }
}

function startHints(openInNewTab) {
  const elements = collectClickable(document, window);
  const labels = generateHintLabels(elements.length, settings.hintCharacters);
  hintSession = {
    openInNewTab,
    typed: "",
    map: new Map(labels.map((label, i) => [label, elements[i]])),
  };
  drawHints();
}

function drawHints() {
  if (!hintSession) {
    return;
  }
  const hints = [...hintSession.map.entries()].map(([label, el]) => ({ label, el }));
  renderHints(document, hints, hintSession.typed);
}

function handleHintKey(event) {
  if (event.metaKey || event.altKey) {
    return;
  }
  if (event.key === "Escape" || (event.ctrlKey && event.key === "[")) {
    event.preventDefault();
    event.stopPropagation();
    closeOverlays();
    return;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    hintSession.typed = hintSession.typed.slice(0, -1);
    drawHints();
    return;
  }
  if (event.key.length !== 1) {
    return;
  }
  const next = hintSession.typed + event.key;
  const labels = [...hintSession.map.keys()];
  if (!filterHints(labels, next).length) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  hintSession.typed = next;
  const chosen = pickHint(labels, hintSession.typed);
  if (chosen) {
    const el = hintSession.map.get(chosen);
    const { openedUrl } = activateHint(el, hintSession.openInNewTab, window);
    if (openedUrl) {
      browser.runtime.sendMessage({ type: "openUrl", url: openedUrl, newTab: true });
    }
    closeOverlays();
    return;
  }
  drawHints();
}

async function openPalette(mode, newTab) {
  paletteSession = {
    mode,
    newTab,
    query: "",
    selectedIndex: 0,
    items: [],
    tabs: [],
  };
  try {
    paletteSession.tabs = (await browser.runtime.sendMessage({ type: "listTabs" })) || [];
  } catch {
    paletteSession.tabs = [];
  }
  redrawPalette(true);
}

function redrawPalette(focusInput) {
  if (!paletteSession) {
    return;
  }
  paletteSession.items = paletteItems(
    paletteSession.query,
    paletteSession.tabs,
    paletteSession.mode,
  );
  if (paletteSession.selectedIndex >= paletteSession.items.length) {
    paletteSession.selectedIndex = Math.max(0, paletteSession.items.length - 1);
  }
  const placeholder =
    paletteSession.mode === "tabs" ? "Search open tabs" : "Open a URL, search, or switch tabs";
  const input = renderPalette(document, {
    query: paletteSession.query,
    items: paletteSession.items,
    selectedIndex: paletteSession.selectedIndex,
    placeholder,
  });
  if (focusInput) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  input.addEventListener("input", () => {
    paletteSession.query = input.value;
    paletteSession.selectedIndex = 0;
    redrawPalette(false);
    const again = document.querySelector(".sk-palette-input");
    if (again) {
      again.focus();
      again.setSelectionRange(paletteSession.query.length, paletteSession.query.length);
    }
  });
}

function handlePaletteKey(event) {
  if (!paletteSession) {
    return;
  }
  if (event.key === "Escape" || (event.ctrlKey && event.key === "[")) {
    event.preventDefault();
    closeOverlays();
    return;
  }
  if (event.key === "ArrowDown" || (!event.metaKey && event.key === "j" && event.ctrlKey)) {
    event.preventDefault();
    paletteSession.selectedIndex = Math.min(
      paletteSession.items.length - 1,
      paletteSession.selectedIndex + 1,
    );
    redrawPalette(true);
    return;
  }
  if (event.key === "ArrowUp" || (!event.metaKey && event.key === "k" && event.ctrlKey)) {
    event.preventDefault();
    paletteSession.selectedIndex = Math.max(0, paletteSession.selectedIndex - 1);
    redrawPalette(true);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const item = paletteSession.items[paletteSession.selectedIndex];
    if (!item) {
      return;
    }
    const newTab = paletteSession.newTab;
    closeOverlays();
    browser.runtime.sendMessage({
      type: "activatePaletteItem",
      item,
      newTab,
    });
  }
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
      settings = normalizeSettings(message.settings);
    }
    if (message?.type === "showHelp") {
      session = { ...createSession(), mode: "help" };
      renderHelp(document, HELP_SECTIONS);
    }
  });
}

boot();
