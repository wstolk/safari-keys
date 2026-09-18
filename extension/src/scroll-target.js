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
