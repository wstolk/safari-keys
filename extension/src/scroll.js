export function scrollDelta(direction, metrics, count) {
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

const defaultClock = {
  now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
  raf: (cb) => requestAnimationFrame(cb),
  caf: (id) => cancelAnimationFrame(id),
};

const TIME_CONSTANT_MS = 110;

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

export function createScroller(clock = defaultClock) {
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
    },
  };
}

const PAGE_SCROLL_OVERFLOW = new Set(["auto", "scroll", "overlay", "hidden"]);

function axisOverflow(style, axis) {
  if (!style) {
    return "";
  }
  return axis === "y" ? style.overflowY || style.overflow : style.overflowX || style.overflow;
}

function isRootScroller(el, doc) {
  return el === (doc.scrollingElement || doc.documentElement) || el === doc.body;
}

export function isElementScrollable(el, win, axis = "y") {
  if (!el) {
    return false;
  }
  const overflowed =
    axis === "y" ? el.scrollHeight - el.clientHeight > 8 : el.scrollWidth - el.clientWidth > 8;
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

export function findScrollableElement(doc, win, axis = "y") {
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
