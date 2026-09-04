import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createScroller, findScrollableElement, scrollDelta } from "../extension/src/scroll.js";

function fakeClock() {
  let t = 0;
  let nextId = 0;
  const callbacks = new Map();
  return {
    now: () => t,
    raf(cb) {
      const id = ++nextId;
      callbacks.set(id, cb);
      return id;
    },
    caf(id) {
      callbacks.delete(id);
    },
    advance(ms) {
      t += ms;
      const queued = [...callbacks.entries()];
      callbacks.clear();
      for (const [, cb] of queued) {
        cb(t);
      }
    },
    get pending() {
      return callbacks.size;
    },
  };
}

function mockElement(scrollTop = 0) {
  return {
    scrollTop,
    scrollLeft: 0,
    scrollHeight: 4000,
    scrollBy({ left = 0, top = 0 }) {
      this.scrollLeft += left;
      this.scrollTop += top;
    },
  };
}

describe("createScroller", () => {
  it("applies the full delta immediately when smooth is off", () => {
    const clock = fakeClock();
    const motion = createScroller(clock);
    const el = mockElement();
    motion.queue(el, { x: 0, y: 60 }, false);
    expect(el.scrollTop).toBe(60);
    expect(clock.pending).toBe(0);
  });

  it("does not dump the whole step on the first animation frame", () => {
    const clock = fakeClock();
    const motion = createScroller(clock);
    const el = mockElement();
    motion.queue(el, { x: 0, y: 120 }, true);
    clock.advance(16);
    expect(el.scrollTop).toBeGreaterThan(0);
    expect(el.scrollTop).toBeLessThan(120);
  });

  it("settles on the full distance after the ease finishes", () => {
    const clock = fakeClock();
    const motion = createScroller(clock);
    const el = mockElement();
    motion.queue(el, { x: 0, y: 120 }, true);
    for (let i = 0; i < 40; i++) {
      clock.advance(16);
    }
    expect(el.scrollTop).toBeCloseTo(120, 0);
  });

  it("adds a second j/k onto the in-flight animation instead of restarting", () => {
    const clock = fakeClock();
    const motion = createScroller(clock);
    const el = mockElement();
    motion.queue(el, { x: 0, y: 60 }, true);
    clock.advance(16);
    const afterFirstFrame = el.scrollTop;
    motion.queue(el, { x: 0, y: 60 }, true);
    for (let i = 0; i < 40; i++) {
      clock.advance(16);
    }
    expect(afterFirstFrame).toBeGreaterThan(0);
    expect(el.scrollTop).toBeCloseTo(120, 0);
  });

  it("jumpTo replaces the remaining animation rather than stacking it", () => {
    const clock = fakeClock();
    const motion = createScroller(clock);
    const el = mockElement(50);
    motion.queue(el, { x: 0, y: 400 }, true);
    motion.jumpTo(el, 0, true);
    for (let i = 0; i < 40; i++) {
      clock.advance(16);
    }
    expect(el.scrollTop).toBeCloseTo(0, 0);
  });
});

describe("findScrollableElement", () => {
  it("uses the document scroller when the page itself overflows", () => {
    const window = linkedInLike({ rootScrolls: true });
    const el = findScrollableElement(window.document, window);
    expect(el).toBe(window.document.scrollingElement || window.document.documentElement);
  });

  it("finds a nested feed scroller when html and body are overflow-hidden", () => {
    const window = linkedInLike({ rootScrolls: false });
    const el = findScrollableElement(window.document, window);
    expect(el.id).toBe("feed");
  });
});

function linkedInLike({ rootScrolls }) {
  const { window } = new JSDOM(
    `<!DOCTYPE html><html><body><div id="feed"><article>post</article></div></body></html>`,
    { pretendToBeVisual: true, url: "https://www.linkedin.com/feed/" },
  );
  Object.defineProperty(window, "innerHeight", { value: 800 });
  Object.defineProperty(window, "innerWidth", { value: 1200 });
  const root = window.document.scrollingElement || window.document.documentElement;
  const body = window.document.body;
  const feed = window.document.getElementById("feed");
  const orig = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el) => {
    const style = orig(el);
    const overflow = el === feed ? "auto" : el === root || el === body ? (rootScrolls ? "visible" : "hidden") : "visible";
    Object.defineProperty(style, "overflow", { value: overflow });
    Object.defineProperty(style, "overflowY", { value: overflow });
    Object.defineProperty(style, "overflowX", { value: overflow });
    return style;
  };
  Object.defineProperty(root, "scrollHeight", { value: rootScrolls ? 4000 : 800, configurable: true });
  Object.defineProperty(root, "clientHeight", { value: 800, configurable: true });
  Object.defineProperty(body, "scrollHeight", { value: rootScrolls ? 4000 : 800, configurable: true });
  Object.defineProperty(body, "clientHeight", { value: 800, configurable: true });
  Object.defineProperty(feed, "scrollHeight", { value: 5000, configurable: true });
  Object.defineProperty(feed, "clientHeight", { value: 800, configurable: true });
  feed.getBoundingClientRect = () => ({
    top: 0, left: 200, bottom: 800, right: 1000, width: 800, height: 800, x: 200, y: 0,
  });
  window.document.elementFromPoint = () => feed.firstElementChild;
  return window;
}
