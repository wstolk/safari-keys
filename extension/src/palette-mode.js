import { isEscape } from "./keys.js";
import { paletteItems } from "./palette.js";
import { renderPalette } from "./overlay.js";

export async function openPalette(runtime, browser, mode, newTab) {
  runtime.paletteSession = {
    mode,
    newTab,
    query: "",
    selectedIndex: 0,
    items: [],
    tabs: [],
  };
  try {
    runtime.paletteSession.tabs = (await browser.runtime.sendMessage({ type: "listTabs" })) || [];
  } catch {
    runtime.paletteSession.tabs = [];
  }
  redrawPalette(runtime, true);
}

function redrawPalette(runtime, focusInput) {
  const session = runtime.paletteSession;
  if (!session) {
    return;
  }
  session.items = paletteItems(session.query, session.tabs, session.mode);
  if (session.selectedIndex >= session.items.length) {
    session.selectedIndex = Math.max(0, session.items.length - 1);
  }
  const input = renderPalette(document, {
    query: session.query,
    items: session.items,
    selectedIndex: session.selectedIndex,
    placeholder: session.mode === "tabs" ? "Search open tabs" : "Open a URL, search, or switch tabs",
  });
  if (focusInput) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  input.addEventListener("input", () => {
    session.query = input.value;
    session.selectedIndex = 0;
    redrawPalette(runtime, false);
    const again = document.querySelector(".sk-palette-input");
    if (again) {
      again.focus();
      again.setSelectionRange(session.query.length, session.query.length);
    }
  });
}

export function handlePaletteKey(runtime, event, { closeOverlays, browser }) {
  const session = runtime.paletteSession;
  if (!session) {
    return;
  }
  if (isEscape(event)) {
    event.preventDefault();
    closeOverlays();
    return;
  }
  if (event.key === "ArrowDown" || (!event.metaKey && event.key === "j" && event.ctrlKey)) {
    event.preventDefault();
    session.selectedIndex = Math.min(session.items.length - 1, session.selectedIndex + 1);
    redrawPalette(runtime, true);
    return;
  }
  if (event.key === "ArrowUp" || (!event.metaKey && event.key === "k" && event.ctrlKey)) {
    event.preventDefault();
    session.selectedIndex = Math.max(0, session.selectedIndex - 1);
    redrawPalette(runtime, true);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const item = session.items[session.selectedIndex];
    if (!item) {
      return;
    }
    const newTab = session.newTab;
    closeOverlays();
    browser.runtime.sendMessage({ type: "activatePaletteItem", item, newTab });
  }
}
