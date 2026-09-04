import { HELP_SECTIONS } from "./mappings.js";
import { toNavigableUrl } from "./palette.js";
import { findScrollableElement, scrollDelta } from "./scroll.js";
import { startHints, focusNthInput } from "./hint-mode.js";
import { openPalette } from "./palette-mode.js";
import { renderHelp, showHud } from "./overlay.js";

const RELATIVE_SCROLL = {
  scrollDown: "down",
  scrollUp: "up",
  scrollLeft: "left",
  scrollRight: "right",
  scrollPageDown: "pageDown",
  scrollPageUp: "pageUp",
};

const BACKGROUND_COMMANDS = new Set([
  "tabLeft",
  "tabRight",
  "firstTab",
  "lastTab",
  "newTab",
  "duplicateTab",
  "closeTab",
  "restoreTab",
  "goBack",
  "goForward",
]);

export function runCommand(command, count, ctx) {
  const { runtime, motion, browser } = ctx;
  const smooth = runtime.settings.smoothScroll;
  const scroller = findScrollableElement(document, window);
  const metrics = {
    scrollStep: runtime.settings.scrollStep,
    pageHeight: scroller?.clientHeight || window.innerHeight,
  };

  const direction = RELATIVE_SCROLL[command];
  if (direction) {
    motion.queue(scroller, scrollDelta(direction, metrics, count), smooth);
    return;
  }

  switch (command) {
    case "scrollToTop":
      motion.jumpTo(scroller, 0, smooth);
      return;
    case "scrollToBottom":
      motion.jumpTo(scroller, scroller.scrollHeight, smooth);
      return;
    case "reload":
      location.reload();
      return;
    case "enterInsert":
      showHud(document, "Insert");
      return;
    case "focusFirstInput":
      focusNthInput(runtime, count);
      return;
    case "hintCurrentTab":
      startHints(runtime, false);
      return;
    case "hintNewTab":
      startHints(runtime, true);
      return;
    case "help":
      renderHelp(document, HELP_SECTIONS);
      return;
    case "paletteOpen":
      openPalette(runtime, browser, "open", false);
      return;
    case "paletteOpenNewTab":
      openPalette(runtime, browser, "open", true);
      return;
    case "paletteTabs":
      openPalette(runtime, browser, "tabs", false);
      return;
    case "yankUrl":
      navigator.clipboard.writeText(location.href).then(() => showHud(document, "Copied URL"));
      return;
    case "openClipboard":
    case "openClipboardNewTab":
      openFromClipboard(browser, command === "openClipboardNewTab");
      return;
    default:
      if (BACKGROUND_COMMANDS.has(command)) {
        browser.runtime.sendMessage({ type: command, count, url: location.href }).catch(() => {});
      }
  }
}

function openFromClipboard(browser, newTab) {
  navigator.clipboard
    .readText()
    .then((text) => {
      const trimmed = text.trim();
      if (!trimmed) {
        showHud(document, "Clipboard is empty");
        return;
      }
      browser.runtime.sendMessage({ type: "openUrl", url: toNavigableUrl(trimmed), newTab });
    })
    .catch(() => showHud(document, "Couldn’t read clipboard"));
}
