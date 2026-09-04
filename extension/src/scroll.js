export function scrollDelta(direction, metrics, count) {
  const n = count ?? 1;
  const step = metrics.scrollStep * n;
  const half = Math.floor(metrics.pageHeight / 2) * n;
  const map = {
    down: { x: 0, y: step },
    up: { x: 0, y: -step },
    left: { x: -step, y: 0 },
    right: { x: step, y: 0 },
    pageDown: { x: 0, y: half },
    pageUp: { x: 0, y: -half },
  };
  return map[direction] || { x: 0, y: 0 };
}

export { findScrollableElement, isElementScrollable } from "./scroll-target.js";

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

  function begin(el, smooth) {
    target = el;
    if (!smooth || reducedMotion()) {
      flush();
      return;
    }
    start();
  }

  return {
    queue(el, delta, smooth) {
      remainingX += delta.x;
      remainingY += delta.y;
      begin(el, smooth);
    },
    jumpTo(el, y, smooth) {
      remainingX = 0;
      remainingY = y - el.scrollTop;
      begin(el, smooth);
    },
  };
}
