(() => {
  // extension/src/mappings.js
  var DEFAULT_MAPPINGS = {
    j: "scrollDown",
    k: "scrollUp",
    h: "scrollLeft",
    l: "scrollRight",
    gg: "scrollToTop",
    G: "scrollToBottom",
    d: "scrollPageDown",
    u: "scrollPageUp",
    f: "hintCurrentTab",
    F: "hintNewTab",
    r: "reload",
    yy: "yankUrl",
    p: "openClipboard",
    P: "openClipboardNewTab",
    i: "enterInsert",
    gi: "focusFirstInput",
    J: "tabLeft",
    K: "tabRight",
    g0: "firstTab",
    "g$": "lastTab",
    t: "newTab",
    yt: "duplicateTab",
    x: "closeTab",
    X: "restoreTab",
    H: "goBack",
    L: "goForward",
    o: "paletteOpen",
    O: "paletteOpenNewTab",
    T: "paletteTabs",
    "?": "help"
  };
  var HELP_SECTIONS = [
    {
      title: "Page",
      keys: [
        ["j k", "Scroll down / up"],
        ["h l", "Scroll left / right"],
        ["d u", "Half-page down / up"],
        ["gg G", "Top / bottom"],
        ["f F", "Follow link / in a new tab"],
        ["r", "Reload"],
        ["yy", "Copy URL"],
        ["p P", "Open clipboard URL / in a new tab"],
        ["i", "Insert mode"],
        ["gi", "Focus first input"],
        ["Esc", "Back to normal"]
      ]
    },
    {
      title: "Tabs",
      keys: [
        ["J K", "Tab left / right"],
        ["g0 g$", "First / last tab"],
        ["t yt", "New tab / duplicate"],
        ["x X", "Close / restore tab"],
        ["H L", "Back / forward"]
      ]
    },
    {
      title: "Palette",
      keys: [
        ["o O", "Open URL or tab / in a new tab"],
        ["T", "Search tabs"],
        ["?", "This cheatsheet"]
      ]
    }
  ];

  // extension/src/keymap.js
  function createKeyState() {
    return { prefix: "", count: null };
  }
  function eventToKey(event) {
    if (event.metaKey || event.altKey) {
      return null;
    }
    if (event.ctrlKey) {
      return event.key === "[" ? "Escape" : null;
    }
    return event.key;
  }
  function interpretKey(state, key, mappings) {
    if (key === "Escape") {
      return { status: "escape", state: createKeyState(), command: null, count: 1 };
    }
    if (state.prefix === "" && /^[1-9]$/.test(key)) {
      const nextCount = (state.count ?? 0) * 10 + Number(key);
      return {
        status: "pending",
        state: { prefix: "", count: nextCount },
        command: null,
        count: nextCount
      };
    }
    if (state.prefix === "" && key === "0" && state.count !== null) {
      const nextCount = state.count * 10;
      return {
        status: "pending",
        state: { prefix: "", count: nextCount },
        command: null,
        count: nextCount
      };
    }
    const sequence = `${state.prefix}${key}`;
    if (Object.prototype.hasOwnProperty.call(mappings, sequence)) {
      return {
        status: "command",
        state: createKeyState(),
        command: mappings[sequence],
        count: state.count ?? 1
      };
    }
    const hasPrefix = Object.keys(mappings).some((mapping) => mapping.startsWith(sequence));
    if (hasPrefix) {
      return {
        status: "pending",
        state: { prefix: sequence, count: state.count },
        command: null,
        count: state.count ?? 1
      };
    }
    return { status: "unbound", state: createKeyState(), command: null, count: 1 };
  }

  // extension/src/modes.js
  var INSERT_COMMANDS = /* @__PURE__ */ new Set(["enterInsert", "focusFirstInput"]);
  var HINT_COMMANDS = /* @__PURE__ */ new Set(["hintCurrentTab", "hintNewTab"]);
  var PALETTE_COMMANDS = /* @__PURE__ */ new Set(["paletteOpen", "paletteOpenNewTab", "paletteTabs"]);
  var NON_TEXT_INPUTS = /* @__PURE__ */ new Set([
    "button",
    "checkbox",
    "radio",
    "file",
    "submit",
    "reset",
    "image",
    "range",
    "color",
    "hidden"
  ]);
  function createSession() {
    return { mode: "normal", keyState: createKeyState() };
  }
  function isEditable(el) {
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
  function reduce(session2, event, context) {
    const keyName = event.keyName;
    if (session2.mode === "insert") {
      if (keyName === "Escape") {
        return { session: createSession(), action: { type: "exitInsert" } };
      }
      return { session: session2, action: { type: "pass" } };
    }
    if (session2.mode === "hints" || session2.mode === "palette" || session2.mode === "help") {
      if (keyName === "Escape") {
        return { session: createSession(), action: { type: "closeOverlay" } };
      }
      return { session: session2, action: { type: "overlayKey", keyName } };
    }
    if (context.isEditable && keyName !== "Escape") {
      return {
        session: { mode: "insert", keyState: createKeyState() },
        action: { type: "pass" }
      };
    }
    if (context.isEditable && keyName === "Escape") {
      return { session: createSession(), action: { type: "exitInsert" } };
    }
    const result = interpretKey(session2.keyState, keyName, context.mappings);
    if (result.status === "pending") {
      return {
        session: { mode: "normal", keyState: result.state },
        action: { type: "pending" }
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
      action: { type: "command", command, count: result.count }
    };
  }

  // extension/src/settings.js
  var defaultSettings = {
    excludedHosts: [],
    hintCharacters: "sadfjklewcmpgh",
    scrollStep: 60,
    smoothScroll: true
  };
  function normalizeSettings(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const hintCharacters = typeof input.hintCharacters === "string" && input.hintCharacters.length > 0 ? input.hintCharacters : defaultSettings.hintCharacters;
    const scrollStep = Number.isFinite(input.scrollStep) && input.scrollStep > 0 ? Math.floor(input.scrollStep) : defaultSettings.scrollStep;
    const smoothScroll = typeof input.smoothScroll === "boolean" ? input.smoothScroll : defaultSettings.smoothScroll;
    const excludedHosts = Array.isArray(input.excludedHosts) ? input.excludedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean) : [];
    return { excludedHosts, hintCharacters, scrollStep, smoothScroll };
  }
  function isExcluded(hostname, excludedHosts) {
    const host = String(hostname || "").toLowerCase();
    return excludedHosts.some((pattern) => {
      const needle = String(pattern).toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
      return host === needle || host.endsWith(`.${needle}`);
    });
  }

  // extension/src/scroll.js
  function scrollDelta(direction, metrics, count) {
    const n = count ?? 1;
    const step = metrics.scrollStep;
    const half = Math.floor(metrics.pageHeight / 2);
    switch (direction) {
      case "down":
        return { x: 0, y: step * n };
      case "up":
        return { x: 0, y: -step * n };
      case "left":
        return { x: -step * n, y: 0 };
      case "right":
        return { x: step * n, y: 0 };
      case "pageDown":
        return { x: 0, y: half * n };
      case "pageUp":
        return { x: 0, y: -half * n };
      default:
        return { x: 0, y: 0 };
    }
  }
  var defaultClock = {
    now: () => typeof performance !== "undefined" ? performance.now() : Date.now(),
    raf: (cb) => requestAnimationFrame(cb),
    caf: (id) => cancelAnimationFrame(id)
  };
  var TIME_CONSTANT_MS = 110;
  function applyDelta(el, dx, dy) {
    if (!el) {
      return;
    }
    if (dx) {
      el.scrollLeft += dx;
    }
    if (dy) {
      el.scrollTop += dy;
    }
  }
  function reducedMotion() {
    return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }
  function createScroller(clock = defaultClock) {
    let target = null;
    let remainingX = 0;
    let remainingY = 0;
    let rafId = 0;
    let lastTime = 0;
    function stop() {
      if (rafId) {
        clock.caf(rafId);
        rafId = 0;
      }
    }
    function flush() {
      applyDelta(target, remainingX, remainingY);
      remainingX = 0;
      remainingY = 0;
      stop();
    }
    function tick(now) {
      const dt = Math.min(32, Math.max(0, now - lastTime || 16));
      lastTime = now;
      const alpha = 1 - Math.exp(-dt / TIME_CONSTANT_MS);
      const dx = remainingX * alpha;
      const dy = remainingY * alpha;
      remainingX -= dx;
      remainingY -= dy;
      applyDelta(target, dx, dy);
      if (Math.abs(remainingX) < 0.5 && Math.abs(remainingY) < 0.5) {
        applyDelta(target, remainingX, remainingY);
        remainingX = 0;
        remainingY = 0;
        rafId = 0;
        return;
      }
      rafId = clock.raf(tick);
    }
    function start() {
      if (rafId) {
        return;
      }
      lastTime = clock.now();
      rafId = clock.raf(tick);
    }
    return {
      queue(el, delta, smooth) {
        target = el;
        remainingX += delta.x;
        remainingY += delta.y;
        if (!smooth || reducedMotion()) {
          flush();
          return;
        }
        start();
      },
      jumpTo(el, y, smooth) {
        target = el;
        remainingX = 0;
        remainingY = y - el.scrollTop;
        if (!smooth || reducedMotion()) {
          flush();
          return;
        }
        start();
      }
    };
  }
  var PAGE_SCROLL_OVERFLOW = /* @__PURE__ */ new Set(["auto", "scroll", "overlay", "hidden"]);
  function axisOverflow(style, axis) {
    if (!style) {
      return "";
    }
    return axis === "y" ? style.overflowY || style.overflow : style.overflowX || style.overflow;
  }
  function isRootScroller(el, doc) {
    return el === (doc.scrollingElement || doc.documentElement) || el === doc.body;
  }
  function isElementScrollable(el, win, axis = "y") {
    if (!el) {
      return false;
    }
    const overflowed = axis === "y" ? el.scrollHeight - el.clientHeight > 8 : el.scrollWidth - el.clientWidth > 8;
    if (!overflowed) {
      return false;
    }
    const style = win.getComputedStyle?.(el);
    const overflow = axisOverflow(style, axis);
    const doc = win.document || el.ownerDocument;
    if (isRootScroller(el, doc)) {
      return overflow !== "hidden" && overflow !== "clip";
    }
    if (!PAGE_SCROLL_OVERFLOW.has(overflow)) {
      return false;
    }
    const rect = el.getBoundingClientRect?.();
    if (!rect) {
      return false;
    }
    const minH = (win.innerHeight || 0) * 0.35;
    const minW = (win.innerWidth || 0) * 0.35;
    return rect.height >= minH && rect.width >= minW;
  }
  function findScrollableElement(doc, win, axis = "y") {
    const root = doc.scrollingElement || doc.documentElement;
    if (isElementScrollable(root, win, axis)) {
      return root;
    }
    const cx = (win.innerWidth || 0) / 2;
    const cy = (win.innerHeight || 0) / 2;
    for (let el = doc.elementFromPoint?.(cx, cy); el; el = el.parentElement) {
      if (isElementScrollable(el, win, axis)) {
        return el;
      }
    }
    return largestNestedScroller(root || doc.body, win, axis) || root;
  }
  function largestNestedScroller(root, win, axis) {
    if (!root) {
      return null;
    }
    let best = null;
    let bestArea = 0;
    const stack = [root];
    let seen = 0;
    while (stack.length && seen < 500) {
      const el = stack.pop();
      seen += 1;
      if (el !== root && isElementScrollable(el, win, axis)) {
        const rect = el.getBoundingClientRect();
        const area = Math.max(0, rect.width) * Math.max(0, rect.height);
        if (area > bestArea) {
          bestArea = area;
          best = el;
        }
      }
      const kids = el.children;
      if (!kids) {
        continue;
      }
      for (const child of kids) {
        const rect = child.getBoundingClientRect?.();
        if (rect && rect.width > 80 && rect.height > 80) {
          stack.push(child);
        }
      }
    }
    return best;
  }

  // extension/src/hints.js
  var CLICKABLE_ROLES = /* @__PURE__ */ new Set([
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
    "combobox"
  ]);
  var SKIP_CURSOR_TAGS = /* @__PURE__ */ new Set(["HTML", "BODY", "MAIN", "NAV", "HEADER", "FOOTER", "ASIDE"]);
  var MIN_HINT_WIDTH = 24;
  var MIN_HINT_HEIGHT = 24;
  function generateHintLabels(count, alphabet) {
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
  function filterHints(labels, typed) {
    if (!typed) {
      return labels.slice();
    }
    return labels.filter((label) => label.startsWith(typed));
  }
  function pickHint(labels, typed) {
    const remaining = filterHints(labels, typed);
    if (remaining.length === 1) {
      return remaining[0];
    }
    if (typed && remaining.includes(typed)) {
      return typed;
    }
    return null;
  }
  function isElementVisible(el, win) {
    if (!el || el.getClientRects().length === 0) {
      const rect2 = el?.getBoundingClientRect?.();
      if (!rect2 || rect2.width < 2 || rect2.height < 2) {
        return false;
      }
    }
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      return false;
    }
    const style = win.getComputedStyle?.(el);
    if (style && (style.visibility === "hidden" || style.display === "none" || style.opacity !== "" && Number(style.opacity) === 0)) {
      return false;
    }
    const viewH = win.innerHeight || 800;
    const viewW = win.innerWidth || 1200;
    return rect.bottom > 0 && rect.right > 0 && rect.top < viewH && rect.left < viewW;
  }
  function collectClickable(document2, win) {
    const unique = [];
    const seen = /* @__PURE__ */ new Set();
    for (const el of iterateElements(document2.documentElement || document2)) {
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
      const [eventType, rest] = rule.trim().includes(":") ? rule.trim().split(":") : ["click", rule.trim()];
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
  function activateHint(el, openInNewTab, win) {
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

  // extension/src/palette.js
  function looksLikeUrl(query) {
    const value = query.trim();
    if (!value || /\s/.test(value)) {
      return false;
    }
    if (/^https?:\/\//i.test(value)) {
      return true;
    }
    if (/^localhost(:\d+)?(\/|$)/i.test(value)) {
      return true;
    }
    return /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/|$)/i.test(value);
  }
  function toNavigableUrl(query) {
    const value = query.trim();
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    return `https://${value}`;
  }
  function searchUrl(query) {
    return `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}`;
  }
  function scoreMatch(query, text) {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (!q) {
      return 1;
    }
    const consecutive = t.indexOf(q);
    if (consecutive >= 0) {
      return 1e3 - consecutive * 10 - (t.length - q.length);
    }
    let ti = 0;
    let score = 0;
    let last = -2;
    for (const ch of q) {
      const found = t.indexOf(ch, ti);
      if (found === -1) {
        return 0;
      }
      score += found === last + 1 ? 8 : 2;
      if (found === 0 || /[\s/_-]/.test(t[found - 1])) {
        score += 12;
      }
      last = found;
      ti = found + 1;
    }
    return score;
  }
  function fuzzyMatch(query, items) {
    if (!query.trim()) {
      return items.map((item, index) => ({ item, score: items.length - index }));
    }
    const ranked = [];
    for (const item of items) {
      const hay = `${item.title || ""} ${item.url || ""}`;
      const score = scoreMatch(query, hay);
      if (score > 0) {
        ranked.push({ item, score });
      }
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }
  function paletteItems(query, tabs, mode) {
    const trimmed = query.trim();
    const tabMatches = fuzzyMatch(trimmed, tabs).map(({ item }) => ({
      kind: "tab",
      id: `tab-${item.id}`,
      title: item.title || item.url,
      subtitle: item.url,
      tabId: item.id,
      url: item.url
    }));
    if (mode === "tabs") {
      return tabMatches;
    }
    const extras = [];
    if (trimmed && looksLikeUrl(trimmed)) {
      const url = toNavigableUrl(trimmed);
      extras.push({
        kind: "url",
        id: `url-${url}`,
        title: "Open URL",
        subtitle: url,
        url
      });
    } else if (trimmed) {
      extras.push({
        kind: "search",
        id: `search-${trimmed}`,
        title: "Search the web",
        subtitle: trimmed,
        url: searchUrl(trimmed)
      });
    }
    return [...extras, ...tabMatches];
  }

  // extension/src/overlay.js
  var ROOT_ID = "safari-keys-root";
  function ensureRoot(document2) {
    let root = document2.getElementById(ROOT_ID);
    if (root) {
      return root;
    }
    root = document2.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("data-safari-keys", "root");
    Object.assign(root.style, {
      all: "initial",
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      pointerEvents: "none"
    });
    document2.documentElement.appendChild(root);
    return root;
  }
  function clearRoot(document2) {
    document2.getElementById(ROOT_ID)?.replaceChildren();
  }
  function showHud(document2, text) {
    const root = ensureRoot(document2);
    root.querySelector(".sk-hud")?.remove();
    const hud = document2.createElement("div");
    hud.className = "sk-hud";
    hud.textContent = text;
    root.appendChild(hud);
    window.clearTimeout(showHud._timer);
    showHud._timer = window.setTimeout(() => hud.remove(), 1400);
  }
  function renderHints(document2, hints, typed) {
    const root = ensureRoot(document2);
    root.querySelector(".sk-hints")?.remove();
    const layer = document2.createElement("div");
    layer.className = "sk-hints";
    for (const hint of hints) {
      const visible = hint.label.startsWith(typed);
      if (!visible) {
        continue;
      }
      const marker = document2.createElement("div");
      marker.className = "sk-hint";
      marker.dataset.label = hint.label;
      const matched = document2.createElement("span");
      matched.className = "sk-hint-matched";
      matched.textContent = typed;
      const rest = document2.createElement("span");
      rest.textContent = hint.label.slice(typed.length);
      marker.append(matched, rest);
      const rect = hint.el.getBoundingClientRect();
      marker.style.top = `${Math.max(0, rect.top)}px`;
      marker.style.left = `${Math.max(0, rect.left)}px`;
      layer.appendChild(marker);
    }
    root.appendChild(layer);
  }
  function renderPalette(document2, state) {
    const root = ensureRoot(document2);
    root.querySelector(".sk-palette-wrap")?.remove();
    const wrap = document2.createElement("div");
    wrap.className = "sk-palette-wrap";
    wrap.innerHTML = `
    <div class="sk-palette" role="dialog" aria-label="Safari Keys">
      <div class="sk-palette-input-row">
        <span class="sk-palette-glyph">\u2318</span>
        <input class="sk-palette-input" type="text" spellcheck="false" autocomplete="off" />
      </div>
      <ol class="sk-palette-list"></ol>
    </div>
  `;
    const input = wrap.querySelector(".sk-palette-input");
    input.placeholder = state.placeholder;
    input.value = state.query;
    const list = wrap.querySelector(".sk-palette-list");
    state.items.forEach((item, index) => {
      const li = document2.createElement("li");
      li.className = "sk-palette-item" + (index === state.selectedIndex ? " is-selected" : "");
      li.innerHTML = `<span class="sk-palette-title"></span><span class="sk-palette-sub"></span>`;
      li.querySelector(".sk-palette-title").textContent = item.title;
      li.querySelector(".sk-palette-sub").textContent = item.subtitle || "";
      list.appendChild(li);
    });
    if (!state.items.length) {
      const empty = document2.createElement("li");
      empty.className = "sk-palette-empty";
      empty.textContent = state.query ? "No matching tabs" : "Type a URL, search, or tab name";
      list.appendChild(empty);
    }
    root.appendChild(wrap);
    return input;
  }
  function renderHelp(document2, sections) {
    const root = ensureRoot(document2);
    root.querySelector(".sk-help-wrap")?.remove();
    const wrap = document2.createElement("div");
    wrap.className = "sk-help-wrap";
    const panel = document2.createElement("div");
    panel.className = "sk-help";
    const heading = document2.createElement("h1");
    heading.textContent = "Safari Keys";
    panel.appendChild(heading);
    for (const section of sections) {
      const h2 = document2.createElement("h2");
      h2.textContent = section.title;
      panel.appendChild(h2);
      const dl = document2.createElement("dl");
      for (const [keys, label] of section.keys) {
        const dt = document2.createElement("dt");
        dt.textContent = keys;
        const dd = document2.createElement("dd");
        dd.textContent = label;
        dl.append(dt, dd);
      }
      panel.appendChild(dl);
    }
    wrap.appendChild(panel);
    root.appendChild(wrap);
  }

  // extension/src/content.js
  var browser = globalThis.browser ?? globalThis.chrome ?? {
    runtime: {
      sendMessage: async () => ({}),
      onMessage: { addListener() {
      } }
    },
    storage: { onChanged: { addListener() {
    } } }
  };
  var settings = defaultSettings;
  var session = createSession();
  var hintSession = null;
  var paletteSession = null;
  var motion = createScroller();
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
      if (event.key === "Escape" || event.ctrlKey && event.key === "[") {
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
      { mappings: DEFAULT_MAPPINGS, isEditable: isEditable(currentTarget()) }
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
      pageHeight: scroller?.clientHeight || window.innerHeight
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
            newTab: command === "openClipboardNewTab"
          });
        }).catch(() => showHud(document, "Couldn\u2019t read clipboard"));
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
        browser.runtime.sendMessage({ type: command, count, url: location.href }).catch(() => {
        });
        if (command === "yankUrl") {
          showHud(document, "Copied URL");
        }
        break;
      default:
        break;
    }
  }
  function focusNthInput(count) {
    const nodes = collectClickable(document, window).filter((el2) => isEditable(el2));
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
      map: new Map(labels.map((label, i) => [label, elements[i]]))
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
    if (event.key === "Escape" || event.ctrlKey && event.key === "[") {
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
      tabs: []
    };
    try {
      paletteSession.tabs = await browser.runtime.sendMessage({ type: "listTabs" }) || [];
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
      paletteSession.mode
    );
    if (paletteSession.selectedIndex >= paletteSession.items.length) {
      paletteSession.selectedIndex = Math.max(0, paletteSession.items.length - 1);
    }
    const placeholder = paletteSession.mode === "tabs" ? "Search open tabs" : "Open a URL, search, or switch tabs";
    const input = renderPalette(document, {
      query: paletteSession.query,
      items: paletteSession.items,
      selectedIndex: paletteSession.selectedIndex,
      placeholder
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
    if (event.key === "Escape" || event.ctrlKey && event.key === "[") {
      event.preventDefault();
      closeOverlays();
      return;
    }
    if (event.key === "ArrowDown" || !event.metaKey && event.key === "j" && event.ctrlKey) {
      event.preventDefault();
      paletteSession.selectedIndex = Math.min(
        paletteSession.items.length - 1,
        paletteSession.selectedIndex + 1
      );
      redrawPalette(true);
      return;
    }
    if (event.key === "ArrowUp" || !event.metaKey && event.key === "k" && event.ctrlKey) {
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
        newTab
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
})();
