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

const NATIVE_TAGS = new Set(["A", "BUTTON", "SUMMARY", "SELECT", "TEXTAREA"]);
const SKIP_CURSOR_TAGS = new Set(["HTML", "BODY", "MAIN", "NAV", "HEADER", "FOOTER", "ASIDE"]);
const MIN_HINT_WIDTH = 24;
const MIN_HINT_HEIGHT = 24;

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
  if (role !== "treeitem" || !el.querySelector?.("[role='treeitem']")) {
    return [];
  }
  return el.firstElementChild ? [el.firstElementChild] : [];
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
  if (NATIVE_TAGS.has(tag) || (tag === "INPUT" && el.type !== "hidden")) {
    return "native";
  }
  if (tag === "LABEL" && el.hasAttribute("for")) {
    return "native";
  }
  if (el.hasAttribute?.("onclick")) {
    return "native";
  }
  const editable = el.getAttribute?.("contenteditable");
  if (editable != null && ["", "true", "contenteditable"].includes(editable.toLowerCase())) {
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
  if (tag === "INPUT" || (NATIVE_TAGS.has(tag) && tag !== "A")) {
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
      if (el.contains(other) && !native && isUsefulHintTarget(other)) {
        return false;
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
