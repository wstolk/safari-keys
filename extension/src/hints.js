const CLICKABLE_ROLES = new Set([
  "button",
  "tab",
  "link",
  "checkbox",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "radio",
  "textbox",
  "switch",
  "option",
  "treeitem",
  "slider",
  "combobox",
]);

const SKIP_CURSOR_TAGS = new Set(["HTML", "BODY", "MAIN", "NAV", "HEADER", "FOOTER", "ASIDE"]);
const MIN_HINT_WIDTH = 24;
const MIN_HINT_HEIGHT = 24;

export function generateHintLabels(count, alphabet) {
  if (count <= 0) {
    return [];
  }
  const chars = [...alphabet];
  if (chars.length === 0) {
    return [];
  }

  let length = 1;
  let capacity = chars.length;
  while (capacity < count && length < 5) {
    length += 1;
    capacity *= chars.length;
  }

  return combinations(chars, length).slice(0, count);
}

function combinations(chars, length) {
  if (length === 1) {
    return chars.slice();
  }
  const result = [];
  const shorter = combinations(chars, length - 1);
  for (const head of chars) {
    for (const tail of shorter) {
      result.push(head + tail);
    }
  }
  return result;
}

export function filterHints(labels, typed) {
  if (!typed) {
    return labels.slice();
  }
  return labels.filter((label) => label.startsWith(typed));
}

export function pickHint(labels, typed) {
  const remaining = filterHints(labels, typed);
  if (remaining.length === 1) {
    return remaining[0];
  }
  if (typed && remaining.includes(typed)) {
    return typed;
  }
  return null;
}

export function isElementVisible(el, win) {
  if (!el || el.getClientRects().length === 0) {
    const rect = el?.getBoundingClientRect?.();
    if (!rect || rect.width < 2 || rect.height < 2) {
      return false;
    }
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    return false;
  }
  const style = win.getComputedStyle?.(el);
  if (
    style &&
    (style.visibility === "hidden" ||
      style.display === "none" ||
      (style.opacity !== "" && Number(style.opacity) === 0))
  ) {
    return false;
  }
  const viewH = win.innerHeight || 800;
  const viewW = win.innerWidth || 1200;
  return rect.bottom > 0 && rect.right > 0 && rect.top < viewH && rect.left < viewW;
}

export function collectClickable(document, win) {
  const unique = [];
  const seen = new Set();
  for (const el of iterateElements(document.documentElement || document)) {
    if (seen.has(el) || !isClickableElement(el, win) || !isElementVisible(el, win)) {
      continue;
    }
    seen.add(el);
    unique.push(el);
    for (const extra of treeitemRowTargets(el)) {
      if (seen.has(extra) || !isElementVisible(extra, win)) {
        continue;
      }
      seen.add(extra);
      unique.push(extra);
    }
  }
  return preferHintTargets(unique);
}

function treeitemRowTargets(el) {
  const role = (el.getAttribute?.("role") || "").toLowerCase();
  if (role !== "treeitem") {
    return [];
  }
  if (!el.querySelector?.("[role='treeitem']")) {
    return [];
  }
  const row = el.firstElementChild;
  return row ? [row] : [];
}

function iterateElements(root, into = []) {
  if (!root?.querySelectorAll) {
    return into;
  }
  for (const el of root.querySelectorAll("*")) {
    into.push(el);
    if (el.shadowRoot) {
      iterateElements(el.shadowRoot, into);
    }
  }
  return into;
}

function isClickableElement(el, win) {
  const disabled = el.getAttribute?.("aria-disabled");
  if (disabled && ["", "true"].includes(disabled.toLowerCase())) {
    return false;
  }
  if (el.disabled) {
    return false;
  }
  return clickableReason(el, win) !== null;
}

function clickableReason(el, win) {
  const tag = el.tagName;
  if (tag === "A" || tag === "BUTTON" || tag === "SUMMARY" || tag === "SELECT" || tag === "TEXTAREA") {
    return "native";
  }
  if (tag === "INPUT") {
    return el.type === "hidden" ? null : "native";
  }
  if (tag === "LABEL" && el.hasAttribute("for")) {
    return "native";
  }
  if (el.hasAttribute?.("onclick")) {
    return "native";
  }
  const editable = el.getAttribute?.("contenteditable");
  if (
    editable != null &&
    ["", "true", "contenteditable"].includes(editable.toLowerCase())
  ) {
    return "native";
  }
  const role = (el.getAttribute?.("role") || "").toLowerCase();
  if (CLICKABLE_ROLES.has(role)) {
    return "role";
  }
  if (hasClickJsaction(el)) {
    return "jsaction";
  }
  const className = (el.getAttribute?.("class") || "").toLowerCase();
  if (className.includes("button") || className.includes("btn")) {
    return "class";
  }
  const tab = el.getAttribute?.("tabindex");
  if (tab != null && tab !== "" && Number(tab) >= 0 && !isOversized(el, win, 0.2)) {
    return "tabindex";
  }
  const cursor = win.getComputedStyle?.(el)?.cursor;
  if (cursor === "pointer" && !SKIP_CURSOR_TAGS.has(tag) && !isOversized(el, win, 0.35)) {
    return "cursor";
  }
  return null;
}

function hasClickJsaction(el) {
  const raw = el.getAttribute?.("jsaction");
  if (!raw) {
    return false;
  }
  return raw.split(";").some((rule) => {
    const [eventType, rest] = rule.trim().includes(":")
      ? rule.trim().split(":")
      : ["click", rule.trim()];
    if (eventType !== "click" || !rest) {
      return false;
    }
    const namespace = rest.trim().split(".")[0];
    return namespace && namespace !== "none";
  });
}

function isOversized(el, win, fraction) {
  const rect = el.getBoundingClientRect?.();
  if (!rect) {
    return false;
  }
  const viewH = win.innerHeight || 800;
  const viewW = win.innerWidth || 1200;
  return rect.width * rect.height > viewW * viewH * fraction;
}

function isNativeHintTarget(el) {
  const tag = el.tagName;
  if (tag === "A") {
    return el.hasAttribute("href") || Boolean(el.href);
  }
  if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "SUMMARY") {
    return true;
  }
  const role = (el.getAttribute?.("role") || "").toLowerCase();
  return role === "link" || role === "button";
}

function isUsefulHintTarget(el) {
  if (isNativeHintTarget(el)) {
    return true;
  }
  const rect = el.getBoundingClientRect?.();
  return !!rect && rect.width >= MIN_HINT_WIDTH && rect.height >= MIN_HINT_HEIGHT;
}

function preferHintTargets(elements) {
  const set = new Set(elements);
  return elements.filter((el) => {
    const native = isNativeHintTarget(el);
    const useful = native || isUsefulHintTarget(el);
    for (const other of set) {
      if (other === el) {
        continue;
      }
      if (el.contains(other)) {
        if (!native && isUsefulHintTarget(other)) {
          return false;
        }
        if (native && !isNativeHintTarget(other)) {
          continue;
        }
      }
      if (!native && other.contains(el) && isNativeHintTarget(other)) {
        return false;
      }
      if (!useful && other.contains(el)) {
        return false;
      }
    }
    return useful;
  });
}

export function activateHint(el, openInNewTab, win) {
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
