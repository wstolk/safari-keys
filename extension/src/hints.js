export { generateHintLabels, filterHints, pickHint } from "./hint-labels.js";
export { collectClickable, isElementVisible } from "./clickable.js";

export function activateHint(el, openInNewTab) {
  if (!el) {
    return { openedUrl: null };
  }
  const href = el.href || el.getAttribute?.("href");
  if (openInNewTab && href && !href.startsWith("javascript:")) {
    return { openedUrl: href };
  }
  el.focus?.();
  el.click?.();
  return { openedUrl: null };
}
