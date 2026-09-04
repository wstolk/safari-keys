import { isEditable } from "./modes.js";
import {
  activateHint,
  collectClickable,
  filterHints,
  generateHintLabels,
  pickHint,
} from "./hints.js";
import { isEscape } from "./keys.js";
import { renderHints, showHud } from "./overlay.js";

export function startHints(runtime, openInNewTab) {
  const elements = collectClickable(document, window);
  const labels = generateHintLabels(elements.length, runtime.settings.hintCharacters);
  runtime.hintSession = {
    openInNewTab,
    typed: "",
    map: new Map(labels.map((label, i) => [label, elements[i]])),
  };
  drawHints(runtime);
}

function drawHints(runtime) {
  if (!runtime.hintSession) {
    return;
  }
  const hints = [...runtime.hintSession.map.entries()].map(([label, el]) => ({ label, el }));
  renderHints(document, hints, runtime.hintSession.typed);
}

export function focusNthInput(runtime, count) {
  const nodes = collectClickable(document, window).filter((el) => isEditable(el));
  const el = nodes[Math.max(0, count - 1)];
  if (el) {
    el.focus();
    showHud(document, "Insert");
  }
}

export function handleHintKey(runtime, event, { closeOverlays, browser }) {
  if (event.metaKey || event.altKey) {
    return;
  }
  if (isEscape(event)) {
    event.preventDefault();
    event.stopPropagation();
    closeOverlays();
    return;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    runtime.hintSession.typed = runtime.hintSession.typed.slice(0, -1);
    drawHints(runtime);
    return;
  }
  if (event.key.length !== 1) {
    return;
  }
  const next = runtime.hintSession.typed + event.key;
  const labels = [...runtime.hintSession.map.keys()];
  if (!filterHints(labels, next).length) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  runtime.hintSession.typed = next;
  const chosen = pickHint(labels, runtime.hintSession.typed);
  if (chosen) {
    const el = runtime.hintSession.map.get(chosen);
    const { openedUrl } = activateHint(el, runtime.hintSession.openInNewTab);
    if (openedUrl) {
      browser.runtime.sendMessage({ type: "openUrl", url: openedUrl, newTab: true });
    }
    closeOverlays();
    return;
  }
  drawHints(runtime);
}
